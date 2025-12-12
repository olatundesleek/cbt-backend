/**
 * Simple in-memory cache utility with TTL support
 * Provides fallback to direct fetch if cache fails
 * Works on both local and production (Render) environments
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Set a value in cache with optional TTL (in milliseconds)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (default: 30 minutes)
   */
  set(key, value, ttl = 30 * 60 * 1000) {
    try {
      // Clear existing timer if any
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }

      // Store the value with timestamp
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
        ttl,
      });

      // Set auto-expiration timer
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttl);

      this.timers.set(key, timer);

      console.log(`[Cache] Set: ${key} (TTL: ${ttl}ms)`);
      return true;
    } catch (err) {
      console.error(`[Cache] Error setting ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Get a value from cache if it exists and hasn't expired
   * @param {string} key - Cache key
   * @returns {any} Cached value or null if not found/expired
   */
  get(key) {
    try {
      const cached = this.cache.get(key);

      if (!cached) {
        console.log(`[Cache] Miss: ${key}`);
        return null;
      }

      // Check if expired (shouldn't happen due to timer, but safety check)
      const now = Date.now();
      const age = now - cached.timestamp;
      if (age > cached.ttl) {
        this.cache.delete(key);
        this.timers.delete(key);
        console.log(`[Cache] Expired: ${key}`);
        return null;
      }

      console.log(`[Cache] Hit: ${key} (Age: ${Math.round(age / 1000)}s)`);
      return cached.value;
    } catch (err) {
      console.error(`[Cache] Error getting ${key}:`, err.message);
      return null;
    }
  }

  /**
   * Invalidate a specific cache entry
   * @param {string} key - Cache key to invalidate
   */
  invalidate(key) {
    try {
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      this.cache.delete(key);
      console.log(`[Cache] Invalidated: ${key}`);
      return true;
    } catch (err) {
      console.error(`[Cache] Error invalidating ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll() {
    try {
      // Clear all timers
      this.timers.forEach((timer) => clearTimeout(timer));
      this.timers.clear();

      // Clear all cache
      const count = this.cache.size;
      this.cache.clear();
      console.log(`[Cache] Invalidated all (${count} entries)`);
      return true;
    } catch (err) {
      console.error("[Cache] Error invalidating all:", err.message);
      return false;
    }
  }

  /**
   * Get cache stats for monitoring
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

/**
 * Wrapper function for cached data retrieval with automatic fallback
 * @param {string} cacheKey - Key to store in cache
 * @param {Function} fetchFn - Async function to fetch data if cache miss
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise} Cached or fetched data
 */
export async function getCachedOrFetch(
  cacheKey,
  fetchFn,
  ttl = 30 * 60 * 1000
) {
  try {
    // Try to get from cache first
    const cached = cacheManager.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Cache miss or error - fetch fresh data
    console.log(`[Cache] Fetching fresh data for: ${cacheKey}`);
    const data = await fetchFn();

    // Try to cache the result, but don't fail if caching doesn't work
    try {
      cacheManager.set(cacheKey, data, ttl);
    } catch (err) {
      console.warn(
        `[Cache] Warning - couldn't cache ${cacheKey}:`,
        err.message
      );
      // Return data anyway - caching is optional
    }

    return data;
  } catch (err) {
    console.error(
      `[Cache] Error in getCachedOrFetch for ${cacheKey}:`,
      err.message
    );
    // If fetch also fails, re-throw the error
    throw err;
  }
}

export default cacheManager;
