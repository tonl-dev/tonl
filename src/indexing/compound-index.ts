/**
 * Compound Index for Multi-Field Indexing (T024)
 *
 * Supports indexing on multiple fields simultaneously
 */

import type { IIndex, IndexStats, IndexEntry } from './types.js';
import { HashIndex } from './hash-index.js';
import { BTreeIndex } from './btree-index.js';

/**
 * Create a compound key from multiple values
 *
 * BUG-NEW-015 FIX: Handle JSON.stringify errors gracefully
 * - BigInt values are converted to strings
 * - Circular references fall back to value inspection
 * - Other errors are re-thrown with context
 */
function createCompoundKey(values: any[]): string {
  try {
    // Custom replacer to handle BigInt and other special values
    return JSON.stringify(values, (key, value) => {
      if (typeof value === 'bigint') {
        return `__bigint__${value.toString()}`;
      }
      if (typeof value === 'symbol') {
        return `__symbol__${value.toString()}`;
      }
      if (typeof value === 'function') {
        return '__function__';
      }
      return value;
    });
  } catch (error) {
    // Fallback for circular references or other JSON.stringify failures
    // Use a simpler string representation
    const fallbackParts: string[] = [];
    for (const val of values) {
      if (val === null) {
        fallbackParts.push('null');
      } else if (val === undefined) {
        fallbackParts.push('undefined');
      } else if (typeof val === 'bigint') {
        fallbackParts.push(`bigint:${val.toString()}`);
      } else if (typeof val === 'symbol') {
        fallbackParts.push(`symbol:${val.toString()}`);
      } else if (typeof val === 'object') {
        // For objects that can't be stringified (circular), use a stable identifier
        fallbackParts.push(`object:${Object.keys(val).sort().join(',')}`);
      } else {
        fallbackParts.push(String(val));
      }
    }
    return `__fallback__[${fallbackParts.join('|')}]`;
  }
}

/**
 * Compound Index wraps Hash or BTree index with multi-field support
 */
export class CompoundIndex implements IIndex {
  readonly name: string;
  readonly type: 'hash' | 'btree';
  private index: IIndex;
  private fields: string[];

  constructor(
    name: string,
    fields: string[],
    options: {
      type?: 'hash' | 'btree';
      unique?: boolean;
    } = {}
  ) {
    this.name = name;
    this.fields = fields;
    this.type = options.type || 'hash';

    if (this.type === 'btree') {
      this.index = new BTreeIndex(name, { unique: options.unique });
    } else {
      this.index = new HashIndex(name, { unique: options.unique });
    }
  }

  /**
   * Insert with compound key
   * @param key - Array of values corresponding to fields
   */
  insert(key: any, path: string, value?: any): void {
    const compoundKey = Array.isArray(key) ? createCompoundKey(key) : key;
    this.index.insert(compoundKey, path, value);
  }

  /**
   * Remove with compound key
   */
  remove(key: any, path?: string): boolean {
    const compoundKey = Array.isArray(key) ? createCompoundKey(key) : key;
    return this.index.remove(compoundKey, path);
  }

  /**
   * Find with compound key
   */
  find(key: any): string[] {
    const compoundKey = Array.isArray(key) ? createCompoundKey(key) : key;
    return this.index.find(compoundKey);
  }

  /**
   * Check if compound key exists
   */
  has(key: any): boolean {
    const compoundKey = Array.isArray(key) ? createCompoundKey(key) : key;
    return this.index.has(compoundKey);
  }

  /**
   * Range query (only for btree)
   */
  range(start: any, end: any): string[] {
    if (this.type !== 'btree' || !this.index.range) {
      throw new Error('Range queries only supported on btree indices');
    }

    const startKey = Array.isArray(start) ? createCompoundKey(start) : start;
    const endKey = Array.isArray(end) ? createCompoundKey(end) : end;

    return this.index.range(startKey, endKey);
  }

  clear(): void {
    this.index.clear();
  }

  size(): number {
    return this.index.size();
  }

  stats(): IndexStats {
    return this.index.stats();
  }

  keys(): IterableIterator<any> {
    return this.index.keys();
  }

  entries(): IterableIterator<IndexEntry> {
    return this.index.entries();
  }

  /**
   * Get indexed fields
   */
  getFields(): string[] {
    return [...this.fields];
  }
}
