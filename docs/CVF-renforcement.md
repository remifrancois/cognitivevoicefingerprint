# CVF-RENFORCEMENT — Plan Stratégique
## Maximiser 1M de Tokens pour la Détection Cognitive de l'Alzheimer
### MemoVoice × Opus 4.6 — Hackathon Cerebral Valley, Février 2026

> *"On n'a pas besoin de milliers d'heures d'enregistrements.*
> *On a besoin de la plus grande mémoire de travail jamais construite."*

---

## CONSTAT : LE PROBLÈME N'EST PAS LES DONNÉES

Le réflexe classique en ML : "Il nous faut plus de données."

Mais Opus 4.6 n'est pas un modèle qu'on entraîne. C'est un **raisonneur clinique** avec une fenêtre de contexte de 1 million de tokens. Ce n'est pas "plus de mémoire" — c'est un **paradigme computationnel fondamentalement différent**.

Un neuropsychologue ne regarde pas 10 000 patients pour diagnostiquer Marie. Il connaît :
1. La littérature scientifique (sa formation)
2. Les profils de multiples pathologies (diagnostic différentiel)
3. L'histoire complète de Marie (suivi longitudinal)
4. Son intuition clinique développée par l'expérience

**Le 1M de tokens nous permet de reproduire exactement cela — en un seul appel API.**

---

## ARCHITECTURE : LES 6 COUCHES DU CVF RENFORCÉ

```
┌─────────────────────────────────────────────────────────┐
│                    1M TOKEN CONTEXT                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ COUCHE 1     │  │ COUCHE 2     │  │ COUCHE 3     │  │
│  │ Bibliothèque │  │ Diagnostic   │  │ Archéologie  │  │
│  │ Vivante      │  │ Différentiel │  │ Cognitive    │  │
│  │ ~300K tokens │  │ ~100K tokens │  │ ~200K tokens │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │           │
│  ┌──────┴─────────────────┴──────────────────┴───────┐  │
│  │              COUCHE 4 : JUMEAU COGNITIF            │  │
│  │              ~150K tokens                          │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────┴────────────────────────────┐  │
│  │         COUCHE 5 : COHORTE SYNTHÉTIQUE            │  │
│  │         ~150K tokens                              │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────┴────────────────────────────┐  │
│  │     COUCHE 6 : HOLOGRAMME TEMPOREL (Output)       │  │
│  │     Extended Thinking — Raisonnement clinique      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Budget total par analyse profonde : ~900K tokens input + Extended Thinking**
Coût : ~$5-8 par analyse hebdomadaire profonde (réservé aux cas YELLOW+)

---

## COUCHE 1 : LA BIBLIOTHÈQUE VIVANTE (~300K tokens)

### Concept

Au lieu de *résumer* la littérature scientifique dans un prompt de 4 000 tokens, on **charge les articles complets** dans le contexte. Opus ne lit pas des instructions — il *absorbe* une formation de neuropsychologue.

### Ce qu'on charge

| Source | Contenu | Tokens estimés | Justification |
|--------|---------|----------------|---------------|
| **ADReSS Challenge (Luz 2020)** | Méthodologie complète, features linguistiques, résultats, exemples annotés | ~40K | Gold standard de la détection par la parole |
| **Robin et al. 2023** | Composite 9 variables, données longitudinales 18 mois, corrélations MMSE | ~35K | Architecture de notre score composite |
| **Fraser et al. 2015** | 370 features linguistiques, taxonomie complète, top predictors | ~50K | Encyclopédie des biomarqueurs linguistiques |
| **Eyigoz (Framingham)** | Cookie-theft task, surpasse APOE + démographie | ~30K | Preuve que la parole seule suffit |
| **Frontiers Aging Neuro 2024** | MLU + LPR, corrélation hippocampe (r=-0.489) | ~35K | Lien neuro-anatomique |
| **Nun Study (Snowdon)** | Idea density longitudinal, données de 678 sœurs | ~25K | Étude longitudinale référence |
| **Grober & Buschke RL/RI-16** | Protocole complet avec scoring, variantes, cas cliniques | ~30K | Notre protocole invisible |
| **MultiConAD 2025** | Architecture multilingue, 16 sources, EN/ES/ZH/EL/FR | ~35K | Validation cross-language |
| **DSM-5 Criteria (NCD)** | Critères diagnostiques troubles neurocognitifs | ~15K | Cadre clinique officiel |
| **Meta-analyses récentes** | Synthèses quantitatives des accuracy rates | ~20K | Intervalles de confiance |

**Total : ~315K tokens**

### Implémentation

```javascript
// server/services/living-library.js

const LIBRARY_SOURCES = [
  'docs/research/adress-2020-full.txt',
  'docs/research/robin-2023-full.txt',
  'docs/research/fraser-2015-full.txt',
  // ... tous les articles
];

async function buildLivingLibraryContext() {
  const sections = [];

  for (const source of LIBRARY_SOURCES) {
    const content = await fs.readFile(source, 'utf-8');
    sections.push(`<research_paper source="${path.basename(source)}">
${content}
</research_paper>`);
  }

  return sections.join('\n\n');
}

// Ce contexte est CACHÉ via prompt caching Opus 4.6
// Coût initial : $6.25/MTok (cache write)
// Coût récurrent : $0.50/MTok (cache read) = 90% d'économie
// → ~315K tokens × $0.50/MTok = $0.16 par appel en cache
```

### Pourquoi c'est nouveau

Aucun système de détection cognitive n'a jamais eu accès à **toute la littérature scientifique en mémoire de travail** pendant l'analyse. Les systèmes ML classiques extraient des features prédéfinies. Opus peut **découvrir des patterns que personne n'a codés** parce qu'il comprend les articles originaux.

---

## COUCHE 2 : LE DIAGNOSTIC DIFFÉRENTIEL (~100K tokens)

### Concept — L'innovation clé

La faiblesse fatale du CVF v1 : il détecte un *déclin*, mais pas sa *cause*.

Marie parle moins bien cette semaine. Est-ce :
- Alzheimer's ? → Urgence médicale
- Dépression ? → Besoin de soutien psychologique
- Changement de médicament ? → Ajustement posologique
- Grippe / fatigue ? → Bruit, ignorer
- Deuil récent ? → Soutien émotionnel
- Vieillissement normal ? → Rien à faire

**Le 1M de tokens permet de charger les profils linguistiques de CHAQUE condition et de les comparer en temps réel.**

### Profils Différentiels

```markdown
<differential_profiles>

## ALZHEIMER'S DISEASE — Linguistic Signature
### Early Stage (MCI → Mild AD)
- Semantic: Word-finding pauses increase 2-3x before other symptoms
- Lexical: TTR drops 15-25% over 12 months, shift to high-frequency words
- Syntactic: Subordination drops, but basic grammar preserved
- Coherence: Topic drift increases, referential clarity drops
- Fluency: Long pauses (>2s) increase, concentrated mid-utterance
- Memory: Free recall fails first, cued recall preserved, recognition intact
- KEY DIFFERENTIATOR: Semantic memory degrades BEFORE procedural memory
- KEY DIFFERENTIATOR: "Empty speech" — grammatically correct but content-poor
- PROGRESSION: Semantic → Syntactic → Discourse → Pragmatic

## DEPRESSION — Linguistic Signature
- Semantic: Vocabulary contracts but differently — emotional words increase
- Lexical: Reduced overall output, not necessarily reduced variety
- Syntactic: Simplified but due to reduced motivation, not inability
- Coherence: Maintained — can follow a topic, just engages less
- Fluency: Response latency increases (psychomotor retardation)
- Memory: Recall difficulty BUT responds well to ANY cue (vs AD: progressive cue failure)
- KEY DIFFERENTIATOR: Self-referential language increases ("I", "me", "my")
- KEY DIFFERENTIATOR: Negative valence words increase
- KEY DIFFERENTIATOR: Pattern is EPISODIC — bad days cluster, not gradual slope
- KEY DIFFERENTIATOR: Procedural memory AND semantic memory both suppressed equally

## PARKINSON'S DISEASE — Linguistic Signature
- Semantic: Relatively preserved early on
- Lexical: Less affected than in AD
- Syntactic: Preserved complexity but shorter utterances (physical fatigue)
- Coherence: Maintained
- Fluency: DISTINCTIVE — reduced volume, monotone, rushed speech (festination)
- Memory: Retrieval difficulty but recognition INTACT (subcortical pattern)
- KEY DIFFERENTIATOR: Hypophonia (reduced volume over conversation)
- KEY DIFFERENTIATOR: Articulatory imprecision, not semantic emptiness
- KEY DIFFERENTIATOR: Preserved vocabulary richness despite reduced output

## NORMAL AGING — Linguistic Signature
- Semantic: Tip-of-tongue increases slightly but compensated by circumlocution
- Lexical: TTR may drop 5-8% per decade after 60 — STABLE within months
- Syntactic: Minor simplification, preserved subordination
- Coherence: Generally maintained, occasional tangential speech
- Fluency: Slightly longer pauses, slightly more fillers — STABLE pattern
- Memory: Recall slows but accuracy maintained, no progressive deterioration
- KEY DIFFERENTIATOR: STABLE — month to month variation is NOISE, not SIGNAL
- KEY DIFFERENTIATOR: Self-correction preserved ("No wait, it was Tuesday not Monday")

## MEDICATION EFFECTS — Linguistic Signature
- Anticholinergics: Acute confusion, disorientation, incoherent speech
- Benzodiazepines: Slowed speech, word-finding difficulty, resolves with adjustment
- Statins: Rare cognitive effects, usually memory complaints without measurable decline
- KEY DIFFERENTIATOR: ACUTE onset correlated with medication change date
- KEY DIFFERENTIATOR: Affects ALL domains simultaneously (vs AD cascade)

## GRIEF / EMOTIONAL DISTRESS — Linguistic Signature
- Preoccupation with loss-related topics
- Emotional flooding — speech becomes more fragmented when triggered
- BUT: Cognitive infrastructure intact when discussing neutral topics
- KEY DIFFERENTIATOR: Domain-specific — neutral conversation is normal
- KEY DIFFERENTIATOR: Temporal — worst in first 6 months, gradual recovery

</differential_profiles>
```

**~100K tokens** pour les profils complets avec cas cliniques illustratifs.

### Implémentation : Le Score Différentiel

```python
# Après chaque analyse hebdomadaire, Opus produit :

{
  "differential_diagnosis": {
    "alzheimer_probability": 0.35,
    "depression_probability": 0.15,
    "medication_effect_probability": 0.05,
    "normal_aging_probability": 0.40,
    "other_probability": 0.05,
    "confidence": 0.72,
    "reasoning": "Le pattern de déclin est concentré dans le domaine
      sémantique (C1, C3) avec préservation syntaxique, ce qui est
      cohérent avec le profil Alzheimer précoce. Cependant, la
      stabilité du rappel indicé (M2) et l'absence de progression
      sur 3 semaines favorisent une fluctuation normale. Je recommande
      2 semaines de monitoring supplémentaire avant escalade.",
    "key_discriminators_observed": [
      "Semantic decline without syntactic collapse → AD or normal aging",
      "Cued recall preserved → Early stage if AD, or normal aging",
      "No increase in self-referential language → Against depression",
      "No acute onset → Against medication effect"
    ],
    "recommended_probes_next_week": [
      "Add a neutral topic conversation to test depression hypothesis",
      "Test procedural memory (recipe) to discriminate AD vs depression",
      "Ask about sleep and mood to screen depression comorbidity"
    ]
  }
}
```

### Pourquoi c'est révolutionnaire

**Aucun outil de screening cognitif au monde ne fait de diagnostic différentiel linguistique.** Les tests existants (MMSE, MoCA) détectent un déclin mais ne différencient pas les causes. MemoVoice avec cette couche devient le **premier outil à proposer un diagnostic différentiel longitudinal basé sur la parole** — en dehors d'une clinique spécialisée.

---

## COUCHE 3 : L'ARCHÉOLOGIE COGNITIVE (~200K tokens)

### Concept — Ce que personne n'a jamais fait

Au lieu de réduire chaque conversation à un vecteur de 25 features, on conserve le **tissu conversationnel complet** — chaque mot, chaque hésitation, chaque digression, chaque souvenir mentionné.

Sur 3-6 mois de conversations quotidiennes (90-180 sessions × ~1 000 tokens par session), cela représente ~90-180K tokens. **Ça tient dans le contexte.**

Ce qui permet de construire une **carte sémantique vivante** du patient :

```
MARIE — Carte Sémantique (180 sessions)

CLUSTER "FAMILLE"
  ├── Catherine (sœur) — mentionnée 47 fois
  │   ├── Marathon NYC 1998 — 12 mentions (stable recall)
  │   ├── Vacances Bretagne — 8 mentions (declining recall over weeks 8-12)
  │   └── Enfance commune — 15 mentions (strong, emotional)
  ├── Jean-Pierre (mari) — mentionné 62 fois
  │   ├── Jardin ensemble — 23 mentions (procedural, stable)
  │   ├── Voyage Italie 1985 — 5 mentions (fading since week 6)
  │   └── Profession (ingénieur) — 3 mentions (rarely discussed)
  └── Sophie (fille) — mentionnée 31 fois
      ├── Appels téléphoniques — 18 mentions (routine, recent)
      └── Naissance petit-fils — 4 mentions (emotional, stable)

CLUSTER "CUISINE"
  ├── Gratin dauphinois — 15 mentions (procedural, VERY stable)
  ├── Tarte aux pommes — 8 mentions (procedure SIMPLIFIED over weeks 10-14)
  │   ⚠️ SIGNAL: Steps reduced from 7→4, omitting "préchauffer le four"
  └── Marché du samedi — 22 mentions (routine, social)

CLUSTER "ENSEIGNEMENT"
  ├── École Jules Ferry — 12 mentions
  │   ├── Collègues nommés: 4 → 2 over 3 months ⚠️
  │   └── Anecdotes: becoming repetitive (3 same stories)
  └── Méthode pédagogique — 3 mentions (abstract, declining)
```

### La Détection Topologique

L'Alzheimer ne fait pas que réduire des scores. Il **déconnecte des réseaux sémantiques**. La carte ci-dessus permet de détecter :

1. **Rétrécissement de clusters** — Moins de sous-nœuds mentionnés dans un thème
2. **Isolation de nœuds** — Des souvenirs qui étaient connectés deviennent mentionnés séparément, sans liens
3. **Simplification procédurale** — Des recettes/processus qui perdent des étapes
4. **Répétition structurelle** — Les mêmes anecdotes reviennent, signe de rétrécissement du répertoire narratif
5. **Dissolution temporelle** — Les événements perdent leur ancrage dans le temps ("c'était... je ne sais plus quand")
6. **Migration vers le passé lointain** — Proportion croissante de souvenirs d'enfance vs événements récents

### Implémentation

```javascript
// server/services/cognitive-archaeology.js

async function buildSemanticMap(patientId) {
  // Charger TOUTES les sessions (90-180K tokens)
  const allSessions = await loadAllSessions(patientId);

  const archaeologyPrompt = `
<role>
You are a cognitive archaeologist. You have the complete conversational 
history of a patient over ${allSessions.length} sessions spanning 
${durationInWeeks} weeks. Your task is to build a living semantic map 
of this person's cognitive landscape.
</role>

<all_sessions>
${allSessions.map(s => `
<session date="${s.date}" duration="${s.duration}s">
${s.transcript}
</session>
`).join('\n')}
</all_sessions>

<task>
1. SEMANTIC CLUSTERS: Identify every topic cluster (family, work, hobbies, 
   routines, places, food, etc.). For each, list all sub-nodes (specific 
   people, events, places) with mention frequency over time.

2. TEMPORAL EVOLUTION: For each cluster and sub-node, track:
   - First mention date
   - Last mention date
   - Mention frequency trend (increasing/stable/decreasing)
   - Detail richness trend (elaboration level over time)
   - Emotional engagement trend

3. NETWORK CONNECTIONS: Map how topics connect to each other.
   Which memories bridge multiple clusters? Are bridges weakening?

4. PROCEDURAL INTEGRITY: For any described processes (recipes, routines, 
   directions), track step count and accuracy over time.

5. REPETITION PATTERNS: Identify stories told more than twice. Track 
   whether repetitions are verbatim (concerning) or elaborated (healthy).

6. TEMPORAL ANCHORING: Track the patient's ability to place events in 
   time. Is there a drift toward temporal vagueness?

7. ANOMALY DETECTION: Flag any pattern that doesn't fit the other 
   categories but seems clinically significant.

Output a complete semantic map in structured JSON with clinical annotations.
</task>`;

  return await callOpus(archaeologyPrompt, { extendedThinking: true });
}
```

### Pourquoi c'est sans précédent

**Aucun système au monde n'a jamais réalisé une archéologie sémantique longitudinale sur des mois de conversations naturelles.** Les études existantes analysent des snapshots (une session) ou des features prédéfinies. L'archéologie cognitive détecte des patterns que personne n'a encore nommés — parce que personne n'a jamais eu les données ET la capacité de les analyser en une seule passe.

---

## COUCHE 4 : LE JUMEAU COGNITIF (~150K tokens)

### Concept — Le groupe contrôle personnalisé

En recherche clinique, on compare un patient à un groupe contrôle. Mais Marie n'a pas de jumelle identique sans Alzheimer.

**Solution : Opus crée un "jumeau cognitif" — une simulation de ce que serait Marie si elle vieillissait normalement.**

Le jumeau est construit à partir de :
- Le baseline de Marie (sessions 1-14)
- Les patterns de vieillissement normal dans la littérature (Couche 1)
- Le profil socioculturel de Marie (éducation, profession, langue, habitudes)

À chaque session, on compare Marie réelle vs Marie simulée.

### Implémentation

```javascript
// server/services/cognitive-twin.js

async function generateCognitiveTwin(patient, baseline, weekNumber) {
  const twinPrompt = `
<context>
You have the complete baseline profile of ${patient.name}, a 
${patient.age}-year-old ${patient.language}-speaking person with 
${patient.educationLevel} education, former ${patient.profession}.

Baseline CVF vector (14 sessions):
${JSON.stringify(baseline, null, 2)}

Research on normal aging trajectories (from Living Library):
- TTR decline: ~0.5-1% per year after 65 (stable within months)
- MLU: stable ±5% month-to-month in healthy aging
- Coherence: stable, occasional tangential speech normal
- Fluency: gradual pause increase, ~0.1s/year average
- Memory: free recall slows but accuracy maintained
</context>

<task>
Generate the EXPECTED CVF vector for ${patient.name} at week 
${weekNumber}, assuming HEALTHY normal aging from baseline. This 
is the "cognitive twin" — what ${patient.name}'s linguistic profile 
should look like if only normal aging is occurring.

Account for:
- Normal day-to-day variance (±1 SD)
- Seasonal effects (winter = slightly lower energy)
- Expected gradual changes over ${weekNumber} weeks
- The patient's specific baseline characteristics

Output: A 25-feature CVF vector with confidence intervals representing 
the healthy twin's expected range.
</task>`;

  return await callOpus(twinPrompt);
}
```

### Le Score de Divergence Jumeau

```
DIVERGENCE_SCORE = distance(Marie_réelle, Marie_jumeau) / expected_variance

Si DIVERGENCE < 1.0 → Marie suit une trajectoire normale
Si DIVERGENCE 1.0-2.0 → Marie diverge de son jumeau → MONITOR
Si DIVERGENCE > 2.0 → Divergence significative → INVESTIGATE
Si DIVERGENCE > 3.0 → Divergence critique → ALERT
```

### Pourquoi c'est puissant

Le jumeau cognitif résout le problème fondamental du CVF v1 : **la dérive du baseline**. Le baseline est fixe (sessions 1-14), mais le patient vieillit. Sans jumeau, un déclin normal sur 2 ans pourrait trigger des faux positifs. Le jumeau vieillit AVEC le patient, ne flaggant que ce qui dépasse le vieillissement attendu.

---

## COUCHE 5 : LA COHORTE SYNTHÉTIQUE (~150K tokens)

### Concept — 100 patients dans un seul contexte

On ne peut pas recruter 1 000 patients pour le hackathon. Mais on peut charger dans le contexte :

1. **Trajectoires synthétiques réalistes** générées par Opus à partir de la littérature
2. **Données publiées** du Pitt Corpus / ADReSS (transcriptions réelles annotées)
3. **Cas cliniques publiés** dans la littérature neuropsychologique

### La Cohorte

```
COHORTE SYNTHÉTIQUE (100 trajectoires)

GROUPE A — Vieillissement Normal (40 trajectoires)
  A1-A40: CVF vectors sur 52 semaines, déclin ≤5% annuel
  Variance intra-individuelle: 8-12%
  Profils variés: éducation, langue, âge (65-90)

GROUPE B — MCI Stable (20 trajectoires)
  B1-B20: CVF vectors montrant déclin léger stabilisé
  Pattern: déclin initial puis plateau
  Répondent au traitement (donépézil)

GROUPE C — MCI → Alzheimer's (25 trajectoires)
  C1-C25: CVF vectors montrant progression
  Pattern: déclin sémantique d'abord, puis syntaxique, puis cohérence
  Vitesse variable: 6-24 mois de transition

GROUPE D — Dépression (10 trajectoires)
  D1-D10: CVF vectors avec déclin épisodique
  Pattern: baisses brutales et récupérations
  Différent du pattern AD progressif

GROUPE E — Autres Démences (5 trajectoires)
  E1-E3: Lewy Body (fluctuations marquées)
  E4-E5: Vasculaire (déclin par paliers)
```

### Trajectory Matching

```python
# Pour chaque patient réel, trouver les K trajectoires 
# synthétiques les plus similaires

def match_trajectory(patient_trajectory, synthetic_cohort, k=5):
    """
    Compare les N premières semaines de données du patient
    aux N premières semaines de chaque trajectoire synthétique.
    
    Retourne les K trajectoires les plus similaires ET
    ce qui leur est arrivé ENSUITE → prédiction probabiliste.
    """
    similarities = []
    for cohort_member in synthetic_cohort:
        # DTW (Dynamic Time Warping) sur les vecteurs CVF
        distance = dtw_distance(
            patient_trajectory[:current_week],
            cohort_member.trajectory[:current_week]
        )
        similarities.append({
            'member': cohort_member,
            'distance': distance,
            'future': cohort_member.trajectory[current_week:],
            'outcome': cohort_member.diagnosis
        })

    top_k = sorted(similarities, key=lambda x: x['distance'])[:k]

    # Probabilité basée sur les outcomes des K plus proches
    outcomes = [m['outcome'] for m in top_k]
    return {
        'predicted_trajectory': weighted_average(top_k),
        'alzheimer_risk': outcomes.count('AD') / k,
        'stable_probability': outcomes.count('normal') / k,
        'confidence': 1 - (top_k[0]['distance'] / max_distance)
    }
```

### Pourquoi c'est nouveau

C'est du **k-Nearest Neighbors en contexte**, sans entraînement. La cohorte synthétique EST les données d'entraînement, mais elles vivent dans le contexte, pas dans des poids de modèle. Opus peut **raisonner** sur pourquoi un patient ressemble à un groupe plutôt qu'un autre — quelque chose qu'aucun modèle ML classique ne peut faire.

---

## COUCHE 6 : L'HOLOGRAMME TEMPOREL (Extended Thinking)

### Concept — Voir le temps comme un objet

Quand un neuropsychologue regarde 6 mois de données, il ne regarde pas des points de données séquentiels. Il voit des **patterns temporels** :
- Cycles (semaine, mois, saisons)
- Tendances (linéaire, exponentielle, paliers)
- Points de rupture (événements qui changent la trajectoire)
- Corrélations croisées (deux domaines qui déclinent ensemble)

L'Extended Thinking d'Opus 4.6 (budget : 32K tokens de réflexion) permet de réaliser cette analyse holistique.

### Le Méta-Prompt de l'Hologramme

```markdown
<hologram_analysis>
You have in your context:
1. The complete scientific literature on speech biomarkers (~300K tokens)
2. Differential diagnosis profiles for 6+ conditions (~100K tokens)
3. The patient's complete conversational history (~150K tokens)
4. The patient's cognitive twin trajectory (~20K tokens)
5. The 5 most similar synthetic cohort trajectories (~50K tokens)

PERFORM THE FOLLOWING ANALYSIS USING EXTENDED THINKING:

PHASE 1 — TEMPORAL PATTERN EXTRACTION
Look at the ENTIRE timeline at once. Identify:
- Linear trends (steady decline or improvement)
- Cyclic patterns (weekly, monthly, seasonal)
- Breakpoints (sudden changes correlated with events)
- Acceleration/deceleration of existing trends

PHASE 2 — CROSS-DOMAIN CORRELATION
Analyze how the 5 CVF domains co-vary:
- Lexical-Coherence correlation (semantic network integrity)
- Fluency-Memory correlation (retrieval efficiency)
- Syntax-Coherence correlation (expressive capacity)
Which domain is LEADING the change? This predicts the cascade.

PHASE 3 — DIFFERENTIAL COMPARISON
Compare the patient's trajectory to:
- Their cognitive twin (divergence analysis)
- The 5 most similar cohort members (outcome matching)
- The known AD progression cascade from literature
- The depression profile (rule out)
- The medication effect profile (rule out)

PHASE 4 — MICRO-PATTERN DISCOVERY
Look for patterns that DON'T fit standard categories:
- Is there a specific TOPIC that triggers decline?
- Is there a TIME OF DAY effect?
- Do EMOTIONAL memories show different trajectory than NEUTRAL ones?
- Are there COMPENSATORY STRATEGIES emerging?
  (circumlocution, topic avoidance, reliance on routine phrases)

PHASE 5 — PREDICTIVE SYNTHESIS
Based on ALL of the above:
1. Current cognitive status assessment (with differential)
2. Predicted trajectory (3 months, 6 months, 12 months)
3. Confidence level with specific uncertainties identified
4. Recommended actions (conversation adaptations, medical referral, etc.)
5. What data would MOST reduce uncertainty? → Design next week's probes.

OUTPUT:
- Family report (plain language, 5-7 lines, actionable, warm)
- Medical report (clinical terminology, domain scores, differential, trajectory)
- Internal report (conversation design for next 7 sessions)
- Confidence report (what we know, what we don't, what would help)
</hologram_analysis>
```

---

## PLAN D'IMPLÉMENTATION — 5 JOURS

### Jour 1 (Mercredi 12) : Bibliothèque Vivante + Cohorte

**Matin :**
- [ ] Collecter les articles scientifiques accessibles en texte intégral
  - ADReSS Challenge proceedings (open access)
  - Fraser et al. 2015 (open access via PubMed)
  - Robin et al. 2023 (check access)
  - Frontiers papers (tous open access)
  - Synthétiser les articles non-accessibles en résumés détaillés (~5K tokens chacun)
- [ ] Formater en contexte structuré avec tags XML
- [ ] Tester le prompt caching : charger la bibliothèque, vérifier le cache hit

**Après-midi :**
- [ ] Générer la cohorte synthétique de 100 trajectoires
  - Utiliser Opus + littérature pour générer des CVF vectors réalistes
  - 40 normaux, 25 MCI→AD, 20 MCI stables, 10 dépression, 5 autres
  - Chaque trajectoire = 52 semaines de vecteurs CVF hebdomadaires
- [ ] Stocker les trajectoires en JSON, prêtes à charger en contexte
- [ ] Valider : les trajectoires synthétiques sont-elles cohérentes avec la littérature ?

### Jour 2 (Jeudi 13) : Diagnostic Différentiel + Jumeau Cognitif

**Matin :**
- [ ] Écrire les profils différentiels complets (6 conditions)
- [ ] Implémenter le scoring différentiel dans `drift-detector.js`
- [ ] Test : donner à Opus des transcriptions synthétiques de chaque condition, vérifier qu'il différencie correctement

**Après-midi :**
- [ ] Implémenter le générateur de jumeau cognitif
- [ ] Implémenter le score de divergence jumeau
- [ ] Test : créer un patient synthétique avec déclin AD simulé, vérifier que la divergence augmente progressivement

### Jour 3 (Vendredi 14) : Archéologie Cognitive + Hologramme

**Matin :**
- [ ] Implémenter le constructeur de carte sémantique
- [ ] Générer 3 mois de conversations synthétiques pour le patient démo ("Marie, 75, FR")
  - Conversations réalistes avec déclin progressif subtil
  - 90 sessions × ~1 000 tokens = ~90K tokens
- [ ] Tester l'archéologie : charger les 90 sessions, vérifier la carte sémantique

**Après-midi :**
- [ ] Implémenter le méta-prompt de l'Hologramme Temporel
- [ ] Assembler les 6 couches dans un seul appel API (~900K tokens)
- [ ] Tester l'analyse complète end-to-end
- [ ] Mesurer : coût réel, latence, qualité du raisonnement

### Jour 4 (Samedi 15) : Intégration Dashboard + Démo

**Matin :**
- [ ] Intégrer les résultats enrichis dans le dashboard familial
  - Score différentiel → nouvelle visualisation
  - Carte sémantique → visualisation réseau (D3.js ou force graph)
  - Trajectoire jumeau vs réelle → graphe comparatif
  - Cohorte matching → probabilités visuelles
- [ ] Générer la timeline de démo : Marie semaines 1→14 (calibration, GREEN) → semaines 15→20 (YELLOW) → semaines 21→24 (ORANGE)

**Après-midi :**
- [ ] Polir les visualisations
- [ ] Préparer le scénario de démo live
- [ ] Tester le flow complet : appel → transcription → CVF → analyse 6 couches → rapport

### Jour 5 (Dimanche 16) : Vidéo + Submission

**Matin :**
- [ ] Enregistrer la démo vidéo (3 minutes max)
  - 30s : Le problème (55M de personnes, diagnostic trop tard)
  - 30s : La solution (le téléphone sonne, la voix analyse)
  - 60s : La démo technique (CVF, 6 couches, diagnostic différentiel)
  - 30s : Les résultats (timeline Marie, détection à la semaine 18)
  - 30s : L'impact ($0.16/jour, open source, 1000 familles avec $100K)
- [ ] Nettoyer le repo GitHub, README, LICENSE, CONTRIBUTING
- [ ] Submission avant 15h EST

---

## BUDGET IMPACT

### Analyse 6 Couches — Coûts

| Couche | Tokens (Input) | Tokens (Output) | Fréquence | Coût/Appel | Notes |
|--------|----------------|------------------|-----------|------------|-------|
| Bibliothèque Vivante | ~315K | 0 (contexte) | Caché | $0.16 (cache read) | 90% savings |
| Diagnostic Différentiel | ~100K | ~2K | Hebdomadaire | $0.10 | Profils cachés |
| Archéologie Cognitive | ~180K | ~10K | Hebdomadaire | $1.15 | Historique complet |
| Jumeau Cognitif | ~30K | ~3K | Hebdomadaire | $0.23 | Baseline + littérature |
| Cohorte Synthétique | ~150K | ~5K | Hebdomadaire | $0.88 | 100 trajectoires |
| Hologramme Temporel | ~50K (thinking) | ~8K | Hebdomadaire | $0.45 | Extended Thinking |
| **TOTAL analyse profonde** | **~825K** | **~28K** | **Hebdomadaire** | **~$2.97** | **Par patient par semaine** |

### Impact sur le budget $500

- Analyse quotidienne standard (CVF v1) : $0.29/patient/jour → inchangé
- Analyse hebdomadaire profonde (6 couches) : $2.97/patient/semaine → en remplacement de l'analyse Extended Thinking standard ($0.30)
- **Surcoût net : ~$2.67/patient/semaine**
- Pour 15 patients × 3 semaines de monitoring (post-calibration) : ~$120 de surcoût
- **Budget total révisé : ~$500** (ajustement parfait avec le buffer existant)

### Optimisation : Mode Adaptatif

On ne lance PAS l'analyse 6 couches pour tout le monde chaque semaine :

```
Si patient = GREEN depuis >4 semaines → CVF standard seulement ($0.30/semaine)
Si patient = YELLOW ou nouveau YELLOW → Analyse 6 couches ($2.97/semaine)
Si patient = ORANGE ou RED → Analyse 6 couches + analyse bi-hebdomadaire ($5.94/semaine)
```

Cela réduit le coût moyen à ~$1.50/patient/semaine pour une cohorte mixte.

---

## VALIDATION SANS DONNÉES RÉELLES — LA STRATÉGIE

### Méthode 1 : Simulation de Déclin Réaliste

Opus génère des conversations simulant un déclin AD sur 6 mois, en suivant exactement le pattern documenté dans la littérature :

```
Semaines 1-14: Baseline normal
Semaines 15-20: Léger déclin sémantique (TTR -8%, topic drift +15%)
Semaines 21-26: Déclin sémantique + syntaxique (MLU -12%, subordination -20%)
Semaines 27-30: Cohérence affectée (idea density -18%, referential clarity -25%)
Semaines 31+: Multi-domaine
```

**Test** : Le système détecte-t-il correctement la semaine où le déclin commence ? Flag-t-il YELLOW à la bonne semaine ?

### Méthode 2 : Validation Croisée avec la Littérature

Les articles chargés en Couche 1 contiennent des **exemples annotés** (transcriptions avec scores MMSE). On peut :
1. Extraire les exemples de transcriptions des articles
2. Les soumettre au CVF comme des sessions de patient
3. Comparer les scores CVF aux scores MMSE publiés
4. Mesurer la corrélation

### Méthode 3 : Adversarial Testing

Générer des faux positifs intentionnels :
- Patient fatigué mais cognitivement intact
- Patient déprimé mais pas Alzheimer
- Patient avec changement de médication
- Patient en deuil

**Test** : Le diagnostic différentiel (Couche 2) les identifie-t-il correctement comme non-AD ?

### Méthode 4 : Expert Review (si possible)

Si un neuropsychologue peut reviewer les sorties du système pour 5-10 cas synthétiques, c'est la validation la plus forte.

---

## CE QUI N'A JAMAIS ÉTÉ FAIT — RÉSUMÉ

| Innovation | Pourquoi c'est nouveau | Impact |
|-----------|----------------------|--------|
| **Bibliothèque Vivante** | Charger 300K tokens de littérature scientifique complète dans le contexte d'un analyseur clinique | Opus raisonne COMME un expert formé, pas comme un extracteur de features |
| **Diagnostic Différentiel Linguistique** | Aucun outil ne différencie AD vs dépression vs aging vs medication par la parole | Élimine les faux positifs, la cause #1 de perte de confiance |
| **Archéologie Cognitive** | Analyse topologique d'un réseau sémantique sur des mois de conversations naturelles | Détecte des patterns invisibles aux analyses session-par-session |
| **Jumeau Cognitif** | Groupe contrôle personnalisé pour chaque patient | Résout le problème de la dérive du baseline sur le long terme |
| **Cohorte Synthétique in-context** | k-NN en raisonnement, pas en statistique | Prédiction de trajectoire avec explication causale |
| **Hologramme Temporel** | Analyse holistique de 6 mois de données + littérature + différentiel + cohorte en un seul pass de raisonnement étendu | Le niveau de raisonnement clinique le plus profond jamais atteint par une IA |

---

## PHRASE DE FIN POUR LE JURY

> *"Les autres outils d'IA prennent une photo du cerveau. MemoVoice tourne un film — et utilise la plus grande mémoire de travail jamais construite pour le regarder en entier."*

> *"Other AI tools take a snapshot of the brain. MemoVoice films a movie — and uses the largest working memory ever built to watch it all at once."*

---

*La voix se souvient de ce que l'esprit oublie.*
*The voice remembers what the mind forgets.*
