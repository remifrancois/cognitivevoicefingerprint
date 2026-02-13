/**
 * V5 ACOUSTIC PIPELINE
 *
 * Node.js bridge to the Python audio extraction script (extract_features_v5.py).
 * Extends the V4 pipeline with:
 *   - GPU-accelerated feature extraction
 *   - Whisper word-level timestamps for measured temporal indicators
 *   - Task-specific normalization norms (conversation, sustained_vowel, ddk, fluency)
 *   - Six new acoustic indicators (formant bandwidth, spectral tilt, voice breaks,
 *     tremor frequency, breathiness H1-H2, loudness decay)
 *   - computeWhisperTemporalIndicators() for converting Whisper word arrays into
 *     measured temporal indicators that replace text-proxy estimates
 *
 * Graceful degradation: if Python or ffmpeg are unavailable, all audio
 * indicators return null rather than throwing.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { AUDIO_INDICATORS, ACOUSTIC_NORMS, INDICATORS, WHISPER_TEMPORAL_INDICATORS } from './indicators.js';

const execFileAsync = promisify(execFile);

const VALID_TASK_TYPES = new Set(['conversation', 'sustained_vowel', 'ddk', 'fluency']);
const VALID_GENDERS = new Set(['male', 'female']);

const PYTHON_SCRIPT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../audio/extract_features_v5.py'
);

// ─────────────────────────────────────────────────────────────────────────────
// Map Python output feature keys -> indicator IDs
// V4 preserved + 6 new V5 acoustic indicators
// ─────────────────────────────────────────────────────────────────────────────

const PYTHON_KEY_TO_INDICATOR = {
  // V4 preserved
  f0_mean:               'ACU_F0_MEAN',
  f0_sd:                 'ACU_F0_SD',
  f0_range:              'ACU_F0_RANGE',
  jitter_local:          'ACU_JITTER',
  shimmer_local:         'ACU_SHIMMER',
  hnr:                   'ACU_HNR',
  mfcc2_mean:            'ACU_MFCC2',
  cpp:                   'ACU_CPP',
  spectral_harmonicity:  'ACU_SPECTRAL_HARM',
  energy_range:          'ACU_ENERGY_RANGE',
  f1f2_ratio:            'ACU_F1F2_RATIO',
  ppe:                   'PDM_PPE',
  rpde:                  'PDM_RPDE',
  dfa:                   'PDM_DFA',
  d2:                    'PDM_D2',
  ddk_rate:              'PDM_DDK_RATE',
  ddk_regularity_cv:     'PDM_DDK_REG',
  vot:                   'PDM_VOT',
  monopitch:             'PDM_MONOPITCH',
  articulation_rate:     'TMP_ARTIC_RATE',
  // V5 new
  formant_bandwidth:     'ACU_FORMANT_BANDWIDTH',
  spectral_tilt:         'ACU_SPECTRAL_TILT',
  voice_breaks:          'ACU_VOICE_BREAKS',
  tremor_freq_power:     'ACU_TREMOR_FREQ',
  breathiness_h1h2:      'ACU_BREATHINESS',
  loudness_decay:        'ACU_LOUDNESS_DECAY',
};

// Features where HIGHER raw value = WORSE cognitive/motor health.
// These use inverted sigmoid: score = 0.5 - 0.5 * tanh(...)
const HIGHER_IS_WORSE = new Set([
  'ACU_JITTER',
  'ACU_SHIMMER',
  'ACU_F1F2_RATIO',
  'PDM_PPE',
  'PDM_RPDE',
  'PDM_DFA',
  'PDM_D2',
  'PDM_VOT',
  // V5 new
  'ACU_VOICE_BREAKS',
  'ACU_TREMOR_FREQ',
  'ACU_BREATHINESS',
]);

/**
 * Build a null vector — all AUDIO_INDICATORS set to null.
 * Used for graceful degradation when Python/ffmpeg fails.
 */
function buildNullVector() {
  const vector = {};
  for (const id of AUDIO_INDICATORS) {
    vector[id] = null;
  }
  return vector;
}

/**
 * Generate a unique temp file path within os.tmpdir().
 */
function tempPath(extension) {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return path.join(os.tmpdir(), `memovoice-${stamp}.${extension}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// convertToWav
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an audio buffer to 16kHz mono WAV using ffmpeg.
 *
 * @param {Buffer} inputBuffer — Raw audio bytes in any ffmpeg-supported format.
 * @param {string} inputFormat — File extension hint (e.g. 'mp3', 'ogg', 'webm').
 * @returns {Promise<string>} — Path to the converted WAV temp file.
 */
export async function convertToWav(inputBuffer, inputFormat = 'wav') {
  const inputPath = tempPath(inputFormat);
  const outputPath = tempPath('wav');

  await fs.writeFile(inputPath, inputBuffer);
  await fs.chmod(inputPath, 0o600);

  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-ar', '16000',
      '-ac', '1',
      '-sample_fmt', 's16',
      '-f', 'wav',
      outputPath,
    ], { timeout: 30_000 });

    return outputPath;
  } finally {
    // Always clean up the input temp file; output is caller's responsibility
    await cleanup([inputPath]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// normalizeAcousticValue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a raw acoustic value to the 0.0-1.0 indicator scale using
 * a sigmoid (tanh) curve centered on population norms.
 *
 * V5 change: norms are now looked up by task type first (conversation,
 * sustained_vowel, ddk, fluency) before resolving gender-specific values.
 * This fixes the PPE/RPDE norm mismatch in V4 where sustained-vowel tasks
 * were being normalized against conversational norms.
 *
 * For features where decline = lower raw value (HNR, CPP, F0_SD, etc.):
 *   score = 0.5 + 0.5 * tanh((raw - mean) / (2 * std))
 *   Higher raw -> higher score (healthier).
 *
 * For features where decline = higher raw value (jitter, shimmer, PPE, etc.):
 *   score = 0.5 - 0.5 * tanh((raw - mean) / (2 * std))
 *   Higher raw -> lower score (worse health).
 *
 * Gender-specific norms are used when available (F0 features).
 *
 * @param {string} featureId — Indicator ID (e.g. 'ACU_HNR').
 * @param {number} rawValue — Raw measurement from Python.
 * @param {string} gender — 'male', 'female', or 'unknown'.
 * @param {string} taskType — Task type for norm lookup (default 'conversation').
 * @returns {number|null} — Normalized score in [0.0, 1.0], or null if norms are missing.
 */
export function normalizeAcousticValue(featureId, rawValue, gender = 'unknown', taskType = 'conversation') {
  if (rawValue === null || rawValue === undefined || !Number.isFinite(rawValue)) {
    return null;
  }

  // Look up task-specific norms first, fall back to conversation
  const taskNorms = ACOUSTIC_NORMS[taskType] || ACOUSTIC_NORMS.conversation;
  const norms = taskNorms[featureId];
  if (!norms) {
    return null;
  }

  // Resolve gender-specific vs flat norms
  let mean, std;
  if (norms.male && norms.female) {
    // Gender-specific norms available
    const genderKey = (gender === 'male' || gender === 'female') ? gender : 'female';
    mean = norms[genderKey].mean;
    std = norms[genderKey].std;
  } else {
    mean = norms.mean;
    std = norms.std;
  }

  if (!std || std === 0) {
    return 0.5;
  }

  const z = (rawValue - mean) / (2 * std);

  if (HIGHER_IS_WORSE.has(featureId)) {
    // Higher raw = worse: invert the sigmoid
    return 0.5 - 0.5 * Math.tanh(z);
  } else {
    // Higher raw = better (or neutral): standard sigmoid
    return 0.5 + 0.5 * Math.tanh(z);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// computeWhisperTemporalIndicators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute V5 temporal indicators from Whisper word-level timestamps.
 * These replace text-proxy estimates with actual acoustic measurements.
 *
 * @param {Array} words — [{word, start, end}, ...] from Whisper
 * @returns {Object} — { [indicatorId]: number } normalized to 0.0-1.0
 */
export function computeWhisperTemporalIndicators(words) {
  if (!words || words.length < 5) return {};

  const result = {};

  // TMP_PAUSE_BEFORE_NOUN — average pause before likely nouns
  // Heuristic: words > 4 chars not in function word list
  const functionWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'in',
    'for', 'with', 'and', 'but', 'or', 'not', 'this', 'that', 'these', 'those',
    'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'mais',
    'dans', 'pour', 'avec', 'sur', 'est', 'sont', 'il', 'elle', 'ils', 'elles',
    'ce', 'cette', 'ces',
  ]);
  const pauses = [];
  for (let i = 1; i < words.length; i++) {
    const pause = words[i].start - words[i - 1].end;
    const isLikelyNoun = words[i].word.length > 4 && !functionWords.has(words[i].word.toLowerCase());
    if (isLikelyNoun && pause > 0) pauses.push(pause);
  }
  if (pauses.length > 0) {
    const mean = pauses.reduce((a, b) => a + b, 0) / pauses.length;
    // Map: 0.3s pause = 0.5 (normal), higher = worse
    result.TMP_PAUSE_BEFORE_NOUN = Math.max(0, Math.min(1, 0.5 - 0.5 * Math.tanh((mean - 0.3) / 0.2)));
  }

  // TMP_PAUSE_VARIABILITY — CV of all inter-word pauses
  const allPauses = [];
  for (let i = 1; i < words.length; i++) {
    const p = words[i].start - words[i - 1].end;
    if (p > 0.01) allPauses.push(p);
  }
  if (allPauses.length > 2) {
    const mean = allPauses.reduce((a, b) => a + b, 0) / allPauses.length;
    const std = Math.sqrt(allPauses.reduce((a, b) => a + (b - mean) ** 2, 0) / allPauses.length);
    const cv = mean > 0 ? std / mean : 0;
    // Higher CV = more variable = worse. Normal CV ~0.5
    result.TMP_PAUSE_VARIABILITY = Math.max(0, Math.min(1, 0.5 - 0.5 * Math.tanh((cv - 0.5) / 0.3)));
  }

  // TMP_SYLLABLE_RATE_DECAY — compare rate in first half vs second half
  const mid = Math.floor(words.length / 2);
  const firstHalf = words.slice(0, mid);
  const secondHalf = words.slice(mid);
  if (firstHalf.length > 2 && secondHalf.length > 2) {
    const rate1 = firstHalf.length / (firstHalf[firstHalf.length - 1].end - firstHalf[0].start);
    const rate2 = secondHalf.length / (secondHalf[secondHalf.length - 1].end - secondHalf[0].start);
    const ratio = rate1 > 0 ? rate2 / rate1 : 1;
    // ratio < 1 = decay (worse). Normal = ~1.0
    result.TMP_SYLLABLE_RATE_DECAY = Math.max(0, Math.min(1, 0.5 + 0.5 * Math.tanh((ratio - 0.9) / 0.15)));
  }

  // TMP_WORD_DURATION_MEAN — average word duration
  const durations = words.map(w => w.end - w.start).filter(d => d > 0);
  if (durations.length > 0) {
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    // Normal ~0.3s, longer = worse
    result.TMP_WORD_DURATION_MEAN = Math.max(0, Math.min(1, 0.5 - 0.5 * Math.tanh((mean - 0.3) / 0.15)));
  }

  // TMP_VOICED_RATIO — total word duration / total audio duration
  const totalWordDuration = durations.reduce((a, b) => a + b, 0);
  const totalDuration = words[words.length - 1].end - words[0].start;
  if (totalDuration > 0) {
    const ratio = totalWordDuration / totalDuration;
    // Normal ~0.7, lower = worse
    result.TMP_VOICED_RATIO = Math.max(0, Math.min(1, 0.5 + 0.5 * Math.tanh((ratio - 0.6) / 0.15)));
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// extractAcousticFeatures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main entry point: extract and normalize acoustic features from an audio buffer.
 *
 * V5 additions:
 *   - GPU flag passed to Python for accelerated extraction
 *   - Whisper model + word-level timestamps for measured temporal indicators
 *   - Task-specific normalization norms
 *   - Returns structured result with acousticVector, temporalIndicators, and whisperResult
 *
 * @param {Buffer} audioBuffer — Audio data.
 * @param {Object} options
 * @param {string} options.format — Input format (default 'wav').
 * @param {string} options.taskType — Python task type (default 'conversation').
 * @param {string} options.gender — Speaker gender (default 'unknown').
 * @param {boolean} options.gpu — Enable GPU acceleration (default true).
 * @param {string} options.whisperModel — Whisper model size (default 'large-v3').
 * @param {boolean} options.wordTimestamps — Request word-level timestamps (default true).
 * @returns {Promise<Object>} — { acousticVector, temporalIndicators, whisperResult }
 */
export async function extractAcousticFeatures(audioBuffer, {
  format = 'wav',
  taskType = 'conversation',
  gender = 'unknown',
  gpu = true,
  whisperModel = 'large-v3',
  wordTimestamps = true,
} = {}) {
  if (!VALID_TASK_TYPES.has(taskType)) {
    throw new Error(`Invalid taskType: must be one of ${[...VALID_TASK_TYPES].join(', ')}`);
  }
  const safeGender = VALID_GENDERS.has(gender) ? gender : 'female';

  const tempFiles = [];

  try {
    // Convert to 16kHz mono WAV if not already WAV
    let wavPath;
    if (format === 'wav') {
      wavPath = tempPath('wav');
      await fs.writeFile(wavPath, audioBuffer);
      await fs.chmod(wavPath, 0o600);
      tempFiles.push(wavPath);
    } else {
      wavPath = await convertToWav(audioBuffer, format);
      tempFiles.push(wavPath);
    }

    // Build Python invocation arguments
    const args = [
      PYTHON_SCRIPT,
      '--audio-path', wavPath,
      '--task-type', taskType,
      '--gender', safeGender,
    ];
    if (gpu) args.push('--gpu');
    if (wordTimestamps) {
      args.push('--whisper-model', whisperModel);
      args.push('--word-timestamps');
    }

    // Invoke Python extraction script (V5 may take longer with Whisper — 120s timeout)
    const { stdout } = await execFileAsync('python3', args, { timeout: 120_000 });

    // Parse Python output with prototype pollution protection
    const result = JSON.parse(stdout.trim(), (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
      return value;
    });

    if (result.status !== 'ok' || !result.features) {
      console.warn(
        `[acoustic-pipeline] Python returned non-ok status: ${result.status}`,
        result.error || ''
      );
      return {
        acousticVector: buildNullVector(),
        temporalIndicators: {},
        whisperResult: null,
      };
    }

    // Map raw Python features to indicator IDs and normalize
    const rawFeatures = result.features;
    const vector = {};

    // Compute derived features not directly in Python output
    if (rawFeatures.f1_mean != null && rawFeatures.f2_mean != null && rawFeatures.f2_mean > 0) {
      rawFeatures.f1f2_ratio = rawFeatures.f1_mean / rawFeatures.f2_mean;
    }
    if (rawFeatures.f0_sd != null && rawFeatures.f0_mean != null && rawFeatures.f0_mean > 0) {
      rawFeatures.monopitch = rawFeatures.f0_sd / rawFeatures.f0_mean;
    }

    // Convert DDK regularity CV to regularity score (1 - CV)
    if (rawFeatures.ddk_regularity_cv != null) {
      rawFeatures.ddk_regularity_cv = 1.0 - rawFeatures.ddk_regularity_cv;
    }

    for (const id of AUDIO_INDICATORS) {
      // Find the Python key that maps to this indicator
      const pythonKey = Object.entries(PYTHON_KEY_TO_INDICATOR)
        .find(([, indId]) => indId === id)?.[0];

      if (!pythonKey || rawFeatures[pythonKey] == null) {
        vector[id] = null;
        continue;
      }

      vector[id] = normalizeAcousticValue(id, rawFeatures[pythonKey], safeGender, taskType);
    }

    // Build Whisper temporal indicators if word-level timestamps are available
    let whisperResult = null;
    let temporalIndicators = {};
    if (result.whisper && result.whisper.words) {
      whisperResult = {
        transcript: result.whisper.transcript || '',
        words: result.whisper.words.map(w => ({
          word: w.word,
          start: w.start,
          end: w.end,
        })),
      };
      temporalIndicators = computeWhisperTemporalIndicators(result.whisper.words);
    }

    // Also include measured temporal indicators from Python (if the script
    // produces its own temporal features alongside Whisper)
    if (result.temporal) {
      for (const [key, value] of Object.entries(result.temporal)) {
        // Python temporal keys are indicator IDs directly (e.g. TMP_ARTIC_RATE)
        if (value != null && Number.isFinite(value)) {
          temporalIndicators[key] = value;
        }
      }
    }

    return {
      acousticVector: vector,
      temporalIndicators,
      whisperResult,
    };

  } catch (err) {
    // Graceful degradation: Python not available, ffmpeg missing, etc.
    console.warn(
      `[acoustic-pipeline] Feature extraction failed, returning null vector:`,
      err.message || err
    );
    return {
      acousticVector: buildNullVector(),
      temporalIndicators: {},
      whisperResult: null,
    };
  } finally {
    await cleanup(tempFiles);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// extractMicroTaskAudio
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract acoustic features for a specific micro-task (sustained vowel, DDK, fluency).
 * Routes to the Python script with the appropriate task type.
 *
 * V5 change: passes through GPU and Whisper options, uses task-specific norms.
 *
 * @param {Buffer} audioBuffer — Audio data for the micro-task recording.
 * @param {string} taskType — 'sustained_vowel' | 'ddk' | 'fluency'.
 * @param {Object} options
 * @param {string} options.format — Input format (default 'wav').
 * @param {string} options.gender — Speaker gender (default 'unknown').
 * @param {boolean} options.gpu — Enable GPU acceleration (default true).
 * @param {string} options.whisperModel — Whisper model size (default 'large-v3').
 * @param {boolean} options.wordTimestamps — Request word-level timestamps (default true).
 * @returns {Promise<Object>} — { acousticVector, temporalIndicators, whisperResult }
 */
export async function extractMicroTaskAudio(audioBuffer, taskType, {
  format = 'wav',
  gender = 'unknown',
  gpu = true,
  whisperModel = 'large-v3',
  wordTimestamps = true,
} = {}) {
  if (!VALID_TASK_TYPES.has(taskType)) {
    throw new Error(`Invalid taskType: must be one of ${[...VALID_TASK_TYPES].join(', ')}`);
  }
  return extractAcousticFeatures(audioBuffer, {
    format,
    taskType,
    gender,
    gpu,
    whisperModel,
    wordTimestamps,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// cleanup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove temp files, ignoring errors for files that may already be deleted.
 *
 * @param {string[]} tempFiles — Array of absolute paths to remove.
 */
export async function cleanup(tempFiles) {
  const tmpDir = os.tmpdir();
  await Promise.allSettled(
    tempFiles
      .filter(f => path.resolve(f).startsWith(path.resolve(tmpDir)))
      .map(f => fs.unlink(f).catch(() => {}))
  );
}
