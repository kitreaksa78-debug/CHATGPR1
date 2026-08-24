/**
 * Web Search Service — Multi-provider intelligent search
 *
 * Provider Priority:
 * 1. SearXNG (https://priv.au/) — aggregates Google, Bing, etc.
 * 2. DuckDuckGo HTML — reliable free fallback
 * 3. DuckDuckGo JSON API — final fallback
 *
 * Features:
 * - Intelligent query rewriting
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
// 4. SearXNG SEARCH PROVIDER
// ─────────────────────────────────────────────

const SEARXNG_INSTANCES = [
  "https://priv.au",
  "https://search.sapti.me",
  "https://search.ononoki.org",
  "https://searx.tiekoetter.com",
  "https://search.bus-hit.me",
  "https://searx.work",
  "https://search.mdosch.de",
];

async function searchSearXNGInstance(instance: string, query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=en`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json, text/html, */*",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[WebSearch] SearXNG ${instance} returned HTTP ${res.status}`);
      return [];
    }

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    // Validate JSON response
    if (!contentType.includes("json") && !text.trimStart().startsWith("{")) {
      console.warn(`[WebSearch] SearXNG ${instance} returned non-JSON (${contentType})`);
      return [];
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn(`[WebSearch] SearXNG ${instance} returned invalid JSON`);
      return [];
    }

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

    console.log(`[WebSearch] SearXNG ${instance} returned ${results.length} results`);
    return results;
  } catch (err) {
    console.warn(`[WebSearch] SearXNG ${instance} failed: ${(err as Error).message?.slice(0, 60)}`);
    return [];
  }
}

async function searchSearXNG(query: string, maxResults: number): Promise<SearchResult[]> {
  for (const instance of SEARXNG_INSTANCES) {
    const results = await searchSearXNGInstance(instance, query, maxResults);
    if (results.length > 0) return results;
  }
  console.warn(`[WebSearch] All SearXNG instances failed for "${query.slice(0, 40)}"`);
  return [];
}

// ─────────────────────────────────────────────
// 5. DUCKDUCKGO HTML FALLBACK (Most Reliable)
// ─────────────────────────────────────────────

async function searchDuckDuckGoHTML(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      body: `q=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const results: SearchResult[] = [];

    // Parse HTML results using regex
    const resultBlocks = html.split('class="result__body"').slice(1, maxResults + 1);

    for (const block of resultBlocks) {
      const urlMatch = block.match(/class="result__url"[^>]*>([^<]+)/);
      const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)/);
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([^<]+)/);

      if (urlMatch && titleMatch) {
        let url = urlMatch[1].trim();
        // Clean up URL
        if (url.startsWith("//")) url = "https:" + url;
        if (!url.startsWith("http")) url = "https://" + url;

        results.push({
          title: titleMatch[1].trim().replace(/<[^>]*>/g, ""),
          snippet: (snippetMatch?.[1] || "").trim().replace(/<[^>]*>/g, "").slice(0, 500),
          url,
          domain: getDomain(url),
          score: 0,
        });
      }
    }

    console.log(`[WebSearch] DuckDuckGo HTML returned ${results.length} results`);
    return results;
  } catch (err) {
    console.warn(`[WebSearch] DuckDuckGo HTML failed: ${(err as Error).message?.slice(0, 60)}`);
    return [];
  }
}

// ─────────────────────────────────────────────
// 6. DUCKDUCKGO JSON FALLBACK
// ─────────────────────────────────────────────

async function searchDuckDuckGoJSON(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: SearchResult[] = [];
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText.slice(0, 500),
        url: data.AbstractURL,
        domain: getDomain(data.AbstractURL),
        score: 80,
      });
    }
    for (const t of (data.RelatedTopics || []).slice(0, maxResults)) {
      if (t.Text && t.FirstURL) {
        results.push({
          title: t.Text.slice(0, 100),
          snippet: t.Text.slice(0, 500),
          url: t.FirstURL,
          domain: getDomain(t.FirstURL),
          score: 50,
        });
      }
    }
    console.log(`[WebSearch] DuckDuckGo JSON returned ${results.length} results`);
    return results;
  } catch (err) {
    console.warn(`[WebSearch] DuckDuckGo JSON failed: ${(err as Error).message?.slice(0, 60)}`);
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

  // Strategy 1: Try SearXNG (all queries in parallel)
  const searxngPromises = queries.map((q) => searchSearXNG(q, 5));
  const searxngOutcomes = await Promise.allSettled(searxngPromises);
  for (const o of searxngOutcomes) {
    if (o.status === "fulfilled") allResults.push(...o.value);
  }

  // Strategy 2: If SearXNG failed, try DuckDuckGo HTML (more reliable)
  if (allResults.length === 0) {
    console.log("[WebSearch] SearXNG failed, trying DuckDuckGo HTML...");
    const ddgHtmlResults = await searchDuckDuckGoHTML(queries[0], 8);
    allResults.push(...ddgHtmlResults);
  }

  // Strategy 3: If DDG HTML also failed, try DDG JSON
  if (allResults.length === 0) {
    console.log("[WebSearch] DuckDuckGo HTML failed, trying DuckDuckGo JSON...");
    const ddgJsonResults = await searchDuckDuckGoJSON(queries[0], 5);
    allResults.push(...ddgJsonResults);
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
