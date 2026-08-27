// API base URL — in production (static deployment) this points to the backend server.
// In local dev it's empty (same-origin).
export function getApiBase(): string {
  // 1. Explicit env override
  const envUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl;

  // 2. Runtime detection: if we're on the deployed host (not the preview sandbox),
  //    the backend lives on the preview proxy URL.
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h.includes("freebuff") && !h.includes("daytonaproxy")) {
      return "https://3000-f35088b8-3fe6-487f-8668-b0fa7a526013.daytonaproxy01.net";
    }
  }
  return "";
}

export const API_BASE = getApiBase();
