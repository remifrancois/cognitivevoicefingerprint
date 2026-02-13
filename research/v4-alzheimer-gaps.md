# MemoVoice V4 Gap Analysis: Alzheimer's Literature Synthesis

**Generated:** 2026-02-11
**Source:** 39 papers in `/Users/code/azh/research/papers/alzheimer/`
**Purpose:** Identify features, methods, and findings NOT in V3 engine for V4 design

---

## EXECUTIVE SUMMARY

After reading all 39 papers (noting that ~12 had PDF extraction errors mapping unrelated papers), 27 papers yielded substantive Alzheimer's-relevant content. The analysis reveals **critical gaps** in V3, most notably: (1) a complete absence of acoustic/prosodic features despite strong evidence they are among the most discriminative biomarkers; (2) missing psycholinguistic norms (imageability, age-of-acquisition, familiarity); (3) no graph-based or embedding-based coherence measures; (4) no pre-trained language model features (BERT, GPT embeddings); and (5) no longitudinal progression modeling. V3's text-only approach leaves substantial diagnostic signal on the table.

---

## 1. MISSING INDICATORS (Features from papers NOT in V3)

### 1.1 Lexical Features Missing

| Feature | Source Papers | Notes |
|---------|--------------|-------|
| **Moving-Average TTR (MATTR)** | Fraser2015 | Length-independent TTR variant; superior to standard TTR for short samples |
| **Word Imageability** | Fraser2015 | Average imageability rating of content words; AD patients use more imageable words |
| **Word Familiarity** | Fraser2015 | Average familiarity rating; AD patients shift to more familiar words |
| **Age of Acquisition (AoA)** | Fraser2015 | AD patients regress to earlier-acquired vocabulary |
| **Word Frequency (SUBTL norms)** | Fraser2015, Ahmed2013 | Distinct from generic frequency; uses subtitle corpus norms |
| **Verb-specific frequency** | Fraser2015 | Separate frequency analysis for verbs vs. all words |
| **Not-In-Dictionary rate** | Fraser2015 | Captures paraphasias, neologisms, distortions |
| **Noun:Verb ratio** | Fraser2015, Ahmed2013 | Distinct from Pronoun:Noun; captures semantic vs. syntactic balance |
| **Determiner usage with nouns** | Fraser2015, Ahmed2013 | Proportion of nouns preceded by determiners |
| **Verb inflection rate** | Ahmed2013 | Proportion of verbs with proper inflections |
| **Gerund/participle rate** | Fraser2015 | AD patients produce fewer complex verb forms |
| **Auxiliary verb rate** | Fraser2015 | Reduced auxiliary use parallels agrammatism |
| **Deictic adverb usage** | Fraser2015 | "here," "there" usage increases with semantic impairment |
| **Closed-class:Open-class ratio** | Orimaye2017, Fraser2015 | More closed-class words in AD speech |
| **N-gram patterns** | Orimaye2017 | Specific bigram/trigram patterns differ between AD and controls |

### 1.2 Syntactic Features Missing

| Feature | Source Papers | Notes |
|---------|--------------|-------|
| **Yngve depth (mean/max)** | Fraser2015 | Parse-tree embeddedness measure; more sensitive than MLU |
| **Parse tree height** | Fraser2015 | Overall syntactic tree depth |
| **Context-free grammar (CFG) rules** | Fraser2015 | Frequency of specific syntactic constructions (NP->PRP, VP->AUX VP, etc.) |
| **Sentence fragment rate (ROOT->FRAG)** | Fraser2015 | Direct measure of incomplete utterances |
| **Noun phrase / verb phrase / prepositional phrase rates** | Fraser2015, Ahmed2013 | Normalized constituency counts |
| **Proportion of words in sentences** | Ahmed2013 | Captures sentence completeness |
| **Syntactic error rate** | Ahmed2013 | Explicit error counting |
| **Developmental Level metric** | Snowdon1996 | Rosenberg & Abbeduto's grammatical complexity scale |

### 1.3 Semantic Features Missing

| Feature | Source Papers | Notes |
|---------|--------------|-------|
| **Cookie Theft Information Units** | Fraser2015, Ahmed2013, Croisile1996 | 23 standard units; V3 has generic Info Units but not the standardized CTP scoring |
| **Efficiency (semantic units / duration)** | Ahmed2013 | Time-normalized information density |
| **Semantic unit subcategories** | Ahmed2013 | Separate scores for subjects, objects, locations, actions |
| **Cosine distance between utterances** | Fraser2015 | Repetitiveness measure via bag-of-words similarity |
| **Cosine distance threshold proportion** | Fraser2015 | Fraction of utterance pairs below similarity threshold |
| **Semantic coherence via word embeddings** | Yancheva2016 (title), Voleti2019 | Word2Vec/GloVe-based coherence beyond keyword methods |
| **GPT-3/LLM text embeddings** | Agbavor2022 | Entire transcript embedded via large language model; outperforms acoustic features |
| **BERT-based representations** | Balagopalan2020 | Fine-tuned BERT achieves 83.3% on ADReSS; captures deep semantic patterns |
| **Semantic vector similarity (global)** | Eyigoz2020 | Embedding-based coherence predicts AD onset 7.6 years ahead (AUC 0.74) |

### 1.4 Memory/Cognitive Features Missing

| Feature | Source Papers | Notes |
|---------|--------------|-------|
| **FCSRT-IR (Free and Cued Selective Reminding)** | Grober1987 | Controlled learning paradigm; AUC 0.87-0.91; sensitivity 0.75, specificity 0.85 |
| **Encoding specificity deficit** | Grober1987 | Distinguishes genuine encoding deficits from retrieval failures |
| **Story recall temporal features** | Toth2018, Young2024 | Speech features during memory recall tasks vs. picture description |
| **Delayed recall speech markers** | Young2024 | Pauses/rate during delayed recall correlate with tau PET (not just amyloid) |

### 1.5 Discourse/Pragmatic Features Missing

| Feature | Source Papers | Notes |
|---------|--------------|-------|
| **Global coherence** | Glosser & Deser (via Fraser2015) | Macro-level thematic maintenance across discourse |
| **Propositional density (idea density)** | Snowdon1996, Ahmed2013 | Ideas per 10 words; predictive decades before onset (Nun Study) |
| **Active Data Representation (ADR)** | Martinc2021 | Temporal integration of text and acoustic features at word/sentence level |
| **Phonological paraphasia rate** | Szatloczki2015, Toth2018 | Distinct from semantic paraphasia; indicates different neural substrate |
| **Empty speech proportion** | Nicholas1985 (via Fraser2015) | Words/utterances conveying no information |

---

## 2. ACOUSTIC GAP (V3 has ZERO audio features)

This is the single largest gap in V3. Multiple papers demonstrate that acoustic features alone achieve 78-85% accuracy, and combining them with linguistic features pushes accuracy to 90%+.

### 2.1 Temporal/Prosodic Features (HIGH PRIORITY)

| Feature | Source Papers | Effect Size / Accuracy |
|---------|--------------|----------------------|
| **Speech tempo (syllables/sec)** | Toth2018, Szatloczki2015, Hoffmann2010 | Most significant temporal feature; distinguishes MCI from controls at 80% |
| **Articulation rate** | Toth2018, Szatloczki2015 | Speech tempo excluding pauses |
| **Hesitation ratio** | Toth2018, Szatloczki2015 | Proportion of hesitation time to total speech time |
| **Silent pause count and duration** | Toth2018, Pistono2016, Young2024 | Between-utterance pauses correlate with tau PET; within-utterance pauses with lexical retrieval |
| **Filled pause count and duration** | Toth2018, Ahmed2013 | "um," "uh" patterns differ; Fraser2015 notes uh/um serve different functions |
| **Between-utterance vs. within-utterance pause ratio** | Pistono2016 | Critical distinction: between-utterance pauses reflect memory retrieval (BA10), within-utterance pauses reflect lexical access |
| **Pause-per-utterance ratio** | Toth2018 | Normalized pause density |
| **Length of utterance (acoustic)** | Toth2018 | Duration-based utterance measurement |
| **Phonation rate** | Fraser2015 | Proportion of vocalized time; low values = more silent pauses |
| **Speaking ratio** | Lopez_de_Ipina2013 | Proportion of active speech to total recording |
| **Number of voice breaks** | Meilan2014 (via Fraser2015) | Among top 5 discriminating acoustic features |
| **Percentage of voice breaks** | Meilan2014 (via Fraser2015) | Most discriminating single acoustic feature (84.8% accuracy with temporal+acoustic alone) |

### 2.2 Spectral/Voice Quality Features

| Feature | Source Papers | Notes |
|---------|--------------|-------|
| **MFCCs (1-42, mean/var/skew/kurtosis)** | Fraser2015, Lopez_de_Ipina2013, Martinc2021 | Near-ubiquitous in speech research; encode vocal tract characteristics |
| **MFCC velocity features** | Fraser2015 | Kurtosis of MFCC velocity captures dynamic articulation changes |
| **Shimmer** | Meilan2014 (via Fraser2015) | Amplitude perturbation; among top 5 features |
| **Jitter** | Lopez_de_Ipina2013, Farrús2020 | Frequency perturbation |
| **Noise-to-Harmonics Ratio (NHR)** | Meilan2014 (via Fraser2015) | Voice quality measure; among top 5 features |
| **Spectral entropy** | Lopez_de_Ipina2013 | Higher in healthy controls; reduced spectral complexity in AD |
| **Spectral flatness** | Lopez_de_Ipina2013 | Std of spectral flatness discriminates MCI |
| **Spectral contrast** | Lopez_de_Ipina2013 | Mean and std both discriminative |
| **Mean energy / energy dynamics** | Lopez_de_Ipina2013 | Energy range, skewness, kurtosis of energy; among most important SHAP features |
| **Power ratio** | Lopez_de_Ipina2013 | Ratio of speech power metrics |
| **Mel-spectrogram patterns** | Lopez_de_Ipina2013 | AD patients show sparse energy bands, irregular formant structures, increased silence |
| **Delta and delta-delta features** | Lopez_de_Ipina2013, Martinc2021 | First/second derivatives of acoustic features capture temporal dynamics |
| **F0 (fundamental frequency)** | Voleti2019, Szatloczki2015 | Pitch measures and variability |
| **Formant frequencies (F1-F3)** | Voleti2019 | Articulatory correlates |
| **Zero-crossing rate** | Balagopalan2020, Voleti2019 | Basic signal characteristic |

### 2.3 Pre-trained Audio Embeddings

| Feature | Source Papers | Notes |
|---------|--------------|-------|
| **CosyVoice2 speaker embeddings** | Lopez_de_Ipina2013 | 1024-dim embeddings; AUC 0.95 for HC/MCI/AD 3-class (n=1098) |
| **Wav2Vec2 embeddings** | Kurtz2023, Bertini2022 | Pre-trained audio representations |
| **x-vector / d-vector speaker embeddings** | Voleti2019 | Speaker verification embeddings repurposed for cognitive assessment |

---

## 3. METHODOLOGY GAPS

### 3.1 ML Approaches Missing from V3

| Approach | Source Papers | Performance |
|----------|--------------|-------------|
| **BERT fine-tuning** | Balagopalan2020 | 83.3% on ADReSS test set; outperforms hand-crafted features |
| **GPT-3 text embeddings** | Agbavor2022 | Competitive with fine-tuned models; simpler pipeline |
| **LightGBM / Gradient Boosting** | Lopez_de_Ipina2013 | AUC 0.95 for 3-class (HC/MCI/AD); best among 14 classifiers |
| **Ensemble / late fusion** | Martinc2021 | 93.75% accuracy via late fusion of 3 best configurations |
| **Active Data Representation (ADR)** | Martinc2021 | Temporal integration framework for audio+text at word/sentence level |
| **Multimodal fusion (audio + text)** | Martinc2021, Balagopalan2020, Fraser2015 | Consistently outperforms single-modality |
| **Promax factor rotation** | Fraser2015 | Oblique rotation reveals 4 independent factors: semantic, acoustic, syntactic, information impairment |
| **SHAP explainability** | Lopez_de_Ipina2013, Bertini2022 | Feature importance interpretation for clinical trust |
| **Bayesian hyperparameter optimization** | Lopez_de_Ipina2013 | Superior to grid search for multi-classifier evaluation |

### 3.2 Preprocessing/Normalization Gaps

| Technique | Source Papers | Notes |
|-----------|--------------|-------|
| **Age/gender matching** | Luz2020 (ADReSS), all challenge papers | V3 must account for demographic confounds; DementiaBank is NOT matched |
| **SMOTE for class imbalance** | Lopez_de_Ipina2013 | Training-only oversampling for minority classes |
| **Z-score normalization against controls** | Ahmed2013 | Convert features to z-scores using healthy control means/SDs |
| **Composite domain scores** | Ahmed2013 | Average z-scores within linguistic domains for more robust progression tracking |
| **Feature selection via correlation** | Fraser2015 | Top-N features by Pearson correlation with diagnosis; optimal at N=35-50 |
| **Speaker-level cross-validation** | Fraser2015, all challenge papers | Critical: no speaker overlap between train/test folds |
| **ASR-based automated feature extraction** | Toth2018 | Phone-level ASR (not word-level) suffices for temporal features; F1=78.8% fully automated |

### 3.3 Elicitation Tasks

| Task | Source Papers | Notes |
|------|--------------|-------|
| **Cookie Theft picture description** | Most papers | Standard benchmark; V3 should support but also generalize |
| **Story recall (immediate + delayed)** | Toth2018, Young2024 | Delayed recall features more sensitive to early tau pathology |
| **Autobiographical discourse** | Pistono2016 | Ecological validity; between-utterance pauses reflect episodic memory |
| **Voice assistant commands** | Kurtz2023 | Naturalistic; 74.7% for 3-class from Alexa commands |
| **MMSE speech tasks** | Lopez_de_Ipina2013 | Structured tasks during standard cognitive assessment |
| **Open-ended questions** | SpeechDx2023 | Unconstrained speech for ecological validity |
| **Verbal/semantic fluency** | Szatloczki2015, multiple | Category naming; letter naming; sensitive to earliest changes |

---

## 4. WEIGHT/EFFECT SIZE CORRECTIONS

### 4.1 Published Accuracy Benchmarks

| Study | Dataset | Approach | Accuracy/AUC | Notes |
|-------|---------|----------|-------------|-------|
| Fraser2015 | DementiaBank (n=473) | 370 features, logistic regression | **81.9%** | 35 features optimal; top N=50 for factor analysis |
| Martinc2021 | ADReSS (n=156) | ADR + bag-of-ngrams ensemble | **93.75%** | State of the art on ADReSS at time |
| Balagopalan2020 | ADReSS (n=156) | Fine-tuned BERT | **83.3%** | Transfer learning outperforms hand-crafted |
| Agbavor2022 | ADReSSo | GPT-3 embeddings + SVC | **80.28%** | Zero-shot competitive with fine-tuned |
| Toth2018 | Hungarian MCI (n=86) | ASR + ML temporal features | **F1=78.8%** | Fully automated; no manual transcription |
| Lopez_de_Ipina2013 | Chinese MMSE (n=1098) | CosyVoice2 + LightGBM | **AUC=0.95** | Largest single-study sample; 3-class |
| Eyigoz2020 | Framingham (n=270) | Linguistic variables from written CTT | **AUC=0.74, Acc=0.70** | Predicts AD onset 7.6 years ahead from normal baseline |
| Amini2024 | Framingham (n=166) | NLP + LLM features from NPT audio | **Acc=78.5%, Sens=81.1%** | MCI-to-AD progression within 6 years |
| Chou2024 | Taiwanese (n=80) | 15 linguistic features + SVM/KNN/RF | **88% accuracy** | MLU and Long Pause Ratio as core indicators; improved with amyloid-beta PET |
| Young2024 | Framingham (n=238) | 5 speech markers + tau PET | Significant correlations | Speech pauses correlate with medial temporal tau even in cognitively unimpaired adults |
| Orimaye2017 | DementiaBank (n=198) | SVM with syntactic+lexical+ngram | Best AUC via combined features | Syntactic features contribute most |

### 4.2 Feature-Level Effect Sizes

- **Between-utterance pauses**: Positively correlated with episodic memory performance and negatively with BA10 grey matter density (Pistono2016)
- **Idea density**: Scores of ~6.9 in preserved cognition vs. ~5.0 in impaired; predictive decades before onset (Snowdon1996)
- **Pronoun:Noun ratio**: r=0.35 with diagnosis (Fraser2015); one of strongest single features
- **Word length**: r=-0.41 with diagnosis; AD patients use shorter words (Fraser2015)
- **Speech tempo**: Most significant temporal parameter differentiating MCI in delayed recall task (Toth2018)
- **Semantic content composite**: Significant linear decline from MCI -> mild AD -> moderate AD (F(1,8)=8.627, p<0.05) (Ahmed2013)
- **Syntactic complexity composite**: Significant linear decline (F(1,8)=12.304, p<0.01) (Ahmed2013)
- **FCSRT-IR free recall**: AUC=0.88 (95% CI: 0.86-0.92); sensitivity 0.75, specificity 0.85 at cutoff <=24 (Grober1987)

---

## 5. LONGITUDINAL INSIGHTS

### 5.1 Pre-symptomatic Markers (Years Before Diagnosis)

| Marker | Lead Time | Source |
|--------|-----------|-------|
| **Idea density in early life** | 50-60 years | Snowdon1996 (Nun Study) |
| **Written linguistic variables (CTT)** | 7.6 years mean | Eyigoz2020 (Framingham) |
| **Speech during delayed recall** | Pre-clinical (tau-associated) | Young2024 |
| **Speech tempo changes** | MCI stage (years before AD) | Toth2018, Szatloczki2015 |

### 5.2 Progression Stage Patterns

**MCI Stage** (Toth2018, Ahmed2013, Szatloczki2015):
- Temporal speech parameters (tempo, pauses) already significantly different from controls
- Semantic content begins declining (detectable in 2/3 of patients)
- Syntactic complexity shows individual variation but group-level decline
- Phonetic/phonological changes present (hesitation ratio, speech tempo)

**Mild AD** (Ahmed2013, Fraser2015):
- Semantic content significantly below controls; syntactic complexity declining
- Lexical content changes (increased pronouns, decreased nouns)
- Information unit production drops
- 4 independent factors emerge: semantic, acoustic, syntactic, information impairment (Fraser2015)
- Factors are weakly correlated, indicating heterogeneous decline patterns

**Moderate AD** (Ahmed2013):
- All linguistic composites significantly impaired
- Significant linear trends: semantic content, syntactic complexity, lexical content
- Speech production and fluency errors do NOT show significant linear decline
- Efficiency (information per second) drops markedly

### 5.3 Key Longitudinal Finding

Ahmed2013 (autopsy-confirmed) found that composite scores per linguistic domain track disease more reliably than individual measures, which fluctuate between sessions. **Recommendation for V4**: Use domain-level composite scores rather than individual features for longitudinal tracking.

### 5.4 Heterogeneity

Fraser2015's promax factor analysis reveals that semantic and syntactic impairments are only weakly correlated in AD (R=0.19), meaning patients decline asymmetrically. V4 should model individual profiles rather than assuming uniform decline. The four factors (semantic, acoustic, syntactic, information) should be scored independently.

---

## 6. DATASET CONSIDERATIONS

### 6.1 Key Datasets

| Dataset | Language | Size | Matched? | Notes |
|---------|----------|------|----------|-------|
| **DementiaBank Pitt Corpus** | English | 473 sessions (167 AD, 97 controls) | NOT matched for age/education | Most-used; but confounded by demographics |
| **ADReSS** (INTERSPEECH 2020) | English | 156 (78+78) | Age/gender matched | First standardized benchmark; acoustic pre-processing |
| **ADReSSo** (INTERSPEECH 2021) | English | Audio-only version | Age/gender matched | No transcripts provided; tests fully automated pipelines |
| **Framingham Heart Study** | English | 270+ participants | Longitudinal | Written CTT; neuropsych batteries; PET imaging |
| **OPTIMA** (Oxford) | English | Small (n~36) | Longitudinal with autopsy | Gold standard pathological confirmation |
| **SpeechDx** | English, Spanish | Up to 3,000 | Longitudinal | Blood biomarkers + MRI + quarterly speech; expected 2028 |
| **MultiConAD** | EN, ES, ZH, EL | 16 unified datasets | Varies | First multilingual unified dataset; 3-class (HC/MCI/AD) |
| **Sichuan-Chongqing MMSE** | Chinese (Mandarin/Sichuan) | 1,098 | Age-matched | Largest single-study; dialect-robust; MMSE speech tasks |
| **Hungarian MCI corpus** | Hungarian | 86 (48 MCI, 38 controls) | Matched | Film recall + question tasks |
| **TAUKADIAL Challenge** | Chinese, English | Multi-site | Challenge format | Speech as marker of cognitive function globally |
| **SPGC Challenge** | English, Greek | Multi-site | Challenge format | Cross-linguistic transferability of speech features |

### 6.2 Cross-Linguistic Considerations

- **Shakeri2025 (MultiConAD)**: Some languages benefit from multilingual training; others perform better independently. No universal cross-linguistic model yet exists.
- **Lopez_de_Ipina2013**: Sichuan dialect speech successfully processed; CosyVoice2 embeddings showed dialect robustness. Cross-linguistic models require dialect-aware preprocessing.
- **Szatloczki2015**: Hungarian temporal features are comparable to English findings; temporal/prosodic features may be more language-universal than lexical features.
- **Toth2018**: ASR-based approach for Hungarian demonstrated phone-level segmentation suffices for temporal features, suggesting language-agnostic temporal analysis is feasible.
- **Key insight**: Temporal/acoustic features generalize better across languages than lexical/semantic features. V4 should weight acoustic features more heavily in multilingual deployment.

### 6.3 Demographic Considerations

- **Gender**: Fraser2015's DementiaBank has ~2:1 female:male ratio (uncontrolled). ADReSS corrects this. V4 must normalize for gender effects on speech.
- **Education**: Strong confound; years of education correlate with linguistic complexity independently of disease. Grober1987 found education effects on FCSRT-IR item difficulty. V4 needs education-adjusted norms.
- **Age**: ADReSS matched; DementiaBank NOT matched (AD group ~6 years older). Young2024 showed tau-speech correlations across ages 32-75, suggesting speech markers work across adulthood.
- **Race/Ethnicity**: Grober1987 noted differential item functioning for African American vs. Caucasian participants on FCSRT-IR. V4 needs culturally appropriate norms.
- **APOE genotype**: Snowdon1996 found APOE2 frequency of 30% in asymptomatic AD vs. 3.3% in symptomatic AD. Genetic risk modifies expected cognitive-linguistic profiles.

---

## 7. V4 PRIORITY RECOMMENDATIONS

### CRITICAL (Must-have for V4)

1. **Add acoustic feature extraction pipeline** (MFCCs, spectral, temporal, prosodic) -- currently the largest single gap
2. **Add between-utterance pause analysis** with distinction from within-utterance pauses (Pistono2016, Young2024)
3. **Add psycholinguistic norms** (imageability, familiarity, AoA) for lexical analysis (Fraser2015)
4. **Add LLM-based text embeddings** (GPT/BERT) for transcript-level classification (Agbavor2022, Balagopalan2020)
5. **Add age/gender/education normalization** to all features
6. **Add domain-level composite scoring** (semantic, syntactic, lexical, acoustic, information) following Ahmed2013

### HIGH PRIORITY

7. **Add Yngve depth and parse-tree metrics** for syntactic complexity beyond MLU
8. **Add MATTR** as length-independent TTR replacement
9. **Add cosine-distance repetitiveness measure** (Fraser2015)
10. **Add information unit scoring** aligned with Cookie Theft standards (23 units per Croisile1996)
11. **Add ensemble/fusion methods** combining acoustic + linguistic features (Martinc2021)
12. **Add SHAP/LIME explainability** for clinical interpretability (Bertini2022, Lopez_de_Ipina2013)

### MEDIUM PRIORITY

13. **Add voice assistant interaction analysis** capability (Kurtz2023)
14. **Add story recall task support** beyond picture description (Toth2018, Young2024)
15. **Add multilingual framework** with language-specific and universal feature sets (Shakeri2025)
16. **Support longitudinal tracking** with composite score trends and progression prediction (Ahmed2013, Amini2024)
17. **Add phonological paraphasia detection** separate from semantic paraphasia

### RESEARCH PRIORITY

18. **Validate against tau PET** not just amyloid (Young2024 finding is novel and important)
19. **Integrate with blood biomarkers** following SpeechDx model (Kourtis2023)
20. **Develop preclinical detection** from cognitively normal baseline (Eyigoz2020 model)

---

## 8. PAPERS WITH EXTRACTION ERRORS

The following files contained incorrectly extracted PDFs (non-Alzheimer's content):

- `2001_kemper2001.md` -- Atrial fibrillation quality of life study
- `2015_konig2015.md` -- TiO2/ZrO2 nanofibers materials science paper
- `2016_yancheva2016.md` -- Event nugget detection RNN paper
- `2018_mueller2018.md` -- Drosophila ribosomal protein regulation
- `2020_delafuente2020.md` -- Dietary assessment speech recording SLR
- `2020_yuan2020.md` -- Krylov space operator complexity physics paper
- `2021_gauder2021.md` -- Cellular network radio propagation CNN paper
- `2021_pappagari2021.md` -- Text line segmentation unsupervised learning
- `2023_li2023.md` -- Lithium metal battery pressure study
- `2023_robin2023.md` -- Heart failure gene therapy barriers
- `2020_haider2020.md` -- Correct topic (multi-modal AD detection) but same paper as `2023_vrahatis2023.md`
- `2022_nagumo2022.md` -- Same paper content as `2022_bertini2022.md` (XAI review)

These should be re-downloaded with correct PDFs for complete V4 analysis. The remaining ~27 papers provided substantive content for this synthesis.
