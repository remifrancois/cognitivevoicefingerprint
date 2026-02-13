/**
 * V5 TOPIC / GENRE PROFILES — False Positive Elimination
 *
 * NEW in V5 — no V4 equivalent.
 *
 * Eliminates the 44% false positive rate from topic/genre blindness
 * discovered in Profile01 analysis. When a patient discusses a recipe
 * (procedural), their vocabulary and syntax patterns naturally differ
 * from travel memories (narrative) or hypothetical wishes. Without
 * topic adjustment, these natural variations get flagged as cognitive
 * decline.
 *
 * Key false positive sources eliminated:
 *   - session04: procedural_recipe inflated LEX_GENERIC_SUB, TMP_REPETITION,
 *     deflated SEM_REF_COHERENCE and SYN_SUBORDINATION
 *   - session09: hypothetical_wishes inflated SYN_EMBEDDING, deflated
 *     SEM_TOPIC_MAINTENANCE, triggered AD false positives on coherence
 *
 * Architecture:
 *   transcript → detectTopicGenre() → genre + confidence
 *   raw z-scores + genre → applyTopicAdjustments() → adjusted z-scores
 *
 * All detection is DETERMINISTIC — pure keyword/pattern matching,
 * no LLM calls. This keeps the topic adjustment pipeline at $0.00
 * and ensures reproducible results across runs.
 *
 * 6 genre profiles with per-indicator z-score adjustments:
 *   narrative_travel, procedural_recipe, hypothetical_wishes,
 *   daily_routine, emotional_personal, academic
 */

// ════════════════════════════════════════════════════════
// DETERMINISTIC TOPIC IDS
// ════════════════════════════════════════════════════════

/**
 * Stable genre identifiers. These MUST NOT change across versions
 * because they are stored in session records and used for longitudinal
 * comparison. Adding new genres is fine; renaming or removing is not.
 * @type {Readonly<string[]>}
 */
export const DETERMINISTIC_TOPIC_IDS = Object.freeze([
  'narrative_travel',
  'procedural_recipe',
  'hypothetical_wishes',
  'daily_routine',
  'emotional_personal',
  'academic',
]);

// ════════════════════════════════════════════════════════
// TOPIC PROFILES
// ════════════════════════════════════════════════════════

/**
 * Genre profiles with bilingual keyword banks and per-indicator
 * z-score adjustments.
 *
 * Adjustment semantics:
 *   A POSITIVE adjustment value means the genre naturally INFLATES
 *   this indicator (makes it look "too good" or "too high"). When
 *   applied, we SUBTRACT this amount from the raw z-score, pulling
 *   it back toward 0 (the personal baseline).
 *
 *   A NEGATIVE adjustment value means the genre naturally DEFLATES
 *   this indicator (makes it look worse than it really is). When
 *   applied, we SUBTRACT this (negative) amount, which effectively
 *   ADDS to the z-score, pulling it back toward 0.
 *
 *   In both cases: adjusted_z = raw_z - adjustment
 *
 * @type {Record<string, TopicProfile>}
 */
export const TOPIC_PROFILES = {

  // ──────────────────────────────────────────────────
  // NARRATIVE / TRAVEL
  // ──────────────────────────────────────────────────
  narrative_travel: {
    id: 'narrative_travel',
    keywords: {
      en: [
        'travel', 'trip', 'visited', 'country', 'countries', 'hotel',
        'vacation', 'holiday', 'flew', 'flight', 'airport', 'abroad',
        'sightseeing', 'tourist', 'tour', 'cruise', 'beach', 'island',
        'passport', 'luggage', 'suitcase', 'destination', 'backpack',
        'museum', 'monument', 'cathedral', 'temple', 'ruins',
        'itinerary', 'souvenir', 'resort', 'camping', 'hiking',
      ],
      fr: [
        'voyage', 'visité', 'visité', 'pays', 'hôtel', 'hotel',
        'vacances', 'vol', 'aéroport', 'avion', 'touriste', 'tour',
        'croisière', 'plage', 'île', 'passeport', 'valise',
        'destination', 'musée', 'monument', 'cathédrale', 'temple',
        'ruines', 'itinéraire', 'souvenir', 'camping', 'randonnée',
        'excursion', 'séjour', 'étranger',
      ],
    },
    /**
     * Structural patterns that boost confidence beyond keyword hits.
     * These regex patterns are tested against the full transcript.
     */
    structural_patterns: [
      /(?:we|i)\s+(?:went|traveled|flew|drove|visited)\s+to/i,
      /(?:nous|j'ai|on\s+a)\s+(?:voyagé|visité|allé)/i,
      /when\s+(?:we|i)\s+(?:were|was)\s+in/i,
      /quand\s+(?:on|nous|j')\s+(?:étai[ts]|étions)\s+[àa]/i,
    ],
    adjustments: {
      // Travel narratives naturally produce richer vocabulary
      LEX_TTR:              +0.08,
      LEX_MATTR:            +0.06,
      LEX_CONTENT_DENSITY:  +0.04,

      // Higher idea density from dense event descriptions
      SEM_IDEA_DENSITY:     +0.06,

      // Subordination elevated ("when we arrived, the hotel that...")
      SYN_SUBORDINATION:    +0.05,
      SYN_EMBEDDING:        +0.04,

      // Temporal sequencing naturally strong in chronological stories
      SEM_TEMPORAL_SEQ:     +0.07,

      // Local coherence elevated (connected event chain)
      SEM_LOCAL_COHERENCE:  +0.03,

      // Travel stories tend to have varied sentence structure
      SYN_CFG_DIVERSITY:    +0.03,
    },
    complexity_baseline: 0.65,
    description: 'Travel narratives — rich vocabulary, temporal sequencing expected',
  },

  // ──────────────────────────────────────────────────
  // PROCEDURAL / RECIPE
  // Main false positive source (session04)
  // ──────────────────────────────────────────────────
  procedural_recipe: {
    id: 'procedural_recipe',
    keywords: {
      en: [
        'recipe', 'cook', 'cooking', 'bake', 'baking', 'ingredients',
        'ingredient', 'stir', 'stirring', 'oven', 'minutes', 'degrees',
        'tablespoon', 'teaspoon', 'cup', 'cups', 'flour', 'sugar',
        'butter', 'salt', 'pepper', 'oil', 'pan', 'pot', 'bowl',
        'mix', 'mixing', 'chop', 'dice', 'slice', 'preheat',
        'boil', 'simmer', 'fry', 'roast', 'grill', 'serve',
        'knead', 'dough', 'batter', 'garnish', 'marinate',
        'whisk', 'blend', 'drain', 'season', 'portion',
      ],
      fr: [
        'recette', 'cuisiner', 'cuisine', 'cuire', 'ingrédients',
        'ingrédient', 'remuer', 'four', 'minutes', 'degrés',
        'cuillère', 'tasse', 'farine', 'sucre', 'beurre', 'sel',
        'poivre', 'huile', 'poêle', 'casserole', 'bol',
        'mélanger', 'couper', 'trancher', 'préchauffer',
        'bouillir', 'mijoter', 'frire', 'rôtir', 'griller',
        'servir', 'pétrir', 'pâte', 'garnir', 'mariner',
        'fouetter', 'mixer', 'égoutter', 'assaisonner',
      ],
    },
    structural_patterns: [
      // Imperative mood: "stir the...", "add 2 cups of..."
      /^(?:stir|mix|add|pour|chop|slice|cook|bake|preheat|boil|fry|serve|place|put|let|remove|cover|set)\s/im,
      /^(?:remuer|mélanger|ajouter|verser|couper|cuisiner|cuire|préchauffer|bouillir|frire|servir|placer|mettre|laisser)\s/im,
      // Quantity patterns: "2 cups of", "350 degrees"
      /\d+\s*(?:cups?|tablespoons?|teaspoons?|minutes?|degrees?|grams?|ml|oz)/i,
      /\d+\s*(?:tasses?|cuillères?|minutes?|degrés?|grammes?|ml)/i,
      // Sequential instructions: "then add", "next stir"
      /(?:then|next|after\s+that|finally|first|second)\s+(?:add|stir|mix|pour|cook|bake|place)/i,
      /(?:puis|ensuite|après|enfin|d'abord)\s+(?:ajouter|remuer|mélanger|verser|cuire)/i,
    ],
    adjustments: {
      // Recipes use "it", "that", "this" without clear antecedents
      // ("add it", "stir that") — NOT a referential coherence deficit
      SEM_REF_COHERENCE:    -0.12,

      // Imperative sentences lack subordination by design
      SYN_SUBORDINATION:    -0.10,
      SYN_EMBEDDING:        -0.06,
      SYN_MLU:              -0.05,

      // Generic terms ("thing", "stuff") common in cooking talk
      LEX_GENERIC_SUB:      -0.08,

      // Repetitive structure ("add", "stir", "add") is procedural, not pathological
      TMP_REPETITION:       -0.10,

      // Lower TTR because same cooking verbs repeat
      LEX_TTR:              -0.06,
      LEX_MATTR:            -0.05,

      // Sentence completeness lower (fragments like "salt and pepper")
      SYN_COMPLETENESS:     -0.05,
      SYN_FRAGMENT_RATE:    -0.05,

      // Light verbs naturally elevated in instructions ("make", "get", "take")
      LEX_LIGHT_VERB:       -0.06,

      // Topic maintenance looks low because of ingredient-to-step jumps
      SEM_TOPIC_MAINTENANCE: -0.04,

      // Local coherence may be lower across procedural steps
      SEM_LOCAL_COHERENCE:  -0.04,

      // Lower idea density (one idea per instruction)
      SEM_IDEA_DENSITY:     -0.05,
    },
    complexity_baseline: 0.40,
    description: 'Procedural recipe/cooking instructions — imperative structure, repetitive verbs, generic references expected',
  },

  // ──────────────────────────────────────────────────
  // HYPOTHETICAL / WISHES
  // False positive source (session09)
  // ──────────────────────────────────────────────────
  hypothetical_wishes: {
    id: 'hypothetical_wishes',
    keywords: {
      en: [
        'wish', 'wished', 'wishing', 'dream', 'dreamed', 'dreaming',
        'imagine', 'imagined', 'imagining', 'hope', 'hoped', 'hoping',
        'someday', 'fantasy', 'ideally', 'hypothetically',
        'lottery', 'retire', 'retirement', 'bucket list',
        'paradise', 'perfect', 'wonderful', 'magical',
      ],
      fr: [
        'souhaiter', 'souhait', 'rêve', 'rêver', 'imaginer',
        'espérer', 'espoir', 'idéalement', 'hypothétiquement',
        'loterie', 'retraite', 'paradis', 'parfait',
        'merveilleux', 'magique', 'fantasme',
      ],
    },
    structural_patterns: [
      // Conditional structures
      /if\s+i\s+could/i,
      /if\s+i\s+had/i,
      /i\s+wish\s+(?:i|we|that)/i,
      /i(?:'d|\s+would)\s+(?:like|love|want)\s+to/i,
      /i\s+dream\s+(?:of|about)/i,
      /wouldn't\s+it\s+be/i,
      /what\s+if\s+(?:i|we)/i,
      // French conditional
      /si\s+je\s+pouvais/i,
      /j'aimerais/i,
      /je\s+voudrais/i,
      /si\s+j'avais/i,
      /ce\s+serait\s+(?:bien|super|formidable|merveilleux)/i,
      /j'aurais\s+(?:aimé|voulu)/i,
    ],
    adjustments: {
      // Complex conditional structures are EXPECTED, not a sign of
      // preserved high-level cognition that masks decline
      SYN_EMBEDDING:        +0.09,
      SYN_SUBORDINATION:    +0.06,
      SYN_YNGVE:            +0.05,

      // Tangential by nature — "if I could, I'd also, and then maybe..."
      SEM_TOPIC_MAINTENANCE: -0.08,

      // Topic entropy higher (jumping between wishes)
      SEM_TOPIC_ENTROPY:    -0.05,

      // Coherence measures disrupted by hypothetical jumps
      SEM_LOCAL_COHERENCE:  -0.06,
      SEM_EMBEDDING_COHERENCE: -0.04,

      // Future references naturally elevated
      AFF_FUTURE_REF:       +0.07,

      // Hedonic language elevated (positive wishes)
      AFF_HEDONIC:          +0.04,

      // Higher idea density from layered conditionals
      SEM_IDEA_DENSITY:     +0.04,

      // CFG diversity elevated from varied conditional structures
      SYN_CFG_DIVERSITY:    +0.04,
    },
    complexity_baseline: 0.60,
    description: 'Hypothetical wishes/dreams — complex conditionals, tangential structure, coherence disruption expected',
  },

  // ──────────────────────────────────────────────────
  // DAILY ROUTINE
  // Closest to baseline; minimal adjustments
  // ──────────────────────────────────────────────────
  daily_routine: {
    id: 'daily_routine',
    keywords: {
      en: [
        'morning', 'afternoon', 'evening', 'night', 'breakfast',
        'lunch', 'dinner', 'wake', 'woke', 'sleep', 'slept',
        'brush', 'shower', 'bath', 'dress', 'dressed', 'commute',
        'work', 'office', 'home', 'routine', 'usually', 'always',
        'every day', 'everyday', 'typical', 'normal', 'regular',
        'walk', 'exercise', 'gym', 'coffee', 'tea',
        'newspaper', 'television', 'tv', 'garden', 'chores',
      ],
      fr: [
        'matin', 'après-midi', 'soir', 'nuit', 'petit-déjeuner',
        'déjeuner', 'dîner', 'réveiller', 'dormir', 'douche',
        'bain', 'habiller', 'travail', 'bureau', 'maison',
        'routine', 'habituellement', 'toujours', 'chaque jour',
        'typique', 'normal', 'régulier', 'marche', 'exercice',
        'café', 'thé', 'journal', 'télévision', 'jardin',
        'ménage', 'courses', 'promenade',
      ],
    },
    structural_patterns: [
      /(?:every|each)\s+(?:morning|day|night|week)/i,
      /(?:i|we)\s+(?:usually|always|typically|normally)\s/i,
      /(?:chaque|tous\s+les)\s+(?:matins?|jours?|soirs?)/i,
      /(?:je|on|nous)\s+(?:habituellement|normalement|généralement)\s/i,
      /(?:first|then|after\s+that|next)\s+(?:i|we)\s/i,
    ],
    adjustments: {
      // Daily routine is the genre CLOSEST to normal conversational
      // baseline. Only minimal adjustments needed.

      // Slight temporal sequencing bump (chronological day structure)
      SEM_TEMPORAL_SEQ:     +0.02,

      // Slightly repetitive structure ("then I... then I...")
      TMP_REPETITION:       -0.02,

      // Topic maintenance slightly elevated (structured day narrative)
      SEM_TOPIC_MAINTENANCE: +0.02,

      // Slightly lower vocabulary diversity (routine words repeat)
      LEX_TTR:              -0.02,
    },
    complexity_baseline: 0.50,
    description: 'Daily routine descriptions — near-baseline indicators, structured chronological narrative',
  },

  // ──────────────────────────────────────────────────
  // EMOTIONAL / PERSONAL
  // ──────────────────────────────────────────────────
  emotional_personal: {
    id: 'emotional_personal',
    keywords: {
      en: [
        'feel', 'feeling', 'felt', 'feelings', 'emotion', 'emotional',
        'sad', 'sadness', 'happy', 'happiness', 'worried', 'worry',
        'anxious', 'anxiety', 'afraid', 'fear', 'scared', 'angry',
        'anger', 'miss', 'missing', 'love', 'loved', 'loving',
        'grief', 'grieve', 'grieving', 'lost', 'loss', 'death',
        'died', 'passed away', 'funeral', 'crying', 'tears',
        'lonely', 'loneliness', 'depressed', 'overwhelmed',
        'grateful', 'thankful', 'proud', 'ashamed', 'guilty',
        'heartbroken', 'devastated', 'family', 'husband', 'wife',
        'children', 'son', 'daughter', 'mother', 'father',
        'health', 'diagnosis', 'surgery', 'hospital',
      ],
      fr: [
        'sentir', 'sentiment', 'émotion', 'émotionnel',
        'triste', 'tristesse', 'heureux', 'bonheur', 'inquiet',
        'inquiétude', 'anxieux', 'peur', 'effrayé', 'colère',
        'manque', 'manquer', 'aimer', 'amour', 'deuil',
        'perdu', 'perte', 'mort', 'décédé', 'funérailles',
        'pleurer', 'larmes', 'seul', 'solitude', 'déprimé',
        'accablé', 'reconnaissant', 'fier', 'honteux',
        'coupable', 'famille', 'mari', 'femme', 'enfants',
        'fils', 'fille', 'mère', 'père', 'santé',
        'diagnostic', 'chirurgie', 'hôpital',
      ],
    },
    structural_patterns: [
      /i\s+(?:feel|felt|am\s+feeling)\s+(?:so\s+)?(?:sad|happy|worried|afraid|angry|lonely|overwhelmed|grateful)/i,
      /(?:je|j')\s+(?:me\s+sens|ressens|ai\s+(?:peur|honte))/i,
      /it\s+(?:makes|made)\s+me\s+(?:feel|sad|happy|angry|worried)/i,
      /(?:ça|cela)\s+me\s+(?:rend|fait)\s+(?:triste|heureux|inquiet)/i,
      /(?:i|we)\s+(?:miss|love|lost|grieve)\s/i,
    ],
    adjustments: {
      // Self-referential pronouns naturally elevated in personal topics
      AFF_SELF_PRONOUN:     -0.10,

      // Negative valence elevated when discussing grief, health, loss
      AFF_NEG_VALENCE:      -0.09,

      // Absolutist language common in emotional expression
      // ("I never thought...", "everything changed")
      AFF_ABSOLUTIST:       -0.05,

      // Death-related words expected in grief/loss discussions
      LEX_DEATH_WORDS:      -0.08,

      // Ruminative patterns expected in emotional processing
      LEX_RUMINATIVE:       -0.06,

      // Lower future references in grief/loss context
      AFF_FUTURE_REF:       -0.04,

      // Hedonic language may decrease (discussing pain, not pleasure)
      AFF_HEDONIC:          -0.03,

      // Engagement may appear lower (pauses for emotional processing)
      AFF_ENGAGEMENT:       -0.04,

      // Pauses and response latency elevated from emotional weight
      TMP_LPR:              -0.04,
      TMP_RESPONSE_LATENCY: -0.05,

      // Topic entropy lower (focused on one emotional theme)
      SEM_TOPIC_ENTROPY:    +0.03,
    },
    complexity_baseline: 0.50,
    description: 'Emotional/personal topics — elevated affect markers, self-focus, pauses from emotional processing expected',
  },

  // ──────────────────────────────────────────────────
  // ACADEMIC / PROFESSIONAL
  // ──────────────────────────────────────────────────
  academic: {
    id: 'academic',
    keywords: {
      en: [
        'university', 'college', 'school', 'research', 'study',
        'studied', 'professor', 'teacher', 'career', 'profession',
        'theory', 'hypothesis', 'experiment', 'analysis', 'method',
        'conclusion', 'evidence', 'data', 'published', 'journal',
        'thesis', 'dissertation', 'lecture', 'seminar', 'conference',
        'degree', 'diploma', 'graduate', 'doctoral', 'academic',
        'intellectual', 'philosophy', 'science', 'mathematics',
        'literature', 'history', 'engineering', 'technology',
        'politics', 'economics', 'psychology', 'sociology',
      ],
      fr: [
        'université', 'école', 'recherche', 'étude', 'étudier',
        'professeur', 'enseignant', 'carrière', 'profession',
        'théorie', 'hypothèse', 'expérience', 'analyse', 'méthode',
        'conclusion', 'preuve', 'données', 'publié', 'revue',
        'thèse', 'mémoire', 'conférence', 'cours', 'séminaire',
        'diplôme', 'doctorat', 'académique', 'intellectuel',
        'philosophie', 'science', 'mathématiques', 'littérature',
        'histoire', 'ingénierie', 'technologie', 'politique',
        'économie', 'psychologie', 'sociologie', 'travail',
      ],
    },
    structural_patterns: [
      /(?:when\s+i\s+was\s+(?:at|in)\s+(?:university|college|school))/i,
      /(?:my|the)\s+(?:research|thesis|dissertation|career|work)\s+(?:was|focused|involved)/i,
      /(?:quand\s+j'étais\s+[àa]\s+l'université)/i,
      /(?:ma|la)\s+(?:recherche|thèse|carrière)\s+(?:était|portait)/i,
      /(?:in\s+(?:my|the)\s+field\s+of)/i,
      /(?:according\s+to|based\s+on|in\s+terms\s+of)/i,
    ],
    adjustments: {
      // Academic discourse naturally produces elevated complexity
      LEX_TTR:              +0.10,
      LEX_MATTR:            +0.08,
      LEX_CONTENT_DENSITY:  +0.06,

      // Higher idea density from abstract reasoning
      SEM_IDEA_DENSITY:     +0.08,

      // Complex sentence structures expected
      SYN_SUBORDINATION:    +0.07,
      SYN_EMBEDDING:        +0.06,
      SYN_YNGVE:            +0.05,
      SYN_MLU:              +0.05,
      SYN_CFG_DIVERSITY:    +0.05,

      // Higher coherence from structured argumentation
      SEM_LOCAL_COHERENCE:  +0.04,
      SEM_EMBEDDING_COHERENCE: +0.03,

      // Lower word frequency (uses rarer, domain-specific words)
      LEX_WORD_FREQ:        -0.06,

      // Lower imageability (abstract concepts)
      LEX_IMAGEABILITY:     -0.04,

      // Higher age of acquisition vocabulary
      LEX_AOA:              +0.05,

      // Passive constructions more common in academic register
      SYN_PASSIVE:          +0.04,
    },
    complexity_baseline: 0.75,
    description: 'Academic/professional topics — elevated complexity across all linguistic dimensions expected',
  },
};

// ════════════════════════════════════════════════════════
// INTERNAL: KEYWORD INDEX BUILD
// ════════════════════════════════════════════════════════

/**
 * Pre-built inverted index: keyword → genre.
 * Built once at module load for O(1) keyword lookups.
 * @type {Map<string, string>}
 */
const _keywordIndex = new Map();

for (const [genre, profile] of Object.entries(TOPIC_PROFILES)) {
  for (const lang of Object.values(profile.keywords)) {
    for (const kw of lang) {
      const lower = kw.toLowerCase();
      // If a keyword appears in multiple genres, first registration wins.
      // This is intentional: more specific genres are listed first in
      // TOPIC_PROFILES (travel before daily_routine).
      if (!_keywordIndex.has(lower)) {
        _keywordIndex.set(lower, genre);
      }
    }
  }
}

// ════════════════════════════════════════════════════════
// GENRE DETECTION
// ════════════════════════════════════════════════════════

/**
 * Minimum keyword hits required to consider a genre signal present.
 * Below this threshold, keyword matches are treated as noise.
 * @type {number}
 */
const MIN_KEYWORD_HITS = 2;

/**
 * Weight multiplier for structural pattern matches vs keyword hits.
 * A single structural pattern match is worth this many keyword hits.
 * @type {number}
 */
const STRUCTURAL_PATTERN_WEIGHT = 3;

/**
 * Confidence thresholds for genre assignment.
 * @type {{ high: number, medium: number, low: number }}
 */
const CONFIDENCE_THRESHOLDS = {
  high:   0.70,
  medium: 0.45,
  low:    0.25,
};

/**
 * Detect the topic genre of a transcript using deterministic
 * keyword matching and structural pattern analysis. No LLM calls.
 *
 * Algorithm:
 *   1. Tokenize transcript into lowercase words
 *   2. Count keyword hits per genre via inverted index
 *   3. Check structural regex patterns per genre
 *   4. Compute weighted score per genre
 *   5. Select top genre if above minimum threshold
 *   6. Fall back to 'daily_routine' if no strong signal
 *
 * @param {string} transcript - The full session transcript text
 * @returns {{ genre: string, complexity: number, confidence: number, scores: Record<string, number>, keyword_hits: Record<string, number> }}
 */
export function detectTopicGenre(transcript) {
  if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
    return {
      genre: 'daily_routine',
      complexity: TOPIC_PROFILES.daily_routine.complexity_baseline,
      confidence: 0,
      scores: {},
      keyword_hits: {},
    };
  }

  const text = transcript.toLowerCase();

  // Tokenize: split on non-alphanumeric (preserving accented chars)
  const words = text.split(/[^a-zA-ZàâäéèêëïîôùûüçœæÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ'-]+/).filter(w => w.length > 1);
  const totalWords = words.length || 1;

  // Phase 1: Count keyword hits per genre
  const keywordHits = {};
  const hitWords = {};
  for (const genre of DETERMINISTIC_TOPIC_IDS) {
    keywordHits[genre] = 0;
    hitWords[genre] = new Set();
  }

  for (const word of words) {
    const genre = _keywordIndex.get(word);
    if (genre && !hitWords[genre].has(word)) {
      // Count unique keyword matches (not total occurrences)
      // to prevent a single repeated keyword from dominating
      hitWords[genre].add(word);
      keywordHits[genre]++;
    }
  }

  // Also check multi-word keywords (phrases like "bucket list", "passed away")
  for (const [genre, profile] of Object.entries(TOPIC_PROFILES)) {
    for (const lang of Object.values(profile.keywords)) {
      for (const kw of lang) {
        if (kw.includes(' ') && text.includes(kw.toLowerCase())) {
          if (!hitWords[genre].has(kw)) {
            hitWords[genre].add(kw);
            keywordHits[genre]++;
          }
        }
      }
    }
  }

  // Phase 2: Check structural patterns per genre
  const structuralHits = {};
  for (const [genre, profile] of Object.entries(TOPIC_PROFILES)) {
    structuralHits[genre] = 0;
    if (profile.structural_patterns) {
      for (const pattern of profile.structural_patterns) {
        if (pattern.test(transcript)) {
          structuralHits[genre]++;
        }
      }
    }
  }

  // Phase 3: Compute weighted scores
  const scores = {};
  let maxScore = 0;
  let topGenre = 'daily_routine';

  for (const genre of DETERMINISTIC_TOPIC_IDS) {
    const kwHits = keywordHits[genre] || 0;
    const stHits = structuralHits[genre] || 0;

    // Skip genres below minimum keyword threshold (unless structural hit)
    if (kwHits < MIN_KEYWORD_HITS && stHits === 0) {
      scores[genre] = 0;
      continue;
    }

    // Weighted score: keywords + structural * weight, normalized by transcript length
    const rawScore = kwHits + (stHits * STRUCTURAL_PATTERN_WEIGHT);

    // Normalize by transcript length (longer transcripts naturally have more hits)
    // Use sqrt to dampen the length effect — a 4x longer transcript shouldn't
    // need 4x as many hits to reach the same score
    const lengthFactor = Math.sqrt(totalWords / 100);
    const normalizedScore = rawScore / Math.max(lengthFactor, 1);

    scores[genre] = Math.round(normalizedScore * 1000) / 1000;

    if (scores[genre] > maxScore) {
      maxScore = scores[genre];
      topGenre = genre;
    }
  }

  // Phase 4: Compute confidence
  // Confidence is based on:
  //   (a) absolute score of the top genre
  //   (b) separation from the second-best genre
  const sortedScores = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  const bestScore = sortedScores[0]?.[1] || 0;
  const secondScore = sortedScores[1]?.[1] || 0;
  const separation = bestScore > 0 ? (bestScore - secondScore) / bestScore : 0;

  // Confidence formula: combines absolute strength and relative separation
  // Caps at 1.0
  let confidence;
  if (bestScore === 0) {
    confidence = 0;
    topGenre = 'daily_routine';
  } else {
    const absoluteConfidence = Math.min(bestScore / 5.0, 1.0);
    const separationBonus = separation * 0.3;
    confidence = Math.min(absoluteConfidence + separationBonus, 1.0);
    confidence = Math.round(confidence * 100) / 100;
  }

  // Phase 5: Fallback to daily_routine if confidence is too low
  if (confidence < CONFIDENCE_THRESHOLDS.low) {
    topGenre = 'daily_routine';
    confidence = 0;
  }

  // Compute complexity estimate from the genre baseline, adjusted by
  // actual keyword diversity (more unique keywords = higher complexity)
  const profile = TOPIC_PROFILES[topGenre];
  const keywordDiversity = (keywordHits[topGenre] || 0) / Math.max(totalWords, 1);
  const complexity = Math.min(
    Math.max(profile.complexity_baseline + (keywordDiversity * 0.5), 0),
    1.0
  );

  return {
    genre: topGenre,
    complexity: Math.round(complexity * 100) / 100,
    confidence,
    scores,
    keyword_hits: keywordHits,
  };
}

// ════════════════════════════════════════════════════════
// TOPIC ADJUSTMENT APPLICATION
// ════════════════════════════════════════════════════════

/**
 * Get the z-score adjustment for a specific indicator under a specific genre.
 *
 * Returns the raw adjustment value from the profile. The caller is responsible
 * for applying the correct sign convention:
 *   adjusted_z = raw_z - adjustment
 *
 * @param {string} genre - One of DETERMINISTIC_TOPIC_IDS
 * @param {string} indicatorId - A valid indicator ID (e.g., 'LEX_TTR')
 * @returns {number} The z-score shift, or 0 if no adjustment defined
 */
export function getTopicAdjustment(genre, indicatorId) {
  if (!genre || !indicatorId) return 0;

  const profile = TOPIC_PROFILES[genre];
  if (!profile) return 0;

  const adjustment = profile.adjustments[indicatorId];
  return typeof adjustment === 'number' && Number.isFinite(adjustment) ? adjustment : 0;
}

/**
 * Apply topic-genre adjustments to a full z-scores object.
 *
 * For each indicator with a defined adjustment in the genre profile:
 *   adjusted_z = raw_z - adjustment
 *
 * This means:
 *   - Positive adjustment (genre naturally inflates indicator):
 *     subtract it, pulling the z-score DOWN toward 0
 *   - Negative adjustment (genre naturally deflates indicator):
 *     subtract it (add the absolute value), pulling the z-score UP toward 0
 *
 * The adjustment is scaled by the detection confidence. At confidence=1.0,
 * the full adjustment is applied. At confidence=0.5, half the adjustment
 * is applied. This prevents over-correction when genre detection is uncertain.
 *
 * @param {Record<string, number|null>} zScores - Raw z-scores keyed by indicator ID
 * @param {string} genre - Detected genre from detectTopicGenre()
 * @param {number} [confidence=1.0] - Detection confidence (0-1), scales the adjustment
 * @returns {{ adjusted: Record<string, number|null>, adjustments_applied: Record<string, number>, genre: string, confidence: number }}
 */
export function applyTopicAdjustments(zScores, genre, confidence = 1.0) {
  if (!zScores || typeof zScores !== 'object') {
    return {
      adjusted: zScores || {},
      adjustments_applied: {},
      genre: genre || 'daily_routine',
      confidence: 0,
    };
  }

  const profile = TOPIC_PROFILES[genre];
  if (!profile) {
    return {
      adjusted: { ...zScores },
      adjustments_applied: {},
      genre: genre || 'daily_routine',
      confidence: 0,
    };
  }

  // Clamp confidence to [0, 1]
  const clampedConfidence = Math.max(0, Math.min(1, confidence));

  const adjusted = {};
  const adjustmentsApplied = {};

  for (const [indicatorId, rawZ] of Object.entries(zScores)) {
    if (rawZ == null || !Number.isFinite(rawZ)) {
      adjusted[indicatorId] = rawZ;
      continue;
    }

    const adjustment = profile.adjustments[indicatorId];
    if (adjustment != null && Number.isFinite(adjustment)) {
      const scaledAdjustment = adjustment * clampedConfidence;
      adjusted[indicatorId] = rawZ - scaledAdjustment;
      adjustmentsApplied[indicatorId] = Math.round(scaledAdjustment * 1000) / 1000;
    } else {
      adjusted[indicatorId] = rawZ;
    }
  }

  return {
    adjusted,
    adjustments_applied: adjustmentsApplied,
    genre,
    confidence: clampedConfidence,
  };
}

// ════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ════════════════════════════════════════════════════════

/**
 * List all indicator IDs that have adjustments defined for a given genre.
 * Useful for debugging and reporting which indicators were topic-adjusted.
 *
 * @param {string} genre - One of DETERMINISTIC_TOPIC_IDS
 * @returns {string[]} Array of indicator IDs with non-zero adjustments
 */
export function getAdjustedIndicators(genre) {
  const profile = TOPIC_PROFILES[genre];
  if (!profile) return [];
  return Object.keys(profile.adjustments);
}

/**
 * Get a summary of all adjustments for a genre, sorted by absolute magnitude.
 * Useful for clinical reporting — shows which indicators are most affected
 * by the topic genre and in which direction.
 *
 * @param {string} genre - One of DETERMINISTIC_TOPIC_IDS
 * @returns {Array<{ indicatorId: string, adjustment: number, direction: string }>}
 */
export function getAdjustmentSummary(genre) {
  const profile = TOPIC_PROFILES[genre];
  if (!profile) return [];

  return Object.entries(profile.adjustments)
    .map(([indicatorId, adjustment]) => ({
      indicatorId,
      adjustment,
      direction: adjustment > 0 ? 'genre_inflates' : 'genre_deflates',
    }))
    .sort((a, b) => Math.abs(b.adjustment) - Math.abs(a.adjustment));
}

/**
 * Validate that all indicator IDs referenced in TOPIC_PROFILES actually
 * exist in the indicator registry. Call this during startup/testing to
 * catch mistyped indicator IDs early.
 *
 * @param {string[]} knownIndicatorIds - Array of all valid indicator IDs
 * @returns {{ valid: boolean, unknown: Array<{ genre: string, indicatorId: string }> }}
 */
export function validateProfileIndicators(knownIndicatorIds) {
  const known = new Set(knownIndicatorIds);
  const unknown = [];

  for (const [genre, profile] of Object.entries(TOPIC_PROFILES)) {
    for (const indicatorId of Object.keys(profile.adjustments)) {
      if (!known.has(indicatorId)) {
        unknown.push({ genre, indicatorId });
      }
    }
  }

  return {
    valid: unknown.length === 0,
    unknown,
  };
}
