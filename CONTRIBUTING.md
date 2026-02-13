# Contributing to CVF

Thank you for your interest in the Cognitive Voice Fingerprint engine. This project exists because early detection of cognitive decline should be accessible to everyone — contributions from researchers and developers directly advance that mission.

**Contact:** contact@alzheimervoice.org

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [For Researchers](#for-researchers)
- [For Developers](#for-developers)
- [Adding a New Language](#adding-a-new-language)
- [Adding a New Indicator](#adding-a-new-indicator)
- [Adding a New Condition](#adding-a-new-condition)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Architecture Overview](#architecture-overview)
- [Style Guide](#style-guide)
- [Reporting Security Issues](#reporting-security-issues)

---

## Code of Conduct

This project serves people living with neurodegenerative disease and their families. All contributors are expected to act with empathy, professionalism, and scientific integrity. We do not tolerate harassment, discrimination, or bad-faith contributions. Clinical claims must be backed by peer-reviewed evidence.

---

## How to Contribute

| Contribution Type | Who | Start Here |
|---|---|---|
| Validate indicators against clinical datasets | Researchers | [For Researchers](#for-researchers) |
| Add indicators from new papers | Researchers | [Adding a New Indicator](#adding-a-new-indicator) |
| Add a new detectable condition | Researchers + Developers | [Adding a New Condition](#adding-a-new-condition) |
| Add a new language | Developers + Native speakers | [Adding a New Language](#adding-a-new-language) |
| Improve acoustic pipeline | Developers | [For Developers](#for-developers) |
| Fix bugs or improve code quality | Developers | [Development Setup](#development-setup) |
| Improve documentation | Anyone | Submit a PR |

**For significant changes, please open an issue first.** This lets us discuss the approach before you invest time in implementation.

---

## For Researchers

CVF is evidence-compiled: every indicator traces to published peer-reviewed research. We welcome contributions that strengthen this foundation.

### Clinical Validation

If you have access to clinical datasets, validation studies are the highest-impact contribution you can make:

| Dataset | What It Enables |
|---------|----------------|
| **DementiaBank Pitt Corpus** | AD indicator accuracy benchmarking |
| **ADReSS / ADReSSo Challenge** | Standardized AD detection evaluation |
| **mPower (Sage Bionetworks)** | PD voice biomarker validation |
| **DAIC-WOZ** | Depression detection from speech |
| **FTDBank** | FTD variant differentiation |

**What we need from validation studies:**
1. Per-indicator sensitivity/specificity against clinical diagnosis
2. Domain-level AUC for each condition
3. Differential accuracy (e.g., AD vs FTD, PD vs LBD)
4. False positive/negative analysis with topic-genre breakdown

### Adding Research References

When citing a new paper that supports existing indicators:

1. Add the citation key to the relevant indicator's `studies` array in `src/engine/indicators.js`
2. Add a paper summary to `research/papers/<condition>/`
3. If the paper changes our understanding of an indicator's effect size, update `effect_sizes` with justification

### Proposing New Indicators

See [Adding a New Indicator](#adding-a-new-indicator) below. Every proposed indicator must include:

- The peer-reviewed publication(s) supporting it
- The condition(s) it differentiates and expected effect sizes
- Whether it can be computed deterministically (preferred) or requires LLM extraction

---

## For Developers

### Priority Areas

1. **Acoustic pipeline optimization** — GPU utilization, batch processing, new acoustic features
2. **New language support** — word lists and regex patterns for languages beyond EN/FR
3. **Test coverage** — condition-specific edge cases, cross-validation reliability, regression tests
4. **API hardening** — rate limiting, input validation, error handling
5. **Performance** — baseline computation optimization, z-score caching, incremental updates

### What Not to Change Without Discussion

- Indicator definitions in `indicators.js` (clinically validated, changes require evidence)
- Differential rule weights (calibrated against research literature)
- Alert thresholds (GREEN/YELLOW/ORANGE/RED boundaries)
- The zero-sum probability normalization (backward compatibility)
- SECURITY.md architecture decisions

---

## Adding a New Language

CVF currently supports **English** and **French**. Adding a third language requires word lists and patterns in these locations:

### 1. Deterministic NLP Anchors (`src/engine/nlp-deterministic.js`)

Create constant sets for the new language (following the `EN_*` / `FR_*` naming convention):

```javascript
// Example: Spanish (ES)
const ES_PRONOUNS = new Set([...]);
const ES_SELF_PRONOUNS = new Set([...]);
const ES_FUNCTION_WORDS = new Set([...]);
const ES_LIGHT_VERBS = new Set([...]);
const ES_COMMON_VERBS = new Set([...]);
const ES_FILLERS = new Set([...]);
const ES_FILLER_PHRASES = [...];
const ES_NEGATIVE_EMOTION = new Set([...]);
const ES_ABSOLUTIST = new Set([...]);
const ES_DEATH_WORDS = new Set([...]);
const ES_GENERIC_WORDS = new Set([...]);
const ES_RUMINATIVE_PATTERNS = [...];  // RegExp[]
// V5.2 anchors:
const ES_DISCOURSE_MARKERS = new Set([...]);
const ES_DISCOURSE_MARKER_PHRASES = [...];
const ES_PLANNING_WORDS = new Set([...]);
const ES_PLANNING_PHRASES = [...];
const ES_INDIRECT_PHRASES = [...];
const ES_CIRCUMLOCUTION_PHRASES = [...];
const ES_ORIENTATION_PATTERNS = [...];  // RegExp[]
const ES_COMPLICATION_PATTERNS = [...]; // RegExp[]
const ES_RESOLUTION_PATTERNS = [...];  // RegExp[]
```

Then add a language branch in `getWordLists()`.

### 2. Topic Detection (`src/engine/topic-profiles.js`)

Add keywords for each of the 6 genre profiles:

```javascript
narrative_travel: {
  keywords: {
    en: [...],
    fr: [...],
    es: [...],  // Add here
  },
  structural_patterns: [
    // Add ES regex patterns
  ],
}
```

### 3. Micro-Task Prompts (`src/engine/micro-tasks.js`)

Add prompts for all 6 micro-tasks:

```javascript
SUSTAINED_VOWEL: {
  prompt: {
    en: "Can you say 'ahhh'...",
    fr: "Pouvez-vous dire 'ahhh'...",
    es: "Puede decir 'ahhh'...",  // Add here
  },
}
```

### 4. Validation

- Run all 70 tests: `node --test tests/engine.test.js`
- Add language-specific tests for the NLP anchors (tokenization, word-list coverage)
- Verify topic detection works on sample transcripts in the new language

### Quality Requirements for Word Lists

- **Function words**: Must include all articles, prepositions, conjunctions, auxiliaries, pronouns, negation markers, and common particles. Aim for 100+ entries.
- **Common verbs**: Must include the 50 most frequent verbs in all their conjugated forms. Aim for 200+ entries.
- **Negative emotion**: Must cover the core affect categories (sadness, anger, fear, anxiety, loneliness, hopelessness, guilt, disgust). Aim for 50+ entries.
- **Ruminative patterns**: Regex patterns capturing self-blaming, hopeless, and repetitive negative thought patterns. Aim for 15+ patterns.

---

## Adding a New Indicator

Indicators are the atomic units of the engine. Each one must meet the **evidence-compiled standard**.

### Requirements

1. **Published evidence**: At least one peer-reviewed paper demonstrating diagnostic relevance
2. **Effect sizes**: Per-condition effect sizes (Cohen's d or equivalent) from the literature
3. **Direction**: Whether the indicator goes UP or DOWN in each condition
4. **Domain assignment**: Which of the 11 domains it belongs to
5. **Extraction method**: `text`, `audio`, `whisper_temporal`, `conversation`, or `micro_task`

### Steps

1. **Add the indicator definition** to `src/engine/indicators.js`:

```javascript
NEW_INDICATOR_ID: {
  id: 'NEW_INDICATOR_ID', domain: 'semantic', name: 'Human-Readable Name',
  formula: 'how it is computed',
  extractable: 'text', evidence: 4, base_weight: 0.65,
  directions: { alzheimer: DOWN, depression: STABLE, parkinson: STABLE, normal_aging: STABLE, lbd: DOWN, ftd: DOWN },
  effect_sizes: { alzheimer: 0.7, lbd: 0.5, ftd: 0.6 },
  early_detection: { alzheimer: true },
  studies: ['author_year'],
  note: 'Clinical relevance note.'
},
```

2. **If deterministic**: Add computation function to `src/engine/nlp-deterministic.js`, add to `DETERMINISTIC_INDICATOR_IDS` and `computeDeterministicIndicators()`

3. **If LLM-extracted**: Add to the extraction prompt in `src/engine/text-extractor.js`

4. **If acoustic**: Add to the Python pipeline in `src/audio/extract_features_v5.py` and norms in `ACOUSTIC_NORMS`

5. **Add to sentinels** if it's a key differentiator: `SENTINELS` in `indicators.js`

6. **Add tests** verifying the indicator participates in the correct condition profiles

7. **Update documentation**: `docs/CVF-V5-ARCHITECTURE.md` and `README.md` indicator count

---

## Adding a New Condition

Adding a detectable condition is a significant change. Please open an issue for discussion first.

### Requirements

1. **Clinical literature**: Published diagnostic criteria and voice/speech biomarker evidence
2. **Distinguishing markers**: At least 3 indicators that differentiate this condition from existing ones
3. **Differential rules**: How the new condition separates from all existing conditions

### Steps

1. **Add to `runDifferential()`** in `src/engine/differential.js`:
   - Add `condition_name: 0` to scores and `condition_name: []` to evidence
   - Add 1-3 differential rules with evidence-backed thresholds
   - Add to age-normalization dampening lists (Rules 31-33)
   - Add to excess decline domain mapping (Rule 33)
   - Add to `generateRecommendation()`

2. **Add independent probability**: The sigmoid mapping in `independentProbabilities` handles new conditions automatically once added to `scores`

3. **Add cascade detector** (if applicable) in `src/engine/algorithm.js` → `detectCascade()`

4. **Add sentinel set** (if applicable) in `src/engine/indicators.js` → `SENTINELS`

5. **Add sensitivity test** in `tests/engine.test.js`: create a profile that triggers the new condition as primary hypothesis

6. **Update counts**: `V5_META` in `index.js`, `README.md`, `CHANGELOG.md`, `CVF-V5-ARCHITECTURE.md`

### Reference: VCI Addition (V5.2)

VCI was added in V5.2 as a template for new conditions. See commit `77d46c4` for the complete diff:
- 2 differential rules (34-35)
- Added to 3 dampening lists
- 1 excess decline mapping
- 1 recommendation block
- 1 sensitivity test

---

## Development Setup

### Prerequisites

- **Node.js >= 18.0.0**
- **npm** (included with Node.js)
- Anthropic API key (for LLM extraction features — not needed for scoring engine or tests)

### Installation

```bash
git clone https://github.com/remifrancois/cognitivevoicefingerprint.git
cd cognitivevoicefingerprint
npm install
```

### Optional: Audio Pipeline

```bash
pip install parselmouth librosa nolds numpy scipy
# For GPU acceleration and Whisper:
pip install torch torchaudio openai-whisper
```

### Running Tests

```bash
# Run all tests
node --test tests/engine.test.js

# Expected output: 70 tests, 0 failures
```

### Project Structure

```
src/engine/
├── indicators.js          # 107 indicator definitions (the source of truth)
├── algorithm.js           # Scoring pipeline: z-scores → domains → composite → alerts
├── differential.js        # 35-rule differential diagnosis engine
├── nlp-deterministic.js   # 25 deterministic NLP anchors (no LLM)
├── topic-profiles.js      # 6 genre profiles for topic-aware scoring
├── text-extractor.js      # Claude Opus 4.6 dual-pass extraction
├── acoustic-pipeline.js   # Node→Python GPU bridge
├── trajectory.js          # 12-week trajectory prediction
├── pd-engine.js           # Parkinson's-specific analysis
├── cross-validation.js    # LOO + split-half CV
├── micro-tasks.js         # 6 embedded clinical tasks
├── weekly-deep.js         # Weekly Opus deep analysis
├── api.js                 # 17 REST endpoints
└── index.js               # Public API exports
tests/
└── engine.test.js         # 70 tests
```

---

## Testing

### Running Tests

```bash
node --test tests/engine.test.js
```

All tests must pass before submitting a PR. The test suite covers:

| Category | Tests | What It Validates |
|----------|-------|-------------------|
| Indicators | 5 | 107 indicators, 11 domains, weights sum to 1.0, sentinel sets, required fields |
| Baseline | 3 | Min sessions, completeness, mean accuracy |
| Z-Scores | 3 | Zero for matching, negative for decline, null handling |
| Age-Adjusted Z-Scores | 4 | Acoustic offsets, null safety, text unaffected, monotonic by age |
| Domain & Composite | 3 | 11 domains, composite calculation, null domain handling |
| Alert Levels | 4 | GREEN/YELLOW/ORANGE/RED thresholds |
| Cascade Detection | 4 | AD, PD, FTD cascades, no false cascade for normal |
| Confounders | 2 | Score reduction, no-op without confounders |
| Age Bands | 5 | Band mapping, 4 bands, monotonic rates, null fallback, domain coverage |
| Excess Decline | 3 | Positive excess, zero for expected, null age handling |
| Decline Profile | 2 | V5.1 fields present, stable for insufficient data |
| Differential Diagnosis | 7 | 11 conditions, normal aging for stable, AD for semantic decline, PD for quartet, Rules 31-33 |
| LBD Detection | 1 | Fluctuation + motor + cognitive |
| FTD Detection | 1 | Pragmatic collapse + preserved memory |
| PD Engine | 3 | Quartet detection, normal rejection, full pipeline |
| Trajectory | 2 | Age-adjusted predictions, different twins for different ages |
| Full Pipeline | 4 | Complete pipeline, patientAge propagation, backward compat, weekly |
| Disease vs Aging | 2 | Uniform elderly → aging, asymmetric accelerating → disease |
| Condition Sensitivity | 9 | AD, PD, Depression, FTD-bv, LBD, VCI, Normal aging, Mixed AD+dep, Mixed AD+LBD |
| Session Quality | 3 | Normal quality, full coverage, sparse vs full |

### Writing New Tests

Follow the existing pattern in `tests/engine.test.js`:

```javascript
it('should detect [condition] with [profile description]', () => {
  const result = runProfile(
    { /* domain score overrides */ },
    { /* z-score overrides */ },
    { /* context */ }
  );
  assert.equal(result.primary_hypothesis, 'expected_condition',
    `Expected [condition], got ${result.primary_hypothesis}`);
});
```

For mixed pathology tests, verify `independent_probabilities` rather than `primary_hypothesis`.

---

## Pull Request Process

1. **Fork the repository** and create a feature branch from `main`
2. **Open an issue first** for significant changes (new indicators, conditions, languages)
3. **Write tests** for any new functionality
4. **Run the full test suite**: `node --test tests/engine.test.js` — all 70+ tests must pass
5. **Update documentation** if your change affects:
   - Indicator count → `README.md`, `index.js` (V5_META), `CVF-V5-ARCHITECTURE.md`
   - Condition count → same files + `CHANGELOG.md`
   - Rule count → same files
   - API surface → `README.md` endpoint table
6. **Submit a PR** with:
   - Clear description of what changed and why
   - For research contributions: citation(s) to supporting literature
   - For new indicators: effect sizes and direction rationale
   - Test output showing all tests passing

### PR Checklist

```
[ ] All existing tests pass (node --test tests/engine.test.js)
[ ] New tests added for new functionality
[ ] Documentation updated (if applicable)
[ ] No secrets committed (.env, API keys, credentials)
[ ] No patient data committed (PHI, transcripts, audio files)
[ ] Changes maintain backward compatibility (or breaking changes are justified)
[ ] For indicators: peer-reviewed evidence cited
```

---

## Architecture Overview

Understanding the data flow helps target contributions effectively:

```
Transcript + Audio
       ↓
┌─────────────────────────────────┐
│  EXTRACTION LAYER               │
│  ├─ Opus 4.6 dual-pass (text)  │  ← text-extractor.js
│  ├─ 25 NLP anchors (regex)     │  ← nlp-deterministic.js
│  ├─ GPU audio pipeline          │  ← acoustic-pipeline.js
│  └─ Topic detection (regex)     │  ← topic-profiles.js
└──────────────┬──────────────────┘
               ↓ 107 indicators
┌─────────────────────────────────┐
│  SCORING LAYER                  │
│  ├─ Z-scores (vs baseline)     │
│  ├─ Topic adjustment            │  ← algorithm.js
│  ├─ Age adjustment              │
│  ├─ Confidence propagation      │
│  ├─ 11 domain scores            │
│  ├─ Composite + alert level     │
│  └─ Session quality             │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│  DIAGNOSIS LAYER                │
│  ├─ 35 differential rules       │  ← differential.js
│  ├─ 5 cascade detectors         │  ← algorithm.js
│  ├─ 5 sentinel sets             │
│  ├─ Independent probabilities   │
│  ├─ PD-specific engine          │  ← pd-engine.js
│  └─ Trajectory prediction       │  ← trajectory.js
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│  REPORTING LAYER                │
│  ├─ Weekly Opus deep analysis   │  ← weekly-deep.js
│  ├─ Cross-validation            │  ← cross-validation.js
│  └─ REST API                    │  ← api.js
└─────────────────────────────────┘
```

---

## Style Guide

- **ES Modules** (`import`/`export`, not `require`)
- **No external dependencies** in the scoring engine (algorithm.js, differential.js, indicators.js). Only Node.js built-ins. External dependencies are limited to extraction (Anthropic SDK) and API (Fastify).
- **Numeric safety**: Use `Number.isFinite()` checks, `safeDiv()` for division, bound all multipliers. Medical scoring code must never produce NaN or Infinity.
- **Evidence trail**: Comments referencing clinical studies should use `Author Year` format (e.g., `// Fraser 2015`, `// Little 2009`)
- **Bilingual**: All word lists and user-facing text must support both EN and FR
- **No patient data in code**: No transcripts, audio files, names, or PHI in the repository. Demo output contains only computed results.

---

## Reporting Security Issues

**Do not open a public issue for security vulnerabilities.**

Email **contact@alzheimervoice.org** with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment

We will acknowledge within 48 hours and provide a fix timeline. See [SECURITY.md](SECURITY.md) for the full security architecture.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

55 million people live with Alzheimer's disease today. Your contribution helps detect it earlier.
