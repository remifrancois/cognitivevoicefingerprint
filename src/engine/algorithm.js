/**
 * V5 CORE SCORING ALGORITHM — 11-Domain Mixed Text+Audio with Topic Adjustment
 *
 * Extends V4's deterministic scoring to 122 indicators across 11 domains.
 * Adds pragmatic and executive domains, LBD/FTD cascade detection,
 * and topic-genre adjustment to eliminate ~44% false positive rate.
 *
 * Pipeline:
 *   transcript + audio → 122 features → z-scores → topic adjustment
 *   → 11-domain scores → confounder adjustment → composite
 *   → 5 cascade detectors → sentinel check → decline profile → alert level
 *
 * Changes from V4:
 *   - computeZScores gains topicGenre parameter for topic adjustment
 *   - 11 domains: +pragmatic, +executive
 *   - 5 cascade types: +LBD, +FTD
 *   - Sentinel sets expanded: +LBD, +FTD
 *   - analyzeSession returns topic_genre, topic_adjusted, indicator_confidence
 *
 * Cost: ~$0.10 per session (feature extraction via Claude + audio pipeline)
 */

import {
  INDICATORS, ALL_INDICATOR_IDS, DOMAINS, DOMAIN_WEIGHTS,
  SENTINELS, EARLY_DETECTION_INDICATORS
} from './indicators.js';
import { applyTopicAdjustments } from './topic-profiles.js';

// ════════════════════════════════════════════════
// NUMERIC SAFETY HELPERS
// ════════════════════════════════════════════════

function safeNum(v, fallback = 0) {
  return (v != null && Number.isFinite(v)) ? v : fallback;
}
function safeDiv(a, b, fallback = 0) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return fallback;
  const result = a / b;
  return Number.isFinite(result) ? result : fallback;
}

// ════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════

const AUDIO_DOMAIN_IDS = [...DOMAINS.acoustic, ...DOMAINS.pd_motor];

export const ALERT_THRESHOLDS = {
  green:  { min: -0.5, label: 'Normal variation' },
  yellow: { min: -1.0, label: 'Notable drift — monitor closely' },
  orange: { min: -1.5, label: 'Significant drift — recommend medical consultation' },
  red:    { min: -Infinity, label: 'Critical drift — urgent consultation' }
};

// ════════════════════════════════════════════════
// BASELINE COMPUTATION
// ════════════════════════════════════════════════

/**
 * Compute baseline statistics from calibration sessions.
 * Handles mixed vectors: audio indicators null for early sessions
 * (before audio pipeline active) are excluded from baseline.
 * Same as V4 but operates over 11 domains / 122 indicators.
 */
export function computeV5Baseline(sessionVectors, minSessions = 14) {
  if (sessionVectors.length < minSessions) {
    return { complete: false, sessions: sessionVectors.length, target: minSessions };
  }

  const baseline = {};
  const highVariance = [];
  const sufficientData = {};
  let audioSessionCount = 0;

  for (const vec of sessionVectors) {
    if (AUDIO_DOMAIN_IDS.some(id => vec[id] != null)) audioSessionCount++;
  }

  for (const id of ALL_INDICATOR_IDS) {
    const values = sessionVectors.map(v => v[id]).filter(v => v != null);
    sufficientData[id] = values.length >= 3;

    if (values.length < 3) {
      baseline[id] = { mean: 0.5, std: 0.05, n: 0 };
      continue;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) || 0.03;
    const cv = mean > 0 ? std / mean : 0;

    baseline[id] = {
      mean, std: Math.max(std, 0.02),
      min: Math.min(...values), max: Math.max(...values),
      n: values.length, cv
    };
    if (cv > 0.3) highVariance.push(id);
  }

  return {
    complete: true, sessions: sessionVectors.length, vector: baseline,
    high_variance: highVariance,
    needs_extension: highVariance.length > 5 && sessionVectors.length < 21,
    audio_available: audioSessionCount >= Math.floor(minSessions * 0.5),
    sufficient_data: sufficientData, audio_sessions: audioSessionCount
  };
}

// ════════════════════════════════════════════════
// Z-SCORE COMPUTATION
// ════════════════════════════════════════════════

/**
 * Compute z-scores for a session vector against baseline.
 * For "UP = bad" indicators (jitter, shimmer, PPE, RPDE, etc.),
 * invert the z-score so negative z always means decline.
 *
 * V5 addition: applies topic-genre adjustments when topicGenre is provided,
 * eliminating false positives from topic/genre-driven vocabulary shifts.
 */
export function computeZScores(sessionVector, baseline, topicGenre = null) {
  const zScores = {};
  const bv = baseline.vector || baseline;

  for (const id of ALL_INDICATOR_IDS) {
    const value = sessionVector[id];
    const base = bv[id];
    if (value == null || !base) { zScores[id] = null; continue; }

    const z = safeDiv(value - base.mean, base.std || 0.05, 0);
    const dirs = INDICATORS[id].directions;
    const adDir = dirs.alzheimer || 0;
    const depDir = dirs.depression || 0;
    const pdDir = dirs.parkinson || 0;

    // Dominant pathological direction across conditions
    const dominantDir = Math.abs(adDir) >= Math.abs(depDir)
      ? (Math.abs(adDir) >= Math.abs(pdDir) ? adDir : pdDir)
      : (Math.abs(depDir) >= Math.abs(pdDir) ? depDir : pdDir);

    zScores[id] = dominantDir === 1 ? -z : z;
  }

  // Apply topic adjustments if genre detected
  if (topicGenre) {
    return applyTopicAdjustments(zScores, topicGenre);
  }

  return zScores;
}

// ════════════════════════════════════════════════
// DOMAIN & COMPOSITE SCORING
// ════════════════════════════════════════════════

/**
 * Compute per-domain scores from z-scores. Covers all 11 domains.
 * Accepts either raw z-scores object or topic-adjusted result
 * (extracts .adjusted if present).
 */
export function computeDomainScores(zScores) {
  // Handle topic-adjusted result shape from applyTopicAdjustments
  const z = zScores.adjusted || zScores;

  const scores = {};
  for (const [domain, indicatorIds] of Object.entries(DOMAINS)) {
    const valid = [];
    for (const id of indicatorIds) {
      const zVal = z[id];
      if (zVal != null) valid.push({ z: zVal, weight: INDICATORS[id].base_weight || 0.5 });
    }
    if (valid.length === 0) { scores[domain] = null; continue; }
    const tw = valid.reduce((s, v) => s + v.weight, 0);
    const score = safeDiv(valid.reduce((s, v) => s + v.z * v.weight, 0), tw, 0);
    scores[domain] = Number.isFinite(score) ? score : null;
  }
  return scores;
}

/**
 * 11-domain composite. When acoustic/pd_motor/pragmatic/executive have null scores,
 * redistribute their weights proportionally across available domains.
 */
export function computeComposite(domainScores) {
  let totalWeight = 0, nullWeight = 0;
  const available = [];

  for (const [domain, weight] of Object.entries(DOMAIN_WEIGHTS)) {
    const score = domainScores[domain];
    if (score == null || !Number.isFinite(score)) { nullWeight += weight; }
    else { available.push({ weight, score }); totalWeight += weight; }
  }
  if (totalWeight === 0) return 0;

  // Bound amplification factor to prevent extreme weight redistribution
  const factor = Math.min((totalWeight + nullWeight) / totalWeight, 2.0);
  let composite = 0;
  for (const { weight, score } of available) {
    const term = score * weight * factor;
    if (Number.isFinite(term)) composite += term;
  }

  const adjustedTotal = totalWeight + nullWeight;
  const availableCount = Object.keys(DOMAIN_WEIGHTS).length;
  const result = totalWeight > 0 ? safeDiv(composite, adjustedTotal, 0) * availableCount * 0.2 : 0;
  return Number.isFinite(result) ? result : 0;
}

// ════════════════════════════════════════════════
// ALERT LEVELS
// ════════════════════════════════════════════════

export function getAlertLevel(compositeScore) {
  if (compositeScore >= -0.5) return 'green';
  if (compositeScore >= -1.0) return 'yellow';
  if (compositeScore >= -1.5) return 'orange';
  return 'red';
}

// ════════════════════════════════════════════════
// CASCADE DETECTION (5 cascade types)
// ════════════════════════════════════════════════

/**
 * Detect cascade patterns from domain scores.
 * 1. AD Cascade (V3 preserved): fluency -> semantic -> syntactic -> discourse collapse
 * 2. PD Cascade: monopitch -> phonatory -> articulatory -> prosodic collapse
 * 3. Depression Cascade: affective shift -> temporal changes -> engagement withdrawal
 * 4. LBD Cascade (V5 new): fluctuating attention -> concurrent motor+cognitive
 * 5. FTD Cascade (V5 new): pragmatic collapse / semantic collapse / executive dysfunction
 */
export function detectCascade(domainScores) {
  const ad = detectADCascade(domainScores);
  const pd = detectPDCascade(domainScores);
  const dep = detectDepressionCascade(domainScores);
  const lbd = detectLBDCascade(domainScores);
  const ftd = detectFTDCascade(domainScores);
  return {
    alzheimer: ad, parkinson: pd, depression: dep, lbd, ftd,
    all: [...ad, ...pd, ...dep, ...lbd, ...ftd].sort((a, b) => b.severity - a.severity)
  };
}

/** AD Cascade -- preserved from V3. */
function detectADCascade(domainScores) {
  const patterns = [];
  const lex = domainScores.lexical ?? 0, syn = domainScores.syntactic ?? 0;
  const sem = domainScores.semantic ?? 0, tmp = domainScores.temporal ?? 0;
  const mem = domainScores.memory ?? 0;

  if (tmp < -0.3 && lex > -0.2 && sem > -0.2) {
    patterns.push({
      stage: 0, name: 'pre_symptomatic_fluency', cascade: 'alzheimer',
      description: 'Subtle fluency changes with preserved language — possible pre-symptomatic tau (Young 2024)',
      confidence: Math.min(safeNum(Math.abs(tmp)) / 0.5, 1), severity: Math.abs(tmp)
    });
  }
  if ((lex < -0.5 || sem < -0.5) && (lex < -0.3 && sem < -0.3)) {
    patterns.push({
      stage: 1, name: 'semantic_memory_involvement', cascade: 'alzheimer',
      description: 'Lexical and semantic decline — core AD Stage 1 pattern (Fraser 2015)',
      confidence: Math.min(safeNum(Math.abs(lex) + Math.abs(sem)) / 2, 1),
      severity: (Math.abs(lex) + Math.abs(sem)) / 2
    });
  }
  if (syn < -0.5 && patterns.some(p => p.stage === 1)) {
    patterns.push({
      stage: 2, name: 'syntactic_simplification', cascade: 'alzheimer',
      description: 'Syntactic decline on top of semantic — AD Stage 2 (Mueller 2018)',
      confidence: Math.min(safeNum(Math.abs(syn)) / 1.0, 1), severity: Math.abs(syn)
    });
  }
  if (sem < -1.0 && tmp < -0.5) {
    patterns.push({
      stage: 3, name: 'discourse_collapse', cascade: 'alzheimer',
      description: 'Coherence and fluency breakdown — AD Stage 3 (Fraser 2015)',
      confidence: Math.min(safeNum(Math.abs(sem) + Math.abs(tmp)) / 3, 1),
      severity: (Math.abs(sem) + Math.abs(tmp)) / 2
    });
  }
  if (mem < -0.5 && patterns.some(p => p.stage >= 1)) {
    patterns.push({
      stage: patterns[patterns.length - 1].stage,
      name: 'memory_cascade', cascade: 'alzheimer',
      description: 'Memory decline accelerating alongside language cascade',
      confidence: Math.min(safeNum(Math.abs(mem)) / 1.0, 1), severity: Math.abs(mem)
    });
  }
  return patterns.sort((a, b) => a.stage - b.stage);
}

/** PD Cascade -- monopitch -> phonatory -> articulatory -> prosodic collapse. */
function detectPDCascade(domainScores) {
  const patterns = [];
  const acu = domainScores.acoustic ?? null, pdm = domainScores.pd_motor ?? null;
  const tmp = domainScores.temporal ?? 0;

  if (acu == null && pdm == null) return patterns;
  const acuVal = acu ?? 0, pdmVal = pdm ?? 0;

  if (acuVal < -0.3 && pdmVal > -0.2) {
    patterns.push({
      stage: 0, name: 'monopitch_only', cascade: 'parkinson',
      description: 'Reduced pitch variation with preserved voice quality — possible prodromal PD (Rusz 2021)',
      confidence: Math.min(safeNum(Math.abs(acuVal)) / 0.5, 1), severity: Math.abs(acuVal)
    });
  }
  if (acuVal < -0.5 && (pdmVal < -0.2 || acuVal < -0.7)) {
    patterns.push({
      stage: 1, name: 'phonatory_degradation', cascade: 'parkinson',
      description: 'Phonatory instability (HNR, jitter) — PD Stage 1 vocal fold dysfunction (Little 2009)',
      confidence: Math.min(safeNum(Math.abs(acuVal)) / 1.0, 1), severity: Math.abs(acuVal)
    });
  }
  if (pdmVal < -0.5 && patterns.some(p => p.stage >= 1)) {
    patterns.push({
      stage: 2, name: 'articulatory_breakdown', cascade: 'parkinson',
      description: 'Articulatory decline (VSA, DDK) on top of phonatory — PD Stage 2 (Rusz 2013)',
      confidence: Math.min(safeNum(Math.abs(pdmVal)) / 1.0, 1), severity: Math.abs(pdmVal)
    });
  }
  if (pdmVal < -1.0 && tmp < -0.5) {
    patterns.push({
      stage: 3, name: 'prosodic_fluency_collapse', cascade: 'parkinson',
      description: 'Full prosodic and fluency breakdown — PD Stage 3 hypokinetic dysarthria (Cao 2025)',
      confidence: Math.min(safeNum(Math.abs(pdmVal) + Math.abs(tmp)) / 3, 1),
      severity: (Math.abs(pdmVal) + Math.abs(tmp)) / 2
    });
  }
  return patterns.sort((a, b) => a.stage - b.stage);
}

/** Depression Cascade -- affective shift -> temporal retardation -> engagement withdrawal. */
function detectDepressionCascade(domainScores) {
  const patterns = [];
  const aff = domainScores.affective ?? 0, tmp = domainScores.temporal ?? 0;
  const lex = domainScores.lexical ?? 0, dis = domainScores.discourse ?? 0;
  const acu = domainScores.acoustic ?? null;

  if (aff < -0.3) {
    patterns.push({
      stage: 0, name: 'affective_shift', cascade: 'depression',
      description: 'Affective language shift (self-focus, negative valence) — early depression signal (Zhang 2022)',
      confidence: Math.min(safeNum(Math.abs(aff)) / 0.5, 1), severity: Math.abs(aff)
    });
  }
  if (tmp < -0.4 && patterns.some(p => p.stage === 0)) {
    patterns.push({
      stage: 1, name: 'temporal_retardation', cascade: 'depression',
      description: 'Speech rate and latency changes — psychomotor retardation (Yamamoto 2020)',
      confidence: Math.min(safeNum(Math.abs(aff) + Math.abs(tmp)) / 2, 1),
      severity: (Math.abs(aff) + Math.abs(tmp)) / 2
    });
  }
  const engDrop = (lex < -0.5 || dis < -0.4) || (acu != null && acu < -0.5);
  if (engDrop && patterns.some(p => p.stage >= 1)) {
    const acuSev = acu != null ? Math.abs(acu) : 0;
    const combined = (Math.abs(lex) + Math.abs(dis) + acuSev) / (acu != null ? 3 : 2);
    patterns.push({
      stage: 2, name: 'engagement_withdrawal', cascade: 'depression',
      description: 'Engagement withdrawal — reduced output, topic narrowing, flat prosody (Cohn 2009)',
      confidence: Math.min(safeNum(combined) / 1.0, 1), severity: combined
    });
  }
  return patterns.sort((a, b) => a.stage - b.stage);
}

/** LBD Cascade (V5 new) -- fluctuating attention -> concurrent motor+cognitive decline. */
function detectLBDCascade(domainScores) {
  const patterns = [];
  const acu = domainScores.acoustic ?? null;
  const pdm = domainScores.pd_motor ?? null;
  const sem = domainScores.semantic ?? 0;
  const mem = domainScores.memory ?? 0;
  const exe = domainScores.executive ?? 0;

  // LBD Stage 0: Fluctuating attention/executive function
  if (exe < -0.3 && sem > -0.2) {
    patterns.push({
      stage: 0, name: 'fluctuating_attention', cascade: 'lbd',
      description: 'Executive/attention fluctuation with preserved semantics — possible early LBD',
      confidence: Math.min(Math.abs(exe) / 0.5, 1), severity: Math.abs(exe)
    });
  }
  // LBD Stage 1: PD motor + cognitive (concurrent, unlike PD which spares cognitive early)
  if ((acu != null && acu < -0.3 || pdm != null && pdm < -0.3) && (sem < -0.3 || mem < -0.3)) {
    patterns.push({
      stage: 1, name: 'motor_cognitive_concurrent', cascade: 'lbd',
      description: 'Concurrent motor and cognitive decline — LBD pattern',
      confidence: 0.6, severity: (Math.abs(sem) + Math.abs(mem)) / 2
    });
  }
  return patterns.sort((a, b) => a.stage - b.stage);
}

/** FTD Cascade (V5 new) -- pragmatic collapse / semantic collapse / executive dysfunction. */
function detectFTDCascade(domainScores) {
  const patterns = [];
  const pra = domainScores.pragmatic ?? null;
  const exe = domainScores.executive ?? null;
  const sem = domainScores.semantic ?? 0;
  const mem = domainScores.memory ?? 0;
  const lex = domainScores.lexical ?? 0;

  // FTD behavioral: pragmatic collapse, memory preserved
  if (pra != null && pra < -0.5 && mem > -0.3) {
    patterns.push({
      stage: 0, name: 'pragmatic_collapse', cascade: 'ftd',
      description: 'Pragmatic language collapse with preserved memory — FTD behavioral variant',
      confidence: Math.min(Math.abs(pra) / 1.0, 1), severity: Math.abs(pra)
    });
  }
  // FTD semantic: severe lexical/semantic decline with preserved syntax
  if (lex < -0.7 && sem < -0.7 && (domainScores.syntactic ?? 0) > -0.3) {
    patterns.push({
      stage: 1, name: 'semantic_collapse', cascade: 'ftd',
      description: 'Severe lexical-semantic collapse with preserved syntax — FTD semantic variant',
      confidence: Math.min((Math.abs(lex) + Math.abs(sem)) / 2, 1), severity: (Math.abs(lex) + Math.abs(sem)) / 2
    });
  }
  // FTD executive: executive domain leads
  if (exe != null && exe < -0.5) {
    patterns.push({
      stage: 0, name: 'executive_dysfunction', cascade: 'ftd',
      description: 'Executive function decline — supports FTD',
      confidence: Math.min(Math.abs(exe) / 1.0, 1), severity: Math.abs(exe)
    });
  }
  return patterns.sort((a, b) => a.stage - b.stage);
}

// ════════════════════════════════════════════════
// CONFOUNDER ADJUSTMENT
// ════════════════════════════════════════════════

const CONFOUNDER_WEIGHTS = {
  illness:            { global: 0.5 },
  poor_sleep:         { global: 0.5 },
  medication_change:  { global: 0.3, domain_specific: { pd_motor: 0.5 } },
  emotional_distress: {
    domain_specific: {
      temporal: 0.5, memory: 1.2, semantic: 0.7, lexical: 1.0,
      syntactic: 1.0, discourse: 0.8, affective: 0.3,
      pragmatic: 0.6, executive: 0.8
    }
  },
  cold_illness: { domain_specific: { acoustic: 0.3 } }
};

/**
 * Apply confounder weighting to domain scores.
 * cold_illness: reduces acoustic weight by 0.3 (HNR, jitter affected by cold)
 * medication_change: V3 global + reduces pd_motor weight by 0.5
 * emotional_distress: V5 adds pragmatic (0.6) and executive (0.8) adjustments
 */
const ALLOWED_CONFOUNDERS = new Set(Object.keys(CONFOUNDER_WEIGHTS));

export function applyConfounders(zScores, domainScores, confounders = {}) {
  let globalWeight = 1.0;
  const domainAdj = {};

  for (const [confounder, active] of Object.entries(confounders)) {
    if (!active) continue;
    // Only accept known confounders (whitelist)
    if (!ALLOWED_CONFOUNDERS.has(confounder)) continue;
    const config = CONFOUNDER_WEIGHTS[confounder];
    if (!config) continue;
    if (config.global) globalWeight = Math.max(0.1, Math.min(globalWeight, config.global));
    if (config.domain_specific) {
      for (const [d, adj] of Object.entries(config.domain_specific)) {
        domainAdj[d] = Math.max(0.1, Math.min(10, (domainAdj[d] || 1.0) * adj));
      }
    }
  }

  const adjusted = { ...domainScores };
  for (const [domain, score] of Object.entries(adjusted)) {
    if (score == null || !Number.isFinite(score)) continue;
    adjusted[domain] = score * globalWeight * (domainAdj[domain] || 1.0);
  }
  return { domainScores: adjusted, globalWeight, domainAdjustments: domainAdj };
}

// ════════════════════════════════════════════════
// SENTINEL CHECKING
// ════════════════════════════════════════════════

/** Check V5 expanded sentinels: AD, depression, PD, LBD, FTD. */
export function checkSentinels(zScores) {
  // Handle topic-adjusted result shape from applyTopicAdjustments
  const z = zScores.adjusted || zScores;

  const alerts = [];
  for (const [condition, sentinelIds] of Object.entries(SENTINELS)) {
    let triggered = 0;
    const details = [];
    const threshold = condition === 'depression' ? -0.4 : -0.5;

    for (const id of sentinelIds) {
      const zVal = z[id];
      if (zVal == null || !Number.isFinite(zVal)) continue;
      // Reject extreme z-scores (likely computational errors, not real signals)
      if (Math.abs(zVal) > 5) continue;
      if (zVal < threshold) {
        triggered++;
        details.push({ indicator: id, z_score: Math.round(zVal * 100) / 100, name: INDICATORS[id].name });
      }
    }
    if (triggered >= 2) {
      alerts.push({
        condition, triggered_count: triggered, total_sentinels: sentinelIds.length,
        details, confidence: Math.min(triggered / sentinelIds.length, 1)
      });
    }
  }
  return alerts;
}

// ════════════════════════════════════════════════
// DECLINE PROFILE COMPUTATION
// ════════════════════════════════════════════════

/**
 * Analyze which domains are declining fastest across history.
 * Per-domain velocity via linear slope over last 4 weeks.
 * Returns { leading_edge, domain_velocities, predicted_next, profile_type }
 *
 * V5: extended sequences for LBD and FTD cascades, profile types expanded.
 */
export function computeDeclineProfile(history) {
  const empty = { leading_edge: null, domain_velocities: {}, predicted_next: null, profile_type: 'stable' };
  if (!history || history.length < 2) return empty;

  // Group last 28 sessions into weekly bins
  const recent = history.slice(-28);
  const weeks = [];
  for (let i = 0; i < recent.length; i += 7) weeks.push(recent.slice(i, i + 7));
  if (weeks.length < 2) return empty;

  // Per-domain weekly averages -> linear slope
  const velocities = {};
  for (const domain of Object.keys(DOMAINS)) {
    const avgs = weeks.map(w => {
      const vals = w.map(s => s.domain_scores?.[domain]).filter(v => v != null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
    const pts = avgs.map((v, i) => v != null ? { x: i, y: v } : null).filter(p => p != null);
    if (pts.length < 2) { velocities[domain] = 0; continue; }

    const n = pts.length;
    const xm = pts.reduce((s, p) => s + p.x, 0) / n;
    const ym = pts.reduce((s, p) => s + p.y, 0) / n;
    let num = 0, den = 0;
    for (const p of pts) { num += (p.x - xm) * (p.y - ym); den += (p.x - xm) ** 2; }
    velocities[domain] = den > 0 ? Math.round((num / den) * 1000) / 1000 : 0;
  }

  const ranked = Object.entries(velocities).filter(([, v]) => v !== 0).sort(([, a], [, b]) => a - b);
  const leadingEdge = ranked.length > 0 ? ranked[0][0] : null;

  // Predict next decline based on cascade sequences
  let predictedNext = null;
  if (leadingEdge) {
    const sequences = [
      ['temporal', 'lexical', 'semantic', 'syntactic', 'discourse'],             // AD
      ['acoustic', 'pd_motor', 'temporal', 'lexical'],                           // PD
      ['affective', 'temporal', 'lexical', 'discourse'],                         // Depression
      ['executive', 'acoustic', 'pd_motor', 'semantic', 'memory'],              // LBD
      ['pragmatic', 'executive', 'lexical', 'semantic'],                         // FTD
    ];
    for (const seq of sequences) {
      const idx = seq.indexOf(leadingEdge);
      if (idx >= 0) {
        for (let i = idx + 1; i < seq.length; i++) {
          if ((velocities[seq[i]] || 0) > -0.1) { predictedNext = seq[i]; break; }
        }
        if (predictedNext) break;
      }
    }
  }

  // Classify profile type
  const adDom = ['lexical', 'semantic', 'syntactic', 'memory'];
  const pdDom = ['acoustic', 'pd_motor'];
  const depDom = ['affective'];
  const lbdDom = ['executive', 'pd_motor', 'memory'];
  const ftdDom = ['pragmatic', 'executive', 'lexical'];
  const cnt = (arr) => arr.filter(d => (velocities[d] || 0) < -0.05).length;
  const adC = cnt(adDom), pdC = cnt(pdDom), depC = cnt(depDom);
  const lbdC = cnt(lbdDom), ftdC = cnt(ftdDom);

  let profileType = 'stable';

  // Check most specific patterns first
  if (lbdC >= 2 && pdC >= 1) profileType = 'lbd_like';
  else if (ftdC >= 2 && adC <= 1) profileType = 'ftd_like';
  else if (pdC >= 1 && adC <= 1 && depC === 0) profileType = 'pd_like';
  else if (adC >= 2 && pdC === 0) profileType = 'ad_like';
  else if (depC >= 1 && adC <= 1 && pdC === 0) profileType = 'dep_like';
  else if ((adC >= 1 && pdC >= 1) || (adC >= 1 && depC >= 1)) profileType = 'mixed';
  else if (leadingEdge) {
    if (adDom.includes(leadingEdge)) profileType = 'ad_like';
    else if (pdDom.includes(leadingEdge)) profileType = 'pd_like';
    else if (depDom.includes(leadingEdge)) profileType = 'dep_like';
    else if (lbdDom.includes(leadingEdge)) profileType = 'lbd_like';
    else if (ftdDom.includes(leadingEdge)) profileType = 'ftd_like';
  }

  return { leading_edge: leadingEdge, domain_velocities: velocities, predicted_next: predictedNext, profile_type: profileType };
}

// ════════════════════════════════════════════════
// FULL SESSION ANALYSIS PIPELINE
// ════════════════════════════════════════════════

/**
 * Run the complete V5 analysis pipeline on a session.
 * 1. Z-scores (+ topic adjustment) -> 2. Domain scores (11) -> 3. Confounders
 * -> 4. Composite -> 5. Alert level -> 6. Cascade (AD/PD/Dep/LBD/FTD)
 * -> 7. Sentinels -> 8. Decline profile
 *
 * V5 additions:
 *   - topicGenre parameter for topic-based z-score adjustment
 *   - indicatorConfidence for per-indicator reliability reporting
 *   - Return object includes topic_genre, topic_adjusted, indicator_confidence
 */
export function analyzeSession(sessionVector, baseline, confounders = {}, history = [], topicGenre = null, indicatorConfidence = null) {
  const audioAvailable = AUDIO_DOMAIN_IDS.some(id => sessionVector[id] != null);
  const zScoresResult = computeZScores(sessionVector, baseline, topicGenre);

  // computeZScores returns either plain z-scores object or topic-adjusted result
  // with { adjusted, adjustments_applied, genre, confidence } shape
  const isTopicAdjusted = !!(zScoresResult && zScoresResult.adjusted);
  const zScores = isTopicAdjusted ? zScoresResult.adjusted : zScoresResult;

  const rawDomainScores = computeDomainScores(zScores);
  const { domainScores, globalWeight, domainAdjustments } = applyConfounders(zScores, rawDomainScores, confounders);
  const composite = computeComposite(domainScores);
  const alertLevel = getAlertLevel(composite);
  const cascade = detectCascade(domainScores);
  const sentinelAlerts = checkSentinels(zScores);
  const declineProfile = history.length >= 2 ? computeDeclineProfile(history) : null;

  // Extract per-indicator acoustic/pd_motor z-scores for dedicated reporting
  const acousticScores = {}, pdMotorScores = {};
  if (audioAvailable) {
    for (const id of DOMAINS.acoustic) { if (zScores[id] != null) acousticScores[id] = zScores[id]; }
    for (const id of DOMAINS.pd_motor) { if (zScores[id] != null) pdMotorScores[id] = zScores[id]; }
  }

  return {
    version: 'v5',
    composite, alert_level: alertLevel,
    domain_scores: domainScores, raw_domain_scores: rawDomainScores, z_scores: zScores,
    cascade, sentinel_alerts: sentinelAlerts,
    confounder_weight: globalWeight, confounder_domain_adjustments: domainAdjustments,
    indicator_count: Object.values(zScores).filter(v => v != null).length,
    audio_available: audioAvailable,
    acoustic_scores: audioAvailable ? acousticScores : null,
    pd_motor_scores: audioAvailable ? pdMotorScores : null,
    decline_profile: declineProfile,
    // V5 new fields:
    topic_genre: topicGenre || null,
    topic_adjusted: !!topicGenre,
    indicator_confidence: indicatorConfidence || null,
  };
}

// ════════════════════════════════════════════════
// WEEKLY AGGREGATION
// ════════════════════════════════════════════════

/** Run weekly aggregation over sessions. Same V4 pattern, 11 domains. */
export function analyzeWeek(sessions, baseline, weekNumber) {
  if (sessions.length === 0) return null;

  const results = sessions.map(s => analyzeSession(
    s.feature_vector, baseline, s.confounders, [], s.topic_genre || null, s.indicator_confidence || null
  ));
  const weekAudio = results.some(r => r.audio_available);

  const avgDomainScores = {};
  for (const domain of Object.keys(DOMAINS)) {
    const vals = results.map(r => r.domain_scores[domain]).filter(v => v != null);
    avgDomainScores[domain] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  const composite = computeComposite(avgDomainScores);
  const composites = results.map(r => r.composite);
  const trend = composites.length >= 2 ? composites[composites.length - 1] - composites[0] : 0;

  // Aggregate acoustic/pd_motor z-scores across sessions
  const weekAcu = {}, weekPdm = {};
  if (weekAudio) {
    for (const id of DOMAINS.acoustic) {
      const v = results.map(r => r.acoustic_scores?.[id]).filter(v => v != null);
      if (v.length > 0) weekAcu[id] = v.reduce((a, b) => a + b, 0) / v.length;
    }
    for (const id of DOMAINS.pd_motor) {
      const v = results.map(r => r.pd_motor_scores?.[id]).filter(v => v != null);
      if (v.length > 0) weekPdm[id] = v.reduce((a, b) => a + b, 0) / v.length;
    }
  }

  // Aggregate topic-genre stats across sessions
  const topicGenres = results.map(r => r.topic_genre).filter(g => g != null);
  const topicAdjustedCount = results.filter(r => r.topic_adjusted).length;

  return {
    version: 'v5', week_number: weekNumber, composite,
    alert_level: getAlertLevel(composite), domain_scores: avgDomainScores,
    cascade: detectCascade(avgDomainScores), sessions_analyzed: sessions.length,
    trend: Math.round(trend * 1000) / 1000,
    session_composites: composites.map(c => Math.round(c * 1000) / 1000),
    audio_available: weekAudio,
    acoustic_scores: weekAudio ? weekAcu : null,
    pd_motor_scores: weekAudio ? weekPdm : null,
    // V5 weekly aggregates:
    topic_genres: topicGenres,
    topic_adjusted_sessions: topicAdjustedCount,
  };
}
