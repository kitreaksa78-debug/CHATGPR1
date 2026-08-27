import { getGeminiClient } from "./gemini.js";

export type ImageResolution = "512px" | "1K" | "2K" | "4K";

// Content moderation - blocked terms for inappropriate/explicit content
const BLOCKED_TERMS = [
  // Explicit sexual content
  "nude", "naked", "nsfw", "explicit", "porn", "sexy", "erotic",
  "topless", "bottomless", "bikini", "lingerie",
  // Violence
  "gore", "blood", "kill", "murder", "death",
  // Illegal content
  "drug", "weapon", "gun",
];

/**
 * Check if prompt contains inappropriate content
 */
function isPromptBlocked(prompt: string): { blocked: boolean; reason?: string } {
  const lower = prompt.toLowerCase();
  
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) {
      return {
        blocked: true,
        reason: `Prompt contains inappropriate content: "${term}". Please keep prompts appropriate and respectful.`
      };
    }
  }
  
  return { blocked: false };
}
export type ImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "1:4" | "1:8" | "4:1" | "8:1";

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: ImageAspectRatio;
  imageSize?: ImageResolution;
  inputImageBase64?: string;
  inputImageMimeType?: string;
  isEditMode?: boolean;
}

export interface GenerateImageResult {
  success: boolean;
  imageUrl?: string;
  mimeType?: string;
  prompt?: string;
  revisedPrompt?: string;
  model?: string;
  imageSize?: ImageResolution;
  aspectRatio?: ImageAspectRatio;
  isEdited?: boolean;
  error?: string;
}

/**
 * Determine the optimal aspect ratio based on user prompt semantics
 */
export function inferOptimalAspectRatio(prompt: string): ImageAspectRatio {
  const lower = prompt.toLowerCase();
  
  // Portrait / Person / Wallpaper / Full-body
  if (
    lower.includes("portrait") ||
    lower.includes("wallpaper") ||
    lower.includes("phone") ||
    lower.includes("មនុស្ស") ||
    lower.includes("ប្រុស") ||
    lower.includes("ស្រី") ||
    lower.includes("ក្មេង") ||
    lower.includes("boy") ||
    lower.includes("girl") ||
    lower.includes("man") ||
    lower.includes("woman") ||
    lower.includes("standing") ||
    lower.includes("outfit") ||
    lower.includes("ម៉ូដ") ||
    lower.includes("person") ||
    lower.includes("model")
  ) {
    return "3:4";
  }

  // Wide landscape / Wallpaper / Scenic / Panorama
  if (
    lower.includes("landscape") ||
    lower.includes("panoram") ||
    lower.includes("desktop") ||
    lower.includes("cinema") ||
    lower.includes("scenery") ||
    lower.includes("ទេសភាព") ||
    lower.includes("វាល") ||
    lower.includes("ឆ្នេរ") ||
    lower.includes("ភ្នំ")
  ) {
    return "16:9";
  }

  return "1:1";
}

/**
 * Ultra-high quality prompt expansion system for Nano Banana 2 (gemini-3.1-flash-image)
 */
async function expandPromptForPhotorealism(userPrompt: string, hasReferenceImage = false): Promise<string> {
  const ai = getGeminiClient();
  try {
    const editInstruction = hasReferenceImage
      ? `NOTE: The user has attached a reference image for conversational editing. Focus precisely on modifying, adding, replacing, or enhancing the requested elements while seamlessly maintaining subject consistency, natural lighting, and photographic realism.`
      : `NOTE: The user is requesting a new image generation.`;

    const translationRes = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `You are an elite AI Art Director and world-class prompt engineer specialized in photorealistic image generation.
Your job is to craft an ultra-detailed, photorealistic visual prompt in English that produces award-winning imagery.

User Request: "${userPrompt}"
${editInstruction}

Requirements:
1. Flawless human anatomy with realistic skin textures and natural lighting
2. Cinematic lighting with natural shadows and depth
3. For Cambodian/Khmer content: Authentic Southeast Asian features, traditional attire (sampot, krama), Angkor Wat setting
4. Strong adherence to user instructions (colors, objects, styles, backgrounds)
5. Professional photography quality: sharp focus, proper exposure, rich colors
6. Avoid: blurry images, distorted faces, unnatural poses, low quality
7. IMPORTANT: Generate ONLY appropriate, respectful content. No nudity, no explicit content, no suggestive poses. Keep all images family-friendly and suitable for all audiences.

Output ONLY the expanded English prompt text. No introductory text, markdown, or quotation marks.`,
    });

    const enhanced = translationRes.text?.trim().replace(/^["']|["']$/g, "");
    if (enhanced && enhanced.length > 20) {
      return enhanced;
    }
  } catch (err) {
    console.warn("[ImageGen] Prompt expansion fallback:", err);
  }

  return userPrompt;
}

/**
 * Get dimensions for aspect ratio
 */
function getDimensions(aspectRatio: ImageAspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case "16:9": return { width: 1344, height: 768 };
    case "9:16": return { width: 768, height: 1344 };
    case "4:3": return { width: 1152, height: 864 };
    case "3:4": return { width: 864, height: 1152 };
    default: return { width: 1024, height: 1024 };
  }
}

/**
 * Fallback: Generate image using Pollinations.ai (free, no API key)
 */
async function generateWithPollinations(
  prompt: string, 
  aspectRatio: ImageAspectRatio
): Promise<GenerateImageResult> {
  const { width, height } = getDimensions(aspectRatio);
  const seed = Math.floor(Math.random() * 9999999);
  const encodedPrompt = encodeURIComponent(prompt);
  
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
  
  console.log(`[ImageGen] Using Pollinations.ai fallback`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
  
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 1000) {
        const base64Data = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = response.headers.get("content-type") || "image/jpeg";
        const imageUrl = `data:${mimeType};base64,${base64Data}`;
        
        return {
          success: true,
          imageUrl,
          mimeType,
          prompt,
          revisedPrompt: prompt,
          model: "Pollinations.ai (FLUX)",
          imageSize: "2K",
          aspectRatio,
          isEdited: false,
        };
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn("[ImageGen] Pollinations.ai error:", err.message);
  }
  
  return { success: false, error: "All image generation services are currently unavailable. Please try again later." };
}

/**
 * Gemini image generation models in priority order
 */
const GEMINI_IMAGE_MODELS = [
  "gemini-3.1-flash-image",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
];

/**
 * Try generating image with a specific Gemini model
 */
async function tryGeminiImageModel(
  model: string,
  prompt: string,
  aspectRatio: ImageAspectRatio,
  imageSize: ImageResolution,
  inputImageBase64?: string,
  inputImageMimeType?: string,
): Promise<GenerateImageResult | null> {
  const ai = getGeminiClient();
  
  try {
    console.log(`[ImageGen] Trying Gemini model: ${model}`);
    
    const parts: any[] = [];
    if (inputImageBase64) {
      parts.push({
        inlineData: {
          data: inputImageBase64,
          mimeType: inputImageMimeType || "image/png",
        },
      });
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          console.log(`[ImageGen] ✅ Success with ${model}`);
          return {
            success: true,
            imageUrl,
            mimeType,
            prompt,
            revisedPrompt: prompt,
            model,
            imageSize,
            aspectRatio,
            isEdited: !!inputImageBase64,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[ImageGen] ❌ ${model} failed:`, err.message?.slice(0, 80));
  }
  
  return null;
}

/**
 * Generate AI image using fallback chain for reliability
 * Primary: Gemini models → Fallback: Pollinations.ai (free)
 */
export async function generateAIImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const {
    prompt,
    aspectRatio = inferOptimalAspectRatio(prompt),
    imageSize = "2K",
    inputImageBase64,
    inputImageMimeType = "image/png",
    isEditMode = false,
  } = options;

  const hasReferenceImage = !!inputImageBase64;
  
  // Content moderation check
  const moderation = isPromptBlocked(prompt);
  if (moderation.blocked) {
    console.log(`[ImageGen] ⚠️ Prompt blocked: ${moderation.reason}`);
    return {
      success: false,
      error: moderation.reason,
    };
  }
  
  const enhancedPrompt = await expandPromptForPhotorealism(prompt, hasReferenceImage);

  // Try all Gemini models in priority order
  for (const model of GEMINI_IMAGE_MODELS) {
    const result = await tryGeminiImageModel(
      model,
      enhancedPrompt,
      aspectRatio,
      imageSize,
      inputImageBase64,
      inputImageMimeType,
    );
    
    if (result?.success) {
      return result;
    }
    
    // Small delay before trying next model
    await new Promise(r => setTimeout(r, 500));
  }

  // Fallback to Pollinations.ai (free, no API key needed)
  console.log(`[ImageGen] All Gemini models failed, trying Pollinations.ai...`);
  return generateWithPollinations(enhancedPrompt, aspectRatio);
}
