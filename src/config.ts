// API base URL — in production (Render/Node.js deployment) this is same-origin.
// In local dev it's also same-origin. No cross-origin proxy needed.

export async function resolveApiBase(): Promise<string> {
  return "";
}

// Synchronous getter — always same-origin
export function getApiBase(): string {
  return "";
}

export const API_BASE = getApiBase();
