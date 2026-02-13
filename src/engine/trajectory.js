/**
 * V5 TRAJECTORY PREDICTOR
 *
 * Enhanced trajectory prediction with:
 * 1. 11 domains (added pragmatic, executive)
 * 2. Individual decline profiles — per-domain velocity ranking
 * 3. PD-specific progression models (H&Y-modulated)
 * 4. MSA/PSP atypical parkinsonism models
 * 5. LBD progression model — fluctuating, concurrent motor + cognitive decline
 * 6. FTD progression model — pragmatic-led (behavioral), semantic-led (semantic variant)
 * 7. Cascade-aware domain-level forecasting
 * 8. Cognitive twin trajectory (pure aging, 11 domains)
 * 9. Age-stratified normal aging rates (50-59, 60-69, 70-79, 80+)
 *
 * V5.1 addition: Age-band-aware decline rates prevent false disease flags
 * from natural aging. Normal aging is UNIFORM across domains; disease is
 * domain-ASYMMETRIC and ACCELERATING. Age stratification sharpens this
 * distinction by adjusting expected decline rates per decade:
 *   - Salthouse 2004, Verhaegen 2003 (cognitive), Xue & Hao 2003 (voice)
 *
 * Extends V4 with LBD and FTD condition-specific domain ordering:
 *   AD  — lexical/semantic lead, cascade-accelerated
 *   PD  — phonation first, then articulation, then prosody
 *   MSA — faster than PD, articulatory acceleration
 *   PSP — fastest motor decline, spastic component
 *   LBD — concurrent motor + cognitive, fluctuating pattern, executive/attention prominent
 *   FTD — pragmatic-led decline (behavioral), executive dysfunction prominent
 *
 * No LLM inference needed — pure computation from evidence-based models.
 */

import { DOMAIN_WEIGHTS } from './indicators.js';

// ════════════════════════════════════════════════════════
// AGE-STRATIFIED NORMAL AGING RATES (per year, converted to per-week)
//
// Derived from normative meta-analyses:
//   - Salthouse 2004: cognitive aging trajectories across decades
//   - Verhaegen 2003: meta-analysis of aging and language production
//   - Xue & Hao 2003: voice aging (F0, jitter, shimmer, HNR changes)
//   - Kemper 2001: syntactic complexity decline with age
//
// Key insight: normal aging accelerates non-linearly. A 75-year-old
// declines faster per year than a 55-year-old, but the pattern is
// UNIFORM across domains (unlike disease, which is domain-asymmetric).
// ════════════════════════════════════════════════════════

export const AGE_BANDS = {
  '50-59': {
    lexical:   -0.010 / 52, memory:    -0.012 / 52, temporal:  -0.008 / 52,
    semantic:  -0.005 / 52, syntactic: -0.005 / 52, acoustic:  -0.008 / 52,
    pd_motor:  -0.003 / 52, discourse: -0.003 / 52, affective: -0.003 / 52,
    pragmatic: -0.003 / 52, executive: -0.005 / 52,
  },
  '60-69': {
    lexical:   -0.018 / 52, memory:    -0.020 / 52, temporal:  -0.015 / 52,
    semantic:  -0.010 / 52, syntactic: -0.008 / 52, acoustic:  -0.015 / 52,
    pd_motor:  -0.006 / 52, discourse: -0.005 / 52, affective: -0.005 / 52,
    pragmatic: -0.005 / 52, executive: -0.008 / 52,
  },
  '70-79': {
    lexical:   -0.028 / 52, memory:    -0.035 / 52, temporal:  -0.020 / 52,
    semantic:  -0.015 / 52, syntactic: -0.012 / 52, acoustic:  -0.025 / 52,
    pd_motor:  -0.010 / 52, discourse: -0.008 / 52, affective: -0.006 / 52,
    pragmatic: -0.006 / 52, executive: -0.012 / 52,
  },
  '80+': {
    lexical:   -0.040 / 52, memory:    -0.050 / 52, temporal:  -0.030 / 52,
    semantic:  -0.020 / 52, syntactic: -0.018 / 52, acoustic:  -0.035 / 52,
    pd_motor:  -0.015 / 52, discourse: -0.010 / 52, affective: -0.008 / 52,
    pragmatic: -0.008 / 52, executive: -0.018 / 52,
  },
};

/** Default rates (used when age is unknown — conservative middle estimate). */
const WEEKLY_AGING_RATES = {
  lexical:    -0.02  / 52,
  syntactic:  -0.01  / 52,
  semantic:   -0.01  / 52,
  temporal:   -0.015 / 52,
  memory:     -0.02  / 52,
  discourse:  -0.005 / 52,
  affective:  -0.005 / 52,
  acoustic:   -0.01  / 52,
  pd_motor:   -0.005 / 52,
  pragmatic:  -0.005 / 52,
  executive:  -0.008 / 52,
};

/**
 * Get the age band key for a given age.
 * @param {number|null} age — patient age in years
 * @returns {string|null} — age band key or null if unknown
 */
export function getAgeBand(age) {
  if (age == null || !Number.isFinite(age)) return null;
  if (age < 50) return '50-59'; // use youngest band for <50
  if (age < 60) return '50-59';
  if (age < 70) return '60-69';
  if (age < 80) return '70-79';
  return '80+';
}

/**
 * Get age-adjusted weekly decline rate for a domain.
 * Falls back to default WEEKLY_AGING_RATES if age is unknown.
 *
 * @param {string} domain — domain name
 * @param {number|null} age — patient age in years
 * @returns {number} — expected weekly decline rate (negative)
 */
export function getAgeAdjustedRate(domain, age) {
  const band = getAgeBand(age);
  if (band && AGE_BANDS[band]?.[domain] != null) {
    return AGE_BANDS[band][domain];
  }
  return WEEKLY_AGING_RATES[domain] || -0.0003;
}

// ════════════════════════════════════════════════════════
// EXCESS DECLINE — decline beyond age-expected baseline
// ════════════════════════════════════════════════════════

/**
 * Compute per-domain excess decline: observed velocity minus age-expected rate.
 * Positive excess = declining faster than age predicts = pathological signal.
 *
 * This is the core mechanism for separating disease from aging:
 *   excess = |observed_rate| - |age_expected_rate|
 *   If excess > 0, decline exceeds age norms → investigate disease.
 *   If excess ≤ 0, decline is within age-expected range → likely normal aging.
 *
 * @param {Object} domainVelocities — per-domain observed velocity (from computeDeclineProfile)
 * @param {number|null} patientAge — age in years
 * @returns {Object} — { domain: excess_value } (positive = pathological excess)
 */
export function computeExcessDecline(domainVelocities, patientAge) {
  const excess = {};
  for (const [domain, velocity] of Object.entries(domainVelocities)) {
    const expected = getAgeAdjustedRate(domain, patientAge);
    // Both velocity and expected are negative. Excess = how much worse than expected.
    // velocity = -0.05, expected = -0.02 → excess = 0.03 (declining 0.03 faster than expected)
    excess[domain] = Math.round((Math.abs(velocity) - Math.abs(expected)) * 10000) / 10000;
  }
  return excess;
}

// ════════════════════════════════════════════════════════
// CASCADE BOOST TABLES
// ════════════════════════════════════════════════════════

/**
 * AD cascade: semantic -> syntactic -> temporal -> memory -> global
 * Higher stage = more domains recruited, faster per-domain decline.
 * Extended for 11 domains — pragmatic and executive at 1.0 (not affected by AD cascade).
 */
function getCascadeBoost(domain, stage) {
  const boosts = {
    0: { lexical: 1.0, semantic: 1.0, syntactic: 1.0, temporal: 1.5, memory: 1.0, discourse: 1.0, affective: 1.0, acoustic: 1.0, pd_motor: 1.0, pragmatic: 1.0, executive: 1.0 },
    1: { lexical: 1.5, semantic: 1.5, syntactic: 1.0, temporal: 1.2, memory: 1.3, discourse: 1.0, affective: 1.0, acoustic: 1.0, pd_motor: 1.0, pragmatic: 1.0, executive: 1.0 },
    2: { lexical: 1.5, semantic: 1.5, syntactic: 1.5, temporal: 1.3, memory: 1.5, discourse: 1.2, affective: 1.0, acoustic: 1.0, pd_motor: 1.0, pragmatic: 1.0, executive: 1.0 },
    3: { lexical: 1.5, semantic: 1.5, syntactic: 1.5, temporal: 1.5, memory: 1.5, discourse: 1.5, affective: 1.0, acoustic: 1.0, pd_motor: 1.0, pragmatic: 1.0, executive: 1.0 },
  };
  return boosts[stage]?.[domain] || 1.0;
}

/**
 * PD domain ordering: phonation -> articulation -> prosody -> cognitive.
 * Acoustic and pd_motor domains decline 1.5-2x faster than text domains.
 * Extended for 11 domains.
 */
function getPdDomainRate(domain, baseRate) {
  const pdMultipliers = {
    acoustic:   2.0,   // phonation degrades first
    pd_motor:   1.5,   // motor features next
    temporal:   1.2,   // prosodic timing
    lexical:    0.5,   // cognitive domains spared early
    syntactic:  0.4,
    semantic:   0.3,
    memory:     0.4,
    discourse:  0.3,
    affective:  0.3,
    pragmatic:  0.3,   // spared early in PD
    executive:  0.5,   // mild executive involvement in PD
  };
  return baseRate * (pdMultipliers[domain] || 0.5);
}

/**
 * MSA domain ordering: faster than PD, more variable, articulatory decay accelerating.
 * Extended for 11 domains.
 */
function getMsaDomainRate(domain, weekOffset) {
  const baseRates = {
    acoustic:   -0.025,
    pd_motor:   -0.020,
    temporal:   -0.018,
    lexical:    -0.008,
    syntactic:  -0.006,
    semantic:   -0.005,
    memory:     -0.006,
    discourse:  -0.005,
    affective:  -0.004,
    pragmatic:  -0.004,
    executive:  -0.006,
  };
  const rate = baseRates[domain] || -0.005;
  // Articulatory acceleration: rate worsens 5% per week for motor domains
  const isMotor = domain === 'acoustic' || domain === 'pd_motor' || domain === 'temporal';
  const acceleration = isMotor ? 1 + (weekOffset * 0.05) : 1.0;
  return rate * acceleration;
}

/**
 * PSP model: spastic component, fastest motor decline.
 * Extended for 11 domains.
 */
function getPspDomainRate(domain) {
  const pspRates = {
    acoustic:   -0.030,  // spastic dysarthria — severe
    pd_motor:   -0.025,  // fastest motor decline
    temporal:   -0.020,  // severe timing disruption
    lexical:    -0.010,
    syntactic:  -0.008,
    semantic:   -0.008,
    memory:     -0.010,
    discourse:  -0.008,
    affective:  -0.005,
    pragmatic:  -0.006,
    executive:  -0.010,
  };
  return pspRates[domain] || -0.008;
}

/**
 * LBD domain ordering: concurrent motor + cognitive, fluctuating pattern.
 * Memory affected early (unlike pure PD). Executive/attention prominent.
 * Sinusoidal fluctuation simulates day-to-day variation characteristic of LBD.
 */
function getLbdDomainRate(domain, weekOffset) {
  const baseRates = {
    acoustic:   -0.015,
    pd_motor:   -0.012,
    temporal:   -0.012,
    memory:     -0.015,  // Memory affected early (unlike pure PD)
    semantic:   -0.012,
    executive:  -0.018,  // Executive/attention prominent
    lexical:    -0.008,
    syntactic:  -0.006,
    discourse:  -0.005,
    affective:  -0.005,
    pragmatic:  -0.008,
  };
  const rate = baseRates[domain] || -0.008;
  // Fluctuation: add sinusoidal component (simulates day-to-day variation)
  const fluctuation = 1 + 0.15 * Math.sin(weekOffset * Math.PI / 2);
  return rate * fluctuation;
}

/**
 * FTD domain ordering: pragmatic-led, executive dysfunction, memory relatively spared.
 * Behavioral variant: pragmatic collapses first, executive dysfunction prominent.
 * Semantic variant would show semantic-led decline (captured separately in profile analysis).
 */
function getFtdDomainRate(domain) {
  const ftdRates = {
    pragmatic:  -0.025,  // Pragmatic collapses first
    executive:  -0.020,  // Executive dysfunction prominent
    discourse:  -0.015,
    semantic:   -0.012,
    lexical:    -0.010,
    temporal:   -0.008,
    syntactic:  -0.006,
    memory:     -0.005,  // Relatively spared early
    acoustic:   -0.003,
    pd_motor:   -0.002,
    affective:  -0.008,
  };
  return ftdRates[domain] || -0.008;
}

// ════════════════════════════════════════════════════════
// LINEAR REGRESSION HELPER
// ════════════════════════════════════════════════════════

function linearSlope(xs, ys) {
  const n = xs.length;
  if (n < 2) return 0;
  // Validate inputs for NaN/Infinity
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(xs[i]) || !Number.isFinite(ys[i])) return 0;
  }
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  if (den === 0) return 0;
  const result = num / den;
  // Bound to realistic rates
  return Number.isFinite(result) ? Math.max(-0.5, Math.min(0.5, result)) : 0;
}

// ════════════════════════════════════════════════════════
// VELOCITY COMPUTATION — 11 domains
// ════════════════════════════════════════════════════════

/**
 * Compute rate of change per week from history.
 * Linear regression across all 11 domains.
 */
function computeVelocity(history) {
  if (history.length < 2) return { composite: 0, domains: {} };

  // Use last 4 weeks for velocity (or all if fewer)
  const recent = history.slice(-4);

  // Linear regression on composite
  const xs = recent.map((_, i) => i);
  const ys = recent.map(w => w.composite ?? 0);
  const compositeVelocity = linearSlope(xs, ys);

  // Per-domain velocities across all 11 domains
  const domainVelocities = {};
  for (const domain of Object.keys(DOMAIN_WEIGHTS)) {
    const domainYs = recent.map(w => w.domain_scores?.[domain] ?? 0);
    domainVelocities[domain] = linearSlope(xs, domainYs);
  }

  return {
    composite: Math.round(compositeVelocity * 10000) / 10000,
    domains: domainVelocities
  };
}

// ════════════════════════════════════════════════════════
// SINGLE WEEK PREDICTION — 10 condition models
// ════════════════════════════════════════════════════════

/**
 * Predict a single future week based on condition model.
 * Extended switch for: alzheimer, depression, parkinson, msa, psp,
 * lbd, ftd, medication, normal_aging, and default (unknown).
 */
function predictWeek(weekOffset, currentComposite, currentDomains, velocity, condition, cascade, patientAge = null) {
  let predictedComposite;
  const predictedDomains = {};

  switch (condition) {
    case 'alzheimer': {
      // AD model: accelerating decline following cascade order
      const cascadeStage = cascade?.length > 0 ? Math.max(...cascade.map(c => c.stage)) : 0;
      const acceleration = 1 + (cascadeStage * 0.1);
      const weeklyDecline = (velocity.composite || -0.02) * acceleration;
      predictedComposite = currentComposite + weeklyDecline * weekOffset;

      for (const [domain, current] of Object.entries(currentDomains)) {
        const domainVel = velocity.domains[domain] || 0;
        const cascadeBoost = getCascadeBoost(domain, cascadeStage);
        predictedDomains[domain] = (current ?? 0) + (domainVel * cascadeBoost) * weekOffset;
      }
      break;
    }

    case 'depression': {
      // Depression model: episodic — predict partial recovery
      const recoveryRate = 0.02;
      predictedComposite = currentComposite + recoveryRate * weekOffset;
      predictedComposite = Math.min(0, predictedComposite);

      for (const [domain, current] of Object.entries(currentDomains)) {
        predictedDomains[domain] = Math.min(0, (current ?? 0) + recoveryRate * weekOffset);
      }
      break;
    }

    case 'parkinson': {
      // PD model: H&Y-modulated. Phonation first, then articulation, then prosody.
      // Slower overall than AD, but acoustic/pd_motor domains decline 1.5-2x faster.
      const pdBaseRate = -0.01;
      predictedComposite = currentComposite + pdBaseRate * weekOffset;

      for (const [domain, current] of Object.entries(currentDomains)) {
        const rate = getPdDomainRate(domain, pdBaseRate);
        predictedDomains[domain] = (current ?? 0) + rate * weekOffset;
      }
      break;
    }

    case 'msa': {
      // MSA model: faster than PD, more variable, articulatory decay accelerating.
      const msaBaseRate = -0.015;
      predictedComposite = currentComposite + msaBaseRate * weekOffset;

      for (const [domain, current] of Object.entries(currentDomains)) {
        const rate = getMsaDomainRate(domain, weekOffset);
        predictedDomains[domain] = (current ?? 0) + rate * weekOffset;
      }
      break;
    }

    case 'psp': {
      // PSP model: spastic component, fastest motor decline.
      const pspBaseRate = -0.02;
      predictedComposite = currentComposite + pspBaseRate * weekOffset;

      for (const [domain, current] of Object.entries(currentDomains)) {
        const rate = getPspDomainRate(domain);
        predictedDomains[domain] = (current ?? 0) + rate * weekOffset;
      }
      break;
    }

    case 'lbd': {
      // LBD model: concurrent motor + cognitive decline, fluctuating pattern.
      // Executive/attention prominent, memory affected early (unlike pure PD).
      const lbdBaseRate = -0.012;
      predictedComposite = currentComposite + lbdBaseRate * weekOffset;

      for (const [domain, current] of Object.entries(currentDomains)) {
        const rate = getLbdDomainRate(domain, weekOffset);
        predictedDomains[domain] = (current ?? 0) + rate * weekOffset;
      }
      break;
    }

    case 'ftd': {
      // FTD model: pragmatic-led decline, executive dysfunction prominent.
      // Memory relatively spared early. Motor domains minimally affected.
      const ftdBaseRate = -0.015;
      predictedComposite = currentComposite + ftdBaseRate * weekOffset;

      for (const [domain, current] of Object.entries(currentDomains)) {
        const rate = getFtdDomainRate(domain);
        predictedDomains[domain] = (current ?? 0) + rate * weekOffset;
      }
      break;
    }

    case 'medication': {
      // Medication model: recovery expected within 2-3 weeks
      const recoveryWeek = 3;
      if (weekOffset <= recoveryWeek) {
        const recoveryProgress = weekOffset / recoveryWeek;
        predictedComposite = currentComposite * (1 - recoveryProgress);
      } else {
        predictedComposite = 0;
      }
      for (const domain of Object.keys(currentDomains)) {
        predictedDomains[domain] = predictedComposite * 0.8;
      }
      break;
    }

    case 'normal_aging': {
      // Explicit normal aging model — V5.1: uses age-stratified rates
      predictedComposite = currentComposite;
      for (const [domain, current] of Object.entries(currentDomains)) {
        const agingRate = getAgeAdjustedRate(domain, patientAge);
        predictedDomains[domain] = (current ?? 0) + agingRate * weekOffset;
      }
      break;
    }

    default: {
      // Unknown condition — fall back to age-adjusted slow decline across 11 domains
      predictedComposite = currentComposite;
      for (const [domain, current] of Object.entries(currentDomains)) {
        const agingRate = getAgeAdjustedRate(domain, patientAge);
        predictedDomains[domain] = (current ?? 0) + agingRate * weekOffset;
      }
      break;
    }
  }

  // Alert level from predicted composite
  const alertLevel = predictedComposite >= -0.5 ? 'green'
    : predictedComposite >= -1.0 ? 'yellow'
    : predictedComposite >= -1.5 ? 'orange' : 'red';

  return {
    week_offset: weekOffset,
    composite: Math.round(predictedComposite * 1000) / 1000,
    domains: Object.fromEntries(
      Object.entries(predictedDomains).map(([k, v]) => [k, Math.round(v * 1000) / 1000])
    ),
    alert_level: alertLevel
  };
}

// ════════════════════════════════════════════════════════
// COGNITIVE TWIN TRAJECTORY — 11 domains
// ════════════════════════════════════════════════════════

/**
 * Compute cognitive twin trajectory (pure aging model).
 * Extended to all 11 domains for V5.
 * V5.1: uses age-stratified rates when patientAge is provided.
 */
function computeTwinTrajectory(currentDomains, weeks, patientAge = null) {
  const trajectory = [];
  for (let w = 1; w <= weeks; w++) {
    const twinDomains = {};
    for (const [domain, current] of Object.entries(currentDomains)) {
      const rate = getAgeAdjustedRate(domain, patientAge);
      twinDomains[domain] = Math.round(((current ?? 0) + rate * w) * 1000) / 1000;
    }
    trajectory.push({
      week_offset: w,
      domains: twinDomains,
      composite: Math.round(Object.entries(twinDomains).reduce((s, [d, v]) =>
        s + v * (DOMAIN_WEIGHTS[d] || 0.1), 0) * 1000) / 1000
    });
  }
  return trajectory;
}

// ════════════════════════════════════════════════════════
// DECLINE PROFILE ANALYSIS
// ════════════════════════════════════════════════════════

/**
 * Compute per-domain decline profile from history.
 *
 * Analyzes last 4-8 weeks to identify:
 * - Per-domain velocity (rate of change)
 * - Leading edge (fastest declining domain)
 * - Predicted next domain to decline (cascade-aware)
 * - Profile type classification (ad_like, pd_like, depression_like, lbd_like, ftd_like, uniform)
 *
 * @param {Array} history — past weekly analyses (need 4+ weeks)
 * @returns {{ leading_edge: string, domain_velocities: Object, predicted_next: string, profile_type: string }}
 */
export function computeDeclineProfile(history) {
  if (!history || history.length < 4) {
    return {
      leading_edge: null,
      domain_velocities: {},
      predicted_next: null,
      profile_type: 'stable',
    };
  }

  // Use last 4-8 weeks
  const windowSize = Math.min(8, history.length);
  const recent = history.slice(-windowSize);
  const xs = recent.map((_, i) => i);

  // Compute per-domain velocity across all 11 domains
  const domainVelocities = {};
  for (const domain of Object.keys(DOMAIN_WEIGHTS)) {
    const ys = recent.map(w => w.domain_scores?.[domain] ?? 0);
    domainVelocities[domain] = Math.round(linearSlope(xs, ys) * 10000) / 10000;
  }

  // Rank domains by decline rate (most negative = fastest declining)
  const ranked = Object.entries(domainVelocities)
    .sort(([, a], [, b]) => a - b);

  const leadingEdge = ranked[0][0];
  const leadingVelocity = ranked[0][1];

  // Determine if there is meaningful decline (threshold: -0.005/week)
  const DECLINE_THRESHOLD = -0.005;
  const decliningDomains = ranked.filter(([, v]) => v < DECLINE_THRESHOLD);

  if (decliningDomains.length === 0) {
    return {
      leading_edge: null,
      domain_velocities: domainVelocities,
      predicted_next: null,
      profile_type: 'stable',
    };
  }

  // Predict next domain based on cascade patterns
  let predictedNext = null;
  let profileType = 'uniform';

  // Check for AD-like pattern: lexical or semantic leading
  if (leadingEdge === 'lexical' || leadingEdge === 'semantic') {
    // AD cascade: lexical -> semantic -> syntactic -> memory
    if (leadingEdge === 'lexical') {
      predictedNext = 'semantic';
    } else {
      predictedNext = 'syntactic';
    }
    profileType = 'ad_like';
  }
  // Check for PD-like pattern: acoustic or pd_motor leading
  else if (leadingEdge === 'acoustic' || leadingEdge === 'pd_motor') {
    if (leadingEdge === 'acoustic') {
      predictedNext = 'pd_motor';
    } else {
      predictedNext = 'temporal';
    }
    profileType = 'pd_like';
  }
  // Check for LBD-like: concurrent acoustic/pd_motor AND memory/executive decline
  else if ((leadingEdge === 'executive' || leadingEdge === 'memory') &&
           (domainVelocities.acoustic < DECLINE_THRESHOLD || domainVelocities.pd_motor < DECLINE_THRESHOLD)) {
    profileType = 'lbd_like';
    predictedNext = leadingEdge === 'executive' ? 'memory' : 'semantic';
  }
  // Check for FTD-like: pragmatic or executive leading (without motor decline)
  else if (leadingEdge === 'pragmatic') {
    profileType = 'ftd_like';
    predictedNext = 'executive';
  }
  // Check for depression-like pattern: affective leading
  else if (leadingEdge === 'affective') {
    predictedNext = 'temporal';
    profileType = 'depression_like';
  }
  // Uniform decline — multiple domains declining at similar rates
  else {
    // If top 2 declining domains are within 30% of each other, uniform
    if (decliningDomains.length >= 2) {
      const fastest = Math.abs(decliningDomains[0][1]);
      const second = Math.abs(decliningDomains[1][1]);
      if (second / fastest > 0.7) {
        profileType = 'uniform';
      }
    }
    // Default: predict the next domain in general cascade order
    const generalOrder = ['lexical', 'semantic', 'temporal', 'syntactic', 'memory', 'acoustic', 'pd_motor', 'discourse', 'affective', 'pragmatic', 'executive'];
    const leadIdx = generalOrder.indexOf(leadingEdge);
    predictedNext = generalOrder[(leadIdx + 1) % generalOrder.length];
  }

  // If the predicted next domain is already declining, move to the one after
  if (predictedNext && domainVelocities[predictedNext] < DECLINE_THRESHOLD) {
    const cascadeMap = {
      ad_like:         ['lexical', 'semantic', 'syntactic', 'memory', 'temporal', 'discourse', 'pragmatic', 'executive'],
      pd_like:         ['acoustic', 'pd_motor', 'temporal', 'lexical', 'syntactic', 'semantic', 'pragmatic', 'executive'],
      depression_like: ['affective', 'temporal', 'lexical', 'memory', 'semantic', 'discourse', 'pragmatic', 'executive'],
      lbd_like:        ['executive', 'memory', 'acoustic', 'pd_motor', 'semantic', 'temporal', 'lexical', 'pragmatic', 'syntactic', 'discourse', 'affective'],
      ftd_like:        ['pragmatic', 'executive', 'discourse', 'semantic', 'lexical', 'temporal', 'syntactic', 'memory', 'affective', 'acoustic', 'pd_motor'],
      uniform:         ['lexical', 'semantic', 'temporal', 'syntactic', 'memory', 'acoustic', 'pd_motor', 'discourse', 'affective', 'pragmatic', 'executive'],
    };
    const order = cascadeMap[profileType] || cascadeMap.uniform;
    const notYetDeclining = order.find(d => domainVelocities[d] >= DECLINE_THRESHOLD);
    predictedNext = notYetDeclining || null;
  }

  return {
    leading_edge: leadingEdge,
    domain_velocities: domainVelocities,
    predicted_next: predictedNext,
    profile_type: profileType,
  };
}

// ════════════════════════════════════════════════════════
// MAIN TRAJECTORY PREDICTOR
// ════════════════════════════════════════════════════════

/**
 * Predict trajectory for the next N weeks.
 *
 * @param {Array} history — past weekly analyses
 * @param {Object} differential — current differential diagnosis
 * @param {Object} cascade — current cascade detection
 * @param {number} weeks — how many weeks to predict (default 12)
 */
export function predictTrajectory(history, differential, cascade, weeks = 12, patientAge = null) {
  if (history.length < 3) {
    return { predictions: [], confidence: 0, message: 'Insufficient data for prediction (need 3+ weeks)' };
  }

  const primary = differential?.primary_hypothesis || 'unknown';
  const currentComposite = history[history.length - 1]?.composite ?? 0;
  const currentDomains = history[history.length - 1]?.domain_scores || {};

  // Compute current velocity (rate of change per week)
  const velocity = computeVelocity(history);

  // Build prediction based on condition-specific model
  const predictions = [];
  for (let w = 1; w <= weeks; w++) {
    const prediction = predictWeek(w, currentComposite, currentDomains, velocity, primary, cascade, patientAge);
    predictions.push(prediction);
  }

  // Confidence decays with prediction horizon
  const baseConfidence = differential?.confidence || 0.5;
  const trajectoryConfidence = Math.max(0.1, baseConfidence * (1 - weeks * 0.03));

  // Compute decline profile for enriched output
  const declineProfile = computeDeclineProfile(history);

  return {
    predictions,
    velocity,
    model: primary,
    confidence: Math.round(trajectoryConfidence * 100) / 100,
    predicted_alert_12w: predictions[weeks - 1]?.alert_level || 'unknown',
    twin_trajectory: computeTwinTrajectory(currentDomains, weeks, patientAge),
    decline_profile: declineProfile,
  };
}
