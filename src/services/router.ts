import { IntentCategory, VisualType } from "../types.js";

export interface RouteAnalysis {
  intent: IntentCategory;
  isImageGeneration: boolean;
  cleanImagePrompt?: string;
  isVisualExplanation: boolean;
  visualType?: VisualType;
  visualSubject?: string;
  isMathOrReasoning: boolean;
  isCoding: boolean;
  isWebSearch: boolean;
  language: 'km' | 'en' | 'mixed';
  systemDirective: string;
}

export function detectLanguage(text: string): 'km' | 'en' | 'mixed' {
  const khmerRegex = /[\u1780-\u17FF\u19E0-\u19FF]/;
  const englishRegex = /[a-zA-Z]/;
  
  const hasKhmer = khmerRegex.test(text);
  const hasEnglish = englishRegex.test(text);

  if (hasKhmer && hasEnglish) return 'mixed';
  if (hasKhmer) return 'km';
  return 'en';
}

/**
 * Clean up leading trigger words to obtain the pure visual prompt for artistic image generation
 */
function cleanPrompt(text: string): string {
  return text
    .replace(/^(?:សូម\s*)?(?:ជួយ\s*)?(?:បង្កើត|គូរ|ធ្វើ|ឌីហ្សាញ|សុំ|ចង់បាន)(?:រូបភាព|រូបថត|រូបគំនូរ|រូបភាពបែប|រូប)?(?:\s+នៃ|\s+ពី|\s+ឱ្យ|ឲ្យ|\s+មួយ)?\s*/i, "")
    .replace(/^(?:please\s+)?(?:generate|create|draw|render|make|paint|illustrate|design)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing|artwork|poster|render)\s+(?:of|showing|depicting)?\s*/i, "")
    .replace(/^(?:a\s+)?(?:photo|picture|drawing|illustration|render|painting)\s+(?:of|showing|depicting)\s*/i, "")
    .trim() || text.trim();
}

/**
 * Intelligent Visual Explanation Detection
 * Evaluates whether a visual diagram, flowchart, architecture model, or scientific illustration
 * will significantly clarify the explanation.
 */
export function analyzeVisualExplanationIntent(prompt: string): {
  wantsVisual: boolean;
  visualType?: VisualType;
  visualSubject?: string;
} {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();

  // Exclude trivial / simple factual lookup queries
  const trivialRegex = /^(?:hi|hello|hey|សួស្តី|ជំរាបសួរ|អរគុណ|thanks|thank you|ok|okay|bye|លាហើយ|តើ\s*\d+\s*[\+\-\*\/]\s*\d+\s*=\s*(?:ប៉ុន្មាន|\?)|^\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\??)$/i;
  if (trivialRegex.test(lower)) {
    return { wantsVisual: false };
  }

  // 1. Explicit visual request keywords in Khmer & English
  const explicitVisualKeywords = [
    'គំនូសបំព្រួញ', 'ដ្យាក្រាម', 'គំនូសតាង', 'ដ្យាក្រាមលំហូរ', 'រចនាសម្ព័ន្ធ', 'ស្ថាបត្យកម្ម',
    'ដំណើរការ', 'ដំណាក់កាល', 'រូបភាពពន្យល់', 'គំនូរបង្ហាញ', 'flowchart', 'diagram', 'architecture',
    'infographic', 'visual explanation', 'process diagram', 'timeline', 'workflow', 'concept map',
    'step by step diagram', 'graph', 'schematic'
  ];
  const hasExplicitVisualKeyword = explicitVisualKeywords.some(kw => lower.includes(kw));

  // 2. Explanation / Educational queries
  const isExplanationQuery = 
    lower.includes('ពន្យល់') ||
    lower.includes('របៀប') ||
    lower.includes('ហេតុអ្វី') ||
    lower.includes('ដំណើរការ') ||
    lower.includes('រចនាសម្ព័ន្ធ') ||
    lower.includes('explain') ||
    lower.includes('how does') ||
    lower.includes('how do') ||
    lower.includes('how to') ||
    lower.includes('architecture of') ||
    lower.includes('workflow of') ||
    lower.includes('cycle of') ||
    lower.includes('difference between') ||
    lower.includes('compare');

  // Specific Domain Patterns:

  // A. Mathematics & Geometry (Pythagorean theorem, triangles, circles, coordinate system, quadratic graphs)
  const mathVisualTopics = [
    { regex: /(?:pythagor(?:as|ean)|ពីតាករ|ពីតាហ្គ័រ)/i, subject: 'Pythagorean Theorem', type: 'geometry' as VisualType },
    { regex: /(?:ត្រីកោណ|triangle|trigonometr|sin|cos|tan)/i, subject: 'Geometry / Trigonometry', type: 'geometry' as VisualType },
    { regex: /(?:រង្វង់|circle|radius|diameter|បរិមាត្រ|ក្រឡាផ្ទៃ)/i, subject: 'Circle Geometry', type: 'geometry' as VisualType },
    { regex: /(?:ក្រាប|graph|coordinate|cartesian|parabola|quadratic)/i, subject: 'Mathematical Graph', type: 'chart' as VisualType },
    { regex: /(?:ម៉ាទ្រីស|matrix|vector|វ៉ិចទ័រ)/i, subject: 'Linear Algebra / Vectors', type: 'geometry' as VisualType },
  ];

  for (const item of mathVisualTopics) {
    if (item.regex.test(lower)) {
      return { wantsVisual: true, visualType: item.type, visualSubject: item.subject };
    }
  }

  // B. Science / Biology / Nature / Physics / Geography
  const scienceVisualTopics = [
    { regex: /(?:water cycle|វដ្តទឹក|ទឹកហូរ|វដ្តនៃទឹក)/i, subject: 'Water Cycle', type: 'science' as VisualType },
    { regex: /(?:ភ្លៀង|rain|precipitation|condens|evaporat)/i, subject: 'Rain Formation & Weather', type: 'science' as VisualType },
    { regex: /(?:photosynthesis|រស្មីសំយោគ)/i, subject: 'Photosynthesis Cycle', type: 'science' as VisualType },
    { regex: /(?:បេះដូង|heart|blood circulation|ឈាម)/i, subject: 'Blood Circulation System', type: 'science' as VisualType },
    { regex: /(?:កោសិកា|cell structure|dna|rna)/i, subject: 'Cell Structure / DNA', type: 'science' as VisualType },
    { regex: /(?:អាតូម|atom|electron|proton|neutron)/i, subject: 'Atomic Structure', type: 'science' as VisualType },
    { regex: /(?:solar system|ប្រព័ន្ធព្រះអាទិត្យ|ភព|planet)/i, subject: 'Solar System', type: 'science' as VisualType },
    { regex: /(?:circuit|អគ្គិសនី|electric|resistor|voltage)/i, subject: 'Electrical Circuit', type: 'diagram' as VisualType },
  ];

  for (const item of scienceVisualTopics) {
    if (item.regex.test(lower)) {
      return { wantsVisual: true, visualType: item.type, visualSubject: item.subject };
    }
  }

  // C. Software Architecture, Networking & Web Engineering
  const techVisualTopics = [
    { regex: /(?:frontend.*backend|backend.*frontend|client.*server|web.*app|fullstack)/i, subject: 'Frontend to Backend Architecture', type: 'architecture' as VisualType },
    { regex: /(?:api|rest|graphql|grpc|endpoint|webhook)/i, subject: 'API Architecture & Communication', type: 'architecture' as VisualType },
    { regex: /(?:mvc|model view controller|clean architecture|microservice|monolith)/i, subject: 'Software Architecture Pattern', type: 'architecture' as VisualType },
    { regex: /(?:dns|domain name|ip address|http|https|tcp|udp|osi model|network)/i, subject: 'Network Protocol & Flow', type: 'flowchart' as VisualType },
    { regex: /(?:database|sql|nosql|table relation|erd|foreign key|index)/i, subject: 'Database Schema & Relations', type: 'diagram' as VisualType },
    { regex: /(?:oauth|auth|jwt|login flow|session|token)/i, subject: 'Authentication Flow', type: 'flowchart' as VisualType },
    { regex: /(?:git|branch|merge|rebase|pull request|commit)/i, subject: 'Git Branch Workflow', type: 'timeline' as VisualType },
    { regex: /(?:docker|kubernetes|container|ci\/cd|pipeline)/i, subject: 'DevOps & Container Pipeline', type: 'flowchart' as VisualType },
    { regex: /(?:react lifecycle|vue|state management|redux)/i, subject: 'Component Lifecycle & State Flow', type: 'flowchart' as VisualType },
  ];

  for (const item of techVisualTopics) {
    if (item.regex.test(lower)) {
      return { wantsVisual: true, visualType: item.type, visualSubject: item.subject };
    }
  }

  // D. AI / Machine Learning Concepts
  const aiVisualTopics = [
    { regex: /(?:ai|artificial intelligence|llm|chatgpt|machine learning|deep learning|neural network|transformer)/i, subject: 'AI & Machine Learning Workflow', type: 'concept_map' as VisualType },
  ];

  for (const item of aiVisualTopics) {
    if (item.regex.test(lower) && (isExplanationQuery || hasExplicitVisualKeyword)) {
      return { wantsVisual: true, visualType: item.type, visualSubject: item.subject };
    }
  }

  // E. General Explanations requesting process/stages/structure
  if (isExplanationQuery && (hasExplicitVisualKeyword || lower.includes('step') || lower.includes('ដំណាក់កាល') || lower.includes('វដ្ត') || lower.includes('របៀបដែល'))) {
    return {
      wantsVisual: true,
      visualType: 'process',
      visualSubject: trimmed.slice(0, 40),
    };
  }

  return { wantsVisual: false };
}

export function routeUserRequest(
  prompt: string,
  hasImage: boolean,
  hasDocument: boolean,
  webSearchEnabled: boolean
): RouteAnalysis {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();
  const lang = detectLanguage(prompt);

  // 1. Comprehensive Pure Artistic Image Generation Triggers
  const khmerImageTriggers = [
    /^(?:សូម\s*)?(?:ជួយ\s*)?(?:បង្កើត|គូរ|ធ្វើ|ឌីហ្សាញ|សុំ|ចង់បាន)\s*(?:រូបភាព|រូបថត|រូប|ផ្ទាំងរូបភាព|រូបគំនូរ|រូបត្លុក|រូបវិចិត្រ)/i,
    /(?:បង្កើត|គូរ|ធ្វើ|ឌីហ្សាញ)(?:រូបភាព|រូបថត|រូប)\s*(.+)/i,
    /^(?:សូម\s*)?គូរ\s*(?:រូប)?\s*(.+)/i,
    /(?:ចង់បាន|សុំ|បង្កើត|គូរ)\s*(?:រូប)?\s*(?:ឡាន|ឆ្មា|ឆ្កែ|ប្រាសាទ|ផ្ទះ|មនុស្ស|ទេសភាព|ទីក្រុង|ផ្កា|ដើមឈើ|សត្វ|កោះ|សមុទ្រ|ភ្នំ|យាន|កប៉ាល់|យន្តហោះ)/i,
  ];

  const englishImageTriggers = [
    /^(?:please\s+)?(?:generate|create|draw|render|make|paint|illustrate|design)\s+(?:an?\s+)?(?:image|picture|photo|illustration|drawing|artwork|poster|wallpaper|render|avatar|portrait|graphic)\s*(?:of|showing|depicting)?/i,
    /^(?:please\s+)?(?:create|generate|make|draw|render|paint)\s+a\s+(?:futuristic|modern|vintage|cyberpunk|anime|oil painting|3d|photorealistic|digital art|beautiful|cinematic|stunning|fantasy|scenic|hyperrealistic|surreal)/i,
    /^(?:a\s+)?(?:realistic\s+)?(?:photo|picture|drawing|illustration|painting|render|artwork)\s+of\s+/i,
    /^(?:draw|paint|illustrate)\s+(?:me\s+)?(?:an?\s+)?(.+)/i,
    /^(?:generate|create|render)\s+a\s+(.+)\s+(?:at|in|on|with|during)\s+(.+)/i,
  ];

  // Exclude coding and educational / math explanation contexts from pure artistic image generation
  const isCodingContext =
    lower.includes("html") ||
    lower.includes("javascript") ||
    lower.includes("typescript") ||
    lower.includes("python") ||
    lower.includes("react") ||
    lower.includes("css") ||
    lower.includes("function") ||
    lower.includes("algorithm") ||
    lower.includes("class") ||
    lower.includes("component") ||
    lower.includes("api");

  const isEducationalOrMathExplanation =
    lower.includes("ពន្យល់") ||
    lower.includes("បកស្រាយ") ||
    lower.includes("ទ្រឹស្តីបទ") ||
    lower.includes("រូបមន្ត") ||
    lower.includes("ដោះស្រាយ") ||
    lower.includes("គណនា") ||
    lower.includes("សមីការ") ||
    lower.includes("លំហាត់") ||
    lower.includes("និយមន័យ") ||
    lower.includes("ហេតុអ្វី") ||
    lower.includes("ពីតាករ") ||
    lower.includes("ត្រីកោណ") ||
    lower.includes("រង្វង់") ||
    lower.includes("explain") ||
    lower.includes("how to") ||
    lower.includes("how does") ||
    lower.includes("why does") ||
    lower.includes("what is") ||
    lower.includes("theorem") ||
    lower.includes("formula") ||
    lower.includes("calculate") ||
    lower.includes("equation") ||
    lower.includes("solve") ||
    lower.includes("pythagor") ||
    /[a-z]\s*[\^²³]\s*[\+\-]\s*[a-z]\s*[\^²³]\s*=\s*[a-z]\s*[\^²³]/i.test(lower);

  let isArtisticImageGen = false;

  if (!isCodingContext && !isEducationalOrMathExplanation) {
    for (const regex of khmerImageTriggers) {
      if (regex.test(trimmed)) {
        isArtisticImageGen = true;
        break;
      }
    }

    if (!isArtisticImageGen) {
      for (const regex of englishImageTriggers) {
        if (regex.test(trimmed)) {
          isArtisticImageGen = true;
          break;
        }
      }
    }
  }

  // Image Editing / Transformation Triggers (especially when an image is attached or referenced)
  const imageEditTriggers = [
    /^(?:សូម\s*)?(?:ជួយ\s*)?(?:កែប្រែ|កែ|ប្តូរ|ផ្លាស់ប្តូរ|ថែម|បន្ថែម|ដាក់|ដក|លុប)(?:រូបភាព|រូបថត|រូប|ផ្ទៃខាងក្រោយ|ពណ៌)?/i,
    /(?:ប្តូរ|កែ|ថែម|ផ្លាស់ប្តូរ|កែប្រែ)\s*(?:ផ្ទៃខាងក្រោយ|ពណ៌|សម្លៀកបំពាក់|ខោអាវ|មុខ|ភ្នែក|សក់|បរិយាកាស|ពន្លឺ|ស្ទីល|ទេសភាព)/i,
    /^(?:please\s+)?(?:edit|modify|change|transform|add|remove|replace|convert|repaint|redesign)\s+(?:this|the|an?)?\s*(?:image|photo|picture|background|lighting|clothes|outfit|face|hair|style|look)/i,
    /(?:change|replace|modify|edit)\s+(?:the\s+)?(?:background|lighting|outfit|clothes|color|face|style)\s+to\s+/i,
    /(?:add|put)\s+(?:a|an)?\s+(?:glasses|hat|sunglasses|krama|scarf|smile|sunset|lighting|effect)\s+(?:to|on|in)\s+(?:this|the)\s+image/i,
  ];

  let isImageEdit = false;
  if (hasImage && !isCodingContext) {
    for (const regex of imageEditTriggers) {
      if (regex.test(trimmed)) {
        isImageEdit = true;
        break;
      }
    }
  }

  // If user requested direct artistic picture creation or conversational image editing
  if (isArtisticImageGen || isImageEdit) {
    const cleaned = cleanPrompt(trimmed);
    return {
      intent: 'image_gen',
      isImageGeneration: true,
      cleanImagePrompt: cleaned || trimmed,
      isVisualExplanation: false,
      isMathOrReasoning: false,
      isCoding: false,
      isWebSearch: false,
      language: lang,
      systemDirective: isImageEdit 
        ? 'Edit and transform the provided reference image based on user conversational instructions using gemini-3.1-flash-image.'
        : 'Generate the actual image matching the user description directly using gemini-3.1-flash-image.',
    };
  }

  // 2. Vision analysis (if image attached)
  if (hasImage) {
    return {
      intent: 'vision',
      isImageGeneration: false,
      isVisualExplanation: false,
      isMathOrReasoning: false,
      isCoding: false,
      isWebSearch: false,
      language: lang,
      systemDirective: 'Analyze the provided image thoroughly. Read all visible text (Khmer & English OCR) accurately, explain objects, charts, math formulas, UI or diagrams clearly.',
    };
  }

  // 3. Document analysis (if document attached)
  if (hasDocument) {
    return {
      intent: 'document',
      isImageGeneration: false,
      isVisualExplanation: false,
      isMathOrReasoning: false,
      isCoding: false,
      isWebSearch: false,
      language: lang,
      systemDirective: 'Analyze the attached document/file carefully. Summarize key takeaways, extract tables, answer questions, or interpret code accurately.',
    };
  }

  // 4. Intelligent Visual Explanation Check
  const visualAnalysis = analyzeVisualExplanationIntent(prompt);

  // 5. Math / STEM reasoning
  const mathIndicators = [
    'ដោះស្រាយ', 'គណនា', 'សមីការ', 'លំហាត់', 'គណិត', 'រូបវិទ្យា', 'គីមី', 'ពីតាករ',
    'solve', 'calculate', 'equation', 'integral', 'derivative', 'matrix', 'algebra', 'calculus', 'pythagor',
    'x +', 'x -', 'x =', 'y =', '2x', '3x', 'sin(', 'cos(', 'lim', 'sqrt', 'fx =', 'f(x)'
  ];
  const isMath = mathIndicators.some(kw => lower.includes(kw));

  // 6. Coding & Technical
  const codingIndicators = [
    'សរសេរកូដ', 'កែកូដ', 'website', 'app', 'html', 'css', 'javascript', 'typescript', 'react', 'python',
    'java', 'c++', 'sql', 'php', 'function', 'class', 'bug', 'error', 'debug', 'api', 'json', 'algorithm'
  ];
  const isCoding = codingIndicators.some(kw => lower.includes(kw));

  // 7. Translation
  const transIndicators = ['បកប្រែ', 'translate', 'meaning of', 'ខ្មែរទៅអង់គ្លេស', 'អង់គ្លេសទៅខ្មែរ'];
  const isTranslation = transIndicators.some(kw => lower.includes(kw));

  // 8. Intelligent Web Search Decision — ChatGPT-style automatic routing
  // Search is triggered when:
  //   a) User explicitly asks to search ("search", "look up", "google", etc.)
  //   b) Question contains time-sensitive keywords (today, latest, current, news, etc.)
  //   c) Question asks about prices, weather, scores, events, releases
  //   d) User has webSearchEnabled toggle on
  // Search is NOT triggered for:
  //   a) Simple greetings, math, coding, translation
  //   b) General knowledge questions ("what is photosynthesis")
  //   c) Creative writing, opinions, explanations

  const explicitSearchTriggers = [
    'search', 'search web', 'search google', 'look up', 'find online', 'check online',
    'google', 'browse', 'browse the web', 'search for', 'find out',
    'ស្វែងរក', 'ស្រាវជ្រាវ', 'លើ google', 'តាម web', 'ស្វែងរកតាម', 'រកមើល',
  ];

  const timeSensitiveKeywords = [
    'news', 'latest', 'today', 'yesterday', 'current', 'recent', 'newest', 'just',
    'breaking', 'live', 'real-time', 'realtime', 'now', 'currently',
    'this week', 'this month', 'this year', 'this morning', 'tonight',
    'upcoming', 'tomorrow', 'next week', 'next month',
    'who won', 'who is the', 'what happened', 'release date', 'what\'s new',
    '2024', '2025', '2026', '2027',
    'ថ្ងៃនេះ', 'ម្សិលមិញ', 'សប្តាហ៍នេះ', 'ខែនេះ', 'ឆ្នាំនេះ', 'ឆ្នាំ២០២៦', 'ឆ្នាំ២០២៥',
    'ថ្មីៗ', 'កំពុង', 'ឥឡូវ', 'ថ្ងៃស្អែក', 'សប្តាហ៍ក្រោយ', 'ពេលនេះ',
  ];

  const factualLookupKeywords = [
    'price', 'weather', 'stock', 'score', 'exchange rate', 'gold price', 'bitcoin',
    'crypto', 'btc', 'ethereum', 'market', 'forecast', 'prediction', 'rate',
    'population', 'gdp', 'inflation', 'unemployment', 'election', 'vote',
    'ournament', 'championship', 'league', 'world cup', 'olympics',
    'flight', 'visa', 'passport', 'embassy', 'currency',
    'តម្លៃ', 'អាកាសធាតុ', 'ផ្សារហ៊ុន', 'អត្រាប្តូរប្រាក់', 'តម្លៃមាស',
    'ពិន្ទុបាល់ទាត់', 'លទ្ធផល', 'កាលវិភាគ', 'តើអ្នកណាជា', 'តើនរណាជា',
  ];

  const hasExplicitSearch = explicitSearchTriggers.some(kw => lower.includes(kw));
  const hasTimeSensitive = timeSensitiveKeywords.some(kw => lower.includes(kw));
  const hasFactualLookup = factualLookupKeywords.some(kw => lower.includes(kw));

  // Determine if search should be triggered
  const wantsSearch = webSearchEnabled || hasExplicitSearch || hasTimeSensitive || hasFactualLookup;

  let determinedIntent: IntentCategory = 'text';
  if (isMath) determinedIntent = 'math';
  else if (isCoding) determinedIntent = 'coding';
  else if (isTranslation) determinedIntent = 'translation';
  else if (wantsSearch) determinedIntent = 'search';

  // System directive for Universal Multilingual & Visual Explanation mode
  let systemDirective = `Provide a helpful, precise, natural, and comprehensive response. ALWAYS detect and match the exact language the user wrote in (Khmer, English, Chinese, Vietnamese, Thai, Japanese, Korean, French, Spanish, German, Arabic, etc.) with native fluency.`;

  if (wantsSearch) {
    systemDirective += `
IMPORTANT: Real-time Google Search grounding is enabled. Use the Google Search tool to find up-to-date facts, current dates, real-time prices, live events, or breaking news, and provide clear, accurate, and concise real-time answers.`;
  }

  if (visualAnalysis.wantsVisual) {
    systemDirective += `
IMPORTANT: The user will benefit greatly from a clear visual explanation.
Structure your response as follows:
### ចម្លើយ
[Provide a clear, thorough, easy-to-understand explanation]

### ពន្យល់ពីរូបភាព
[Provide numbered step-by-step points that explain the visual diagram/stages in detail]`;
  }

  return {
    intent: determinedIntent,
    isImageGeneration: false,
    isVisualExplanation: visualAnalysis.wantsVisual,
    visualType: visualAnalysis.visualType,
    visualSubject: visualAnalysis.visualSubject,
    isMathOrReasoning: isMath,
    isCoding: isCoding,
    isWebSearch: wantsSearch,
    language: lang,
    systemDirective,
  };
}
