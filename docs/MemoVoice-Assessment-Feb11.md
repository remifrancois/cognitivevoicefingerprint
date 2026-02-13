# MEMOVOICE — ASSESSMENT STRATÉGIQUE
## 11 Février 2026 · J2/7 du Hackathon Cerebral Valley
### État des lieux · Datasets Open-Access · Exploitation 1M Tokens · Plan Vidéo Démo

---

## 1. ÉTAT V1 : DRIFT CALCULATION — ASSESSMENT

### Ce qui fonctionne ✅

| Composant | Statut | Notes |
|-----------|--------|-------|
| Conversation téléphonique (Twilio + Opus) | ✅ Opérationnel | Pipeline appel → transcription fonctionnel |
| Transcription temps réel | ✅ Opérationnel | ConversationRelay + STT |
| Extraction 25 features CVF | ✅ Opérationnel | 5 domaines × 5 sous-features |
| Stockage JSON sessions | ✅ Opérationnel | Fichiers par patient |

### Ce qui reste à tester ⚠️

| Composant | Statut | Risque | Action requise |
|-----------|--------|--------|----------------|
| Baseline calibration (14 sessions) | ⚠️ Non testé | Moyen | Simuler 14 sessions synthétiques |
| Delta computation (z-scores) | ⚠️ Non testé | **Élevé** | Test unitaire prioritaire |
| Composite score hebdomadaire | ⚠️ Non testé | **Élevé** | Dépend du delta |
| Seuils d'alerte (GREEN→RED) | ⚠️ Non testé | Moyen | Dépend du composite score |
| Pondération confounders | ⚠️ Non testé | Faible | Nice-to-have pour le hackathon |
| Extended Thinking weekly analysis | ⚠️ Non testé | Moyen | Prompt prêt, exécution à valider |

### Plan de test — Aujourd'hui (priorité maximale)

**Étape 1 : Générer une timeline synthétique "Marie"**

Utiliser Opus pour générer 30 transcriptions simulées représentant :
- Sessions 1-14 : Baseline (conversation normale d'une femme de 75 ans, éducation moyenne, francophone)
- Sessions 15-20 : Stabilité (fluctuations normales, GREEN)
- Sessions 21-25 : Début de déclin sémantique (TTR ↓, pronoms ↑, cohérence référentielle ↓)
- Sessions 26-30 : Déclin confirmé (MLU ↓, pauses ↑, rappel libre échoue)

**Étape 2 : Exécuter le pipeline complet**

```
Pour chaque session synthétique :
  1. Injecter la transcription dans le feature extractor
  2. Récupérer le vecteur 25D
  3. Pour sessions 1-14 : calculer la baseline (mean, std, range)
  4. Pour sessions 15+ : calculer delta[feature] = (current - mean) / std
  5. Toutes les 7 sessions : calculer le composite score
  6. Vérifier que les seuils d'alerte se déclenchent au bon moment
```

**Résultat attendu :**
- Sessions 15-20 : GREEN (z > -0.5)
- Sessions 21-25 : YELLOW (z entre -0.5 et -1.0)
- Sessions 26-30 : ORANGE (z entre -1.0 et -1.5)

**Étape 3 : Valider les cas limites**

| Cas limite | Attendu | Pourquoi c'est critique |
|-----------|---------|------------------------|
| Patient fatigué (1 mauvaise session) | Reste GREEN | Pas de faux positif sur une journée |
| Patient malade (grippe, 3 sessions basses) | Reste GREEN (confounder) | Pondération maladie = 0.5 |
| Déclin lent sur 4 semaines | YELLOW puis ORANGE | Le signal sort du bruit |
| Changement de médicament | Alerte différée | Weight 0.3 pendant ajustement |

### Risque principal identifié

Le calcul de drift est le **cœur** de la valeur du produit. Si le delta z-score ne fonctionne pas correctement, le système ne peut pas différencier fluctuation normale vs déclin réel. C'est la **priorité n°1 absolue** pour aujourd'hui.

---

## 2. DATASETS & ARTICLES EN ACCÈS LIBRE

### A. Datasets disponibles immédiatement

#### DementiaBank / Pitt Corpus ⭐⭐⭐ (PRIORITAIRE)

| Attribut | Détail |
|----------|--------|
| **URL** | https://dementia.talkbank.org/ |
| **Contenu** | 104 contrôles sains, 208 patients AD, 85 diagnostic inconnu |
| **Format** | Transcriptions CHAT + annotations temporelles + audio |
| **Tâche** | Description du "Cookie Theft" (Boston Diagnostic Aphasia Exam) |
| **Longitudinal** | Oui — visites annuelles sur 5 ans (1983-1988) |
| **Accès** | Gratuit avec membership (formulaire en ligne) |
| **Contact** | Brian MacWhinney, macw@cmu.edu |
| **Publications** | 250+ études publiées à partir de ce corpus |
| **Utilité MemoVoice** | Référence gold standard pour calibrer nos features |

**Action immédiate :** Créer un compte sur https://talkbank.org/join/ (processus rapide, souvent approuvé en 24-48h pour recherche académique/hackathon).

#### ADReSS Challenge 2020 ⭐⭐⭐

| Attribut | Détail |
|----------|--------|
| **URL** | Accessible via DementiaBank membership |
| **Contenu** | 78 patients AD + 78 contrôles sains (balancé âge/genre) |
| **Format** | Transcriptions manuelles + audio + scores MMSE |
| **Paper** | Luz et al. 2020, arXiv:2004.06833 |
| **Baseline accuracy** | 77% (meilleures équipes : 85%+) |
| **Utilité MemoVoice** | Dataset de validation parfaitement balancé |

#### ADReSSo Challenge 2021 ⭐⭐

| Attribut | Détail |
|----------|--------|
| **URL** | https://luzs.gitlab.io/adresso-2021/ |
| **Contenu** | 237 fichiers audio (pas de transcription manuelle — ASR requis) |
| **Tâches** | Classification AD, régression MMSE, prédiction de déclin cognitif |
| **Paper** | Luz et al. 2021, medRxiv:2021.03.24.21254263v2 |
| **Baseline accuracy** | 78.87% (acoustique + linguistique) |
| **Utilité MemoVoice** | Challenge de prédiction de progression — exactement notre cas d'usage |

#### MultiConAD 2025 ⭐⭐ (Très récent)

| Attribut | Détail |
|----------|--------|
| **URL** | https://arxiv.org/html/2502.19208v1 |
| **Contenu** | Dataset multilingue conversationnel (EN, ES, ZH, EL) — 16 sources unifiées |
| **Publié** | Février 2025 |
| **Utilité MemoVoice** | Valide l'approche cross-linguistique + détection MCI (pas seulement binaire AD/HC) |

#### Wisconsin Longitudinal Study (WLS)

| Attribut | Détail |
|----------|--------|
| **Contenu** | 10,317 diplômés de 1957, suivi longitudinal |
| **Inclut** | Tests cognitifs + enregistrements Cookie Theft |
| **Format** | CHAT (via DementiaBank) |
| **Utilité** | Tous les participants étaient sains au départ → profil de vieillissement normal |

### B. Articles scientifiques en accès libre (pour la Living Library 300K tokens)

Ces articles sont téléchargeables gratuitement et constituent la base de la **Couche 1 : Bibliothèque Vivante** du plan CVF-renforcement.

#### Articles fondamentaux

| Article | Tokens estimés | URL | Impact sur MemoVoice |
|---------|---------------|-----|---------------------|
| **Fraser et al. 2015** — "Linguistic Features Identify Alzheimer's Disease in Narrative Speech" | ~15K | https://www.cs.toronto.edu/~kfraser/Fraser15-JAD.pdf | 370 features analysées, 81% accuracy, facteurs principaux identifiés. **BASE de notre extraction de features.** |
| **Luz et al. 2020** — ADReSS Challenge paper | ~10K | arXiv:2004.06833 | Définit les benchmarks, baseline models, procédures d'extraction |
| **Luz et al. 2021** — ADReSSo Challenge paper | ~12K | https://www.medrxiv.org/content/10.1101/2021.03.24.21254263v2.full | 78.87% accuracy sans transcription manuelle |

#### Reviews systématiques (2024-2025)

| Article | Tokens estimés | URL | Impact |
|---------|---------------|-----|--------|
| **Shakeri et al. 2025** — "NLP in Alzheimer's disease research" | ~20K | https://alz-journals.onlinelibrary.wiley.com/doi/10.1002/dad2.70082 | Review complète publiée le **11 février 2025** — état de l'art actuel |
| **"Speech based detection of AD: survey of AI techniques"** (Oct 2024) | ~25K | https://link.springer.com/article/10.1007/s10462-024-10961-6 | Datasets, features acoustiques/linguistiques, deep learning |
| **"Deep learning-based speech analysis for AD detection"** (Dec 2022) | ~15K | https://alzres.biomedcentral.com/articles/10.1186/s13195-022-01131-3 | Review des méthodes DL |

#### Articles sur features spécifiques

| Feature | Article clé | Accès | Finding |
|---------|------------|-------|---------|
| TTR + lexical diversity | Fraser et al. 2015 | Open | Factor 1: semantic impairment ← TTR, Brunét, content density |
| Pause patterns | Yuan 2021, Pistono 2019 | PubMed | Long pauses corrèlent avec perte volume hippocampique (r=-0.489) |
| Syntactic complexity | Mueller 2018 | PubMed | Subordination index chute en premier dans la cascade AD |
| Idea density | Snowdon Nun Study | Open | Prédicteur le plus fort de AD dans écriture autobiographique |
| Pronoun overuse | Fraser 2015, Factor 1 | Open | AD patients remplacent noms spécifiques par pronoms vagues |

### C. Stratégie d'acquisition : 48h

| Priorité | Action | Temps | Résultat |
|----------|--------|-------|----------|
| 🔴 **P0** | Télécharger Fraser et al. 2015 PDF | 5 min | Feature taxonomy complète |
| 🔴 **P0** | Télécharger Luz 2020 + 2021 papers | 10 min | Benchmarks + baseline models |
| 🟡 **P1** | Créer compte DementiaBank | 15 min | Accès dataset dans 24-48h |
| 🟡 **P1** | Télécharger Shakeri 2025 review | 5 min | État de l'art complet |
| 🟢 **P2** | Récupérer 5-8 articles features spécifiques | 1h | Bibliothèque complète ~100K tokens |
| 🟢 **P2** | Formater les PDFs en texte pour prompt caching | 2h | Living Library ready |

---

## 3. BUDGET — STATUS

```
╔══════════════════════════════════════════╗
║        BUDGET HACKATHON MEMOVOICE        ║
╠══════════════════════════════════════════╣
║  Total alloué :          $500.00         ║
║  Utilisé :              ~$50.00 (~10%)   ║
║  ▓▓░░░░░░░░░░░░░░░░░░  10%              ║
║  Restant :              ~$450.00         ║
║  Jours restants :        5               ║
╚══════════════════════════════════════════╝
```

### Allocation recommandée pour les 5 jours restants

| Poste | Budget | % | Justification |
|-------|--------|---|---------------|
| Tests drift + validation pipeline | $40 | 9% | Simulations synthétiques + itérations |
| Génération timeline démo "Marie" | $60 | 13% | 30+ conversations synthétiques réalistes |
| Living Library (prompt caching setup) | $30 | 7% | Première injection des papers (cache write) |
| Analyses profondes 1M tokens (démo) | $50 | 11% | 3-5 deep analyses pour la vidéo |
| Conversations live (tests) | $40 | 9% | Tests end-to-end appels réels |
| Reports famille + médical (démo) | $20 | 4% | Génération rapports pour vidéo |
| **Buffer développement** | **$80** | **18%** | Erreurs, retries, itérations prompts |
| **Réserve finale** | **$130** | **29%** | Marge de sécurité + post-hackathon |
| **TOTAL** | **$450** | **100%** | |

### Coût par opération (rappel)

| Opération | Coût standard | Avec caching | Avec batch + cache |
|-----------|--------------|-------------|-------------------|
| Conversation 5 min | $0.115 | $0.08 | — |
| Feature extraction | $0.080 | $0.05 | $0.025 |
| Daily report | $0.028 | $0.02 | $0.014 |
| Weekly deep analysis | $0.185 | $0.12 | $0.06 |
| **Deep analysis 1M tokens** | **$16.65** | **$2.97** | **$1.50** |

---

## 4. EXPLOITATION DU 1M TOKENS OPUS 4.6

### Le paradigme : pas du ML, du raisonnement clinique

L'insight fondamental : Opus 4.6 avec 1M de contexte ne "s'entraîne" pas — il **raisonne** comme un neuropsychologue qui aurait :
- Lu toute la littérature scientifique
- Mémorisé 6 mois de conversations avec le patient
- Étudié les profils de 6 pathologies différentes
- Suivi 100 autres patients pour comparaison

**Aucun outil au monde ne fait ça dans une seule inférence.**

### Architecture 6 couches — résumé opérationnel

```
                    ┌─────────────────────────────┐
                    │   1 MILLION TOKENS CONTEXT    │
                    └──────────────┬──────────────┘
                                   │
    ┌──────────────────────────────┼──────────────────────────────┐
    │                              │                              │
    ▼                              ▼                              ▼
┌──────────┐              ┌──────────────┐             ┌──────────────┐
│ COUCHE 1 │              │   COUCHE 2   │             │   COUCHE 3   │
│ Living   │              │ Differential │             │  Cognitive   │
│ Library  │              │  Diagnosis   │             │ Archaeology  │
│ 300K tok │              │  100K tok    │             │  200K tok    │
│          │              │              │             │              │
│ Fraser   │              │ Alzheimer    │             │ 3-6 mois de  │
│ Luz      │              │ Dépression   │             │ conversations│
│ Shakeri  │              │ Parkinson    │             │ complètes    │
│ +15 pubs │              │ Aging normal │             │ du patient   │
│ DSM-5    │              │ Médication   │             │              │
│ MMSE     │              │ Grief/stress │             │ Réseau       │
│          │              │              │             │ sémantique   │
│ Prompt   │              │ Profils      │             │ évolutif     │
│ cached   │              │ linguistiques│             │              │
│ 90% off  │              │ comparatifs  │             │ Clusters qui │
│          │              │              │             │ se déconnect.│
└──────────┘              └──────────────┘             └──────────────┘
    │                              │                              │
    └──────────────────────────────┼──────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │       COUCHE 4              │
                    │    JUMEAU COGNITIF          │
                    │       150K tokens           │
                    │                             │
                    │ Clone virtuel du patient    │
                    │ qui vieillit normalement.   │
                    │ Mesure la DIVERGENCE entre  │
                    │ le réel et le jumeau.       │
                    │                             │
                    │ <1.0 = normal               │
                    │ 1.0-2.0 = surveiller        │
                    │ >2.0 = investiguer          │
                    │ >3.0 = alerter              │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │       COUCHE 5              │
                    │  COHORTE SYNTHÉTIQUE        │
                    │       150K tokens           │
                    │                             │
                    │ 100 trajectoires en contexte│
                    │ 40 vieillissement normal    │
                    │ 25 MCI→AD (progresseurs)    │
                    │ 20 MCI stable               │
                    │ 10 dépression               │
                    │ 5 autres démences           │
                    │                             │
                    │ k-NN : "Marie ressemble à   │
                    │ QUELLES trajectoires ?"     │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │       COUCHE 6              │
                    │  HOLOGRAMME TEMPOREL        │
                    │  Extended Thinking (32K)    │
                    │                             │
                    │ Phase 1: Patterns temporels │
                    │ Phase 2: Cross-corrélation  │
                    │ Phase 3: Diagnostic diff.   │
                    │ Phase 4: Micro-patterns     │
                    │ Phase 5: Prédiction         │
                    │                             │
                    │ OUTPUTS:                    │
                    │ → Rapport famille (3 lignes) │
                    │ → Rapport médical (clinique) │
                    │ → Recommandations internes  │
                    │ → Score de confiance        │
                    └─────────────────────────────┘
```

### Ce que ça permet (et que personne ne fait)

| Capacité | Description | Innovation |
|----------|-------------|------------|
| **Diagnostic différentiel linguistique** | Distinguer Alzheimer vs dépression vs fatigue vs médication par la parole seule | Aucun outil existant ne le fait |
| **Archéologie cognitive** | Cartographier le réseau sémantique complet du patient et détecter sa fragmentation | Impossible sans contexte massif |
| **Jumeau cognitif** | Contrôle personnalisé qui vieillit "avec" le patient | Élimine les faux positifs du vieillissement normal |
| **Cohort matching** | Comparer à 100 trajectoires connues pour prédire l'issue | Épidémiologie dans un prompt |
| **Raisonnement causal** | Opus EXPLIQUE pourquoi il pense ce qu'il pense | Pas une boîte noire — raisonnement médical auditable |

### Coût avec prompt caching

| Scénario | Coût 1ère analyse | Coût analyses suivantes | Fréquence recommandée |
|----------|-------------------|------------------------|----------------------|
| Patient GREEN (routine) | — | ~$0.30 | Hebdomadaire standard (25 features) |
| Patient YELLOW (surveillance) | $16.65 | **$2.97** (Living Library cached) | Hebdomadaire avec 6 couches |
| Patient ORANGE/RED (urgent) | $16.65 | **$2.97** | Immédiat + suivi quotidien |

**Stratégie adaptative :** Seuls les patients YELLOW+ reçoivent l'analyse 1M tokens. Les GREEN restent sur l'analyse standard à $0.30/semaine. Budget moyen avec cohorte mixte : ~$1.50/patient/semaine.

---

## 5. PLAN VIDÉO DÉMO — 3 MINUTES

### Scénario : "Marie, 75 ans, Paris"

Timeline simulée de 12 semaines montrant la progression complète :

```
SEMAINE 1-2 (CALIBRATION)
  [Écran] : Marie décroche le téléphone. Conversation chaleureuse.
  [Voix off] : "Chaque matin, le téléphone de Marie sonne."
  [Viz] : Les 25 features s'affichent en temps réel pendant la conversation
  [Viz] : Le radar CVF se construit progressivement

SEMAINE 3-10 (GREEN — TOUT VA BIEN)
  [Écran] : Dashboard famille — tout est vert
  [Viz] : SMS quotidien : "Marie va bien. Elle a parlé de son jardin."
  [Voix off] : "Pendant 2 mois, tout est normal."
  [Viz] : Timeline plate, scores stables

SEMAINE 11 (LE SIGNAL APPARAÎT)
  [Écran] : Transcript conversation — Marie dit "le machin" au lieu de "sécateur"
  [Viz] : Feature L5 (Word Frequency Level) commence à baisser
  [Viz] : Feature C3 (Referential Coherence) montre premiers signes
  [Voix off] : "Semaine 11. Quelque chose change dans la façon dont Marie parle."

SEMAINE 12-13 (PASSAGE À YELLOW)
  [Écran splitté] :
    Gauche : Transcription conversation (pauses + pronoms vagues visibles)
    Droite : Radar CVF — domaines Coherence et Lexical en baisse
  [Viz] : ANALYSE PROFONDE 1M TOKENS
    → Réseau sémantique de Marie se fragmente (animation graphe)
    → Jumeau cognitif diverge (courbe réel vs jumeau)
    → Diagnostic différentiel élimine dépression (rappel indicé OK)
  [Viz] : Alerte YELLOW sur le dashboard
  [Voix off] : "Le système charge 6 mois de conversations, 20 articles scientifiques,
               et 100 trajectoires de patients dans un seul appel à Opus 4.6."

SEMAINE 14-16 (CONFIRMATION → ORANGE)
  [Écran] : Rapport médical automatique
  [Viz] : Cohort matching : "Marie correspond à 80% aux trajectoires MCI→AD"
  [Viz] : Alerte ORANGE — "Consultation médicale recommandée"
  [Voix off] : "Deux ans avant qu'un médecin ne pose le diagnostic,
               MemoVoice voit le signal."

CONCLUSION (30 secondes)
  [Écran] : "Autres outils AI : une photo instantanée."
  [Écran] : "MemoVoice : un film entier — et la plus grande mémoire de travail
             jamais construite pour le regarder d'un seul coup."
  [Stats] :
    • $0.16/jour par patient
    • 100% open source
    • Fonctionne sur n'importe quel téléphone
    • 861 millions de lignes fixes dans le monde
  [Tagline] : "La voix se souvient de ce que l'esprit oublie."
```

### Éléments visuels à préparer

| Élément | Description | Outil suggéré |
|---------|-------------|---------------|
| **Radar CVF** | 5 axes, animé (baseline → déclin) | Recharts (React) ou D3.js |
| **Timeline drift** | Courbe des composite scores sur 12 semaines | Recharts line chart |
| **Réseau sémantique** | Graphe de nœuds qui se fragmente | D3.js force-directed graph |
| **Divergence jumeau** | 2 courbes (réel vs jumeau) qui divergent | Recharts dual-line |
| **Cohort matching** | Distribution de probabilité qui shift vers AD | D3.js ou simple bar chart |
| **SMS mockup** | Message sur écran iPhone | Screenshot Figma/HTML |
| **Transcript viewer** | Conversation avec highlights features | HTML custom |

### Stack vidéo

| Composant | Recommandation |
|-----------|---------------|
| Screen recording | OBS Studio (gratuit) |
| Voice over | Enregistrement direct ou ElevenLabs |
| Montage | CapCut / DaVinci Resolve (gratuits) |
| Musique de fond | Ambient calme (license-free) |
| Format | 1080p, 3 minutes max |
| Upload | YouTube (unlisted) ou Loom |

---

## 6. PRIORITÉS — 5 JOURS RESTANTS

### Jour 2 (Aujourd'hui — 11 Février) : DRIFT + DONNÉES

| Heure | Action | Temps | Résultat |
|-------|--------|-------|----------|
| **MAINTENANT** | Tester drift calculation end-to-end | 3h | Pipeline validé ou bugs identifiés |
| | Générer 30 conversations synthétiques "Marie" | 1h | Timeline de test |
| | Télécharger Fraser 2015 + Luz 2020/2021 PDFs | 30 min | Papers pour Living Library |
| | Créer compte DementiaBank | 15 min | Accès en attente |

### Jour 3 (12 Février) : 1M TOKEN ARCHITECTURE

| Action | Temps | Résultat |
|--------|-------|----------|
| Formater papers en texte pour prompt injection | 2h | Living Library ~100K tokens ready |
| Créer profils diagnostic différentiel (6 conditions) | 2h | Couche 2 ready |
| Implémenter Jumeau Cognitif (prompt + logique) | 3h | Couche 4 prototype |
| Générer cohorte synthétique (100 trajectoires) | 2h | Couche 5 ready |

### Jour 4 (13 Février) : DASHBOARD + VISUALISATIONS

| Action | Temps | Résultat |
|--------|-------|----------|
| Dashboard famille : radar CVF + timeline drift | 4h | Visualisation principale |
| Réseau sémantique animé (D3.js) | 3h | Viz wow-factor |
| Divergence jumeau chart | 1h | Courbes comparatives |
| SMS mockup + rapport médical | 1h | Éléments vidéo |

### Jour 5 (14 Février) : LANDING PAGE + POLISH

| Action | Temps | Résultat |
|--------|-------|----------|
| Landing page (Hero + How It Works + Science + Open Source) | 4h | Site public |
| FR + EN translations | 2h | i18n |
| Mobile responsive | 1h | Accessibilité |
| Deploy sur Fly.io | 1h | Demo live accessible |

### Jour 6 (15 Février) : VIDÉO + SUBMISSION

| Action | Temps | Résultat |
|--------|-------|----------|
| Enregistrer écrans (dashboard + conversation + analyse) | 2h | Rushes |
| Enregistrer voice over (FR ou EN) | 1h | Narration |
| Montage vidéo 3 minutes | 3h | Vidéo finale |
| Rédiger README GitHub + submission text | 1h | Documentation |

### Jour 7 (16 Février) : SUBMISSION

| Action | Temps | Résultat |
|--------|-------|----------|
| Test final end-to-end | 1h | Validation |
| Upload vidéo (YouTube/Loom) | 30 min | Lien vidéo |
| Soumettre sur CV platform | 30 min | **DONE** |
| Deadline : **15h00 EST** | | |

---

## 7. CRITÈRES DE JUGEMENT — NOTRE POSITIONNEMENT

| Critère | Poids | Notre force | Comment la montrer |
|---------|-------|-------------|-------------------|
| **Impact** | 25% | 55M de personnes touchées, $0.16/jour, fonctionne sur un téléphone fixe | Chiffres dans la vidéo + "imagine ta grand-mère" |
| **Opus 4.6 Use** | 25% | 1M tokens = plus grande mémoire clinique jamais construite, Extended Thinking = raisonnement médical | Montrer les 6 couches, le diagnostic différentiel, le jumeau cognitif |
| **Depth & Execution** | 20% | 25 features CVF basées sur 50+ études, pipeline complet, open source | Code propre, documentation, architecture modulaire |
| **Demo** | 30% | Timeline Marie 12 semaines, visualisations temps réel, SMS famille | La vidéo DOIT être émotionnellement touchante + techniquement impressionnante |

### Phrase pour le jury

> *"Les autres projets AI prennent une photo instantanée. MemoVoice filme un documentaire de 6 mois — et utilise la plus grande mémoire de travail jamais construite pour le regarder d'un seul coup. Pour $0.16 par jour. Sur un téléphone fixe. Open source."*

---

## 8. RISQUES & MITIGATIONS

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|-----------|
| Drift calculation ne fonctionne pas | Moyenne | **CRITIQUE** | Test aujourd'hui, fallback : données simulées pour la démo |
| DementiaBank pas accessible en 48h | Élevée | Moyen | Les papers en open access suffisent pour la Living Library |
| Budget tokens insuffisant | Faible | Moyen | $450 restants, très confortable |
| Vidéo pas assez impressionnante | Moyenne | Élevé | Investir dans les visualisations + storytelling émotionnel |
| Pipeline voix (Twilio) instable | Faible | Moyen | Enregistrer la conversation démo à l'avance |

---

*Prochaine action immédiate : tester le drift calculation avec la timeline synthétique "Marie".*

*La voix se souvient de ce que l'esprit oublie.*
