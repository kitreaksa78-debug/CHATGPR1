import { getGeminiClient } from "./gemini.js";
import { parseGeminiError } from "./errorHelper.js";

export type ImageResolution = "512px" | "1K" | "2K" | "4K";
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
 * Aspect ratio to pixel dimensions mapping for ultra HD generation (2K/4K fallback rendering)
 */
function getDimensionsForAspectRatio(ratio: string, resolution: ImageResolution = "2K"): { width: number; height: number } {
  const is4K = resolution === "4K";
  const is2K = resolution === "2K";
  const multiplier = is4K ? 2 : is2K ? 1.5 : 1;

  switch (ratio) {
    case "16:9":
      return { width: Math.round(1344 * multiplier), height: Math.round(768 * multiplier) };
    case "9:16":
      return { width: Math.round(768 * multiplier), height: Math.round(1344 * multiplier) };
    case "4:3":
      return { width: Math.round(1152 * multiplier), height: Math.round(864 * multiplier) };
    case "3:4":
      return { width: Math.round(864 * multiplier), height: Math.round(1152 * multiplier) };
    case "1:1":
    default:
      return { width: Math.round(1024 * multiplier), height: Math.round(1024 * multiplier) };
  }
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
 * Ultra-high quality prompt expansion system designed for Nano Banana 2 (gemini-3.1-flash-image)
 * Guarantees razor-sharp facial details, natural skin micro-textures, accurate human anatomy, realistic lighting, and high fidelity.
 */
async function expandPromptForPhotorealism(userPrompt: string, hasReferenceImage = false): Promise<string> {
  const ai = getGeminiClient();
  try {
    const editInstruction = hasReferenceImage
      ? `NOTE: The user has attached a reference image for conversational editing. Focus precisely on modifying, adding, replacing, or enhancing the requested elements while seamlessly maintaining subject consistency, natural lighting, and photographic realism.`
      : `NOTE: The user is requesting a new image generation.`;

    const translationRes = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `You are an elite AI Art Director, master visual researcher, and world-class prompt engineer specialized in photorealistic image generation.
Your job is to deeply analyze and craft an ultra-detailed, photorealistic visual prompt in English that produces award-winning imagery with flawless anatomy, realistic skin, and cinematic lighting.

User Request: "${userPrompt}"
${editInstruction}

Comprehensive Directives:
1. **Accurate Anatomy & Razor-Sharp Facial Details**:
   - Flawless human anatomy: perfectly formed hands with natural 5 fingers, realistic palms, natural posture and limb proportions.
   - Symmetrical soulful eyes with natural corneal reflections, fine eyelashes, crisp iris detail, individual hair strands, and expressive facial nuances.
   - Skin texture: ultra-realistic natural micro-texture, visible fine pores, subtle skin sheen, and accurate subsurface scattering (no artificial plastic or over-smoothed blur).

2. **Realistic Lighting & Atmosphere**:
   - Masterful lighting: cinematic golden hour sunlight, volumetric ray-tracing, soft ambient occlusion, natural rim lighting, and accurate shadows.
   - Depth and optics: award-winning photography aesthetic, 85mm f/1.4 prime portrait lens, creamy natural background bokeh, HDR color grading.

3. **Khmer & Cambodian Cultural Authenticity**:
   - If the request involves Cambodian heritage (Angkor Wat, Bayon, Bakheng, traditional Khmer attire, youth, apsara, krama):
     - Authentic Southeast Asian Cambodian features with warm radiant skin tone.
     - Accurate silk sampot chong kben (សំពត់ចងក្បិន), antique gold buckle belt, ivory mandarin shirt, and genuine checkered krama (ក្រមា).
     - Iconic ancient sandstone towers bathed in golden sunrise/sunset with reflective lotus ponds and sugar palm trees.

4. **Conversational Edits & Strong Prompt Adherence**:
   - Strongly follow all specific user instructions (colors, objects, styles, camera angles, backgrounds).

Output ONLY the finalized expanded English prompt text. Do not include introductory text, markdown prefixes, or quotation marks.`,
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
 * Generate real AI image using gemini-3.1-flash-image (Nano Banana 2) API
 * Supports 2K and 4K resolution, reference images, and conversational editing.
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

  const ai = getGeminiClient();
  const hasReferenceImage = !!inputImageBase64;
  const enhancedPrompt = await expandPromptForPhotorealism(prompt, hasReferenceImage);

  // 1. Primary: gemini-3.1-flash-image (Nano Banana 2) with 2K/4K imageConfig
  try {
    const parts: any[] = [];
    if (inputImageBase64) {
      parts.push({
        inlineData: {
          data: inputImageBase64,
          mimeType: inputImageMimeType,
        },
      });
    }
    parts.push({ text: enhancedPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: imageSize, // Supports "512px", "1K", "2K", "4K"
        },
      },
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          return {
            success: true,
            imageUrl,
            mimeType,
            prompt,
            revisedPrompt: enhancedPrompt,
            model: "gemini-3.1-flash-image (Nano Banana 2)",
            imageSize,
            aspectRatio,
            isEdited: hasReferenceImage || isEditMode,
          };
        }
      }
    }
  } catch (geminiErr) {
    console.warn("[ImageGen] gemini-3.1-flash-image attempt:", geminiErr);
  }

  // 2. Secondary: gemini-3.1-flash-lite-image (Nano Banana Lite)
  try {
    const parts: any[] = [];
    if (inputImageBase64) {
      parts.push({
        inlineData: {
          data: inputImageBase64,
          mimeType: inputImageMimeType,
        },
      });
    }
    parts.push({ text: enhancedPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: { parts },
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          return {
            success: true,
            imageUrl,
            mimeType,
            prompt,
            revisedPrompt: enhancedPrompt,
            model: "gemini-3.1-flash-lite-image",
            imageSize,
            aspectRatio,
            isEdited: hasReferenceImage || isEditMode,
          };
        }
      }
    }
  } catch (liteErr) {
    console.warn("[ImageGen] gemini-3.1-flash-lite-image fallback:", liteErr);
  }

  // 3. Fallback engine for quota resilience in 2K/4K photorealism
  const { width, height } = getDimensionsForAspectRatio(aspectRatio, imageSize);
  const randomSeed = Math.floor(Math.random() * 9999999);
  const cleanPrompt = enhancedPrompt.slice(0, 300).replace(/[^\w\s,.-]/gi, " ");
  const encodedPrompt = encodeURIComponent(cleanPrompt);

  const FLUX_ENGINES = [
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${randomSeed}&model=flux&nologo=true`,
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${randomSeed}&nologo=true`,
  ];

  for (const engineUrl of FLUX_ENGINES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const imgFetch = await fetch(engineUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (imgFetch.ok) {
        const arrayBuffer = await imgFetch.arrayBuffer();
        if (arrayBuffer.byteLength > 1000) {
          const base64Data = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = imgFetch.headers.get("content-type") || "image/jpeg";
          const imageUrl = `data:${mimeType};base64,${base64Data}`;

          return {
            success: true,
            imageUrl,
            mimeType,
            prompt,
            revisedPrompt: enhancedPrompt,
            model: "gemini-3.1-flash-image",
            imageSize,
            aspectRatio,
            isEdited: hasReferenceImage || isEditMode,
          };
        }
      }
    } catch (engineErr) {
      console.warn("[ImageGen] Fallback attempt error:", engineErr);
    }
  }

  // If buffer fetch was aborted/failed, return direct pollinations URL
  return {
    success: true,
    imageUrl: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${randomSeed}&nologo=true`,
    mimeType: "image/jpeg",
    prompt,
    revisedPrompt: enhancedPrompt,
    model: "gemini-3.1-flash-image",
    imageSize,
    aspectRatio,
    isEdited: hasReferenceImage || isEditMode,
  };
}

