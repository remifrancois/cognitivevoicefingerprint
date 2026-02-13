# Changelog

All notable changes to the Cognitive Voice Fingerprint (CVF) engine are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Contact:** contact@alzheimervoice.org

---

## [5.2.0] - 2026-02-13

### Fixed
- **Z-score direction bug (CRITICAL)** -- The z-score polarity computation only considered AD/depression/PD when determining dominant pathological direction. LBD/FTD directions were ignored, causing incorrect z-score polarity for indicators dominated by those conditions (e.g., `EXE_INHIBITION` with FTD effect_size 0.9, all others ~0). Replaced the 3-condition nested ternary with a loop over all conditions using `effect_sizes` to pick the dominant direction from whichever condition has the strongest expected effect.

### Added — VCI Detection (11th Condition)
- **Vascular Cognitive Impairment (VCI)** added as the 11th detectable condition
- **Rule 34**: Executive dysfunction + processing speed decline + preserved episodic memory → VCI pattern
- **Rule 35**: Step-wise decline pattern (acute drops then plateau) with executive impairment → VCI step-wise progression
- VCI integrated into age-normalization dampening (Rules 31-33), excess decline domain mapping (executive/temporal), and recommendation generator
- Total conditions: 10 → **11**. Total rules: 33 → **35**

### Added — Independent Probabilities & Mixed Pathology
- **`independent_probabilities`**: sigmoid-mapped per-condition 0-1 scores that can overlap (unlike zero-sum `probabilities`), enabling detection of concurrent conditions
- **`mixed_pathology`**: boolean flag set when 2+ disease conditions exceed 0.3 independent probability
- **`elevated_conditions`**: array of conditions with elevated independent probability
- Existing zero-sum `probabilities` field preserved for backward compatibility

### Added — Deterministic NLP Anchors (5 new)
- **`PRA_DISCOURSE_MARKERS`** -- discourse marker count / utterances (EN + FR word lists)
- **`EXE_PLANNING`** -- planning constructs (if-then, because, therefore) / utterances
- **`PRA_NARRATIVE_STRUCTURE`** -- heuristic: orientation + complication + resolution presence detection
- **`PRA_INDIRECT_SPEECH`** -- hedged/indirect phrases / sentences
- **`DIS_CIRCUMLOCUTION`** -- circumlocutory phrases / content words
- All with bilingual EN+FR word lists, regex patterns, and sigmoid-mapped 0-1 scoring
- Deterministic anchor count: 20 → **25**

### Added — Confidence Propagation
- `computeZScores()` accepts `indicatorConfidence`, dampens low-confidence indicators toward 0
- `computeDomainScores()` weights indicators by confidence, computes per-domain confidence (non-enumerable `_domain_confidence` property for backward compat)
- `analyzeSession()` returns `confidence_bands` (lower/upper/mean_confidence) and `domain_confidence`

### Added — Session Quality Scoring
- New `computeSessionQuality(sessionVector, zScores, baseline, indicatorConfidence)` function
- 5 quality factors: indicator_coverage, extraction_confidence, audio_coverage, outlier_ratio, transcript_length
- Returns `{ score: 0-1, level: 'high'|'medium'|'low'|'unusable', factors }`
- Integrated into `analyzeSession()` return object
- `analyzeWeek()` now uses quality-weighted domain averaging (higher-quality sessions contribute more)

### Added — Tests
- 9 condition-specific sensitivity tests: AD, PD, Depression, FTD-bv, LBD, VCI, Normal aging profiles → each verifies correct primary hypothesis
- 2 mixed pathology tests: AD+depression and AD+LBD → verifies both elevated in `independent_probabilities`
- 3 session quality tests
- Condition count test updated: 10 → 11
- Total tests: 58 → **70** (all passing)

### Changed
- `V5_META.version`: 5.0.0 → **5.2.0**
- `V5_META.conditions_detected`: 10 → **11**
- `V5_META.differential_rules`: 30 → **35**

---

## [5.1.0] - 2026-02-13

### Added — Age-Normalization Layer
The V5.0 engine scored everything against a personal baseline with no age stratification, causing normal aging to falsely mimic disease. V5.1 adds a 4-layer age-illness separation system.

- **Age-stratified expected decline rates** -- 4 age bands (50-59, 60-69, 70-79, 80+) with per-domain annual decline rates derived from Salthouse 2004, Verhaegen 2003, Xue & Hao 2003, Kemper 2001
- **Age-adjusted acoustic offsets** -- 17 acoustic and PD motor indicators receive per-decade z-score offsets to compensate for natural voice aging (jitter, shimmer, HNR, PPE, DDK, etc.)
- **Acceleration detection (2nd derivative)** -- Normal aging produces LINEAR decline; disease produces ACCELERATING decline. `computeDeclineProfile()` now detects acceleration per domain
- **Excess decline** -- per-domain decline rate beyond age-expected rate. Only the excess triggers disease flags
- **`age_consistent` flag** -- true when decline is uniform across domains AND within age-band norms (strong anti-disease signal)

### Added — Differential Diagnosis Rules 31-33
- **Rule 31**: Uniform age-consistent decline → +0.40 normal_aging, -40% all disease scores
- **Rule 32**: Accelerating decline in 2+ domains → +0.15 to leading condition; no acceleration → -15% disease scores
- **Rule 33**: Excess decline beyond age norms → +0.05 per condition per domain; no excess → +0.20 normal_aging

### Added — Trajectory Prediction
- **Age-aware twin trajectories** -- healthy aging twin now uses age-stratified decline rates
- **12-week prediction** with condition-specific progression models for all 10 conditions
- Twin trajectory divergence quantified per age band

### Added — Tests
- 12 age-normalization tests: age bands, decline rates, excess decline, acceleration, age-consistent profiles
- Disease vs aging separation integration tests
- Total tests: 46 → **58**

### Changed
- `patientAge` parameter propagated through entire pipeline: `analyzeSession()` → `computeZScores()` → `computeDeclineProfile()` → `runDifferential()` → `predictTrajectory()`
- `analyzeWeek()` accepts `patientAge` parameter
- All backward-compatible: `patientAge = null` uses default middle-estimate rates

---

## [5.0.2] - 2026-02-13

### Security Hardening
- **API input validation** -- All 17 endpoints enforce strict `patientId` schema (alphanumeric, 1-64 chars). `weekNumber` bounded to [1, 104].
- **Prototype pollution protection** -- `JSON.parse()` in acoustic-pipeline.js and text-extractor.js uses a reviver rejecting `__proto__`, `constructor`, `prototype` keys
- **NaN/Infinity propagation defense** -- `computeComposite()` filters non-finite values, bounds weight redistribution to 2.0x. `linearSlope()` bounds results to [-0.5, 0.5]. `checkSentinels()` rejects extreme z-scores (|z| > 5).
- **Confounder whitelist** -- only known confounder keys accepted, multipliers bounded to [0.1, 10]
- **ReDoS mitigation** -- French regex patterns use non-backtracking `\S{0,20}` instead of `.{0,N}`
- **Memory exhaustion defense** -- token inputs capped at 10,000, audio at 10MB, confounders at 10 properties
- **Whisper model allowlist** -- only known models accepted (tiny through large-v3)
- **Audio file size limit** -- > 500MB and empty files rejected
- **Path traversal protection** -- cleanup validates temp paths within `os.tmpdir()`
- **LLM output validation** -- structure checks, genre whitelisting, anomaly detection
- **Error sanitization** -- generic 500 messages in production
- **Resource limits** -- MAX_PATIENTS 10,000 → 1,000; MAX_SESSIONS_PER_PATIENT 1,000 → 500

---

## [5.0.1] - 2026-02-13

### Fixed
- **NLP anchors returning constant 0.500** -- `computeDeterministicIndicators()` silently returned 0.5 for all 20 indicators when passed a string transcript instead of `[{role, text}]` array. Now accepts both formats. Highest-impact bug: the entire anchor system produced flat, uninformative values.
- **Cross-validation field access** -- console runner accessed `cvResults.mean_composite` (undefined) instead of `cvResults.aggregate.mean_composite`
- **Trajectory prediction crash** -- wrong argument order in `predictTrajectory()` call; fixed to match function signature
- **Split-half requiring 10+ sessions** -- lowered `minBaseline` to 3 for smaller profiles
- **Trajectory week display** -- fixed field accessor `week_offset` → `week`
- **Reliability display** -- fixed accessor for `shResults.reliability` object

### Added
- **Demo output** -- `demo-output/profile01_v5_results.json` (197KB) and `profile01_v5_console.txt`
- **End-to-end validation** -- Profile01 (9 sessions, ~38 minutes French): normal aging 69.2%, depression 30.8%, split-half reliability 0.922

---

## [5.0.0] - 2026-02-13 — "deep_voice"

The largest rewrite in CVF history. V5 transforms the engine from a text-only system with known false positive issues into a GPU-accelerated, topic-aware, dual-pass multimodal pipeline.

### Added — Engine Core
- **107 indicators** across **11 cognitive domains** (up from 85 / 9 in V4)
- **Pragmatic domain (PRA)** -- 6 indicators targeting FTD behavioral variant: indirect speech, discourse markers, register shift, narrative structure, perspective-taking, humor/irony
- **Executive domain (EXE)** -- 5 indicators targeting FTD and LBD: task switching, inhibition, planning, dual-task, cognitive flexibility
- **6 new acoustic indicators** -- formant bandwidth, spectral tilt, voice breaks, tremor frequency (4-7 Hz), breathiness, loudness decay
- **5 Whisper temporal indicators** -- pre-noun pause duration, pause variability, syllable rate decay, word duration mean, voiced ratio (measured from word-level timestamps)
- **LBD detection** -- fluctuating cognition + parkinsonism + concurrent cognitive decline
- **FTD detection** -- 3 variants: behavioral (pragmatic collapse), semantic (naming deficit), non-fluent (agrammatism)

### Added — Topic-Aware Scoring (eliminates 44% false positive rate)
- **6 genre profiles** -- narrative_travel, procedural_recipe, hypothetical_wishes, daily_routine, emotional_personal, academic
- **Deterministic genre detection** -- pure regex/keyword matching, no LLM, $0.00
- **Per-indicator z-score adjustments** scaled by detection confidence

### Added — Deterministic NLP Anchors
- **20 indicators** computed via regex/word-lists (TTR, MATTR, content density, pronouns, MLU, fillers, repetition, speech rate, self-pronouns, negative valence, absolutist, perseveration, generic substitution, death words, ruminative patterns)
- **Full bilingual EN+FR** word lists and regex patterns
- **Anchor merge**: agree → 0.6 Opus + 0.4 deterministic; disagree → 0.3 Opus + 0.7 deterministic

### Added — Extraction
- **Claude Opus 4.6 dual-pass** with Extended Thinking (8K + 4K)
- **Confidence intervals** per indicator
- ~$0.25/session (up from $0.07)

### Added — Audio Pipeline
- **GPU acceleration** -- MPS (Apple Silicon) / CUDA / CPU auto-detection
- **torchaudio** for GPU-accelerated MFCCs, **nolds** for nonlinear dynamics, **Whisper large-v3** for word timestamps
- **Task-specific acoustic norms** -- conversation / sustained_vowel / ddk (fixes PPE/RPDE mismatch)

### Added — Scoring & Diagnosis
- **11-domain scoring** with null-domain weight redistribution
- **5 cascade detectors** -- AD, PD, Depression, LBD, FTD
- **5 sentinel sets** -- AD (9), PD (11), Depression (7), LBD (8), FTD (9)
- **30 differential rules** across **10 conditions**
- **LOO + split-half cross-validation** with Spearman-Brown reliability
- **12-week trajectory prediction** with 10-condition progression models

### Added — Infrastructure
- **17 Fastify REST endpoints** (api.js)
- **14-step console runner** (run_v5_analysis.mjs)
- **6 micro-tasks** -- sustained vowel, DDK, category fluency, depression screen, attention fluctuation (LBD), pragmatic probe (FTD)
- **Weekly deep analysis** -- Opus 4.6 with 32K Extended Thinking budget

### Added — Documentation
- `docs/CVF-V5-ARCHITECTURE.md` (845+ lines)
- `research/papers/` -- 84+ paper summaries across alzheimer (37), parkinson (24), depression (15)

---

## [4.0.0] - 2026-02-12 — "two_stream"

First version to combine acoustic signal processing with LLM-powered linguistic analysis. Built from systematic analysis of 80 research papers.

### Added
- **85 indicators** across **9 cognitive domains** (+acoustic, +pd_motor over V3)
- **21 audio features** via Python pipeline: parselmouth (Praat-grade), librosa, nolds (PPE, RPDE, DFA, D2)
- **8 conditions** detected: AD, Depression, PD, Normal Aging, Medication, Grief, MSA, PSP
- **23 differential rules** including PD acoustic quartet (Little 2009), MSA/PSP differentiation, acoustic depression markers (Le 2026)
- **3 cascade detectors** -- AD (semantic→syntactic→temporal→discourse), PD (monopitch→phonatory→articulatory→prosodic), Depression (affective→temporal→engagement)
- **4 micro-tasks** embedded in conversation: sustained vowel, DDK /pataka/, category fluency, depression screen
- **PD-specific engine** -- signature detection, TD vs PIGD subtyping, PD vs MSA vs PSP vs ET differential, H&Y staging, UPDRS estimation
- **Weekly deep analysis** -- Opus 4.6 with 20K Extended Thinking budget
- Daily text extraction via Sonnet 4.5 ($0.07/session)
- Task-specific acoustic norms (conversation / sustained_vowel / ddk)
- Decline profiling with per-domain velocity tracking
- Category fluency analysis with semantic clustering and switching rate

### Limitations (addressed in V5)
- No topic-genre detection → **44% false positive rate** on Profile01
- No deterministic NLP anchors → high LLM extraction variability
- No cross-validation → self-referential baseline problem
- No GPU acceleration → slow audio processing
- No Whisper temporal indicators → missing measured pause metrics
- No LBD/FTD detection → 2 conditions undetectable
- CPU-only audio pipeline
- 5,956 lines of code

---

## [3.0.0] - 2026-02-11 — "cognitive_archaeology"

Text-only engine with 7-domain cognitive scoring. First version with evidence-compiled differential diagnosis.

### Added
- **47 indicators** across **7 domains**: lexical, syntactic, semantic, temporal, memory, discourse, affective
- **14 differential rules** across **6 conditions**: AD, Depression, PD, Normal Aging, Medication, Grief
- **4-stage AD cascade** model (semantic→syntactic→temporal→discourse) based on Fraser 2015
- Temporal pattern detection: monotonic (AD), episodic (depression), acute drop (medication), stable (aging)
- Key differentiators: referential coherence (AD vs Depression), cued recall (storage vs retrieval), self-referential pronouns (depression-specific)
- Session-to-session variability tracking
- Pause location analysis (within-clause = AD, boundary = depression)
- Weekly Opus 4.6 analysis with 5-phase clinical reasoning
- Daily Sonnet 4.5 extraction ($0.05/session)
- Two-tier cost architecture (daily Sonnet + weekly Opus)

### Limitations (addressed in V4)
- **Zero acoustic features** -- entire audio signal ignored
- **3 PD indicators** vs 50+ validated PD voice biomarkers → essentially non-functional PD detection
- No nonlinear dynamics (PPE, RPDE, DFA)
- Text-only: 81.9% accuracy ceiling (vs 93.75% with audio fusion)
- ~25% of known voice biomarker signal captured
- 2,012 lines of code

---

## [2.0.0] - 2026-02-10 — "million_token"

Paradigm shift: instead of extracting features, load everything into Claude's 1M token context window and reason like a neuropsychologist.

### Architecture
- **6-layer 1M token context** architecture:
  - **Layer 1: Living Library** (~300K tokens) -- 10+ full research papers loaded in context, 90% cached
  - **Layer 2: Differential Diagnosis** (~100K tokens) -- 6 condition profiles with full clinical criteria
  - **Layer 3: Cognitive Archaeology** (~200K tokens) -- full transcript history, semantic mapping, longitudinal tracking
  - **Layer 4: Cognitive Twin** (~150K tokens) -- personalized normal aging simulation, divergence scoring
  - **Layer 5: Synthetic Cohort** (~150K tokens) -- 100 reference trajectories (40 normal, 25 AD, 20 MCI, 10 depression, 5 other), k-NN matching
  - **Layer 6: Temporal Hologram** -- 5-phase Extended Thinking analysis with 32K budget

### Added
- **25 cognitive indicators** with evidence-based weighting
- **Cognitive Twin** -- personalized aging model predicting expected trajectory, flagging divergence
- **Synthetic Cohort** -- 100 trajectory database for comparative pattern matching
- Full scientific literature loaded in context (not just features)
- Divergence scoring: <1.0 normal, 1-2 monitor, >3 alert
- Multi-report generation: family, medical, internal, confidence

### Limitations (addressed in V3)
- Expensive: entire 1M context per analysis ($2-5/session)
- No structured differential engine (relied on LLM reasoning)
- No deterministic scoring (results varied between runs)
- No cascade detection
- No domain-level scoring

---

## [1.0.0] - 2026-02-10 — "first_light"

Initial proof of concept. Extract linguistic features from transcripts, compare to baseline, detect drift.

### Added
- **25 linguistic indicators** extracted via Claude: TTR, content density, MLU, idea density, referential coherence, pauses, self-pronouns, negative valence, and others
- **Simple z-score baseline** from calibration sessions
- **Composite drift score** with GREEN/YELLOW/ORANGE/RED alert levels
- Single-condition focus: Alzheimer's detection
- Basic decline profile
- French language support (primary development language)

### Limitations
- AD-only detection, no differential diagnosis
- No audio processing
- No domain-level scoring
- No cascade detection
- Single-pass LLM extraction with no calibration
- No cross-validation
- High extraction variability (no anchors)

---

## Version Summary

| Version | Codename | Date | Indicators | Domains | Conditions | Rules | Audio | Key Innovation |
|---------|----------|------|-----------|---------|------------|-------|-------|----------------|
| **1.0** | first_light | 2026-02-10 | 25 | -- | 1 | -- | No | Proof of concept |
| **2.0** | million_token | 2026-02-10 | 25 | -- | 6 | -- | No | 1M context, cognitive twin |
| **3.0** | cognitive_archaeology | 2026-02-11 | 47 | 7 | 6 | 14 | No | Evidence-compiled differential |
| **4.0** | two_stream | 2026-02-12 | 85 | 9 | 8 | 23 | Yes | Audio + text fusion |
| **5.0** | deep_voice | 2026-02-13 | 107 | 11 | 10 | 30 | GPU | Topic-aware, dual-pass, LBD/FTD |
| **5.1** | deep_voice | 2026-02-13 | 107 | 11 | 10 | 33 | GPU | Age-normalization layer |
| **5.2** | deep_voice | 2026-02-13 | 107 | 11 | 11 | 35 | GPU | VCI, independent probabilities, confidence propagation, session quality |
