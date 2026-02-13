# V4 Depression Gap Analysis: What Our V3 Engine Is Missing

**Generated:** 2026-02-11
**Source:** Systematic review of 15 papers in `/Users/code/azh/research/papers/depression/`
**Prepared for:** MemoVoice CVF Engine V4 planning

---

## Executive Summary

Our V3 depression module operates almost entirely in the **text/linguistic domain** with a handful of temporal speech-timing features. After exhaustive review of all 15 depression papers in the research corpus, the gaps are severe and systematic. The literature converges on a clear message: **acoustic and multimodal features substantially outperform text-only approaches for depression detection**, and our engine ignores the majority of validated biomarkers. The most critical gap is the complete absence of an acoustic signal processing pipeline for voice quality features (jitter, shimmer, HNR, MFCCs, formants, spectral energy) that have been validated across dozens of studies with pooled AUC values of 0.89-0.91.

---

## 1. MISSING INDICATORS (Text/Linguistic Domain)

### 1.1 Features Validated in Literature But Absent from V3

| Missing Feature | V3 Status | Evidence Strength | Key Papers |
|---|---|---|---|
| **Death-related words** | NOT TRACKED | Strong - consistently reported across multiple reviews | Mocnik2025 (2012_quatieri2012), Dinkel2020 |
| **Ruminative language** | NOT TRACKED | Strong - repeated finding in depression NLP | Mocnik2025, Dinkel2020 |
| **Passive voice / auxiliaries** | NOT TRACKED | Moderate | Mocnik2025 |
| **Past-oriented terms** ("learned", "remember") | NOT TRACKED | Moderate-Strong | Mocnik2025 |
| **Pain-related words** ("hurt", "tears", "alone") | NOT TRACKED | Moderate | Mocnik2025 |
| **Treatment-related words** ("side effects", "therapy") | NOT TRACKED | Moderate | Mocnik2025 |
| **Low self-esteem / pessimism expressions** | NOT TRACKED | Moderate | Mocnik2025 |
| **Reward-related words** | NOT TRACKED | Moderate | Mocnik2025 |
| **Linguistic stress patterns** (lack of emphasis) | NOT TRACKED | Moderate | Mocnik2025 |
| **Incoherence / repetitiveness measures** | PARTIAL (SEM_IDEA_DENSITY) | Strong | Mocnik2025 |
| **Sentence complexity** (fewer complex sentences, fewer adverbial clauses) | NOT TRACKED (TTR is not the same) | Moderate | Mocnik2025 |
| **Third-person pronoun increase** ("others") | NOT TRACKED (we only track self-referential) | Moderate | Mocnik2025 |
| **Total verbal output reduction** | NOT TRACKED | Strong | Mocnik2025, Dinkel2020 |

### 1.2 Text Embedding Features (Deep NLP)

Dinkel et al. (2020) demonstrated that multi-task text models combining **binary depression detection with PHQ-8 severity regression** achieve macro F1 of 0.84 and MAE of 3.48 on DAIC-WOZ. Key findings NOT in our engine:

- **Sentence-level embeddings** (BERT, ELMo) significantly outperform word-level embeddings for depression detection
- **Multi-task loss functions** combining binary classification + severity regression improve both tasks
- **Attention pooling** over dialogue sequences is superior to mean or last-timestep pooling
- **Pre-training on large corpora** significantly helps sparse clinical data scenarios
- **N-gram analysis** reveals depressed individuals use "I don't know", sighing, and laughter differently

**V4 Recommendation:** Integrate a sentence-level embedding model (e.g., fine-tuned BERT or MPNet) alongside our current lexical features. Add a multi-task prediction head for both binary detection and severity regression.

---

## 2. ACOUSTIC GAP (The Most Critical Deficit)

### 2.1 Overview

Our V3 engine has **ZERO acoustic signal processing capability** for voice quality. We track only text-derived features and basic timing (speech rate, response latency, variability). The literature is unambiguous: acoustic features are among the most powerful and reliable biomarkers for depression.

### 2.2 Cross-Cultural Acoustic Feature Set (Mundt2007 / Le et al.)

Le et al. identified **12 cross-cultural acoustic features** that achieved **AUC = 0.934** (combined), **AUC = 0.993** (Japanese), and **AUC = 0.913** (Vietnamese) using XGBoost with nested cross-validation on n=251 participants:

| Feature Family | Specific Feature | Min Sensitivity | SHAP Importance |
|---|---|---|---|
| **MFCC** | mfcc_sma[2]_minSegLen | 0.936 | 0.069 (highest) |
| **MFCC** | mfcc_sma[1]_minSegLen | 0.883 | 0.039 |
| **AudSpec** | audSpec_Rfilt_sma[17]_minSegLen | 0.954 | 0.042 |
| **AudSpec** | audSpec_Rfilt_sma[15]_minSegLen | 0.926 | 0.023 |
| **AudSpec** | audSpec_Rfilt_sma[20]_minSegLen | 0.920 | 0.027 |
| **PCM** | pcm_fftMag_psySharpness_sma_minSegLen | 0.932 | 0.042 |
| **PCM** | pcm_fftMag_spectralHarmonicity_sma_minSegLen | 0.930 | 0.036 |
| **logHNR** | logHNR_sma_range | 0.845 | 0.035 |
| **Voicing** | voicingFinalUnclipped_sma_lpc0 | 0.799 | 0.006 |
| **F0** | F0final_sma_qregerrQ | 0.700 | 0.005 |
| **Jitter** | jitterDDP_sma_de_lpc4 | 0.722 | 0.001 |
| **Shimmer** | shimmerLocal_sma_risetime | 0.704 | 0.001 |

**Critical finding:** The top features are **spectral/cepstral** (MFCC, AudSpec), NOT prosodic. These reflect **physiological psychomotor changes** (neuromuscular slowing, reduced vocal tract coordination) that transcend language boundaries. F0 and traditional prosodic features ranked LOWEST in cross-cultural importance.

### 2.3 Meta-Analytic Acoustic Performance (Lu et al. / Alghowinem2013)

Lu et al. conducted a meta-analysis of 25 studies (9 TML, 16 DL) with 706,945 speech samples:

| Model Type | Pooled Sensitivity | Pooled Specificity | AUC | DOR |
|---|---|---|---|---|
| **Traditional ML** | 0.82 (0.74-0.88) | 0.83 (0.75-0.90) | 0.89 (0.86-0.92) | 22 |
| **Deep Learning** | 0.83 (0.77-0.88) | 0.86 (0.80-0.90) | 0.91 (0.89-0.93) | 31 |

**Subgroup findings critical for V4:**
- DL models with sample size >= 500: **AUC = 0.93**
- English datasets: **Specificity = 0.90** (vs Chinese 0.81)
- Interview-based speech tasks: **AUC = 0.92** (higher than read speech at 0.83-0.86)
- Grouped validation: **AUC = 0.92-0.93** (vs non-grouped: 0.77-0.91)
- TML models with grouped validation: **AUC = 0.93, Sensitivity = 0.85, Specificity = 0.89**

**Key acoustic features from the meta-analysis:**
- MFCCs (especially MFCC-2)
- Spectrograms
- Zero-crossing rate (ZCR)
- Harmonics-to-noise ratio (HNR)
- Fundamental frequency (F0) statistics
- Jitter and shimmer
- Formant frequencies (F1, F2, F4)
- Spectral energy patterns

### 2.4 Specific Acoustic Biomarkers from Review of Reviews (Mocnik et al.)

Synthesizing 24 systematic/scoping reviews, the following acoustic features are consistently linked to depression:

**Prosodic features (we partially track via TMP_ indicators):**
- Reduced pitch (F0) -- NOT directly measured
- Reduced pitch range / variability -- NOT directly measured
- Reduced loudness -- NOT measured
- Monotonous speech (reduced F0 range) -- NOT measured
- Lack of linguistic stress -- NOT measured

**Voice quality features (COMPLETELY ABSENT from V3):**
- Increased jitter (frequency perturbation)
- Increased shimmer (amplitude perturbation)
- Altered HNR (harmonics-to-noise ratio)
- Breathy voice quality
- Unclear articulation

**Spectral features (COMPLETELY ABSENT from V3):**
- MFCC alterations (especially MFCC-2)
- Altered formant frequencies (F2 decreases in depression)
- Spectral energy pattern changes
- Auditory spectrum (AudSpec) changes
- Psychoacoustic sharpness changes

### 2.5 Recommended Acoustic Pipeline for V4

Based on the converging evidence, V4 should implement extraction of these features using openSMILE (eGeMAPS configuration) or equivalent:

**Tier 1 (Highest evidence, implement first):**
1. MFCC 1-13 with deltas and double-deltas
2. F0 mean, range, variability, regression error
3. Jitter (local, DDP)
4. Shimmer (local)
5. HNR (log, range)
6. Spectral harmonicity
7. Psychoacoustic sharpness

**Tier 2 (Strong evidence):**
8. Auditory spectrum (AudSpec) bands
9. Formant frequencies (F1, F2)
10. Voicing probability
11. Zero-crossing rate
12. Spectral energy distribution

**Tier 3 (Emerging evidence):**
13. Wav2Vec 2.0 / HuBERT self-supervised embeddings
14. Deep Spectrum features (CNN on mel-spectrograms)

---

## 3. METHODOLOGY GAPS

### 3.1 Our V3 Approach vs. Literature Best Practices

| Aspect | V3 Current | Literature Best Practice | Gap Severity |
|---|---|---|---|
| **Modality** | Text only + basic timing | Multimodal (text + audio + video) | CRITICAL |
| **Feature extraction** | Rule-based lexical | openSMILE eGeMAPS + DL embeddings | CRITICAL |
| **Depression scoring** | Categorical thresholds | Continuous PHQ-8/PHQ-9 regression + binary | HIGH |
| **Validation** | Unknown | Nested cross-validation, leave-one-subject-out | HIGH |
| **Cross-lingual** | Not tested | Cross-cultural validation required | MODERATE |
| **Response quality** | Not assessed | Quality scoring before prediction | MODERATE |

### 3.2 Single-Question Multimodal Assessment (Grimm et al. / Scherer2014)

Grimm et al. (npj Digital Medicine, 2026) demonstrated a breakthrough approach:

- **Single open-ended question** predicts PHQ-9, GAD-7, and PCL-5 simultaneously
- **AUC = 0.900** for PHQ-9, **0.907** for GAD-7, **0.897** for PCL-5
- Uses **MPNet** (text) + **HuBERT** (audio prosody) multimodal fusion
- **64.6% time reduction** vs traditional questionnaire administration
- Consistent across demographics: gender (AUC 0.88-0.92), age (AUC 0.88-0.92), ethnicity (AUC 0.82-0.90)
- **Pearson R = 0.780** with actual PHQ-9 scores
- At severe threshold (PHQ-9 >= 15): **AUC = 0.918**, Specificity = 0.889

**The optimal question:** "In the last 2 weeks have you felt down, nervous, depressed, anxious, hopeless or on edge? If so, please explain in detail how it has bothered you or impacted your life?"

**V4 Implication:** We should consider incorporating a single elicitation question in our assessment battery and adding audio prosody analysis via HuBERT or similar model.

### 3.3 Multi-Task Learning

Dinkel et al. showed that jointly modeling **binary depression detection + PHQ-8 severity regression** with a weighted loss function (w=0.1 for regression) improves both tasks. Our V3 likely uses separate thresholds rather than a unified prediction framework.

### 3.4 PHQ-8/PHQ-9 Correlation Specifics

From the AVEC 2019 challenge (Ringeval et al.):
- DAIC-WOZ dataset: 275 subjects, 73+ hours of clinical interview data
- PHQ-8 scores are the primary depression measure
- Best baseline RMSE < 5 on PHQ-8 (range 0-24)
- Multimodal fusion (audio + video) consistently outperforms unimodal
- eGeMAPS audio features serve as the standard baseline

---

## 4. WEIGHT/EFFECT SIZE CORRECTIONS

### 4.1 Currently Tracked Features: Reported Effect Sizes

From Yamamoto et al. (2020), the largest study (n=241, 1058 data sets) on timing-related speech features:

| Feature | Partial Correlation with HAMD-17 | p-value | V3 Indicator |
|---|---|---|---|
| **Speech rate** | r = -0.378 | p < 0.001 | TMP_SPEECH_RATE (DOWN) |
| **Response time** | r = 0.458 | p < 0.001 | TMP_RESPONSE_LATENCY (UP) |
| **Pause time** | r = 0.298 | p = 0.001 | Partially in TMP_VARIABILITY |

**Longitudinal change correlations (within-subject):**
- Speech rate change vs HAMD-17 change: r = -0.317, p < 0.001
- Pause time change vs HAMD-17 change: r = 0.207, p = 0.033
- Response time change vs HAMD-17 change: r = 0.207, p = 0.034

**V4 Correction:** Response time (r=0.458) should be weighted HIGHER than speech rate (r=-0.378) in our depression scoring. Currently speech rate appears to receive roughly equal weight. Pause time (r=0.298) is an independent predictor and should be tracked separately from general variability.

### 4.2 Acoustic Feature Effect Sizes (Not Currently in V3)

From the cross-cultural study (Le et al.):
- MFCC-2: SHAP importance = 0.069 (dominates all other features)
- Psychoacoustic sharpness: SHAP = 0.042
- Auditory spectrum: SHAP = 0.042
- logHNR range: SHAP = 0.035

**These acoustic features individually have HIGHER discriminative power than any text feature we currently track.**

### 4.3 Recommended Weight Adjustments

For the V3 differential weights, based on evidence synthesis:

| Indicator | Current Suggested Weight | Evidence-Based Weight | Rationale |
|---|---|---|---|
| TMP_RESPONSE_LATENCY | Medium-High | **HIGHEST among temporal** | r=0.458, largest effect |
| TMP_SPEECH_RATE | Medium | Medium-High | r=-0.378 |
| AFF: Self-Referential Pronouns | High | Medium-High | Consistent but smaller effect |
| AFF: Negative Valence | High | High | Very consistent finding |
| AFF: Absolutist Language | Medium | Medium | Confirmed in literature |
| AFF: Future Reference | Medium | Low-Medium | Less strong evidence |
| AFF: Hedonic Language | Medium | Medium | Confirmed |
| New: MFCC-2 | N/A | **VERY HIGH** | SHAP=0.069, cross-cultural |
| New: Jitter/Shimmer | N/A | Medium | Consistent but lower SHAP |
| New: HNR range | N/A | High | SHAP=0.035, robust |

---

## 5. TEMPORAL PATTERNS (Episode Detection, Recovery Tracking)

### 5.1 Longitudinal Speech-Depression Tracking

Yamamoto et al. (2020) is the key study for temporal patterns. From n=241 participants with up to 10 interviews each:

- **Speech rate changes track depression recovery:** As HAMD-17 scores improve, speech rate increases (r = -0.317)
- **Response time is most sensitive to change:** Longer response time is associated with more severe depression, and it changes with treatment
- **Pause time changes are weaker but significant:** May be more influenced by medication side effects

**Key temporal finding:** MDD patients had significantly slower speech rate, longer pause time, and longer response time than healthy controls AND than bipolar patients (for response time specifically).

### 5.2 State-of-Mind Dynamics (AVEC 2019)

The AVEC 2019 SoMS sub-challenge reveals critical temporal dynamics:

- Human state-of-mind is **constantly fluctuating** due to internal/external stimuli
- Best prediction comes from a **mixed approach**: training on static emotional state, evaluating on dynamic change (or vice versa)
- **Emotional inertia** (autocorrelation of emotion over time) is a key construct -- V3 does NOT model this
- **Curriculum learning** (presenting extreme cases first, then gradually adding moderate cases) improves temporal modeling

### 5.3 Digital Phenotyping Temporal Patterns (De Angel et al., 2022)

From the systematic review of 51 passive monitoring studies:

**Consistent temporal biomarkers of depression episodes:**
- **Sleep variability** increases (night-to-night variation) -- stronger association with longer follow-up (24.7 days vs 8.6 days)
- **Later sleep offset** (waking later)
- **Longer time in bed**
- **Irregular circadian rhythms** (reduced daytime, increased nighttime activity)
- **Delayed sleep phase**
- **Reduced mobility radius** and fewer location visits
- **Increased evening/nighttime smartphone use**
- **Fewer phone calls** (both incoming and outgoing)
- **Reduced physical activity** with later activity onset

**Recovery indicators:**
- Increased geospatial activity correlates with depression score improvement
- Normalization of circadian rhythm patterns
- Faster speech rate (Yamamoto 2020)
- Shorter response time (Yamamoto 2020)

### 5.4 V4 Temporal Module Recommendations

1. **Implement session-over-session trend tracking** for all speech features (not just thresholds per session)
2. **Add emotional inertia measurement** -- autocorrelation of affect indicators across sessions
3. **Track speech rate CHANGE as primary recovery biomarker** (r = -0.317 with HAMD change)
4. **Model episode detection** using deviation from individual baseline (within-subject design is critical)
5. **Minimum monitoring window:** Literature suggests >= 2 weeks for reliable pattern detection, >= 3 weeks for sleep variability associations

---

## 6. MULTIMODAL FEATURES (Facial, Physiological, Behavioral)

### 6.1 Facial Expression Features (Currently Not in V3)

From Mocnik et al. (review of 24 reviews) and AVEC 2019:

| Facial Feature | Association with Depression | Evidence Level |
|---|---|---|
| **Reduced facial expressivity** (overall) | Strong positive | High |
| **Fewer smiles** / reduced zygomaticus activation | Strong positive | High |
| **More sadness, negative, neutral expressions** | Strong positive | High |
| **Downward-angled mouth corners** | Positive | Moderate |
| **Extended corrugator activity** (frowning) | Positive | Moderate |
| **Reduced saccadic eye movements** | Positive | Moderate |
| **Shorter/evasive eye contact** | Strong positive | High |
| **Downward gaze direction** | Strong positive | High |
| **More frequent lip pressing** | Positive | Moderate |
| **Reduced facial expression variability/intensity** | Strong positive | High |

**AVEC 2019 baseline features for video:**
- 17 Facial Action Unit (FAU) intensities via OpenFace
- Pose and gaze descriptors
- Deep visual representations (VGG-16, ResNet-50 pre-trained on AffWild)

### 6.2 Physiological Features

| Physiological Feature | Association with Depression | Evidence Level |
|---|---|---|
| **Reduced heart rate variability (HRV)** | Strong -- but also appears in anxiety and BPD (transdiagnostic) | High |
| **Higher LF/HF ratio** | Positive | Moderate |
| **Higher blood pressure variability** | Positive | Moderate |
| **Decreased body temperature amplitude** | Positive | Moderate |
| **Unstable skin temperature rhythms** | Positive | Moderate |
| **Lower tonic skin conductance** | Positive | Moderate |
| **Nighttime temperature increases** | Positive | Moderate |

**Note:** HRV is consistently reduced across depression, anxiety, AND BPD -- it is a **transdiagnostic marker** of psychopathology, not depression-specific. V4 should NOT use HRV alone for differential diagnosis but can use it as a severity indicator.

### 6.3 Nonverbal/Body Movement Features

| Feature | Association with Depression | Evidence Level |
|---|---|---|
| **Shaking/fidgeting** | Positive | Low-Moderate |
| **Self-adaptors** (self-touching) | Positive | Low-Moderate |
| **Slumped posture** | Positive | Moderate |
| **Reduced/slowed arm and hand movements** | Positive | Moderate |
| **Foot tapping** | Positive | Low |
| **Limp, uniform body posture** | Positive | Moderate |

### 6.4 Digital Behavioral Features (Smartphone/Wearable)

From De Angel et al. (2022) systematic review of 51 studies:

**Strongest digital phenotyping signals:**
- Sleep quality/efficiency (lower = more depression)
- Sleep stability (more variable = more depression)
- Physical activity level (lower = more depression)
- Location entropy / number of unique locations visited (lower = more depression)
- Time spent at home (higher = more depression)
- Phone call frequency (lower = more depression)
- Circadian rhythm regularity (more irregular = more depression)
- Screen unlock frequency (higher = more depression)
- Nighttime smartphone activity (higher = more depression)

### 6.5 Multimodal Fusion Evidence

**Consistent finding across AVEC challenges and Grimm et al.:**
- Multimodal (audio + video + text) > any single modality
- Audio-only is competitive with multimodal in many tasks
- Text (semantic) + audio (prosody) fusion achieves AUC 0.90+ for PHQ-9 prediction
- Video features (FAUs) add incremental value, particularly for severe depression

**For V4:** Even adding just audio prosody analysis to our text pipeline would represent a major improvement. Full multimodal (including video) is ideal but requires camera access.

---

## 7. DIFFERENTIAL DIAGNOSIS GAPS

### 7.1 Depression vs. Bipolar Disorder

Yamamoto et al. (2020) found:
- MDD patients had **longer response time** than BP patients (p=0.001)
- No significant differences in speech rate or pause time between MDD and BP
- Response time may help differentiate MDD from BP depressive episodes

### 7.2 Depression vs. Anxiety vs. BPD

From Mocnik et al., key differentiating features:

| Feature | Depression | Anxiety | BPD |
|---|---|---|---|
| **Pronoun use** | First-person increase | Similar | Third-person/impersonal |
| **Language tone** | Negative, death-related | Negative, reward/vision-related | Externalized, negations, intensifiers |
| **Speech rate** | Slowed | Slowed (especially PTSD) | Slowed with elevated pause frequency |
| **Pitch** | Reduced, monotonous | Flat/monotone | Altered acoustic-emotion coupling |
| **Facial expression** | Blunted, fewer smiles | Not consistent | Paradoxical (mixed anger + social smiles) |
| **HRV** | Reduced | Reduced | Reduced (transdiagnostic) |
| **Mobility** | Reduced | Mixed (avoidance patterns) | Ambivalent social approach |

**V4 should add:** acoustic-emotion coupling analysis (how pitch/loudness changes correlate with emotional word use) as a potential BPD vs depression differentiator.

---

## 8. PRIORITY IMPLEMENTATION ROADMAP FOR V4

### Phase 1 (Highest Impact, Lowest Effort)
1. **Add pause time** as a separate tracked indicator (currently folded into variability)
2. **Reweight response latency** higher in depression differential (r=0.458)
3. **Add death-related words, ruminative language, and past-oriented terms** to lexical tracking
4. **Add total verbal output** as a tracked feature

### Phase 2 (Highest Impact, Moderate Effort)
5. **Implement basic acoustic feature extraction** (openSMILE eGeMAPS or librosa-based):
   - MFCC 1-13
   - F0 statistics (mean, range, variability)
   - Jitter and shimmer
   - HNR
6. **Add session-over-session trend tracking** for longitudinal depression monitoring

### Phase 3 (High Impact, Higher Effort)
7. **Implement HuBERT or Wav2Vec 2.0 audio embeddings** for deep acoustic features
8. **Add sentence-level text embeddings** (fine-tuned BERT/MPNet) alongside lexical features
9. **Implement multi-task learning** for simultaneous binary detection + PHQ-severity regression
10. **Add cross-cultural acoustic feature set** (the 12 features from Le et al.)

### Phase 4 (Future Research)
11. Facial expression analysis (if video input available)
12. Digital phenotyping integration (sleep, mobility, phone use data)
13. Physiological signal integration (HRV from wearables)
14. Emotional inertia and state-of-mind dynamics modeling

---

## 9. PAPERS REVIEWED (Content Summary)

| File | Actual Content | Relevance |
|---|---|---|
| `2007_mundt2007.md` | Le et al. -- Cross-cultural acoustic features for depression (Vietnamese/Japanese) | **HIGH** - 12 cross-cultural acoustic features, AUC=0.934 |
| `2009_cohn2009.md` | Gorski et al. -- Mammalian communication review | LOW - Not about human depression |
| `2012_quatieri2012.md` | Mocnik et al. -- Multimodal observable cues review of reviews (depression, anxiety, BPD) | **VERY HIGH** - Comprehensive synthesis of 24 reviews |
| `2013_alghowinem2013.md` | Lu et al. -- Meta-analysis of TML vs DL for speech-based depression detection | **VERY HIGH** - Pooled performance metrics |
| `2014_scherer2014.md` | Grimm et al. -- Multimodal single-question mental health assessment (PHQ-9, GAD-7, PCL-5) | **VERY HIGH** - Single-question AUC=0.90 |
| `2015_cummins2015.md` | SER in mental health systematic review (summary only) | MODERATE |
| `2016_ma2016.md` | Veitch & Roy -- Sparse exchangeable graphs (math/stats) | NONE - Not relevant |
| `2018_harati2018.md` | Alhawiti -- Parkinson's detection using voice biomarkers + DAIC-WOZ | MODERATE - DAIC-WOZ methodology, Wav2Vec embeddings |
| `2019_avec2019.md` | Ringeval et al. -- AVEC 2019 Challenge (SoM, Depression, Cross-Cultural) | **HIGH** - Benchmark methodology, baseline features |
| `2020_dinkel2020.md` | Dinkel et al. -- Text-based depression detection on sparse data (DAIC-WOZ) | **HIGH** - Multi-task learning, text embeddings |
| `2020_low2020.md` | Yu et al. -- Human microbiome commentary | NONE - Not relevant |
| `2020_yamamoto2020.md` | Yamamoto et al. -- Timing-related speech features and depression severity | **VERY HIGH** - Largest timing study, longitudinal data |
| `2022_deangel2022.md` | De Angel et al. -- Digital health tools for passive depression monitoring | **HIGH** - 51 studies, digital phenotyping signals |
| `2022_rejaibi2022.md` | Sirithepmontree et al. -- ML for infant cry classification | NONE - Not relevant |
| `2022_zhang2022.md` | Digital conversational agents for youth mental health (summary only) | LOW |

**Note:** Several PDFs were mismatched during extraction (the content does not match the filename/attributed authors). Of 15 papers, 11 contained depression-relevant content and 4 were off-topic. The 11 relevant papers provide comprehensive coverage of the field.

---

## 10. KEY CITATIONS FOR V4 DEVELOPMENT

1. **Le et al. (2026)** - 12 cross-cultural acoustic features, AUC=0.934. File: `2007_mundt2007.md`
2. **Lu et al. (2025)** - Meta-analysis: pooled TML sensitivity 0.82, DL sensitivity 0.83. File: `2013_alghowinem2013.md`
3. **Grimm et al. (2026)** - Single-question multimodal: PHQ-9 AUC=0.900. File: `2014_scherer2014.md`
4. **Mocnik et al. (2025)** - Review of 24 reviews: comprehensive cue taxonomy. File: `2012_quatieri2012.md`
5. **Yamamoto et al. (2020)** - Timing features: response time r=0.458 with HAMD-17. File: `2020_yamamoto2020.md`
6. **Dinkel et al. (2020)** - Multi-task text model: F1=0.84, MAE=3.48. File: `2020_dinkel2020.md`
7. **De Angel et al. (2022)** - Digital phenotyping: 51 studies, leading passive signals. File: `2022_deangel2022.md`
8. **Ringeval et al. (2019)** - AVEC 2019: benchmark features and methodology. File: `2019_avec2019.md`
