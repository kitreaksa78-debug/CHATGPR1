/**
 * Utility to parse and format Gemini API errors into clean, user-friendly messages
 */

export function parseGeminiError(err: any): string {
  if (!err) return "An unexpected error occurred.";

  const rawMessage = typeof err === "string" ? err : err?.message || JSON.stringify(err);

  // Check if rawMessage contains nested JSON
  let nestedMsg = "";
  try {
    const jsonMatch = rawMessage.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error?.message) {
        try {
          const innerParsed = JSON.parse(parsed.error.message);
          nestedMsg = innerParsed?.error?.message || parsed.error.message;
        } catch {
          nestedMsg = parsed.error.message;
        }
      }
    }
  } catch {
    // Ignore JSON parse failure
  }

  const combined = (rawMessage + " " + nestedMsg).toLowerCase();

  // 1. Quota / Rate Limit (429 / RESOURCE_EXHAUSTED) & High Demand (503 / UNAVAILABLE)
  if (
    combined.includes("429") ||
    combined.includes("resource_exhausted") ||
    combined.includes("quota") ||
    combined.includes("rate limit") ||
    combined.includes("too many requests") ||
    combined.includes("503") ||
    combined.includes("high demand") ||
    combined.includes("unavailable")
  ) {
    return "⚠️ សេវាកម្ម Google Gemini API កំពុងមានចរាចរណ៍ខ្ពស់ ឬកូតាបានពេញបណ្ដោះអាសន្ន (High Demand / Rate Limit)។\nសូមរង់ចាំប្រហែល ២០-៣០ វិនាទី រួចចុចប៊ូតុង **'ព្យាយាមម្តងទៀត / Retry'** ខាងក្រោម។\n\nGoogle Gemini API is currently experiencing high demand or rate limits. Please wait a few moments and click Retry.";
  }

  // 2. Missing or Invalid API Key
  if (
    combined.includes("api_key_invalid") ||
    combined.includes("api key not valid") ||
    combined.includes("unauthenticated") ||
    combined.includes("401") ||
    combined.includes("gemini_api_key is not set")
  ) {
    return "🔑 មិនមាន GEMINI_API_KEY ត្រឹមត្រូវទេ។ សូមពិនិត្យមើល API Key នៅក្នុងការកំណត់ Settings។ / Invalid or missing GEMINI_API_KEY. Please verify in Settings.";
  }

  // 3. Safety Block
  if (
    combined.includes("safety") ||
    combined.includes("blocked") ||
    combined.includes("harm_category")
  ) {
    return "🛡️ សំណើនេះត្រូវបានរារាំងដោយប្រព័ន្ធសុវត្ថិភាព (Safety Policy Filter)។ សូមកែប្រែសំណួរ ឬរូបភាពរបស់អ្នក។ / Request was blocked by safety filters. Please modify your prompt.";
  }

  // 4. Overloaded / Service Unavailable (503 / High Demand)
  if (
    combined.includes("503") ||
    combined.includes("overloaded") ||
    combined.includes("unavailable") ||
    combined.includes("high demand") ||
    combined.includes("spikes in demand")
  ) {
    return "⏳ ប្រព័ន្ធមេ Google Gemini កំពុងមានអ្នកប្រើប្រាស់ច្រើនបណ្ដោះអាសន្ន (Server High Demand / 503)។ សូមចុចប៊ូតុង 'ព្យាយាមម្តងទៀត / Retry' ក្នុងពេលបន្តិចទៀត។\n\nGemini model is currently experiencing temporary high demand (503). Please click Retry in a few seconds.";
  }

  // Return clean nested message if found, otherwise sanitize rawMessage
  if (nestedMsg) {
    return nestedMsg;
  }

  // Strip raw stack traces or internal JSON syntax
  return rawMessage.replace(/ApiError:\s*/, "").replace(/^\{\s*"error":\s*\{.*\}\s*\}$/s, "").trim() || "An error occurred while generating response.";
}
