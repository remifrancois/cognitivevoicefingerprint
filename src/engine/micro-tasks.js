/**
 * V5 MICRO-TASKS — Extends V4 with six tasks embedded in MemoVoice conversations
 * for targeted cognitive/motor assessment. Each maps to V5 indicators
 * and is scheduled by risk profile, frequency constraints, and fatigue limits.
 *
 * New in V5:
 *   - ATTENTION_FLUCTUATION: sustained counting for LBD attention lapse detection
 *   - PRAGMATIC_PROBE: social cognition / indirect speech for FTD behavioral variant
 *   - Scheduling supports lbd and ftd risk flags
 */
import { INDICATORS } from './indicators.js';

// ════════════════════════════════════════════════════════
// TASK DEFINITIONS
// ════════════════════════════════════════════════════════

export const MICRO_TASKS = {
  SUSTAINED_VOWEL: {
    id: 'sustained_vowel',
    duration: 15, // seconds
    prompt: {
      en: "Can you say 'ahhh' and hold it for me as long as you comfortably can?",
      fr: "Pouvez-vous dire 'ahhh' et tenir le son aussi longtemps que possible ?"
    },
    targets: ['PDM_PPE', 'PDM_RPDE', 'PDM_DFA', 'ACU_JITTER', 'ACU_SHIMMER', 'ACU_HNR', 'ACU_CPP', 'PDM_D2'],
    conditions: ['parkinson'],
    frequency: 'weekly',
    priority: 1,
    description: 'Sustained phonation task for PD phonatory feature extraction'
  },
  DDK: {
    id: 'ddk',
    duration: 10,
    prompt: {
      en: "Now try repeating 'pa-ta-ka, pa-ta-ka' as fast and clearly as you can for a few seconds.",
      fr: "Maintenant, essayez de répéter 'pa-ta-ka, pa-ta-ka' aussi vite et clairement que possible."
    },
    targets: ['PDM_DDK_RATE', 'PDM_DDK_REG', 'PDM_VOT', 'PDM_FESTINATION'],
    conditions: ['parkinson'],
    frequency: 'weekly',
    priority: 2,
    description: 'Diadochokinetic task for articulatory assessment'
  },
  CATEGORY_FLUENCY: {
    id: 'category_fluency',
    duration: 60,
    prompt: {
      en: "Let's play a quick word game — name as many animals as you can think of!",
      fr: "Jouons à un petit jeu — nommez autant d'animaux que vous pouvez !"
    },
    targets: ['MEM_SEMANTIC_FLUENCY'],
    conditions: ['alzheimer', 'parkinson'],
    frequency: 'biweekly',
    priority: 3,
    description: 'Semantic fluency task for category naming and clustering'
  },
  DEPRESSION_SCREEN: {
    id: 'depression_screen',
    duration: 90,
    prompt: {
      en: "In the last couple of weeks, have you been feeling down, anxious, or less interested in things you usually enjoy? Tell me about how you've been feeling.",
      fr: "Ces deux dernières semaines, vous êtes-vous senti(e) triste, anxieux(se) ou moins intéressé(e) par les choses que vous aimez habituellement ? Parlez-moi de comment vous vous sentez."
    },
    targets: ['AFF_NEG_VALENCE', 'AFF_SELF_PRONOUN', 'AFF_HEDONIC', 'LEX_DEATH_WORDS', 'LEX_RUMINATIVE', 'AFF_FUTURE_REF'],
    conditions: ['depression'],
    frequency: 'weekly',
    priority: 4,
    description: 'Adapted from Grimm 2026 single-question PHQ-9 screening (AUC 0.900)'
  },

  // ── V5 new tasks ──────────────────────────────────────

  ATTENTION_FLUCTUATION: {
    id: 'attention_fluctuation',
    duration: 45, // seconds
    prompt: {
      en: "I'm going to say some numbers, and I'd like you to count backwards from 20 to 1. Take your time.",
      fr: "Je vais vous demander de compter à rebours de 20 à 1. Prenez votre temps."
    },
    targets: ['EXE_TASK_SWITCHING', 'EXE_INHIBITION', 'TMP_PAUSE_VARIABILITY'],
    conditions: ['lbd'],
    frequency: 'weekly',
    priority: 5,
    description: 'Attention fluctuation task for LBD detection — sustained counting reveals attention lapses'
  },
  PRAGMATIC_PROBE: {
    id: 'pragmatic_probe',
    duration: 60,
    prompt: {
      en: "I'm going to describe a situation and I'd like to hear what you think. Imagine your neighbor asks to borrow your car, but they've had two accidents this year. What would you say to them?",
      fr: "Je vais décrire une situation et j'aimerais avoir votre avis. Imaginez que votre voisin vous demande de lui prêter votre voiture, mais il a eu deux accidents cette année. Que lui diriez-vous ?"
    },
    targets: ['PRA_INDIRECT_SPEECH', 'PRA_PERSPECTIVE_TAKING', 'PRA_HUMOR_IRONY', 'EXE_INHIBITION'],
    conditions: ['ftd'],
    frequency: 'biweekly',
    priority: 6,
    description: 'Pragmatic reasoning probe for FTD behavioral variant — tests social cognition and indirect speech'
  }
};

const MAX_TASKS_PER_SESSION = 2;
const TASK_KEYS = Object.keys(MICRO_TASKS);

const TRANSITIONS = {
  en: ["By the way, ", "Before we continue, ", "I'd like to try something quick — "],
  fr: ["Au fait, ", "Avant de continuer, ", "J'aimerais essayer quelque chose de rapide — "]
};

// Semantic clusters for category fluency animal naming analysis
const ANIMAL_CLUSTERS = {
  farm:     ['cow','pig','horse','sheep','goat','chicken','rooster','hen','duck','donkey','mule','turkey'],
  pets:     ['dog','cat','hamster','rabbit','goldfish','parrot','turtle','guinea pig','ferret','bird'],
  african:  ['lion','elephant','giraffe','zebra','hippo','rhino','cheetah','leopard','gorilla','hyena','antelope'],
  ocean:    ['whale','dolphin','shark','octopus','seal','fish','crab','lobster','starfish','jellyfish','squid'],
  insects:  ['ant','bee','butterfly','spider','fly','mosquito','beetle','grasshopper','cricket','dragonfly'],
  birds:    ['eagle','hawk','owl','robin','sparrow','crow','pigeon','penguin','flamingo','pelican','swan'],
  reptiles: ['snake','lizard','crocodile','alligator','iguana','gecko','chameleon','tortoise','komodo'],
  rodents:  ['mouse','rat','squirrel','chipmunk','beaver','porcupine','gopher'],
  arctic:   ['polar bear','walrus','reindeer','moose','caribou','arctic fox','wolf']
};

// ════════════════════════════════════════════════════════
// SCHEDULING
// ════════════════════════════════════════════════════════

/**
 * Determine which micro-tasks to include in a session.
 * @param {Object} patientProfile - { riskFlags: {alzheimer,depression,parkinson,lbd,ftd}, age, lastTasks: [{taskId,weekNumber}] }
 * @param {number} weekNumber - current ISO week number
 * @param {string[]} completedTasks - task IDs already completed this session
 * @returns {Object[]} scheduled task definitions sorted by priority, max 2
 */
export function getScheduledTasks(patientProfile, weekNumber, completedTasks = []) {
  const { riskFlags = {}, lastTasks = [] } = patientProfile;
  const completedSet = new Set(completedTasks);

  // Build map of most recent completion week per task
  const lastCompletionWeek = {};
  for (const entry of lastTasks) {
    const prev = lastCompletionWeek[entry.taskId];
    if (prev === undefined || entry.weekNumber > prev) {
      lastCompletionWeek[entry.taskId] = entry.weekNumber;
    }
  }

  const candidates = [];

  for (const key of TASK_KEYS) {
    const task = MICRO_TASKS[key];
    if (completedSet.has(task.id)) continue;

    // Check condition relevance — depression screen runs for all patients
    let relevant = task.id === 'depression_screen';
    if (!relevant && task.conditions.includes('parkinson') && riskFlags.parkinson) relevant = true;
    if (!relevant && task.conditions.includes('alzheimer') && riskFlags.alzheimer) relevant = true;
    if (!relevant && task.conditions.includes('lbd') && riskFlags.lbd) relevant = true;
    if (!relevant && task.conditions.includes('ftd') && riskFlags.ftd) relevant = true;
    // CATEGORY_FLUENCY is dual-condition: also relevant when PD flagged
    if (task.id === 'category_fluency' && riskFlags.parkinson) relevant = true;
    if (!relevant) continue;

    // Enforce frequency limits
    const lastWeek = lastCompletionWeek[task.id];
    if (lastWeek !== undefined) {
      if (task.frequency === 'weekly' && lastWeek >= weekNumber) continue;
      if (task.frequency === 'biweekly' && (weekNumber - lastWeek) < 2) continue;
    }

    candidates.push(task);
  }

  // Sort by priority (lower = higher priority), cap at MAX to avoid fatigue
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates.slice(0, MAX_TASKS_PER_SESSION);
}

// ════════════════════════════════════════════════════════
// SCORING
// ════════════════════════════════════════════════════════

/**
 * Route scoring based on task type.
 * @param {string} taskId - micro-task ID
 * @param {Object} results - task-specific results
 *   sustained_vowel/ddk: { [indicatorId]: rawValue } from acoustic pipeline
 *   category_fluency: { transcript: string, language: string }
 *   depression_screen: { [indicatorId]: rawValue } from text extraction
 *   attention_fluctuation: { [indicatorId]: rawValue } from counting analysis
 *   pragmatic_probe: { [indicatorId]: rawValue } from pragmatic analysis
 * @returns {Object} { taskId, scores: { [indicatorId]: value }, timestamp }
 */
export function scoreMicroTask(taskId, results) {
  const timestamp = new Date().toISOString();

  if (!MICRO_TASKS[taskId.toUpperCase()] && !Object.values(MICRO_TASKS).some(t => t.id === taskId)) {
    return { taskId, scores: {}, timestamp: new Date().toISOString(), error: 'Unknown task' };
  }

  switch (taskId) {
    case 'sustained_vowel':
    case 'ddk': {
      const task = taskId === 'sustained_vowel' ? MICRO_TASKS.SUSTAINED_VOWEL : MICRO_TASKS.DDK;
      const scores = {};
      for (const target of task.targets) {
        if (results[target] !== undefined) scores[target] = results[target];
      }
      return { taskId, scores, timestamp };
    }

    case 'category_fluency': {
      const { transcript, language = 'en' } = results;
      const fluencyResult = analyzeCategoryFluency(transcript, language);
      return {
        taskId,
        scores: { MEM_SEMANTIC_FLUENCY: fluencyResult.score },
        metadata: fluencyResult,
        timestamp
      };
    }

    case 'depression_screen': {
      const scores = {};
      for (const target of MICRO_TASKS.DEPRESSION_SCREEN.targets) {
        if (results[target] !== undefined) scores[target] = results[target];
      }
      return { taskId, scores, timestamp };
    }

    case 'attention_fluctuation': {
      // Score based on counting accuracy, hesitations, and pause patterns
      const scores = {};
      for (const target of MICRO_TASKS.ATTENTION_FLUCTUATION.targets) {
        if (results[target] !== undefined) scores[target] = results[target];
      }
      return { taskId, scores, timestamp };
    }

    case 'pragmatic_probe': {
      const scores = {};
      for (const target of MICRO_TASKS.PRAGMATIC_PROBE.targets) {
        if (results[target] !== undefined) scores[target] = results[target];
      }
      return { taskId, scores, timestamp };
    }

    default:
      return { taskId, scores: {}, timestamp, error: `Unknown task: ${taskId}` };
  }
}

// ════════════════════════════════════════════════════════
// CATEGORY FLUENCY ANALYSIS
// ════════════════════════════════════════════════════════

/**
 * Parse category naming from transcript. Extracts animal names, counts
 * unique valid items, estimates semantic clusters and switching rate,
 * and maps to a 0.0-1.0 score (healthy: 15-25 animals/60s, impaired: <12).
 * @param {string} transcript - raw patient transcript
 * @param {string} language - 'en' or 'fr'
 * @returns {Object} { item_count, unique_items, estimated_clusters, score }
 */
export function analyzeCategoryFluency(transcript, language = 'en') {
  const MAX_TRANSCRIPT_LENGTH = 100000;
  if (!transcript || typeof transcript !== 'string') {
    return { item_count: 0, unique_items: 0, estimated_clusters: 0, switching_rate: 0, score: 0.5 };
  }
  const safeTranscript = transcript.slice(0, MAX_TRANSCRIPT_LENGTH);

  const normalized = safeTranscript.toLowerCase().replace(/[.,!?;:()]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ').filter(w => w.length > 1).slice(0, 10000);

  // Build flat lookup of all known animals and their cluster membership
  const allAnimals = new Set();
  const animalToCluster = {};
  for (const [cluster, animals] of Object.entries(ANIMAL_CLUSTERS)) {
    for (const animal of animals) {
      allAnimals.add(animal);
      animalToCluster[animal] = cluster;
    }
  }

  // Extract valid items, handling multi-word animals (e.g. "polar bear")
  const foundItems = [];
  const seenItems = new Set();
  let i = 0;

  while (i < words.length) {
    let matched = false;
    // Try two-word match first
    if (i + 1 < words.length) {
      const twoWord = words[i] + ' ' + words[i + 1];
      if (allAnimals.has(twoWord) && !seenItems.has(twoWord)) {
        foundItems.push(twoWord);
        seenItems.add(twoWord);
        i += 2;
        matched = true;
      }
    }
    if (!matched) {
      const oneWord = words[i];
      if (allAnimals.has(oneWord) && !seenItems.has(oneWord)) {
        foundItems.push(oneWord);
        seenItems.add(oneWord);
      }
      i += 1;
    }
  }

  const itemCount = foundItems.length;
  const uniqueItems = seenItems.size;

  // Estimate clusters: count distinct cluster transitions in mention order
  let estimatedClusters = 0;
  let lastCluster = null;
  for (const item of foundItems) {
    const cluster = animalToCluster[item] || 'other';
    if (cluster !== lastCluster) {
      estimatedClusters += 1;
      lastCluster = cluster;
    }
  }

  // Switching rate: cluster transitions / (total items - 1)
  const switchingRate = uniqueItems > 1 ? (estimatedClusters - 1) / (uniqueItems - 1) : 0;

  // Map to 0.0-1.0 via sigmoid centered at impaired cutoff
  const score = computeFluencyScore(uniqueItems);

  return {
    item_count: itemCount,
    unique_items: uniqueItems,
    estimated_clusters: estimatedClusters,
    switching_rate: Math.round(switchingRate * 1000) / 1000,
    score: Math.round(score * 1000) / 1000
  };
}

/**
 * Sigmoid mapping of raw item count to [0.0, 1.0].
 * Midpoint at 12 (impaired cutoff). 1.0 = healthy, 0.0 = severely impaired.
 */
function computeFluencyScore(count) {
  const midpoint = 12;
  const k = 0.35;
  const raw = 1 / (1 + Math.exp(-k * (count - midpoint)));
  return Math.max(0, Math.min(1, raw));
}

// ════════════════════════════════════════════════════════
// PROMPT EMBEDDING
// ════════════════════════════════════════════════════════

/**
 * Return a natural language prompt for embedding a micro-task in conversation.
 * Prepends a transition phrase selected by turn number for organic variety.
 * @param {string} taskId - the micro-task ID
 * @param {string} language - 'en' or 'fr'
 * @param {number} turn - current conversation turn (selects transition phrase)
 * @returns {string} the full prompt with transition, or '' if task not found
 */
export function embedTaskPrompt(taskId, language = 'en', turn = 0) {
  let task = null;
  for (const key of TASK_KEYS) {
    if (MICRO_TASKS[key].id === taskId) { task = MICRO_TASKS[key]; break; }
  }
  if (!task) return '';

  const lang = language === 'fr' ? 'fr' : 'en';
  const transitions = TRANSITIONS[lang];
  const transition = transitions[turn % transitions.length];
  const prompt = task.prompt[lang] || task.prompt.en;

  return transition + prompt;
}
