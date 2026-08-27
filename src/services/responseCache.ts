/**
 * Response Cache System
 * 
 * Caches AI responses to reduce API calls.
 * Similar questions get cached responses.
 * Cache expires after configurable TTL.
 */

interface CacheEntry {
  key: string;
  response: string;
  timestamp: number;
  hits: number;
}

interface CacheConfig {
  maxSize: number;           // Maximum cache entries
  ttlMs: number;             // Time to live in milliseconds
  similarityThreshold: number; // How similar queries need to be (0-1)
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 1000,             // Cache up to 1000 responses
  ttlMs: 3600_000,           // 1 hour TTL
  similarityThreshold: 0.85, // 85% similar = cache hit
};

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a normalized cache key from a query
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u1780-\u17FF]/g, '') // Keep Khmer characters
      .replace(/\s+/g, ' ')
      .slice(0, 200); // Limit key length
  }

  /**
   * Calculate similarity between two strings (Jaccard similarity)
   */
  private calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.split(' '));
    const wordsB = new Set(b.split(' '));
    
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    
    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Get a cached response if available
   */
  get(query: string): string | null {
    const normalizedKey = this.normalizeQuery(query);
    
    // Exact match
    if (this.cache.has(normalizedKey)) {
      const entry = this.cache.get(normalizedKey)!;
      if (Date.now() - entry.timestamp < this.config.ttlMs) {
        entry.hits++;
        console.log(`[Cache] Hit (exact) for: "${query.slice(0, 50)}..."`);
        return entry.response;
      }
      // Expired
      this.cache.delete(normalizedKey);
    }

    // Fuzzy match
    for (const [key, entry] of this.cache) {
      if (Date.now() - entry.timestamp >= this.config.ttlMs) {
        this.cache.delete(key);
        continue;
      }

      const similarity = this.calculateSimilarity(normalizedKey, key);
      if (similarity >= this.config.similarityThreshold) {
        entry.hits++;
        console.log(`[Cache] Hit (fuzzy ${(similarity * 100).toFixed(0)}%) for: "${query.slice(0, 50)}..."`);
        return entry.response;
      }
    }

    return null;
  }

  /**
   * Store a response in cache
   */
  set(query: string, response: string): void {
    // Don't cache very short responses
    if (response.length < 20) return;

    // Don't cache error messages
    if (response.includes('សូមអភ័យទោស') || response.includes('Error')) return;

    const normalizedKey = this.normalizeQuery(query);

    // Evict oldest if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(normalizedKey, {
      key: normalizedKey,
      response,
      timestamp: Date.now(),
      hits: 0,
    });

    console.log(`[Cache] Stored response for: "${query.slice(0, 50)}..." (total: ${this.cache.size})`);
  }

  /**
   * Evict the oldest/least used entry
   */
  private evictOldest() {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestKey = key;
        oldestTime = entry.timestamp;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp >= this.config.ttlMs) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`[Cache] Cleaned up ${cleared} expired entries`);
    }

    return cleared;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate: number; totalHits: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      totalHits,
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    console.log('[Cache] Cleared all entries');
  }
}

// Singleton instance
let cacheInstance: ResponseCache | null = null;

export function getResponseCache(): ResponseCache {
  if (!cacheInstance) {
    cacheInstance = new ResponseCache();
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      cacheInstance?.cleanup();
    }, 300_000);
  }
  return cacheInstance;
}

export type { CacheEntry, CacheConfig };
