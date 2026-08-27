/**
 * Web Search Service — Google Programmable Search Engine
 *
 * Single Provider: Google Custom Search API
 * - High quality, reliable results
 * - Free tier: 100 queries/day
 * - Paid: $5 per 1000 queries
 *
 * Features:
 * - Intelligent query rewriting (Khmer → English)
 * - Multi-query search with deduplication
 * - Source quality ranking
 * - Date awareness for time-sensitive queries
 */

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  domain: string;
  publishedDate?: string;
  score: number;
}

// ─────────────────────────────────────────────
// 1. QUERY INTELLIGENCE
// ─────────────────────────────────────────────

const KHMER_MAP: Record<string, string> = {
  "តើអ្នកណាជា": "who is", "តើនរណាជា": "who is",
  "តើធ្វើដូចម្តេច": "how to",
  "តើ": "what is",
  "ជាអ្វី": "",
  "ថ្ងៃនេះ": "today", "ម្សិលមិញ": "yesterday",
  "សប្តាហ៍នេះ": "this week", "ខែនេះ": "this month", "ឆ្នាំនេះ": "this year",
  "ថ្មីៗ": "latest", "ឥឡូវ": "now",
  "នៅ": "at", "តម្លៃ": "price", "អាកាសធាតុ": "weather",
  "ព័ត៌មាន": "news", "លទ្ធផល": "results", "កាលវិភាគ": "schedule",
  "ស្វែងរក": "search", "ស្រាវជ្រាវ": "research",
  "ហេតុអ្វី": "why", "ពេលណា": "when",
  "កន្លែងណា": "where", "ល្អបំផុត": "best", "ឥតគិតថ្លៃ": "free",
  "កំពុង": "currently",
  "បច្ចេកវិទ្យា": "technology",
  "វិទ្យាសាស្ត្រ": "science", "កីឡា": "sports", "សុខភាព": "health",
  "អប់រំ": "education", "អាជីវកម្ម": "business",
  "ផ្សារហ៊ុន": "stock market", "អត្រាប្តូរប្រាក់": "exchange rate",
  "តម្លៃមាស": "gold price", "ពិន្ទុបាល់ទាត់": "football score",
};

function hasKhmer(text: string): boolean {
  return /[\u1780-\u17FF\u19E0-\u19FF]/.test(text);
}

function translateToEnglish(query: string): string {
  if (!hasKhmer(query)) return query;
  let t = query;
  for (const [kh, en] of Object.entries(KHMER_MAP)) {
    t = t.replace(new RegExp(kh, "g"), en);
  }
  t = t.replace(/\s+/g, " ").trim();
  return /[a-zA-Z0-9]/.test(t) ? t : `${query} ${t}`;
}

function extractTopic(question: string): string {
  return question
    .replace(/^(please|សូម|ជួយ|can you|could you|would you)\s*/i, "")
    .replace(/^(tell me|explain|describe|give me|provide|ឆ្លើយ|ពន្យល់|បកស្រាយ|ផ្តល់)\s*/i, "")
    .replace(/^(about|of|for|regarding|ពី|សម្រាប់|ទាក់ទង)\s*/i, "")
    .replace(/[?។!]+$/, "")
    .trim();
}

function hasTimeSensitiveKeywords(q: string): boolean {
  const lower = q.toLowerCase();
  return [
    "today", "yesterday", "this week", "this month", "this year",
    "latest", "current", "recent", "newest", "now", "currently",
    "just", "breaking", "live", "real-time", "2024", "2025", "2026", "2027",
    "upcoming", "tomorrow", "this morning", "tonight", "right now",
    "ថ្ងៃនេះ", "ម្សិលមិញ", "សប្តាហ៍នេះ", "ខែនេះ", "ឆ្នាំនេះ",
    "ថ្មីៗ", "កំពុង", "ឥឡូវ", "ថ្ងៃស្អែក", "សប្តាហ៍ក្រោយ",
    "ឆ្នាំ២០២៥", "ឆ្នាំ២០២៦", "ពេលនេះ", "ពេលថ្មីៗ",
  ].some((kw) => lower.includes(kw));
}

export function generateSearchQueries(question: string): string[] {
  const queries: string[] = [];
  const topic = extractTopic(question);
  const translated = translateToEnglish(topic);
  const isTimeSensitive = hasTimeSensitiveKeywords(question);
  const year = new Date().getFullYear();

  queries.push(translated);

  if (isTimeSensitive || hasKhmer(question)) {
    queries.push(`${translated} ${year}`);
  }

  if (!hasKhmer(question)) {
    const cleaned = question.replace(/[?។!]+$/, "").trim();
    if (cleaned !== translated && cleaned.length > 3) {
      queries.push(cleaned);
    }
  }

  return [...new Set(queries.filter((q) => q.length > 2))].slice(0, 3);
}

// ─────────────────────────────────────────────
// 2. SOURCE QUALITY RANKING
// ─────────────────────────────────────────────

const HIGH_AUTHORITY = [
  "wikipedia.org", "github.com", "developer.mozilla.org", "docs.python.org",
  "nodejs.org", "react.dev", "angular.io", "vuejs.org", "typescriptlang.org",
  "cloud.google.com", "openai.com", "ai.google.dev", "anthropic.com",
  "cloudflare.com", "aws.amazon.com", "learn.microsoft.com",
  "stackoverflow.com", "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk",
  "nytimes.com", "theguardian.com", "who.int", "cdc.gov", "nih.gov", "un.org",
  "coingecko.com", "coinmarketcap.com", "investing.com", "tradingview.com",
  "binance.com", "coinbase.com",
];

const MID_AUTHORITY = [
  "freecodecamp.org", "w3schools.com", "geeksforgeeks.org",
  "dev.to", "medium.com", "reddit.com", "quora.com",
  "techcrunch.com", "theverge.com", "wired.com", "engadget.com",
  "arxiv.org", "nature.com", "sciencedirect.com",
];

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", "").toLowerCase(); } catch { return ""; }
}

function scoreDomain(url: string): number {
  const domain = getDomain(url);
  if (!domain) return 10;
  if (HIGH_AUTHORITY.some((d) => domain.includes(d))) return 100;
  if (MID_AUTHORITY.some((d) => domain.includes(d))) return 70;
  if (domain.endsWith(".gov") || domain.endsWith(".edu") || domain.endsWith(".org")) return 85;
  return 50;
}

function rankResults(results: SearchResult[]): SearchResult[] {
  return results.map((r) => ({ ...r, score: scoreDomain(r.url) })).sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────
// 3. DEDUPLICATION
// ─────────────────────────────────────────────

function deduplicate(results: SearchResult[]): SearchResult[] {
  const seenUrls = new Set<string>();
  const seenSnippets = new Set<string>();
  return results.filter((r) => {
    const normUrl = r.url.replace(/\/+$/, "").toLowerCase();
    if (seenUrls.has(normUrl)) return false;
    const snippetKey = r.snippet.toLowerCase().slice(0, 80);
    if (snippetKey.length > 10 && seenSnippets.has(snippetKey)) return false;
    seenUrls.add(normUrl);
    if (snippetKey.length > 10) seenSnippets.add(snippetKey);
    return true;
  }).map((r) => ({ ...r, domain: getDomain(r.url) }));
}

// ─────────────────────────────────────────────
// 4. SearXNG (Free, Open-Source Meta Search)
// ─────────────────────────────────────────────

const SEARXNG_INSTANCES = [
  "https://search.inetol.net",
  "https://searx.work",
  "https://search.ononoki.org",
  "https://searx.tiekoetter.com",
  "https://search.sapti.me",
  "https://searx.be",
];

async function searchSearXNG(query: string, maxResults: number): Promise<SearchResult[]> {
  for (const instance of SEARXNG_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=en`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const results: SearchResult[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const item of data.results.slice(0, maxResults)) {
          if (item.title && item.url) {
            results.push({
              title: item.title.trim(),
              snippet: (item.content || "").trim().slice(0, 500),
              url: item.url,
              domain: getDomain(item.url),
              publishedDate: item.publishedDate || undefined,
              score: 0,
            });
          }
        }
      }

      if (results.length > 0) {
        console.log(`[WebSearch] SearXNG returned ${results.length} results from ${instance}`);
        return results;
      }
    } catch (err) {
      console.warn(`[WebSearch] SearXNG ${instance} failed: ${(err as Error).message?.slice(0, 40)}`);
    }
  }
  return [];
}

// ─────────────────────────────────────────────
// 5. GOOGLE CUSTOM SEARCH API (if configured)
// ─────────────────────────────────────────────

function getGoogleCSEConfig() {
  return {
    apiKey: process.env.GOOGLE_API_KEY || "",
    cseId: process.env.GOOGLE_CSE_ID || "",
  };
}

async function searchGoogle(query: string, maxResults: number, startIndex = 1): Promise<SearchResult[]> {
  const { apiKey: GOOGLE_API_KEY, cseId: GOOGLE_CSE_ID } = getGoogleCSEConfig();
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
    console.warn("[WebSearch] Google CSE not configured (missing GOOGLE_API_KEY or GOOGLE_CSE_ID)");
    return [];
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=${maxResults}&start=${startIndex}&lr=lang_en&safe=off`;
    
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[WebSearch] Google CSE returned HTTP ${res.status}: ${errText.slice(0, 200)}`);
      return [];
    }

    const data = await res.json();
    const results: SearchResult[] = [];

    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items.slice(0, maxResults)) {
        if (item.title && item.link) {
          results.push({
            title: item.title.trim(),
            snippet: (item.snippet || "").trim().slice(0, 500),
            url: item.link,
            domain: getDomain(item.link),
            publishedDate: item.pagemap?.metatags?.[0]?.["article:published_time"] || undefined,
            score: 0,
          });
        }
      }
    }

    console.log(`[WebSearch] Google CSE returned ${results.length} results for "${query.slice(0, 40)}"`);
    return results;
  } catch (err) {
    console.warn(`[WebSearch] Google CSE failed: ${(err as Error).message?.slice(0, 60)}`);
    return [];
  }
}

// ─────────────────────────────────────────────
// 6. DUCKDUCKGO FALLBACK (Lite endpoint)
// ─────────────────────────────────────────────

async function searchDuckDuckGoLite(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    // Use DuckDuckGo Lite which returns simpler HTML
    const res = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      body: `q=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[WebSearch] DuckDuckGo Lite returned HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const results: SearchResult[] = [];

    // Parse lite.duckduckgo.com HTML - links are in <a> tags with class="result-link"
    const linkRegex = /<a[^>]+class="result-link"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
    
    let match;
    const links: { url: string; title: string }[] = [];
    const snippets: string[] = [];

    while ((match = linkRegex.exec(html)) !== null) {
      links.push({ url: match[1].trim(), title: match[2].trim() });
    }

    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].trim().replace(/<[^>]*>/g, "").slice(0, 500));
    }

    for (let i = 0; i < Math.min(links.length, maxResults); i++) {
      let url = links[i].url;
      if (url.startsWith("//")) url = "https:" + url;
      if (!url.startsWith("http")) url = "https://" + url;

      results.push({
        title: links[i].title || "Untitled",
        snippet: snippets[i] || "",
        url,
        domain: getDomain(url),
        score: 0,
      });
    }

    console.log(`[WebSearch] DuckDuckGo Lite returned ${results.length} results`);
    return results;
  } catch (err) {
    console.warn(`[WebSearch] DuckDuckGo Lite failed: ${(err as Error).message?.slice(0, 60)}`);
    return [];
  }
}

// ─────────────────────────────────────────────
// 7. MAIN SEARCH FUNCTION
// ─────────────────────────────────────────────

export async function searchWeb(question: string, maxResults = 8): Promise<SearchResult[]> {
  const queries = generateSearchQueries(question);
  console.log(`[WebSearch] Generated ${queries.length} queries:`, queries.map((q) => q.slice(0, 40)));

  const allResults: SearchResult[] = [];

  // Strategy 1: Try SearXNG (free, no API key needed)
  console.log("[WebSearch] Trying SearXNG...");
  for (const q of queries) {
    const searxResults = await searchSearXNG(q, 5);
    allResults.push(...searxResults);
  }

  // Strategy 2: If SearXNG failed, try Google Custom Search API
  if (allResults.length < 3) {
    const { apiKey, cseId } = getGoogleCSEConfig();
    if (apiKey && cseId) {
      console.log("[WebSearch] Trying Google Custom Search API...");
      for (const q of queries) {
        const googleResults = await searchGoogle(q, 5);
        allResults.push(...googleResults);
      }
    }
  }

  // Strategy 3: If still not enough, try DuckDuckGo Lite
  if (allResults.length < 3) {
    console.log("[WebSearch] Trying DuckDuckGo Lite fallback...");
    for (const q of queries) {
      const ddgResults = await searchDuckDuckGoLite(q, 5);
      allResults.push(...ddgResults);
    }
  }

  console.log(`[WebSearch] Total raw: ${allResults.length}`);

  const unique = deduplicate(allResults);
  console.log(`[WebSearch] After dedup: ${unique.length}`);

  const ranked = rankResults(unique);
  const final = ranked.slice(0, maxResults);

  console.log(`[WebSearch] Final: ${final.length} results (scores: ${final.slice(0, 3).map((r) => r.score).join(", ")})`);
  return final;
}

// ─────────────────────────────────────────────
// 8. FORMATTING — structured context for AI
// ─────────────────────────────────────────────

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return "";

  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  let ctx = "\n\n--- REAL-TIME WEB SEARCH RESULTS ---\n";
  ctx += `Search performed on: ${date}\n`;
  ctx += `Found ${results.length} sources ranked by reliability.\n\n`;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const badge = r.score >= 100 ? " [⭐ Official/Primary]" : r.score >= 85 ? " [✓ Reliable]" : "";
    ctx += `━━━ Source [${i + 1}] ━━━\n`;
    ctx += `Title: ${r.title}\n`;
    ctx += `URL: ${r.url}\n`;
    ctx += `Domain: ${r.domain}${badge}\n`;
    if (r.publishedDate) ctx += `Published: ${r.publishedDate}\n`;
    ctx += `Content: ${r.snippet}\n\n`;
  }

  ctx += "─── END OF SEARCH RESULTS ───\n\n";
  ctx += "INSTRUCTIONS:\n";
  ctx += `- Use the sources above to provide an accurate, well-cited answer.\n`;
  ctx += `- Cite inline using [1], [2], etc. next to the claim they support.\n`;
  ctx += `- Cross-reference multiple sources for accuracy.\n`;
  ctx += `- Prioritize sources marked [⭐ Official/Primary].\n`;
  ctx += `- Do NOT copy text verbatim. Synthesize and explain naturally.\n`;
  ctx += `- If sources are insufficient, say so honestly — do NOT fabricate.\n`;
  ctx += `- Answer in the SAME language as the user's question.\n`;
  ctx += `- At the end, provide a "Sources:" section listing the top 3-5 most relevant URLs.\n`;

  return ctx;
}
