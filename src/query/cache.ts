/**
 * Query result caching for performance optimization
 *
 * Caches the results of evaluated queries to avoid redundant computations
 * when the same path is queried multiple times.
 */

/**
 * Query cache with LRU eviction policy
 */
export class QueryCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private accessOrder: string[]; // For LRU tracking

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  /**
   * Get a cached result
   */
  get(key: string): any | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Update access time and LRU order
    entry.lastAccess = Date.now();
    entry.hits++;
    this.updateAccessOrder(key);

    return entry.value;
  }

  /**
   * Set a cached result
   */
  set(key: string, value: any): void {
    // If cache is full, evict LRU item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      value,
      createdAt: Date.now(),
      lastAccess: Date.now(),
      hits: 0
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove a specific entry
   */
  delete(key: string): boolean {
    const removed = this.cache.delete(key);
    if (removed) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    }
    return removed;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.entries());
    const totalHits = entries.reduce((sum, [, entry]) => sum + entry.hits, 0);
    const avgHits = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      averageHits: avgHits,
      hitRate: totalHits > 0 ? totalHits / (totalHits + this.cache.size) : 0
    };
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    // Remove first item (least recently used)
    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Get size in bytes (approximate)
   */
  getSizeInBytes(): number {
    // Rough estimation
    return this.cache.size * 100; // Assume average 100 bytes per entry
  }
}

/**
 * Cache entry metadata
 */
interface CacheEntry {
  value: any;
  createdAt: number;
  lastAccess: number;
  hits: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  maxSize: number;
  totalHits: number;
  averageHits: number;
  hitRate: number;
}

/**
 * Global query cache instance (singleton)
 */
let globalCache: QueryCache | null = null;

/**
 * Get the global query cache
 */
export function getGlobalCache(): QueryCache {
  if (!globalCache) {
    globalCache = new QueryCache();
  }
  return globalCache;
}

/**
 * Reset the global cache
 */
export function resetGlobalCache(): void {
  globalCache = null;
}
