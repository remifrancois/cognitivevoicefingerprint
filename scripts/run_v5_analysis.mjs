#!/usr/bin/env node
/**
 * V5 "deep_voice" Full Analysis Runner
 *
 * Standalone script that runs the complete V5 pipeline on pre-extracted
 * profile data. Merges text features + acoustic features, computes
 * deterministic NLP anchors, detects topic genres, applies topic-adjusted
 * z-scoring across 11 domains, runs 30-rule differential diagnosis,
 * and performs cross-validation.
 *
 * Usage:
 *   node scripts/run_v5_analysis.mjs [--extracted FILE] [--text-features FILE] [--output FILE]
 *
 * Defaults to Profile01 paths if no arguments provided.
 */

import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

// V5 Engine imports (resolve relative to this script's location)
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const engineDir = join(__dirname, '..', 'src', 'engine');
const {
  INDICATORS, ALL_INDICATOR_IDS, INDICATOR_COUNT,
  DOMAINS, DOMAIN_WEIGHTS, AUDIO_INDICATORS, WHISPER_TEMPORAL_INDICATORS,
  ACOUSTIC_NORMS, SENTINELS
} = await import(`${engineDir}/indicators.js`);
const { normalizeAcousticValue } = await import(`${engineDir}/acoustic-pipeline.js`);
const {
  computeV5Baseline, computeZScores, computeDomainScores,
  computeComposite, getAlertLevel, detectCascade, checkSentinels,
  applyConfounders, analyzeSession, computeDeclineProfile,
  ALERT_THRESHOLDS
} = await import(`${engineDir}/algorithm.js`);
const { runDifferential, detectLBDPattern, detectFTDPattern } = await import(`${engineDir}/differential.js`);
const { detectTopicGenre, applyTopicAdjustments } = await import(`${engineDir}/topic-profiles.js`);
const { computeDeterministicIndicators, DETERMINISTIC_INDICATOR_IDS } = await import(`${engineDir}/nlp-deterministic.js`);
const { batchAnalyzeWithCrossValidation, splitHalfCrossValidation, aggregateCrossValidatedResults } = await import(`${engineDir}/cross-validation.js`);
const { detectPDSignature, classifyPDSubtype, stagePD, runPDAnalysis } = await import(`${engineDir}/pd-engine.js`);
const { predictTrajectory } = await import(`${engineDir}/trajectory.js`);

// ── CLI argument parsing ──
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}

const EXTRACTED_PATH = resolve(getArg('--extracted', '/Users/code/azh/scripts/profile01_extracted.json'));
const TEXT_FEATURES_PATH = resolve(getArg('--text-features', '/Users/code/azh/scripts/profile01_text_features.json'));
const OUTPUT_PATH = resolve(getArg('--output', '/Users/code/azh/scripts/profile01_v5_results.json'));

const PYTHON_KEY_TO_INDICATOR = {
  f0_mean: 'ACU_F0_MEAN', f0_sd: 'ACU_F0_SD', f0_range: 'ACU_F0_RANGE',
  jitter_local: 'ACU_JITTER', shimmer_local: 'ACU_SHIMMER', hnr: 'ACU_HNR',
  mfcc2_mean: 'ACU_MFCC2', cpp: 'ACU_CPP',
  spectral_harmonicity: 'ACU_SPECTRAL_HARM', energy_range: 'ACU_ENERGY_RANGE',
  f1f2_ratio: 'ACU_F1F2_RATIO',
  ppe: 'PDM_PPE', rpde: 'PDM_RPDE', dfa: 'PDM_DFA', d2: 'PDM_D2',
  ddk_rate: 'PDM_DDK_RATE', ddk_regularity_cv: 'PDM_DDK_REG',
  vot: 'PDM_VOT', monopitch: 'PDM_MONOPITCH',
  articulation_rate: 'TMP_ARTIC_RATE',
  // V5 additions
  formant_bandwidth: 'ACU_FORMANT_BANDWIDTH', spectral_tilt: 'ACU_SPECTRAL_TILT',
  voice_breaks: 'ACU_VOICE_BREAKS', tremor_freq: 'ACU_TREMOR_FREQ',
  breathiness: 'ACU_BREATHINESS', loudness_decay: 'ACU_LOUDNESS_DECAY',
};

function normalizeAcousticVector(rawFeatures, gender, taskType = 'conversation') {
  const vector = {};
  if (rawFeatures.f1_mean != null && rawFeatures.f2_mean != null && rawFeatures.f2_mean > 0) {
    rawFeatures.f1f2_ratio = rawFeatures.f1_mean / rawFeatures.f2_mean;
  }
  if (rawFeatures.f0_sd != null && rawFeatures.f0_mean != null && rawFeatures.f0_mean > 0) {
    rawFeatures.monopitch = rawFeatures.f0_sd / rawFeatures.f0_mean;
  }
  for (const id of AUDIO_INDICATORS) {
    const pythonKey = Object.entries(PYTHON_KEY_TO_INDICATOR).find(([, indId]) => indId === id)?.[0];
    if (!pythonKey || rawFeatures[pythonKey] == null) { vector[id] = null; continue; }
    vector[id] = normalizeAcousticValue(id, rawFeatures[pythonKey], gender, taskType);
  }
  return vector;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  MemoVoice CVF V5 "deep_voice" — Full Diagnostic Analysis    ║');
  console.log('║  107 indicators | 11 domains | 30 rules | 10 conditions      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const extracted = JSON.parse(await readFile(EXTRACTED_PATH, 'utf-8'));
  const textFeatures = JSON.parse(await readFile(TEXT_FEATURES_PATH, 'utf-8'));

  console.log(`Loaded ${extracted.sessions_count} sessions + ${Object.keys(textFeatures).length} text feature sets.\n`);

  // Detect gender from F0
  const f0Values = extracted.sessions.map(s => s.acoustic_features?.f0_mean).filter(v => v != null);
  const avgF0 = f0Values.reduce((a, b) => a + b, 0) / f0Values.length;
  const detectedGender = avgF0 > 165 ? 'female' : 'male';
  console.log(`Speaker Profile: ${detectedGender.toUpperCase()} (avg F0: ${avgF0.toFixed(1)} Hz)\n`);

  // ─── STEP 1: Feature Vector Assembly (107 indicators) ───
  console.log('━━━ STEP 1: Feature Vector Assembly (107 indicators) ━━━\n');

  const sessionVectors = [];

  for (const session of extracted.sessions) {
    const sid = session.session_id;
    const tf = textFeatures[sid];

    if (!tf) {
      console.log(`  [${sid}] Skipped (no text features)`);
      continue;
    }

    // Detect topic genre from transcript
    const transcript = session.transcript?.text || '';
    const language = session.transcript?.language || 'fr';
    const topicResult = detectTopicGenre(transcript);

    // Compute deterministic NLP anchors
    const nlpAnchors = computeDeterministicIndicators(transcript, language);

    // Start with text features, merge NLP anchors
    const fullVector = {};
    for (const id of ALL_INDICATOR_IDS) {
      const indicator = INDICATORS[id];
      if (!indicator) { fullVector[id] = null; continue; }
      const extractable = indicator.extractable;
      if (extractable === 'audio' || extractable === 'micro_task' || extractable === 'meta' || extractable === 'whisper_temporal') {
        fullVector[id] = null;
      } else if (DETERMINISTIC_INDICATOR_IDS.includes(id) && nlpAnchors[id] != null) {
        // Deterministic anchors override LLM extraction
        fullVector[id] = Math.max(0, Math.min(1, nlpAnchors[id]));
      } else {
        fullVector[id] = tf[id] != null ? Math.max(0, Math.min(1, tf[id])) : null;
      }
    }

    // Merge acoustic features (using conversation norms since these are conversation recordings)
    if (session.acoustic_features && !session.acoustic_features.error) {
      const acousticVector = normalizeAcousticVector({ ...session.acoustic_features }, detectedGender, 'conversation');
      for (const [id, value] of Object.entries(acousticVector)) {
        if (value != null) fullVector[id] = value;
      }
    }

    const textCount = Object.entries(fullVector).filter(([id, v]) => v != null && !AUDIO_INDICATORS.includes(id)).length;
    const audioCount = Object.entries(fullVector).filter(([id, v]) => v != null && AUDIO_INDICATORS.includes(id)).length;
    const anchorCount = DETERMINISTIC_INDICATOR_IDS.filter(id => nlpAnchors[id] != null).length;
    const totalCount = Object.values(fullVector).filter(v => v != null).length;

    console.log(`  [${sid}] ${textCount} text + ${audioCount} audio + ${anchorCount} anchors = ${totalCount} ind | genre=${topicResult.genre} (${(topicResult.confidence * 100).toFixed(0)}%) | ${session.acoustic_features?.duration_s || '?'}s`);

    sessionVectors.push({
      session_id: sid,
      duration_s: session.acoustic_features?.duration_s || 0,
      language,
      feature_vector: fullVector,
      raw_acoustic: session.acoustic_features,
      transcript_text: transcript,
      topic_genre: topicResult.genre,
      topic_confidence: topicResult.confidence,
      topic_complexity: topicResult.complexity,
      nlp_anchors: nlpAnchors
    });
  }

  console.log(`\n  ${sessionVectors.length} complete feature vectors assembled.\n`);

  // ─── STEP 2: Baseline Computation ───
  console.log('━━━ STEP 2: Baseline Computation ━━━\n');

  const vectors = sessionVectors.map(s => s.feature_vector);
  const baseline = computeV5Baseline(vectors, Math.min(vectors.length, 5));

  console.log(`  Status: ${baseline.complete ? 'COMPLETE' : 'PARTIAL'}`);
  console.log(`  Sessions: ${baseline.sessions} | Audio: ${baseline.audio_sessions || baseline.audio_available || 0} sessions`);
  console.log(`  High variance: ${baseline.high_variance?.length || 0} indicators`);
  if (baseline.high_variance?.length > 0) {
    console.log(`    ${baseline.high_variance.slice(0, 10).join(', ')}${baseline.high_variance.length > 10 ? '...' : ''}`);
  }

  console.log('\n  Key Baseline Values (mean +/- std):');
  const keyIndicators = [
    'LEX_TTR', 'SEM_IDEA_DENSITY', 'SEM_REF_COHERENCE', 'SYN_MLU',
    'TMP_LPR', 'ACU_F0_SD', 'ACU_HNR', 'PDM_PPE', 'AFF_NEG_VALENCE',
    'PRA_INDIRECT_SPEECH', 'EXE_TASK_SWITCHING'
  ];
  for (const id of keyIndicators) {
    const b = baseline.vector?.[id];
    if (b && b.n > 0) {
      console.log(`    ${id.padEnd(26)} ${b.mean.toFixed(3)} +/- ${b.std.toFixed(3)} (n=${b.n})`);
    }
  }

  // ─── STEP 3: Per-session V5 Analysis with Topic Adjustment ───
  console.log('\n━━━ STEP 3: Per-Session V5 Analysis (Topic-Adjusted) ━━━\n');

  const sessionResults = [];
  const history = [];

  for (let i = 0; i < sessionVectors.length; i++) {
    const sv = sessionVectors[i];
    const result = analyzeSession(sv.feature_vector, baseline, {}, history, sv.topic_genre);

    const entry = {
      ...result,
      session_id: sv.session_id,
      duration_s: sv.duration_s,
      topic_genre: sv.topic_genre,
      topic_confidence: sv.topic_confidence,
    };
    sessionResults.push(entry);
    history.push(entry);

    const ds = result.domain_scores;
    const alertIcon = { green: '[G]', yellow: '[Y]', orange: '[O]', red: '[R]' }[result.alert_level];
    console.log(`  ${alertIcon} [${sv.session_id}] Composite: ${result.composite.toFixed(3).padStart(7)} | ${result.alert_level.toUpperCase().padEnd(6)} | ${result.indicator_count} ind | genre=${sv.topic_genre} | ${sv.duration_s}s`);

    const domainStr = Object.entries(ds)
      .filter(([, v]) => v != null)
      .map(([d, v]) => `${d.slice(0, 3)}=${v.toFixed(2)}`)
      .join(' ');
    console.log(`    ${domainStr}`);

    if (result.sentinel_alerts?.length > 0) {
      for (const a of result.sentinel_alerts) {
        console.log(`    ! SENTINEL: ${a.condition} (${a.triggered_count}/${a.total_sentinels})`);
      }
    }
    if (result.cascade?.all?.length > 0) {
      for (const c of result.cascade.all) {
        console.log(`    ~ CASCADE: ${c.cascade} stage ${c.stage} -- ${c.name} (sev=${c.severity.toFixed(2)})`);
      }
    }
  }

  // ─── STEP 4: Cross-Validation ───
  console.log('\n━━━ STEP 4: Cross-Validation (Fixes Self-Referential Baseline) ━━━\n');

  let cvResults = null;
  let shResults = null;
  try {
    const cvSessions = sessionVectors.map(sv => ({
      feature_vector: sv.feature_vector,
      session_id: sv.session_id,
      topic_genre: sv.topic_genre,
    }));
    cvResults = batchAnalyzeWithCrossValidation(cvSessions);
    shResults = splitHalfCrossValidation(cvSessions);

    if (cvResults) {
      console.log(`  LOO Cross-Validation:`);
      console.log(`    Mean composite: ${cvResults.mean_composite?.toFixed(3) || 'N/A'}`);
      console.log(`    Std composite:  ${cvResults.std_composite?.toFixed(3) || 'N/A'}`);
      console.log(`    Stability:      ${cvResults.stability || 'N/A'}`);
      if (cvResults.per_session) {
        for (const ps of cvResults.per_session) {
          console.log(`      [${ps.session_id}] loo_composite=${ps.composite?.toFixed(3) || 'N/A'} | alert=${ps.alert_level || 'N/A'}`);
        }
      }
    }

    if (shResults) {
      console.log(`\n  Split-Half Cross-Validation:`);
      console.log(`    Half A composite: ${shResults.half_a_composite?.toFixed(3) || 'N/A'}`);
      console.log(`    Half B composite: ${shResults.half_b_composite?.toFixed(3) || 'N/A'}`);
      console.log(`    Consistency:      ${shResults.consistency?.toFixed(3) || 'N/A'}`);
    }
  } catch (e) {
    console.log(`  Cross-validation error: ${e.message}`);
  }

  // ─── STEP 5: Aggregate Profile Analysis (11 domains) ───
  console.log('\n━━━ STEP 5: Aggregate Profile Analysis (11 Domains) ━━━\n');

  const avgDomainScores = {};
  for (const domain of Object.keys(DOMAINS)) {
    const vals = sessionResults.map(r => r.domain_scores[domain]).filter(v => v != null);
    avgDomainScores[domain] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  const avgZScores = {};
  for (const id of ALL_INDICATOR_IDS) {
    const vals = sessionResults.map(r => r.z_scores?.[id]).filter(v => v != null);
    avgZScores[id] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  const avgComposite = computeComposite(avgDomainScores);
  const avgAlert = getAlertLevel(avgComposite);

  const alertIcon = { green: '[GREEN]', yellow: '[YELLOW]', orange: '[ORANGE]', red: '[RED]' }[avgAlert];
  console.log(`  AGGREGATE COMPOSITE: ${avgComposite.toFixed(3)} -> ${alertIcon}\n`);

  // Use cross-validated composite if available
  const cvComposite = cvResults?.mean_composite;
  if (cvComposite != null) {
    const cvAlert = getAlertLevel(cvComposite);
    console.log(`  CROSS-VALIDATED COMPOSITE: ${cvComposite.toFixed(3)} -> ${cvAlert.toUpperCase()}`);
    if (Math.abs(avgComposite - cvComposite) > 0.2) {
      console.log(`  !! Self-referential bias detected: raw=${avgComposite.toFixed(3)} vs cv=${cvComposite.toFixed(3)} (diff=${Math.abs(avgComposite - cvComposite).toFixed(3)})`);
    }
    console.log('');
  }

  console.log('  Domain Scores (11-domain average):');
  console.log('  +----------------+---------+--------+-----------------------------------+');
  console.log('  | Domain         |  Score  | Weight | Visual                            |');
  console.log('  +----------------+---------+--------+-----------------------------------+');
  for (const [domain, weight] of Object.entries(DOMAIN_WEIGHTS)) {
    const score = avgDomainScores[domain];
    if (score != null) {
      const barLen = Math.round(Math.max(0, (score + 2) * 8));
      const bar = '#'.repeat(barLen);
      console.log(`  | ${domain.padEnd(14)} | ${score.toFixed(3).padStart(7)} |  ${weight.toFixed(2)}  | ${bar.padEnd(33)} |`);
    } else {
      console.log(`  | ${domain.padEnd(14)} |    N/A  |  ${weight.toFixed(2)}  | ${'--'.padEnd(33)} |`);
    }
  }
  console.log('  +----------------+---------+--------+-----------------------------------+');

  // ─── STEP 6: Topic Genre Impact Analysis ───
  console.log('\n━━━ STEP 6: Topic Genre Impact Analysis ━━━\n');

  const genreCounts = {};
  for (const sv of sessionVectors) {
    genreCounts[sv.topic_genre] = (genreCounts[sv.topic_genre] || 0) + 1;
  }
  console.log('  Genre Distribution:');
  for (const [genre, count] of Object.entries(genreCounts).sort((a, b) => b[1] - a[1])) {
    const sessions = sessionVectors.filter(sv => sv.topic_genre === genre);
    const composites = sessionResults.filter(r => r.topic_genre === genre).map(r => r.composite);
    const avgComp = composites.length > 0 ? composites.reduce((a, b) => a + b, 0) / composites.length : null;
    console.log(`    ${genre.padEnd(25)} ${count} session(s) | avg composite: ${avgComp != null ? avgComp.toFixed(3) : 'N/A'}`);
  }

  // Show which sessions had significant topic adjustments
  console.log('\n  Topic Adjustment Impact (per session):');
  for (const sv of sessionVectors) {
    const rawZScores = computeZScores(sv.feature_vector, baseline);
    const adjZScores = computeZScores(sv.feature_vector, baseline, sv.topic_genre);
    const rawDomain = computeDomainScores(rawZScores);
    const adjDomain = computeDomainScores(adjZScores);
    const rawComp = computeComposite(rawDomain);
    const adjComp = computeComposite(adjDomain);
    const diff = adjComp - rawComp;
    if (Math.abs(diff) > 0.01) {
      console.log(`    [${sv.session_id}] ${sv.topic_genre}: raw=${rawComp.toFixed(3)} -> adj=${adjComp.toFixed(3)} (shift=${diff > 0 ? '+' : ''}${diff.toFixed(3)})`);
    } else {
      console.log(`    [${sv.session_id}] ${sv.topic_genre}: no significant adjustment`);
    }
  }

  // ─── STEP 7: NLP Anchor Analysis ───
  console.log('\n━━━ STEP 7: Deterministic NLP Anchors ━━━\n');

  console.log(`  ${DETERMINISTIC_INDICATOR_IDS.length} deterministic indicators computed per session:\n`);
  const anchorAverages = {};
  for (const id of DETERMINISTIC_INDICATOR_IDS) {
    const vals = sessionVectors.map(sv => sv.nlp_anchors[id]).filter(v => v != null);
    if (vals.length > 0) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std = Math.sqrt(vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length);
      anchorAverages[id] = { avg, std, n: vals.length };
      console.log(`    ${id.padEnd(26)} ${avg.toFixed(3)} +/- ${std.toFixed(3)} (n=${vals.length})`);
    }
  }

  // ─── STEP 8: Differential Diagnosis (30-Rule Engine) ───
  console.log('\n━━━ STEP 8: Differential Diagnosis (30-Rule Engine, 10 Conditions) ━━━\n');

  const differential = runDifferential(avgDomainScores, avgZScores, {
    sessionCount: sessionVectors.length,
    topicGenres: sessionVectors.map(sv => sv.topic_genre),
  });

  console.log('  Probability Distribution:');
  const sortedProbs = Object.entries(differential.probabilities).sort((a, b) => b[1] - a[1]);
  for (const [condition, prob] of sortedProbs) {
    const pct = (prob * 100).toFixed(1);
    const bar = '#'.repeat(Math.round(prob * 30));
    console.log(`    ${condition.padEnd(15)} ${pct.padStart(5)}% ${bar}`);
  }

  console.log(`\n  Primary:    ${differential.primary_hypothesis.toUpperCase()}`);
  console.log(`  Secondary:  ${differential.secondary_hypothesis}`);
  console.log(`  Confidence: ${(differential.confidence * 100).toFixed(0)}%`);
  console.log(`  Rules Fired: ${differential.rules_fired}`);

  if (differential.flags?.length > 0) {
    console.log(`  Flags: ${differential.flags.join(', ')}`);
  }

  console.log('\n  Evidence:');
  for (const [condition, evidences] of Object.entries(differential.evidence || {})) {
    if (evidences.length > 0) {
      console.log(`    ${condition.toUpperCase()}:`);
      for (const e of evidences) console.log(`      - ${e}`);
    }
  }

  console.log('\n  Recommendations:');
  const recs = Array.isArray(differential.recommendation) ? differential.recommendation : [differential.recommendation];
  for (const rec of recs) {
    console.log(`    -> ${rec}`);
  }

  // ─── STEP 9: LBD & FTD Pattern Detection ───
  console.log('\n━━━ STEP 9: LBD & FTD Pattern Detection (V5 New) ━━━\n');

  let lbdResult = null;
  let ftdResult = null;
  try {
    lbdResult = detectLBDPattern(avgDomainScores, avgZScores, sessionResults);
    ftdResult = detectFTDPattern(avgDomainScores, avgZScores, sessionResults);
  } catch (e) {
    console.log(`  Detection error: ${e.message}`);
  }

  if (lbdResult) {
    console.log(`  LBD Pattern: ${lbdResult.detected ? 'DETECTED' : 'not detected'}`);
    if (lbdResult.detected) {
      console.log(`    Confidence: ${(lbdResult.confidence * 100).toFixed(0)}%`);
      console.log(`    Fluctuation score: ${lbdResult.fluctuation_score?.toFixed(3) || 'N/A'}`);
      if (lbdResult.evidence?.length > 0) {
        for (const e of lbdResult.evidence) console.log(`    - ${e}`);
      }
    }
  }

  if (ftdResult) {
    console.log(`  FTD Pattern: ${ftdResult.detected ? 'DETECTED' : 'not detected'}`);
    if (ftdResult.detected) {
      console.log(`    Variant: ${ftdResult.variant || 'N/A'}`);
      console.log(`    Confidence: ${(ftdResult.confidence * 100).toFixed(0)}%`);
      if (ftdResult.evidence?.length > 0) {
        for (const e of ftdResult.evidence) console.log(`    - ${e}`);
      }
    }
  }

  // ─── STEP 10: Cascade & Sentinel Analysis ───
  console.log('\n━━━ STEP 10: Cascade & Sentinel Analysis (5 Patterns) ━━━\n');

  const aggCascade = detectCascade(avgDomainScores);
  const aggSentinels = checkSentinels(avgZScores);

  if (aggCascade.all?.length > 0) {
    console.log('  Active Cascade Patterns:');
    for (const c of aggCascade.all) {
      console.log(`    ${c.cascade.toUpperCase()} Stage ${c.stage}: ${c.name}`);
      console.log(`      ${c.description}`);
      console.log(`      Severity: ${c.severity.toFixed(3)} | Confidence: ${(c.confidence * 100).toFixed(0)}%`);
    }
  } else {
    console.log('  No active cascade patterns detected.');
  }

  if (aggSentinels?.length > 0) {
    console.log('\n  Sentinel Alerts:');
    for (const s of aggSentinels) {
      console.log(`    ${s.condition.toUpperCase()}: ${s.triggered_count}/${s.total_sentinels} sentinels (conf=${(s.confidence * 100).toFixed(0)}%)`);
      for (const d of s.details || []) {
        console.log(`      - ${d.name}: z=${d.z_score}`);
      }
    }
  } else {
    console.log('\n  No sentinel alerts triggered.');
  }

  // ─── STEP 11: PD Analysis ───
  console.log('\n━━━ STEP 11: PD Motor Analysis ━━━\n');

  let pdResult = null;
  try {
    pdResult = runPDAnalysis(avgZScores, sessionResults.map(r => r.z_scores || {}));
    if (pdResult) {
      console.log(`  PD Signature: ${pdResult.signature?.detected ? 'DETECTED' : 'not detected'} (conf=${((pdResult.signature?.confidence || 0) * 100).toFixed(0)}%)`);
      if (pdResult.signature?.detected) {
        console.log(`  Subtype: ${pdResult.subtype?.classification || 'N/A'}`);
        console.log(`  Stage: ${pdResult.staging?.stage || 'N/A'} (${pdResult.staging?.description || 'N/A'})`);
        console.log(`  UPDRS Estimate: ${pdResult.updrs_estimate?.total?.toFixed(1) || 'N/A'}/108`);
      }
    }
  } catch (e) {
    console.log(`  PD analysis error: ${e.message}`);
  }

  // ─── STEP 12: Acoustic Voice Profile ───
  console.log('\n━━━ STEP 12: Acoustic Voice Signature ━━━\n');

  const acousticKeys = [
    ['f0_mean', 'Hz', 'Fundamental Frequency'],
    ['f0_sd', 'Hz', 'F0 Standard Deviation'],
    ['f0_range', 'Hz', 'F0 Range'],
    ['jitter_local', '%', 'Jitter (vocal fold stability)'],
    ['shimmer_local', '%', 'Shimmer (amplitude stability)'],
    ['hnr', 'dB', 'Harmonics-to-Noise Ratio'],
    ['mfcc2_mean', '', 'MFCC-2 (vocal tract shape)'],
    ['cpp', 'dB', 'Cepstral Peak Prominence'],
    ['ppe', 'bits', 'Pitch Period Entropy (PD marker)'],
    ['rpde', '', 'RPDE (periodicity)'],
    ['dfa', '', 'DFA (fractal scaling)'],
    ['spectral_harmonicity', '', 'Spectral Harmonicity'],
    ['energy_range', 'dB', 'Energy Dynamic Range'],
    // V5 additions
    ['formant_bandwidth', 'Hz', 'Formant Bandwidth'],
    ['spectral_tilt', 'dB/oct', 'Spectral Tilt'],
    ['voice_breaks', '', 'Voice Breaks'],
    ['tremor_freq', 'Hz', 'Tremor Frequency (4-7 Hz)'],
    ['breathiness', '', 'Breathiness'],
    ['loudness_decay', 'dB/s', 'Loudness Decay'],
  ];

  console.log('  +--------------------------------------------+----------+----------+----+');
  console.log('  | Feature                                    |     Mean |   StdDev |  n |');
  console.log('  +--------------------------------------------+----------+----------+----+');
  for (const [key, unit, name] of acousticKeys) {
    const vals = sessionVectors.map(s => s.raw_acoustic?.[key]).filter(v => v != null && typeof v === 'number');
    if (vals.length > 0) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std = Math.sqrt(vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length);
      console.log(`  | ${name.padEnd(42)} | ${avg.toFixed(3).padStart(8)} | ${std.toFixed(3).padStart(8)} | ${String(vals.length).padStart(2)} |`);
    }
  }
  console.log('  +--------------------------------------------+----------+----------+----+');

  // ─── STEP 13: Session Stability ───
  console.log('\n━━━ STEP 13: Session-to-Session Stability ━━━\n');

  const composites = sessionResults.map(r => r.composite);
  const compMean = composites.reduce((a, b) => a + b, 0) / composites.length;
  const compStd = Math.sqrt(composites.reduce((a, b) => a + (b - compMean) ** 2, 0) / composites.length);
  const compCV = Math.abs(compMean) > 0.01 ? compStd / Math.abs(compMean) : 0;

  console.log('  Composite scores across sessions:');
  for (const r of sessionResults) {
    const barLen = Math.round(Math.max(0, (r.composite + 2) * 10));
    const bar = '#'.repeat(barLen);
    console.log(`    ${r.session_id}: ${r.composite.toFixed(3).padStart(7)} [${r.topic_genre}] ${bar}`);
  }
  console.log(`\n  Mean: ${compMean.toFixed(3)} | Std: ${compStd.toFixed(3)} | CV: ${compCV.toFixed(2)}`);
  console.log(`  Pattern: ${compStd < 0.15 ? 'STABLE' : compCV > 0.5 ? 'EPISODIC (depression/LBD-like)' : 'VARIABLE'}`);

  // ─── STEP 14: Trajectory Prediction ───
  console.log('\n━━━ STEP 14: 12-Week Trajectory Prediction ━━━\n');

  let trajectoryResult = null;
  try {
    trajectoryResult = predictTrajectory(avgDomainScores, differential.primary_hypothesis, {
      weeks_of_data: sessionVectors.length,
      current_composite: avgComposite,
    });

    if (trajectoryResult?.predictions) {
      console.log('  Predicted composite scores (12 weeks):');
      for (const p of trajectoryResult.predictions) {
        const bar = '#'.repeat(Math.round(Math.max(0, (p.composite + 2) * 8)));
        console.log(`    Week ${String(p.week).padStart(2)}: ${p.composite.toFixed(3).padStart(7)} ${bar}`);
      }
      console.log(`\n  Predicted alert at week ${trajectoryResult.predicted_alert_week || 'none'}`);
    }
  } catch (e) {
    console.log(`  Trajectory prediction error: ${e.message}`);
  }

  // ─── WRITE RESULTS ───
  const fullResults = {
    profile: 'profile01',
    analysis_version: 'v5',
    engine_codename: 'deep_voice',
    timestamp: new Date().toISOString(),
    detected_gender: detectedGender,
    avg_f0: avgF0,
    sessions_analyzed: sessionVectors.length,
    indicator_count: INDICATOR_COUNT,
    domains: Object.keys(DOMAINS).length,
    aggregate: {
      composite: avgComposite,
      cross_validated_composite: cvComposite || null,
      alert_level: avgAlert,
      domain_scores: avgDomainScores,
    },
    topic_analysis: {
      genre_distribution: genreCounts,
      per_session: sessionVectors.map(sv => ({
        session_id: sv.session_id,
        genre: sv.topic_genre,
        confidence: sv.topic_confidence,
        complexity: sv.topic_complexity,
      })),
    },
    nlp_anchors: {
      anchor_count: DETERMINISTIC_INDICATOR_IDS.length,
      averages: anchorAverages,
    },
    cross_validation: {
      loo: cvResults || null,
      split_half: shResults || null,
    },
    differential,
    lbd_analysis: lbdResult || null,
    ftd_analysis: ftdResult || null,
    pd_analysis: pdResult || null,
    cascade: aggCascade,
    sentinels: aggSentinels,
    trajectory: trajectoryResult || null,
    session_stability: { mean: compMean, std: compStd, cv: compCV },
    baseline_summary: {
      complete: baseline.complete,
      sessions: baseline.sessions,
      audio_available: baseline.audio_sessions || baseline.audio_available,
      high_variance: baseline.high_variance,
    },
    per_session: sessionResults.map(r => ({
      session_id: r.session_id,
      duration_s: r.duration_s,
      composite: r.composite,
      alert_level: r.alert_level,
      domain_scores: r.domain_scores,
      indicator_count: r.indicator_count,
      audio_available: r.audio_available,
      topic_genre: r.topic_genre,
      topic_adjusted: r.topic_adjusted,
      sentinel_alerts: r.sentinel_alerts,
      cascade: r.cascade,
    })),
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(fullResults, null, 2));

  console.log(`\n${'='.repeat(66)}`);
  console.log(`  V5 "deep_voice" analysis complete.`);
  console.log(`  Full results -> ${OUTPUT_PATH}`);
  console.log(`${'='.repeat(66)}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
