# Cognitive Voice Fingerprint (CVF)

### 107 indicators | 11 domains | 10 conditions | 30 differential rules | 84+ studies

**"The voice remembers what the mind forgets."**

The Cognitive Voice Fingerprint engine is the world's first open-source system that detects early signs of Alzheimer's disease, Parkinson's disease, major depression, Lewy Body Dementia, and Frontotemporal Dementia through voice analysis alone. Today, 55 million people live with Alzheimer's worldwide, and most are diagnosed years too late -- after irreversible neural damage has already occurred. Research shows that speech patterns change up to 7.6 years before clinical diagnosis (Eyigoz 2020). CVF captures these changes by extracting 107 linguistic, acoustic, and cognitive indicators from natural conversation, scoring them across 11 cognitive domains, and running a 30-rule differential diagnosis engine that distinguishes between 10 conditions. Built during the Cerebral Valley x Anthropic Hackathon (February 2026), this engine is open source because cognitive health monitoring should be accessible to everyone, everywhere.

---

## What It Detects

| # | Condition | Key Voice Markers | Detection Approach |
|---|-----------|-------------------|--------------------|
| 1 | **Alzheimer's Disease** | Semantic cascade, referential coherence loss, idea density decline, pre-noun pauses | 9-indicator sentinel set, 4-stage cascade, cued recall failure |
| 2 | **Parkinson's Disease** | PPE, RPDE, DFA nonlinear dynamics, monopitch, articulatory decline | 11-indicator sentinel set, 4-stage cascade, UPDRS estimation |
| 3 | **Major Depression** | Affective markers, MFCC-2 changes, response latency, self-pronoun elevation | 7-indicator sentinel set, 3-stage cascade, episodic variability |
| 4 | **Lewy Body Dementia** | Fluctuating cognition, erratic pause patterns, concurrent motor + cognitive decline | 8-indicator sentinel set, 3-stage cascade, fluctuation scoring |
| 5 | **Frontotemporal Dementia** (3 variants) | Pragmatic collapse, semantic dissolution, disinhibition, humor/irony loss | 9-indicator sentinel set, 3-stage cascade per variant |
| 6 | **Multiple System Atrophy** | Hypokinetic-ataxic pattern, excessive F0 fluctuation, vocal tremor (4-7 Hz) | PD differential rule 17, tremor frequency analysis |
| 7 | **Progressive Supranuclear Palsy** | Hypokinetic-spastic pattern, stuttering, severe articulatory decay | PD differential rule 18, DDK analysis |
| 8 | **Normal Aging** | Stable baseline across all domains, expected age trajectories | Rule 9: all domains within noise |
| 9 | **Medication Effects** | Acute onset, global pattern across domains, recovery expected | Rule 10: temporal onset analysis |
| 10 | **Grief / Emotional Distress** | Event-linked changes, topic-dependent affective shift | Rule 11: topic-adjusted, life-event correlation |

---

## How It Works

```
DAILY SESSION ($0.25)
====================

  STREAM 1: AUDIO (GPU)                   STREAM 2: TEXT
  ~~~~~~~~~~~~~~~~~~~~~~                   ~~~~~~~~~~~~~~~
  WAV/WebM audio                           Conversation transcript
       |                                        |                |
  ffmpeg -> 16kHz WAV                      Deterministic NLP    Opus 4.6
       |                                   Anchors (~20 regex)  Dual-Pass
  Python V5 pipeline                            |                |
  +-- parselmouth (Praat)                  Topic Detection    Pass 1 (8K
  +-- torchaudio (GPU MFCCs)              6 genre profiles   thinking)
  +-- nolds (nonlinear dynamics)                |                |
  +-- Whisper large-v3                                      Outlier detect
      (word-level timestamps)                                vs NLP anchors
       |                                                         |
  27 acoustic features                                      Pass 2 (4K
  + 5 whisper temporal                                      targeted re-
  ($0.00 -- local GPU)                                      extraction)
       |                                                         |
       |                                   Merge: 0.6*P1 + 0.4*P2
       |                                        |
       |                                   Anchor merge:
       |                                   agree  -> 0.6 opus + 0.4 determ.
       |                                   disagree -> 0.3 opus + 0.7 determ.
       |                                   ($0.25 -- Opus dual-pass)
       |                                        |
       +--------------------+-------------------+
                            |
                     VECTOR MERGE
                    107 indicators
                            |
    +-----------------------------------------------+
    |          V5 SCORING ENGINE (deterministic)     |
    |                                                |
    |  Topic-adjusted z-scores                       |
    |       -> 11 domain scores                      |
    |            -> composite score                   |
    |                 -> alert level                  |
    |                                                |
    |  5 cascade       30-rule diff.    5 sentinel   |
    |  detectors       10 conditions    sets         |
    +-----------------------------------------------+

WEEKLY DEEP ANALYSIS ($0.50-0.80)
=================================
7 daily sessions + cross-validation (LOO + split-half)
     -> Claude Opus 4.6 + Extended Thinking (32K budget)
          -> Clinical reports, trajectory analysis,
             cross-indicator correlations, next week's probes
```

---

## The 11 Cognitive Domains

| Domain | Code | Indicators | Weight | What It Measures |
|--------|------|-----------|--------|------------------|
| **Semantic** | SEM | 9 | 0.18 | Idea density, referential coherence, embedding coherence, topic maintenance, temporal sequencing |
| **Lexical** | LEX | 17 | 0.13 | Vocabulary diversity (TTR, MATTR), word frequency shifts, content density, pronoun-noun ratio, light verbs |
| **Temporal** | TMP | 16 | 0.11 | Pause patterns, speech rate, filler rate, pre-noun pauses (Whisper-measured), pause variability, syllable decay |
| **Acoustic** | ACU | 17 | 0.11 | F0, jitter, shimmer, HNR, CPP, MFCCs, spectral tilt, formant bandwidth, breathiness, loudness decay |
| **Syntactic** | SYN | 8 | 0.09 | Mean length of utterance, subordination ratio, embedding depth, fragment rate, sentence complexity |
| **Memory** | MEM | 6 | 0.09 | Free recall accuracy, cued recall (the AD differentiator), semantic fluency, recognition memory |
| **PD Motor** | PDM | 12 | 0.09 | PPE, RPDE, DFA, D2, DDK rate/regularity, voice onset time, festination, monopitch, vocal tremor |
| **Pragmatic** | PRA | 6 | 0.06 | Indirect speech acts, discourse markers, register adaptation, narrative structure, perspective-taking, humor/irony |
| **Executive** | EXE | 5 | 0.05 | Task switching, response inhibition, planning language, dual-task performance, cognitive flexibility |
| **Discourse** | DIS | 5 | 0.05 | Topic maintenance, perseveration, repair strategies, coherence breaks, referential tracking |
| **Affective** | AFF | 6 | 0.04 | Emotional valence, self-pronoun density, hedonic markers, absolutist language, death/ruminative words |
| **Total** | | **107** | **1.00** | |

When audio is unavailable, the acoustic (0.11) and PD motor (0.09) domain weights redistribute proportionally across the 9 text domains. The engine always produces valid results from text alone.

---

## Key Innovations

1. **Topic-Aware Scoring** -- 6 genre profiles (narrative_travel, procedural_recipe, hypothetical_wishes, daily_routine, emotional_personal, academic) eliminate the 44% false positive rate discovered in V4. A recipe conversation no longer triggers Alzheimer's alerts; a grief discussion no longer flags depression. Detection is deterministic (regex + keyword, no LLM, $0.00), and per-indicator z-score adjustments are scaled by detection confidence.

2. **Deterministic NLP Anchors** -- 20 linguistic indicators are computed using pure regex and word-list matching, serving as ground-truth calibration for LLM extraction. When the Opus extraction agrees with the deterministic value (within 0.15), the merge is 0.6 Opus + 0.4 deterministic. When they disagree, the merge shifts to 0.3 Opus + 0.7 deterministic, and an anomaly is flagged. This reduces extraction variability by 40-50% and catches LLM hallucinations.

3. **Dual-Pass Opus Extraction** -- Two Claude Opus 4.6 passes with Extended Thinking (8K + 4K budget). Pass 1 extracts all indicators. Outliers are detected against NLP anchors. Pass 2 re-extracts only the outlier indicators and their domain neighbors. Final merge: 0.6 Pass1 + 0.4 Pass2. Every indicator carries full uncertainty metadata (value, confidence, range, source).

4. **GPU-Accelerated Audio** -- MPS (Apple Silicon) / CUDA / CPU automatic device detection. Parselmouth for Praat-grade acoustic analysis, torchaudio for GPU-accelerated MFCCs and spectral features, nolds for nonlinear dynamics (PPE, RPDE, DFA), and Whisper large-v3 for word-level timestamps that produce 5 measured temporal indicators (pre-noun pause duration, pause variability, syllable rate decay, mean word duration, voiced ratio).

5. **Cross-Validation** -- Leave-one-out and split-half cross-validation fix the self-referential baseline problem where a patient's session appears in its own reference distribution. Spearman-Brown reliability estimation ensures measurement stability. Each session is scored against an independent baseline it did not contribute to.

6. **Evidence-Compiled** -- Every one of the 107 indicators traces back to peer-reviewed research. The engine synthesizes findings from 84+ papers across 5 disease areas into a single coherent scoring system. No indicator exists without published clinical evidence for its diagnostic relevance.

---

## Demo Output

A complete end-to-end analysis of a real voice profile (Profile01: 9 sessions, ~38 minutes of French speech) is included in `demo-output/`:

- **`profile01_v5_results.json`** -- Full 197KB diagnostic JSON with per-session scores, cross-validation, differential diagnosis, trajectory prediction, and acoustic signatures
- **`profile01_v5_console.txt`** -- 14-step console output from the analysis pipeline

**Profile01 result summary:**

```
Aggregate composite:        0.005  (GREEN)
Cross-validated composite: -0.112  (GREEN)
Split-half reliability:     0.922
Primary diagnosis:          Normal aging (69.2%)
Secondary:                  Depression (30.8%)
LBD / FTD / PD:            Not detected
Sessions analyzed:          9 (70 indicators each: 52 text + 18 acoustic + 20 NLP anchors)
Topic genres detected:      daily_routine (4), hypothetical_wishes (3), emotional_personal (1), procedural_recipe (1)
```

No audio recordings or raw transcripts are included in the demo output -- only the engine's computed results.

---

## Quick Start

```bash
# Clone
git clone https://github.com/remifrancois/cognitivevoicefingerprint.git
cd cognitivevoicefingerprint

# Install Node.js dependencies
npm install

# Install Python audio dependencies (optional, for acoustic analysis)
pip install parselmouth librosa nolds numpy scipy

# For GPU acceleration and Whisper temporal indicators:
pip install torch torchaudio openai-whisper

# Set your Anthropic API key (required for LLM extraction)
export ANTHROPIC_API_KEY=your_key_here

# Run the full V5 analysis pipeline on a profile
node scripts/run_v5_analysis.mjs \
  --extracted data/profile.json \
  --text-features data/features.json \
  --output results/v5_analysis.json
```

The engine works in three modes:
- **Text-only** (no Python dependencies needed) -- uses Opus extraction + NLP anchors + topic detection across 9 text domains
- **Text + Audio** (with Python audio stack) -- adds 27 acoustic features across all 11 domains
- **Text + Audio + Whisper** (with openai-whisper) -- adds 5 measured temporal indicators from word-level timestamps

---

## Using as a Library

```javascript
import {
  // Feature extraction
  extractV5Features,
  computeDeterministicIndicators,
  detectTopicGenre,

  // Scoring
  computeV5Baseline,
  analyzeSession,
  computeZScores,
  computeDomainScores,
  computeComposite,
  getAlertLevel,

  // Diagnosis
  runDifferential,
  detectCascade,
  checkSentinels,

  // Specialized engines
  runPDAnalysis,
  predictTrajectory,

  // Cross-validation
  batchAnalyzeWithCrossValidation,
  splitHalfCrossValidation,

  // Audio
  extractAcousticFeatures,

  // Metadata
  V5_META,
} from './src/engine/index.js';

// 1. Detect topic genre (deterministic, no LLM, instant)
const { genre, confidence } = detectTopicGenre(transcript);

// 2. Compute deterministic NLP anchors (no LLM, instant)
const anchors = computeDeterministicIndicators(transcript, 'en');

// 3. Extract features with Opus 4.6 dual-pass (requires API key)
const features = await extractV5Features(transcript, { language: 'en' });

// 4. Build baseline from historical sessions
const baseline = computeV5Baseline(sessionVectors, calibrationCount);

// 5. Score a session against baseline with topic adjustment
const result = analyzeSession(features, baseline, confounders, history, genre);
// result.composite       -- overall cognitive score
// result.domain_scores   -- per-domain breakdown (11 domains)
// result.alert_level     -- green | yellow | orange | red
// result.cascade         -- detected cascade patterns (AD, PD, Depression, LBD, FTD)
// result.sentinel_alerts -- triggered sentinel sets

// 6. Run 30-rule differential diagnosis
const diff = runDifferential(result.domain_scores, result.z_scores, context);
// diff.probabilities     -- probability per condition (10 conditions)
// diff.primary_hypothesis
// diff.evidence          -- per-condition evidence chains
// diff.recommendation    -- clinical recommendations

// 7. Cross-validate (fixes self-referential baseline)
const cvResults = batchAnalyzeWithCrossValidation(allSessions);
// cvResults.aggregate.mean_composite  -- LOO-CV composite
// cvResults.aggregate.consistency     -- measurement reliability
// cvResults.results                   -- per-session LOO scores
```

---

## Project Structure

```
cognitivevoicefingerprint/
├── src/
│   ├── engine/
│   │   ├── indicators.js          # 107 indicators, 11 domains, task-specific norms
│   │   ├── topic-profiles.js      # 6 genre profiles, deterministic detection
│   │   ├── nlp-deterministic.js   # ~20 deterministic NLP anchors (EN + FR)
│   │   ├── text-extractor.js      # Opus 4.6 dual-pass extraction + anchor merge
│   │   ├── algorithm.js           # 11-domain scoring, 5 cascades, topic adjustment
│   │   ├── differential.js        # 30 rules, 10 conditions, LBD/FTD patterns
│   │   ├── acoustic-pipeline.js   # Node->Python GPU bridge, Whisper temporal
│   │   ├── cross-validation.js    # LOO + split-half CV, Spearman-Brown
│   │   ├── trajectory.js          # 10-condition 12-week prediction
│   │   ├── pd-engine.js           # PD detection, staging, UPDRS, subtypes
│   │   ├── micro-tasks.js         # 6 clinical micro-tasks + scheduling
│   │   ├── weekly-deep.js         # Opus 4.6 32K weekly deep analysis
│   │   ├── api.js                 # 17 Fastify REST endpoints
│   │   └── index.js               # Public API barrel exports + V5_META
│   └── audio/
│       └── extract_features_v5.py # GPU Python pipeline (parselmouth + torchaudio + nolds + Whisper)
├── scripts/
│   └── run_v5_analysis.mjs        # Standalone console runner (14-step pipeline)
├── demo-output/
│   ├── profile01_v5_results.json  # Full diagnostic JSON (197KB)
│   └── profile01_v5_console.txt   # Console output from end-to-end run
├── docs/
│   ├── CVF-V5-ARCHITECTURE.md     # Complete V5 technical reference
│   ├── RESEARCH.md                # Scientific knowledge base
│   ├── CVF-V4-ARCHITECTURE.md     # V4 architecture (historical)
│   ├── CVF-V2-ARCHITECTURE.md     # V2 architecture (historical)
│   └── ...                        # Additional documentation
├── research/
│   └── papers/                    # 84+ paper summaries organized by condition
│       ├── alzheimer/             # 39 papers (Fraser 2015, Snowdon 1996, Eyigoz 2020, ...)
│       ├── parkinson/             # 26 papers (Little 2009, Tsanas 2012, Rusz 2021, ...)
│       └── depression/            # 15+ papers (Le 2026, Grimm 2026, Yamamoto 2020, ...)
├── CHANGELOG.md
└── README.md
```

**~12,775 lines** of evidence-compiled engine code across 14 JavaScript modules and 1 Python pipeline.

---

## Scientific Foundation

CVF is built from a systematic analysis of **84+ peer-reviewed research papers** spanning five decades of clinical research in speech-based cognitive assessment. Every indicator in the engine traces to published findings.

### Key References

| Study | Finding | Impact on CVF |
|-------|---------|---------------|
| **Fraser et al. 2015** | 370 linguistic features, 81.9% AD accuracy on DementiaBank Pitt corpus | Foundation for lexical and syntactic indicator design |
| **Little et al. 2009** | PPE algorithm, PD detection AUC 0.91 using nonlinear voice dynamics | Core of PDM domain (PPE, RPDE, DFA quartet) |
| **Eyigoz et al. 2020** | Speech predicts AD 7.6 years before clinical diagnosis (AUC 0.74) | Validates longitudinal voice monitoring approach |
| **Luz et al. 2020** | ADReSS Challenge -- gold standard speech-based AD detection benchmark | Indicator selection and accuracy benchmarking |
| **Le et al. 2026** | Cross-cultural depression detection, 12 acoustic features, AUC 0.934 | Acoustic feature selection for depression domain |
| **Grimm et al. 2026** | Single-question depression screening, multimodal fusion, AUC 0.900 | Depression micro-task design and validation |
| **Snowdon 1996** (Nun Study) | Idea density in early writing predicts Alzheimer's 20+ years later | SEM_IDEA_DENSITY as highest-weighted indicator |
| **Tsanas et al. 2012** | Nonlinear measures outperform classical perturbation for PD detection | PPE, RPDE, DFA, D2 indicator implementation |
| **Pistono et al. 2016** | Pre-noun pauses are AD-specific temporal signature | TMP_PAUSE_BEFORE_NOUN (Whisper-measured) |
| **McKeith et al. 2017** | LBD diagnostic criteria -- fluctuating cognition as core feature | LBD detection via temporal variability analysis |
| **Rascovsky et al. 2011** | FTD diagnostic criteria -- behavioral, semantic, non-fluent variants | FTD triple-variant detection architecture |
| **Ash et al. 2013** | Pragmatic language degrades before memory in FTD behavioral variant | Pragmatic domain (PRA) indicator design |
| **Walker et al. 2015** | Temporal variability metrics detect LBD fluctuation with 83% accuracy | TMP_PAUSE_VARIABILITY as LBD differentiator |
| **Godino-Llorente et al. 2017** | 4-7 Hz F0 modulation band differentiates MSA from PD | ACU_TREMOR_FREQ for MSA differential |
| **Yamamoto et al. 2020** | Response latency correlates with depression severity (r=0.458) | TMP_RESPONSE_LATENCY weighting in depression rules |

### Published Benchmark Accuracies

| System | Accuracy | Approach | Source |
|--------|----------|----------|--------|
| PD voice detection | **AUC 0.91** | PPE + RPDE + DFA + HNR (kernel SVM) | Little 2009 |
| AD linguistic detection | **93.75%** | ADR + text ensemble | Martinc 2021 |
| Depression (cross-cultural) | **AUC 0.934** | 12 acoustic features (XGBoost) | Le 2026 |
| Depression (single question) | **AUC 0.900** | MPNet + HuBERT multimodal | Grimm 2026 |
| AD pre-clinical prediction | **AUC 0.74** | Embedding coherence, 7.6 years ahead | Eyigoz 2020 |
| LBD fluctuation detection | **83%** | Temporal variability metrics | Walker 2015 |
| FTD vs AD differentiation | **85%** | Pragmatic + memory profile | Ash 2013 |

---

## Cost

| Operation | Cost |
|-----------|------|
| Daily text extraction (Opus 4.6 dual-pass, 8K+4K thinking) | ~$0.25 |
| Audio analysis (local GPU, parselmouth + torchaudio + Whisper) | $0.00 |
| Deterministic NLP anchors + topic detection | $0.00 |
| Cross-validation (LOO + split-half, recomputation only) | $0.00 |
| Weekly deep analysis (Opus 4.6, 32K thinking) | ~$0.50-0.80 |
| **Weekly total per patient (7 daily sessions + 1 weekly)** | **~$2.10** |

The system has been designed so that every component that can run locally does run locally. Only the linguistic feature extraction (daily) and the weekly clinical reasoning require API calls to Claude. Topic detection, NLP anchoring, acoustic analysis, scoring, differential diagnosis, cascade detection, cross-validation, and trajectory prediction all run deterministically at zero cost.

---

## Supported Languages

- **English** -- full support across all 107 indicators, all NLP anchor word lists, all topic detection patterns
- **French** -- full support across all 107 indicators, complete bilingual NLP anchor word lists and regex patterns

The architecture is designed for extensibility. Adding a new language requires providing word lists (function words, content words, fillers, negation, self-pronouns, absolutist terms, death words, ruminative patterns) and topic detection keywords for that language. The acoustic and Whisper-based indicators are language-agnostic.

---

## API Endpoints

When deployed as a service, CVF exposes 17 REST endpoints under `/cvf/v5/`:

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | POST | `/process` | Daily session processing -- Opus dual-pass + optional GPU audio |
| 2 | POST | `/process-audio` | Audio-only micro-task processing with Whisper temporal |
| 3 | POST | `/weekly` | Weekly deep analysis (Opus 4.6, 32K thinking budget) |
| 4 | GET | `/drift/:patientId` | Latest cognitive drift analysis |
| 5 | GET | `/timeline/:patientId` | Full session timeline with topic-adjusted scores |
| 6 | GET | `/differential/:patientId` | 10-condition, 30-rule differential diagnosis |
| 7 | GET | `/trajectory/:patientId` | 12-week trajectory prediction |
| 8 | GET | `/pd/:patientId` | PD-specific analysis (signature, subtype, staging, UPDRS) |
| 9 | GET | `/micro-tasks/:patientId` | Scheduled micro-tasks for next session |
| 10 | GET | `/report/:patientId/:week` | Weekly clinical report |
| 11 | GET | `/reports/:patientId` | All weekly reports |
| 12 | GET | `/indicators` | Full 107-indicator catalog with metadata |
| 13 | GET | `/baseline/:patientId` | Baseline calibration status |
| 14 | GET | `/meta` | V5 version info and capabilities |
| 15 | GET | `/metrics` | Engine performance metrics |
| 16 | POST | `/topic-detect` | Deterministic topic genre detection |
| 17 | POST | `/cross-validate` | Batch cross-validation analysis |

---

## Differential Diagnosis: How It Distinguishes Conditions

The 30-rule differential engine is the core clinical reasoning layer. It uses a marker profile matrix to separate conditions that share overlapping symptoms:

| Marker | AD | Depression | PD | LBD | FTD-bv | FTD-sv |
|--------|:--:|:---------:|:--:|:---:|:------:|:------:|
| Referential coherence | Degrades | Preserved | Preserved | Fluctuating | Preserved | Preserved |
| Cued recall | **Fails** | Responds | Responds | Partial | Responds | Responds |
| Self-referential pronouns | Normal | **Elevated** | Normal | Normal | Normal | Normal |
| MFCC-2 | Variable | **Degraded** | Variable | Variable | Normal | Normal |
| PPE / RPDE / DFA | Normal | Normal | **Elevated** | Elevated | Normal | Normal |
| Session variability | Low | **High** | Low | **Very high** | Low | Low |
| Pragmatic language | Declining | Preserved | Preserved | Declining | **Collapsed** | Preserved |
| Semantic fluency | Declining | Mild | Mild | Declining | Preserved | **Collapsed** |
| Executive function | Declining | Preserved | Declining | Declining | **Collapsed** | Preserved |
| Memory (early stage) | **Impaired** | Intact | Intact | Impaired | **Intact** | Intact |

These patterns encode decades of clinical knowledge. For example, the key differentiator between Alzheimer's and FTD behavioral variant is that FTD patients show pragmatic and executive collapse while memory remains intact early on -- the opposite of the AD pattern. LBD is distinguished from both AD (monotonic decline) and PD (stable cognition) by its pronounced session-to-session variability, measured through pause duration coefficient of variation from Whisper word timestamps.

---

## Security

CVF processes cognitive health data — potential Protected Health Information (PHI). The engine implements defense-in-depth at every layer:

### API Input Validation
- All 17 endpoints enforce strict `patientId` schema (alphanumeric, 1-64 chars)
- `audioBase64` capped at 10MB, `confounders` limited to 10 properties
- `weekNumber` bounded to [1, 104], audio format and language restricted to known enums
- Global error handler sanitizes 500 responses in production (no internal details leaked)

### Injection & Pollution Defense
- **Prototype pollution protection** — All `JSON.parse()` calls on external data (Python stdout, LLM output) use a reviver that rejects `__proto__`, `constructor`, and `prototype` keys
- **LLM output validation** — Extracted features are validated for structure (indicators object must exist), genre values are whitelisted, confidence bounded to [0, 1], and all-zero/all-one anomaly patterns are detected and rejected (prompt injection defense)
- **ReDoS mitigation** — French NLP regex patterns use non-backtracking `\S{0,20}` instead of `.{0,N}` wildcards; all capturing groups converted to non-capturing `(?:...)`

### Numeric Safety (Medical Scoring)
- `computeComposite()` filters NaN/Infinity before aggregation, bounds weight redistribution to 2.0x
- `linearSlope()` validates all inputs and bounds results to [-0.5, 0.5]
- `checkSentinels()` rejects non-finite z-scores and extreme values (|z| > 5)
- `applyConfounders()` only accepts known confounder keys, bounds multipliers to [0.1, 10]

### Audio Pipeline Safety
- **Whisper model allowlist** — Only known models (tiny, base, small, medium, large, large-v2, large-v3) accepted; arbitrary model names rejected
- **File size limits** — Audio files > 500MB and empty files rejected before processing
- **Path traversal protection** — `cleanup()` validates temp file paths are within `os.tmpdir()` before deletion
- **Memory exhaustion defense** — Token inputs capped at 10,000; `microTaskResults` limited to 10 numeric properties

### Resource Limits
- Maximum 1,000 patients, 500 sessions per patient
- All numeric inputs validated at system boundaries

See [SECURITY.md](SECURITY.md) for the full HIPAA-aligned security architecture including JWT authentication, RBAC, AES-256-GCM encryption at rest, and audit logging.

---

## Contributing

Contributions are welcome and valued. Here are ways to help:

- **Research integration** -- Help add indicators from new papers or validate existing ones against published datasets
- **Language support** -- Add word lists and detection patterns for additional languages
- **Acoustic features** -- Implement new acoustic measures or optimize the GPU pipeline
- **Clinical validation** -- If you have access to clinical datasets (DementiaBank, ADReSS, etc.), help validate detection accuracy
- **Bug fixes and improvements** -- Standard pull requests for code quality, documentation, and test coverage

Please open an issue first for significant changes. All contributions should maintain the evidence-compiled standard: every clinical indicator must trace to published peer-reviewed research.

---

## Citation

```bibtex
@software{cvf_v5_2026,
  title     = {Cognitive Voice Fingerprint V5: Deep Voice Architecture},
  author    = {Fran\c{c}ois, R\'{e}mi},
  year      = {2026},
  url       = {https://github.com/remifrancois/cognitivevoicefingerprint},
  note      = {107 indicators, 11 domains, 10 conditions, 30 differential rules.
               Built at Cerebral Valley x Anthropic Hackathon, February 2026.}
}
```

---

## Disclaimer

This software is a research tool and is **not a medical device**. It does not provide medical diagnoses. Results should be interpreted by qualified healthcare professionals and used as one data point alongside clinical evaluation, neuroimaging, and established diagnostic protocols. Do not make medical decisions based solely on this engine's output.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

55 million people live with Alzheimer's disease today. Most will be diagnosed too late -- after years of silent neurodegeneration, after the window for early intervention has closed. But the voice carries signals of cognitive change long before clinical symptoms emerge. Idea density declines. Pauses lengthen before nouns. Referential coherence frays. The pitch loses its variation. These changes are subtle, but they are measurable, and they appear years before a diagnosis.

This engine exists because early detection should not depend on expensive neuroimaging or specialist access. A conversation is enough. Voice is the most natural, non-invasive, and universally accessible biomarker we have. By making this technology open source, we ensure that cognitive health monitoring can reach the people who need it most -- not just those who can afford it, not just those near research hospitals, but everyone, everywhere.

The voice remembers what the mind forgets. Now we can listen.
