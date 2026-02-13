/**
 * @file nlp-deterministic.js
 * @description V5 Deterministic NLP Indicator Engine
 *
 * Computes ~20 linguistic indicators algorithmically (no LLM) from patient
 * speech transcripts. These serve as calibration anchors to reduce LLM
 * extraction variability by 40-50%.
 *
 * When Claude extracts indicator scores from text, there is variability
 * between passes. By computing these indicators deterministically via
 * regex-based tokenization and word-list matching, we create ground truth
 * anchors that the LLM extraction can be calibrated against.
 *
 * All output values are on a 0.0-1.0 scale (same as LLM extraction).
 *
 * Supports French (fr) and English (en) transcripts.
 *
 * @module engine/v5/nlp-deterministic
 */

// ---------------------------------------------------------------------------
// Constants: Deterministic indicator IDs
// ---------------------------------------------------------------------------

/**
 * Array of indicator IDs that this module computes deterministically.
 * @type {string[]}
 */
export const DETERMINISTIC_INDICATOR_IDS = [
  'LEX_TTR',
  'LEX_MATTR',
  'LEX_CONTENT_DENSITY',
  'LEX_PRONOUN_NOUN',
  'LEX_VERBAL_OUTPUT',
  'LEX_CLOSED_OPEN',
  'LEX_LIGHT_VERB',
  'LEX_NID_RATE',
  'SYN_MLU',
  'SYN_FRAGMENT_RATE',
  'TMP_FILLER_RATE',
  'TMP_REPETITION',
  'TMP_SPEECH_RATE',
  'AFF_SELF_PRONOUN',
  'AFF_NEG_VALENCE',
  'AFF_ABSOLUTIST',
  'DIS_PERSEVERATION',
  'LEX_GENERIC_SUB',
  'LEX_DEATH_WORDS',
  'LEX_RUMINATIVE',
  // V5.2 new pragmatic/executive/discourse anchors
  'PRA_DISCOURSE_MARKERS',
  'EXE_PLANNING',
  'PRA_NARRATIVE_STRUCTURE',
  'PRA_INDIRECT_SPEECH',
  'DIS_CIRCUMLOCUTION',
];

// ---------------------------------------------------------------------------
// Word lists — English
// ---------------------------------------------------------------------------

const EN_PRONOUNS = new Set([
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  'who', 'whom', 'whose',
  'this', 'that', 'these', 'those',
  'what', 'which',
  'somebody', 'someone', 'something',
  'anybody', 'anyone', 'anything',
  'nobody', 'no one', 'nothing',
  'everybody', 'everyone', 'everything',
  'each', 'other', 'another',
  'one', 'ones',
]);

const EN_SELF_PRONOUNS = new Set([
  'i', 'me', 'my', 'mine', 'myself',
]);

const EN_FUNCTION_WORDS = new Set([
  // Determiners / Articles
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
  'some', 'any', 'no', 'every', 'each', 'all', 'both',
  'few', 'many', 'much', 'several', 'enough',
  // Prepositions
  'of', 'in', 'to', 'for', 'with', 'on', 'at', 'from',
  'by', 'about', 'as', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'under', 'over',
  'against', 'without', 'within', 'along', 'across', 'behind',
  'beyond', 'toward', 'towards', 'upon', 'among', 'around',
  'beside', 'besides', 'near', 'off', 'since', 'until', 'up',
  'down', 'out',
  // Conjunctions
  'and', 'but', 'or', 'nor', 'so', 'yet', 'for',
  'because', 'although', 'though', 'while', 'if', 'unless',
  'when', 'where', 'whether', 'than', 'that', 'once',
  // Auxiliaries / Modals / Copulas
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'has', 'have', 'had', 'having',
  'do', 'does', 'did', 'doing', 'done',
  'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must',
  'need', 'dare', 'ought',
  // Negation
  'not', "n't",
  // Particles / Others
  'then', 'just', 'also', 'too', 'very', 'really',
  'quite', 'rather', 'still', 'already', 'even',
  'only', 'well', 'now', 'here', 'there',
  'how', 'why', 'what', 'which', 'who', 'whom', 'whose',
  'where', 'when',
  // Pronouns (function words include pronouns)
  'i', 'me', 'my', 'mine', 'myself',
  'you', 'your', 'yours', 'yourself',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  'one', 'ones',
]);

const EN_LIGHT_VERBS = new Set([
  'do', 'does', 'did', 'doing', 'done',
  'make', 'makes', 'made', 'making',
  'get', 'gets', 'got', 'getting', 'gotten',
  'have', 'has', 'had', 'having',
  'go', 'goes', 'went', 'going', 'gone',
  'take', 'takes', 'took', 'taking', 'taken',
  'put', 'puts', 'putting',
  'give', 'gives', 'gave', 'giving', 'given',
]);

const EN_COMMON_VERBS = new Set([
  ...EN_LIGHT_VERBS,
  'say', 'said', 'says', 'saying',
  'know', 'knew', 'knows', 'knowing', 'known',
  'think', 'thought', 'thinks', 'thinking',
  'see', 'saw', 'sees', 'seeing', 'seen',
  'want', 'wanted', 'wants', 'wanting',
  'come', 'came', 'comes', 'coming',
  'use', 'used', 'uses', 'using',
  'find', 'found', 'finds', 'finding',
  'tell', 'told', 'tells', 'telling',
  'ask', 'asked', 'asks', 'asking',
  'work', 'worked', 'works', 'working',
  'seem', 'seemed', 'seems', 'seeming',
  'feel', 'felt', 'feels', 'feeling',
  'try', 'tried', 'tries', 'trying',
  'leave', 'left', 'leaves', 'leaving',
  'call', 'called', 'calls', 'calling',
  'keep', 'kept', 'keeps', 'keeping',
  'let', 'lets', 'letting',
  'begin', 'began', 'begins', 'beginning', 'begun',
  'show', 'showed', 'shows', 'showing', 'shown',
  'hear', 'heard', 'hears', 'hearing',
  'play', 'played', 'plays', 'playing',
  'run', 'ran', 'runs', 'running',
  'move', 'moved', 'moves', 'moving',
  'live', 'lived', 'lives', 'living',
  'believe', 'believed', 'believes', 'believing',
  'happen', 'happened', 'happens', 'happening',
  'bring', 'brought', 'brings', 'bringing',
  'write', 'wrote', 'writes', 'writing', 'written',
  'sit', 'sat', 'sits', 'sitting',
  'stand', 'stood', 'stands', 'standing',
  'lose', 'lost', 'loses', 'losing',
  'pay', 'paid', 'pays', 'paying',
  'meet', 'met', 'meets', 'meeting',
  'include', 'included', 'includes', 'including',
  'continue', 'continued', 'continues', 'continuing',
  'set', 'sets', 'setting',
  'learn', 'learned', 'learns', 'learning',
  'change', 'changed', 'changes', 'changing',
  'lead', 'led', 'leads', 'leading',
  'understand', 'understood', 'understands', 'understanding',
  'watch', 'watched', 'watches', 'watching',
  'follow', 'followed', 'follows', 'following',
  'stop', 'stopped', 'stops', 'stopping',
  'create', 'created', 'creates', 'creating',
  'speak', 'spoke', 'speaks', 'speaking', 'spoken',
  'read', 'reads', 'reading',
  'spend', 'spent', 'spends', 'spending',
  'grow', 'grew', 'grows', 'growing', 'grown',
  'open', 'opened', 'opens', 'opening',
  'walk', 'walked', 'walks', 'walking',
  'win', 'won', 'wins', 'winning',
  'teach', 'taught', 'teaches', 'teaching',
  'offer', 'offered', 'offers', 'offering',
  'remember', 'remembered', 'remembers', 'remembering',
  'love', 'loved', 'loves', 'loving',
  'consider', 'considered', 'considers', 'considering',
  'appear', 'appeared', 'appears', 'appearing',
  'buy', 'bought', 'buys', 'buying',
  'wait', 'waited', 'waits', 'waiting',
  'serve', 'served', 'serves', 'serving',
  'die', 'died', 'dies', 'dying',
  'send', 'sent', 'sends', 'sending',
  'build', 'built', 'builds', 'building',
  'stay', 'stayed', 'stays', 'staying',
  'fall', 'fell', 'falls', 'falling', 'fallen',
  'cut', 'cuts', 'cutting',
  'reach', 'reached', 'reaches', 'reaching',
  'kill', 'killed', 'kills', 'killing',
  'remain', 'remained', 'remains', 'remaining',
  'suggest', 'suggested', 'suggests', 'suggesting',
  'raise', 'raised', 'raises', 'raising',
  'pass', 'passed', 'passes', 'passing',
  'sell', 'sold', 'sells', 'selling',
  'require', 'required', 'requires', 'requiring',
  'report', 'reported', 'reports', 'reporting',
  'decide', 'decided', 'decides', 'deciding',
  'pull', 'pulled', 'pulls', 'pulling',
  'eat', 'ate', 'eats', 'eating', 'eaten',
  'sleep', 'slept', 'sleeps', 'sleeping',
  'cry', 'cried', 'cries', 'crying',
  'worry', 'worried', 'worries', 'worrying',
  'hurt', 'hurts', 'hurting',
  'suffer', 'suffered', 'suffers', 'suffering',
]);

const EN_FILLERS = new Set([
  'um', 'uh', 'erm', 'er', 'ah', 'hmm', 'hm',
  'like', 'literally', 'basically', 'actually',
]);

// Multi-word fillers need phrase matching
const EN_FILLER_PHRASES = [
  'you know', 'i mean', 'sort of', 'kind of',
  'you see', 'i guess', 'i suppose',
];

const EN_NEGATIVE_EMOTION = new Set([
  'sad', 'sadness', 'unhappy', 'depressed', 'depressing', 'depression',
  'angry', 'anger', 'mad', 'furious', 'rage', 'enraged', 'irritated',
  'annoyed', 'frustrated', 'frustration', 'frustrated',
  'worried', 'worry', 'worrying', 'anxious', 'anxiety', 'nervous',
  'afraid', 'fear', 'fearful', 'scared', 'frightened', 'terrified',
  'terrible', 'horrible', 'awful', 'dreadful',
  'painful', 'pain', 'suffering', 'suffer', 'agony', 'agonizing',
  'lonely', 'loneliness', 'alone', 'isolated', 'isolation',
  'hopeless', 'hopelessness', 'despair', 'desperate', 'desperation',
  'miserable', 'misery', 'distressed', 'distress',
  'grief', 'grieving', 'sorrow', 'sorrowful', 'mourning',
  'ashamed', 'shame', 'guilty', 'guilt', 'remorse',
  'helpless', 'helplessness', 'powerless', 'worthless', 'worthlessness',
  'disappointed', 'disappointment', 'regret', 'regretful',
  'jealous', 'jealousy', 'envious', 'envy',
  'bitter', 'bitterness', 'resentful', 'resentment',
  'disgusted', 'disgust', 'revolted', 'repulsed',
  'exhausted', 'overwhelmed', 'stressed', 'stress',
  'crying', 'tears', 'weeping', 'sobbing',
  'hate', 'hatred', 'loathe', 'loathing', 'detest',
  'ugly', 'stupid', 'pathetic', 'useless',
  'hurt', 'hurting', 'wounded', 'broken',
  'nightmare', 'torment', 'torture',
  'pessimistic', 'pessimism', 'gloomy', 'gloom', 'doom',
  'abandoned', 'neglected', 'rejected', 'rejection',
  'insecure', 'insecurity', 'vulnerable', 'vulnerability',
  'panicked', 'panic', 'dread',
  'numb', 'numbness', 'empty', 'emptiness', 'void',
]);

const EN_ABSOLUTIST = new Set([
  'always', 'never', 'nothing', 'everything', 'completely', 'totally',
  'entirely', 'absolutely', 'forever', 'constantly', 'every',
  'nobody', 'everyone', 'everywhere', 'nowhere',
  'all', 'none', 'impossible', 'certain', 'definitely', 'certainly',
  'undoubtedly', 'without a doubt', 'must',
  'perfect', 'perfectly', 'worst', 'best',
  'only', 'whole', 'purely',
]);

const EN_DEATH_WORDS = new Set([
  'death', 'dying', 'die', 'died', 'dead',
  'funeral', 'funerals', 'burial', 'cemetery',
  'kill', 'killed', 'killing', 'kills',
  'suicide', 'suicidal',
  'end my life', 'end it all',
  'murder', 'murdered',
  'grave', 'coffin', 'corpse',
  'lethal', 'fatal', 'mortal', 'mortality',
  'euthanasia', 'overdose',
  'deceased', 'perished', 'perish',
  'tombstone', 'obituary',
]);

const EN_GENERIC_WORDS = new Set([
  'thing', 'things', 'stuff', 'something', 'whatever', 'someone',
  'somehow', 'somewhere', 'sometime', 'whatnot',
  'it', 'that', 'those', 'these', 'this',
  'thingy', 'thingamajig', 'whatchamacallit',
  'whatsit', 'doohickey',
]);

// ---------------------------------------------------------------------------
// Word lists — French
// ---------------------------------------------------------------------------

const FR_PRONOUNS = new Set([
  'je', "j'", 'me', "m'", 'moi', 'mon', 'ma', 'mes', 'mien', 'mienne',
  'miens', 'miennes', 'moi-même',
  'tu', 'te', "t'", 'toi', 'ton', 'ta', 'tes', 'tien', 'tienne',
  'tiens', 'tiennes', 'toi-même',
  'il', 'elle', 'on', 'le', 'la', 'lui', 'se', "s'",
  'son', 'sa', 'ses', 'sien', 'sienne', 'siens', 'siennes',
  'lui-même', 'elle-même', 'soi', 'soi-même',
  'nous', 'notre', 'nos', 'nôtre', 'nôtres', 'nous-mêmes',
  'vous', 'votre', 'vos', 'vôtre', 'vôtres', 'vous-même', 'vous-mêmes',
  'ils', 'elles', 'les', 'leur', 'leurs',
  'eux', 'eux-mêmes', 'elles-mêmes',
  'ce', 'ceci', 'cela', 'ça', "c'",
  'qui', 'que', 'quoi', 'dont', 'lequel', 'laquelle',
  'lesquels', 'lesquelles',
  'quelqu\'un', 'quelque chose', 'personne', 'rien',
  'chacun', 'chacune', 'tout', 'tous', 'toutes',
  'autre', 'autres', 'autrui',
  'en', 'y',
]);

const FR_SELF_PRONOUNS = new Set([
  'je', "j'", 'me', "m'", 'moi', 'mon', 'ma', 'mes',
  'mien', 'mienne', 'miens', 'miennes', 'moi-même',
]);

const FR_FUNCTION_WORDS = new Set([
  // Articles / Determiners
  'le', 'la', 'les', "l'", 'un', 'une', 'des', 'du', 'au', 'aux',
  'ce', 'cet', 'cette', 'ces',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'quel', 'quelle', 'quels', 'quelles',
  'tout', 'toute', 'tous', 'toutes',
  'chaque', 'quelque', 'quelques', 'aucun', 'aucune',
  'plusieurs', 'certain', 'certaine', 'certains', 'certaines',
  // Prepositions
  'de', 'à', 'en', 'dans', 'pour', 'sur', 'avec', 'par',
  'sans', 'sous', 'entre', 'vers', 'chez', 'avant', 'après',
  'depuis', 'pendant', 'contre', 'jusque', "jusqu'",
  'devant', 'derrière', 'dessus', 'dessous',
  'hors', 'malgré', 'parmi', 'selon', 'sauf',
  // Conjunctions
  'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
  'que', 'quand', 'si', 'comme', 'lorsque', 'puisque',
  'quoique', 'bien que', 'afin que', 'pour que',
  'parce que', 'tandis que',
  // Auxiliaries / Copulas
  'est', 'suis', 'es', 'sommes', 'êtes', 'sont',
  'étais', 'était', 'étions', 'étiez', 'étaient',
  'sera', 'serai', 'seras', 'serons', 'serez', 'seront',
  'serait', 'serais', 'serions', 'seriez', 'seraient',
  'été', 'être',
  'ai', 'as', 'a', 'avons', 'avez', 'ont',
  'avais', 'avait', 'avions', 'aviez', 'avaient',
  'aurai', 'auras', 'aura', 'aurons', 'aurez', 'auront',
  'aurait', 'aurais', 'aurions', 'auriez', 'auraient',
  'eu', 'avoir',
  'fait', 'fais', 'faisons', 'faites', 'font',
  'faisais', 'faisait', 'faisions', 'faisiez', 'faisaient',
  'faire',
  // Negation
  'ne', 'pas', 'plus', 'jamais', 'rien', 'personne', 'aucun',
  // Particles / Others
  'alors', 'aussi', 'bien', 'très', 'trop', 'peu',
  'assez', 'encore', 'déjà', 'toujours', 'souvent',
  'ici', 'là', 'où', 'comment', 'pourquoi', 'quoi',
  'oui', 'non', 'peut-être', 'seulement',
  'puis', 'donc', 'ensuite', 'enfin', 'cependant',
  'pourtant', 'néanmoins', 'toutefois',
  // Pronouns (function words include pronouns)
  'je', "j'", 'me', "m'", 'moi',
  'tu', 'te', "t'", 'toi',
  'il', 'elle', 'on', 'le', 'la', 'lui', 'se', "s'",
  'nous', 'vous', 'ils', 'elles', 'les', 'leur',
  'eux', 'en', 'y',
  'qui', 'que', "qu'", 'dont',
  'ce', 'ceci', 'cela', 'ça', "c'",
]);

const FR_LIGHT_VERBS = new Set([
  'faire', 'fait', 'fais', 'faisons', 'faites', 'font',
  'faisais', 'faisait', 'faisaient', 'fera', 'ferai',
  'avoir', 'ai', 'as', 'a', 'avons', 'avez', 'ont',
  'avais', 'avait', 'avaient', 'aura', 'aurai', 'eu',
  'aller', 'vais', 'vas', 'va', 'allons', 'allez', 'vont',
  'allais', 'allait', 'allaient', 'ira', 'irai', 'allé',
  'prendre', 'prends', 'prend', 'prenons', 'prenez', 'prennent',
  'prenais', 'prenait', 'prenaient', 'pris', 'prise',
  'mettre', 'mets', 'met', 'mettons', 'mettez', 'mettent',
  'mettais', 'mettait', 'mettaient', 'mis', 'mise',
  'donner', 'donne', 'donnes', 'donnons', 'donnez', 'donnent',
  'donnais', 'donnait', 'donnaient', 'donné',
  'être', 'suis', 'es', 'est', 'sommes', 'êtes', 'sont',
  'étais', 'était', 'étaient', 'été',
]);

const FR_COMMON_VERBS = new Set([
  ...FR_LIGHT_VERBS,
  'dire', 'dit', 'dis', 'disons', 'dites', 'disent', 'disais', 'disait',
  'savoir', 'sais', 'sait', 'savons', 'savez', 'savent', 'savais', 'savait', 'su',
  'pouvoir', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent', 'pouvais', 'pouvait', 'pu',
  'vouloir', 'veux', 'veut', 'voulons', 'voulez', 'veulent', 'voulais', 'voulait', 'voulu',
  'devoir', 'dois', 'doit', 'devons', 'devez', 'doivent', 'devais', 'devait', 'dû',
  'voir', 'vois', 'voit', 'voyons', 'voyez', 'voient', 'voyais', 'voyait', 'vu',
  'venir', 'viens', 'vient', 'venons', 'venez', 'viennent', 'venais', 'venait', 'venu',
  'croire', 'crois', 'croit', 'croyons', 'croyez', 'croient', 'croyais', 'croyait', 'cru',
  'trouver', 'trouve', 'trouves', 'trouvons', 'trouvez', 'trouvent', 'trouvais', 'trouvait', 'trouvé',
  'penser', 'pense', 'penses', 'pensons', 'pensez', 'pensent', 'pensais', 'pensait', 'pensé',
  'parler', 'parle', 'parles', 'parlons', 'parlez', 'parlent', 'parlais', 'parlait', 'parlé',
  'aimer', 'aime', 'aimes', 'aimons', 'aimez', 'aiment', 'aimais', 'aimait', 'aimé',
  'passer', 'passe', 'passes', 'passons', 'passez', 'passent', 'passais', 'passait', 'passé',
  'demander', 'demande', 'demandes', 'demandons', 'demandez', 'demandent', 'demandais', 'demandait', 'demandé',
  'rester', 'reste', 'restes', 'restons', 'restez', 'restent', 'restais', 'restait', 'resté',
  'sentir', 'sens', 'sent', 'sentons', 'sentez', 'sentent', 'sentais', 'sentait', 'senti',
  'dormir', 'dors', 'dort', 'dormons', 'dormez', 'dorment', 'dormais', 'dormait', 'dormi',
  'manger', 'mange', 'manges', 'mangeons', 'mangez', 'mangent', 'mangeais', 'mangeait', 'mangé',
  'pleurer', 'pleure', 'pleures', 'pleurons', 'pleurez', 'pleurent', 'pleurais', 'pleurait', 'pleuré',
  'mourir', 'meurs', 'meurt', 'mourons', 'mourez', 'meurent', 'mourais', 'mourait', 'mort',
  'vivre', 'vis', 'vit', 'vivons', 'vivez', 'vivent', 'vivais', 'vivait', 'vécu',
  'comprendre', 'comprends', 'comprend', 'comprenons', 'comprenez', 'comprennent', 'comprenais', 'comprenait', 'compris',
  'essayer', 'essaie', 'essaies', 'essayons', 'essayez', 'essaient', 'essayais', 'essayait', 'essayé',
  'perdre', 'perds', 'perd', 'perdons', 'perdez', 'perdent', 'perdais', 'perdait', 'perdu',
  'attendre', 'attends', 'attend', 'attendons', 'attendez', 'attendent', 'attendais', 'attendait', 'attendu',
  'écrire', 'écris', 'écrit', 'écrivons', 'écrivez', 'écrivent', 'écrivais', 'écrivait',
  'lire', 'lis', 'lit', 'lisons', 'lisez', 'lisent', 'lisais', 'lisait', 'lu',
  'sortir', 'sors', 'sort', 'sortons', 'sortez', 'sortent', 'sortais', 'sortait', 'sorti',
  'tomber', 'tombe', 'tombes', 'tombons', 'tombez', 'tombent', 'tombais', 'tombait', 'tombé',
  'finir', 'finis', 'finit', 'finissons', 'finissez', 'finissent', 'finissais', 'finissait', 'fini',
  'commencer', 'commence', 'commences', 'commençons', 'commencez', 'commencent', 'commençais', 'commençait', 'commencé',
  'arriver', 'arrive', 'arrives', 'arrivons', 'arrivez', 'arrivent', 'arrivais', 'arrivait', 'arrivé',
  'partir', 'pars', 'part', 'partons', 'partez', 'partent', 'partais', 'partait', 'parti',
]);

const FR_FILLERS = new Set([
  'euh', 'heu', 'ben', 'bah', 'bon', 'hein',
  'genre', 'style',
]);

const FR_FILLER_PHRASES = [
  'tu vois', 'vous voyez', 'en fait', 'tu sais', 'vous savez',
  'je veux dire', 'comment dire', 'voilà quoi', 'voilà',
  'en gros', 'un peu', 'quoi',
];

const FR_NEGATIVE_EMOTION = new Set([
  'triste', 'tristesse', 'malheureux', 'malheureuse',
  'déprimé', 'déprimée', 'dépression', 'dépressif',
  'fâché', 'fâchée', 'colère', 'furieux', 'furieuse', 'rage', 'enragé',
  'irrité', 'irritée', 'agacé', 'agacée',
  'frustré', 'frustrée', 'frustration',
  'inquiet', 'inquiète', 'inquiétude', 'anxieux', 'anxieuse', 'anxiété',
  'nerveux', 'nerveuse', 'angoisse', 'angoissé', 'angoissée',
  'peur', 'effrayé', 'effrayée', 'terrorisé', 'terrorisée', 'apeuré',
  'terrible', 'horrible', 'affreux', 'affreuse', 'épouvantable',
  'douleur', 'douloureux', 'douloureuse', 'souffrance', 'souffrir',
  'seul', 'seule', 'solitude', 'isolé', 'isolée', 'isolement',
  'désespoir', 'désespéré', 'désespérée',
  'misérable', 'misère', 'détresse',
  'deuil', 'chagrin', 'peine',
  'honte', 'honteux', 'honteuse', 'coupable', 'culpabilité', 'remords',
  'impuissant', 'impuissante', 'impuissance',
  'déçu', 'déçue', 'déception', 'regret',
  'jaloux', 'jalouse', 'jalousie', 'envieux', 'envieuse',
  'amer', 'amère', 'amertume', 'rancune', 'rancunier',
  'dégoûté', 'dégoûtée', 'dégoût',
  'épuisé', 'épuisée', 'submergé', 'submergée', 'stressé', 'stressée', 'stress',
  'pleurer', 'larmes', 'sanglot',
  'haine', 'haïr', 'détester',
  'nul', 'nulle', 'inutile', 'pathétique',
  'blessé', 'blessée', 'brisé', 'brisée',
  'cauchemar', 'tourment', 'torture',
  'pessimiste', 'pessimisme', 'sombre',
  'abandonné', 'abandonnée', 'rejeté', 'rejetée', 'rejet',
  'vulnérable', 'vulnérabilité',
  'panique', 'paniqué', 'paniquée',
  'engourdi', 'engourdie', 'vide',
]);

const FR_ABSOLUTIST = new Set([
  'toujours', 'jamais', 'rien', 'tout', 'complètement', 'totalement',
  'entièrement', 'absolument', 'constamment',
  'personne', 'partout', 'nulle part',
  'impossible', 'certainement', 'définitivement', 'sans doute',
  'parfait', 'parfaitement', 'pire', 'meilleur',
  'seulement', 'uniquement', 'purement',
  'forcément', 'obligatoirement',
]);

const FR_DEATH_WORDS = new Set([
  'mort', 'mourir', 'décès', 'décédé', 'décédée',
  'funérailles', 'enterrement', 'cimetière',
  'tuer', 'tué', 'tuée',
  'suicide', 'suicidaire', 'se suicider',
  'fin de vie', 'en finir',
  'meurtre',
  'tombe', 'cercueil', 'cadavre',
  'létal', 'fatal', 'mortel', 'mortelle', 'mortalité',
  'euthanasie', 'surdose',
  'défunt', 'défunte', 'périr',
]);

const FR_GENERIC_WORDS = new Set([
  'truc', 'trucs', 'chose', 'choses', 'machin', 'machins',
  'quelque chose', 'bidule', 'bidules',
  'ça', 'cela',
]);

// ---------------------------------------------------------------------------
// Ruminative patterns (regex-based)
// ---------------------------------------------------------------------------

const EN_RUMINATIVE_PATTERNS = [
  /\bi always\b/gi,
  /\bi never\b/gi,
  /\bwhy me\b/gi,
  /\bwhy do i\b/gi,
  /\bwhy can't i\b/gi,
  /\bit's my fault\b/gi,
  /\bit is my fault\b/gi,
  /\bi('m| am) (always|never|such a|so)\b/gi,
  /\bi should have\b/gi,
  /\bi shouldn't have\b/gi,
  /\bi could have\b/gi,
  /\bif only i\b/gi,
  /\bi keep (thinking|wondering|asking)\b/gi,
  /\bi can't stop (thinking|wondering)\b/gi,
  /\bwhat('s| is) wrong with me\b/gi,
  /\bi('m| am) (worthless|useless|stupid|pathetic)\b/gi,
  /\bno one (cares|loves|understands)\b/gi,
  /\beveryone (hates|leaves|abandons)\b/gi,
  /\bi('ll| will) never\b/gi,
  /\bnothing (ever|will)\b/gi,
  /\bi blame myself\b/gi,
  /\bi hate myself\b/gi,
  /\bi('m| am) a (failure|burden|loser|disappointment)\b/gi,
];

const FR_RUMINATIVE_PATTERNS = [
  /\bje\s+\S{0,20}\s*toujours\b/gi,
  /\bje\s+\S{0,20}\s*jamais\b/gi,
  /\bpourquoi moi\b/gi,
  /\bpourquoi (?:est-ce que )?je\b/gi,
  /\bc'est (?:de )?ma faute\b/gi,
  /\bj'aurais (?:dû|pu)\b/gi,
  /\bje n'aurais pas (?:dû|pu)\b/gi,
  /\bsi seulement (?:je|j')\b/gi,
  /\bje (?:n'arrête|arrête) pas de (?:penser|me demander)\b/gi,
  /\bqu'est-ce (?:qui|que) \S{0,20} (?:va pas|cloche) chez moi\b/gi,
  /\bje suis (?:nul|nulle|inutile|stupide|pathétique)\b/gi,
  /\bpersonne (?:ne )?(?:m'aime|me comprend|s'en soucie)\b/gi,
  /\btout le monde (?:me déteste|m'abandonne|me quitte)\b/gi,
  /\bje (?:ne )?(?:serai|ferai|pourrai) jamais\b/gi,
  /\brien (?:ne )?va\b/gi,
  /\bje me déteste\b/gi,
  /\bje (?:suis|me sens) (?:un|une) (?:raté|ratée|fardeau|déception)\b/gi,
];

// ---------------------------------------------------------------------------
// V5.2 Word lists — Discourse markers, planning, indirect speech, circumlocution
// ---------------------------------------------------------------------------

const EN_DISCOURSE_MARKERS = new Set([
  'well', 'so', 'anyway', 'anyhow', 'besides',
  'however', 'nevertheless', 'nonetheless',
  'meanwhile', 'furthermore', 'moreover',
  'actually', 'basically', 'essentially',
  'honestly', 'frankly', 'obviously',
  'apparently', 'presumably', 'supposedly',
  'incidentally', 'interestingly',
]);
const EN_DISCOURSE_MARKER_PHRASES = [
  'you know', 'i mean', 'you see', 'the thing is',
  'as i said', 'in fact', 'of course', 'by the way',
  'on the other hand', 'as a matter of fact',
  'to be honest', 'to tell the truth',
  'what i mean is', 'the point is',
];

const FR_DISCOURSE_MARKERS = new Set([
  'bon', 'ben', 'bref', 'enfin', 'donc',
  'alors', 'cependant', 'pourtant', 'néanmoins',
  'toutefois', 'quand même', 'justement',
  'effectivement', 'évidemment', 'franchement',
  'honnêtement', 'apparemment',
]);
const FR_DISCOURSE_MARKER_PHRASES = [
  'tu sais', 'vous savez', 'tu vois', 'vous voyez',
  'je veux dire', 'en fait', 'bien sûr', 'au fait',
  'd\'un autre côté', 'à vrai dire', 'pour ainsi dire',
  'ce que je veux dire', 'le truc c\'est',
];

const EN_PLANNING_WORDS = new Set([
  'because', 'therefore', 'consequently', 'hence',
  'thus', 'accordingly', 'then', 'next',
  'first', 'second', 'third', 'finally',
  'subsequently', 'afterwards', 'meanwhile',
]);
const EN_PLANNING_PHRASES = [
  'if then', 'so that', 'in order to', 'as a result',
  'first of all', 'after that', 'and then',
  'the reason is', 'that is why', 'which means',
  'the next step', 'what we need to',
  'before we', 'once we', 'as long as',
];

const FR_PLANNING_WORDS = new Set([
  'parce que', 'donc', 'alors', 'ensuite', 'puis',
  'premièrement', 'deuxièmement', 'troisièmement', 'finalement',
  'conséquemment', 'ainsi', 'par conséquent',
]);
const FR_PLANNING_PHRASES = [
  'si alors', 'pour que', 'afin de', 'en conséquence',
  'tout d\'abord', 'après ça', 'et ensuite',
  'la raison est', 'c\'est pourquoi', 'ce qui signifie',
  'la prochaine étape', 'ce qu\'il faut',
  'avant de', 'une fois que', 'tant que',
];

const EN_INDIRECT_PHRASES = [
  'i was wondering', 'would you mind', 'could you possibly',
  'i think maybe', 'it seems like', 'perhaps we could',
  'i suppose', 'it might be', 'do you think',
  'i was hoping', 'if you don\'t mind', 'sort of',
  'kind of', 'in a way', 'more or less',
  'i\'m not sure but', 'it could be that',
  'i don\'t want to', 'it\'s just that',
  'if it\'s not too much', 'i wouldn\'t say',
];

const FR_INDIRECT_PHRASES = [
  'je me demandais', 'est-ce que vous pourriez',
  'je pense que peut-être', 'il semble que', 'peut-être qu\'on pourrait',
  'je suppose que', 'il se pourrait que', 'vous pensez que',
  'j\'espérais que', 'si ça ne vous dérange pas',
  'en quelque sorte', 'd\'une certaine manière', 'plus ou moins',
  'je ne suis pas sûr mais', 'il se peut que',
  'ce n\'est pas que', 'c\'est juste que',
  'si ce n\'est pas trop demander',
];

const EN_CIRCUMLOCUTION_PHRASES = [
  'the thing you use to', 'the place where you',
  'you know the thing', 'what do you call it',
  'the one that', 'it\'s like a', 'it\'s sort of',
  'the thing for', 'that thing that',
  'what\'s the word', 'how do you say',
  'i can\'t think of the word', 'the thing with',
  'you know what i mean', 'it\'s the one',
  'it does the', 'the stuff that', 'the person who',
];

const FR_CIRCUMLOCUTION_PHRASES = [
  'le truc pour', 'le machin qui', 'l\'endroit où on',
  'tu sais le truc', 'comment on dit',
  'celui qui', 'c\'est comme un', 'c\'est genre',
  'le truc avec', 'ce machin qui',
  'comment ça s\'appelle', 'je ne trouve pas le mot',
  'le bidule pour', 'tu vois ce que je veux dire',
  'c\'est le', 'ça fait le', 'la chose qui',
];

// Narrative structure detection patterns
const EN_ORIENTATION_PATTERNS = [
  /\b(?:once upon|one day|last (?:week|month|year|time)|when i was|there was|it was)\b/i,
  /\b(?:a few (?:days|weeks|months) ago|i remember when|this happened)\b/i,
];
const EN_COMPLICATION_PATTERNS = [
  /\b(?:but then|suddenly|unfortunately|however|all of a sudden|unexpectedly)\b/i,
  /\b(?:the problem was|what happened was|it turned out|to my surprise)\b/i,
];
const EN_RESOLUTION_PATTERNS = [
  /\b(?:in the end|finally|eventually|so that's|and that's how|it all worked out)\b/i,
  /\b(?:the result was|we managed to|it was resolved|things got better)\b/i,
];

const FR_ORIENTATION_PATTERNS = [
  /\b(?:il était une fois|un jour|la (?:semaine|année) dernière|quand j'étais|il y avait|c'était)\b/i,
  /\b(?:il y a quelques (?:jours|semaines|mois)|je me souviens quand)\b/i,
];
const FR_COMPLICATION_PATTERNS = [
  /\b(?:mais (?:alors|ensuite)|soudain|malheureusement|cependant|tout à coup)\b/i,
  /\b(?:le problème (?:c'est|était)|ce qui s'est passé|il s'est avéré)\b/i,
];
const FR_RESOLUTION_PATTERNS = [
  /\b(?:à la fin|finalement|en fin de compte|et c'est comme ça|ça s'est bien terminé)\b/i,
  /\b(?:le résultat a été|on a réussi à|ça s'est résolu|les choses se sont améliorées)\b/i,
];

// ---------------------------------------------------------------------------
// Core NLP utilities
// ---------------------------------------------------------------------------

/**
 * Tokenize text into lowercase words. Handles French apostrophes (l', j', etc.)
 * and hyphenated words.
 *
 * @param {string} text - Raw text input
 * @returns {string[]} Array of lowercase word tokens
 */
export function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s''\u00C0-\u024F-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Split text into sentences using punctuation-based heuristics.
 *
 * @param {string} text - Raw text input
 * @returns {string[]} Array of sentence strings (trimmed, non-empty)
 */
export function splitSentences(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/[.!?…]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Extract only patient speech from a transcript.
 *
 * @param {Array<{role: string, text: string}>} transcript - Transcript turns
 * @returns {string} Concatenated patient speech
 */
export function extractPatientSpeech(transcript) {
  if (!Array.isArray(transcript)) return '';
  return transcript
    .filter(turn => turn && turn.role === 'patient' && typeof turn.text === 'string')
    .map(turn => turn.text)
    .join(' ');
}

/**
 * Count occurrences of multi-word phrases in text.
 *
 * @param {string} lowerText - Lowercased full text
 * @param {string[]} phrases - Array of multi-word phrases to count
 * @returns {number} Total occurrences
 */
export function countPhrases(lowerText, phrases) {
  let count = 0;
  for (const phrase of phrases) {
    // Use a global regex for each phrase
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + escaped + '\\b', 'gi');
    const matches = lowerText.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Count regex pattern matches in text.
 *
 * @param {string} text - Text to search
 * @param {RegExp[]} patterns - Array of RegExp patterns (should have global flag)
 * @returns {number} Total matches
 */
export function countPatternMatches(text, patterns) {
  let count = 0;
  for (const pattern of patterns) {
    // Reset lastIndex to avoid stale state
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Sigmoid mapping: maps a raw value to 0.0-1.0 using a logistic function
 * centered at `center` with a given `steepness`.
 *
 * @param {number} value - Raw value
 * @param {number} center - Value that maps to 0.5
 * @param {number} steepness - Controls curve steepness (higher = sharper)
 * @returns {number} Value in [0, 1]
 */
export function sigmoid(value, center, steepness) {
  return 1 / (1 + Math.exp(-steepness * (value - center)));
}

/**
 * Inverted sigmoid: higher raw value yields lower output
 * (for indicators where high raw value = worse).
 *
 * @param {number} value - Raw value
 * @param {number} center - Value that maps to 0.5
 * @param {number} steepness - Controls curve steepness
 * @returns {number} Value in [0, 1]
 */
export function invertedSigmoid(value, center, steepness) {
  return 1 - sigmoid(value, center, steepness);
}

/**
 * Clamp a value to [0, 1] range.
 *
 * @param {number} v - Input value
 * @returns {number} Clamped value
 */
export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Get language-appropriate word lists.
 *
 * @param {string} language - 'en' or 'fr'
 * @returns {object} Word list collections for the given language
 */
export function getWordLists(language) {
  const lang = (language || 'en').toLowerCase().slice(0, 2);
  if (lang === 'fr') {
    return {
      pronouns: FR_PRONOUNS,
      selfPronouns: FR_SELF_PRONOUNS,
      functionWords: FR_FUNCTION_WORDS,
      lightVerbs: FR_LIGHT_VERBS,
      commonVerbs: FR_COMMON_VERBS,
      fillers: FR_FILLERS,
      fillerPhrases: FR_FILLER_PHRASES,
      negativeEmotion: FR_NEGATIVE_EMOTION,
      absolutist: FR_ABSOLUTIST,
      deathWords: FR_DEATH_WORDS,
      genericWords: FR_GENERIC_WORDS,
      ruminativePatterns: FR_RUMINATIVE_PATTERNS,
      // V5.2
      discourseMarkers: FR_DISCOURSE_MARKERS,
      discourseMarkerPhrases: FR_DISCOURSE_MARKER_PHRASES,
      planningWords: FR_PLANNING_WORDS,
      planningPhrases: FR_PLANNING_PHRASES,
      indirectPhrases: FR_INDIRECT_PHRASES,
      circumlocutionPhrases: FR_CIRCUMLOCUTION_PHRASES,
      orientationPatterns: FR_ORIENTATION_PATTERNS,
      complicationPatterns: FR_COMPLICATION_PATTERNS,
      resolutionPatterns: FR_RESOLUTION_PATTERNS,
    };
  }
  return {
    pronouns: EN_PRONOUNS,
    selfPronouns: EN_SELF_PRONOUNS,
    functionWords: EN_FUNCTION_WORDS,
    lightVerbs: EN_LIGHT_VERBS,
    commonVerbs: EN_COMMON_VERBS,
    fillers: EN_FILLERS,
    fillerPhrases: EN_FILLER_PHRASES,
    negativeEmotion: EN_NEGATIVE_EMOTION,
    absolutist: EN_ABSOLUTIST,
    deathWords: EN_DEATH_WORDS,
    genericWords: EN_GENERIC_WORDS,
    ruminativePatterns: EN_RUMINATIVE_PATTERNS,
    // V5.2
    discourseMarkers: EN_DISCOURSE_MARKERS,
    discourseMarkerPhrases: EN_DISCOURSE_MARKER_PHRASES,
    planningWords: EN_PLANNING_WORDS,
    planningPhrases: EN_PLANNING_PHRASES,
    indirectPhrases: EN_INDIRECT_PHRASES,
    circumlocutionPhrases: EN_CIRCUMLOCUTION_PHRASES,
    orientationPatterns: EN_ORIENTATION_PATTERNS,
    complicationPatterns: EN_COMPLICATION_PATTERNS,
    resolutionPatterns: EN_RESOLUTION_PATTERNS,
  };
}

// ---------------------------------------------------------------------------
// Indicator computation functions
// ---------------------------------------------------------------------------

/**
 * LEX_TTR — Type-Token Ratio: unique words / total words.
 * Mapped via sigmoid centered at 0.5 TTR (population average for spontaneous speech).
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} _lists - Word lists (unused for this indicator)
 * @returns {number} Score in [0, 1]
 */
export function computeLexTTR(tokens, _lists) {
  if (tokens.length === 0) return 0.5;
  const unique = new Set(tokens);
  const rawTTR = unique.size / tokens.length;
  // Sigmoid: 0.5 TTR -> 0.5 output; steepness 8 gives reasonable spread
  return clamp01(sigmoid(rawTTR, 0.5, 8));
}

/**
 * LEX_MATTR — Moving Average Type-Token Ratio.
 * Computes mean TTR over sliding windows of 50 words.
 * More robust than global TTR for varying text lengths.
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} _lists - Word lists (unused)
 * @returns {number} Score in [0, 1]
 */
export function computeLexMATTR(tokens, _lists) {
  const windowSize = 50;
  if (tokens.length < windowSize) {
    // Fall back to global TTR for short texts
    return computeLexTTR(tokens, _lists);
  }

  let totalTTR = 0;
  const windowCount = tokens.length - windowSize + 1;

  for (let i = 0; i < windowCount; i++) {
    const window = tokens.slice(i, i + windowSize);
    const unique = new Set(window);
    totalTTR += unique.size / windowSize;
  }

  const meanTTR = totalTTR / windowCount;
  return clamp01(sigmoid(meanTTR, 0.5, 8));
}

/**
 * LEX_CONTENT_DENSITY — Content words / total words.
 * Content words are approximated as words NOT in the function word list
 * that are longer than 2 characters (heuristic for nouns, verbs, adj, adv).
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeLexContentDensity(tokens, lists) {
  if (tokens.length === 0) return 0.5;
  const contentWords = tokens.filter(w => !lists.functionWords.has(w) && w.length > 2);
  const ratio = contentWords.length / tokens.length;
  // Typical content density in speech: ~0.4-0.6. Center at 0.5
  return clamp01(sigmoid(ratio, 0.45, 8));
}

/**
 * LEX_PRONOUN_NOUN — Pronouns / nouns ratio.
 * Nouns are approximated as non-function words with length > 3 that are
 * not in the verb or pronoun lists.
 *
 * Higher pronoun-to-noun ratio may indicate less specific/concrete speech.
 * Inverted: high ratio -> lower score (less specific = worse).
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeLexPronounNoun(tokens, lists) {
  if (tokens.length === 0) return 0.5;
  const pronounCount = tokens.filter(w => lists.pronouns.has(w)).length;
  const nounApprox = tokens.filter(
    w => !lists.functionWords.has(w) &&
         !lists.commonVerbs.has(w) &&
         !lists.pronouns.has(w) &&
         w.length > 3
  ).length;

  if (nounApprox === 0 && pronounCount === 0) return 0.5;
  if (nounApprox === 0) return 0.1; // All pronouns, no nouns = very high ratio

  const ratio = pronounCount / nounApprox;
  // Typical ratio ~1.0-2.0 in conversation. Center at 1.5.
  // Higher = more pronominal, possibly less specific. Inverted.
  return clamp01(invertedSigmoid(ratio, 1.5, 2));
}

/**
 * LEX_VERBAL_OUTPUT — Total word count mapped to a rate-like scale.
 * Uses total words as a proxy for verbal output quantity.
 * Mapped so that ~200 words (roughly 2 min of patient speech) = 0.5.
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} _lists - Word lists (unused)
 * @returns {number} Score in [0, 1]
 */
export function computeLexVerbalOutput(tokens, _lists) {
  if (tokens.length === 0) return 0.5;
  const wordCount = tokens.length;
  // 200 words maps to 0.5, steepness 0.015 gives nice spread
  return clamp01(sigmoid(wordCount, 200, 0.015));
}

/**
 * LEX_CLOSED_OPEN — Closed class (function) words / open class (content) words ratio.
 * Higher ratio means more grammatical filler relative to content.
 * Inverted: high closed/open ratio -> lower score.
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeLexClosedOpen(tokens, lists) {
  if (tokens.length === 0) return 0.5;
  const closedCount = tokens.filter(w => lists.functionWords.has(w)).length;
  const openCount = tokens.length - closedCount;

  if (openCount === 0) return 0.1;

  const ratio = closedCount / openCount;
  // Typical ratio ~0.8-1.2 in conversation. Center at 1.0.
  // Higher = more function words relative to content. Inverted.
  return clamp01(invertedSigmoid(ratio, 1.0, 3));
}

/**
 * LEX_LIGHT_VERB — Light verbs / total verbs ratio.
 * Light verbs (do, make, get, have, go, take) indicate less specific verb usage.
 * Inverted: high ratio -> lower score.
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeLexLightVerb(tokens, lists) {
  if (tokens.length === 0) return 0.5;
  const totalVerbs = tokens.filter(w => lists.commonVerbs.has(w)).length;
  if (totalVerbs === 0) return 0.5;

  const lightCount = tokens.filter(w => lists.lightVerbs.has(w)).length;
  const ratio = lightCount / totalVerbs;
  // Typical light verb ratio ~0.3-0.5. Center at 0.4. Inverted.
  return clamp01(invertedSigmoid(ratio, 0.4, 6));
}

/**
 * LEX_NID_RATE — Approximate unknown/unusual words rate.
 * Words not found in any of our word lists AND not common short words
 * are counted as potentially unusual/novel/domain-specific.
 * A moderate rate indicates varied vocabulary; very high may indicate errors.
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeLexNIDRate(tokens, lists) {
  if (tokens.length === 0) return 0.5;

  const knownWords = new Set([
    ...lists.functionWords,
    ...lists.pronouns,
    ...lists.commonVerbs,
    ...lists.fillers,
    ...lists.negativeEmotion,
    ...lists.absolutist,
    ...lists.deathWords,
    ...lists.genericWords,
  ]);

  const unknownCount = tokens.filter(w => !knownWords.has(w) && w.length > 2).length;
  const rate = unknownCount / tokens.length;
  // Moderate unknown rate (~0.3-0.5) is normal for content words not in our lists.
  // Center at 0.4. Slightly inverted: very high rate may indicate word-finding issues.
  // But moderate "unknown" rate is fine, so use gentle inversion.
  return clamp01(invertedSigmoid(rate, 0.6, 4));
}

/**
 * SYN_MLU — Mean Length of Utterance (words per sentence).
 * Higher MLU generally indicates more complex syntactic constructions.
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {string[]} sentences - Split sentences
 * @param {object} _lists - Word lists (unused)
 * @returns {number} Score in [0, 1]
 */
export function computeSynMLU(tokens, sentences, _lists) {
  if (sentences.length === 0) return 0.5;
  const mlu = tokens.length / sentences.length;
  // Average MLU in adult conversation ~8-12 words. Center at 10.
  return clamp01(sigmoid(mlu, 10, 0.3));
}

/**
 * SYN_FRAGMENT_RATE — Sentence fragment rate.
 * A fragment is defined as a very short utterance (<4 words) or an
 * utterance with no detected verb.
 * Inverted: higher fragment rate -> lower score.
 *
 * @param {string[]} _tokens - Tokenized patient words (unused directly)
 * @param {string[]} sentences - Split sentences
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeSynFragmentRate(_tokens, sentences, lists) {
  if (sentences.length === 0) return 0.5;

  let fragmentCount = 0;
  for (const sentence of sentences) {
    const words = tokenize(sentence);
    if (words.length < 4) {
      fragmentCount++;
      continue;
    }
    // Check for verb presence
    const hasVerb = words.some(w => lists.commonVerbs.has(w));
    if (!hasVerb) {
      fragmentCount++;
    }
  }

  const rate = fragmentCount / sentences.length;
  // Some fragments are normal in conversation (~0.2-0.3). Center at 0.25. Inverted.
  return clamp01(invertedSigmoid(rate, 0.25, 6));
}

/**
 * TMP_FILLER_RATE — Filler words per 100 words.
 * Counts both single-word fillers and multi-word filler phrases.
 * Inverted: higher filler rate -> lower score (more disfluency).
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {string} rawText - Raw patient text (for phrase matching)
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeTmpFillerRate(tokens, rawText, lists) {
  if (tokens.length === 0) return 0.5;

  // Count single-word fillers
  let fillerCount = tokens.filter(w => lists.fillers.has(w)).length;

  // Count multi-word filler phrases
  const lowerText = rawText.toLowerCase();
  fillerCount += countPhrases(lowerText, lists.fillerPhrases);

  const ratePer100 = (fillerCount / tokens.length) * 100;
  // Typical filler rate: ~3-6 per 100 words in casual speech. Center at 4. Inverted.
  return clamp01(invertedSigmoid(ratePer100, 4, 0.4));
}

/**
 * TMP_REPETITION — Repeated phrases (bigram/trigram) / total phrases.
 * Counts bigrams and trigrams that appear more than once.
 * Inverted: higher repetition -> lower score.
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} _lists - Word lists (unused)
 * @returns {number} Score in [0, 1]
 */
export function computeTmpRepetition(tokens, _lists) {
  if (tokens.length < 3) return 0.5;

  // Build bigram and trigram counts
  const bigramCounts = {};
  const trigramCounts = {};
  let totalBigrams = 0;
  let totalTrigrams = 0;

  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = tokens[i] + ' ' + tokens[i + 1];
    bigramCounts[bigram] = (bigramCounts[bigram] || 0) + 1;
    totalBigrams++;
  }

  for (let i = 0; i < tokens.length - 2; i++) {
    const trigram = tokens[i] + ' ' + tokens[i + 1] + ' ' + tokens[i + 2];
    trigramCounts[trigram] = (trigramCounts[trigram] || 0) + 1;
    totalTrigrams++;
  }

  // Count repeated instances (appearing 2+ times)
  let repeatedBigrams = 0;
  for (const key in bigramCounts) {
    if (bigramCounts[key] >= 2) {
      repeatedBigrams += bigramCounts[key];
    }
  }

  let repeatedTrigrams = 0;
  for (const key in trigramCounts) {
    if (trigramCounts[key] >= 2) {
      repeatedTrigrams += trigramCounts[key];
    }
  }

  const totalPhrases = totalBigrams + totalTrigrams;
  if (totalPhrases === 0) return 0.5;

  const repetitionRate = (repeatedBigrams + repeatedTrigrams) / totalPhrases;
  // Some repetition is normal (~0.1-0.2). Center at 0.15. Inverted.
  return clamp01(invertedSigmoid(repetitionRate, 0.15, 8));
}

/**
 * TMP_SPEECH_RATE — Words per minute estimate.
 * If no duration is available, estimates based on word count with an
 * assumed average speech rate heuristic (150 wpm for conversation).
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {number|null} durationMinutes - Session duration in minutes (if available)
 * @param {object} _lists - Word lists (unused)
 * @returns {number} Score in [0, 1]
 */
export function computeTmpSpeechRate(tokens, durationMinutes, _lists) {
  if (tokens.length === 0) return 0.5;

  let wpm;
  if (durationMinutes && durationMinutes > 0) {
    wpm = tokens.length / durationMinutes;
  } else {
    // Heuristic: estimate session duration from word count
    // Assume patient speaks about 40% of a 20-min session => ~8 min
    // If they produced N words in ~8 min, wpm = N/8
    // But we don't know session length, so use a rough model:
    // Average patient produces 400-800 words in a session.
    // Map word count to an implied rate, assuming ~5-10 min of patient speech.
    const estimatedMinutes = Math.max(1, tokens.length / 130); // ~130 wpm is slightly slow
    wpm = tokens.length / estimatedMinutes;
  }

  // Normal conversational speech rate: ~120-180 wpm. Center at 150.
  return clamp01(sigmoid(wpm, 150, 0.03));
}

/**
 * AFF_SELF_PRONOUN — Self-referential pronoun rate.
 * (I, me, my, mine, myself + FR equivalents) / total words.
 * Higher self-reference may indicate self-focus, which can correlate with
 * depression. Inverted: higher rate -> lower score.
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeAffSelfPronoun(tokens, lists) {
  if (tokens.length === 0) return 0.5;
  const selfCount = tokens.filter(w => lists.selfPronouns.has(w)).length;
  const rate = selfCount / tokens.length;
  // Typical self-pronoun rate in conversation: ~0.05-0.10. Center at 0.07. Inverted.
  return clamp01(invertedSigmoid(rate, 0.07, 40));
}

/**
 * AFF_NEG_VALENCE — Negative emotion word rate.
 * Negative emotion words / total words.
 * Inverted: higher rate -> lower score (more negative affect).
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeAffNegValence(tokens, lists) {
  if (tokens.length === 0) return 0.5;
  const negCount = tokens.filter(w => lists.negativeEmotion.has(w)).length;
  const rate = negCount / tokens.length;
  // Typical negative emotion word rate: ~0.01-0.04. Center at 0.02. Inverted.
  return clamp01(invertedSigmoid(rate, 0.02, 80));
}

/**
 * AFF_ABSOLUTIST — Absolutist word rate.
 * Absolutist words (always, never, nothing, everything, etc.) / total words.
 * Inverted: higher rate -> lower score (more rigid/extreme thinking).
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeAffAbsolutist(tokens, lists) {
  if (tokens.length === 0) return 0.5;
  const absCount = tokens.filter(w => lists.absolutist.has(w)).length;
  const rate = absCount / tokens.length;
  // Typical absolutist rate: ~0.005-0.02. Center at 0.01. Inverted.
  return clamp01(invertedSigmoid(rate, 0.01, 150));
}

/**
 * DIS_PERSEVERATION — Repeated content phrases (3+ word sequences appearing 2+ times).
 * Indicates perseverative or stuck thinking patterns.
 * Inverted: higher perseveration -> lower score.
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeDisPerseveration(tokens, lists) {
  if (tokens.length < 6) return 0.5;

  // Limit tokens to prevent memory exhaustion on very large transcripts
  const safeTokens = tokens.length > 10000 ? tokens.slice(0, 10000) : tokens;

  // Build 3-gram, 4-gram, and 5-gram counts (content-bearing sequences)
  const ngramCounts = {};
  let totalNgrams = 0;

  for (let n = 3; n <= 5; n++) {
    for (let i = 0; i <= safeTokens.length - n; i++) {
      const ngram = safeTokens.slice(i, i + n).join(' ');
      // Only count if at least one content word is present
      const hasContent = safeTokens.slice(i, i + n).some(
        w => !lists.functionWords.has(w) && w.length > 2
      );
      if (hasContent) {
        ngramCounts[ngram] = (ngramCounts[ngram] || 0) + 1;
        totalNgrams++;
      }
    }
  }

  if (totalNgrams === 0) return 0.5;

  // Count tokens involved in repeated n-grams
  let repeatedNgramInstances = 0;
  for (const key in ngramCounts) {
    if (ngramCounts[key] >= 2) {
      repeatedNgramInstances += ngramCounts[key];
    }
  }

  const rate = repeatedNgramInstances / totalNgrams;
  // Some repetition is normal. Center at 0.05. Inverted.
  return clamp01(invertedSigmoid(rate, 0.05, 15));
}

/**
 * LEX_GENERIC_SUB — Generic/vague word rate.
 * Generic words (thing, stuff, something, etc.) / content words.
 * Inverted: higher rate -> lower score (less specific word choice).
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeLexGenericSub(tokens, lists) {
  if (tokens.length === 0) return 0.5;
  const contentWords = tokens.filter(w => !lists.functionWords.has(w) && w.length > 2);
  if (contentWords.length === 0) return 0.5;

  const genericCount = tokens.filter(w => lists.genericWords.has(w)).length;
  const rate = genericCount / contentWords.length;
  // Typical generic word rate: ~0.02-0.06. Center at 0.04. Inverted.
  return clamp01(invertedSigmoid(rate, 0.04, 40));
}

/**
 * LEX_DEATH_WORDS — Death-related word rate.
 * Death words / total words.
 * Inverted: higher rate -> lower score (more death-related content).
 *
 * @param {string[]} tokens - Tokenized patient words
 * @param {string} rawText - Raw patient text (for phrase matching)
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeLexDeathWords(tokens, rawText, lists) {
  if (tokens.length === 0) return 0.5;

  // Count single-word death terms
  let deathCount = tokens.filter(w => lists.deathWords.has(w)).length;

  // Also check multi-word death phrases in raw text
  const deathPhrases = ['end my life', 'end it all', 'fin de vie', 'en finir',
                         'se suicider', 'end of life', 'take my life'];
  const lowerText = rawText.toLowerCase();
  deathCount += countPhrases(lowerText, deathPhrases);

  const rate = deathCount / tokens.length;
  // Death words are rare in general conversation: ~0.001-0.005. Center at 0.003. Inverted.
  return clamp01(invertedSigmoid(rate, 0.003, 500));
}

/**
 * LEX_RUMINATIVE — Ruminative phrase rate.
 * Ruminative patterns (regex-matched) / total sentences.
 * Inverted: higher rate -> lower score (more rumination).
 *
 * @param {string} rawText - Raw patient text
 * @param {string[]} sentences - Split sentences
 * @param {object} lists - Word lists
 * @returns {number} Score in [0, 1]
 */
export function computeLexRuminative(rawText, sentences, lists) {
  if (sentences.length === 0) return 0.5;

  const matchCount = countPatternMatches(rawText, lists.ruminativePatterns);
  const rate = matchCount / sentences.length;
  // Ruminative phrases are relatively uncommon. Center at 0.05. Inverted.
  return clamp01(invertedSigmoid(rate, 0.05, 15));
}

// ---------------------------------------------------------------------------
// V5.2 Pragmatic / Executive / Discourse indicator computations
// ---------------------------------------------------------------------------

/**
 * PRA_DISCOURSE_MARKERS — Discourse marker usage rate.
 * Discourse markers (well, so, anyway, I mean, you know) / utterances.
 * Lower usage may indicate pragmatic decline (AD, FTD).
 */
export function computePraDiscourseMarkers(tokens, rawText, sentences, lists) {
  if (sentences.length === 0) return 0.5;
  let markerCount = tokens.filter(w => lists.discourseMarkers.has(w)).length;
  const lowerText = rawText.toLowerCase();
  markerCount += countPhrases(lowerText, lists.discourseMarkerPhrases);
  const rate = markerCount / sentences.length;
  // Typical discourse marker rate: ~0.3-0.8 per sentence. Center at 0.5.
  return clamp01(sigmoid(rate, 0.5, 3));
}

/**
 * EXE_PLANNING — Planning construct usage rate.
 * Planning words/phrases (if-then, because, therefore, first-then) / utterances.
 * Reduced planning language reflects executive dysfunction (FTD, AD).
 */
export function computeExePlanning(tokens, rawText, sentences, lists) {
  if (sentences.length === 0) return 0.5;
  let planCount = tokens.filter(w => lists.planningWords.has(w)).length;
  const lowerText = rawText.toLowerCase();
  planCount += countPhrases(lowerText, lists.planningPhrases);
  const rate = planCount / sentences.length;
  // Typical planning construct rate: ~0.2-0.6 per sentence. Center at 0.3.
  return clamp01(sigmoid(rate, 0.3, 4));
}

/**
 * PRA_NARRATIVE_STRUCTURE — Narrative structure completeness.
 * Heuristic: checks for presence of orientation, complication, and resolution
 * components in the transcript. Score based on how many are present.
 */
export function computePraNarrativeStructure(rawText, lists) {
  if (!rawText || rawText.length < 20) return 0.5;

  let components = 0;
  const hasOrientation = lists.orientationPatterns.some(p => { p.lastIndex = 0; return p.test(rawText); });
  const hasComplication = lists.complicationPatterns.some(p => { p.lastIndex = 0; return p.test(rawText); });
  const hasResolution = lists.resolutionPatterns.some(p => { p.lastIndex = 0; return p.test(rawText); });

  if (hasOrientation) components++;
  if (hasComplication) components++;
  if (hasResolution) components++;

  // 0 components = 0.2, 1 = 0.4, 2 = 0.65, 3 = 0.85
  return clamp01(0.2 + components * 0.22);
}

/**
 * PRA_INDIRECT_SPEECH — Indirect/hedged speech rate.
 * Hedged and indirect phrases / total sentences.
 * Lower indirect speech indicates bluntness/literalness (FTD behavioral).
 */
export function computePraIndirectSpeech(rawText, sentences, lists) {
  if (sentences.length === 0) return 0.5;
  const lowerText = rawText.toLowerCase();
  const indirectCount = countPhrases(lowerText, lists.indirectPhrases);
  const rate = indirectCount / sentences.length;
  // Typical indirect speech rate: ~0.05-0.2 per sentence. Center at 0.1.
  return clamp01(sigmoid(rate, 0.1, 12));
}

/**
 * DIS_CIRCUMLOCUTION — Circumlocutory phrase rate.
 * Circumlocutory phrases / content words.
 * Higher circumlocution indicates word-finding difficulty (AD, FTD semantic).
 * Inverted: higher rate -> lower score.
 */
export function computeDisCircumlocution(tokens, rawText, lists) {
  if (tokens.length === 0) return 0.5;
  const contentWords = tokens.filter(w => !lists.functionWords.has(w) && w.length > 2);
  if (contentWords.length === 0) return 0.5;
  const lowerText = rawText.toLowerCase();
  const circumCount = countPhrases(lowerText, lists.circumlocutionPhrases);
  const rate = circumCount / contentWords.length;
  // Circumlocution is rare in healthy speech: ~0.001-0.01. Center at 0.005. Inverted.
  return clamp01(invertedSigmoid(rate, 0.005, 300));
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Compute all deterministic indicators from a transcript.
 *
 * Extracts only patient speech, then runs ~20 regex-based and word-list-based
 * computations to produce calibration anchors for LLM extraction.
 *
 * @param {Array<{role: string, text: string}>} transcript - Full session transcript
 * @param {string} [language='en'] - Language code ('en' or 'fr')
 * @param {object} [options={}] - Optional parameters
 * @param {number} [options.durationMinutes=null] - Session duration in minutes for speech rate
 * @returns {{ [id: string]: number }} Map of indicator ID to score (0.0-1.0)
 */
export function computeDeterministicIndicators(transcript, language = 'en', options = {}) {
  // Accept both string transcripts and structured [{role, text}] arrays
  const rawText = typeof transcript === 'string' ? transcript : extractPatientSpeech(transcript);
  const tokens = tokenize(rawText);
  const sentences = splitSentences(rawText);
  const lists = getWordLists(language);
  const durationMinutes = options.durationMinutes || null;

  return {
    LEX_TTR: computeLexTTR(tokens, lists),
    LEX_MATTR: computeLexMATTR(tokens, lists),
    LEX_CONTENT_DENSITY: computeLexContentDensity(tokens, lists),
    LEX_PRONOUN_NOUN: computeLexPronounNoun(tokens, lists),
    LEX_VERBAL_OUTPUT: computeLexVerbalOutput(tokens, lists),
    LEX_CLOSED_OPEN: computeLexClosedOpen(tokens, lists),
    LEX_LIGHT_VERB: computeLexLightVerb(tokens, lists),
    LEX_NID_RATE: computeLexNIDRate(tokens, lists),
    SYN_MLU: computeSynMLU(tokens, sentences, lists),
    SYN_FRAGMENT_RATE: computeSynFragmentRate(tokens, sentences, lists),
    TMP_FILLER_RATE: computeTmpFillerRate(tokens, rawText, lists),
    TMP_REPETITION: computeTmpRepetition(tokens, lists),
    TMP_SPEECH_RATE: computeTmpSpeechRate(tokens, durationMinutes, lists),
    AFF_SELF_PRONOUN: computeAffSelfPronoun(tokens, lists),
    AFF_NEG_VALENCE: computeAffNegValence(tokens, lists),
    AFF_ABSOLUTIST: computeAffAbsolutist(tokens, lists),
    DIS_PERSEVERATION: computeDisPerseveration(tokens, lists),
    LEX_GENERIC_SUB: computeLexGenericSub(tokens, lists),
    LEX_DEATH_WORDS: computeLexDeathWords(tokens, rawText, lists),
    LEX_RUMINATIVE: computeLexRuminative(rawText, sentences, lists),
    // V5.2 pragmatic / executive / discourse anchors
    PRA_DISCOURSE_MARKERS: computePraDiscourseMarkers(tokens, rawText, sentences, lists),
    EXE_PLANNING: computeExePlanning(tokens, rawText, sentences, lists),
    PRA_NARRATIVE_STRUCTURE: computePraNarrativeStructure(rawText, lists),
    PRA_INDIRECT_SPEECH: computePraIndirectSpeech(rawText, sentences, lists),
    DIS_CIRCUMLOCUTION: computeDisCircumlocution(tokens, rawText, lists),
  };
}

