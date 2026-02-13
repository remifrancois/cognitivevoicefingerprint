/**
 * V5 CVF ENGINE — Public API
 *
 * Deep-voice architecture:
 *   DAILY TEXT  → Opus 4.6 dual-pass extraction + deterministic NLP anchors ($0.25/session)
 *   DAILY AUDIO → GPU-accelerated parselmouth + librosa + nolds + Whisper temporal ($0.00)
 *   WEEKLY      → Opus 4.6 deep clinical reasoning with 32K thinking ($0.50-0.80/week)
 *   MICRO-TASKS → Targeted cognitive/motor/pragmatic assessment (sustained vowel, DDK, fluency, depression, attention, pragmatic)
 *
 * 107 indicators across 11 domains, 10-condition differential, 30 diagnostic rules.
 * Platform-ready: register v5ApiPlugin with your Fastify instance.
 */

// Core algorithm (11-domain scoring)
export {
  computeV5Baseline,
  computeZScores,
  computeDomainScores,
  computeComposite,
  getAlertLevel,
  detectCascade,
  applyConfounders,
  checkSentinels,
  computeDeclineProfile,
  analyzeSession,
  analyzeWeek,
  ALERT_THRESHOLDS,
} from './algorithm.js';

// Differential diagnosis (30-rule engine, 10 conditions)
export {
  runDifferential,
  detectTemporalPattern,
  detectADCascade,
  generateRecommendation,
} from './differential.js';

// Trajectory prediction (12-week forecast) + decline profiling
export {
  predictTrajectory,
  computeDeclineProfile as computeTrajectoryDeclineProfile,
} from './trajectory.js';

// Text feature extraction (Opus 4.6 dual-pass daily — 107 indicators)
export {
  extractV5Features,
  extractV5EarlyDetection,
  buildV5ExtractionPrompt,
  runDualPass,
  mergeWithAnchors,
} from './text-extractor.js';

// Acoustic pipeline (GPU-accelerated parselmouth + librosa + nolds + Whisper temporal)
export {
  extractAcousticFeatures,
  extractMicroTaskAudio,
  convertToWav,
  normalizeAcousticValue,
  computeWhisperTemporalIndicators,
  cleanup as cleanupAudioTemp,
} from './acoustic-pipeline.js';

// PD-specific analysis engine
export {
  detectPDSignature,
  classifyPDSubtype,
  differentiateParkinsonism,
  stagePD,
  predictUPDRS,
  getPDCascade,
  runPDAnalysis,
} from './pd-engine.js';

// Micro-tasks (sustained vowel, DDK, category fluency, depression screen, attention fluctuation, pragmatic probe)
export {
  MICRO_TASKS,
  getScheduledTasks,
  scoreMicroTask,
  analyzeCategoryFluency,
  embedTaskPrompt,
} from './micro-tasks.js';

// Weekly deep analysis (Opus 4.6 — 32K thinking, enhanced with acoustic + PD + micro-tasks + cross-validation)
export {
  runWeeklyDeepAnalysis,
  loadWeeklyReport,
  listWeeklyReports,
} from './weekly-deep.js';

// Cross-validation (split-half reliability)
export {
  batchAnalyzeWithCrossValidation,
  splitHalfCrossValidation,
  aggregateCrossValidatedResults,
} from './cross-validation.js';

// Deterministic NLP anchors (non-LLM linguistic indicators)
export {
  computeDeterministicIndicators,
  DETERMINISTIC_INDICATOR_IDS,
} from './nlp-deterministic.js';

// Topic detection and adjustment profiles
export {
  TOPIC_PROFILES,
  detectTopicGenre,
  getTopicAdjustment,
  applyTopicAdjustments,
} from './topic-profiles.js';

// Indicator definitions (107 indicators, 11 domains)
export {
  INDICATORS,
  ALL_INDICATOR_IDS,
  INDICATOR_COUNT,
  DOMAINS,
  DOMAIN_WEIGHTS,
  TEXT_INDICATORS,
  AUDIO_INDICATORS,
  WHISPER_TEMPORAL_INDICATORS,
  MICRO_TASK_INDICATORS,
  EARLY_DETECTION_INDICATORS,
  SENTINELS,
  ACOUSTIC_NORMS,
} from './indicators.js';

/**
 * V5 version info.
 */
export const V5_META = {
  version: '5.0.0',
  codename: 'deep_voice',
  indicator_count: 107,
  domains: 11,
  conditions_detected: 10,
  differential_rules: 30,
  architecture: {
    daily_text: { model: 'claude-opus-4-6', cost: '$0.25/session', mode: 'dual-pass', indicators: 107 },
    daily_audio: { engine: 'GPU-accelerated parselmouth+librosa+nolds+Whisper', cost: '$0.00' },
    weekly: { model: 'claude-opus-4-6', cost: '$0.50-0.80', thinking_budget: 32000 },
    micro_tasks: ['sustained_vowel', 'ddk', 'category_fluency', 'depression_screen', 'attention_fluctuation', 'pragmatic_probe'],
  },
  cost: { daily: '$0.25', weekly_opus: '$0.50-0.80', weekly_total: '~$2.10/patient' },
  new_in_v5: [
    'topic_detection', 'deterministic_nlp_anchors', 'dual_pass_extraction',
    'whisper_temporal', 'lbd_ftd_detection', '11_domains', '30_rules',
    'cross_validation', 'gpu_acceleration', 'pragmatic_domain', 'executive_domain',
  ],
};
