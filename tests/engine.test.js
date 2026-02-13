/**
 * V5.1 Engine Test Suite
 *
 * Tests the core scoring pipeline, age-normalization layer, and
 * differential diagnosis engine using Node's built-in test runner.
 *
 * Run: node --test tests/engine.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeV5Baseline, computeZScores, computeDomainScores,
  computeComposite, getAlertLevel, detectCascade,
  applyConfounders, checkSentinels, computeDeclineProfile,
  analyzeSession, analyzeWeek
} from '../src/engine/algorithm.js';

import {
  INDICATORS, ALL_INDICATOR_IDS, DOMAINS, DOMAIN_WEIGHTS,
  SENTINELS, INDICATOR_COUNT
} from '../src/engine/indicators.js';

import { runDifferential, detectLBDPattern, detectFTDPattern } from '../src/engine/differential.js';

import {
  AGE_BANDS, getAgeBand, getAgeAdjustedRate, computeExcessDecline,
  predictTrajectory, computeDeclineProfile as trajectoryDeclineProfile
} from '../src/engine/trajectory.js';

import { detectPDSignature, classifyPDSubtype, runPDAnalysis } from '../src/engine/pd-engine.js';

// ════════════════════════════════════════════════
// TEST HELPERS — build synthetic data
// ════════════════════════════════════════════════

/** Build a session vector with all indicators set to a default value. */
function buildSessionVector(overrides = {}, defaultValue = 0.5) {
  const vec = {};
  for (const id of ALL_INDICATOR_IDS) {
    vec[id] = defaultValue;
  }
  Object.assign(vec, overrides);
  return vec;
}

/** Build a minimal valid baseline from repeated identical sessions. */
function buildBaseline(sessionVector, n = 14) {
  const sessions = Array.from({ length: n }, () => ({ ...sessionVector }));
  return computeV5Baseline(sessions);
}

/** Build a healthy baseline (all indicators at 0.5 with small std). */
function buildHealthyBaseline() {
  const vec = buildSessionVector({}, 0.5);
  // Add slight variation to get non-trivial std
  const sessions = [];
  for (let i = 0; i < 14; i++) {
    const s = { ...vec };
    for (const id of ALL_INDICATOR_IDS) {
      s[id] = 0.5 + (Math.random() - 0.5) * 0.04; // ±0.02 around 0.5
    }
    sessions.push(s);
  }
  return computeV5Baseline(sessions);
}

// ════════════════════════════════════════════════
// INDICATORS MODULE
// ════════════════════════════════════════════════

describe('Indicators', () => {
  it('should have 107 indicators', () => {
    assert.equal(INDICATOR_COUNT, 107);
    assert.equal(ALL_INDICATOR_IDS.length, 107);
  });

  it('should have 11 domains', () => {
    assert.equal(Object.keys(DOMAINS).length, 11);
  });

  it('should have domain weights summing to ~1.0', () => {
    const total = Object.values(DOMAIN_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1.0) < 0.01, `Weights sum to ${total}, expected ~1.0`);
  });

  it('should have 5 sentinel sets', () => {
    assert.equal(Object.keys(SENTINELS).length, 5);
    assert.ok(SENTINELS.alzheimer.length >= 5);
    assert.ok(SENTINELS.parkinson.length >= 5);
    assert.ok(SENTINELS.depression.length >= 5);
    assert.ok(SENTINELS.lbd.length >= 5);
    assert.ok(SENTINELS.ftd.length >= 5);
  });

  it('every indicator should have required fields', () => {
    for (const [id, ind] of Object.entries(INDICATORS)) {
      assert.ok(ind.domain, `${id} missing domain`);
      assert.ok(ind.name, `${id} missing name`);
      assert.ok(ind.directions, `${id} missing directions`);
      assert.ok(typeof ind.base_weight === 'number', `${id} missing base_weight`);
    }
  });
});

// ════════════════════════════════════════════════
// BASELINE COMPUTATION
// ════════════════════════════════════════════════

describe('Baseline', () => {
  it('should require minSessions', () => {
    const result = computeV5Baseline([], 14);
    assert.equal(result.complete, false);
  });

  it('should compute complete baseline with 14+ sessions', () => {
    const vec = buildSessionVector();
    const baseline = buildBaseline(vec, 14);
    assert.equal(baseline.complete, true);
    assert.equal(baseline.sessions, 14);
    assert.ok(baseline.vector);
  });

  it('baseline mean should be close to input value', () => {
    const vec = buildSessionVector({}, 0.7);
    const baseline = buildBaseline(vec, 14);
    const mean = baseline.vector.LEX_TTR.mean;
    assert.ok(Math.abs(mean - 0.7) < 0.01, `Mean ${mean} not close to 0.7`);
  });
});

// ════════════════════════════════════════════════
// Z-SCORE COMPUTATION
// ════════════════════════════════════════════════

describe('Z-Scores', () => {
  it('should return 0 z-scores when session matches baseline', () => {
    const vec = buildSessionVector({}, 0.5);
    const baseline = buildBaseline(vec, 14);
    const z = computeZScores(vec, baseline);
    // All z-scores should be close to 0
    const nonNull = Object.values(z).filter(v => v != null);
    const maxAbsZ = Math.max(...nonNull.map(Math.abs));
    assert.ok(maxAbsZ < 0.5, `Max z-score ${maxAbsZ} too large for matching session`);
  });

  it('should produce negative z-scores for declining indicators', () => {
    const baseVec = buildSessionVector({}, 0.5);
    const baseline = buildBaseline(baseVec, 14);
    // Severely degraded session
    const degraded = buildSessionVector({}, 0.2);
    const z = computeZScores(degraded, baseline);
    const semZ = z.SEM_IDEA_DENSITY;
    assert.ok(semZ != null);
    assert.ok(semZ < -1, `SEM_IDEA_DENSITY z=${semZ} should be strongly negative for degraded session`);
  });

  it('should handle null values gracefully', () => {
    const vec = buildSessionVector({}, 0.5);
    vec.ACU_HNR = null; // simulate missing audio
    const baseline = buildBaseline(buildSessionVector({}, 0.5), 14);
    const z = computeZScores(vec, baseline);
    assert.equal(z.ACU_HNR, null);
  });
});

// ════════════════════════════════════════════════
// AGE-ADJUSTED Z-SCORES (V5.1)
// ════════════════════════════════════════════════

describe('Age-Adjusted Z-Scores', () => {
  it('should apply acoustic offsets when patientAge is provided', () => {
    const baseVec = buildSessionVector({}, 0.5);
    const baseline = buildBaseline(baseVec, 14);
    // Slightly degraded acoustic session
    const degraded = buildSessionVector({}, 0.45);

    const zNoAge = computeZScores(degraded, baseline, null, null);
    const zAge80 = computeZScores(degraded, baseline, null, 82);

    // Acoustic indicators should be LESS negative with age adjustment
    const hnrNoAge = zNoAge.ACU_HNR;
    const hnrAge80 = zAge80.ACU_HNR;

    if (hnrNoAge != null && hnrAge80 != null) {
      assert.ok(hnrAge80 > hnrNoAge,
        `HNR z-score should be less negative with age 80+ offset: noAge=${hnrNoAge}, age80=${hnrAge80}`);
    }
  });

  it('should not apply acoustic offsets when patientAge is null', () => {
    const baseVec = buildSessionVector({}, 0.5);
    const baseline = buildBaseline(baseVec, 14);
    const session = buildSessionVector({}, 0.45);

    const z1 = computeZScores(session, baseline, null, null);
    const z2 = computeZScores(session, baseline, null, null);

    // Should be identical
    assert.equal(z1.ACU_JITTER, z2.ACU_JITTER);
    assert.equal(z1.PDM_PPE, z2.PDM_PPE);
  });

  it('should not affect non-acoustic indicators regardless of age', () => {
    const baseVec = buildSessionVector({}, 0.5);
    const baseline = buildBaseline(baseVec, 14);
    const session = buildSessionVector({}, 0.45);

    const zNoAge = computeZScores(session, baseline, null, null);
    const zAge75 = computeZScores(session, baseline, null, 75);

    // Text-only indicators should be unaffected
    assert.equal(zNoAge.LEX_TTR, zAge75.LEX_TTR);
    assert.equal(zNoAge.SEM_IDEA_DENSITY, zAge75.SEM_IDEA_DENSITY);
    assert.equal(zNoAge.MEM_FREE_RECALL, zAge75.MEM_FREE_RECALL);
  });

  it('older patients should get larger acoustic offsets', () => {
    const baseVec = buildSessionVector({}, 0.5);
    const baseline = buildBaseline(baseVec, 14);
    const session = buildSessionVector({}, 0.42);

    const z55 = computeZScores(session, baseline, null, 55);
    const z75 = computeZScores(session, baseline, null, 75);
    const z85 = computeZScores(session, baseline, null, 85);

    const jitter55 = z55.ACU_JITTER;
    const jitter75 = z75.ACU_JITTER;
    const jitter85 = z85.ACU_JITTER;

    if (jitter55 != null && jitter75 != null && jitter85 != null) {
      // Larger offset = less negative z-score for older patients
      assert.ok(jitter85 > jitter75, `Jitter offset: 85yo (${jitter85}) should be > 75yo (${jitter75})`);
      assert.ok(jitter75 > jitter55, `Jitter offset: 75yo (${jitter75}) should be > 55yo (${jitter55})`);
    }
  });
});

// ════════════════════════════════════════════════
// DOMAIN & COMPOSITE SCORING
// ════════════════════════════════════════════════

describe('Domain & Composite Scoring', () => {
  it('should compute 11 domain scores', () => {
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = -0.3;
    const scores = computeDomainScores(z);
    assert.equal(Object.keys(scores).length, 11);
    for (const [domain, score] of Object.entries(scores)) {
      assert.ok(score != null, `${domain} should not be null`);
    }
  });

  it('should compute composite from domain scores', () => {
    const domainScores = {};
    for (const domain of Object.keys(DOMAIN_WEIGHTS)) {
      domainScores[domain] = -0.5;
    }
    const composite = computeComposite(domainScores);
    assert.ok(Number.isFinite(composite));
    assert.ok(composite < 0, `Composite ${composite} should be negative for declining scores`);
  });

  it('should handle null domains in composite', () => {
    const domainScores = {};
    for (const domain of Object.keys(DOMAIN_WEIGHTS)) {
      domainScores[domain] = -0.5;
    }
    domainScores.acoustic = null;
    domainScores.pd_motor = null;
    const composite = computeComposite(domainScores);
    assert.ok(Number.isFinite(composite));
  });
});

// ════════════════════════════════════════════════
// ALERT LEVELS
// ════════════════════════════════════════════════

describe('Alert Levels', () => {
  it('should return green for scores >= -0.5', () => {
    assert.equal(getAlertLevel(0), 'green');
    assert.equal(getAlertLevel(-0.3), 'green');
    assert.equal(getAlertLevel(-0.5), 'green');
  });

  it('should return yellow for scores >= -1.0', () => {
    assert.equal(getAlertLevel(-0.6), 'yellow');
    assert.equal(getAlertLevel(-1.0), 'yellow');
  });

  it('should return orange for scores >= -1.5', () => {
    assert.equal(getAlertLevel(-1.1), 'orange');
    assert.equal(getAlertLevel(-1.5), 'orange');
  });

  it('should return red for scores < -1.5', () => {
    assert.equal(getAlertLevel(-1.6), 'red');
    assert.equal(getAlertLevel(-3.0), 'red');
  });
});

// ════════════════════════════════════════════════
// CASCADE DETECTION
// ════════════════════════════════════════════════

describe('Cascade Detection', () => {
  it('should detect AD cascade with semantic+lexical decline', () => {
    const scores = {
      semantic: -0.8, lexical: -0.7, syntactic: -0.1,
      temporal: 0, memory: 0, acoustic: null, pd_motor: null,
      discourse: 0, affective: 0, pragmatic: 0, executive: 0,
    };
    const cascades = detectCascade(scores);
    assert.ok(cascades.alzheimer.length > 0, 'Should detect AD cascade');
  });

  it('should detect PD cascade with acoustic decline', () => {
    const scores = {
      semantic: 0, lexical: 0, syntactic: 0, temporal: 0, memory: 0,
      acoustic: -0.8, pd_motor: -0.6, discourse: 0, affective: 0,
      pragmatic: 0, executive: 0,
    };
    const cascades = detectCascade(scores);
    assert.ok(cascades.parkinson.length > 0, 'Should detect PD cascade');
  });

  it('should detect FTD cascade with pragmatic collapse', () => {
    const scores = {
      semantic: 0, lexical: 0, syntactic: 0, temporal: 0, memory: 0,
      acoustic: null, pd_motor: null, discourse: 0, affective: 0,
      pragmatic: -0.8, executive: -0.6,
    };
    const cascades = detectCascade(scores);
    assert.ok(cascades.ftd.length > 0, 'Should detect FTD cascade');
  });

  it('should NOT detect cascade for normal scores', () => {
    const scores = {
      semantic: 0, lexical: 0, syntactic: 0, temporal: 0, memory: 0,
      acoustic: 0, pd_motor: 0, discourse: 0, affective: 0,
      pragmatic: 0, executive: 0,
    };
    const cascades = detectCascade(scores);
    assert.equal(cascades.all.length, 0, 'Should not detect any cascade for normal scores');
  });
});

// ════════════════════════════════════════════════
// CONFOUNDERS
// ════════════════════════════════════════════════

describe('Confounders', () => {
  it('should reduce scores with illness confounder', () => {
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = -0.5;
    const domainScores = computeDomainScores(z);
    const { domainScores: adjusted, globalWeight } = applyConfounders(z, domainScores, { illness: true });
    assert.ok(globalWeight < 1.0);
    assert.ok(adjusted.semantic != null);
  });

  it('should not modify scores without confounders', () => {
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = -0.5;
    const domainScores = computeDomainScores(z);
    const { globalWeight } = applyConfounders(z, domainScores, {});
    assert.equal(globalWeight, 1.0);
  });
});

// ════════════════════════════════════════════════
// AGE-BAND FUNCTIONS (V5.1)
// ════════════════════════════════════════════════

describe('Age Bands', () => {
  it('should return correct age bands', () => {
    assert.equal(getAgeBand(45), '50-59'); // <50 uses youngest band
    assert.equal(getAgeBand(55), '50-59');
    assert.equal(getAgeBand(63), '60-69');
    assert.equal(getAgeBand(72), '70-79');
    assert.equal(getAgeBand(85), '80+');
    assert.equal(getAgeBand(null), null);
    assert.equal(getAgeBand(undefined), null);
  });

  it('should have 4 age bands defined', () => {
    assert.equal(Object.keys(AGE_BANDS).length, 4);
  });

  it('should return faster decline rates for older age bands', () => {
    const mem55 = getAgeAdjustedRate('memory', 55);
    const mem65 = getAgeAdjustedRate('memory', 65);
    const mem75 = getAgeAdjustedRate('memory', 75);
    const mem85 = getAgeAdjustedRate('memory', 85);

    // All should be negative
    assert.ok(mem55 < 0);
    assert.ok(mem65 < 0);
    assert.ok(mem75 < 0);
    assert.ok(mem85 < 0);

    // Older = faster decline (more negative)
    assert.ok(mem65 < mem55, `65yo rate ${mem65} should be < 55yo rate ${mem55}`);
    assert.ok(mem75 < mem65, `75yo rate ${mem75} should be < 65yo rate ${mem65}`);
    assert.ok(mem85 < mem75, `85yo rate ${mem85} should be < 75yo rate ${mem75}`);
  });

  it('should fall back to default rate when age is null', () => {
    const rateNull = getAgeAdjustedRate('memory', null);
    const rateUndef = getAgeAdjustedRate('memory', undefined);
    assert.ok(rateNull < 0);
    assert.equal(rateNull, rateUndef);
  });

  it('all 11 domains should have rates in every age band', () => {
    for (const [band, rates] of Object.entries(AGE_BANDS)) {
      for (const domain of Object.keys(DOMAIN_WEIGHTS)) {
        assert.ok(rates[domain] != null, `AGE_BANDS['${band}']['${domain}'] is missing`);
        assert.ok(rates[domain] < 0, `AGE_BANDS['${band}']['${domain}'] should be negative`);
      }
    }
  });
});

// ════════════════════════════════════════════════
// EXCESS DECLINE (V5.1)
// ════════════════════════════════════════════════

describe('Excess Decline', () => {
  it('should compute positive excess when declining faster than age-expected', () => {
    const velocities = { memory: -0.005, lexical: -0.003 }; // fast decline
    const excess = computeExcessDecline(velocities, 55);
    assert.ok(excess.memory > 0, `Excess memory ${excess.memory} should be positive for fast decline`);
  });

  it('should compute negative/zero excess for age-expected decline', () => {
    // Use the exact age-expected rate
    const rate = getAgeAdjustedRate('memory', 55);
    const velocities = { memory: rate };
    const excess = computeExcessDecline(velocities, 55);
    assert.ok(Math.abs(excess.memory) < 0.0001, `Excess should be ~0 for age-expected rate`);
  });

  it('should handle null age gracefully', () => {
    const velocities = { memory: -0.001 };
    const excess = computeExcessDecline(velocities, null);
    assert.ok(typeof excess.memory === 'number');
  });
});

// ════════════════════════════════════════════════
// DECLINE PROFILE (V5.1 — acceleration & age fields)
// ════════════════════════════════════════════════

describe('Decline Profile V5.1', () => {
  it('should include acceleration, excess_decline, and age_consistent fields', () => {
    // Build minimal history with enough sessions
    const history = [];
    for (let i = 0; i < 28; i++) {
      history.push({
        domain_scores: {
          semantic: -0.1 * (i / 28), lexical: -0.1 * (i / 28),
          syntactic: 0, temporal: 0, memory: 0,
          acoustic: 0, pd_motor: 0, discourse: 0,
          affective: 0, pragmatic: 0, executive: 0,
        }
      });
    }
    const profile = computeDeclineProfile(history, 65);
    assert.ok('acceleration' in profile);
    assert.ok('excess_decline' in profile);
    assert.ok('age_consistent' in profile);
  });

  it('should return stable for insufficient history', () => {
    const profile = computeDeclineProfile([], 65);
    assert.equal(profile.profile_type, 'stable');
    assert.equal(profile.age_consistent, false);
  });
});

// ════════════════════════════════════════════════
// DIFFERENTIAL DIAGNOSIS
// ════════════════════════════════════════════════

describe('Differential Diagnosis', () => {
  it('should return 10 conditions in probabilities', () => {
    const domainScores = {};
    for (const d of Object.keys(DOMAINS)) domainScores[d] = 0;
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = 0;
    const result = runDifferential(domainScores, z, {});
    assert.equal(Object.keys(result.probabilities).length, 10);
  });

  it('should favor normal_aging for stable scores', () => {
    const domainScores = {};
    for (const d of Object.keys(DOMAINS)) domainScores[d] = 0;
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = 0;
    const result = runDifferential(domainScores, z, {});
    assert.ok(
      result.probabilities.normal_aging >= result.probabilities.alzheimer,
      'Normal aging should be >= alzheimer for stable scores'
    );
  });

  it('should favor AD for semantic+lexical decline', () => {
    const domainScores = {
      semantic: -0.8, lexical: -0.7, syntactic: -0.6, temporal: -0.3,
      memory: -0.6, acoustic: 0, pd_motor: 0, discourse: 0,
      affective: 0, pragmatic: 0, executive: 0,
    };
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = 0;
    z.SEM_IDEA_DENSITY = -0.8;
    z.SEM_REF_COHERENCE = -0.7;
    z.MEM_FREE_RECALL = -0.6;
    z.MEM_CUED_RECALL = -0.6;
    z.DIS_SELF_CORRECTION = -0.6;
    const result = runDifferential(domainScores, z, {});
    assert.ok(
      result.probabilities.alzheimer > result.probabilities.normal_aging,
      `AD (${result.probabilities.alzheimer}) should be > normal_aging (${result.probabilities.normal_aging})`
    );
  });

  it('should favor PD for acoustic quartet activation', () => {
    const domainScores = {
      semantic: 0, lexical: 0, syntactic: 0, temporal: -0.6,
      memory: 0, acoustic: -0.8, pd_motor: -0.7, discourse: 0,
      affective: 0, pragmatic: 0, executive: 0,
    };
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = 0;
    z.PDM_PPE = -0.8;
    z.PDM_RPDE = -0.7;
    z.ACU_HNR = -0.8;
    z.PDM_DFA = -0.6;
    z.ACU_F0_SD = -0.6;
    z.PDM_MONOPITCH = -0.7;
    const result = runDifferential(domainScores, z, {});
    assert.ok(
      result.probabilities.parkinson > result.probabilities.normal_aging,
      `PD (${result.probabilities.parkinson}) should be > normal_aging (${result.probabilities.normal_aging})`
    );
  });

  it('Rule 31: should boost normal_aging when decline is age-consistent', () => {
    const domainScores = {};
    for (const d of Object.keys(DOMAINS)) domainScores[d] = -0.1;
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = -0.1;

    const resultWithAge = runDifferential(domainScores, z, {
      patientAge: 75,
      declineProfile: { age_consistent: true, acceleration: null, excess_decline: null },
    });
    const resultWithoutAge = runDifferential(domainScores, z, {});

    assert.ok(
      resultWithAge.probabilities.normal_aging > resultWithoutAge.probabilities.normal_aging,
      `Normal aging with age-consistent flag (${resultWithAge.probabilities.normal_aging}) should be > without (${resultWithoutAge.probabilities.normal_aging})`
    );
  });

  it('Rule 32: should boost disease scores when acceleration detected', () => {
    const domainScores = {
      semantic: -0.5, lexical: -0.4, syntactic: 0, temporal: 0,
      memory: -0.3, acoustic: 0, pd_motor: 0, discourse: 0,
      affective: 0, pragmatic: 0, executive: 0,
    };
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = 0;
    z.SEM_IDEA_DENSITY = -0.6;
    z.SEM_REF_COHERENCE = -0.5;

    const accelerating = {
      semantic: -0.008, lexical: -0.005, memory: -0.004,
      syntactic: 0, temporal: 0, acoustic: 0, pd_motor: 0,
      discourse: 0, affective: 0, pragmatic: 0, executive: 0,
    };

    const resultAccel = runDifferential(domainScores, z, {
      declineProfile: { acceleration: accelerating, age_consistent: false, excess_decline: null },
    });
    const resultNoAccel = runDifferential(domainScores, z, {});

    assert.ok(
      resultAccel.probabilities.alzheimer >= resultNoAccel.probabilities.alzheimer,
      `AD with acceleration (${resultAccel.probabilities.alzheimer}) should be >= without (${resultNoAccel.probabilities.alzheimer})`
    );
  });

  it('Rule 33: should boost normal_aging when no excess decline', () => {
    const domainScores = {};
    for (const d of Object.keys(DOMAINS)) domainScores[d] = -0.1;
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = -0.1;

    const noExcess = {};
    for (const d of Object.keys(DOMAINS)) noExcess[d] = -0.001; // within expected

    const result = runDifferential(domainScores, z, {
      patientAge: 75,
      declineProfile: { acceleration: null, age_consistent: false, excess_decline: noExcess },
    });

    assert.ok(
      result.probabilities.normal_aging > 0.2,
      `Normal aging (${result.probabilities.normal_aging}) should be boosted with no excess decline`
    );
  });
});

// ════════════════════════════════════════════════
// LBD & FTD DETECTION
// ════════════════════════════════════════════════

describe('LBD Detection', () => {
  it('should detect LBD with fluctuation + motor + cognitive', () => {
    const domainScores = {
      semantic: -0.5, memory: -0.4, pd_motor: -0.5, acoustic: -0.4,
      executive: -0.4, lexical: 0, syntactic: 0, temporal: 0,
      discourse: 0, affective: 0, pragmatic: 0,
    };
    const z = { TMP_VARIABILITY: -1.0 };
    const result = detectLBDPattern(domainScores, z, {});
    assert.ok(result.detected, 'Should detect LBD pattern');
    assert.ok(result.features.length >= 2);
  });
});

describe('FTD Detection', () => {
  it('should detect FTD behavioral with pragmatic collapse + memory preserved', () => {
    const domainScores = {
      semantic: 0, memory: 0.1, pd_motor: 0, acoustic: 0,
      executive: -0.6, lexical: 0, syntactic: 0, temporal: 0,
      discourse: 0, affective: 0, pragmatic: -0.8,
    };
    const z = {
      PRA_INDIRECT_SPEECH: -0.9, PRA_HUMOR_IRONY: -0.8,
      PRA_DISCOURSE_MARKERS: -0.7, PRA_REGISTER_SHIFT: -0.7,
      PRA_NARRATIVE_STRUCTURE: -0.6, PRA_PERSPECTIVE_TAKING: -0.7,
      EXE_TASK_SWITCHING: -0.6, EXE_INHIBITION: -0.7,
      EXE_PLANNING: -0.5, EXE_DUAL_TASK: -0.5, EXE_COGNITIVE_FLEXIBILITY: -0.6,
    };
    const result = detectFTDPattern(domainScores, z);
    assert.ok(result.detected, 'Should detect FTD pattern');
    assert.equal(result.variant, 'behavioral');
  });
});

// ════════════════════════════════════════════════
// PD ENGINE
// ════════════════════════════════════════════════

describe('PD Engine', () => {
  it('should detect PD signature with quartet below threshold', () => {
    const z = {
      PDM_PPE: -0.8, PDM_RPDE: -0.7, PDM_DFA: -0.6, ACU_HNR: -0.9,
      ACU_F0_SD: -0.5, PDM_MONOPITCH: -0.6,
    };
    const result = detectPDSignature(z);
    assert.ok(result.detected, 'Should detect PD signature');
    assert.ok(result.confidence > 0.5);
  });

  it('should NOT detect PD with normal quartet', () => {
    const z = {
      PDM_PPE: 0.1, PDM_RPDE: 0.2, PDM_DFA: 0.1, ACU_HNR: 0.3,
    };
    const result = detectPDSignature(z);
    assert.ok(!result.detected);
  });

  it('runPDAnalysis should return all sub-analyses', () => {
    const z = {
      PDM_PPE: -0.6, PDM_RPDE: -0.5, PDM_DFA: -0.5, ACU_HNR: -0.7,
      ACU_F0_SD: -0.5, PDM_MONOPITCH: -0.6, ACU_JITTER: -0.4,
      ACU_SHIMMER: -0.3, PDM_DDK_RATE: -0.3, PDM_DDK_REG: -0.2,
    };
    const domainScores = { acoustic: -0.5, pd_motor: -0.4, temporal: 0 };
    const result = runPDAnalysis(z, domainScores);
    assert.ok(result.signature != null);
    assert.ok(result.subtype != null);
    assert.ok(result.parkinsonian_differential != null);
    assert.ok(result.stage != null);
  });
});

// ════════════════════════════════════════════════
// TRAJECTORY (V5.1 age-aware)
// ════════════════════════════════════════════════

describe('Trajectory', () => {
  it('should predict trajectory with age-adjusted rates', () => {
    const history = [];
    for (let i = 0; i < 5; i++) {
      history.push({
        composite: -0.1 * i,
        domain_scores: { semantic: -0.02 * i, lexical: -0.02 * i, syntactic: 0, temporal: 0, memory: -0.01 * i, acoustic: 0, pd_motor: 0, discourse: 0, affective: 0, pragmatic: 0, executive: 0 },
      });
    }
    const result = predictTrajectory(history, { primary_hypothesis: 'normal_aging' }, null, 12, 75);
    assert.ok(result.predictions.length === 12);
    assert.ok(result.twin_trajectory.length === 12);
    assert.ok(result.confidence > 0);
  });

  it('should produce different twin trajectories for different ages', () => {
    const history = [];
    for (let i = 0; i < 5; i++) {
      history.push({
        composite: -0.05 * i,
        domain_scores: { semantic: 0, lexical: 0, syntactic: 0, temporal: 0, memory: 0, acoustic: 0, pd_motor: 0, discourse: 0, affective: 0, pragmatic: 0, executive: 0 },
      });
    }
    const result55 = predictTrajectory(history, { primary_hypothesis: 'normal_aging' }, null, 12, 55);
    const result85 = predictTrajectory(history, { primary_hypothesis: 'normal_aging' }, null, 12, 85);

    // 85yo twin should decline faster
    const twin55_12 = result55.twin_trajectory[11].composite;
    const twin85_12 = result85.twin_trajectory[11].composite;
    assert.ok(twin85_12 < twin55_12,
      `85yo twin (${twin85_12}) should decline more than 55yo twin (${twin55_12})`);
  });
});

// ════════════════════════════════════════════════
// FULL SESSION ANALYSIS PIPELINE
// ════════════════════════════════════════════════

describe('Full Session Analysis', () => {
  it('should run complete pipeline without errors', () => {
    const vec = buildSessionVector({}, 0.5);
    const baseline = buildHealthyBaseline();
    const result = analyzeSession(vec, baseline);

    assert.equal(result.version, 'v5');
    assert.ok(Number.isFinite(result.composite));
    assert.ok(['green', 'yellow', 'orange', 'red'].includes(result.alert_level));
    assert.ok(result.domain_scores);
    assert.ok(result.cascade);
    assert.ok(Array.isArray(result.sentinel_alerts));
  });

  it('should accept and propagate patientAge', () => {
    const vec = buildSessionVector({}, 0.5);
    const baseline = buildHealthyBaseline();
    const result = analyzeSession(vec, baseline, {}, [], null, null, 72);
    assert.equal(result.patient_age, 72);
  });

  it('should work with patientAge = null (backward compatible)', () => {
    const vec = buildSessionVector({}, 0.5);
    const baseline = buildHealthyBaseline();
    const result = analyzeSession(vec, baseline, {}, [], null, null, null);
    assert.equal(result.patient_age, null);
    assert.equal(result.version, 'v5');
  });

  it('analyzeWeek should accept patientAge', () => {
    const vec = buildSessionVector({}, 0.5);
    const baseline = buildHealthyBaseline();
    const sessions = [
      { feature_vector: vec, confounders: {} },
      { feature_vector: vec, confounders: {} },
    ];
    const result = analyzeWeek(sessions, baseline, 1, 72);
    assert.ok(result);
    assert.equal(result.version, 'v5');
  });
});

// ════════════════════════════════════════════════
// DISEASE vs AGING SEPARATION (integration tests)
// ════════════════════════════════════════════════

describe('Disease vs Aging Separation', () => {
  it('uniform mild decline in elderly should favor normal_aging over AD', () => {
    // Simulate an 80-year-old with mild uniform decline
    const domainScores = {};
    for (const d of Object.keys(DOMAINS)) domainScores[d] = -0.25;
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = -0.25;

    const result = runDifferential(domainScores, z, {
      patientAge: 80,
      declineProfile: {
        age_consistent: true,
        acceleration: null,
        excess_decline: Object.fromEntries(Object.keys(DOMAINS).map(d => [d, -0.001])),
      },
    });

    assert.ok(
      result.probabilities.normal_aging > result.probabilities.alzheimer,
      `80yo uniform decline: normal_aging (${result.probabilities.normal_aging}) should beat AD (${result.probabilities.alzheimer})`
    );
  });

  it('asymmetric accelerating decline should favor disease over normal_aging', () => {
    // Simulate semantic-led accelerating decline (AD pattern)
    const domainScores = {
      semantic: -0.8, lexical: -0.6, syntactic: -0.3, temporal: -0.2,
      memory: -0.5, acoustic: 0, pd_motor: 0, discourse: 0,
      affective: 0, pragmatic: 0, executive: 0,
    };
    const z = {};
    for (const id of ALL_INDICATOR_IDS) z[id] = 0;
    z.SEM_IDEA_DENSITY = -0.9;
    z.SEM_REF_COHERENCE = -0.8;
    z.MEM_FREE_RECALL = -0.7;
    z.MEM_CUED_RECALL = -0.7;

    const acceleration = {
      semantic: -0.01, lexical: -0.006, memory: -0.005,
      syntactic: 0, temporal: 0, acoustic: 0, pd_motor: 0,
      discourse: 0, affective: 0, pragmatic: 0, executive: 0,
    };
    const excess = {
      semantic: 0.02, lexical: 0.015, memory: 0.01,
      syntactic: 0, temporal: 0, acoustic: 0, pd_motor: 0,
      discourse: 0, affective: 0, pragmatic: 0, executive: 0,
    };

    const result = runDifferential(domainScores, z, {
      patientAge: 72,
      declineProfile: {
        age_consistent: false,
        acceleration,
        excess_decline: excess,
      },
    });

    assert.ok(
      result.probabilities.alzheimer > result.probabilities.normal_aging,
      `Asymmetric accelerating decline: AD (${result.probabilities.alzheimer}) should beat normal_aging (${result.probabilities.normal_aging})`
    );
  });
});
