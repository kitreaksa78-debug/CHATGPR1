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

  // Exclude coding context from pure artistic generation
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

  let isArtisticImageGen = false;

  if (!isCodingContext) {
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

  // If user requested direct artistic picture creation
  if (isArtisticImageGen) {
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
      systemDirective: 'Generate the actual image matching the user description directly using image generation.',
    };
  }

  // 2. Vision analysis (User uploaded an image to analyze, e.g., "តើរូបនេះមានអ្វី?")
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

  // 8. Web search intent
  const searchKeywords = ['news', 'latest', 'today', 'current', 'price', 'weather', 'stock', 'who won', 'ព័ត៌មាន', 'ថ្ងៃនេះ', 'តម្លៃ', 'អាកាសធាតុ'];
  const wantsSearch = webSearchEnabled || searchKeywords.some(kw => lower.includes(kw));

  let determinedIntent: IntentCategory = 'text';
  if (isMath) determinedIntent = 'math';
  else if (isCoding) determinedIntent = 'coding';
  else if (isTranslation) determinedIntent = 'translation';
  else if (wantsSearch) determinedIntent = 'search';

  // System directive for Visual Explanation mode
  let systemDirective = `Provide a helpful, precise, natural, and comprehensive response in the user's preferred language (${lang === 'km' ? 'Khmer' : 'English'}).`;

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
