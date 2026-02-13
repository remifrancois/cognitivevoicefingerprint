# Fraser et al. 2015 — Linguistic Features Identify Alzheimer's Disease in Narrative Speech

## Citation
Fraser, K.C., Meltzer, J.A., & Rudzicz, F. (2015). Linguistic Features Identify Alzheimer's Disease in Narrative Speech. Journal of Alzheimer's Disease, 49(2), 407-422.

## Key Findings

### 370 Linguistic Features Analyzed
The study extracted 370 features across multiple linguistic dimensions from DementiaBank Cookie Theft picture descriptions:

**Lexical Features:**
- Type-Token Ratio (TTR): AD patients show 15-25% reduction
- Brunet's W Index: Higher in AD (less lexical diversity)
- Honore's R Statistic: Lower in AD (fewer hapax legomena)
- Content density: Proportion of content words decreases
- Word frequency: Shift toward high-frequency, common words
- Pronoun ratio increases (vague referencing replaces specific naming)

**Syntactic Features:**
- Mean Length of Utterance (MLU): Decreases with disease progression
- Subordination index: Drops as syntactic complexity reduces
- Sentence completeness: More fragments and incomplete utterances
- Passive construction ratio: Generally stable early
- Embedding depth: Reduces as patients simplify sentence structure

**Semantic/Coherence Features:**
- Idea density: Key predictor — number of propositions per utterance
- Topic maintenance: Increased topic drift in AD
- Referential coherence: Pronoun-antecedent distance increases
- Information units: Fewer correct information units in picture descriptions
- Temporal sequencing: Difficulty ordering events chronologically

**Fluency Features:**
- Long pause ratio: Pauses >2 seconds increase, especially mid-utterance
- Filler rate: "Um", "uh" increase as word-finding difficulty increases
- False starts: Incomplete words/phrases increase
- Repetition rate: Same phrases repeated (narrative loops)
- Response latency: Time to begin responding increases

**Memory Features (from discourse):**
- Free recall accuracy: Declines first in AD (episodic retrieval failure)
- Cued recall response: Preserved early, fails later
- Recognition: Last to decline (storage vs retrieval)
- Temporal precision: Event dating becomes vague
- Emotional engagement: May remain stable even as cognition declines

### Classification Results
- **81.92% accuracy** using automated features
- Best features: TTR, information units, idea density, Brunet's W
- Factor analysis revealed 5 main factors:
  1. Semantic impairment (TTR, content density, pronouns)
  2. Syntactic complexity (MLU, subordination)
  3. Fluency/production (pauses, fillers)
  4. Information content (idea density, info units)
  5. Discourse coherence (topic maintenance, referential clarity)

### AD Progression Cascade
Fraser identified a characteristic cascade:
1. **Stage 1**: Lexical + Coherence decline (semantic memory)
2. **Stage 2**: Syntactic simplification
3. **Stage 3**: Discourse/Fluency collapse
4. **Stage 4**: Pragmatic failure (communication breakdown)

## Impact on MemoVoice
This paper is the **foundation** of our 25-feature CVF extraction system. Our 5 domains map directly to Fraser's 5 factors. The cascade pattern informs our alert escalation logic.
