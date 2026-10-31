/** Daily card sets share one study theme, like N4-Go grouping words around the day's grammar. */

export const THEME_PLAN_VERSION = 1

export const VOCAB_THEMES = [
  {
    id: 'research',
    label: '研究與證據',
    related: ['science', 'writing', 'tech'],
    words: [
      'analyze', 'assess', 'assume', 'data', 'define', 'derive', 'estimate', 'evident',
      'factor', 'identify', 'indicate', 'interpret', 'method', 'research', 'source',
      'specific', 'theory', 'conclude', 'evaluate', 'obtain', 'perceive', 'survey',
      'criteria', 'deduce', 'demonstrate', 'imply', 'instance', 'justify', 'outcome',
      'rely', 'specify', 'valid', 'hypothesis', 'investigate', 'predict', 'statistic',
      'accurate', 'cite', 'infer', 'presume', 'reveal', 'confirm', 'empirical',
      'phenomenon', 'detect', 'highlight', 'inspect', 'random', 'insight', 'evidence',
      'observation', 'variable', 'sample', 'inference', 'assumption', 'validity',
      'reliability', 'accuracy', 'precision', 'correlation', 'causation', 'pattern',
      'analysis', 'evaluation', 'abstract', 'explicit', 'trace', 'definite',
      'unique', 'clarify', 'denote', 'deviate', 'implicit', 'analogy',
      'anticipate', 'compile', 'conceive', 'encounter', 'paradigm', 'ambiguous',
    ],
  },
  {
    id: 'writing',
    label: '學術寫作',
    related: ['research', 'campus', 'logic'],
    words: [
      'approach', 'concept', 'context', 'create', 'section', 'structure', 'chapter',
      'comment', 'document', 'emphasis', 'framework', 'illustrate', 'publish',
      'text', 'draft', 'clause', 'edit', 'author', 'quote', 'thesis', 'topic',
      'paragraph', 'appendix', 'revise', 'theme', 'format', 'coherent', 'straightforward',
      'essay', 'sentence', 'detail', 'support', 'argument', 'claim', 'statement',
      'introduction', 'conclusion', 'body', 'citation', 'quotation', 'paraphrase',
      'synthesis', 'outline', 'overview', 'description', 'explanation', 'definition',
      'illustration', 'persuasion', 'narration', 'implication', 'recommendation',
      'suggestion', 'limitation', 'weakness', 'strength', 'objectivity', 'subjectivity',
      'summary', 'attach', 'domain', 'scope', 'direction',
    ],
  },
  {
    id: 'campus',
    label: '校園與課程',
    related: ['writing', 'people', 'admin'],
    words: [
      'available', 'require', 'task', 'access', 'goal', 'project', 'academy',
      'challenge', 'enable', 'grade', 'instruct', 'lecture', 'university', 'college',
      'student', 'teacher', 'professor', 'classroom', 'homework', 'exam', 'campus',
      'library', 'textbook', 'assignment', 'deadline', 'presentation', 'discussion',
      'question', 'answer', 'choice', 'instruction', 'requirement', 'syllabus',
      'seminar', 'workshop', 'conference', 'symposium', 'dissertation',
      'undergraduate', 'postgraduate', 'faculty', 'advisor', 'mentor', 'schedule',
      'submit', 'successor',
    ],
  },
  {
    id: 'science',
    label: '科學方法',
    related: ['research', 'tech', 'biology'],
    words: [
      'formula', 'function', 'process', 'consist', 'constitute', 'complex', 'compute',
      'conduct', 'element', 'equate', 'feature', 'normal', 'range', 'relevant',
      'component', 'constant', 'core', 'layer', 'link', 'locate', 'technical',
      'technique', 'technology', 'adequate', 'approximate', 'cycle', 'dimension',
      'mechanism', 'output', 'overall', 'parallel', 'parameter', 'phase', 'series',
      'adjust', 'alter', 'compound', 'discrete', 'equivalent', 'precise', 'ratio',
      'simulate', 'device', 'science', 'scientist', 'experiment', 'laboratory',
      'measurement', 'classification', 'distribution', 'frequency', 'average',
      'percentage', 'comparison', 'exception', 'condition', 'criterion', 'standard',
      'benchmark', 'baseline', 'attribute', 'error', 'interval', 'couple',
      'differentiate', 'dispose',
    ],
  },
  {
    id: 'climate',
    label: '氣候與環境',
    related: ['earth', 'energy', 'biology'],
    words: [
      'environment', 'area', 'region', 'resource', 'restrict', 'site', 'sustain',
      'globe', 'climate', 'weather', 'temperature', 'forest', 'ocean', 'river',
      'mountain', 'air', 'soil', 'pollution', 'waste', 'recycle', 'conservation',
      'wildlife', 'habitat', 'drought', 'season', 'flood', 'storm', 'hurricane',
    ],
  },
  {
    id: 'earth',
    label: '地球與太空',
    related: ['climate', 'energy', 'science'],
    words: [
      'occur', 'period', 'shift', 'volume', 'emerge', 'expand', 'expose', 'external',
      'evolve', 'earthquake', 'volcano', 'century', 'ancient', 'modern', 'space',
      'planet', 'star', 'satellite', 'gravity', 'exploration', 'discovery',
    ],
  },
  {
    id: 'energy',
    label: '能源與物質',
    related: ['climate', 'tech', 'science'],
    words: [
      'export', 'distribute', 'consume', 'energy', 'chemical', 'convert', 'extract',
      'nuclear', 'electricity', 'fuel', 'oil', 'gas', 'carbon', 'oxygen', 'water',
      'generate',
    ],
  },
  {
    id: 'biology',
    label: '生物與演化',
    related: ['climate', 'health', 'science'],
    words: [
      'species', 'animal', 'plant', 'agriculture', 'farmer', 'crop', 'harvest',
      'evolution', 'gene', 'cell', 'brain', 'heart', 'blood', 'bone', 'muscle',
      'skin', 'virus', 'bacteria', 'vaccine', 'generation', 'physical', 'sex',
    ],
  },
  {
    id: 'economy',
    label: '經濟與市場',
    related: ['work', 'gov', 'quantity'],
    words: [
      'economy', 'benefit', 'contract', 'finance', 'income', 'labor', 'percent',
      'sector', 'invest', 'purchase', 'credit', 'compensate', 'contribute',
      'corporate', 'fund', 'maximize', 'minor', 'proportion', 'annual',
      'domestic', 'grant', 'revenue', 'fee', 'incentive', 'subsidy', 'currency',
      'commodity', 'levy', 'tax', 'trade', 'market', 'price', 'cost', 'profit',
      'company', 'business',
    ],
  },
  {
    id: 'work',
    label: '工作與產業',
    related: ['economy', 'campus', 'people'],
    words: [
      'establish', 'role', 'achieve', 'acquire', 'administrate', 'assist',
      'commission', 'construct', 'institute', 'maintain', 'participate', 'strategy',
      'transfer', 'coordinate', 'partner', 'professional', 'promote', 'undertake',
      'capacity', 'consult', 'facilitate', 'pursue', 'assign', 'cooperate',
      'expert', 'initiate', 'practitioner', 'colleague', 'industry', 'factory',
      'machine', 'worker', 'job', 'career', 'salary', 'unemployment',
    ],
  },
  {
    id: 'gov',
    label: '政府與法律',
    related: ['economy', 'society', 'logic'],
    words: [
      'authority', 'policy', 'principle', 'legal', 'legislate', 'issue', 'major',
      'regulate', 'secure', 'consent', 'constrain', 'convene', 'dominate',
      'exclude', 'civil', 'code', 'impose', 'regime', 'resolve', 'amend',
      'enforce', 'entity', 'licence', 'federal', 'ministry', 'prohibit', 'advocate',
      'hierarchy', 'ideology', 'welfare', 'government', 'law', 'court', 'crime',
      'police', 'election', 'vote', 'president', 'citizen',
    ],
  },
  {
    id: 'health',
    label: '健康與醫療',
    related: ['biology', 'people', 'science'],
    words: [
      'affect', 'injure', 'recover', 'medical', 'mental', 'monitor', 'stress',
      'adult', 'aid', 'isolate', 'hospital', 'doctor', 'patient', 'disease',
      'medicine', 'treatment', 'health', 'food', 'diet', 'nutrition', 'exercise',
      'sport',
    ],
  },
  {
    id: 'tech',
    label: '科技與數據',
    related: ['science', 'research', 'media'],
    words: [
      'design', 'item', 'select', 'network', 'implement',
      'integrate', 'internal', 'input', 'index', 'utilize', 'channel', 'innovate',
      'insert', 'transmit', 'automatically', 'chart', 'manipulate', 'virtual',
      'visual', 'computer', 'internet', 'invention', 'enhance', 'equip', 'mode',
    ],
  },
  {
    id: 'society',
    label: '社會與文化',
    related: ['gov', 'people', 'media'],
    words: [
      'community', 'culture', 'tradition', 'immigrate', 'interact', 'ethnic',
      'status', 'liberal', 'perspective', 'style', 'symbol', 'diversity',
      'gender', 'migrate', 'overseas', 'classic', 'media', 'society',
      'history', 'language', 'population', 'philosophy', 'ethic',
    ],
  },
  {
    id: 'city',
    label: '城市與交通',
    related: ['economy', 'climate', 'work'],
    words: [
      'reside', 'occupy', 'estate', 'transit', 'transport', 'vehicle',
      'via', 'infrastructure', 'accommodate', 'adjacent', 'city', 'urban', 'rural',
      'traffic', 'transportation', 'airplane', 'train', 'tourism', 'travel',
      'hotel', 'restaurant',
    ],
  },
  {
    id: 'media',
    label: '媒體與藝術',
    related: ['society', 'writing', 'campus'],
    words: [
      'journal', 'display', 'image', 'publication', 'release', 'exhibit', 'drama',
      'tape', 'panel', 'article', 'newspaper', 'magazine', 'writer', 'reader',
      'audience', 'speech', 'music', 'art', 'film', 'museum',
    ],
  },
  {
    id: 'logic',
    label: '邏輯與連接',
    related: ['writing', 'quantity', 'process'],
    words: [
      'although', 'however', 'therefore', 'because', 'while', 'instead', 'besides',
      'moreover', 'meanwhile', 'otherwise', 'unless', 'whether', 'hence', 'despite',
      'whereas', 'furthermore', 'nevertheless', 'contrary', 'albeit', 'likewise',
      'nonetheless', 'thereby', 'whereby', 'logic',
    ],
  },
  {
    id: 'quantity',
    label: '數量與比較',
    related: ['logic', 'science', 'research'],
    words: [
      'similar', 'significant', 'vary', 'aspect', 'category', 'distinct', 'final',
      'primary', 'considerable', 'sufficient', 'apparent', 'sum', 'aggregate',
      'allocate', 'minimum', 'finite', 'identical', 'sole', 'somewhat', 'plus',
      'odd', 'enough', 'several', 'various', 'numerous', 'common', 'important',
      'different', 'possible', 'necessary', 'difficult', 'large', 'small',
      'high', 'low', 'early', 'late', 'often', 'always', 'never', 'usually',
      'probably', 'perhaps', 'visible', 'uniform', 'widespread',
      'crucial', 'intense', 'margin',
    ],
  },
  {
    id: 'process',
    label: '過程與變化',
    related: ['science', 'logic', 'work'],
    words: [
      'proceed', 'respond', 'consequent', 'previous', 'alternative', 'circumstance',
      'correspond', 'ensure', 'initial', 'sequence', 'concentrate', 'confer',
      'prior', 'retain', 'subsequent', 'modify', 'decline', 'transform',
      'underlie', 'adapt', 'eliminate', 'reverse', 'accumulate', 'displace',
      'eventual', 'fluctuate', 'induce', 'inevitable', 'offset', 'restore',
      'terminate', 'cease', 'commence', 'diminish', 'duration', 'erode',
      'persist', 'undergo', 'collapse', 'forthcoming', 'cause', 'effect',
      'result', 'solution', 'problem', 'reason', 'advantage', 'disadvantage',
      'impact', 'react', 'remove', 'contrast', 'dynamic', 'priority', 'ultimate',
      'tense', 'ongoing', 'tendency', 'chronology',
    ],
  },
  {
    id: 'people',
    label: '人物與態度',
    related: ['campus', 'society', 'health'],
    words: [
      'individual', 'involve', 'appropriate', 'positive', 'potential', 'seek',
      'attitude', 'commit', 'communicate', 'debate', 'option', 'principal',
      'aware', 'conflict', 'contact', 'notion', 'objective', 'orient',
      'psychology', 'reject', 'stable', 'substitute', 'target', 'trend',
      'version', 'capable', 'ignorant', 'intelligence', 'motive', 'neutral',
      'rational', 'comprehensive', 'deny', 'guarantee', 'voluntary', 'appreciate',
      'assure', 'behalf', 'convince', 'depress', 'incline', 'reluctance',
      'agree', 'disagree', 'compare', 'opinion', 'example',
      'conversation', 'announcement', 'reservation', 'appointment',
      'focus', 'negate', 'acknowledge', 'brief', 'flexible', 'abandon',
      'accompany', 'arbitrary', 'bias',
    ],
  },
  {
    id: 'admin',
    label: '制度與文件',
    related: ['campus', 'gov', 'work'],
    words: [
      'register', 'scheme', 'file', 'foundation', 'founded', 'guideline',
      'conform', 'compatible', 'concurrent', 'confine', 'controversy',
      'integrity', 'invoke', 'pose', 'assemble', 'bond', 'discriminate',
      'incidence', 'incorporate', 'inhibit', 'precede', 'comprise', 'decade',
      'intervene', 'complement', 'contemporary', 'contradict', 'exploit',
      'minimize', 'predominant', 'prospect', 'radical', 'reinforce',
      'attain', 'coincide', 'converse', 'devote', 'distort', 'inherent',
      'intrinsic', 'implicate', 'fundamental', 'prime', 'exceed',
    ],
  },
]

export const THEME_BY_ID = Object.fromEntries(VOCAB_THEMES.map((theme) => [theme.id, theme]))

const wordThemeEntries = []
for (const theme of VOCAB_THEMES) {
  for (const word of theme.words) {
    wordThemeEntries.push([word.toLowerCase(), theme])
  }
}

export const THEME_BY_WORD = Object.fromEntries(wordThemeEntries)

export function themeForCard(card) {
  if (!card) return VOCAB_THEMES[0]
  if (card.theme && THEME_BY_ID[card.theme]) return THEME_BY_ID[card.theme]
  const fromWord = THEME_BY_WORD[String(card.word || '').toLowerCase()]
  if (fromWord) return fromWord
  return VOCAB_THEMES[0]
}

export function cardsForTheme(theme, pool) {
  const id = typeof theme === 'string' ? theme : theme?.id
  return (pool || []).filter((card) => themeForCard(card).id === id)
}
