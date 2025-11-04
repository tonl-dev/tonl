/**
 * B-Tree Index for Range Queries (T023 - Simplified)
 *
 * Provides ordered index with range query support.
 * Uses a sorted array structure for simplicity while maintaining O(log n) operations.
 */

import type { IIndex, IndexStats, IndexEntry } from './types.js';

interface BTreeEntry {
  key: any;
  paths: Set<string>;
}

export class BTreeIndex implements IIndex {
  readonly name: string;
  readonly type: 'btree' = 'btree';
  private items: BTreeEntry[] = [];
  private unique: boolean;
  private compareFn: (a: any, b: any) => number;

  constructor(
    name: string,
    options: {
      unique?: boolean;
      compareFn?: (a: any, b: any) => number;
    } = {}
  ) {
    this.name = name;
    this.unique = options.unique || false;
    this.compareFn = options.compareFn || this.defaultCompare;
  }

  /**
   * Default comparison function
   */
  private defaultCompare(a: any, b: any): number {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;

    // Numbers
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // Strings
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }

    // Mixed types: convert to string
    return String(a).localeCompare(String(b));
  }

  /**
   * Binary search to find insertion point or exact match
   */
  private binarySearch(key: any): { found: boolean; index: number } {
    let left = 0;
    let right = this.items.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const cmp = this.compareFn(this.items[mid].key, key);

      if (cmp === 0) {
        return { found: true, index: mid };
      } else if (cmp < 0) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return { found: false, index: left };
  }

  /**
   * Insert entry into index
   */
  insert(key: any, path: string, value?: any): void {
    const { found, index } = this.binarySearch(key);

    if (found) {
      // Key exists
      if (this.unique) {
        throw new Error(`Duplicate key in unique index '${this.name}': ${key}`);
      }
      this.items[index].paths.add(path);
    } else {
      // Insert new entry
      const entry: BTreeEntry = {
        key,
        paths: new Set([path])
      };
      this.items.splice(index, 0, entry);
    }
  }

  /**
   * Remove entry from index
   */
  remove(key: any, path?: string): boolean {
    const { found, index } = this.binarySearch(key);

    if (!found) {
      return false;
    }

    const entry = this.items[index];

    if (path) {
      // Remove specific path
      const deleted = entry.paths.delete(path);
      if (entry.paths.size === 0) {
        this.items.splice(index, 1);
      }
      return deleted;
    } else {
      // Remove entire entry
      this.items.splice(index, 1);
      return true;
    }
  }

  /**
   * Find paths by key
   */
  find(key: any): string[] {
    const { found, index } = this.binarySearch(key);
    if (!found) {
      return [];
    }
    return Array.from(this.items[index].paths);
  }

  /**
   * Check if key exists
   */
  has(key: any): boolean {
    return this.binarySearch(key).found;
  }

  /**
   * Range query: find all entries between start and end (inclusive)
   */
  range(start: any, end: any): string[] {
    const results: string[] = [];

    for (const entry of this.items) {
      const cmpStart = this.compareFn(entry.key, start);
      const cmpEnd = this.compareFn(entry.key, end);

      if (cmpStart >= 0 && cmpEnd <= 0) {
        results.push(...entry.paths);
      }

      // Stop if we've passed the end
      if (cmpEnd > 0) {
        break;
      }
    }

    return results;
  }

  /**
   * Find entries greater than key
   */
  greaterThan(key: any, inclusive = false): string[] {
    const results: string[] = [];

    for (const entry of this.items) {
      const cmp = this.compareFn(entry.key, key);
      const matches = inclusive ? cmp >= 0 : cmp > 0;

      if (matches) {
        results.push(...entry.paths);
      }
    }

    return results;
  }

  /**
   * Find entries less than key
   */
  lessThan(key: any, inclusive = false): string[] {
    const results: string[] = [];

    for (const entry of this.items) {
      const cmp = this.compareFn(entry.key, key);
      const matches = inclusive ? cmp <= 0 : cmp < 0;

      if (matches) {
        results.push(...entry.paths);
      } else {
        break; // Sorted, no need to continue
      }
    }

    return results;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.items = [];
  }

  /**
   * Get number of unique keys
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Get index statistics
   */
  stats(): IndexStats {
    let totalPaths = 0;

    for (const entry of this.items) {
      totalPaths += entry.paths.size;
    }

    // Estimate memory usage
    const memoryUsage = this.items.length * (32 + 16) + totalPaths * 64;

    return {
      size: this.items.length,
      memoryUsage,
      type: 'btree',
      unique: this.unique,
      depth: Math.ceil(Math.log2(this.items.length + 1)) // Tree depth estimate
    };
  }

  /**
   * Get all keys in sorted order
   */
  *keys(): IterableIterator<any> {
    for (const entry of this.items) {
      yield entry.key;
    }
  }

  /**
   * Get all entries in sorted order
   */
  *entries(): IterableIterator<IndexEntry> {
    for (const entry of this.items) {
      for (const path of entry.paths) {
        yield { key: entry.key, path };
      }
    }
  }
}
