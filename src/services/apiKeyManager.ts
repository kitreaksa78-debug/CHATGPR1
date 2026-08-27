/**
 * API Key Rotation Manager
 * 
 * Rotates between multiple Gemini API keys to avoid rate limits.
 * Each key gets its own quota (15,000 requests/day free tier).
 * With 10 keys = 150,000 requests/day capacity.
 */

interface ApiKeyEntry {
  key: string;
  index: number;
  lastUsed: number;
  errorCount: number;
  totalRequests: number;
  cooldownUntil?: number;
}

interface RotationConfig {
  maxErrorCount: number;      // Trip circuit breaker after N errors
  cooldownMs: number;         // Cooldown period after trip
  maxRequestsPerKey: number;  // Rotate after N requests (optional)
}

const DEFAULT_CONFIG: RotationConfig = {
  maxErrorCount: 5,           // 5 errors → cooldown
  cooldownMs: 60_000,         // 1 minute cooldown
  maxRequestsPerKey: 100,     // Rotate after 100 requests
};

class ApiKeyManager {
  private keys: ApiKeyEntry[] = [];
  private currentIndex = 0;
  private config: RotationConfig;

  constructor(config: Partial<RotationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadKeys();
  }

  /**
   * Load API keys from environment variables
   * Supports: GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
   */
  private loadKeys() {
    const keys: string[] = [];

    // Primary key
    const primaryKey = process.env.GEMINI_API_KEY;
    if (primaryKey) keys.push(primaryKey);

    // Additional keys (GEMINI_API_KEY_1 through GEMINI_API_KEY_10)
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key && !keys.includes(key)) {
        keys.push(key);
      }
    }

    // Initialize entries
    this.keys = keys.map((key, index) => ({
      key,
      index,
      lastUsed: 0,
      errorCount: 0,
      totalRequests: 0,
    }));

    console.log(`[ApiKeyManager] Loaded ${this.keys.length} API keys`);
  }

  /**
   * Get the next available API key
   * Skips keys in cooldown or with too many errors
   */
  getNextKey(): string | null {
    if (this.keys.length === 0) {
      console.error('[ApiKeyManager] No API keys available!');
      return null;
    }

    const now = Date.now();
    const startIndex = this.currentIndex;

    // Try to find an available key
    for (let i = 0; i < this.keys.length; i++) {
      const index = (startIndex + i) % this.keys.length;
      const entry = this.keys[index];

      // Check if key is in cooldown
      if (entry.cooldownUntil && now < entry.cooldownUntil) {
        continue;
      }

      // Check if key has too many errors
      if (entry.errorCount >= this.config.maxErrorCount) {
        // Set cooldown if not already set
        if (!entry.cooldownUntil) {
          entry.cooldownUntil = now + this.config.cooldownMs;
          console.log(`[ApiKeyManager] Key ${index} entering cooldown for ${this.config.cooldownMs / 1000}s`);
        }
        continue;
      }

      // Key is available!
      this.currentIndex = (index + 1) % this.keys.length;
      entry.lastUsed = now;
      entry.totalRequests++;

      return entry.key;
    }

    // All keys are in cooldown - reset the worst one
    console.warn('[ApiKeyManager] All keys in cooldown, resetting oldest cooldown');
    this.resetOldestCooldown();
    
    // Try again
    return this.getNextKey();
  }

  /**
   * Record a successful request
   */
  recordSuccess(key: string) {
    const entry = this.keys.find(k => k.key === key);
    if (entry) {
      entry.errorCount = Math.max(0, entry.errorCount - 1); // Decay errors
    }
  }

  /**
   * Record a failed request (rate limit, etc.)
   */
  recordFailure(key: string, isRateLimit: boolean = false) {
    const entry = this.keys.find(k => k.key === key);
    if (entry) {
      entry.errorCount++;
      
      if (isRateLimit) {
        // Immediately cooldown rate-limited keys
        entry.cooldownUntil = Date.now() + this.config.cooldownMs;
        console.log(`[ApiKeyManager] Key ${entry.index} rate limited, cooling down`);
      }
    }
  }

  /**
   * Reset the oldest cooldown to allow rotation to continue
   */
  private resetOldestCooldown() {
    let oldestEntry: ApiKeyEntry | null = null;
    let oldestTime = Infinity;

    for (const entry of this.keys) {
      if (entry.cooldownUntil && entry.cooldownUntil < oldestTime) {
        oldestEntry = entry;
        oldestTime = entry.cooldownUntil;
      }
    }

    if (oldestEntry) {
      oldestEntry.cooldownUntil = undefined;
      oldestEntry.errorCount = Math.max(0, oldestEntry.errorCount - 2);
      console.log(`[ApiKeyManager] Reset cooldown for key ${oldestEntry.index}`);
    }
  }

  /**
   * Get status of all keys
   */
  getStatus(): Array<{ index: number; available: boolean; requests: number; errors: number; cooldown: boolean }> {
    const now = Date.now();
    return this.keys.map((entry, i) => ({
      index: i,
      available: !entry.cooldownUntil || now >= entry.cooldownUntil,
      requests: entry.totalRequests,
      errors: entry.errorCount,
      cooldown: !!(entry.cooldownUntil && now < entry.cooldownUntil),
    }));
  }

  /**
   * Get total request count across all keys
   */
  getTotalRequests(): number {
    return this.keys.reduce((sum, e) => sum + e.totalRequests, 0);
  }

  /**
   * Get available key count
   */
  getAvailableCount(): number {
    const now = Date.now();
    return this.keys.filter(e => 
      (!e.cooldownUntil || now >= e.cooldownUntil) && 
      e.errorCount < this.config.maxErrorCount
    ).length;
  }
}

// Singleton instance
let managerInstance: ApiKeyManager | null = null;

export function getApiKeyManager(): ApiKeyManager {
  if (!managerInstance) {
    managerInstance = new ApiKeyManager();
  }
  return managerInstance;
}

export type { ApiKeyEntry, RotationConfig };
