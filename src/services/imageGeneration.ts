import { getGeminiClient } from "./gemini.js";
import { parseGeminiError } from "./errorHelper.js";

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  inputImageBase64?: string;
  inputImageMimeType?: string;
}

export interface GenerateImageResult {
  success: boolean;
  imageUrl?: string;
  mimeType?: string;
  prompt?: string;
  revisedPrompt?: string;
  error?: string;
}

/**
 * Aspect ratio to dimensions mapping for ultra HD generation (1024-1536px)
 * Compatible with Flux and high-resolution diffusion models
 */
function getDimensionsForAspectRatio(ratio: string): { width: number; height: number } {
  switch (ratio) {
    case "16:9":
      return { width: 1344, height: 768 };
    case "9:16":
      return { width: 768, height: 1344 };
    case "4:3":
      return { width: 1152, height: 864 };
    case "3:4":
      return { width: 864, height: 1152 };
    case "1:1":
    default:
      return { width: 1024, height: 1024 };
  }
}

/**
 * Determine the optimal aspect ratio based on user prompt semantics
 */
export function inferOptimalAspectRatio(prompt: string): "1:1" | "16:9" | "9:16" | "4:3" | "3:4" {
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
 * Ultra-high quality prompt expansion system designed to match ChatGPT / DALL-E 3 & Midjourney v6
 */
async function expandPromptForPhotorealism(userPrompt: string): Promise<string> {
  const ai = getGeminiClient();
  try {
    const translationRes = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `You are an elite AI Art Director and master prompt engineer equivalent to DALL-E 3 / Midjourney v6.
Your job is to transform the user's prompt (which may be in Khmer, English, or mixed) into an ultra-detailed, award-winning, stunning visual prompt that produces museum-quality, breathtaking photorealism.

User Request: "${userPrompt}"

Instructions:
1. Deeply understand the core subject, emotional ambiance, cultural authenticity, and composition.
2. If the user mentions Khmer / Cambodian culture, people, historical landmarks, or attire (e.g. Angkor Wat, Bayon, Bakheng, Apsara, traditional clothes, youth, man, woman):
   - Authentically describe genuine Cambodian facial features (striking handsome/beautiful Southeast Asian bone structure, warm golden-bronze skin tone with natural texture and fine pores, expressive soulful brown eyes, well-groomed stylish hair).
   - Accurately describe authentic Cambodian heritage attire: an elegant ivory/silk mandarin-collar shirt, a richly woven maroon or royal silk sampot chong kben (សំពត់ចងក្បិន) with an ornate antique golden metal buckle belt, and an authentic checkered Cambodian krama scarf (ក្រមា) draped symmetrically over the chest and shoulders.
   - Meticulously describe the backdrop: iconic towering ancient sandstone spires of Angkor Wat bathed in warm sunrise or golden hour twilight, majestic sugar palm trees (ដើមត្នោត), and crystal-clear reflective water pools with lotus flowers.
3. Master Photography & Cinema Aesthetics:
   - Camera & Lens: Award-winning National Geographic portrait, shot on Hasselblad H6D-100c / Canon EOS R5 with 85mm f/1.4 prime lens, tack-sharp subject focus, smooth creamy optical background bokeh.
   - Lighting: Gorgeous golden hour sunlight, soft volumetric god rays, natural warm ambient bounce light, realistic subsurface scattering on skin.
   - Quality & Details: 8k UHD resolution, hyper-realistic, masterpiece, true-to-life cloth texture, intricate embroidery, high dynamic range (HDR), professional cinematic color grading.
4. If the prompt is about another style (cyberpunk, fantasy, anime, 3D, product photography, nature):
   - Render it with the highest aesthetic fidelity matching top-tier digital art or commercial photography.
5. Output ONLY the finalized expanded English prompt text. No explanations, no prefixes, no quotation marks.`,
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
 * Generate real AI image with Google Imagen 3 and Flux.1 Pro/Dev engine cascade
 */
export async function generateAIImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const {
    prompt,
    aspectRatio = inferOptimalAspectRatio(prompt),
    inputImageBase64,
    inputImageMimeType = "image/png",
  } = options;

  const ai = getGeminiClient();

  // 1. Expand prompt into a ChatGPT/Midjourney level masterpiece description
  const enhancedPrompt = await expandPromptForPhotorealism(prompt);

  // 2. Try Google Imagen 3 (imagen-3.0-generate-002)
  try {
    const imagenResponse = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: enhancedPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: aspectRatio,
      },
    });

    if (imagenResponse.generatedImages && imagenResponse.generatedImages.length > 0) {
      const imgBytes = imagenResponse.generatedImages[0].image?.imageBytes;
      if (imgBytes) {
        const imageUrl = `data:image/jpeg;base64,${imgBytes}`;
        return {
          success: true,
          imageUrl,
          mimeType: "image/jpeg",
          prompt,
          revisedPrompt: enhancedPrompt,
        };
      }
    }
  } catch (imagenErr) {
    // Imagen 3 quota limit on free tier; proceed seamlessly to next-gen Flux engine
  }

  // 3. Next-Gen Flux.1 Photorealism Engine Cascade (Matches Midjourney v6 & DALL-E 3 quality)
  const { width, height } = getDimensionsForAspectRatio(aspectRatio);
  const randomSeed = Math.floor(Math.random() * 9999999);
  const encodedPrompt = encodeURIComponent(enhancedPrompt);

  const FLUX_ENGINES = [
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${randomSeed}&model=flux&nologo=true`,
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${randomSeed}&model=flux-realism&nologo=true`,
    `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${randomSeed}&model=turbo&nologo=true`,
  ];

  for (const engineUrl of FLUX_ENGINES) {
    try {
      const imgFetch = await fetch(engineUrl, {
        headers: {
          "User-Agent": "CHAT-GPR-Flux/2.0",
        },
      });

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
          };
        }
      }
    } catch (engineErr) {
      console.warn("[ImageGen] Engine attempt error, trying next:", engineErr);
    }
  }

  return {
    success: false,
    error: "មិនអាចបង្កើតរូបភាពបានទេនៅពេលនេះ។ សូមព្យាយាមម្តងទៀត។ (Unable to generate image at this moment. Please try again.)",
  };
}
