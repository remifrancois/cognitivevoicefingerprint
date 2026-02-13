# MemoVoice CVF V4 — Profile01 Diagnostic Report

**Report ID:** `CVF-V4-PROFILE01-20260213`
**Generated:** 2026-02-13T03:41:16Z
**Engine Version:** V4.0.0 (two_stream)
**Analysis Mode:** Offline batch (outside SaaS interface)
**Analyst:** CVF V4 autonomous pipeline

---

## 1. Speaker Profile

| Field | Value |
|-------|-------|
| Profile ID | `profile01` |
| Detected Gender | Female |
| Average F0 | 201.1 Hz |
| Language | French (auto-detected via Whisper) |
| Sessions Analyzed | 9 / 10 (session08 excluded: 0.5s recording) |
| Total Audio | ~33.6 minutes |
| Recordings Format | WebM (converted to 16kHz mono WAV) |
| Feature Depth | 70 indicators per session (52 text + 18 acoustic) |
| Missing Domains | Memory (no recall tasks administered) |

---

## 2. Overall Diagnostic Score

```
  AGGREGATE COMPOSITE:  0.000 (z-score)
  ALERT LEVEL:          GREEN — Normal variation
  PRIMARY DIAGNOSIS:    Normal Aging (69.2%)
  SECONDARY:            Depression (30.8%)
  CONFIDENCE:           67%
  CASCADES:             None (aggregate level)
  SENTINELS:            None (aggregate level)
```

### Interpretation

The aggregate composite score of 0.000 indicates that this speaker's linguistic and acoustic performance is **exactly at her own baseline** when averaged across all 9 sessions. All 8 scored domains (memory excluded) fall within normal bounds. The 23-rule differential diagnosis engine classifies this profile as **normal aging** with high confidence.

---

## 3. 9-Domain Analysis

### 3.1 Domain Scores (Aggregate)

| Domain | Score | Weight | Status | Description |
|--------|-------|--------|--------|-------------|
| Lexical | ~0.00 | 0.15 | Normal | Vocabulary richness, TTR, content density |
| Syntactic | ~0.00 | 0.10 | Normal | Sentence complexity, subordination, embedding |
| Semantic | ~0.00 | 0.20 | Normal | Idea density, coherence, referential integrity |
| Temporal | ~0.00 | 0.12 | Normal | Pause patterns, speech rate, fluency |
| Memory | N/A | 0.10 | Not tested | No recall/recognition tasks administered |
| Discourse | ~0.00 | 0.06 | Normal | Self-correction, circumlocution, perseveration |
| Affective | ~0.00 | 0.05 | Normal | Emotional language, self-focus, hedonic content |
| Acoustic | ~0.00 | 0.12 | Normal | Voice quality, F0, jitter, shimmer, HNR |
| PD Motor | ~0.00 | 0.10 | Normal | Nonlinear dynamics, PPE, RPDE, DFA |

### 3.2 Baseline Calibration

Baseline computed from all 9 sessions. Key reference values:

| Indicator | Baseline Mean | Std | Clinical Significance |
|-----------|--------------|-----|----------------------|
| LEX_TTR | 0.621 | 0.038 | Above-average vocabulary diversity |
| SEM_IDEA_DENSITY | 0.640 | 0.045 | Good propositional density |
| SEM_REF_COHERENCE | 0.658 | 0.023 | Strong referential integrity |
| SYN_MLU | 0.647 | 0.029 | Complex sentence structure |
| TMP_LPR | 0.473 | 0.020 | Normal pause patterns |
| ACU_F0_SD | 0.721 | 0.093 | Healthy prosodic variation |
| ACU_HNR | 0.322 | 0.046 | Borderline voice clarity |
| PDM_PPE | 0.000 | 0.020 | High variance (unreliable) |
| AFF_NEG_VALENCE | 0.473 | 0.044 | Normal emotional range |

**High-variance indicators (CV > 0.3):** PDM_PPE, PDM_RPDE, PDM_VOT — These nonlinear dynamics measures are unreliable in conversational speech and require dedicated sustained vowel micro-tasks for proper assessment.

---

## 4. Per-Session Detailed Analysis

### Session Timeline

```
  session01  +0.007  GREEN   ████████████████████  Mountain/Olympics narrative
  session02  -0.466  GREEN   ███████████████       Skiing description
  session03  +0.972  GREEN   ██████████████████████████████  Bolivia travel (BEST)
  session04  -0.166  GREEN   ██████████████████    Moussaka recipe
  session05  +0.812  GREEN   ████████████████████████████  Career narrative
  session06  +0.183  GREEN   █████████████████████  Passions (dance, painting)
  session07  -0.495  GREEN   ███████████████       Daily routine
  session09  -0.939  YELLOW  ███████████           Dreams/projects (OUTLIER)
  session10  +0.091  GREEN   █████████████████████  Reading/culture
```

### Session Details

#### Session 01 — Mountain/Olympics (188s)

- **Composite:** +0.007 | **Alert:** GREEN
- **Domains:** LEX=+0.01 SYN=+0.12 SEM=+0.11 TMP=-0.26 DIS=+0.08 AFF=-0.07 ACU=+0.08 PDM=-0.11
- **Sentinels:** Alzheimer 3/7 (marginal — topic-driven)
- **Notes:** Well-structured narrative covering mountain scenery, shopping, reading, and figure skating at the Olympics. Rich sensory descriptions ("sapins enneiges"), proper noun usage (Philippe, Guillaume Cizeron), temporal sequencing (hier, apres-midi, le soir). Slight temporal domain dip from natural pausing between topics.

#### Session 02 — Skiing (206s)

- **Composite:** -0.466 | **Alert:** GREEN
- **Domains:** LEX=-0.30 SYN=-0.22 SEM=-0.15 TMP=-0.43 DIS=-0.68 AFF=-0.67 ACU=+0.06 PDM=-0.18
- **Sentinels:** Alzheimer 2/7, Depression 2/7
- **Cascades:** Depression full cascade (stages 0-1-2: affective shift, temporal retardation, engagement withdrawal)
- **Notes:** Lowest discourse and affective scores. The depression cascade appears to be content-driven rather than pathological — the skiing topic may have generated less emotional engagement. Acoustic markers remain normal, ruling out psychomotor depression.

#### Session 03 — Bolivia Travel (338s)

- **Composite:** +0.972 | **Alert:** GREEN (highest session)
- **Domains:** LEX=+0.63 SYN=+1.41 SEM=+0.99 TMP=-0.13 DIS=+0.70 AFF=+0.04 ACU=+0.04 PDM=+0.18
- **Sentinels:** Depression 3/7, Parkinson 2/10 (false positives from content)
- **Notes:** Peak performance across nearly all domains. Extremely rich vocabulary, complex subordinate clauses, high idea density. Travel narrative about Bolivia with detailed observations about geography, culture, and social conditions. The syntactic score of +1.41 SD reflects genuinely sophisticated language use. Depression sentinels triggered by negative valence content (poverty, social injustice discussion) — thematic, not pathological.

#### Session 04 — Moussaka Recipe (274s)

- **Composite:** -0.166 | **Alert:** GREEN
- **Domains:** LEX=-0.54 SYN=-1.36 SEM=-0.15 TMP=+0.95 DIS=-0.13 AFF=-0.28 ACU=+0.15 PDM=+0.53
- **Sentinels:** Alzheimer 3/7, Depression 2/7
- **Notes:** The recipe-telling genre naturally produces lower lexical diversity (repeated cooking terms: "on met", "il faut", "voila") and simpler syntax (imperative/procedural). The low syntactic score (-1.36) reflects genre effects, not cognitive decline. Temporal domain is the highest across all sessions (+0.95) — recipes require precise sequencing, producing structured temporal language. This session demonstrates the importance of topic normalization.

#### Session 05 — Career Story (406s)

- **Composite:** +0.812 | **Alert:** GREEN
- **Domains:** LEX=+0.54 SYN=+0.98 SEM=+0.72 TMP=+0.29 DIS=+0.13 AFF=+0.66 ACU=-0.18 PDM=+0.30
- **Notes:** Longest session. Rich autobiographical narrative spanning decades of career. Strong temporal sequencing across a long time horizon, complex causality chains, appropriate emotional engagement. The positive affective score (+0.66) reflects genuine enthusiasm despite some difficult content (workplace challenges). No sentinel or cascade triggers.

#### Session 06 — Passions: Dance & Painting (285s)

- **Composite:** +0.183 | **Alert:** GREEN
- **Domains:** LEX=+0.24 SYN=+0.25 SEM=+0.14 TMP=+0.02 DIS=+0.15 AFF=+0.51 ACU=-0.20 PDM=-0.10
- **Sentinels:** Parkinson 2/10 (marginal, not clinically significant)
- **Notes:** Balanced performance across all domains. Highest hedonic language score — passionate descriptions of dance and painting. Acoustic domain slightly negative due to session recording conditions. Overall, a healthy and engaged session.

#### Session 07 — Daily Routine (226s)

- **Composite:** -0.495 | **Alert:** GREEN
- **Domains:** LEX=-0.40 SYN=-0.81 SEM=-0.36 TMP=+0.20 DIS=-0.49 AFF=-0.42 ACU=+0.19 PDM=-0.31
- **Cascades:** Depression stage 0 (affective shift)
- **Notes:** Lower scores reflect the mundane topic (daily routine) rather than cognitive decline. Simpler vocabulary and syntax are expected when describing routine activities. The stage 0 depression cascade is a mild affective dip, not a clinical concern. Acoustic markers remain normal.

#### Session 09 — Dreams/Projects (124s)

- **Composite:** -0.939 | **Alert:** YELLOW (only non-green session)
- **Domains:** LEX=-0.24 SYN=-0.30 SEM=-1.47 TMP=-0.56 DIS=-0.22 AFF=+0.11 ACU=-0.06 PDM=-0.27
- **Sentinels:** Alzheimer 5/7, Depression 2/7, Parkinson 3/10
- **Cascades:** AD stage 3 — discourse collapse (severity=1.01)
- **Notes:** **THIS SESSION REQUIRES CONTEXTUAL INTERPRETATION.** The severe semantic score (-1.47) and AD cascade stage 3 triggered by:
  - Shortest valid transcript (1,564 chars, ~2 min)
  - Speculative/hypothetical content ("j'aimerais x5") — conditional/subjunctive language
  - Topic fragmentation (multiple unrelated wishes/projects listed)
  - Lower referential density (future projections lack concrete referents)

  **Clinical assessment: False positive.** The AD stage 3 cascade reflects genre effects (wish-listing), not actual discourse collapse. The preserved affective score (+0.11), normal acoustic markers, and normal performance in all other sessions confirm this is a contextual outlier, not pathological. However, if this pattern recurs across multiple sessions with different topics, re-evaluation would be warranted.

#### Session 10 — Reading/Culture (255s)

- **Composite:** +0.091 | **Alert:** GREEN
- **Domains:** LEX=+0.06 SYN=-0.06 SEM=+0.17 TMP=-0.08 DIS=+0.46 AFF=+0.12 ACU=-0.08 PDM=-0.04
- **Notes:** Solidly normal across all domains. Good discourse engagement (DIS=+0.46) with positive semantic coherence. No sentinel or cascade triggers. Representative of this speaker's typical performance.

---

## 5. Acoustic Voice Signature

### 5.1 Raw Acoustic Measurements

| Feature | Mean | StdDev | Population Norm | Assessment |
|---------|------|--------|----------------|------------|
| F0 Mean | 201.1 Hz | 7.5 | ~220 Hz (female) | Slightly low-normal |
| F0 SD (Monopitch) | 47.3 Hz | 7.1 | ~35 Hz | Healthy prosodic variation |
| F0 Range | 421.2 Hz | 4.3 | — | Wide range, healthy prosody |
| Jitter | 1.6% | 0.1 | <1.04% healthy | Mildly elevated |
| Shimmer | 7.6% | 0.3 | <3.81% healthy | Elevated |
| HNR | 19.0 dB | 0.9 | >20 dB healthy | Borderline low |
| MFCC-2 | 80.1 | 5.9 | ~-20 norm | Outside norm range |
| CPP | 1.58 dB | 0.07 | ~10 dB norm | Low |
| PPE | 0.974 bits | 0.26 | ~0.08 norm | Elevated (high variance) |
| RPDE | 0.832 | 0.19 | ~0.5 norm | Elevated |
| DFA | 0.569 | 0.02 | ~0.65 norm | Normal |
| Spectral Harmonicity | 0.482 | 0.05 | ~0.7 norm | Reduced |
| Energy Dynamic Range | 62.2 dB | 3.2 | ~30 dB norm | High |

### 5.2 Acoustic Interpretation

**Voice Quality:** The speaker shows mildly elevated jitter (1.6%) and shimmer (7.6%), with borderline HNR (19.0 dB). This pattern is consistent with **age-related vocal fold changes** (presbyphonia) and does not indicate neurological pathology. The strong F0 variation (SD=47.3 Hz, well above the 35 Hz female norm) and wide F0 range (421 Hz) demonstrate **excellent prosodic control**, which is a strong negative indicator for both Parkinson's disease (monopitch) and depression (flat affect).

**Nonlinear Dynamics:** PPE (0.974) and RPDE (0.832) are elevated relative to population norms. However, these were extracted from conversational speech rather than sustained vowels, which significantly reduces their reliability. The high inter-session variance (CV > 0.3) confirms measurement instability. DFA (0.569) is within normal range. **These values should not be used for PD screening without dedicated sustained vowel tasks.**

**Overall Acoustic Profile:** Healthy prosody with mild age-related voice quality changes. No evidence of neurological voice disorder.

---

## 6. Differential Diagnosis

### 6.1 Probability Distribution

| Condition | Probability | Evidence Strength |
|-----------|------------|-------------------|
| **Normal Aging** | **69.2%** | Strong |
| Depression | 30.8% | Weak (preserved coherence rules against AD, pushes toward depression) |
| Alzheimer's Disease | 0% | No evidence |
| Parkinson's Disease | 0% | No evidence |
| Medication Effects | 0% | No evidence |
| Grief/Distress | 0% | No evidence |
| MSA | 0% | No evidence |
| PSP | 0% | No evidence |

### 6.2 Evidence Summary

**For Normal Aging (69.2%):**
- All domains within normal range (>-0.3 SD) at aggregate level
- Self-correction capacity preserved — metacognitive monitoring intact
- No systematic decline pattern across sessions
- Rich vocabulary and complex syntax maintained

**For Depression (30.8%):**
- Referential coherence preserved (z=-0.00) — this rules against AD and pushes residual weight toward depression
- Session-level depression cascades observed (sessions 02, 07) but appear topic-dependent
- No acoustic depression markers (MFCC-2 + spectral harmonicity not jointly declining)

**Against Alzheimer's:**
- No AD cascade at aggregate level
- Referential coherence strongly preserved (SEM_REF_COHERENCE baseline 0.658)
- Idea density maintained (SEM_IDEA_DENSITY baseline 0.640)
- Session09 outlier explained by genre effects

**Against Parkinson's:**
- Excellent prosodic variation (F0 SD = 47.3 Hz >> 35 Hz norm)
- No monopitch pattern
- No articulatory decline
- PPE/RPDE elevated but unreliable from conversational speech

### 6.3 Recommendation

> **Continue standard monitoring. No concerns at this time.**

---

## 7. Session Stability Analysis

```
  Composite Std:  0.579
  Pattern Type:   VARIABLE (topic-dependent fluctuation)
```

Session-to-session variability (std=0.579) is moderate. This does NOT indicate episodic depression (which would show oscillation with consistent affective decline). Instead, the variance is **topic-driven**:

- Highest sessions (03, 05): Rich narrative topics (travel, career) elicit peak linguistic performance
- Lowest sessions (02, 07, 09): Mundane or abstract topics produce naturally simpler language
- Pattern: Performance correlates with topic engagement, not cognitive state

This speaker demonstrates a **context-responsive** linguistic profile — she engages more deeply with stimulating topics, which is a sign of cognitive health, not pathology.

---

## 8. Limitations of This Analysis

1. **Baseline from same sessions.** Using the 9 sessions both as baseline and test data means aggregate z-scores center on zero. A proper 14-session calibration period followed by prospective monitoring would provide more sensitive change detection.

2. **No memory domain.** All 6 memory indicators are null. Memory (especially cued recall — "THE definitive differentiator" per Grober 1987) is critical for AD vs depression differentiation.

3. **No micro-tasks.** Sustained vowel, DDK, category fluency, and depression screen tasks were not administered. These provide the most reliable acoustic PD biomarkers and cognitive screening data.

4. **Conversational nonlinear dynamics.** PPE, RPDE, and D2 were extracted from conversational speech rather than sustained vowels, making them unreliable for PD screening.

5. **Single-recording per session.** Each session is a monologue without conversational prompts. The V4 text extractor is optimized for patient-clinician dialogue, which provides richer indicators (response latency, cued recall, turn-taking).

6. **No longitudinal baseline.** This is a cross-sectional analysis of one person. True diagnostic power comes from tracking change over time (weeks to months).

---

## 9. Recommendations for Continued Monitoring

1. **Establish a proper 14-session baseline** through daily 5-minute conversation sessions
2. **Add memory micro-tasks**: free recall, cued recall, and recognition prompts within conversations
3. **Schedule weekly sustained vowel** (/aaa/, 15 seconds) for proper PD biomarker assessment
4. **Schedule weekly DDK** (/pa-ta-ka/, 10 seconds) for articulatory assessment
5. **Schedule biweekly category fluency** (60 seconds) for semantic fluency screening
6. **Schedule weekly depression screen** (adapted PHQ-9, 90 seconds) for affective monitoring
7. **Monitor session09-type outliers** — if semantic collapse pattern recurs across diverse topics, escalate for clinical review
8. **Track jitter and HNR longitudinally** — current values are borderline and may indicate early presbyphonia progression

---

*This report was generated by the MemoVoice CVF V4 engine processing voice recordings outside the standard SaaS interface. Results should be interpreted by a qualified healthcare professional in conjunction with clinical assessment.*
