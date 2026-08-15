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
 * Ultra-high quality prompt expansion system designed to match ChatGPT / DALL-E 3 & Midjourney
 */
async function expandPromptForPhotorealism(userPrompt: string): Promise<string> {
  const ai = getGeminiClient();
  try {
    const translationRes = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `You are an elite AI Art Director and prompt engineer equivalent to DALL-E 3 / Midjourney v6.
Your job is to transform the user's prompt (which may be in Khmer, English, or mixed) into an ultra-detailed, award-winning, stunning visual prompt.

User Request: "${userPrompt}"

Instructions:
1. Identify the core subject, setting, and mood.
2. If the user mentions Khmer / Cambodian culture, people, or temples (like Angkor Wat, Bayon, Bokor, Apsara, traditional clothing):
   - Authentically describe Khmer facial features (handsome/beautiful Southeast Asian features, warm golden skin tone, sharp expressive eyes).
   - Accurately describe authentic Khmer attire (e.g. elegant silk shirt, traditional krama scarf, or royal sampot) with intricate embroidery.
   - Describe majestic ancient Angkor sandstone architecture with carved lotus motifs, reflection in water pools, and morning/sunset golden light.
3. Enhance with professional cinema & photography keywords:
   - Camera & Lens: Shot on 85mm f/1.4 prime lens / Hasselblad medium format, ultra-sharp focus on subject, natural creamy background bokeh (depth of field).
   - Lighting: Cinematic golden hour sunlight, soft volumetric crepuscular rays, warm ambient glow, natural subsurface scattering for skin.
   - Detail: Masterpiece, 8k UHD resolution, hyper-detailed skin texture, realistic hair strands, authentic environment, high dynamic range (HDR), color graded.
4. If it is an anime, 3D, or fantasy request, craft it with top-tier art style specifications (e.g. Makoto Shinkai aesthetic or Unreal Engine 5 render).
5. Output ONLY the finalized prompt text. No explanations, no prefixes, no quotation marks.`,
    });

    const enhanced = translationRes.text?.trim().replace(/^["']|["']$/g, "");
    if (enhanced && enhanced.length > 15) {
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
    aspectRatio = "1:1",
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

  // 3. Try Next-Gen Flux.1 Photorealism Engine (Matches Midjourney v6 & DALL-E 3 quality)
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
