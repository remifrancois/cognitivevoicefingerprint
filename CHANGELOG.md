# Changelog

All notable changes to the Cognitive Voice Fingerprint (CVF) engine are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.0.1] - 2026-02-13

### Fixed
- **NLP anchors returning constant 0.500** -- `computeDeterministicIndicators()` silently returned 0.5 for all 20 indicators when passed a string transcript instead of `[{role, text}]` array. The function now accepts both formats. This was the highest-impact bug: it caused the entire deterministic anchor system to produce flat, uninformative values, defeating its purpose as a calibration layer.
- **Cross-validation field access** -- Console runner accessed `cvResults.mean_composite` (undefined) instead of `cvResults.aggregate.mean_composite`. LOO and split-half results now display correctly.
- **Trajectory prediction crash** -- `predictTrajectory()` was called with `(domainScores, primaryHypothesis, options)` but expects `(history[], differential, cascade, weeks)`. Fixed argument order; 12-week predictions now render correctly.
- **Split-half requiring 10+ sessions** -- Default `minBaseline: 5` meant split-half needed `>= 10` sessions. Lowered to `minBaseline: 3` in the runner to support smaller profiles.
- **Trajectory week display** -- Predictions used `week_offset` field but display referenced `week`. Fixed to read `p.week_offset`.
- **Reliability display** -- `shResults.reliability` is an object (with `spearman_brown` key), not a number. Fixed accessor.

### Added
- **Demo output** -- `demo-output/` directory with Profile01 V5 results:
  - `profile01_v5_results.json` -- Complete 197KB diagnostic JSON (9 sessions, 70 indicators each, cross-validated)
  - `profile01_v5_console.txt` -- Full 14-step console output
- **End-to-end validation** -- V5 engine successfully ran all 14 analysis steps on Profile01 (9 sessions, ~38 minutes of French speech), producing correct diagnosis: normal aging (69.2%) with mild depression markers (30.8%)

### Validated
- NLP anchors now produce real variance across sessions (e.g., LEX_TTR: 0.414 +/- 0.095, not 0.500 +/- 0.000)
- LOO cross-validation: 9/9 sessions analyzed, mean composite -0.112 (GREEN)
- Split-half reliability: 0.922 (Spearman-Brown corrected)
- Trajectory prediction: 12 weeks stable GREEN for normal aging profile
- Differential diagnosis: 3 rules fired, correct primary hypothesis
- LBD, FTD, PD pattern detection: all correctly negative for healthy subject

---

## [5.0.0] - 2026-02-13

### Added — Engine Core
- **107 indicators** across 11 cognitive domains (up from 85 indicators / 9 domains in V4)
- **Pragmatic domain (PRA)** -- 6 new indicators targeting FTD behavioral variant: indirect speech, discourse markers, register shift, narrative structure, perspective-taking, humor/irony
- **Executive domain (EXE)** -- 5 new indicators targeting FTD and LBD: task switching, inhibition, planning, dual-task, cognitive flexibility
- **6 new acoustic indicators** -- formant bandwidth, spectral tilt, voice breaks, tremor frequency (4-7 Hz), breathiness, loudness decay
- **5 Whisper temporal indicators** -- pause before noun, pause variability, syllable rate decay, word duration mean, voiced ratio (measured from Whisper word-level timestamps)
- **LBD and FTD detection** -- 2 new conditions with cascade patterns, sentinel sets, and dedicated pattern detectors (`detectLBDPattern()`, `detectFTDPattern()`)

### Added — Topic-Aware Scoring
- **6 topic-genre profiles** -- narrative_travel, procedural_recipe, hypothetical_wishes, daily_routine, emotional_personal, academic
- **Deterministic genre detection** -- pure regex/keyword matching, no LLM, $0.00 per session
- **Per-indicator z-score adjustments** scaled by detection confidence to eliminate topic-induced false positives (44% false positive rate in V4)

### Added — Deterministic NLP Anchors
- **20 indicators computed via regex** -- type-token ratio, MATTR, content density, pronoun-noun ratio, MLU, fragment rate, filler rate, repetition, speech rate, self-pronouns, negative valence, absolutist language, perseveration, and more
- **Bilingual word lists** -- full English and French support for all regex patterns and word sets
- **Anchor merge formula** -- convergence: 0.6 Opus + 0.4 deterministic; disagreement: 0.3 Opus + 0.7 deterministic

### Added — Extraction
- **Claude Opus 4.6 dual-pass** -- Pass 1 (8K Extended Thinking) + outlier detection + Pass 2 (4K targeted re-extraction) + merge (0.6 P1 + 0.4 P2)
- **Confidence intervals** per indicator (value, confidence, range)
- ~$0.25/session (up from $0.07 with Sonnet 4.5)

### Added — Audio Pipeline
- **GPU acceleration** -- automatic device detection: MPS (Apple Silicon) → CUDA → CPU fallback
- **torchaudio** for GPU-accelerated MFCCs and spectral features
- **Whisper large-v3** integration for word-level timestamps
- **Task-specific acoustic norms** -- separate norm sets for conversation, sustained vowel, and DDK tasks (fixes PPE/RPDE norm mismatch from V4)

### Added — Scoring & Diagnosis
- **11-domain scoring** with weight redistribution for null domains
- **5 cascade detectors** -- AD, PD, Depression, LBD, FTD (up from 3)
- **5 sentinel sets** -- AD (9), PD (11), Depression (7), LBD (8), FTD (9)
- **30 differential rules** across 10 conditions (up from 23 rules / 8 conditions)
- **LOO + split-half cross-validation** with Spearman-Brown reliability correction
- **12-week trajectory prediction** with condition-specific progression models for all 10 conditions

### Added — Infrastructure
- **17 Fastify REST endpoints** (api.js) for service deployment
- **Console runner** (run_v5_analysis.mjs) -- 14-step standalone pipeline
- **6 micro-tasks** -- sustained vowel, DDK, category fluency, depression screen, attention fluctuation (LBD), pragmatic probe (FTD)
- **Weekly deep analysis** -- Opus 4.6 with 32K Extended Thinking budget (up from 20K)

### Added — Documentation
- `docs/CVF-V5-ARCHITECTURE.md` -- comprehensive technical reference (845 lines)
- `research/papers/` -- 84+ peer-reviewed paper summaries across alzheimer (37), parkinson (24), depression (15)
- Gap analysis documents for AD, PD, and Depression detection

### Changed — From V4
- Daily model: Sonnet 4.5 → **Opus 4.6** (all LLM operations)
- Extraction: single-pass → **dual-pass with Extended Thinking**
- Acoustic norms: flat → **task-specific** (conversation/sustained_vowel/ddk)
- Baseline: self-referential → **cross-validated** (LOO + split-half)
- Alert thresholds: unchanged (GREEN >= -0.5, YELLOW >= -1.0, ORANGE >= -1.5, RED < -1.5)

---

## V4 "two_stream" (prior version, not in this repository)

- 85 indicators, 9 domains, 8 conditions, 23 rules
- Sonnet 4.5 single-pass extraction ($0.07/session)
- No topic detection, no NLP anchors, no cross-validation
- CPU-only audio pipeline
- 44% false positive rate on Profile01 due to topic blindness
