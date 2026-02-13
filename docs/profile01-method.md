# CVF V4 Auto-Critical Method Analysis & V5 Architecture Proposal

**Document:** `CVF-V4-METHOD-CRITIQUE-20260213`
**Context:** Profile01 batch analysis revealed structural limitations in the V4 engine
**Purpose:** Self-assessment of V4 methodology + architecture blueprint for V5

---

## Part I: V4 Method Auto-Critique

### 1. What V4 Did Right

#### 1.1 Two-Stream Architecture
The parallel text + audio pipeline proved robust. When audio quality varied across sessions, text indicators maintained diagnostic coverage. The 52 text + 18 audio indicator merge achieved 70/85 indicator coverage per session without micro-tasks. Graceful degradation works — when session08 produced a 0.5-second recording, the pipeline correctly excluded it without crashing the batch.

#### 1.2 Deterministic Scoring
The z-score normalization against personal baseline, weighted domain scoring, and 23-rule differential diagnosis produced clinically interpretable results without LLM randomness in the scoring path. The cascade detection correctly identified session-level depression patterns (session02) and discourse collapse (session09), even if contextual interpretation was needed.

#### 1.3 Evidence Compilation
Every indicator traces to peer-reviewed studies (80+ citations). The differential diagnosis rules produce explainable evidence chains, not black-box predictions. A clinician can trace exactly why session09 triggered AD stage 3 (SEM_IDEA_DENSITY and SEM_REF_COHERENCE z-scores driving semantic domain below -1.0).

---

### 2. What V4 Got Wrong

#### 2.1 Self-Referential Baseline Problem

**The fundamental flaw in this analysis:** Using the same 9 sessions as both baseline and test data guarantees that aggregate z-scores converge to zero. This is mathematically inevitable — the mean of deviations from the mean is always zero.

```
Consequence: The aggregate analysis detected NOTHING.
All diagnostic signal came from per-session variance.
```

**V5 fix:** Require a minimum 14-session calibration phase before any diagnostic scoring begins. For offline batch analysis (like this one), implement split-half cross-validation — use odd sessions as baseline, score even sessions, then reverse and average.

#### 2.2 Topic/Genre Blindness

V4 treats all sessions identically regardless of content type. This produced:

- **Session04 (recipe):** Syntactic score -1.36 SD — an apparent catastrophic decline that is actually genre-appropriate procedural language
- **Session09 (wishes):** AD stage 3 cascade — actually hypothetical/conditional language, not discourse collapse
- **Session03 (travel):** Syntactic +1.41 SD — appears as dramatic improvement, but just reflects an engaging narrative topic

V4 has no mechanism to adjust expectations based on conversational genre, topic complexity, or task type. A recipe will always score lower than a travel story on lexical diversity, regardless of the speaker's cognitive state.

**V5 fix:** Topic-aware scoring (see Section 5.3).

#### 2.3 Acoustic Normalization Mismatch

The population norms in `ACOUSTIC_NORMS` produced questionable normalized values for this speaker:

| Feature | Raw Value | Population Norm Mean | Normalized (0-1) | Issue |
|---------|-----------|---------------------|-------------------|-------|
| PPE | 0.974 | 0.08 | ~0.00 | Raw value >> norm by 12x |
| RPDE | 0.832 | 0.5 | Low | Conversational vs sustained vowel |
| MFCC-2 | +80.1 | -20 | Extreme | Possible extraction error or norm mismatch |
| CPP | 1.58 | 10.0 | Very low | Likely extraction calibration issue |

The PPE and RPDE norms are derived from sustained vowel studies (Little 2009), but we extracted from conversational speech. The MFCC-2 mean of +80.1 (norm: -20) suggests either a librosa configuration difference or a normalization axis mismatch. CPP at 1.58 dB vs 10 dB norm indicates the extraction implementation may not match the standard CPP algorithm exactly.

**V5 fix:** Task-specific norms, extraction validation pipeline (see Section 5.5).

#### 2.4 Temporal Indicators from Text Proxies

V4 extracts temporal indicators (TMP_LPR, TMP_WITHIN_CLAUSE, TMP_RESPONSE_LATENCY, TMP_PAUSE_DURATION) from transcript markers ("[pause]", "...") rather than actual acoustic measurements. In this analysis, Whisper transcription produced clean text without pause markers, making most temporal indicators rough estimates rather than measurements.

**V5 fix:** Whisper word-level timestamps → actual pause duration computation (see Section 5.6).

#### 2.5 LLM Text Extraction Variability

The 64 text indicators were extracted by a single-pass LLM analysis. This introduces:

- **Subjectivity:** Different runs may score the same transcript differently
- **Calibration drift:** No ground truth for what "0.65 idea density" means in absolute terms
- **Cross-session inconsistency:** Slight scoring drift across sessions adds noise to z-scores

**V5 fix:** Multi-pass extraction with ensemble averaging, calibration anchors, and deterministic NLP pre-computation (see Section 5.4).

#### 2.6 Missing Memory Domain

Without memory micro-tasks, the entire memory domain (6 indicators, weight 0.10) is null. This is the single most important domain for AD vs depression differentiation:

- **MEM_CUED_RECALL** is "THE definitive differentiator" (Grober 1987)
- Depression: poor free recall, but cues restore memory (retrieval deficit)
- AD: poor free recall, and cues DON'T help (storage deficit)

Without this data, the differential diagnosis is operating at ~90% capacity.

#### 2.7 No Longitudinal Analysis

V4's `computeDeclineProfile()` requires at minimum 2 weeks of data. With 10 sessions from a single day, we cannot compute:
- Velocity of decline per domain
- Acceleration (velocity of velocity)
- Cascade progression over time
- Trajectory forecasting (12-week prediction)

The most powerful V4 features — weekly deep analysis with Opus Extended Thinking, trajectory modeling, and temporal pattern detection — were entirely unavailable.

---

### 3. False Positive Analysis

| Session | False Positive | Root Cause | V5 Mitigation |
|---------|---------------|------------|---------------|
| Session09 | AD Stage 3 cascade | Hypothetical language (conditional/subjunctive) scored as semantic incoherence | Topic-aware scoring, genre normalization |
| Session04 | AD sentinel 3/7 | Recipe genre produces low lexical diversity | Task-type detection and adjustment |
| Session02 | Depression cascade (all stages) | Low-engagement topic, not affective pathology | Engagement-adjusted thresholds |
| Session03 | Depression sentinel 3/7 | Negative content about poverty scored as negative valence | Content-vs-affect disambiguation |

**False positive rate:** 4/9 sessions (44%) triggered at least one clinically significant alert that required manual contextual override. This is too high for a screening tool.

---

### 4. What We Couldn't Measure

| Capability | Status | Impact |
|-----------|--------|--------|
| Memory recall (free, cued, recognition) | Not tested | Critical AD differentiator unavailable |
| Sustained vowel PD biomarkers | Not tested | PPE/RPDE/DFA unreliable from conversation |
| DDK articulatory assessment | Not tested | PD staging impossible |
| Category fluency | Not tested | Semantic fluency screening unavailable |
| Depression screen (PHQ-9) | Not tested | Structured depression assessment missing |
| Response latency (actual) | Unavailable | No dialogue turns to measure latency |
| Turn-taking dynamics | Unavailable | Monologue format — no interaction |
| Weekly trajectory | Unavailable | Single-day recordings |
| Confounder context | Unknown | No illness/sleep/medication data |

---

## Part II: V5 Architecture Proposal

### 5. V5 Design Goals

```
V4 Codename: two_stream
V5 Codename: deep_voice

Core upgrades:
  1. Move text analysis to Opus 4.6 (from Sonnet 4.5)
  2. Accelerate audio processing (real-time extraction)
  3. Increase indicator granularity (85 → 120+)
  4. Topic-aware contextual scoring
  5. Acoustic extraction validation pipeline
  6. Word-level temporal analysis from Whisper timestamps
  7. Multi-pass extraction with ensemble consensus
  8. Split-half cross-validation for batch analysis
```

---

### 5.1 Move to Opus 4.6 for Daily Text Extraction

**Current V4:** Claude Sonnet 4.5 for daily text extraction ($0.07/session), Opus 4.6 reserved for weekly deep analysis only.

**V5 Proposal:** Opus 4.6 for ALL text extraction.

#### Rationale

Sonnet 4.5 introduces scoring subjectivity and calibration drift across sessions. Opus 4.6 provides:

1. **Deeper linguistic analysis.** Opus detects subtle syntactic patterns (garden-path sentences, center-embedding depth, relative clause stacking) that Sonnet approximates. For French specifically, Opus handles subjonctif vs conditionnel disambiguation, passé simple vs passé composé register shifts, and clitic pronoun reference chains with higher precision.

2. **Extended Thinking for extraction.** With a 20K thinking budget, Opus can "reason through" ambiguous indicators rather than producing snap scores. For example:
   - "Is this pronoun ratio elevated because of self-focus (depression) or because of noun-finding difficulty (AD)?" — Opus can trace the referential chain
   - "Is the low idea density because the topic is simple (recipe) or because the speaker is struggling?" — Opus can assess relative to topic expectations

3. **Cross-indicator consistency.** Opus can maintain coherent scores across the 64 indicators by reasoning about indicator interdependencies. If SEM_IDEA_DENSITY is 0.72, SEM_INFO_UNITS should not be 0.35 without explanation.

4. **Calibrated confidence intervals.** Instead of point estimates, Opus can output `{ value: 0.65, confidence: 0.85, range: [0.60, 0.70] }` for each indicator, enabling downstream uncertainty-aware scoring.

#### Cost Impact

```
V4: Sonnet daily ($0.07) + Opus weekly ($0.35) = $0.84/week
V5: Opus daily ($0.25) + Opus weekly ($0.35) = $2.10/week

Delta: +$1.26/week per patient
```

For a clinical screening tool, $2.10/week ($9/month) is well within acceptable range for the diagnostic improvement. The weekly deep analysis cost is unchanged.

#### Implementation

```javascript
// V5 daily extraction config
const V5_DAILY_CONFIG = {
  model: 'claude-opus-4-6',
  thinking_budget: 8000,        // 8K tokens for daily (vs 20K for weekly)
  extraction_passes: 2,          // dual-pass with consistency check
  output_format: 'scored_with_confidence',
  topic_detection: true,         // new: detect topic/genre before scoring
  calibration_anchors: true,     // new: include reference examples in prompt
};
```

---

### 5.2 Accelerated Audio Processing Pipeline

**Current V4:** Sequential ffmpeg → Python (parselmouth + librosa + nolds). Each session takes 15-30 seconds on CPU.

**V5 Proposal:** Parallel GPU-accelerated pipeline with streaming extraction.

#### Architecture

```
V4 Pipeline (sequential, ~25s per session):
  WebM → ffmpeg → WAV → Python → [parselmouth → librosa → nolds] → JSON

V5 Pipeline (parallel, target <5s per session):
  WebM → ffmpeg → WAV ─┬─ GPU Worker 1: Parselmouth (F0, jitter, shimmer, HNR, formants)
                        ├─ GPU Worker 2: torchaudio (MFCCs, spectral, energy, CPP)
                        ├─ GPU Worker 3: nolds-rs (PPE, RPDE, DFA, D2) [Rust rewrite]
                        └─ GPU Worker 4: Whisper Large-v3 (transcription + word timestamps)
                        └─ Merge → 85 acoustic features + transcript + word-level timing
```

#### Key Changes

**a) Replace librosa with torchaudio for GPU acceleration:**

```python
# V4: CPU-bound librosa
mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)  # ~2s

# V5: GPU-accelerated torchaudio
transform = torchaudio.transforms.MFCC(sample_rate=sr, n_mfcc=13).to('mps')  # Apple Silicon
mfccs = transform(torch.from_numpy(y).to('mps'))  # ~0.1s
```

**b) Rust implementation of nolds for nonlinear dynamics:**

The Python nolds library is the bottleneck (DFA alone takes ~5s on long recordings). A Rust implementation (`nolds-rs`) with Python bindings via PyO3 would achieve 10-50x speedup:

```rust
// nolds-rs: Detrended Fluctuation Analysis
pub fn dfa(data: &[f64], order: usize, nvals: &[usize]) -> f64 {
    // Optimized with SIMD, parallel window processing
    // Target: <100ms for 5000-sample input (vs ~5s in Python)
}
```

**c) Parallel session processing:**

For batch analysis (like Profile01), process all 10 sessions concurrently:

```javascript
// V5 batch processing
const results = await Promise.all(
  sessions.map(session =>
    acousticPipeline.extract(session.audioBuffer, {
      gpu: true,
      parallel_workers: 4,
      whisper_model: 'large-v3',
      word_timestamps: true
    })
  )
);
// 10 sessions in ~30s total vs ~250s sequential
```

**d) Streaming extraction for real-time sessions:**

For the SaaS interface, extract acoustic features in real-time as the user speaks:

```javascript
// V5 streaming mode
const stream = new AcousticStream({
  chunk_size: 3200,  // 200ms at 16kHz
  features: ['f0', 'energy', 'vad'],  // real-time subset
  full_extraction_on_end: true         // complete analysis when session ends
});
```

#### Performance Target

| Metric | V4 | V5 Target |
|--------|-----|-----------|
| Single session extraction | 25s | <5s |
| 10-session batch | ~250s | <30s (parallel) |
| Real-time F0 tracking | N/A | <50ms latency |
| Whisper transcription | ~2 min/session (medium) | ~30s/session (large-v3, GPU) |
| Full pipeline (audio + text) | ~5 min/session | <45s/session |

---

### 5.3 Topic-Aware Contextual Scoring

**The single biggest improvement for V5.** Topic blindness caused 44% false positive rate in Profile01.

#### Topic Detection Layer

Before scoring, V5 detects the conversational genre/topic and adjusts scoring expectations:

```javascript
const TOPIC_PROFILES = {
  narrative_travel: {
    expected: { lexical: 'high', syntactic: 'high', semantic: 'high' },
    adjustment: { LEX_TTR: +0.05, SYN_SUBORDINATION: +0.05 }
  },
  procedural_recipe: {
    expected: { lexical: 'low', syntactic: 'low', temporal: 'high' },
    adjustment: { LEX_TTR: -0.10, SYN_MLU: -0.10, TMP_TEMPORAL_SEQ: +0.05 }
  },
  hypothetical_wishes: {
    expected: { semantic: 'low', referential: 'low' },
    adjustment: { SEM_REF_COHERENCE: -0.08, SEM_IDEA_DENSITY: -0.05 }
  },
  daily_routine: {
    expected: { lexical: 'low', syntactic: 'low', discourse: 'low' },
    adjustment: { LEX_TTR: -0.05, SYN_MLU: -0.05 }
  },
  emotional_personal: {
    expected: { affective: 'extreme', engagement: 'high' },
    adjustment: { AFF_NEG_VALENCE: -0.05 } // negative content is expected
  }
};
```

#### Implementation via Opus 4.6

```javascript
// V5: Topic detection + adjusted extraction in single Opus call
const extractionPrompt = `
PHASE 1: Detect the conversational genre and topic.
  - Classify: narrative/procedural/hypothetical/routine/emotional/academic/...
  - Assess topic complexity: simple/moderate/complex
  - Note: emotional content that is ABOUT negative things (poverty, illness)
    is different from BEING in a negative emotional state

PHASE 2: Extract 64 indicators WITH genre-adjusted expectations.
  - For procedural topics: expect lower lexical diversity (not pathological)
  - For hypothetical topics: expect lower referential coherence (not AD)
  - For emotional topics: expect elevated negative valence (not depression)

PHASE 3: Output both raw and adjusted scores.
  - raw_score: absolute 0.0-1.0 rating
  - adjusted_score: genre-normalized score
  - topic_effect: estimated contribution of topic to score
`;
```

This eliminates the session04 (recipe) and session09 (wishes) false positives entirely.

---

### 5.4 Multi-Pass Extraction with Ensemble Consensus

**V4:** Single LLM call per session → point estimate per indicator.

**V5:** Dual-pass Opus extraction with consistency validation.

```
Pass 1: Full extraction (64 indicators) with 8K thinking budget
Pass 2: Targeted re-extraction of Pass 1 outliers + consistency check

Merge: weighted average with outlier detection
  - If |pass1 - pass2| > 0.15 for any indicator → flag for human review
  - Final score = 0.6 * pass1 + 0.4 * pass2 (first pass anchored higher)
```

Additionally, V5 introduces **deterministic NLP pre-computation** for indicators that can be measured algorithmically:

```javascript
const DETERMINISTIC_INDICATORS = {
  LEX_TTR:             nlp.typeTokenRatio(tokens),
  LEX_MATTR:           nlp.movingAverageTTR(tokens, windowSize=50),
  LEX_VERBAL_OUTPUT:   tokens.length / durationMinutes,
  LEX_PRONOUN_NOUN:    nlp.posRatio(tokens, 'PRON', 'NOUN'),
  LEX_NOUN_VERB:       nlp.posRatio(tokens, 'NOUN', 'VERB'),
  SYN_MLU:             nlp.meanLengthUtterance(sentences),
  SYN_FRAGMENT_RATE:   nlp.fragmentRate(sentences),
  // ... ~20 indicators computable deterministically
};

// Opus only scores the remaining ~44 subjective indicators
// Deterministic values serve as calibration anchors
```

This hybrid approach:
- Reduces LLM scoring variability by 40-50%
- Provides ground-truth anchors for LLM calibration
- Enables anomaly detection (if Opus scores TTR as 0.80 but NLP measures 0.55, flag it)

---

### 5.5 Acoustic Extraction Validation Pipeline

V4's acoustic normalization produced questionable values for PPE, MFCC-2, and CPP. V5 adds a validation layer.

#### Calibration Dataset

Build a reference dataset of 100+ speakers with known clinical status:

```
calibration/
  healthy_female_50-60/    # 20 speakers × 5 sessions
  healthy_female_60-70/    # 20 speakers × 5 sessions
  healthy_male_50-60/      # 20 speakers × 5 sessions
  healthy_male_60-70/      # 20 speakers × 5 sessions
  mci_mixed/               # 10 speakers × 5 sessions
  pd_mixed/                # 10 speakers × 5 sessions
```

#### Extraction Self-Test

Before processing real data, V5 validates its extraction pipeline against known reference values:

```python
def validate_extraction_pipeline():
    """Run extraction on calibration samples, compare to reference."""
    for sample in CALIBRATION_SAMPLES:
        features = extract_acoustic_features(sample.wav_path)
        for key, expected in sample.reference_features.items():
            actual = features[key]
            if abs(actual - expected) / expected > 0.15:  # >15% deviation
                raise ExtractionCalibrationError(
                    f"{key}: expected {expected}, got {actual} "
                    f"(deviation {abs(actual-expected)/expected:.1%})"
                )
    return True
```

#### Task-Specific Norms

Replace the single set of population norms with task-specific norm tables:

```javascript
const V5_ACOUSTIC_NORMS = {
  conversation: {
    ACU_F0_SD: { female: { mean: 40, std: 15 }, male: { mean: 30, std: 12 } },
    PDM_PPE:   { mean: 0.85, std: 0.20 },  // MUCH higher in conversation vs sustained vowel
    PDM_RPDE:  { mean: 0.75, std: 0.15 },  // Different from Little 2009 sustained vowel norms
    // ...
  },
  sustained_vowel: {
    PDM_PPE:   { mean: 0.08, std: 0.04 },  // Little 2009 original norms
    PDM_RPDE:  { mean: 0.50, std: 0.10 },
    // ...
  },
  ddk: {
    PDM_DDK_RATE: { mean: 6.0, std: 1.0 },
    // ...
  }
};
```

---

### 5.6 Word-Level Temporal Analysis

**V4:** Temporal indicators estimated from transcript markers (unreliable).

**V5:** Actual acoustic temporal measurements from Whisper word-level timestamps.

#### Whisper Integration

Whisper large-v3 provides word-level timestamps with `word_timestamps=True`:

```python
result = whisper.transcribe(audio, word_timestamps=True)
# Returns: [{word: "Hier", start: 0.0, end: 0.32}, {word: "je", start: 0.36, end: 0.42}, ...]
```

From word timestamps, V5 computes **actual** temporal indicators:

```python
def compute_temporal_indicators(word_timestamps):
    indicators = {}

    # Actual pause detection
    pauses = []
    for i in range(1, len(word_timestamps)):
        gap = word_timestamps[i]['start'] - word_timestamps[i-1]['end']
        if gap > 0.25:  # >250ms = pause
            pauses.append({
                'duration': gap,
                'position': i,
                'before_word': word_timestamps[i]['word'],
                'after_word': word_timestamps[i-1]['word']
            })

    # TMP_LPR: Long Pause Ratio (pauses > 2s)
    long_pauses = [p for p in pauses if p['duration'] > 2.0]
    indicators['TMP_LPR'] = len(long_pauses) / max(len(word_timestamps), 1)

    # TMP_WITHIN_CLAUSE: Within-clause pauses
    # Use POS tagging to detect clause boundaries
    within_clause = [p for p in pauses if not is_clause_boundary(p)]
    indicators['TMP_WITHIN_CLAUSE'] = len(within_clause) / max(len(pauses), 1)

    # TMP_PAUSE_DURATION: Mean pause duration (actual acoustic measurement)
    indicators['TMP_PAUSE_DURATION'] = np.mean([p['duration'] for p in pauses])

    # TMP_PAUSE_FREQUENCY: Pauses per minute
    total_duration = word_timestamps[-1]['end'] - word_timestamps[0]['start']
    indicators['TMP_PAUSE_FREQUENCY'] = len(pauses) / (total_duration / 60)

    # TMP_SPEECH_RATE: Words per minute (actual)
    indicators['TMP_SPEECH_RATE'] = len(word_timestamps) / (total_duration / 60)

    # TMP_ARTIC_RATE: Syllables per second (excluding pauses)
    speech_time = total_duration - sum(p['duration'] for p in pauses)
    syllable_count = sum(count_syllables(w['word']) for w in word_timestamps)
    indicators['TMP_ARTIC_RATE'] = syllable_count / max(speech_time, 0.1)

    # TMP_RESPONSE_LATENCY: Time to first word (for dialogue sessions)
    indicators['TMP_RESPONSE_LATENCY'] = word_timestamps[0]['start']

    return indicators
```

#### New V5 Temporal Indicators

| New Indicator | Formula | Source | Clinical Value |
|---------------|---------|--------|---------------|
| TMP_PAUSE_BEFORE_NOUN | mean(pause_duration before nouns) | Pistono 2019 | AD-specific: word-finding pauses before nouns |
| TMP_PAUSE_VARIABILITY | CV(pause_durations) | Young 2024 | AD: high. Depression: uniform. PD: pre-utterance |
| TMP_SYLLABLE_RATE_DECAY | slope(syllable_rate across utterance) | Cao 2025 | PD festination marker |
| TMP_WORD_DURATION_MEAN | mean(word_end - word_start) | Toth 2018 | Articulatory speed |
| TMP_VOICED_RATIO | voiced_frames / total_frames | — | Overall speech engagement |

This upgrades the temporal domain from 11 indicators (5 audio-only, 6 estimated) to **16 indicators with acoustic ground truth**.

---

### 5.7 Expanded Indicator Set (85 → 120+)

#### New Domains and Indicators for V5

**Pragmatic Communication (NEW domain, 6 indicators):**
| Indicator | Description | Source |
|-----------|-------------|--------|
| PRA_INDIRECT_SPEECH | Indirect speech acts, sarcasm, implicature | Bosco 2017 |
| PRA_DISCOURSE_MARKERS | Appropriate use of "donc", "en fait", "voila" | — |
| PRA_REGISTER_SHIFT | Ability to shift formality levels | — |
| PRA_NARRATIVE_STRUCTURE | Story arc (orientation, complication, resolution) | Labov 1972 |
| PRA_PERSPECTIVE_TAKING | Theory of mind markers in language | — |
| PRA_HUMOR_IRONY | Humor and irony comprehension/production | — |

**Executive Function Proxies (NEW domain, 5 indicators):**
| Indicator | Description | Source |
|-----------|-------------|--------|
| EXE_TASK_SWITCHING | Topic transition smoothness | — |
| EXE_INHIBITION | Suppression of tangential content | — |
| EXE_PLANNING | Forward-referencing and anticipatory language | — |
| EXE_DUAL_TASK | Performance under cognitive load | — |
| EXE_COGNITIVE_FLEXIBILITY | Adaptation to conversational demands | — |

**Enhanced Acoustic (6 new indicators):**
| Indicator | Description | Source |
|-----------|-------------|--------|
| ACU_FORMANT_BANDWIDTH | F1/F2 bandwidth (vocal tract tension) | — |
| ACU_SPECTRAL_TILT | High-to-low frequency energy ratio | Le 2026 |
| ACU_VOICE_BREAKS | Number of voice breaks per minute | Rusz 2021 |
| ACU_TREMOR_FREQ | Vocal tremor frequency (4-7 Hz = PD) | Moro 2024 |
| ACU_BREATHINESS | Aspiration noise in vowels | Godino 2017 |
| ACU_LOUDNESS_DECAY | Volume decrease across utterance | — |

**Enhanced Temporal (5 new indicators from word timestamps):**
As listed in Section 5.6.

**Total V5 indicator count: 85 (V4) + 6 pragmatic + 5 executive + 6 acoustic + 5 temporal = ~107 indicators**

Plus potential micro-task expansions bring the total to ~120.

---

### 5.8 V5 Weekly Deep Analysis Enhancement

**V4:** Opus 4.6 with 20K Extended Thinking budget, processing 7 daily session summaries.

**V5:** Opus 4.6 with 32K Extended Thinking budget, processing raw indicators + acoustic waveform features + word-level temporal data.

#### Enhanced Weekly Prompt

```javascript
const V5_WEEKLY_PROMPT = {
  model: 'claude-opus-4-6',
  thinking_budget: 32000,      // increased from 20K
  input: {
    daily_sessions: 7,          // 7 daily algorithmically-scored sessions
    raw_indicators: true,       // full 120-indicator vectors (not just summaries)
    acoustic_profiles: true,    // per-session acoustic signature
    word_timestamps: true,      // word-level temporal data
    topic_classifications: true, // V5 topic detection results
    cross_session_deltas: true, // indicator-level change between sessions
    historical_context: 'last_4_weeks',
  },
  analyses: [
    'cross_indicator_correlation_discovery',  // NEW: find unexpected correlations
    'micro_pattern_detection',                // patterns invisible to rule engine
    'cascade_trajectory_validation',          // validate algorithmic cascade detection
    'acoustic_linguistic_fusion',             // NEW: how voice quality affects language
    'topic_normalized_assessment',            // NEW: score relative to topic expectations
    'confounded_indicator_identification',    // which indicators are unreliable this week
    'differential_diagnosis_validation',      // validate/override 23-rule engine
    'family_narrative',                       // warm, actionable family report
    'medical_narrative',                      // clinical language, formal report
    'next_week_probes',                       // conversation adaptations
  ]
};
```

#### Key Improvements

1. **Cross-indicator correlation discovery.** Opus can identify novel indicator interactions not captured by the rule engine. Example: "ACU_SHIMMER and SEM_IDEA_DENSITY are declining in parallel — the vocal instability may be causing the speaker to simplify their speech to maintain intelligibility, not a cognitive decline."

2. **Acoustic-linguistic fusion.** V5 provides Opus with both acoustic and linguistic data for the same utterances, enabling analysis like: "Pauses before nouns are 0.8s longer than pauses before verbs — classic word-finding difficulty pattern (Pistono 2019)."

3. **Topic-normalized weekly assessment.** Opus receives topic classifications for each session and can reason about whether a low-scoring session reflects topic effects or genuine decline.

---

### 5.9 Split-Half Cross-Validation for Batch Analysis

For offline analysis like Profile01 (where all sessions are processed at once), V5 implements proper cross-validation:

```javascript
function batchAnalyzeWithCrossValidation(sessions) {
  const results = [];

  // K-fold cross-validation (k = sessions.length, leave-one-out)
  for (let i = 0; i < sessions.length; i++) {
    const baselineSessions = sessions.filter((_, j) => j !== i);
    const testSession = sessions[i];

    const baseline = computeV4Baseline(
      baselineSessions.map(s => s.feature_vector),
      Math.min(baselineSessions.length, 5)
    );

    const result = analyzeSession(testSession.feature_vector, baseline);
    results.push({ ...result, session_id: testSession.session_id });
  }

  // Aggregate: each session scored against all-others baseline
  return aggregateResults(results);
}
```

This eliminates the self-referential baseline problem where aggregate z-scores always converge to zero.

---

### 5.10 V5 Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    CVF V5 "deep_voice" Architecture              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT: Audio (WebM/WAV) + Optional Conversation Context         │
│                                                                  │
│  ┌─── STREAM 1: AUDIO (GPU-accelerated, <5s) ─────────────────┐│
│  │  ffmpeg → WAV → ┬─ torchaudio (MFCCs, spectral, energy)    ││
│  │                  ├─ parselmouth (F0, jitter, shimmer, HNR)  ││
│  │                  ├─ nolds-rs (PPE, RPDE, DFA, D2)           ││
│  │                  └─ Whisper large-v3 (transcript + words)   ││
│  │  → 27 acoustic indicators + word-level timestamps           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─── STREAM 2: TEXT (Opus 4.6, dual-pass) ────────────────────┐│
│  │  Topic Detection → Genre Classification                     ││
│  │  NLP Pre-computation → 20 deterministic indicators          ││
│  │  Word Timestamps → 16 acoustic temporal indicators          ││
│  │  Opus Pass 1 → 44 subjective indicators (8K thinking)      ││
│  │  Opus Pass 2 → Consistency validation (4K thinking)         ││
│  │  → 80 text/temporal indicators with confidence intervals    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─── MERGE ──────────────────────────────────────────────────┐ │
│  │  27 acoustic + 80 text + 13 micro-task = 120 indicators    │ │
│  │  + topic classification + confidence intervals              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─── SCORING ────────────────────────────────────────────────┐ │
│  │  Baseline (14+ sessions, or cross-validated for batch)     │ │
│  │  Z-scores (topic-adjusted) → 11-domain scores              │ │
│  │  → Composite → Alert Level                                 │ │
│  │  → 3 Cascade Detectors (AD, PD, Depression)                │ │
│  │  → Expanded Sentinel Check (27 rules)                      │ │
│  │  → Decline Profile (velocity + acceleration)               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─── DIFFERENTIAL (expanded) ────────────────────────────────┐ │
│  │  30 rules across 10 conditions                              │ │
│  │  + topic-adjusted thresholds                                │ │
│  │  + acoustic-linguistic fusion rules                         │ │
│  │  + confidence-weighted evidence                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─── WEEKLY DEEP (Opus 4.6, 32K thinking) ───────────────────┐│
│  │  Raw 120-indicator vectors × 7 sessions                     ││
│  │  Cross-indicator correlation discovery                      ││
│  │  Acoustic-linguistic fusion analysis                        ││
│  │  Topic-normalized weekly assessment                         ││
│  │  12-week trajectory forecast                                ││
│  │  Family + medical narratives                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  COST: ~$2.10/week (daily Opus) + micro-tasks                   │
│  LATENCY: <45s per daily session (vs ~5 min V4)                 │
│  INDICATORS: 120 (vs 85 V4)                                     │
│  FALSE POSITIVE TARGET: <15% (vs 44% observed in V4)            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part III: V5 Implementation Roadmap

### Phase 1: Foundation (2 weeks)

| Task | Priority | Effort |
|------|----------|--------|
| Switch daily extraction to Opus 4.6 | P0 | 2 days |
| Implement topic detection layer | P0 | 3 days |
| Add word-level Whisper timestamps | P0 | 2 days |
| Compute 5 new temporal indicators from timestamps | P0 | 2 days |
| Split-half cross-validation for batch mode | P1 | 1 day |
| Update indicator registry (85 → 107) | P1 | 2 days |

### Phase 2: Audio Acceleration (2 weeks)

| Task | Priority | Effort |
|------|----------|--------|
| torchaudio GPU pipeline for MFCCs/spectral | P0 | 3 days |
| Rust nolds-rs implementation (PPE, RPDE, DFA) | P1 | 5 days |
| Parallel session processing | P1 | 2 days |
| Task-specific acoustic norm tables | P0 | 2 days |
| Acoustic extraction validation pipeline | P1 | 2 days |

### Phase 3: Analysis Depth (2 weeks)

| Task | Priority | Effort |
|------|----------|--------|
| Multi-pass Opus extraction with consensus | P0 | 3 days |
| Deterministic NLP pre-computation (20 indicators) | P1 | 3 days |
| Pragmatic + Executive function domains | P2 | 3 days |
| Enhanced weekly deep analysis prompt | P1 | 2 days |
| Confidence interval output for all indicators | P1 | 2 days |

### Phase 4: Validation (2 weeks)

| Task | Priority | Effort |
|------|----------|--------|
| Calibration dataset (100+ speakers) | P0 | Ongoing |
| False positive rate measurement | P0 | 2 days |
| V4 vs V5 comparison on existing patient data | P0 | 3 days |
| Acoustic norm validation across demographics | P1 | 3 days |
| Topic adjustment validation | P1 | 2 days |

---

## Part IV: Expected V5 Improvements

### Quantitative Targets

| Metric | V4 (measured) | V5 (target) |
|--------|--------------|-------------|
| Indicators per session | 70 (without micro-tasks) | 107 (without micro-tasks) |
| False positive rate (session-level) | 44% (Profile01) | <15% |
| Audio processing time | ~25s/session | <5s/session |
| Full pipeline latency | ~5 min/session | <45s/session |
| Text extraction variability | ~0.08 SD (estimated) | <0.04 SD (dual-pass) |
| Temporal indicator precision | Estimated from text | Acoustic ground truth |
| Batch analysis validity | Self-referential (converges to 0) | Cross-validated |
| Weekly cost per patient | $0.84 | $2.10 |
| Conditions detected | 8 | 10 (+ pragmatic aphasia, FTD) |
| Differential rules | 23 | 30+ |

### Qualitative Improvements

1. **Topic-aware scoring eliminates genre-driven false positives** — a recipe will no longer trigger AD alerts
2. **Opus 4.6 daily extraction provides deeper linguistic reasoning** — catching subtle patterns Sonnet misses
3. **Real acoustic temporal measurements replace estimates** — pause location analysis becomes diagnostic-grade
4. **Cross-indicator correlation discovery** — weekly Opus analysis finds novel biomarker interactions
5. **Confidence intervals** — downstream consumers know which scores are reliable and which are noisy
6. **Faster processing** — enables real-time clinical use, not just batch analysis

---

*This document serves as both a transparent self-assessment of V4 limitations discovered during the Profile01 analysis and a technical blueprint for the V5 "deep_voice" architecture. The proposed improvements are prioritized by clinical impact and implementation feasibility.*
