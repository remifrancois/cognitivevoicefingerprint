/**
 * V5 DIFFERENTIAL DIAGNOSIS ENGINE
 *
 * Extended rule-based differential diagnosis compiled from 80+ studies.
 * No LLM inference needed — the decision tree IS the science.
 *
 * 35 rules across 11 conditions (V5.1: +3 age-normalization, V5.2: +2 VCI):
 *   1. Alzheimer's Disease (cascade pattern)
 *   2. Major Depression (episodic, affective)
 *   3. Parkinson's Disease (motor-dominant)
 *   4. Normal Aging (stable, within noise)
 *   5. Medication Effects (acute, global)
 *   6. Grief / Emotional Distress (topic-dependent)
 *   7. Multiple System Atrophy (MSA — PD-like with vocal tremor)
 *   8. Progressive Supranuclear Palsy (PSP — PD-like with stuttering)
 *   9. Lewy Body Dementia (LBD — fluctuating cognition + parkinsonism)
 *  10. Frontotemporal Dementia (FTD — behavioral/semantic variants)
 *  11. Vascular Cognitive Impairment (VCI — executive+speed, step-wise decline)
 *
 * V5 additions over V4:
 *   - 2 new conditions: LBD (Lewy Body Dementia), FTD (Frontotemporal Dementia)
 *   - 7 new rules (24-30): LBD fluctuation, LBD parkinsonism+cognitive,
 *     FTD behavioral variant, FTD semantic variant, topic-adjusted dampening,
 *     acoustic-linguistic fusion discrepancy, confidence-weighted evidence
 *   - New pragmatic domain indicators (PRA_*)
 *   - New executive domain indicators (EXE_*)
 *   - Topic-genre and indicator-confidence context integration
 *   - detectLBDPattern() and detectFTDPattern() exported helpers
 *
 * V5.1 additions (age-normalization layer):
 *   - Rule 31: Uniform age-consistent decline detection — boosts normal_aging,
 *     dampens disease scores when decline is uniform and within age-band norms
 *   - Rule 32: Acceleration requirement — disease requires accelerating decline
 *     (2nd derivative), not just declining. Linear decline = aging.
 *   - Rule 33: Excess decline beyond age norms — only flags disease when
 *     domain decline rate exceeds age-expected rate (Salthouse 2004)
 *   - context.patientAge and context.declineProfile integration
 *
 * V4 additions over V3 (preserved):
 *   - 9 rules (15-23) for PD subtypes, MSA/PSP, acoustic depression
 *   - Updated Rule 6 depression weighting (r=0.458, Yamamoto 2020)
 *   - Acoustic and PD motor domain integration
 *   - Prodromal PD/RBD detection (Rusz 2021)
 */

import { INDICATORS, DOMAINS, SENTINELS } from './indicators.js';
import { getAgeBand, getAgeAdjustedRate, AGE_BANDS } from './trajectory.js';

// ════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════

/**
 * Run differential diagnosis from z-scores, domain scores, and context.
 *
 * @param {Object} domainScores — per-domain z-scores
 * @param {Object} zScores — per-indicator z-scores
 * @param {Object} context — { timeline, confounders, sessionCount, topicGenre, topicAdjustments, indicatorConfidence, patientAge, declineProfile }
 * @returns {Object} probability distribution + reasoning
 */
export function runDifferential(domainScores, zScores, context = {}) {
  const scores = {
    alzheimer: 0,
    depression: 0,
    parkinson: 0,
    normal_aging: 0,
    medication: 0,
    grief: 0,
    msa: 0,
    psp: 0,
    lbd: 0,   // NEW in V5
    ftd: 0,   // NEW in V5
    vci: 0,   // NEW in V5.2 — Vascular Cognitive Impairment
  };

  const evidence = {
    alzheimer: [],
    depression: [],
    parkinson: [],
    normal_aging: [],
    medication: [],
    grief: [],
    msa: [],
    psp: [],
    lbd: [],  // NEW in V5
    ftd: [],  // NEW in V5
    vci: [],  // NEW in V5.2
  };

  const flags = [];

  // ════════════════════════════════════════════════
  // RULE 1: Cascade Pattern (AD-specific)
  // ════════════════════════════════════════════════
  const hasCascade = detectADCascade(domainScores);
  if (hasCascade.detected) {
    { const value = 0.25 * hasCascade.confidence; if (Number.isFinite(value)) scores.alzheimer += value; }
    evidence.alzheimer.push(`AD cascade pattern detected (stage ${hasCascade.stage}, confidence ${(hasCascade.confidence * 100).toFixed(0)}%)`);
  }

  // ════════════════════════════════════════════════
  // RULE 2: Referential Coherence (THE differentiator)
  // Preserved in depression, degraded in AD
  // ════════════════════════════════════════════════
  const refCoherence = zScores.SEM_REF_COHERENCE;
  if (refCoherence != null) {
    if (refCoherence < -0.5) {
      if (Number.isFinite(0.20)) scores.alzheimer += 0.20;
      evidence.alzheimer.push(`Referential coherence degraded (z=${refCoherence.toFixed(2)}) — AD signature`);
    } else if (refCoherence > -0.2) {
      if (Number.isFinite(0.15)) scores.depression += 0.15;
      if (Number.isFinite(0.10)) scores.normal_aging += 0.10;
      evidence.depression.push(`Referential coherence preserved (z=${refCoherence.toFixed(2)}) — rules against AD`);
    }
  }

  // ════════════════════════════════════════════════
  // RULE 3: Cued Recall Response (THE memory differentiator)
  // Depression: cues help. AD: cues fail.
  // ════════════════════════════════════════════════
  const cuedRecall = zScores.MEM_CUED_RECALL;
  const freeRecall = zScores.MEM_FREE_RECALL;
  if (cuedRecall != null && freeRecall != null) {
    const cueBenefit = cuedRecall - freeRecall;
    if (freeRecall < -0.5 && cueBenefit > 0.3) {
      // Poor free recall but cues help -> retrieval deficit -> depression
      if (Number.isFinite(0.20)) scores.depression += 0.20;
      evidence.depression.push(`Cued recall responsive (benefit=${cueBenefit.toFixed(2)}) — retrieval deficit, not storage`);
    } else if (freeRecall < -0.5 && cueBenefit < 0.15) {
      // Poor free recall and cues DON'T help -> storage deficit -> AD
      if (Number.isFinite(0.20)) scores.alzheimer += 0.20;
      evidence.alzheimer.push(`Cued recall NON-responsive (benefit=${cueBenefit.toFixed(2)}) — storage deficit, AD pattern`);
    }
  }

  // ════════════════════════════════════════════════
  // RULE 4: Self-Referential Pronouns (Depression marker)
  // ════════════════════════════════════════════════
  const selfPronoun = zScores.AFF_SELF_PRONOUN;
  if (selfPronoun != null) {
    if (selfPronoun < -0.5) {
      // Note: z-score is inverted for "UP" direction indicators
      // For depression where UP = bad, a very negative z actually means elevated
      if (Number.isFinite(0.15)) scores.depression += 0.15;
      evidence.depression.push(`Self-referential pronouns elevated (z=${selfPronoun.toFixed(2)}) — depression marker`);
    }
  }

  // ════════════════════════════════════════════════
  // RULE 5: Negative Valence (Depression-specific)
  // ════════════════════════════════════════════════
  const negValence = zScores.AFF_NEG_VALENCE;
  if (negValence != null && negValence < -0.4) {
    if (Number.isFinite(0.15)) scores.depression += 0.15;
    evidence.depression.push(`Negative valence language elevated — depression marker`);
  }

  // ════════════════════════════════════════════════
  // RULE 6: Session-to-Session Variability (pattern type)
  // AD: monotonic. Depression: episodic. LBD: fluctuating.
  // V4 UPDATE: Depression weight increased (r=0.458, Yamamoto 2020)
  // ════════════════════════════════════════════════
  const variability = zScores.TMP_VARIABILITY;
  if (context.timeline?.length >= 7) {
    const pattern = detectTemporalPattern(context.timeline);

    if (pattern.type === 'monotonic_decline') {
      if (Number.isFinite(0.15)) scores.alzheimer += 0.15;
      evidence.alzheimer.push(`Monotonic decline pattern over ${pattern.weeks} weeks — AD trajectory`);
    } else if (pattern.type === 'episodic') {
      // V4: increased from 0.15 to 0.20 (Yamamoto 2020: r=0.458 response latency-HAMD)
      if (Number.isFinite(0.20)) scores.depression += 0.20;
      evidence.depression.push(`Episodic fluctuation pattern — depression trajectory (r=0.458, Yamamoto 2020)`);
    } else if (pattern.type === 'acute_drop') {
      if (Number.isFinite(0.25)) scores.medication += 0.25;
      evidence.medication.push(`Acute onset correlated with timeline — medication effect pattern`);
    } else if (pattern.type === 'stable') {
      if (Number.isFinite(0.25)) scores.normal_aging += 0.25;
      evidence.normal_aging.push(`Stable pattern — within normal aging variance`);
    }
  }

  // ════════════════════════════════════════════════
  // RULE 7: Idea Density (strongest AD predictor)
  // ════════════════════════════════════════════════
  const ideaDensity = zScores.SEM_IDEA_DENSITY;
  if (ideaDensity != null && ideaDensity < -0.5) {
    if (Number.isFinite(0.15)) scores.alzheimer += 0.15;
    evidence.alzheimer.push(`Idea density declining (z=${ideaDensity.toFixed(2)}) — Snowdon: strongest AD predictor`);
  }

  // ════════════════════════════════════════════════
  // RULE 8: Pause Location (mid-clause = AD, boundary = depression)
  // ════════════════════════════════════════════════
  const withinClause = zScores.TMP_WITHIN_CLAUSE;
  if (withinClause != null) {
    if (withinClause < -0.5) {
      if (Number.isFinite(0.10)) scores.alzheimer += 0.10;
      evidence.alzheimer.push(`Within-clause pauses elevated — word-finding difficulty (Pistono 2019)`);
    }
  }

  // ════════════════════════════════════════════════
  // RULE 9: Semantic vs Fluency domain split
  // AD: semantic first. PD: fluency-dominant. Depression: uniform.
  // ════════════════════════════════════════════════
  const sem = domainScores.semantic ?? 0;
  const tmp = domainScores.temporal ?? 0;
  const lex = domainScores.lexical ?? 0;

  if (tmp < -0.5 && sem > -0.2 && lex > -0.2) {
    if (Number.isFinite(0.20)) scores.parkinson += 0.20;
    evidence.parkinson.push(`Fluency-dominant decline (temporal=${tmp.toFixed(2)}) with preserved language — PD pattern`);
  }

  if (sem < -0.5 && lex < -0.5 && tmp > -0.3) {
    if (Number.isFinite(0.10)) scores.alzheimer += 0.10;
    evidence.alzheimer.push(`Semantic+lexical decline with preserved fluency — early AD pattern`);
  }

  // ════════════════════════════════════════════════
  // RULE 10: Engagement + hedonic (depression anhedonia)
  // ════════════════════════════════════════════════
  const hedonic = zScores.AFF_HEDONIC;
  const engagement = zScores.AFF_ENGAGEMENT;
  if (hedonic != null && hedonic < -0.4) {
    if (Number.isFinite(0.10)) scores.depression += 0.10;
    evidence.depression.push(`Reduced hedonic language — anhedonia marker`);
  }
  if (engagement != null && engagement < -0.4) {
    if (Number.isFinite(0.10)) scores.depression += 0.10;
    evidence.depression.push(`Reduced conversational engagement — withdrawal marker`);
  }

  // ════════════════════════════════════════════════
  // RULE 11: Confounder check — medication change
  // ════════════════════════════════════════════════
  if (context.confounders?.some?.(c => c?.confounders?.medication_change)) {
    if (Number.isFinite(0.20)) scores.medication += 0.20;
    evidence.medication.push(`Medication change reported in recent sessions`);
  }

  // ════════════════════════════════════════════════
  // RULE 12: Emotional distress -> grief
  // ════════════════════════════════════════════════
  if (context.confounders?.some?.(c => c?.confounders?.emotional_distress)) {
    if (Number.isFinite(0.15)) scores.grief += 0.15;
    evidence.grief.push(`Emotional distress reported`);
  }

  // ════════════════════════════════════════════════
  // RULE 13: Global stability check (normal aging)
  // ════════════════════════════════════════════════
  const allAboveThreshold = Object.values(domainScores).every(v => v == null || v > -0.3);
  if (allAboveThreshold) {
    if (Number.isFinite(0.30)) scores.normal_aging += 0.30;
    evidence.normal_aging.push(`All domains within normal range (>-0.3) — consistent with healthy aging`);
  }

  // ════════════════════════════════════════════════
  // RULE 14: Self-correction preservation
  // ════════════════════════════════════════════════
  const selfCorrection = zScores.DIS_SELF_CORRECTION;
  if (selfCorrection != null) {
    if (selfCorrection < -0.5) {
      if (Number.isFinite(0.10)) scores.alzheimer += 0.10;
      evidence.alzheimer.push(`Self-correction declining — loss of metacognitive monitoring`);
    } else {
      if (Number.isFinite(0.05)) scores.depression += 0.05;
      if (Number.isFinite(0.05)) scores.normal_aging += 0.05;
      evidence.normal_aging.push(`Self-correction preserved — metacognition intact`);
    }
  }

  // ════════════════════════════════════════════════════════════════
  //
  //  V4 RULES 15-23 — ACOUSTIC + PD MOTOR + EXTENDED DEPRESSION
  //
  // ════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════
  // RULE 15: PD Acoustic Signature
  // PPE + RPDE + HNR trio = PD acoustic quartet (minus DFA for simplicity)
  // Little 2009: quartet achieves 91.4% accuracy
  // ════════════════════════════════════════════════
  const pdmPpe = zScores.PDM_PPE;
  const pdmRpde = zScores.PDM_RPDE;
  const acuHnr = zScores.ACU_HNR;
  const pdAcousticPositive = (
    pdmPpe != null && pdmPpe < -0.5 &&
    pdmRpde != null && pdmRpde < -0.5 &&
    acuHnr != null && acuHnr < -0.5
  );

  if (pdAcousticPositive) {
    if (Number.isFinite(0.30)) scores.parkinson += 0.30;
    evidence.parkinson.push(
      `PD acoustic quartet detected (PPE z=${pdmPpe.toFixed(2)}, RPDE z=${pdmRpde.toFixed(2)}, HNR z=${acuHnr.toFixed(2)}) — Little 2009`
    );
  }

  // ════════════════════════════════════════════════
  // RULE 16: PD Articulatory Decline
  // Vowel space area or DDK rate degradation
  // Rusz 2013, Harel 2004
  // ════════════════════════════════════════════════
  const pdmVsa = zScores.PDM_VSA;
  const pdmDdkRate = zScores.PDM_DDK_RATE;
  const articulatoryInvolved = (
    (pdmVsa != null && pdmVsa < -0.5) ||
    (pdmDdkRate != null && pdmDdkRate < -0.5)
  );

  if (articulatoryInvolved) {
    if (Number.isFinite(0.15)) scores.parkinson += 0.15;
    const parts = [];
    if (pdmVsa != null && pdmVsa < -0.5) parts.push(`VSA z=${pdmVsa.toFixed(2)}`);
    if (pdmDdkRate != null && pdmDdkRate < -0.5) parts.push(`DDK rate z=${pdmDdkRate.toFixed(2)}`);
    evidence.parkinson.push(`Articulatory involvement (${parts.join(', ')})`);
  }

  // ════════════════════════════════════════════════
  // RULE 17: MSA Differentiation
  // MSA differs from PD: F0 SD INCREASES (vocal tremor), shimmer elevated,
  // DDK regularity severely degraded.
  // Moro 2024: /pataka/ 77.4% MSA accuracy
  // ════════════════════════════════════════════════
  const acuF0Sd = zScores.ACU_F0_SD;
  const acuShimmer = zScores.ACU_SHIMMER;
  const pdmDdkReg = zScores.PDM_DDK_REG;

  // MSA: PD acoustic features present BUT F0 SD is INCREASED (not decreased like in PD)
  // AND shimmer elevated AND DDK regularity severely degraded
  const f0SdIncreased = acuF0Sd != null && acuF0Sd > 0.3;
  const shimmerElevated = acuShimmer != null && acuShimmer < -0.5;
  const ddkRegSevere = pdmDdkReg != null && pdmDdkReg < -0.8;

  if (pdAcousticPositive && f0SdIncreased && shimmerElevated && ddkRegSevere) {
    if (Number.isFinite(0.20)) scores.msa += 0.20;
    if (Number.isFinite(-0.10)) scores.parkinson -= 0.10;
    evidence.msa.push(
      `Excessive pitch fluctuation + vocal tremor — MSA pattern ` +
      `(F0_SD z=${acuF0Sd.toFixed(2)} INCREASED, shimmer z=${acuShimmer.toFixed(2)}, DDK_REG z=${pdmDdkReg.toFixed(2)})`
    );
  }

  // ════════════════════════════════════════════════
  // RULE 18: PSP Differentiation
  // PSP: PD features + stuttering-like repetitions + severe DDK irregularity
  // + progressive articulatory decay
  // Skodda 2011, Moro 2024
  // ════════════════════════════════════════════════
  const tmpRepetition = zScores.TMP_REPETITION;
  const repetitionSevere = tmpRepetition != null && tmpRepetition < -0.8;

  // PSP pattern: PD-like features + stuttering-like repetitions + severely degraded DDK regularity
  // + articulatory decay (rule 16 positive)
  if (
    pdAcousticPositive &&
    repetitionSevere &&
    ddkRegSevere &&
    articulatoryInvolved
  ) {
    if (Number.isFinite(0.15)) scores.psp += 0.15;
    evidence.psp.push(
      `Stuttering-like behavior + severe articulatory decay — PSP pattern ` +
      `(repetition z=${tmpRepetition.toFixed(2)}, DDK_REG z=${pdmDdkReg.toFixed(2)})`
    );
  }

  // ════════════════════════════════════════════════
  // RULE 19: MDD vs Bipolar Differentiation (evidence note only)
  // Yamamoto 2020: response latency MDD >> BP (p=0.001)
  // Does NOT change scores — adds diagnostic evidence note
  // ════════════════════════════════════════════════
  const responseLatency = zScores.TMP_RESPONSE_LATENCY;
  if (scores.depression > 0.20 && responseLatency != null && responseLatency < -1.0) {
    evidence.depression.push(
      `MDD pattern (response time MDD >> BP, Yamamoto 2020 p=0.001) — ` +
      `latency z=${responseLatency.toFixed(2)}, extremely elevated`
    );
    flags.push('mdd_vs_bipolar_noted');
  }

  // ════════════════════════════════════════════════
  // RULE 20: Acoustic Depression Markers
  // MFCC-2 + spectral harmonicity — cross-cultural markers
  // Le 2026: MFCC-2 highest SHAP (0.069), spectral harmonicity SHAP (0.036)
  // ════════════════════════════════════════════════
  const acuMfcc2 = zScores.ACU_MFCC2;
  const acuSpectralHarm = zScores.ACU_SPECTRAL_HARM;
  if (acuMfcc2 != null && acuMfcc2 < -0.5 && acuSpectralHarm != null && acuSpectralHarm < -0.5) {
    if (Number.isFinite(0.15)) scores.depression += 0.15;
    evidence.depression.push(
      `Acoustic depression markers (MFCC-2 z=${acuMfcc2.toFixed(2)} + spectral harmonicity z=${acuSpectralHarm.toFixed(2)}) — Le 2026`
    );
  }

  // ════════════════════════════════════════════════
  // RULE 21: Death/Ruminative Language
  // Mocnik 2025: death-related and ruminative language as depression markers
  // ════════════════════════════════════════════════
  const lexDeathWords = zScores.LEX_DEATH_WORDS;
  const lexRuminative = zScores.LEX_RUMINATIVE;
  if (lexDeathWords != null && lexDeathWords < -0.4 && lexRuminative != null && lexRuminative < -0.4) {
    if (Number.isFinite(0.10)) scores.depression += 0.10;
    evidence.depression.push(
      `Death-related and ruminative language elevated ` +
      `(death z=${lexDeathWords.toFixed(2)}, ruminative z=${lexRuminative.toFixed(2)})`
    );
  }

  // ════════════════════════════════════════════════
  // RULE 22: Verbal Output Reduction
  // Reduced verbal output shared across depression and PD
  // Depression: spectral markers differentiate. PD: articulatory markers differentiate.
  // Mocnik 2025
  // ════════════════════════════════════════════════
  const lexVerbalOutput = zScores.LEX_VERBAL_OUTPUT;
  if (lexVerbalOutput != null && lexVerbalOutput < -0.5) {
    if (Number.isFinite(0.05)) scores.depression += 0.05;
    if (Number.isFinite(0.05)) scores.parkinson += 0.05;
    evidence.depression.push(
      `Verbal output reduced (z=${lexVerbalOutput.toFixed(2)}) — shared psychomotor marker`
    );
    evidence.parkinson.push(
      `Verbal output reduced (z=${lexVerbalOutput.toFixed(2)}) — shared psychomotor marker`
    );
  }

  // ════════════════════════════════════════════════
  // RULE 23: Monopitch as Prodromal PD / RBD
  // Isolated monopitch with near-normal other PD motor features
  // may indicate prodromal PD or REM-sleep behavior disorder (RBD)
  // Rusz 2021: monopitch AUC 0.80 PD, AUC 0.65 for prodromal RBD
  // ════════════════════════════════════════════════
  const pdmMonopitch = zScores.PDM_MONOPITCH;
  const pdMotorDomain = domainScores.pd_motor ?? 0;

  if (pdmMonopitch != null && pdmMonopitch < -0.4 && pdMotorDomain > -0.2) {
    if (Number.isFinite(0.10)) scores.parkinson += 0.10;
    evidence.parkinson.push(
      `Monopitch detected (z=${pdmMonopitch.toFixed(2)}) with near-normal PD motor domain (${pdMotorDomain.toFixed(2)}) — ` +
      `possible prodromal PD/RBD (Rusz 2021: AUC 0.65 for RBD)`
    );
    flags.push('prodromal_pd_rbd_flag');
  }

  // ════════════════════════════════════════════════════════════════
  //
  //  V5 RULES 24-30 — LBD, FTD, TOPIC DAMPENING, FUSION, CONFIDENCE
  //
  // ════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════
  // RULE 24: LBD Fluctuating Cognition
  // LBD shows characteristic day-to-day fluctuation in cognitive performance
  // If TMP_VARIABILITY is very high AND there are PD-like motor features AND cognitive decline
  // ════════════════════════════════════════════════
  if (variability != null && variability < -0.8) { // extreme variability
    const hasPDMotor = (domainScores.pd_motor ?? 0) < -0.3 || (domainScores.acoustic ?? 0) < -0.3;
    const hasCognitive = (domainScores.semantic ?? 0) < -0.3 || (domainScores.memory ?? 0) < -0.3;
    if (hasPDMotor && hasCognitive) {
      scores.lbd += 0.25;
      evidence.lbd.push('Fluctuating cognition with PD motor features — LBD pattern');
    }
  }

  // ════════════════════════════════════════════════
  // RULE 25: LBD Parkinsonism + Cognitive Decline
  // PD motor features + concurrent cognitive decline = LBD (vs pure PD where cognitive is spared early)
  // ════════════════════════════════════════════════
  const pdMotor = domainScores.pd_motor ?? 0;
  const cogDecline = Math.min(domainScores.semantic ?? 0, domainScores.memory ?? 0);
  if (pdMotor < -0.4 && cogDecline < -0.4) {
    scores.lbd += 0.20;
    scores.parkinson -= 0.05; // Less likely pure PD
    evidence.lbd.push('Concurrent motor + cognitive decline — LBD > PD');
  }

  // ════════════════════════════════════════════════
  // RULE 26: FTD Behavioral Variant
  // FTD-bv: pragmatic collapse with preserved memory
  // ════════════════════════════════════════════════
  const pragmaticIds = ['PRA_INDIRECT_SPEECH', 'PRA_DISCOURSE_MARKERS', 'PRA_REGISTER_SHIFT',
                         'PRA_NARRATIVE_STRUCTURE', 'PRA_PERSPECTIVE_TAKING', 'PRA_HUMOR_IRONY'];
  const pragmaticZ = pragmaticIds.map(id => zScores[id]).filter(v => v != null);
  const pragmaticMean = pragmaticZ.length > 0 ? pragmaticZ.reduce((a, b) => a + b, 0) / pragmaticZ.length : null;
  const memoryPreserved = (domainScores.memory ?? 0) > -0.3;

  if (pragmaticMean != null && pragmaticMean < -0.6 && memoryPreserved) {
    scores.ftd += 0.25;
    evidence.ftd.push('Pragmatic collapse with preserved memory — FTD behavioral variant');
  }

  // ════════════════════════════════════════════════
  // RULE 27: FTD Semantic Variant
  // Severe word-finding deficit with preserved syntax
  // ════════════════════════════════════════════════
  const wordFreq = zScores.LEX_WORD_FREQ;
  const syntaxPreserved = (domainScores.syntactic ?? 0) > -0.2;
  if (wordFreq != null && wordFreq < -0.8 && syntaxPreserved) {
    scores.ftd += 0.20;
    evidence.ftd.push('Severe word-finding deficit with preserved syntax — FTD semantic variant');
  }

  // ════════════════════════════════════════════════
  // RULE 28: Topic-Adjusted Threshold Dampening
  // Reduces false positive weight when topic adjustments explain variance
  // Uses topic_genre from context (topic-profiles.js)
  // ════════════════════════════════════════════════
  if (context.topicGenre && context.topicGenre !== 'daily_routine') {
    // If topic adjustments significantly shifted z-scores, reduce false positive weights
    const adjustmentMagnitude = context.topicAdjustments
      ? Object.values(context.topicAdjustments).filter(v => Math.abs(v) > 0.05).length
      : 0;
    if (adjustmentMagnitude > 5) {
      // Dampen all condition scores except normal_aging
      const dampFactor = 0.85;
      for (const cond of Object.keys(scores)) {
        if (cond !== 'normal_aging') scores[cond] *= dampFactor;
      }
      scores.normal_aging += 0.05;
      evidence.normal_aging.push(`Topic (${context.topicGenre}) accounts for ${adjustmentMagnitude} indicator shifts — dampening`);
    }
  }

  // ════════════════════════════════════════════════
  // RULE 29: Acoustic-Linguistic Fusion Discrepancy
  // When acoustic decline present without text decline → flag for further investigation
  // May indicate early PD or medication effect
  // ════════════════════════════════════════════════
  const acousticDomain = domainScores.acoustic ?? null;
  const textDomainMean = ['lexical', 'syntactic', 'semantic'].map(d => domainScores[d] ?? 0);
  const textMean = textDomainMean.reduce((a, b) => a + b, 0) / textDomainMean.length;
  if (acousticDomain != null && acousticDomain < -0.5 && textMean > -0.2) {
    flags.push('acoustic_linguistic_discrepancy');
    scores.parkinson += 0.10;
    evidence.parkinson.push('Acoustic decline without text decline — possible early motor involvement');
  }

  // ════════════════════════════════════════════════
  // RULE 30: Confidence-Weighted Evidence Aggregation
  // Low-confidence indicators contribute less to differential scores
  // Uses indicatorConfidence from dual-pass extraction
  // ════════════════════════════════════════════════
  if (context.indicatorConfidence) {
    // Reduce contribution of low-confidence indicators
    let totalReduction = 0;
    for (const [id, conf] of Object.entries(context.indicatorConfidence)) {
      if (conf < 0.5 && zScores[id] != null && Math.abs(zScores[id]) > 0.5) {
        totalReduction += (1 - conf) * 0.02;
      }
    }
    if (totalReduction > 0.05) {
      for (const cond of Object.keys(scores)) {
        if (cond !== 'normal_aging') scores[cond] *= (1 - totalReduction);
      }
      flags.push('low_confidence_dampening');
    }
  }

  // ════════════════════════════════════════════════════════════════
  //
  //  V5.1 RULES 31-33 — AGE-NORMALIZATION LAYER
  //
  //  Separates disease-driven decline from normal age-related decline.
  //  Key principles:
  //    1. Normal aging is UNIFORM across domains, disease is ASYMMETRIC
  //    2. Normal aging is LINEAR, disease ACCELERATES
  //    3. Decline within age-expected rates is NOT pathological
  //
  // ════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════
  // RULE 31: Uniform Age-Consistent Decline
  // When all domains decline at roughly the same rate AND that rate
  // is within the age-band expected range → strong normal aging signal.
  // Dampens disease scores proportionally.
  //
  // Salthouse 2004: general cognitive decline is domain-symmetric.
  // Disease (AD, PD, FTD) always shows domain-specific leading edges.
  // ════════════════════════════════════════════════
  if (context.declineProfile?.age_consistent) {
    scores.normal_aging += 0.40;
    evidence.normal_aging.push(
      'Decline rate is uniform across all domains and within age-expected range — consistent with normal aging, not disease'
    );
    // Dampen all disease scores — uniform decline is strongly anti-disease
    for (const condition of ['alzheimer', 'parkinson', 'lbd', 'ftd', 'msa', 'psp', 'vci']) {
      const reduction = scores[condition] * 0.4;
      if (Number.isFinite(reduction) && reduction > 0) {
        scores[condition] -= reduction;
        evidence[condition].push(
          `Score dampened by ${(reduction * 100).toFixed(0)}% — decline is uniform and age-consistent`
        );
      }
    }
    flags.push('age_consistent_decline');
  }

  // ════════════════════════════════════════════════
  // RULE 32: Acceleration Requirement for Disease Flags
  // Normal aging produces CONSTANT rate decline (linear slope).
  // Neurodegenerative disease produces ACCELERATING decline
  // (slope gets steeper over time — 2nd derivative is negative).
  //
  // If decline is NOT accelerating AND patient has known age,
  // reduce disease flag confidence.
  // If decline IS accelerating beyond age-expected rates,
  // boost disease flag confidence.
  // ════════════════════════════════════════════════
  if (context.declineProfile?.acceleration) {
    const accel = context.declineProfile.acceleration;
    const acceleratingDomains = Object.entries(accel)
      .filter(([, v]) => v < -0.003); // significant acceleration threshold

    if (acceleratingDomains.length >= 2) {
      // Multiple domains accelerating — strong disease signal
      const leadingAccel = acceleratingDomains.sort(([, a], [, b]) => a - b);
      const leadDomain = leadingAccel[0][0];

      // Boost the most likely disease based on which domains accelerate
      const adDomains = ['lexical', 'semantic', 'syntactic', 'memory'];
      const pdDomains = ['acoustic', 'pd_motor'];
      const ftdDomains = ['pragmatic', 'executive'];
      const lbdDomains = ['executive', 'memory', 'acoustic'];

      if (adDomains.includes(leadDomain)) {
        scores.alzheimer += 0.15;
        evidence.alzheimer.push(
          `Accelerating decline in ${leadDomain} (accel=${leadingAccel[0][1].toFixed(4)}/week²) — disease trajectory, not aging`
        );
      }
      if (pdDomains.includes(leadDomain)) {
        scores.parkinson += 0.15;
        evidence.parkinson.push(
          `Accelerating motor decline in ${leadDomain} — PD progression signal`
        );
      }
      if (ftdDomains.includes(leadDomain)) {
        scores.ftd += 0.15;
        evidence.ftd.push(
          `Accelerating ${leadDomain} decline — FTD progression signal`
        );
      }
      if (lbdDomains.includes(leadDomain)) {
        scores.lbd += 0.10;
        evidence.lbd.push(
          `Accelerating decline in ${leadDomain} — possible LBD progression`
        );
      }
      flags.push('accelerating_decline');
    } else if (acceleratingDomains.length === 0 && context.patientAge) {
      // NO acceleration detected — linear decline is more consistent with aging
      scores.normal_aging += 0.10;
      evidence.normal_aging.push(
        'No acceleration detected in any domain — linear decline consistent with normal aging'
      );
      // Mild dampening of disease scores when there's no acceleration
      for (const condition of ['alzheimer', 'parkinson', 'lbd', 'ftd', 'vci']) {
        if (scores[condition] > 0.10) {
          scores[condition] *= 0.85;
        }
      }
    }
  }

  // ════════════════════════════════════════════════
  // RULE 33: Excess Decline Beyond Age Norms
  // Only flag disease when a domain declines FASTER than
  // the age-expected rate. The excess (observed - expected)
  // is the pathological signal, not the raw decline itself.
  //
  // This prevents an 80-year-old's naturally faster memory
  // decline from being flagged as AD when it matches 80+ norms.
  // ════════════════════════════════════════════════
  if (context.declineProfile?.excess_decline && context.patientAge) {
    const excess = context.declineProfile.excess_decline;
    const significantExcess = Object.entries(excess)
      .filter(([, v]) => v > 0.005); // 0.005/week excess threshold

    if (significantExcess.length === 0) {
      // No domain exceeds age-expected rate — boost normal aging
      scores.normal_aging += 0.20;
      evidence.normal_aging.push(
        `All domain decline rates within age-expected range (${getAgeBand(context.patientAge)} band) — no pathological excess detected`
      );
    } else {
      // Some domains exceed expected rate — map to conditions
      for (const [domain, excessRate] of significantExcess) {
        const excessStr = `${domain} excess: +${(excessRate * 52).toFixed(2)}/year beyond age norms`;
        if (['semantic', 'lexical', 'memory'].includes(domain)) {
          scores.alzheimer += 0.05;
          evidence.alzheimer.push(excessStr);
        }
        if (['acoustic', 'pd_motor'].includes(domain)) {
          scores.parkinson += 0.05;
          evidence.parkinson.push(excessStr);
        }
        if (['pragmatic', 'executive'].includes(domain)) {
          scores.ftd += 0.05;
          evidence.ftd.push(excessStr);
        }
        if (['executive', 'temporal'].includes(domain)) {
          scores.vci += 0.05;
          evidence.vci.push(excessStr);
        }
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  //
  //  V5.2 RULES 34-35 — VASCULAR COGNITIVE IMPAIRMENT (VCI)
  //
  //  VCI is characterized by executive dysfunction + processing speed
  //  decline with relatively preserved episodic memory, and a step-wise
  //  (rather than gradual) decline pattern.
  //
  // ════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════
  // RULE 34: VCI — Executive + Processing Speed + Preserved Memory
  // Executive dysfunction and temporal/fluency decline with relatively
  // preserved episodic memory is the hallmark VCI pattern.
  // ════════════════════════════════════════════════
  const exeDomain = domainScores.executive ?? 0;
  const tmpDomain = domainScores.temporal ?? 0;
  const memDomain = domainScores.memory ?? 0;

  if (exeDomain < -0.4 && tmpDomain < -0.3 && memDomain > -0.25) {
    scores.vci += 0.25;
    evidence.vci.push(
      `Executive dysfunction (${exeDomain.toFixed(2)}) + processing speed decline (${tmpDomain.toFixed(2)}) with preserved memory (${memDomain.toFixed(2)}) — VCI pattern`
    );
  }

  // ════════════════════════════════════════════════
  // RULE 35: VCI — Step-wise Decline + Executive Impairment
  // VCI shows acute drops (vascular events) then plateau, unlike AD's
  // gradual decline. Check timeline for acute_drop pattern combined
  // with executive impairment.
  // ════════════════════════════════════════════════
  if (context.timeline?.length >= 4) {
    const pattern = detectTemporalPattern(context.timeline);
    if (pattern.type === 'acute_drop' && exeDomain < -0.3) {
      scores.vci += 0.20;
      evidence.vci.push(
        `Step-wise decline pattern (acute drop at position ${pattern.drop_at}) with executive impairment — VCI step-wise progression`
      );
    }
  }

  // ════════════════════════════════════════════════
  // NORMALIZE TO PROBABILITIES
  // ════════════════════════════════════════════════
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const probabilities = {};
  if (!Number.isFinite(total) || total <= 0) {
    // Equal probability fallback
    const n = Object.keys(scores).length;
    for (const key of Object.keys(scores)) {
      probabilities[key] = Math.round((1 / n) * 1000) / 1000;
    }
  } else {
    for (const [condition, score] of Object.entries(scores)) {
      probabilities[condition] = Math.round((score / total) * 1000) / 1000;
    }
    // Ensure probabilities sum to exactly 1.0
    const probSum = Object.values(probabilities).reduce((a, b) => a + b, 0);
    if (probSum !== 1.0 && probSum > 0) {
      const largest = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0][0];
      probabilities[largest] = Math.round((probabilities[largest] + (1.0 - probSum)) * 1000) / 1000;
    }
  }

  // Primary hypothesis
  const sorted = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0][0];
  const secondary = sorted[1][0];

  // Confidence: how decisive is the distribution?
  const confidence = Math.min(sorted[0][1] / (sorted[1][1] || 0.01) * 0.3, 0.95);

  // ════════════════════════════════════════════════
  // V5.2: INDEPENDENT (NON-ZERO-SUM) PROBABILITIES
  // Sigmoid-mapped per-condition 0-1 scores that can overlap.
  // Unlike zero-sum probabilities, multiple conditions can be
  // simultaneously elevated, enabling mixed pathology detection.
  // ════════════════════════════════════════════════
  const independentProbabilities = {};
  const diseaseConditions = ['alzheimer', 'depression', 'parkinson', 'lbd', 'ftd', 'msa', 'psp', 'vci'];
  for (const [condition, rawScore] of Object.entries(scores)) {
    // Sigmoid: maps raw accumulated score to 0-1 independently per condition.
    // Center at 0.25 (typical activation threshold), steepness 6.
    independentProbabilities[condition] = Math.round(
      (1 / (1 + Math.exp(-6 * (rawScore - 0.25)))) * 1000
    ) / 1000;
  }

  // Detect mixed pathology: 2+ disease conditions above 0.3
  const elevatedConditions = diseaseConditions.filter(
    c => independentProbabilities[c] > 0.3
  );
  const mixedPathology = elevatedConditions.length >= 2;

  return {
    probabilities,
    primary_hypothesis: primary,
    secondary_hypothesis: secondary,
    confidence: Math.round(confidence * 100) / 100,
    evidence,
    flags,
    rules_fired: Object.values(evidence).flat().length,
    recommendation: generateRecommendation(primary, secondary, confidence, evidence),
    // V5.2 independent probabilities
    independent_probabilities: independentProbabilities,
    mixed_pathology: mixedPathology,
    elevated_conditions: elevatedConditions,
  };
}

// ════════════════════════════════════════════════════════════════
// TEMPORAL PATTERN DETECTION
// ════════════════════════════════════════════════════════════════

/**
 * Detect longitudinal pattern type from session timeline.
 *
 * @param {Array} timeline — array of { composite, ... } session records
 * @returns {Object} { type, ... } pattern descriptor
 */
function detectTemporalPattern(timeline) {
  if (!timeline || timeline.length < 4) return { type: 'insufficient_data' };

  const composites = timeline.map(t => t.composite ?? 0);
  const n = composites.length;

  // Check for monotonic decline (AD)
  let declineCount = 0;
  for (let i = 1; i < n; i++) {
    if (composites[i] < composites[i - 1] - 0.05) declineCount++;
  }
  if (declineCount >= n * 0.6) {
    return { type: 'monotonic_decline', weeks: n, decline_ratio: declineCount / (n - 1) };
  }

  // Check for episodic pattern (depression)
  let directionChanges = 0;
  for (let i = 2; i < n; i++) {
    const prev = composites[i - 1] - composites[i - 2];
    const curr = composites[i] - composites[i - 1];
    if ((prev > 0.1 && curr < -0.1) || (prev < -0.1 && curr > 0.1)) {
      directionChanges++;
    }
  }
  if (directionChanges >= 2) {
    return { type: 'episodic', oscillations: directionChanges };
  }

  // Check for acute drop (medication)
  for (let i = 1; i < n; i++) {
    if (composites[i] - composites[i - 1] < -0.5) {
      return { type: 'acute_drop', drop_at: i, magnitude: composites[i] - composites[i - 1] };
    }
  }

  // Otherwise: stable (normal aging)
  const mean = composites.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(composites.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  if (std < 0.15) {
    return { type: 'stable', mean, std };
  }

  return { type: 'unclear', composites };
}

// ════════════════════════════════════════════════════════════════
// AD CASCADE DETECTION
// ════════════════════════════════════════════════════════════════

/**
 * Detect the Alzheimer's domain cascade pattern.
 * AD degrades domains in order: semantic/lexical -> syntactic -> temporal.
 *
 * @param {Object} domainScores — per-domain z-scores
 * @returns {Object} { detected, stage, confidence, order_preserved, scores }
 */
function detectADCascade(domainScores) {
  const lex = domainScores.lexical ?? 0;
  const sem = domainScores.semantic ?? 0;
  const syn = domainScores.syntactic ?? 0;
  const tmp = domainScores.temporal ?? 0;

  // Stage 1: Semantic+lexical both declining
  const stage1 = lex < -0.5 && sem < -0.5;

  // Stage 2: Syntactic added
  const stage2 = stage1 && syn < -0.5;

  // Stage 3: Discourse collapse
  const stage3 = stage2 && tmp < -0.5;

  // Cascade must follow order: semantic > syntactic > temporal
  // If syntactic is worse than semantic, it's NOT a cascade
  const orderPreserved = Math.abs(sem) >= Math.abs(syn) * 0.8;

  if (!stage1) return { detected: false };

  const stage = stage3 ? 3 : stage2 ? 2 : 1;
  const confidence = orderPreserved ? 0.8 : 0.4;

  return {
    detected: true,
    stage,
    confidence,
    order_preserved: orderPreserved,
    scores: { lexical: lex, semantic: sem, syntactic: syn, temporal: tmp }
  };
}

// ════════════════════════════════════════════════════════════════
// LBD PATTERN DETECTION (V5)
// ════════════════════════════════════════════════════════════════

/**
 * Detect Lewy Body Dementia pattern from domain scores and z-scores.
 *
 * LBD is characterized by:
 *   - Day-to-day fluctuation in cognitive performance
 *   - PD-like motor features (parkinsonism)
 *   - Concurrent cognitive decline (unlike pure PD where cognitive is spared early)
 *   - Visual hallucinations (not captured by speech — noted for completeness)
 *   - REM sleep behavior disorder (overlap with prodromal PD)
 *
 * @param {Object} domainScores — per-domain z-scores
 * @param {Object} zScores — per-indicator z-scores
 * @param {Object} context — session context (timeline for variability)
 * @returns {Object} { detected, confidence, features, differentials }
 */
export function detectLBDPattern(domainScores, zScores, context = {}) {
  const features = [];
  let score = 0;

  // Feature 1: Fluctuating cognition (high variability)
  const variability = zScores.TMP_VARIABILITY;
  if (variability != null && variability < -0.8) {
    features.push('fluctuating_cognition');
    score += 0.3;
  }

  // Feature 2: PD motor features
  const pdMotor = domainScores.pd_motor ?? 0;
  const acoustic = domainScores.acoustic ?? 0;
  const hasPDMotor = pdMotor < -0.3 || acoustic < -0.3;
  if (hasPDMotor) {
    features.push('parkinsonism');
    score += 0.25;
  }

  // Feature 3: Concurrent cognitive decline
  const semantic = domainScores.semantic ?? 0;
  const memory = domainScores.memory ?? 0;
  const hasCognitive = semantic < -0.3 || memory < -0.3;
  if (hasCognitive) {
    features.push('cognitive_decline');
    score += 0.25;
  }

  // Feature 4: Temporal pattern shows high day-to-day variance
  if (context.timeline?.length >= 4) {
    const composites = context.timeline.map(t => t.composite ?? 0);
    const mean = composites.reduce((a, b) => a + b, 0) / composites.length;
    const std = Math.sqrt(composites.reduce((a, b) => a + (b - mean) ** 2, 0) / composites.length);
    if (std > 0.25) {
      features.push('high_session_variance');
      score += 0.2;
    }
  }

  // Differential: LBD vs PD vs AD
  const differentials = {};
  if (hasPDMotor && hasCognitive) {
    differentials.vs_pd = 'Concurrent motor + cognitive decline favors LBD over pure PD';
  }
  if (features.includes('fluctuating_cognition')) {
    differentials.vs_ad = 'Fluctuating cognition favors LBD over AD (AD shows monotonic decline)';
  }

  const confidence = Math.min(score, 0.95);
  const detected = features.length >= 2 && score >= 0.4;

  return {
    detected,
    confidence: Math.round(confidence * 100) / 100,
    features,
    differentials,
    score: Math.round(score * 100) / 100
  };
}

// ════════════════════════════════════════════════════════════════
// FTD PATTERN DETECTION (V5)
// ════════════════════════════════════════════════════════════════

/**
 * Detect Frontotemporal Dementia pattern from domain scores and z-scores.
 *
 * FTD variants:
 *   - Behavioral variant (bvFTD): pragmatic/social collapse, preserved memory
 *   - Semantic variant (svPPA): word-finding deficits, preserved syntax
 *   - Non-fluent variant (nfvPPA): agrammatism, effortful speech (overlap with PSP)
 *
 * @param {Object} domainScores — per-domain z-scores
 * @param {Object} zScores — per-indicator z-scores
 * @returns {Object} { detected, variant, confidence, features, differentials }
 */
export function detectFTDPattern(domainScores, zScores) {
  const features = [];
  let score = 0;
  let variant = null;

  // Check behavioral variant: pragmatic collapse + preserved memory
  const pragmaticIds = ['PRA_INDIRECT_SPEECH', 'PRA_DISCOURSE_MARKERS', 'PRA_REGISTER_SHIFT',
                         'PRA_NARRATIVE_STRUCTURE', 'PRA_PERSPECTIVE_TAKING', 'PRA_HUMOR_IRONY'];
  const pragmaticZ = pragmaticIds.map(id => zScores[id]).filter(v => v != null);
  const pragmaticMean = pragmaticZ.length > 0 ? pragmaticZ.reduce((a, b) => a + b, 0) / pragmaticZ.length : null;
  const memoryPreserved = (domainScores.memory ?? 0) > -0.3;

  if (pragmaticMean != null && pragmaticMean < -0.6 && memoryPreserved) {
    features.push('pragmatic_collapse');
    features.push('memory_preserved');
    score += 0.4;
    variant = 'behavioral';
  }

  // Check semantic variant: severe word-finding deficit + preserved syntax
  const wordFreq = zScores.LEX_WORD_FREQ;
  const syntaxPreserved = (domainScores.syntactic ?? 0) > -0.2;

  if (wordFreq != null && wordFreq < -0.8 && syntaxPreserved) {
    features.push('severe_word_finding_deficit');
    features.push('syntax_preserved');
    score += 0.35;
    variant = variant ? 'mixed' : 'semantic';
  }

  // Check executive dysfunction (supports FTD-bv)
  const executiveIds = ['EXE_TASK_SWITCHING', 'EXE_INHIBITION', 'EXE_PLANNING',
                         'EXE_DUAL_TASK', 'EXE_COGNITIVE_FLEXIBILITY'];
  const executiveZ = executiveIds.map(id => zScores[id]).filter(v => v != null);
  const executiveMean = executiveZ.length > 0 ? executiveZ.reduce((a, b) => a + b, 0) / executiveZ.length : null;

  if (executiveMean != null && executiveMean < -0.5) {
    features.push('executive_dysfunction');
    score += 0.2;
  }

  // Check non-fluent variant indicators: agrammatism with effortful speech
  const syntactic = domainScores.syntactic ?? 0;
  const temporal = domainScores.temporal ?? 0;
  if (syntactic < -0.6 && temporal < -0.5 && memoryPreserved) {
    features.push('agrammatism');
    features.push('effortful_speech');
    score += 0.3;
    variant = variant ? 'mixed' : 'nonfluent';
  }

  // Differentials
  const differentials = {};
  if (memoryPreserved && pragmaticMean != null && pragmaticMean < -0.6) {
    differentials.vs_ad = 'Preserved memory with pragmatic collapse favors FTD over AD';
  }
  if (syntaxPreserved && wordFreq != null && wordFreq < -0.8) {
    differentials.vs_ad = 'Preserved syntax with naming failure favors FTD-semantic over AD';
  }

  const confidence = Math.min(score, 0.95);
  const detected = features.length >= 2 && score >= 0.3;

  return {
    detected,
    variant,
    confidence: Math.round(confidence * 100) / 100,
    features,
    differentials,
    score: Math.round(score * 100) / 100
  };
}

// ════════════════════════════════════════════════════════════════
// RECOMMENDATION GENERATION
// ════════════════════════════════════════════════════════════════

/**
 * Generate clinical recommendations based on differential results.
 * Extended for V5 with LBD and FTD recommendations.
 *
 * @param {string} primary — primary hypothesis condition key
 * @param {string} secondary — secondary hypothesis condition key
 * @param {number} confidence — confidence ratio (0-0.95)
 * @param {Object} evidence — per-condition evidence arrays
 * @returns {Array<string>} recommendation strings
 */
function generateRecommendation(primary, secondary, confidence, evidence) {
  const recs = [];

  if (primary === 'normal_aging' && confidence > 0.5) {
    recs.push('Continue standard monitoring. No concerns at this time.');
  } else if (primary === 'alzheimer') {
    recs.push('Pattern consistent with early cognitive decline. Recommend cognitive screening.');
    if (confidence < 0.6) recs.push(`Also consider ${secondary} (close probability). Monitor 2 more weeks.`);
  } else if (primary === 'depression') {
    recs.push('Pattern suggests depression rather than cognitive decline. Recommend mood screening.');
    recs.push('Do NOT escalate to AD-specific referral until depression is ruled out.');
  } else if (primary === 'parkinson') {
    recs.push('Fluency-dominant pattern suggests motor speech involvement. Recommend neurological evaluation.');
    if (secondary === 'msa' || secondary === 'psp') {
      recs.push(`Atypical parkinsonism (${secondary.toUpperCase()}) features present. Consider DaTscan and specialist referral.`);
    }
  } else if (primary === 'medication') {
    recs.push('Changes correlate with medication timing. Recommend pharmacist review.');
    recs.push('Defer cognitive concern until medication adjustment period (2-3 weeks).');
  } else if (primary === 'grief') {
    recs.push('Changes appear event-linked. Monitor for recovery over 4-8 weeks.');
    recs.push('If patterns persist beyond 3 months, consider depression screening.');
  } else if (primary === 'msa') {
    recs.push('Vocal tremor and articulatory pattern suggest Multiple System Atrophy (MSA).');
    recs.push('Recommend DaTscan, autonomic function testing, and movement disorder specialist referral.');
    recs.push('Monitor for orthostatic hypotension and cerebellar signs.');
  } else if (primary === 'psp') {
    recs.push('Stuttering-like behavior with articulatory decay suggests Progressive Supranuclear Palsy (PSP).');
    recs.push('Recommend MRI (midbrain atrophy), oculomotor exam, and movement disorder specialist.');
    recs.push('Distinguish from corticobasal degeneration (CBD) with apraxia assessment.');
  } else if (primary === 'lbd') {
    recs.push('Fluctuating cognition with motor features suggests Lewy Body Dementia (LBD).');
    recs.push('Recommend DaTscan, sleep study (RBD screening), and cognitive fluctuation questionnaire.');
    recs.push('CAUTION: Neuroleptic sensitivity — avoid typical antipsychotics.');
    if (secondary === 'parkinson') {
      recs.push('Distinguish from PD-dementia by timing: LBD cognitive onset within 1 year of motor symptoms.');
    }
  } else if (primary === 'ftd') {
    recs.push('Pragmatic/semantic pattern suggests Frontotemporal Dementia (FTD).');
    recs.push('Recommend frontal/temporal MRI, neuropsychological battery (executive + social cognition), and genetic counseling.');
    if (evidence.ftd?.some(e => e.includes('behavioral'))) {
      recs.push('Behavioral variant suspected — assess for disinhibition, apathy, and loss of empathy.');
    }
    if (evidence.ftd?.some(e => e.includes('semantic'))) {
      recs.push('Semantic variant suspected — assess confrontation naming (Boston Naming Test) and word comprehension.');
    }
  } else if (primary === 'vci') {
    recs.push('Executive dysfunction with preserved memory and step-wise decline suggests Vascular Cognitive Impairment (VCI).');
    recs.push('Recommend brain MRI (white matter hyperintensities), vascular risk factor assessment, and neuropsychological battery.');
    recs.push('Manage vascular risk factors (hypertension, diabetes, hyperlipidemia) to slow progression.');
    if (secondary === 'alzheimer') {
      recs.push('Mixed VCI+AD pathology is common — consider amyloid PET to evaluate AD co-pathology.');
    }
  }

  // Cross-condition advisories
  if (primary !== 'normal_aging' && primary !== 'medication' && primary !== 'grief') {
    if (evidence.parkinson?.length > 0 && evidence.depression?.length > 0) {
      recs.push('Note: Both motor speech and affective markers present. Consider comorbid PD+depression.');
    }
    if (evidence.lbd?.length > 0 && evidence.alzheimer?.length > 0) {
      recs.push('Note: Both LBD and AD features present. Mixed pathology is common — consider amyloid PET.');
    }
  }

  return recs;
}

// ════════════════════════════════════════════════════════════════
// EXPORTS — for testing and composition
// ════════════════════════════════════════════════════════════════

export {
  detectTemporalPattern,
  detectADCascade,
  generateRecommendation
};
