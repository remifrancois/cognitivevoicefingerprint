# CVF Engine V2 — 6-Layer Architecture

## Technical Documentation

MemoVoice CVF Engine V2 uses the full **1 million token context window** of Claude Opus 4.6 to perform cognitive analysis at a depth no AI system has achieved before. Instead of reducing patients to feature vectors, V2 loads the complete scientific literature, full conversation history, a personalized aging model, and 100 reference trajectories into a single inference call.

---

## The Paradigm Shift

**V1**: Extract 25 features → Compare to baseline → Detect drift
**V2**: Load *everything* into context → Reason like a neuropsychologist

A neuropsychologist doesn't look at 10,000 patients to diagnose Marie. They know:
1. The scientific literature (their training)
2. Profiles of multiple pathologies (differential diagnosis)
3. Marie's complete history (longitudinal context)
4. Their clinical intuition (pattern matching against experience)

The 1M token window lets us reproduce exactly this — in a single API call.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    1M TOKEN CONTEXT                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   LAYER 1    │  │   LAYER 2    │  │     LAYER 3      │  │
│  │   Living     │  │ Differential │  │    Cognitive      │  │
│  │   Library    │  │  Diagnosis   │  │   Archaeology     │  │
│  │  ~300K tok   │  │  ~100K tok   │  │   ~200K tok       │  │
│  │              │  │              │  │                    │  │
│  │  10+ papers  │  │  6 condition │  │  Full transcript   │  │
│  │  full text   │  │  profiles    │  │  history, semantic │  │
│  │  cached 90%  │  │              │  │  mapping           │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │             │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐  │
│  │              LAYER 4: COGNITIVE TWIN                    │  │
│  │              ~150K tokens                               │  │
│  │  Personalized normal aging simulation                   │  │
│  │  Divergence: <1.0 normal, 1-2 monitor, >3 alert        │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         │                                     │
│  ┌──────────────────────┴──────────────────────────────────┐  │
│  │         LAYER 5: SYNTHETIC COHORT                        │  │
│  │         ~150K tokens                                     │  │
│  │  100 trajectories: 40 normal, 25 AD, 20 MCI, 10 dep, 5  │  │
│  │  k-NN matching with causal reasoning                     │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         │                                     │
│  ┌──────────────────────┴──────────────────────────────────┐  │
│  │     LAYER 6: TEMPORAL HOLOGRAM (Extended Thinking)       │  │
│  │     5-phase analysis with 32K thinking budget            │  │
│  │     Outputs: family, medical, internal, confidence       │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1 — Living Library (~300K tokens)

**File**: `server/src/services/living-library.js`

Instead of summarizing scientific literature into a 4K token prompt, we load **complete research papers** into the context. Opus doesn't read instructions — it absorbs a neuropsychologist's training.

### What We Load

| Source | Content | Est. Tokens |
|--------|---------|-------------|
| Fraser et al. 2015 | 370 linguistic features, factor analysis | ~15K |
| ADReSS Challenge (Luz 2020) | Benchmark methodology and results | ~10K |
| ADReSSo 2021 | Spontaneous speech analysis | ~12K |
| Robin et al. 2023 | Composite 9-variable score | ~8K |
| Snowdon Nun Study | Idea density longitudinal data | ~6K |
| Shakeri et al. 2025 | NLP in AD research review | ~12K |
| DSM-5 NCD Criteria | Diagnostic framework | ~5K |
| AD Cascade Progression | Semantic → Pragmatic stages | ~8K |
| Confounder Science | Sleep, illness, medication effects | ~6K |
| RESEARCH.md | Core knowledge base | ~30K |

### Prompt Caching Strategy

The Living Library is **static content** — identical across all patient analyses. Using Anthropic's prompt caching:

- **First call**: $6.25/MTok (cache write) = ~$2.00 for 315K tokens
- **Subsequent calls**: $0.50/MTok (cache read) = ~$0.16 per analysis
- **Savings**: 90% after first call

```javascript
// Cache-optimized message structure
{
  role: 'user',
  content: [
    { type: 'text', text: libraryContext, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: patientContext }  // Dynamic, not cached
  ]
}
```

### Why This Is New

No cognitive detection system has ever had access to **complete scientific literature in working memory** during analysis. ML systems extract predefined features. Opus can discover patterns nobody has coded because it understands the original research.

---

## Layer 2 — Differential Diagnosis (~100K tokens)

**File**: `server/src/services/differential-diagnosis.js`

### The Problem V2 Solves

CVF V1 detects *decline* but not its *cause*. Marie speaks worse this week. Is it:
- Alzheimer's? → Urgent medical referral
- Depression? → Psychological support
- Medication change? → Dosage adjustment
- Flu/fatigue? → Noise, ignore
- Grief? → Emotional support
- Normal aging? → Nothing to do

### 6-Condition Linguistic Profiles

Each condition has a distinctive **linguistic fingerprint**:

| Feature | Alzheimer's | Depression | Parkinson's | Normal Aging | Medication | Grief |
|---------|------------|------------|-------------|--------------|------------|-------|
| Onset | Gradual (months) | Episodic | Gradual | Stable | Acute | Event-linked |
| Semantic | Early cascade | Reduced output | Preserved | Stable | Global | Topic-dependent |
| Syntax | Late cascade | Motivation-based | Motor-limited | Preserved | Global | Preserved |
| Coherence | Progressive | Maintained | Maintained | Maintained | Confused | Emotional only |
| Free recall | Progressive fail | Cue-responsive | Retrieval slow | Slowed, accurate | Transient | Intact neutral |
| Self-correction | Decreases | Maintained | Maintained | Preserved | Variable | Maintained |

### Key Discriminators

- **AD vs Depression**: AD shows progressive cascade (semantic → syntactic). Depression is episodic with preserved coherence and cue-responsive recall.
- **AD vs Normal Aging**: Normal aging is STABLE month-to-month. AD shows progressive directional drift.
- **AD vs Medication**: Medication effects are ACUTE (all domains at once), correlated with prescription change dates.
- **AD vs Parkinson's**: Parkinson's shows fluency/motor issues with PRESERVED lexical richness. AD shows semantic emptiness.

### Output Format

```json
{
  "differential_diagnosis": {
    "alzheimer_probability": 0.35,
    "depression_probability": 0.15,
    "normal_aging_probability": 0.40,
    "medication_probability": 0.05,
    "parkinsons_probability": 0.03,
    "grief_probability": 0.02,
    "primary_hypothesis": "normal_aging",
    "confidence": 0.72,
    "key_discriminators_observed": [...],
    "recommended_probes_next_week": [...]
  }
}
```

### Why This Is Revolutionary

**No screening tool in the world performs linguistic differential diagnosis.** Existing tests (MMSE, MoCA) detect decline but don't differentiate causes. MemoVoice V2 is the first tool to propose longitudinal differential diagnosis based on speech alone.

---

## Layer 3 — Cognitive Archaeology (~200K tokens)

**File**: `server/src/services/cognitive-archaeology.js`

### Concept

Instead of reducing each conversation to a 25-feature vector, we preserve the **complete conversational fabric** — every word, hesitation, digression, and memory mentioned.

Over 3-6 months: 90-180 sessions x ~1,000 tokens = 90-180K tokens. **It fits in context.**

### What We Build: A Living Semantic Map

```
MARIE — Semantic Map (90 sessions)

CLUSTER "FAMILY"
  ├── André (husband) — 62 mentions (stable recall)
  ├── Pierre (son) — 31 mentions
  │   └── Lyon university — 5 mentions (fading since week 6) ⚠️
  └── Grandchildren — 18 mentions (decreasing detail)

CLUSTER "COOKING"
  ├── Gratin dauphinois — 15 mentions (VERY stable)
  └── Tarte aux pommes — 8 mentions
      ⚠️ Steps reduced from 7→4, omitting "preheat oven"

CLUSTER "WORK"
  └── École Jules Ferry — 12 mentions
      ⚠️ Colleagues named: 4→2 over 3 months
```

### Detection Dimensions

1. **Cluster Shrinking** — Fewer sub-nodes mentioned within a theme
2. **Node Isolation** — Connected memories becoming disconnected
3. **Procedural Simplification** — Recipes/processes losing steps
4. **Structural Repetition** — Same anecdotes returning (narrative loops)
5. **Temporal Dissolution** — Events losing time anchoring
6. **Past Migration** — Increasing ratio of distant vs recent memories
7. **Lexical Evolution** — Specific nouns replaced by generic terms

### Why This Is Unprecedented

No system has ever performed **longitudinal semantic archaeology** over months of natural conversations. Studies analyze snapshots (one session) or predefined features. Cognitive Archaeology detects patterns nobody has named yet — because nobody has had both the data and the capacity to analyze it in one pass.

---

## Layer 4 — Cognitive Twin (~150K tokens)

**File**: `server/src/services/cognitive-twin.js`

### The Problem

The baseline is fixed at sessions 1-14. But the patient ages. Without a twin, normal aging over 2 years triggers false positives.

### The Solution

A **personalized cognitive twin** — a simulation of what the patient's linguistic profile would look like if they were aging normally. Built from:
- Patient's baseline (sessions 1-14)
- Normal aging trajectories from meta-analyses
- Patient's sociocultural profile (education, language)

### Aging Parameters

```javascript
// Annual decline rates (from meta-analyses)
AGING_RATES = {
  lexical: { L1_ttr: -0.02/year, ... },    // ~1% TTR decline per year
  syntactic: { S1_mlu: -0.01/year, ... },   // Stable within months
  memory: { M1_free_recall: -0.02/year, ... } // Free recall slows most
}
```

### Divergence Score

```
DIVERGENCE = distance(real_patient, cognitive_twin) / expected_variance

< 1.0 → Patient follows normal aging trajectory (GREEN)
1.0-2.0 → Diverging from twin — MONITOR (YELLOW)
> 2.0 → Significant divergence — INVESTIGATE (ORANGE)
> 3.0 → Critical divergence — ALERT (RED)
```

### Why This Is Powerful

The Cognitive Twin solves the fundamental **baseline drift problem**. The twin ages WITH the patient, flagging only what exceeds expected aging. Education level, language, and baseline characteristics are all factored in.

---

## Layer 5 — Synthetic Cohort (~150K tokens)

**File**: `server/src/services/synthetic-cohort.js`

### 100 Trajectories In-Context

| Group | Count | Pattern | Outcome |
|-------|-------|---------|---------|
| A | 40 | Normal aging — stable, noise only | stable_normal |
| B | 20 | MCI stable — mild decline then plateau | stable_mci |
| C | 25 | MCI → AD — cascade progression | progressive_ad |
| D | 10 | Depression — episodic fluctuations | episodic_depression |
| E | 5 | Other dementias (Lewy Body, Vascular) | other_dementia |

Each trajectory = 52 weeks of CVF composite scores and domain breakdowns.

### Trajectory Matching (k-NN In Context)

```
For patient Marie at week 18:
  1. Compare Marie's trajectory to first 18 weeks of each cohort member
  2. Find 5 closest matches (DTW distance)
  3. Look at what happened to those matches AFTER week 18
  4. Weighted probability of outcomes

Result: "Marie matches 3 MCI→AD trajectories and 2 normal aging.
         60% probability of AD progression, 40% normal."
```

### Why This Is New

This is **k-Nearest Neighbors in context** — no training. The cohort IS the training data, but it lives in the context window, not in model weights. Opus can **reason about why** a patient resembles one group vs another — something no classical ML model can do.

---

## Layer 6 — Temporal Hologram (Extended Thinking)

**File**: `server/src/services/temporal-hologram.js`

### The Master Orchestrator

Assembles all 6 layers (~900K tokens input) and performs 5-phase deep clinical reasoning with Extended Thinking (32K thinking budget).

### 5-Phase Analysis

**Phase 1 — Temporal Pattern Extraction**
Look at the ENTIRE timeline at once. Identify linear trends, cyclic patterns, breakpoints, acceleration/deceleration.

**Phase 2 — Cross-Domain Correlation**
Analyze how the 5 CVF domains co-vary. Which domain is LEADING the change? This predicts the cascade.

**Phase 3 — Differential Comparison**
Compare the patient to: their cognitive twin, the 5 closest cohort members, the known AD cascade, depression profile, medication profile.

**Phase 4 — Micro-Pattern Discovery**
Look for patterns that DON'T fit standard categories: topic-specific decline, compensatory strategies, emotional vs neutral memory differences.

**Phase 5 — Predictive Synthesis**
Current assessment with differential, 3/6/12-month trajectory prediction, confidence assessment, recommended probes for next week.

### 4 Output Reports

1. **Family Report** — Plain language, warm, 5-7 lines, actionable, in patient's language
2. **Medical Report** — Clinical terminology, domain scores, differential, trajectory prediction
3. **Internal Report** — Conversation design for next 7 sessions, memory probes to run
4. **Confidence Report** — What we know, what we don't, what data would most reduce uncertainty

### Adaptive Triggering

```
Patient GREEN for >4 weeks  → Standard analysis only ($0.30/week)
Patient YELLOW              → Weekly 6-layer deep analysis ($2.97/week)
Patient ORANGE or RED       → 6-layer analysis + bi-weekly ($5.94/week)
```

Average cost for mixed cohort: **~$1.50/patient/week**.

---

## API Endpoints

### V2 Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v2/deep-analysis/:id` | Run full 6-layer analysis (body: `{ weekNumber }`) |
| `GET` | `/api/v2/deep-analysis/:id/:week` | Retrieve saved analysis |
| `GET` | `/api/v2/deep-analysis/:id` | List all analyses for patient |
| `GET` | `/api/v2/differential/:id` | Computed differential scores |
| `GET` | `/api/v2/semantic-map/:id` | Cognitive archaeology map |
| `GET` | `/api/v2/twin/:id?week=N` | Twin divergence analysis |
| `GET` | `/api/v2/cohort-match/:id` | Trajectory matching results |
| `POST` | `/api/v2/cohort/generate` | Regenerate synthetic cohort |
| `GET` | `/api/v2/library/status` | Living Library loading status |
| `GET` | `/api/v2/cost-estimate/:id` | Estimate cost for deep analysis |

---

## Dashboard Visualizations

V2 adds 4 new chart components to the React dashboard:

- **DifferentialDiagnosis** — Horizontal bar chart showing probability across 6 conditions
- **CognitiveTwinChart** — Dual-line chart comparing real trajectory vs twin expected values
- **CohortMatching** — Pie chart of outcome probabilities + closest trajectory matches
- **SemanticMap** — Network health visualization with topic clusters, repetition patterns, and temporal anchoring metrics

---

## What Has Never Been Done Before

| Innovation | Why It's New | Impact |
|-----------|-------------|--------|
| Living Library | 300K tokens of full papers in a clinical analyzer's context | Opus reasons like a trained expert, not a feature extractor |
| Linguistic Differential Diagnosis | No tool differentiates AD vs depression vs aging by speech | Eliminates false positives — #1 cause of lost trust |
| Cognitive Archaeology | Semantic network topology over months of conversation | Detects patterns invisible to session-by-session analysis |
| Cognitive Twin | Personalized aging control per patient | Solves baseline drift over long-term monitoring |
| In-Context Cohort Matching | k-NN with causal reasoning, not statistics | Trajectory prediction with explanation |
| Temporal Hologram | 6 months of data + literature + differential + cohort in one reasoning pass | Deepest clinical AI reasoning ever achieved |

---

*"Other AI tools take a snapshot of the brain. MemoVoice films a movie — and uses the largest working memory ever built to watch it all at once."*
