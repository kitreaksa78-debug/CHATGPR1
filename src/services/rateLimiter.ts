/**
 * Rate Limiter
 * 
 * Limits requests per user/IP to prevent abuse.
 * Configurable limits per endpoint.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  chat: { windowMs: 60_000, maxRequests: 30 },      // 30 requests/minute
  search: { windowMs: 60_000, maxRequests: 20 },    // 20 searches/minute
  image: { windowMs: 60_000, maxRequests: 10 },     // 10 images/minute
  webhook: { windowMs: 60_000, maxRequests: 100 },  // 100 webhooks/minute
  default: { windowMs: 60_000, maxRequests: 60 },   // 60 requests/minute
};

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private configs: Record<string, RateLimitConfig>;

  constructor(configs: Partial<Record<string, RateLimitConfig>> = {}) {
    this.configs = { ...DEFAULT_CONFIGS, ...configs };
  }

  /**
   * Get client identifier from request
   */
  private getClientId(req: any): string {
    // Try to get real IP from headers
    const forwarded = req.headers?.['x-forwarded-for'];
    const realIp = req.headers?.['x-real-ip'];
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIp) {
      return realIp;
    }
    
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  /**
   * Check if request is allowed
   */
  check(clientId: string, endpoint: string = 'default'): { allowed: boolean; remaining: number; resetIn: number } {
    const config = this.configs[endpoint] || this.configs.default;
    const key = `${clientId}:${endpoint}`;
    const now = Date.now();

    let entry = this.store.get(key);

    // Create new entry or reset if window expired
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      this.store.set(key, entry);
    }

    entry.count++;

    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetIn = Math.max(0, entry.resetTime - now);

    if (!allowed) {
      console.log(`[RateLimiter] Blocked ${clientId} on ${endpoint} (${entry.count}/${config.maxRequests})`);
    }

    return { allowed, remaining, resetIn };
  }

  /**
   * Check rate limit from Express request
   */
  checkRequest(req: any, endpoint: string = 'default'): { allowed: boolean; remaining: number; resetIn: number } {
    const clientId = this.getClientId(req);
    return this.check(clientId, endpoint);
  }

  /**
   * Get status for a client
   */
  getStatus(clientId: string): Record<string, { count: number; limit: number; resetIn: number }> {
    const status: Record<string, { count: number; limit: number; resetIn: number }> = {};
    const now = Date.now();

    for (const [endpoint, config] of Object.entries(this.configs)) {
      const key = `${clientId}:${endpoint}`;
      const entry = this.store.get(key);

      if (entry && now < entry.resetTime) {
        status[endpoint] = {
          count: entry.count,
          limit: config.maxRequests,
          resetIn: Math.max(0, entry.resetTime - now),
        };
      }
    }

    return status;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.store) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
        cleared++;
      }
    }

    return cleared;
  }
}

// Singleton instance
let limiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!limiterInstance) {
    limiterInstance = new RateLimiter();
    
    // Cleanup every 5 minutes
    setInterval(() => {
      limiterInstance?.cleanup();
    }, 300_000);
  }
  return limiterInstance;
}

export type { RateLimitEntry, RateLimitConfig };
