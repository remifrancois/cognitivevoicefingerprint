/**
 * PD-Specific Analysis Engine — MemoVoice V5
 *
 * Handles Parkinson's disease detection, subtyping (TD vs PIGD),
 * differential diagnosis (PD vs MSA vs PSP vs ET), H&Y staging,
 * and motor UPDRS estimation from voice biomarkers.
 *
 * V5 extensions over V4:
 *   - ACU_TREMOR_FREQ: 4-7 Hz vocal tremor band power — strong PD marker,
 *     critical for MSA differentiation, supports TD subtype classification
 *   - ACU_VOICE_BREAKS: phonatory breaks — vocal fold instability,
 *     PSP spastic component, PD severity marker
 *   - ACU_BREATHINESS + ACU_LOUDNESS_DECAY added to phonatory staging
 *
 * Key references:
 *   Little 2009  — PPE + RPDE + DFA + HNR quartet (91.4% accuracy)
 *   Tsanas 2010  — UPDRS prediction from voice features
 *   Rusz 2015    — Parkinsonian differential (PD/MSA/PSP)
 *   Harel 2004   — DDK-based differential diagnosis
 *   Moro-Velazquez 2024 — TD vs PIGD subtyping
 *   Rusz 2021    — Prodromal PD via monopitch in RBD cohorts
 */

import { INDICATORS, SENTINELS } from './indicators.js';

// ════════════════════════════════════════════════════════
// THRESHOLDS & COEFFICIENTS
// ════════════════════════════════════════════════════════

/** z-score threshold below which a feature is considered impaired for PD */
const PD_IMPAIRMENT_THRESHOLD = -0.4;

/** Core PD quartet indicator IDs (Little 2009) */
const PD_QUARTET = ['PDM_PPE', 'PDM_RPDE', 'PDM_DFA', 'ACU_HNR'];

/**
 * Published linear model coefficients for UPDRS estimation (Tsanas 2010).
 * UPDRS_motor ≈ intercept + Σ(coeff_i × z_i)
 * Coefficients are approximate from the published regression model,
 * scaled for z-score inputs rather than raw feature values.
 */
const UPDRS_COEFFICIENTS = {
  intercept: 20.0,
  ACU_JITTER:  3.5,
  ACU_SHIMMER: 3.2,
  ACU_HNR:    -4.8,
  PDM_RPDE:    5.1,
  PDM_DFA:     4.4,
  PDM_PPE:     6.3,
};

/** Minimum features required for UPDRS prediction */
const UPDRS_MIN_FEATURES = 3;

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════

/**
 * Safely retrieve a z-score value, returning null if unavailable.
 */
function z(zScores, id) {
  if (!zScores || zScores[id] === undefined || zScores[id] === null) return null;
  if (typeof zScores[id] !== 'number' || !isFinite(zScores[id])) return null;
  return zScores[id];
}

/**
 * Count how many of the given indicator IDs have z-scores below threshold.
 */
function countBelow(zScores, ids, threshold) {
  let count = 0;
  let available = 0;
  for (const id of ids) {
    const val = z(zScores, id);
    if (val !== null) {
      available++;
      if (val < threshold) count++;
    }
  }
  return { count, available };
}

/**
 * Clamp a number between min and max.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Mean of non-null numeric values from a set of indicator z-scores.
 */
function meanZ(zScores, ids) {
  let sum = 0;
  let n = 0;
  for (const id of ids) {
    const val = z(zScores, id);
    if (val !== null) { sum += val; n++; }
  }
  if (n === 0) return null;
  const result = sum / n;
  return Number.isFinite(result) ? result : null;
}

// ════════════════════════════════════════════════════════
// detectPDSignature
// ════════════════════════════════════════════════════════

/**
 * Check the core PD quartet: PDM_PPE + PDM_RPDE + PDM_DFA + ACU_HNR.
 *
 * For PD motor indicators (PPE, RPDE, DFA), the pathological direction is UP
 * (higher entropy / noise), but because these are z-scored relative to healthy
 * norms, a z-score BELOW the negative threshold means the feature is degraded
 * in the direction expected for PD. We check for z < threshold consistently,
 * since the scoring pipeline inverts direction so that negative = impaired.
 *
 * V5: ACU_TREMOR_FREQ and ACU_VOICE_BREAKS added as supporting evidence.
 * ACU_TREMOR_FREQ (4-7 Hz band) is a strong PD marker; ACU_VOICE_BREAKS
 * indicates vocal fold instability.
 *
 * @param {Object} zScores - Map of indicator ID to z-score
 * @returns {Object|null} Signature result or null if insufficient data
 */
export function detectPDSignature(zScores) {
  if (!zScores) return null;

  const quartetScores = {};
  let quartetAvailable = 0;
  let quartetImpaired = 0;
  let magnitudeSum = 0;

  for (const id of PD_QUARTET) {
    const val = z(zScores, id);
    quartetScores[id] = val;
    if (val !== null) {
      quartetAvailable++;
      if (val < PD_IMPAIRMENT_THRESHOLD) {
        quartetImpaired++;
        magnitudeSum += Math.abs(val);
      }
    }
  }

  // Need all 4 quartet features available
  if (quartetAvailable < 4) {
    return {
      detected: false,
      confidence: 0,
      quartet_scores: quartetScores,
      supporting_evidence: [],
      note: `Insufficient quartet data (${quartetAvailable}/4 available)`,
    };
  }

  // PD signature positive if >= 3 of 4 are below threshold
  const detected = quartetImpaired >= 3;

  // Confidence: base from count, boosted by magnitude
  let confidence = 0;
  if (detected) {
    const countFactor = quartetImpaired === 4 ? 0.80 : 0.60;
    const magnitudeDenom = quartetImpaired * 2.0;
    const magnitudeFactor = magnitudeDenom > 0 ? clamp(magnitudeSum / magnitudeDenom, 0, 0.20) : 0;
    confidence = countFactor + magnitudeFactor;
  } else {
    // Partial: some impairment but not enough for detection
    confidence = quartetImpaired * 0.15;
  }

  // Supporting evidence: ACU_F0_SD (monopitch)
  const supportingEvidence = [];
  const f0sd = z(zScores, 'ACU_F0_SD');
  if (f0sd !== null && f0sd < PD_IMPAIRMENT_THRESHOLD) {
    supportingEvidence.push({
      indicator: 'ACU_F0_SD',
      value: f0sd,
      interpretation: 'Monopitch detected — reduced F0 variability supports PD signature',
    });
    if (detected) {
      confidence = clamp(confidence + 0.05, 0, 1.0);
    }
  }

  const monopitch = z(zScores, 'PDM_MONOPITCH');
  if (monopitch !== null && monopitch < PD_IMPAIRMENT_THRESHOLD) {
    supportingEvidence.push({
      indicator: 'PDM_MONOPITCH',
      value: monopitch,
      interpretation: 'Connected-speech monopitch confirms prosodic flattening',
    });
    if (detected) {
      confidence = clamp(confidence + 0.05, 0, 1.0);
    }
  }

  // V5: ACU_TREMOR_FREQ as supporting evidence — tremor in 4-7 Hz band is a strong PD marker
  const tremorFreq = z(zScores, 'ACU_TREMOR_FREQ');
  if (tremorFreq !== null && tremorFreq < PD_IMPAIRMENT_THRESHOLD) {
    supportingEvidence.push({
      indicator: 'ACU_TREMOR_FREQ',
      value: tremorFreq,
      interpretation: 'Vocal tremor detected (4-7 Hz band) — supports PD signature',
    });
    if (detected) {
      confidence = clamp(confidence + 0.05, 0, 1.0);
    }
  }

  // V5: ACU_VOICE_BREAKS as supporting evidence — vocal fold instability
  const voiceBreaks = z(zScores, 'ACU_VOICE_BREAKS');
  if (voiceBreaks !== null && voiceBreaks < PD_IMPAIRMENT_THRESHOLD) {
    supportingEvidence.push({
      indicator: 'ACU_VOICE_BREAKS',
      value: voiceBreaks,
      interpretation: 'Voice breaks detected — vocal fold instability supports PD signature',
    });
    if (detected) {
      confidence = clamp(confidence + 0.05, 0, 1.0);
    }
  }

  return {
    detected,
    confidence: Math.round(confidence * 1000) / 1000,
    quartet_scores: quartetScores,
    supporting_evidence: supportingEvidence,
  };
}

// ════════════════════════════════════════════════════════
// classifyPDSubtype
// ════════════════════════════════════════════════════════

/**
 * Classify PD subtype: Tremor-Dominant (TD) vs Postural Instability / Gait
 * Difficulty (PIGD), based on Moro-Velazquez 2024 voice feature profiles.
 *
 * PIGD: DDK regularity degraded, abnormal F0 range (pitch breaks), articulatory
 * decay, speech rate decline across segments, inappropriate pauses.
 *
 * TD: DDK regularity preserved, monopitch present, less articulatory involvement.
 *
 * V5: ACU_TREMOR_FREQ helps differentiate — prominent tremor supports TD subtype.
 *
 * @param {Object} zScores - Map of indicator ID to z-score
 * @returns {Object|null} Subtype classification or null if insufficient data
 */
export function classifyPDSubtype(zScores) {
  if (!zScores) return null;

  const evidence = [];
  let pigdScore = 0;
  let tdScore = 0;
  let availableFeatures = 0;

  // DDK Regularity — degraded in PIGD, preserved in TD
  const ddkReg = z(zScores, 'PDM_DDK_REG');
  if (ddkReg !== null) {
    availableFeatures++;
    if (ddkReg < -0.6) {
      pigdScore += 2.0;
      evidence.push({ indicator: 'PDM_DDK_REG', direction: 'pigd', value: ddkReg,
        note: 'Severely degraded DDK regularity — PIGD pattern' });
    } else if (ddkReg < PD_IMPAIRMENT_THRESHOLD) {
      pigdScore += 1.0;
      evidence.push({ indicator: 'PDM_DDK_REG', direction: 'pigd', value: ddkReg,
        note: 'Mildly degraded DDK regularity' });
    } else {
      tdScore += 1.5;
      evidence.push({ indicator: 'PDM_DDK_REG', direction: 'td', value: ddkReg,
        note: 'Preserved DDK regularity — TD pattern' });
    }
  }

  // F0 Range — abnormal pitch breaks in PIGD
  const f0Range = z(zScores, 'ACU_F0_RANGE');
  if (f0Range !== null) {
    availableFeatures++;
    // Very low OR very high range can indicate PIGD (pitch breaks = sudden jumps)
    if (f0Range < -0.8 || f0Range > 1.5) {
      pigdScore += 1.5;
      evidence.push({ indicator: 'ACU_F0_RANGE', direction: 'pigd', value: f0Range,
        note: 'Abnormal F0 range — pitch breaks suggestive of PIGD' });
    } else if (f0Range < PD_IMPAIRMENT_THRESHOLD) {
      tdScore += 1.0;
      evidence.push({ indicator: 'ACU_F0_RANGE', direction: 'td', value: f0Range,
        note: 'Reduced F0 range consistent with TD monopitch' });
    }
  }

  // Festination — progressive DDK rate acceleration, more prominent in PIGD
  const festination = z(zScores, 'PDM_FESTINATION');
  if (festination !== null) {
    availableFeatures++;
    if (festination < -0.5) {
      pigdScore += 1.5;
      evidence.push({ indicator: 'PDM_FESTINATION', direction: 'pigd', value: festination,
        note: 'Oral festination detected — articulatory decay pattern' });
    }
  }

  // Speech rate — decreased rate in later segments typical of PIGD
  const speechRate = z(zScores, 'TMP_SPEECH_RATE');
  if (speechRate !== null) {
    availableFeatures++;
    if (speechRate < -0.8) {
      pigdScore += 1.0;
      evidence.push({ indicator: 'TMP_SPEECH_RATE', direction: 'pigd', value: speechRate,
        note: 'Markedly reduced speech rate — PIGD-associated' });
    }
  }

  // Pause patterns — inappropriate pauses in PIGD
  const lpr = z(zScores, 'TMP_LPR');
  if (lpr !== null) {
    availableFeatures++;
    if (lpr < -0.6) {
      pigdScore += 1.0;
      evidence.push({ indicator: 'TMP_LPR', direction: 'pigd', value: lpr,
        note: 'Elevated long pause ratio — inappropriate pauses' });
    }
  }

  // Monopitch — present in both but more defining for TD
  const monopitch = z(zScores, 'PDM_MONOPITCH');
  const f0sd = z(zScores, 'ACU_F0_SD');
  if (monopitch !== null || f0sd !== null) {
    availableFeatures++;
    const mpVal = monopitch !== null ? monopitch : f0sd;
    if (mpVal < PD_IMPAIRMENT_THRESHOLD) {
      tdScore += 1.0;
      evidence.push({ indicator: monopitch !== null ? 'PDM_MONOPITCH' : 'ACU_F0_SD',
        direction: 'td', value: mpVal,
        note: 'Monopitch present — common in both but defining feature in TD' });
    }
  }

  // VSA / articulatory involvement — less in TD, more in PIGD
  const vsa = z(zScores, 'PDM_VSA');
  if (vsa !== null) {
    availableFeatures++;
    if (vsa < -0.6) {
      pigdScore += 1.5;
      evidence.push({ indicator: 'PDM_VSA', direction: 'pigd', value: vsa,
        note: 'Significant vowel space compression — articulatory involvement (PIGD)' });
    } else {
      tdScore += 0.5;
      evidence.push({ indicator: 'PDM_VSA', direction: 'td', value: vsa,
        note: 'Relatively preserved vowel space — less articulatory involvement (TD)' });
    }
  }

  // V5: ACU_TREMOR_FREQ — prominent tremor supports TD subtype
  const tremorFreq = z(zScores, 'ACU_TREMOR_FREQ');
  if (tremorFreq !== null) {
    availableFeatures++;
    if (tremorFreq < -0.6) {
      tdScore += 1.5;
      evidence.push({ indicator: 'ACU_TREMOR_FREQ', direction: 'td', value: tremorFreq,
        note: 'Vocal tremor present — supports tremor-dominant subtype' });
    }
  }

  if (availableFeatures < 2) {
    return {
      subtype: 'indeterminate',
      confidence: 0,
      evidence,
      note: 'Insufficient features for subtype classification',
    };
  }

  // Determine subtype
  const diff = pigdScore - tdScore;
  let subtype;
  let confidence;

  if (diff > 1.5) {
    subtype = 'pigd';
    confidence = clamp(0.5 + diff * 0.08, 0.50, 0.95);
  } else if (diff < -1.5) {
    subtype = 'td';
    confidence = clamp(0.5 + Math.abs(diff) * 0.08, 0.50, 0.95);
  } else {
    subtype = 'indeterminate';
    confidence = clamp(0.3 - Math.abs(diff) * 0.05, 0.10, 0.40);
  }

  return {
    subtype,
    confidence: Math.round(confidence * 1000) / 1000,
    evidence,
  };
}

// ════════════════════════════════════════════════════════
// differentiateParkinsonism
// ════════════════════════════════════════════════════════

/**
 * Differential diagnosis: PD vs MSA vs PSP vs ET.
 * Based on Harel 2004, Rusz 2015 dysarthria profiles.
 *
 * - PD:  hypokinetic dysarthria — monopitch, monoloudness, reduced articulatory range
 * - MSA: hypokinetic-ataxic — strained-strangled, excessive pitch/loudness fluctuation,
 *        vocal tremor, variable rate. DDK /pataka/ at 77.4% MSA accuracy.
 * - PSP: hypokinetic-spastic — stuttering-like, involuntary repetition, severe
 *        imprecise consonants, articulatory decay
 * - ET:  distinct articulatory + phonatory + prosodic profile (81-86% cross-language)
 *
 * V5: ACU_TREMOR_FREQ for MSA differentiation (MSA has more prominent tremor);
 *     ACU_VOICE_BREAKS for PSP spastic component detection.
 *
 * @param {Object} zScores     - Map of indicator ID to z-score
 * @param {Object} domainScores - Map of domain name to composite score
 * @returns {Object|null} Differential probabilities
 */
export function differentiateParkinsonism(zScores, domainScores) {
  if (!zScores) return null;

  const evidence = [];
  let pdScore = 0;
  let msaScore = 0;
  let pspScore = 0;
  let etScore = 0;

  // --- Monopitch / monoloudness (PD hallmark) ---
  const f0sd = z(zScores, 'ACU_F0_SD');
  const monopitch = z(zScores, 'PDM_MONOPITCH');
  const energyRange = z(zScores, 'ACU_ENERGY_RANGE');

  if (f0sd !== null && f0sd < PD_IMPAIRMENT_THRESHOLD) {
    pdScore += 2.0;
    evidence.push({ feature: 'monopitch', supports: 'pd',
      note: 'Reduced F0 variability — hypokinetic monopitch' });
  }
  if (monopitch !== null && monopitch < PD_IMPAIRMENT_THRESHOLD) {
    pdScore += 1.5;
  }
  if (energyRange !== null && energyRange < PD_IMPAIRMENT_THRESHOLD) {
    pdScore += 1.5;
    evidence.push({ feature: 'monoloudness', supports: 'pd',
      note: 'Reduced energy dynamic range — monoloudness' });
  }

  // --- Excessive pitch/loudness fluctuation (MSA hallmark) ---
  // MSA shows the OPPOSITE pattern: strained-strangled voice with erratic variation
  if (f0sd !== null && f0sd > 0.8) {
    msaScore += 2.5;
    evidence.push({ feature: 'pitch_fluctuation', supports: 'msa',
      note: 'Excessive F0 variability — strained-strangled voice (MSA pattern)' });
  }
  if (energyRange !== null && energyRange > 0.8) {
    msaScore += 1.5;
    evidence.push({ feature: 'loudness_fluctuation', supports: 'msa',
      note: 'Excessive energy fluctuation — ataxic component (MSA)' });
  }

  // --- DDK performance (critical differential: Harel 2004) ---
  const ddkRate = z(zScores, 'PDM_DDK_RATE');
  const ddkReg = z(zScores, 'PDM_DDK_REG');

  if (ddkRate !== null) {
    if (ddkRate < -1.0) {
      // Severely reduced DDK rate: MSA > PD
      msaScore += 2.0;
      pspScore += 1.0;
      evidence.push({ feature: 'ddk_rate', supports: 'msa',
        note: 'Severely reduced DDK rate — /pataka/ 77.4% MSA accuracy (Harel 2004)' });
    } else if (ddkRate < PD_IMPAIRMENT_THRESHOLD) {
      pdScore += 1.0;
      msaScore += 0.5;
    }
  }

  if (ddkReg !== null) {
    if (ddkReg < -1.0) {
      // Severely irregular DDK: MSA ataxic pattern
      msaScore += 1.5;
      evidence.push({ feature: 'ddk_irregularity', supports: 'msa',
        note: 'Highly irregular DDK timing — ataxic component' });
    }
  }

  // --- Articulatory precision (PSP: severe imprecise consonants) ---
  const vsa = z(zScores, 'PDM_VSA');
  const vai = z(zScores, 'PDM_VAI');
  const spirant = z(zScores, 'PDM_SPIRANT');
  const vot = z(zScores, 'PDM_VOT');

  const articulatoryImpairment = meanZ(zScores,
    ['PDM_VSA', 'PDM_VAI', 'PDM_VOT', 'PDM_SPIRANT']);

  if (articulatoryImpairment !== null && articulatoryImpairment < -1.0) {
    pspScore += 2.5;
    evidence.push({ feature: 'severe_articulatory', supports: 'psp',
      note: 'Severe articulatory impairment — imprecise consonants (PSP pattern)' });
  } else if (articulatoryImpairment !== null && articulatoryImpairment < -0.5) {
    pdScore += 1.0;
    pspScore += 0.5;
  }

  // --- Festination / stuttering-like behavior (PSP hallmark) ---
  const festination = z(zScores, 'PDM_FESTINATION');
  const repetition = z(zScores, 'TMP_REPETITION');

  if (festination !== null && festination < -0.8) {
    pspScore += 1.5;
    evidence.push({ feature: 'festination_stutter', supports: 'psp',
      note: 'Oral festination with possible stuttering-like blocks (PSP)' });
  }
  if (repetition !== null && repetition < -0.5) {
    pspScore += 1.0;
    evidence.push({ feature: 'involuntary_repetition', supports: 'psp',
      note: 'Involuntary syllable repetition — spastic component (PSP)' });
  }

  // --- V5: ACU_TREMOR_FREQ — MSA shows MORE prominent tremor frequency power than PD ---
  const tremorFreq = z(zScores, 'ACU_TREMOR_FREQ');
  if (tremorFreq !== null && tremorFreq < -0.8) {
    msaScore += 1.5;
    evidence.push({ feature: 'prominent_tremor', supports: 'msa',
      note: 'Prominent vocal tremor (4-7 Hz) — MSA more than PD' });
  } else if (tremorFreq !== null && tremorFreq < -0.4) {
    pdScore += 0.5;
  }

  // --- V5: ACU_VOICE_BREAKS — More breaks in PSP (spastic component) ---
  const voiceBreaks = z(zScores, 'ACU_VOICE_BREAKS');
  if (voiceBreaks !== null && voiceBreaks < -0.6) {
    pspScore += 1.0;
    evidence.push({ feature: 'voice_breaks', supports: 'psp',
      note: 'Frequent voice breaks — spastic component (PSP)' });
  }

  // --- HNR / voice quality ---
  const hnr = z(zScores, 'ACU_HNR');
  if (hnr !== null && hnr < -0.8) {
    pdScore += 1.0;
    msaScore += 0.5;
    evidence.push({ feature: 'reduced_hnr', supports: 'pd',
      note: 'Reduced HNR — vocal fold insufficiency (PD primary)' });
  }

  // --- ET profile: distinct articulatory + phonatory + prosodic ---
  // ET typically shows: vocal tremor (jitter/shimmer elevated), preserved
  // articulation, moderate prosodic changes, 81-86% distinguishable
  const jitter = z(zScores, 'ACU_JITTER');
  const shimmer = z(zScores, 'ACU_SHIMMER');

  if (jitter !== null && shimmer !== null) {
    // Elevated perturbation without severe articulatory impairment = ET pattern
    if (jitter < -0.6 && shimmer < -0.6 &&
        (articulatoryImpairment === null || articulatoryImpairment > -0.5)) {
      etScore += 2.5;
      evidence.push({ feature: 'vocal_tremor_preserved_artic', supports: 'et',
        note: 'Vocal tremor (jitter+shimmer) with preserved articulation — ET pattern' });
    }
  }

  // Domain-level signals if available
  if (domainScores) {
    const pdMotor = domainScores.pd_motor;
    const acoustic = domainScores.acoustic;
    if (pdMotor !== null && pdMotor !== undefined && acoustic !== null && acoustic !== undefined) {
      // In ET, acoustic perturbation is prominent but pd_motor domain is less affected
      if (acoustic < 0.4 && pdMotor > 0.5) {
        etScore += 1.0;
      }
    }
  }

  // --- Normalize to probabilities ---
  const totalScore = pdScore + msaScore + pspScore + etScore;

  if (!Number.isFinite(totalScore) || totalScore <= 0) {
    return {
      probabilities: { pd: 0.25, msa: 0.25, psp: 0.25, et: 0.25 },
      primary: 'indeterminate',
      confidence: 0,
      evidence,
    };
  }

  let probabilities = {
    pd:  Math.round((pdScore / totalScore) * 1000) / 1000,
    msa: Math.round((msaScore / totalScore) * 1000) / 1000,
    psp: Math.round((pspScore / totalScore) * 1000) / 1000,
    et:  Math.round((etScore / totalScore) * 1000) / 1000,
  };

  // Determine primary diagnosis
  const sorted = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0][1] > 0.35 ? sorted[0][0] : null;
  const margin = sorted[0][1] - sorted[1][1];
  const confidence = clamp(margin + 0.3, 0.20, 0.95);

  return {
    probabilities,
    primary,
    evidence,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}

// ════════════════════════════════════════════════════════
// stagePD
// ════════════════════════════════════════════════════════

/**
 * Estimate Hoehn & Yahr stage from voice features.
 *
 * - Prodromal (RBD): only monopitch detectable (AUC 0.65)
 * - H&Y 1-2 (Early): dysphonia dominant — monopitch, monoloudness, reduced HNR
 * - H&Y 2.5-3 (Moderate): articulatory impairment — DDK, VSA, imprecise consonants
 * - H&Y 4-5 (Advanced): articulation dominant, vocal tremor, intelligibility loss
 *
 * V5: ACU_BREATHINESS and ACU_LOUDNESS_DECAY added to phonatory assessment;
 *     ACU_VOICE_BREAKS added to articulatory assessment.
 *
 * @param {Object} zScores      - Map of indicator ID to z-score
 * @param {Object} domainScores - Map of domain name to composite score
 * @param {Array}  history      - Previous session results (optional)
 * @returns {Object|null} Stage estimation
 */
export function stagePD(zScores, domainScores, history) {
  if (!zScores) return null;

  // Phonatory features (early involvement)
  const phonatoryIds = ['ACU_F0_SD', 'PDM_MONOPITCH', 'ACU_HNR', 'ACU_ENERGY_RANGE',
    'ACU_JITTER', 'ACU_SHIMMER', 'ACU_BREATHINESS', 'ACU_LOUDNESS_DECAY'];  // V5: +2
  const phonatoryMean = meanZ(zScores, phonatoryIds);
  const { count: phonatoryImpaired, available: phonatoryAvail } =
    countBelow(zScores, phonatoryIds, PD_IMPAIRMENT_THRESHOLD);

  // Articulatory features (moderate-stage involvement)
  const articulatoryIds = ['PDM_VSA', 'PDM_VAI', 'PDM_DDK_RATE', 'PDM_DDK_REG',
    'PDM_VOT', 'PDM_SPIRANT', 'ACU_VOICE_BREAKS'];  // V5: +1
  const articulatoryMean = meanZ(zScores, articulatoryIds);
  const { count: articImpaired, available: articAvail } =
    countBelow(zScores, articulatoryIds, PD_IMPAIRMENT_THRESHOLD);

  // Prosodic / fluency features (late-stage collapse)
  const prosodicIds = ['TMP_SPEECH_RATE', 'TMP_LPR', 'TMP_PAUSE_DURATION',
    'TMP_ARTIC_RATE', 'PDM_FESTINATION'];
  const prosodicMean = meanZ(zScores, prosodicIds);
  const { count: prosodicImpaired, available: prosodicAvail } =
    countBelow(zScores, prosodicIds, PD_IMPAIRMENT_THRESHOLD);

  // Monopitch-only check (prodromal)
  const monopitchOnly = (() => {
    const mp = z(zScores, 'PDM_MONOPITCH') ?? z(zScores, 'ACU_F0_SD');
    if (mp === null) return false;
    const isMonopitch = mp < PD_IMPAIRMENT_THRESHOLD;
    const otherOk = (phonatoryImpaired <= 1) && (articImpaired === 0) && (prosodicImpaired === 0);
    return isMonopitch && otherOk;
  })();

  let estimatedStage;
  let confidence;
  let domainPattern;

  if (monopitchOnly) {
    estimatedStage = 'prodromal';
    confidence = 0.40; // AUC 0.65 for prodromal RBD
    domainPattern = 'monopitch_isolated';
  } else if (articImpaired === 0 && prosodicImpaired === 0 && phonatoryImpaired > 0) {
    // Dysphonia only — early PD
    estimatedStage = 'hy_1_2';
    confidence = clamp(0.45 + phonatoryImpaired * 0.06, 0.45, 0.75);
    domainPattern = 'phonatory_dominant';
  } else if (articImpaired > 0 && prosodicImpaired <= 1) {
    // Articulatory impairment beginning — moderate
    estimatedStage = 'hy_2.5_3';
    const artSeverity = articulatoryMean !== null ? Math.abs(articulatoryMean) : 0;
    confidence = clamp(0.40 + artSeverity * 0.10 + articImpaired * 0.04, 0.40, 0.75);
    domainPattern = 'phonatory_plus_articulatory';
  } else if (prosodicImpaired >= 2 || (articImpaired >= 3 && prosodicImpaired >= 1)) {
    // Broad collapse — advanced
    estimatedStage = 'hy_4_5';
    confidence = clamp(0.35 + prosodicImpaired * 0.08 + articImpaired * 0.04, 0.35, 0.70);
    domainPattern = 'articulation_dominant_with_prosodic_collapse';
  } else if (phonatoryImpaired > 0 || articImpaired > 0) {
    // Mixed but not clearly staged — default to early-moderate
    estimatedStage = 'hy_1_2';
    confidence = 0.35;
    domainPattern = 'mixed_mild';
  } else {
    estimatedStage = 'indeterminate';
    confidence = 0;
    domainPattern = 'insufficient_impairment';
  }

  // Progression velocity from longitudinal history
  let progressionVelocity = null;
  if (history && Array.isArray(history) && history.length >= 3) {
    const recent = history.slice(-6);
    const pdMotorScores = recent
      .map(h => h?.domainScores?.pd_motor)
      .filter(v => v !== null && v !== undefined && isFinite(v));
    if (pdMotorScores.length >= 3) {
      const first = pdMotorScores.slice(0, Math.ceil(pdMotorScores.length / 2));
      const second = pdMotorScores.slice(Math.ceil(pdMotorScores.length / 2));
      const firstMean = first.length > 0 ? first.reduce((a, b) => a + b, 0) / first.length : 0;
      const secondMean = second.length > 0 ? second.reduce((a, b) => a + b, 0) / second.length : 0;
      const delta = Number.isFinite(secondMean - firstMean) ? secondMean - firstMean : 0;
      if (delta < -0.15) progressionVelocity = 'rapid_decline';
      else if (delta < -0.05) progressionVelocity = 'gradual_decline';
      else if (delta > 0.05) progressionVelocity = 'improving';
      else progressionVelocity = 'stable';
    }
  }

  return {
    estimated_stage: estimatedStage,
    confidence: Math.round(confidence * 1000) / 1000,
    domain_pattern: domainPattern,
    progression_velocity: progressionVelocity,
  };
}

// ════════════════════════════════════════════════════════
// predictUPDRS
// ════════════════════════════════════════════════════════

/**
 * Estimate motor UPDRS score from voice features using a linear model
 * based on Tsanas 2010 published coefficients.
 *
 * Input features: jitter, shimmer, HNR, RPDE, DFA, PPE
 *
 * @param {Object} zScores - Map of indicator ID to z-score
 * @returns {Object|null} UPDRS estimation or null if insufficient data
 */
export function predictUPDRS(zScores) {
  if (!zScores) return null;

  const featureIds = Object.keys(UPDRS_COEFFICIENTS).filter(k => k !== 'intercept');
  const featuresUsed = [];
  let sum = UPDRS_COEFFICIENTS.intercept;
  let availableCount = 0;

  for (const id of featureIds) {
    const val = z(zScores, id);
    if (val !== null) {
      sum += UPDRS_COEFFICIENTS[id] * val;
      availableCount++;
      featuresUsed.push({ indicator: id, z_score: val, coefficient: UPDRS_COEFFICIENTS[id] });
    }
  }

  if (availableCount < UPDRS_MIN_FEATURES) {
    return {
      estimated_updrs: null,
      confidence: 0,
      features_used: featuresUsed,
      note: `Insufficient features (${availableCount}/${UPDRS_MIN_FEATURES} minimum)`,
    };
  }

  // Clamp to valid UPDRS motor range (0-108)
  const estimate = Math.max(0, Math.min(108, Math.round(sum * 10) / 10));
  if (!Number.isFinite(estimate)) return { estimated_updrs: null, confidence: 0, features_used: 0 };

  // Confidence scales with number of features available
  const featureCoverage = featureIds.length > 0 ? availableCount / featureIds.length : 0;
  const confidence = clamp(0.30 + featureCoverage * 0.45, 0.30, 0.75);

  return {
    estimated_updrs: estimate,
    confidence: Math.round(confidence * 1000) / 1000,
    features_used: featuresUsed,
  };
}

// ════════════════════════════════════════════════════════
// getPDCascade
// ════════════════════════════════════════════════════════

/**
 * PD-specific cascade model (distinct from the AD cascade).
 *
 * Stage 0 — Pre-symptomatic: monopitch only, other features normal
 * Stage 1 — Phonatory involvement: HNR, jitter, shimmer degrading
 * Stage 2 — Articulatory decline: VSA, DDK, VOT degrading
 * Stage 3 — Prosodic + fluency collapse: speech rate, pause patterns
 *
 * @param {Object} domainScores - Map of domain name to composite score (0-1 scale)
 * @returns {Array} Array of detected cascade stages with confidence
 */
export function getPDCascade(domainScores) {
  if (!domainScores) return [];

  const cascade = [];

  // Helper: interpret domain score (lower = more impaired, threshold ~0.45)
  const isImpaired = (score) => score !== null && score !== undefined && score < 0.45;
  const isSevere = (score) => score !== null && score !== undefined && score < 0.30;
  const isNormal = (score) => score !== null && score !== undefined && score >= 0.55;

  const acoustic = domainScores.acoustic;
  const pdMotor = domainScores.pd_motor;
  const temporal = domainScores.temporal;

  // Stage 0: Pre-symptomatic — only monopitch, everything else normal
  // We infer this when acoustic shows borderline impairment but pd_motor and temporal are fine
  if (acoustic !== null && acoustic !== undefined) {
    const acousticBorderline = acoustic >= 0.35 && acoustic < 0.55;
    const motorOk = isNormal(pdMotor) || pdMotor === null || pdMotor === undefined;
    const temporalOk = isNormal(temporal) || temporal === null || temporal === undefined;

    if (acousticBorderline && motorOk && temporalOk) {
      cascade.push({
        stage: 0,
        label: 'Pre-symptomatic',
        description: 'Isolated monopitch — possible prodromal PD (RBD phase)',
        confidence: 0.35,
        domain_evidence: { acoustic },
      });
    }
  }

  // Stage 1: Phonatory involvement
  if (isImpaired(acoustic)) {
    const severity = acoustic < 0.30 ? 'severe' : 'moderate';
    cascade.push({
      stage: 1,
      label: 'Phonatory involvement',
      description: 'HNR, jitter, shimmer degrading — vocal fold insufficiency',
      confidence: clamp(0.55 + (0.45 - acoustic) * 0.5, 0.55, 0.85),
      severity,
      domain_evidence: { acoustic },
    });
  }

  // Stage 2: Articulatory decline
  if (isImpaired(pdMotor)) {
    const severity = isSevere(pdMotor) ? 'severe' : 'moderate';
    cascade.push({
      stage: 2,
      label: 'Articulatory decline',
      description: 'VSA, DDK, VOT degrading — motor speech impairment',
      confidence: clamp(0.50 + (0.45 - pdMotor) * 0.5, 0.50, 0.85),
      severity,
      domain_evidence: { pd_motor: pdMotor },
    });
  }

  // Stage 3: Prosodic + fluency collapse
  if (isImpaired(temporal)) {
    const severity = isSevere(temporal) ? 'severe' : 'moderate';
    cascade.push({
      stage: 3,
      label: 'Prosodic and fluency collapse',
      description: 'Speech rate, pause patterns, articulation rate collapsed',
      confidence: clamp(0.45 + (0.45 - temporal) * 0.5, 0.45, 0.80),
      severity,
      domain_evidence: { temporal },
    });
  }

  return cascade;
}

// ════════════════════════════════════════════════════════
// runPDAnalysis — Main entry point
// ════════════════════════════════════════════════════════

/**
 * Run the complete PD analysis pipeline.
 *
 * @param {Object} zScores      - Map of indicator ID to z-score
 * @param {Object} domainScores - Map of domain name to composite score
 * @param {Object} baseline     - Participant baseline data (optional)
 * @param {Array}  history      - Previous session results (optional)
 * @returns {Object} Complete PD analysis result
 */
export function runPDAnalysis(zScores, domainScores, baseline, history) {
  if (!zScores || typeof zScores !== 'object') {
    return {
      signature: null,
      subtype: null,
      parkinsonian_differential: null,
      stage: null,
      updrs_estimate: null,
      cascade: [],
      confidence: 0,
      error: 'No z-scores provided',
    };
  }

  const signature = detectPDSignature(zScores);
  const subtype = classifyPDSubtype(zScores);
  const parkinsonianDifferential = differentiateParkinsonism(zScores, domainScores);
  const stage = stagePD(zScores, domainScores, history);
  const updrsEstimate = predictUPDRS(zScores);
  const cascade = getPDCascade(domainScores);

  // Overall confidence: weighted combination of sub-analysis confidences
  const confidences = [
    signature?.confidence ?? 0,
    subtype?.confidence ?? 0,
    parkinsonianDifferential?.confidence ?? 0,
    stage?.confidence ?? 0,
    updrsEstimate?.confidence ?? 0,
  ];
  const nonZero = confidences.filter(c => c > 0 && Number.isFinite(c));
  const overallSum = nonZero.reduce((a, b) => a + b, 0);
  const overallConfidence = nonZero.length > 0 && Number.isFinite(overallSum)
    ? Math.round((overallSum / nonZero.length) * 1000) / 1000
    : 0;

  return {
    signature,
    subtype,
    parkinsonian_differential: parkinsonianDifferential,
    stage,
    updrs_estimate: updrsEstimate,
    cascade,
    confidence: overallConfidence,
  };
}
