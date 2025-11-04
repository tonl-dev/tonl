/**
 * Types for TONL Indexing System (T021)
 */

export type IndexType = 'hash' | 'btree';

export interface IndexOptions {
  /**
   * Index name
   */
  name: string;

  /**
   * Fields to index (path expressions)
   */
  fields: string[];

  /**
   * Unique constraint
   */
  unique?: boolean;

  /**
   * Index type
   */
  type?: IndexType;

  /**
   * Case-insensitive for string keys
   */
  caseInsensitive?: boolean;
}

export interface IndexEntry {
  /**
   * Index key (extracted value or compound key)
   */
  key: any;

  /**
   * Document path to the indexed item
   */
  path: string;

  /**
   * Original value (for validation)
   */
  value?: any;
}

export interface IndexStats {
  /**
   * Number of entries in index
   */
  size: number;

  /**
   * Memory usage estimate (bytes)
   */
  memoryUsage: number;

  /**
   * Index type
   */
  type: IndexType;

  /**
   * Is unique index
   */
  unique: boolean;

  /**
   * Number of collisions (for hash)
   */
  collisions?: number;

  /**
   * Tree depth (for btree)
   */
  depth?: number;
}

export interface IndexQueryResult {
  /**
   * Matching paths
   */
  paths: string[];

  /**
   * Number of results
   */
  count: number;

  /**
   * Query time in ms
   */
  queryTime?: number;
}

/**
 * Base interface for all index implementations
 */
export interface IIndex {
  /**
   * Index name
   */
  readonly name: string;

  /**
   * Index type
   */
  readonly type: IndexType;

  /**
   * Insert entry into index
   */
  insert(key: any, path: string, value?: any): void;

  /**
   * Remove entry from index
   */
  remove(key: any, path?: string): boolean;

  /**
   * Find entries by key
   */
  find(key: any): string[];

  /**
   * Check if key exists
   */
  has(key: any): boolean;

  /**
   * Clear all entries
   */
  clear(): void;

  /**
   * Get index size
   */
  size(): number;

  /**
   * Get index statistics
   */
  stats(): IndexStats;

  /**
   * Range query (for ordered indices like btree)
   */
  range?(start: any, end: any): string[];

  /**
   * Get all keys
   */
  keys(): IterableIterator<any>;

  /**
   * Get all entries
   */
  entries(): IterableIterator<IndexEntry>;
}
