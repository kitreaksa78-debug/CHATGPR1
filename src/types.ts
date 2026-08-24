export type Role = 'user' | 'assistant' | 'system';

export type IntentCategory = 
  | 'text'
  | 'math'
  | 'vision'
  | 'image_gen'
  | 'document'
  | 'coding'
  | 'search'
  | 'translation';

export type VisualType = 
  | 'diagram'
  | 'flowchart'
  | 'infographic'
  | 'architecture'
  | 'timeline'
  | 'geometry'
  | 'science'
  | 'process'
  | 'comparison'
  | 'concept_map'
  | 'chart'
  | 'illustration';

export interface VisualExplanation {
  id: string;
  type: 'mermaid' | 'svg' | 'image';
  visualType: VisualType;
  title: string;
  titleKm?: string;
  data: string; // Mermaid markup, Raw SVG XML, or Image URL
  aspectRatio?: string;
  explanationSteps?: string[];
  status: 'generating' | 'ready' | 'error';
  error?: string;
  prompt?: string;
  createdAt: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string; // mimeType (e.g. 'image/png', 'application/pdf', 'text/plain')
  size: number;
  dataUrl: string; // base64 data url
  base64Data?: string; // raw base64 string
  previewUrl?: string;
  category: 'image' | 'document' | 'audio' | 'code';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GeneratedImage {
  imageUrl: string;
  prompt: string;
  aspectRatio?: string;
  imageSize?: '512px' | '1K' | '2K' | '4K';
  model?: string;
  revisedPrompt?: string;
  isEdited?: boolean;
  parentImageUrl?: string;
  createdAt: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  intent?: IntentCategory;
  attachments?: Attachment[];
  generatedImage?: GeneratedImage;
  visualExplanation?: VisualExplanation;
  groundingSources?: GroundingSource[];
  isStreaming?: boolean;
  searchStatus?: "searching" | "analyzing" | null;
  searchMessage?: string;
  error?: string;
  liked?: boolean | null; // true = liked, false = disliked, null = unrated
  modelUsed?: string;
  isFallback?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isTemporary?: boolean;
}

export interface ChatSettings {
  webSearchEnabled: boolean;
  preferredLanguage: 'auto' | 'km' | 'en';
  defaultImageResolution: '1K' | '2K' | '4K';
  temperature: number;
  soundEnabled: boolean;
  autoTitle: boolean;
  customSystemPrompt?: string;
  enableFallbackQ8?: boolean;
  fallbackModelName?: string;
  fallbackEndpointUrl?: string;
  fallbackProviderType?: string;
}

export interface QuickPrompt {
  id: string;
  titleKm: string;
  titleEn: string;
  promptKm: string;
  promptEn: string;
  category: IntentCategory;
  icon: string;
}
