/**
 * Web Search Service — No extra API key needed!
 *
 * Primary: Gemini Grounding (uses existing GEMINI_API_KEY)
 * Fallback 1: SearXNG instances (free, open-source)
 * Fallback 2: DuckDuckGo Lite (free, no key)
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
  const lower = question.toLowerCase();

  // 1. Primary query: translated topic
  if (translated.length > 2) {
    queries.push(translated);
  }

  // 2. If Khmer, also add the original + year
  if (hasKhmer(question)) {
    const cleanKhmer = question.replace(/[?។!]+$/, "").trim();
    if (cleanKhmer.length > 2) {
      queries.push(`${cleanKhmer} ${year}`);
    }
    // Also try just the key English words from the Khmer text
    const englishWords = translated.replace(/[^a-zA-Z0-9\s]/g, "").trim();
    if (englishWords.length > 3 && !queries.includes(englishWords)) {
      queries.push(englishWords);
    }
  }

  // 3. Time-sensitive: add year
  if (isTimeSensitive) {
    queries.push(`${translated} ${year}`);
  }

  // 4. Person/entity queries: add context
  if (/\b(who is|who are|who was|តើអ្នកណាជា|តើនរណាជា)\b/i.test(lower)) {
    // "Who is Elon Musk" → search "Elon Musk biography"
    const person = translated.replace(/^(who is|who are|who was|តើអ្នកណាជា|តើនរណាជា)\s*/i, "").trim();
    if (person.length > 1) {
      queries.push(`${person} biography`);
      queries.push(`${person} ${year}`);
    }
  }

  // 5. "What is" queries: add definition context
  if (/\b(what is|what are|what was|តើអ្វីជា)\b/i.test(lower)) {
    const subject = translated.replace(/^(what is|what are|what was|តើអ្វីជា)\s*/i, "").trim();
    if (subject.length > 1) {
      queries.push(`${subject} explained`);
      queries.push(`${subject} overview`);
    }
  }

  // 6. Price/cost queries: add "price" context
  if (/\b(price|cost|how much|តម្លៃ|ប៉ុន្មាន)\b/i.test(lower)) {
    queries.push(`${translated} current price`);
  }

  // 7. News queries: add "news" context
  if (/\b(news|breaking|latest|update|ថ្មីៗ|ព័ត៌មាន)\b/i.test(lower)) {
    queries.push(`${translated} news today`);
  }

  // 8. Download/app queries: add "download" context
  if (/\b(download|install|app|ទាញយក|ដំឡើង)\b/i.test(lower)) {
    queries.push(`${translated} download official`);
  }

  // 9. Comparison queries
  if (/\b(vs|versus|compare|comparison|difference between|ប្រៀបធៀប)\b/i.test(lower)) {
    queries.push(`${translated} comparison review`);
  }

  // 10. Original question if it's English and different from translated
  if (!hasKhmer(question)) {
    const cleaned = question.replace(/[?។!]+$/, "").trim();
    if (cleaned !== translated && cleaned.length > 3) {
      queries.push(cleaned);
    }
  }

  // Deduplicate, filter short queries, return top 2
  return [...new Set(queries.filter((q) => q.length > 2))].slice(0, 2);
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
// 4. GEMINI GROUNDING (Primary — uses existing GEMINI_API_KEY)
// ─────────────────────────────────────────────

function getGeminiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY_1) keys.push(process.env.GEMINI_API_KEY_1);
  if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
  if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);
  return keys;
}

let groundingKeyIndex = 0;

async function searchWithGeminiGrounding(query: string, maxResults: number): Promise<SearchResult[]> {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    console.warn("[WebSearch] No GEMINI_API_KEY set, skipping Gemini grounding");
    return [];
  }

  // Try each key with different models
  const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];

  for (let attempt = 0; attempt < Math.min(keys.length * models.length, 6); attempt++) {
    const apiKey = keys[groundingKeyIndex % keys.length];
    groundingKeyIndex++;
    const model = models[attempt % models.length];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ parts: [{ text: query }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[WebSearch] Gemini grounding HTTP ${res.status} (key ${(attempt % keys.length) + 1}/${keys.length}, model ${model}), trying next...`);
      continue;
    }

    const data = await res.json();
    const results: SearchResult[] = [];

    // Extract grounding metadata (search results)
    const candidate = data.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;

    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks.slice(0, maxResults)) {
        const web = chunk.web;
        if (web?.uri) {
          results.push({
            title: web.title || "Untitled",
            snippet: "",
            url: web.uri,
            domain: getDomain(web.uri),
            score: 90, // High score for Gemini-sourced results
          });
        }
      }
    }

    // Also extract from groundingSupports if available
    if (groundingMetadata?.groundingSupports) {
      for (const support of groundingMetadata.groundingSupports.slice(0, maxResults)) {
        const segment = support.segment;
        const indices = support.groundingChunkIndices || [];
        // Add snippet text from the AI response
        for (const idx of indices) {
          if (results[idx] && segment?.text) {
            results[idx].snippet = (results[idx].snippet + " " + segment.text).trim().slice(0, 500);
          }
        }
      }
    }

    // Also extract the AI response text as context
    const aiText = candidate?.content?.parts?.[0]?.text || "";
    if (aiText && results.length > 0) {
      console.log(`[WebSearch] Gemini grounding returned ${results.length} sources + AI context`);
    } else {
      console.log(`[WebSearch] Gemini grounding returned ${results.length} sources`);
    }

    return results;
  } catch (err) {
    console.warn(`[WebSearch] Gemini grounding failed (key ${(attempt % keys.length) + 1}): ${(err as Error).message?.slice(0, 80)}`);
    // Continue to next key/model
  }
  } // end for loop
  return [];
}

// ─────────────────────────────────────────────
// 5. TAVILY SEARCH API (Free tier: 1000 req/month)
// ─────────────────────────────────────────────

async function searchWithTavily(query: string, maxResults: number): Promise<SearchResult[]> {
  const tavilyKeys = [
    process.env.TAVILY_API_KEY,
    process.env.TAVILY_API_KEY_2,
    process.env.TAVILY_API_KEY_3,
    process.env.TAVILY_API_KEY_4,
  ].filter((k): k is string => !!k);

  if (tavilyKeys.length === 0) {
    console.warn("[WebSearch] No TAVILY_API_KEY set, skipping Tavily Search");
    return [];
  }

  // Start from last used index, try all keys until one works
  let startIdx = parseInt(process.env.TAVILY_ROTATE_INDEX || "0", 10);

  for (let attempt = 0; attempt < tavilyKeys.length; attempt++) {
    const idx = (startIdx + attempt) % tavilyKeys.length;
    const apiKey = tavilyKeys[idx];

    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "basic",
          max_results: maxResults,
          include_answer: false,
        }),
        signal: AbortSignal.timeout(10000),
      });

      // If 429 (rate limited), try next key
      if (res.status === 429) {
        console.warn(`[WebSearch] Tavily key ${idx + 1}/${tavilyKeys.length} rate limited (429), trying next key...`);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn(`[WebSearch] Tavily key ${idx + 1} HTTP ${res.status}: ${errText.slice(0, 200)}`);
        continue;
      }

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
              score: Math.round((item.score || 0) * 100),
            });
          }
        }
      }

      if (results.length > 0) {
        // Remember this key for next rotation
        process.env.TAVILY_ROTATE_INDEX = String((idx + 1) % tavilyKeys.length);
        console.log(`[WebSearch] Tavily key ${idx + 1}/${tavilyKeys.length} returned ${results.length} results for "${query.slice(0, 40)}"`);
        return results;
      }
    } catch (err) {
      console.warn(`[WebSearch] Tavily key ${idx + 1} failed: ${(err as Error).message?.slice(0, 60)}`);
    }
  }

  console.warn("[WebSearch] All Tavily keys exhausted or failed");
  return [];
}

// ─────────────────────────────────────────────
// 6. BRAVE SEARCH API (Free tier: 2000 req/month)
// ─────────────────────────────────────────────

async function searchWithBrave(query: string, maxResults: number): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    console.warn("[WebSearch] BRAVE_API_KEY not set, skipping Brave Search");
    return [];
  }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[WebSearch] Brave Search HTTP ${res.status}: ${errText.slice(0, 200)}`);
      return [];
    }

    const data = await res.json();
    const results: SearchResult[] = [];

    if (data.web?.results && Array.isArray(data.web.results)) {
      for (const item of data.web.results.slice(0, maxResults)) {
        if (item.title && item.url) {
          results.push({
            title: item.title.trim(),
            snippet: (item.description || "").trim().slice(0, 500),
            url: item.url,
            domain: getDomain(item.url),
            publishedDate: item.page_age || undefined,
            score: 0,
          });
        }
      }
    }

    console.log(`[WebSearch] Brave Search returned ${results.length} results for "${query.slice(0, 40)}"`);
    return results;
  } catch (err) {
    console.warn(`[WebSearch] Brave Search failed: ${(err as Error).message?.slice(0, 60)}`);
    return [];
  }
}

// ─────────────────────────────────────────────
// 6. SearXNG (Free, Open-Source Meta Search)
// ─────────────────────────────────────────────

const SEARXNG_INSTANCES = [
  "https://search.sapti.me",
  "https://searx.be",
  "https://search.ononoki.org",
  "https://searx.work",
  "https://search.inetol.net",
  "https://searx.tiekoetter.com",
  "https://search.bus-hit.me",
  "https://searxng.site",
  "https://priv.au",
  "https://search.projectsegfau.lt",
  "https://search.mdosch.de",
  "https://search.hbubli.cc",
  "https://search.bus-hit.me",
  "https://s.zhoogle.com",
  "https://search.neet.works",
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
// 6. DUCKDUCKGO FALLBACK (Lite endpoint)
// ─────────────────────────────────────────────

async function searchDuckDuckGoLite(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[WebSearch] DuckDuckGo returned HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    const results: SearchResult[] = [];

    const linkRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;
    const links: { url: string; title: string }[] = [];
    const snippets: string[] = [];

    while ((match = linkRegex.exec(html)) !== null) {
      links.push({ url: match[1].trim(), title: match[2].replace(/<[^>]*>/g, "").trim() });
    }

    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]*>/g, "").trim().slice(0, 500));
    }

    for (let i = 0; i < Math.min(links.length, maxResults); i++) {
      let url = links[i].url;
      const uddgMatch = url.match(/uddg=([^&]+)/);
      if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
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

    console.log(`[WebSearch] DuckDuckGo returned ${results.length} results`);
    return results;
  } catch (err) {
    console.warn(`[WebSearch] DuckDuckGo Lite failed: ${(err as Error).message?.slice(0, 60)}`);
    return [];
  }
}

// ─────────────────────────────────────────────
// 7. MAIN SEARCH FUNCTION
// ─────────────────────────────────────────────

export async function searchWeb(question: string, maxResults = 3): Promise<SearchResult[]> {
  const queries = generateSearchQueries(question);
  console.log(`[WebSearch] Generated ${queries.length} queries:`, queries.map((q) => q.slice(0, 50)));

  const allResults: SearchResult[] = [];

  // Strategy 1: Gemini Grounding (uses existing GEMINI_API_KEY — no extra key needed!)
  console.log("[WebSearch] Trying Gemini Grounding...");
  for (const q of queries) {
    const geminiResults = await searchWithGeminiGrounding(q, 2);
    allResults.push(...geminiResults);
  }

  // Strategy 2: Tavily Search (free tier: 1000 req/month)
  if (allResults.length < 2) {
    console.log("[WebSearch] Trying Tavily Search...");
    for (const q of queries) {
      const tavilyResults = await searchWithTavily(q, 2);
      allResults.push(...tavilyResults);
    }
  }

  // Strategy 3: Brave Search API (free tier: 2000 req/month)
  if (allResults.length < 2) {
    console.log("[WebSearch] Trying Brave Search...");
    for (const q of queries) {
      const braveResults = await searchWithBrave(q, 2);
      allResults.push(...braveResults);
    }
  }

  // Strategy 4: Try SearXNG (free, no API key needed)
  if (allResults.length < 2) {
    console.log("[WebSearch] Trying SearXNG...");
    for (const q of queries) {
      const searxResults = await searchSearXNG(q, 2);
      allResults.push(...searxResults);
    }
  }

  // Strategy 5: DuckDuckGo Lite
  if (allResults.length < 2) {
    console.log("[WebSearch] Trying DuckDuckGo Lite fallback...");
    for (const q of queries) {
      const ddgResults = await searchDuckDuckGoLite(q, 2);
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
