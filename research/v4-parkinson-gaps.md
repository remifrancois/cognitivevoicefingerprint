# V4 Parkinson's Disease Voice Biomarker Gap Analysis

## Comprehensive Synthesis from 26 Research Papers

**Generated:** 2026-02-11
**Purpose:** Identify all PD voice biomarkers, features, and methods from the research literature that are NOT currently implemented in the MemoVoice V3 engine.

---

## CURRENT V3 PD COVERAGE (Critically Insufficient)

The V3 engine has only **3 PD sentinel indicators**:
- `TMP_LPR` (Long Pause Ratio)
- `TMP_SPEECH_RATE`
- `TMP_REPETITION` (palilalia)

This is woefully inadequate. PD voice research has identified **dozens of acoustic, articulatory, prosodic, nonlinear, and linguistic markers** across multiple speech subsystems. The V3 engine captures less than 5% of the known PD voice signature.

---

## 1. MISSING ACOUSTIC FEATURES - PHONATORY (Sustained Vowel)

### 1.1 Perturbation Measures (Jitter Family)
All missing from V3:
- **Jitter (%)** - Cycle-to-cycle F0 variation as percentage
- **Jitter (Abs)** - Absolute jitter in microseconds
- **Jitter:RAP** - Relative Average Perturbation (3-cycle)
- **Jitter:PPQ** / **Jitter:PPQ5** - Period Perturbation Quotient (5-cycle)
- **Jitter:DDP** - Average absolute difference of differences between consecutive periods

**Evidence:** Little et al. (2009) found jitter measures significantly elevated in PD. Jitter(Abs) was retained after correlation filtering as one of 10 uncorrelated features. Harel (2004) and Godino-Llorente (2017) confirmed increased jitter in PD, though with noted controversy about reliability. The Vaiciukynas (2017) paper (Chen et al.) found /a/ jitter significantly worse in left-side late-stage PD (p < 0.05).

### 1.2 Perturbation Measures (Shimmer Family)
All missing from V3:
- **Shimmer** - Local shimmer
- **Shimmer (dB)** - Local shimmer in decibels
- **Shimmer:APQ3** - 3-point Amplitude Perturbation Quotient
- **Shimmer:APQ5** - 5-point Amplitude Perturbation Quotient
- **Shimmer:APQ11** / **MDVP:APQ** - 11-point Amplitude Perturbation Quotient
- **Shimmer:DDA** - Average absolute difference between consecutive amplitude differences

**Evidence:** Little (2009), Tsanas (2010/2012) datasets use full shimmer suite. Shimmer reflects amplitude instability from incomplete vocal fold closure. Skodda (2013/Cao 2025 review) confirmed shimmer deteriorates as PD progresses.

### 1.3 Noise-to-Harmonics Measures
Missing from V3:
- **HNR** (Harmonics-to-Noise Ratio) - Ratio of periodic to aperiodic energy
- **NHR** (Noise-to-Harmonics Ratio) - Inverse of HNR
- **GNE** (Glottal-to-Noise Excitation ratio)
- **VTI** (Voice Turbulence Index)

**Evidence:** HNR was one of the TOP 4 features selected by Little (2009) for the optimal PD classifier (HNR + RPDE + DFA + PPE = 91.4% accuracy). Lower HNR in PD reflects increased aspiration noise from incomplete vocal fold closure. Godino-Llorente (2017) confirmed NHR, GNE, HNR, and VTI as significant phonatory markers.

### 1.4 Cepstral Measures
Missing from V3:
- **CPP** (Cepstral Peak Prominence) - Prominence of cepstral peak indicating voice clarity
- **CPPS** (Smoothed CPP)

**Evidence:** Godino-Llorente (2017) demonstrated CPP as a robust voice quality measure for PD. Cao et al. (2025 review) confirmed lower CPP in PD. CPP reflects overall vocal quality and is more robust than perturbation measures for disordered voices.

### 1.5 Fundamental Frequency Features
Missing from V3:
- **F0 mean** - Average fundamental frequency
- **F0 SD / F0 variation (vF0)** - Standard deviation of F0
- **F0 range** - Maximum minus minimum F0
- **F0 CV** - Coefficient of variation of F0
- **Maximum phonation frequency range**

**Evidence:** Reduced F0 variability (monopitch) is the MOST CONSISTENT early PD marker across multiple studies. Cao et al. (2025 review) found monopitch differentiates PD groups even in the prodromal RBD phase (AUC 0.80). Hlavnicka (2017) automated detection found reduced F0 variation as a primary PD biomarker. Vaiciukynas (Chen 2025) found vF0 significantly elevated in PD.

### 1.6 Intensity / Loudness Features
Missing from V3:
- **Intensity mean** - Average sound pressure level
- **Intensity SD / variation** - Monoloudness indicator
- **Intensity range**
- **Maximum Phonation Time (MPT)**

**Evidence:** Reduced loudness (hypophonia) affects ~90% of PD patients. Monoloudness is a hallmark of hypokinetic dysarthria. Ramig (2001) showed LSVT LOUD treatment significantly increases loudness.

---

## 2. MISSING NONLINEAR DYNAMICS FEATURES

### 2.1 Core Nonlinear Measures
ALL missing from V3 - these are the most discriminative PD features:
- **RPDE** (Recurrence Period Density Entropy) - Measures deviation from strict periodicity
- **DFA** (Detrended Fluctuation Analysis) - Fractal scaling exponent of noise
- **PPE** (Pitch Period Entropy) - Entropy of relative semitone pitch variations
- **D2** (Correlation Dimension) - Fractal dimension of attractor in phase space

**Evidence:** Little (2007, 2009) introduced RPDE and DFA for voice disorder detection (91.8% classification). Little (2009) showed the combination of {HNR, RPDE, DFA, PPE} achieves 91.4% PD vs healthy classification accuracy. PPE alone achieves 85.6% - the SINGLE BEST individual feature. These are specifically designed for PD telemonitoring and are robust to environmental noise and individual variation.

### 2.2 Additional Complexity Measures
Missing from V3:
- **Largest Lyapunov Exponent (LLE)** - Measures chaotic dynamics
- **Approximate Entropy (ApEn)** - Signal complexity/regularity
- **Sample Entropy (SampEn)**
- **Hurst Exponent (HE)** - Long-range dependence
- **Correlation Dimension (CD)** - Phase space attractor complexity

**Evidence:** Godino-Llorente (2017) lists LLE, CD, DFA, HE, and ApEn as complexity measures used to characterize PD speech. These capture the nonlinear dynamics of vocal fold vibration disrupted in PD.

---

## 3. MISSING ARTICULATORY FEATURES

### 3.1 Vowel Space Measures
ALL missing from V3:
- **VSA / tVSA** (Vowel Space Area / Triangular VSA) - Area of polygon formed by corner vowel formants (/a/, /i/, /u/)
- **VAI** (Vowel Articulation Index) - Ratio measure of formant centralization
- **FCR** (Formant Centralization Ratio) - Inverse of VAI
- **F1, F2 formant frequencies** for corner vowels
- **Formant centralization** measures

**Evidence:** Cao et al. (2025 review) confirmed restricted VSA and lower VAI in PD. Rusz (2013) showed imprecise vowel articulation as a potential early PD marker, with VSA and VAI extracted from connected speech. Skodda (2012/Cao 2025) demonstrated progressive VSA/VAI deterioration correlating with axial gait dysfunction. Skrabal et al. (2022, cited in Cao 2025) found articulatory undershoot in both RBD and early PD patients. VAI appeared more sensitive than tVSA to altered vowels and further decline over time.

### 3.2 Diadochokinetic (DDK) Rate Features
ALL missing from V3:
- **DDK rate** - Syllable repetition rate for /pa/, /ta/, /ka/, /pataka/
- **DDK regularity / rhythm** - Consistency of syllable timing
- **DDK acceleration/deceleration** - Pace instability (oral festination)
- **Average syllable duration (ASD)**
- **DDK irregularity coefficient**
- **Sequential motion rate (SMR)** - /pataka/ rate

**Evidence:** DDK is one of the most critical PD speech tasks. Harel (2004) found /pataka/ repetition had HIGHEST classification accuracy (68.9% PD, 77.4% MSA, 73.4% CA). Hlavnicka (2017) found imprecise articulation in prodromal RBD. Skodda (2011/Cao 2025) showed instable pace and pace acceleration during syllable repetition present in PD with further deterioration over 34 months. Moro-Velazquez (2024/Santos 2025) found DDK task showed significant differences between tremor and non-tremor subtypes in syllables, phonation time, articulation rate, and ASD (all p < 0.05).

### 3.3 Voice Onset Time (VOT)
Missing from V3:
- **VOT** - Time between plosive consonant release and voicing onset
- **VOT for /p/, /t/, /k/** separately

**Evidence:** Cao et al. (2025 review) includes longer VOT as a PD marker. Prolonged VOT reflects impaired articulatory timing. Godino-Llorente (2017) noted VOT as an important articulatory kinetic biomarker.

### 3.4 Spirantization / Consonant Weakening
Missing from V3:
- **Spirantization index** - Degree to which stops are weakened toward fricatives
- **[continuant] posteriors** - Probability of continuant articulation (from Phonet DNN)
- **Stop consonant articulation** measures
- **Imprecise consonants** rating

**Evidence:** Galaz (2023/Wayland 2025) found PD participants show significantly higher [continuant] posteriors, especially for dental stops, reflecting increased spirantization and articulatory weakening. Coronal consonants (/t/, /d/) are disproportionately vulnerable in PD. This is a cutting-edge deep-learning-derived measure.

### 3.5 Articulatory Kinetic Biomarkers
Missing from V3:
- **Envelope trace velocity** - Speed of articulatory movements
- **Envelope acceleration** - Rate of change of articulatory speed
- **Peak-to-peak interval regularity**
- **Articulatory decay** across utterances

**Evidence:** Godino-Llorente (2017) proposed novel kinetic biomarkers based on the envelope trace of speech, achieving ~85% accuracy. These directly measure the hypokinetic articulatory undershoot characteristic of PD.

---

## 4. MISSING PROSODIC FEATURES

### 4.1 Monopitch / Dysprosody Indicators
Missing from V3:
- **F0 SD during connected speech** - Primary monopitch measure
- **F0 range during reading/monologue**
- **Intonation contour flatness**
- **Pitch breaks** frequency

**Evidence:** Monopitch is the SINGLE MOST CONSISTENT prodromal PD marker. Rusz et al. (2021, cited in Cao 2025) found monopitch separates RBD from controls (AUC 0.65) and PD from controls (AUC 0.80) across Czech, English, German, French, and Italian. Jeancolas (2017/2021) used prosodic features for 89% accuracy in male early PD detection.

### 4.2 Temporal / Rhythm Features
Missing from V3 (beyond basic pause ratio):
- **Articulation rate** - Syllables per second excluding pauses
- **Net speech rate** - Including pauses
- **Pause duration** (mean, SD)
- **Pause frequency**
- **Pause ratio at syntactic vs non-syntactic boundaries**
- **Inter-pause intervals** regularity
- **Speaking time ratio**
- **Breath pause analysis** (location, frequency, duration)

**Evidence:** Cao et al. (2025 review) documented prolonged pause intervals as a consistent early PD marker. Darling-White & Huber (2020, cited in Cao 2025) showed breath pauses at non-syntactic boundaries and linguistic errors increase with PD progression. Pause patterns serve as markers of MCI in PD (Andrade et al. 2023, cited in Cao 2025).

### 4.3 Rhythm and Timing
Missing from V3:
- **Oral festination** detection - Involuntary speeding up
- **Speech rushing** episodes
- **Inter-syllable interval variability**

**Evidence:** Moreau et al. (2007, cited in Cao 2025) showed oral festination correlates strongly with festination of gait. This is a PD-specific phenomenon distinct from normal speech rate variation.

---

## 5. MISSING SPECTRAL / CEPSTRAL FEATURES

### 5.1 MFCC-Based Features
Missing from V3:
- **MFCC coefficients** (typically 13-20 coefficients)
- **MFCC deltas** (first derivatives)
- **MFCC delta-deltas** (second derivatives)
- **MFCC statistics** (mean, SD, skewness, kurtosis per coefficient)

**Evidence:** Jeancolas (2017/2021) achieved 91% accuracy for men using MFCC+GMM on reading task. MFCCs are the standard feature in speaker recognition adapted for PD detection. Benba (2016/Quamar 2025) and multiple other papers use MFCC as primary features. Tsanas (2012, cited in Cao 2025) was first to introduce MFCCs for PD detection.

### 5.2 Spectrogram Features
Missing from V3:
- **Mel spectrogram** representations
- **Short-Time Fourier Transform (STFT)** features
- **Spectral entropy**
- **Formant structure regularity**

**Evidence:** Tsanas (2012/Chen 2025) achieved 95.56% accuracy using spectrogram-based deep learning with feature fusion from multiple CNNs. Spectrograms of PD patients show reduced harmonic regularity, increased spectral noise, and formant blurring.

---

## 6. MISSING RESPIRATORY FEATURES

Missing from V3:
- **Respiratory pause detection** - Automated identification of inhalation
- **Inspiration loudness relative to speech** (respiration strength)
- **Lung volume excursion** indicators
- **Breath group length**

**Evidence:** Hlavnicka (2017) developed automated respiration detection from connected speech. Cao et al. (2025 review) noted that compensatory speech respiratory adaptations seen in normal aging may be compromised in PD. Weaker inspirations were a distinct feature of early-onset PD.

---

## 7. MISSING LINGUISTIC / COGNITIVE-LANGUAGE FEATURES

Missing from V3:
- **Content density** - Proportion of content words vs function words
- **Lexical diversity** - Vocabulary range/richness
- **Sentence complexity** measures
- **Utterance length** (mean, SD)
- **Word-finding difficulty** indicators
- **Phrase repetition** frequency (beyond palilalia)
- **Verbal fluency** (phonemic and semantic naming rates)
- **Grammatical integrity** measures
- **Dysfluen events** (repetitions, additions, deviations)

**Evidence:** Subert et al. (2024, cited in Cao 2025) showed lower content richness predicted PD phenoconversion from RBD (OR=7.46 for PD with MCI). Restricted vocabulary range predicted dementia (OR=4.08). These linguistic markers were validated across Czech, English, German, French, and Italian in 180 RBD subjects.

---

## 8. PD-SPECIFIC DIFFERENTIAL DIAGNOSIS

### 8.1 PD vs MSA (Multiple System Atrophy)
Missing from V3:
- MSA speech is predominantly **hypokinetic-ataxic** (vs purely hypokinetic in PD)
- **Strained-strangled voice quality** (MSA-specific)
- **Excessive pitch/loudness fluctuations** (MSA)
- **Vocal tremor** (more prominent in MSA)
- **Variable speech rate** (MSA)
- Sequential motion rate /pataka/ achieved **77.4% MSA accuracy** (Harel 2004)

### 8.2 PD vs PSP (Progressive Supranuclear Palsy)
Missing from V3:
- PSP speech is **hypokinetic-spastic** (vs purely hypokinetic in PD)
- **Strained voice quality** (PSP)
- **Stuttering-like behavior** (PSP-specific)
- **Involuntary syllable/word repetition** (PSP)
- More severe imprecise consonants, articulatory decay, slower DDK rate

### 8.3 PD vs Essential Tremor (ET)
Missing from V3:
- Cross-language PD vs ET classification achieves **81-86% accuracy** using articulatory, phonatory, and prosodic indices (Rios-Urrego et al. 2024, cited in Cao 2025)

### 8.4 PD vs Huntington's Disease (HD)
- HD: more severe dysphonia and breathiness, intermittent hypernasality
- PD: more harsh/hoarse voice
- Both show reduced grammatical complexity, but HD produces shorter utterances with greater syntactic simplification

**Evidence:** Cao et al. (2025 review), Daoudi et al. (2022), Rusz et al. (2015, 2019), Kang et al. (2023), Huh et al. (2015) all cited in the comprehensive review demonstrate that detailed acoustic profiling enables differential diagnosis between parkinsonian disorders at 87-95% accuracy.

---

## 9. PD SUBTYPE DIFFERENTIATION

### 9.1 Tremor-Dominant (TD) vs PIGD (Postural Instability/Gait Difficulty)
Missing from V3:
- Both show monopitch and irregular DDK rate
- PIGD-specific: **consonant timing deficits**, **abnormal pitch breaks**, **articulatory decay**, **decreased speech rate in subsequent segments**, **inappropriate pauses**
- PIGD shows greater overall speech impairment than TD
- Correlations between speech (prolonged VOT, DDK irregularity, prolonged pauses) and gait features exist in PIGD but NOT in TD

**Evidence:** Rusz et al. (2023, cited in Cao 2025), Tykalova et al. (2020), and Moro-Velazquez (2024/Santos 2025) longitudinal study (60 PD patients over 3 years) confirmed DDK task distinguishes subtypes.

### 9.2 Early-Onset vs Late-Onset PD
- Both share monopitch, monoloudness, articulatory decay
- Early-onset (age <= 50): **weaker inspirations** as distinct feature
- Late-onset (age >= 70): **decreased voice quality**, **imprecise consonant articulation**

### 9.3 Sporadic vs Genetic (LRRK2) PD
- Differentiated by voice entropy, skewness of amplitude distribution, glottis-to-noise excitation ratio (sensitivity 95%, specificity 90%)

---

## 10. SEVERITY TRACKING (H&Y Stage Correlation)

### 10.1 Progressive Voice Deterioration Pattern
Missing from V3 - longitudinal tracking features:
1. **Early/Mild PD (H&Y 1-2):** Dysphonia dominates - harsh voice, decreased volume, impaired intonation; monopitch and monoloudness present
2. **Moderate PD (H&Y 2.5-3):** Articulatory impairments increase - imprecise articulation from articulatory undershoot; fluency problems emerge
3. **Advanced PD (H&Y 4-5):** Articulation deficits become most prevalent and significant; vocal tremor appears as unique feature; overall intelligibility severely impacted

### 10.2 UPDRS Score Prediction from Voice
Missing from V3:
- Tsanas (2010/Dehghanghanatkaman 2026) achieved **R2 = 0.9925** for motor UPDRS prediction using voice + clinical features
- Voice features alone predicted UPDRS with discrepancy of **< 2 points** from clinician ratings using random forest classifiers
- Key voice features for UPDRS prediction: jitter, shimmer, HNR, RPDE, DFA, PPE plus their temporal derivatives (velocity, acceleration)

### 10.3 Temporal Dynamics for Progression
Missing from V3:
- **First derivatives** (velocity) of voice features over visits
- **Second derivatives** (acceleration) of voice features
- **Rolling statistics** (3-5 visit window means, SDs)
- **Within-patient z-scores** for personalized tracking
- **Higher-order moments** (skewness, kurtosis over rolling windows)
- **Voice instability index** (normalized combination of jitter + shimmer)
- **Voice quality ratio** (HNR/NHR)

---

## 11. METHODOLOGY GAPS

### 11.1 Speech Tasks Not Supported
V3 lacks specific support for:
- **Sustained vowel /a/** analysis (the most studied PD speech task)
- **DDK task** (/pa/-/ta/-/ka/ repetition) analysis
- **Standardized passage reading** analysis
- **Monologue/spontaneous speech** analysis

### 11.2 Automated Segmentation
Missing from V3:
- Hlavnicka (2017) algorithm for automatic classification of connected speech into: **voiced speech**, **unvoiced speech**, **pauses**, and **respirations** (86.2% efficiency)
- This enables extraction of respiratory, dysphonia, articulation, and dysrhythmia features from natural connected speech

### 11.3 Cross-Language Validation
Current V3 is language-agnostic but does not exploit:
- Cross-language PD markers (monopitch, prolonged pauses validated across Czech, English, German, French, Italian, Spanish, Portuguese, Korean, Cantonese, Japanese)
- Language-specific markers (VSA, rhythm may be language-dependent)

### 11.4 Sex-Stratified Analysis
V3 does not account for:
- Males generally experience greater speech impairment in PD
- Sex-specific F0 changes with PD progression
- Jeancolas (2017/2021) found accuracy of 91% for men vs 60-70% for women in early PD detection
- Different voice features may be more discriminative per sex

---

## 12. RECOMMENDED V4 IMPLEMENTATION PRIORITY

### TIER 1 - Critical (Highest discriminative power, implement first)
1. **PPE** (Pitch Period Entropy) - Single best individual feature for PD (85.6% alone)
2. **RPDE** (Recurrence Period Density Entropy) - Core nonlinear measure
3. **DFA** (Detrended Fluctuation Analysis) - Fractal scaling of noise
4. **HNR** (Harmonics-to-Noise Ratio) - Together with RPDE+DFA+PPE = 91.4%
5. **F0 SD / Monopitch index** - Most consistent prodromal PD marker
6. **VSA / VAI** (Vowel Space Area / Vowel Articulation Index) - Articulatory marker
7. **DDK rate and regularity** - Critical for differential diagnosis

### TIER 2 - Important (Strong evidence, broad utility)
8. **Jitter (Abs)** and **Jitter:DDP** - Retained after decorrelation filtering
9. **Shimmer:DDA** and **MDVP:APQ** - Retained after decorrelation filtering
10. **NHR** (Noise-to-Harmonics Ratio)
11. **CPP** (Cepstral Peak Prominence)
12. **MFCC coefficients + deltas** (13 coefficients + derivatives)
13. **VOT** (Voice Onset Time)
14. **Articulation rate** (syllables/sec excluding pauses)
15. **Pause analysis** (duration, frequency, location relative to syntax)
16. **D2** (Correlation Dimension)

### TIER 3 - Valuable (Add as resources allow)
17. **Spirantization / [continuant] posteriors** (Phonet-based)
18. **Oral festination detection**
19. **Respiratory features** (breath detection, inspiration strength)
20. **Content density / lexical diversity** (linguistic)
21. **Articulatory envelope kinetics** (velocity, acceleration)
22. **MPT** (Maximum Phonation Time)
23. **F0 range** and **Intensity range**
24. **Spectral entropy**
25. **Voice tremor** detection (3-7 Hz modulation)
26. **Formant transition rates**

### TIER 4 - Future Research
27. **Phonological feature posteriors** (Phonet DNN approach)
28. **Self-supervised learning embeddings** (Wav2Vec 2.0, HuBERT)
29. **Spectrogram-based CNN features**
30. **Multimodal fusion** (voice + head IMU from AR/VR)

---

## 13. CLASSIFICATION PERFORMANCE BENCHMARKS

| Feature Set | Accuracy | Method | Source |
|---|---|---|---|
| HNR + RPDE + DFA + PPE | 91.4% | Kernel SVM | Little 2009 |
| PPE alone | 85.6% | Kernel SVM | Little 2009 |
| RPDE + DFA (voice disorder) | 91.8% | QDA | Little 2007 |
| MFCC + GMM (reading, men) | 91% | GMM | Jeancolas 2017 |
| DDK speech features (combined) | 87-95% | Various | Daoudi 2022, Rusz 2015 |
| Spectrogram + CNN fusion | 95.56% | MobileNetV3+ShuffleNetV2 | Chen 2025 |
| Multimodal (voice+clinical+text) | R2=0.9925 | BiLSTM+Attention | Dehghanghanatkaman 2026 |
| Monopitch (PD vs Control) | AUC 0.80 | Automated acoustic | Rusz 2021 |
| Monopitch (RBD vs Control) | AUC 0.65 | Automated acoustic | Rusz 2021 |
| RPDE + DFA + PPE | 89.5% | Kernel SVM | Little 2009 |
| Voice (PD vs ET, cross-language) | 81-86% | ML | Rios-Urrego 2024 |

---

## 14. KEY DATASETS REFERENCED

- **Parkinson's Telemonitoring Dataset** (UCI) - 42 patients, 5875 recordings, 6 months longitudinal
- **PC-GITA corpus** - 50 PD + 50 HC, Colombian Spanish
- **Hlavnicka/Rusz Czech cohort** - 50 RBD + 30 PD + 50 HC
- **Rusz multicenter cohort** - 150 RBD + 149 PD + 149 HC across 5 languages
- **mPower (Sage Bionetworks)** - Large-scale smartphone voice data
- **Kay Elemetrics Disordered Voice Database** (Model 4337)

---

## SUMMARY

The V3 engine's PD detection capability is its weakest component. With only 3 indicators (pause ratio, speech rate, repetition), it misses:

- **~20 phonatory features** (jitter/shimmer/HNR/CPP/F0 variants)
- **~6 nonlinear dynamics features** (RPDE, DFA, PPE, D2, LLE, ApEn)
- **~10 articulatory features** (VSA, VAI, DDK, VOT, spirantization)
- **~8 prosodic features** (monopitch, pause analysis, rhythm, festination)
- **~5 spectral/cepstral features** (MFCC, spectral entropy)
- **~5 respiratory features**
- **~8 linguistic features** (content density, lexical diversity, sentence complexity)
- **Differential diagnosis capability** (PD vs MSA vs PSP vs ET vs HD)
- **Subtype differentiation** (TD vs PIGD, early vs late onset)
- **Severity tracking** (H&Y stage correlation, UPDRS prediction)

The V4 engine needs a minimum of **15-20 new PD-specific indicators** to achieve competitive diagnostic performance, with the PPE + RPDE + DFA + HNR quartet as the absolute minimum viable implementation.
