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
 */
function createCompoundKey(values: any[]): string {
  return JSON.stringify(values);
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
