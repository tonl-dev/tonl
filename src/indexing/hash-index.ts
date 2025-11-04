/**
 * Hash-based index for O(1) lookups (T022)
 *
 * Provides fast key-based lookups using a hash table.
 * Best for exact matches and equality queries.
 */

import type { IIndex, IndexStats, IndexEntry } from './types.js';

export class HashIndex implements IIndex {
  readonly name: string;
  readonly type: 'hash' = 'hash';
  private index: Map<any, Set<string>> = new Map();
  private unique: boolean;
  private caseInsensitive: boolean;

  constructor(name: string, options: { unique?: boolean; caseInsensitive?: boolean } = {}) {
    this.name = name;
    this.unique = options.unique || false;
    this.caseInsensitive = options.caseInsensitive || false;
  }

  /**
   * Normalize key for case-insensitive comparison
   */
  private normalizeKey(key: any): any {
    if (this.caseInsensitive && typeof key === 'string') {
      return key.toLowerCase();
    }
    return key;
  }

  /**
   * Insert entry into index
   */
  insert(key: any, path: string, value?: any): void {
    const normalizedKey = this.normalizeKey(key);

    if (this.unique && this.index.has(normalizedKey)) {
      throw new Error(`Duplicate key in unique index '${this.name}': ${key}`);
    }

    let paths = this.index.get(normalizedKey);
    if (!paths) {
      paths = new Set();
      this.index.set(normalizedKey, paths);
    }

    paths.add(path);
  }

  /**
   * Remove entry from index
   */
  remove(key: any, path?: string): boolean {
    const normalizedKey = this.normalizeKey(key);
    const paths = this.index.get(normalizedKey);

    if (!paths) {
      return false;
    }

    if (path) {
      // Remove specific path
      const deleted = paths.delete(path);
      if (paths.size === 0) {
        this.index.delete(normalizedKey);
      }
      return deleted;
    } else {
      // Remove all paths for this key
      this.index.delete(normalizedKey);
      return true;
    }
  }

  /**
   * Find paths by key
   */
  find(key: any): string[] {
    const normalizedKey = this.normalizeKey(key);
    const paths = this.index.get(normalizedKey);
    return paths ? Array.from(paths) : [];
  }

  /**
   * Check if key exists
   */
  has(key: any): boolean {
    const normalizedKey = this.normalizeKey(key);
    return this.index.has(normalizedKey);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.index.clear();
  }

  /**
   * Get number of unique keys
   */
  size(): number {
    return this.index.size;
  }

  /**
   * Get index statistics
   */
  stats(): IndexStats {
    let totalPaths = 0;
    let maxCollisions = 0;
    let collisionCount = 0;

    for (const paths of this.index.values()) {
      totalPaths += paths.size;
      if (paths.size > 1) {
        collisionCount++;
        maxCollisions = Math.max(maxCollisions, paths.size);
      }
    }

    // Estimate memory usage
    const memoryUsage = this.index.size * (32 + 16) + totalPaths * 64; // Rough estimate

    return {
      size: this.index.size,
      memoryUsage,
      type: 'hash',
      unique: this.unique,
      collisions: collisionCount
    };
  }

  /**
   * Get all keys
   */
  *keys(): IterableIterator<any> {
    yield* this.index.keys();
  }

  /**
   * Get all entries
   */
  *entries(): IterableIterator<IndexEntry> {
    for (const [key, paths] of this.index) {
      for (const path of paths) {
        yield { key, path };
      }
    }
  }
}
