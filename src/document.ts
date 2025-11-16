/**
 * TONLDocument - Main document class for TONL Query & Navigation API
 *
 * Provides a high-level interface for working with TONL documents including
 * querying, navigation, and export capabilities.
 */

import type { TONLValue, EncodeOptions, DecodeOptions } from './types.js';
import { encodeTONL } from './encode.js';
import { decodeTONL } from './decode.js';
import { parsePath, QueryEvaluator, resetGlobalCache } from './query/index.js';
import { entries, keys, values, deepEntries, deepKeys, deepValues, walk, type WalkCallback, type WalkOptions, countNodes, find, findAll, some, every } from './navigation/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { promises as fs } from 'fs';
import { set as setByPath, deleteValue as deleteByPath, push as pushToArray, pop as popFromArray, merge as mergeAtPath, diff as diffDocuments, formatDiff, type DiffResult } from './modification/index.js';
import { IndexManager, type IndexOptions, type IIndex } from './indexing/index.js';
import { parseSchema, validateTONL, type ValidationResult } from './schema/index.js';

/**
 * Document statistics
 */
export interface DocumentStats {
  /**
   * Size in bytes (TONL format)
   */
  sizeBytes: number;

  /**
   * Total number of nodes in the tree
   */
  nodeCount: number;

  /**
   * Maximum depth of the tree
   */
  maxDepth: number;

  /**
   * Number of arrays in the document
   */
  arrayCount: number;

  /**
   * Number of objects in the document
   */
  objectCount: number;

  /**
   * Number of primitive values
   */
  primitiveCount: number;
}

/**
 * TONLDocument class - main interface for TONL documents
 *
 * @example
 * ```typescript
 * // Parse from TONL string
 * const doc = TONLDocument.parse(tonlText);
 *
 * // Query document
 * const name = doc.get('user.name');
 * const admins = doc.query('users[?(@.role == "admin")]');
 *
 * // Navigate document
 * for (const [key, value] of doc.entries()) {
 *   console.log(`${key}: ${value}`);
 * }
 *
 * // Export
 * const json = doc.toJSON();
 * const tonl = doc.toTONL();
 * ```
 */
export class TONLDocument {
  private data: TONLValue;
  private evaluator: QueryEvaluator;
  private indexManager: IndexManager;

  /**
   * Private constructor - use static factory methods
   */
  private constructor(data: TONLValue) {
    this.data = data;
    this.evaluator = new QueryEvaluator(data);
    this.indexManager = new IndexManager(data);
  }

  // ========================================
  // Static Factory Methods
  // ========================================

  /**
   * Parse a TONL string into a document
   *
   * @param tonlText - TONL format string
   * @param options - Decode options
   * @returns TONLDocument instance
   */
  static parse(tonlText: string, options?: DecodeOptions): TONLDocument {
    const data = decodeTONL(tonlText, options);
    return new TONLDocument(data);
  }

  /**
   * Create a document from JSON data
   *
   * @param data - JavaScript object or array
   * @returns TONLDocument instance
   */
  static fromJSON(data: any): TONLDocument {
    return new TONLDocument(data);
  }

  /**
   * Load a TONL document from a file synchronously
   *
   * @param path - File path
   * @returns TONLDocument instance
   */
  static fromFileSync(path: string): TONLDocument {
    const content = readFileSync(path, 'utf-8');
    return TONLDocument.parse(content);
  }

  /**
   * Load a TONL document from a file asynchronously
   *
   * @param path - File path
   * @returns Promise<TONLDocument>
   */
  static async fromFile(path: string): Promise<TONLDocument> {
    const content = await fs.readFile(path, 'utf-8');
    return TONLDocument.parse(content);
  }

  /**
   * Load a TONL document from a file (alias for fromFileSync)
   *
   * @param path - File path
   * @returns TONLDocument instance
   *
   * @example
   * ```typescript
   * const doc = TONLDocument.load('data.tonl');
   * ```
   */
  static load(path: string): TONLDocument {
    return TONLDocument.fromFileSync(path);
  }

  // ========================================
  // Query Methods
  // ========================================

  /**
   * Get a value at a specific path
   *
   * @param pathExpression - Path expression (e.g., "user.name", "users[0].id")
   * @returns Value at path or undefined if not found
   *
   * @example
   * ```typescript
   * const name = doc.get('user.name');
   * const firstUser = doc.get('users[0]');
   * ```
   */
  get(pathExpression: string): any {
    const parseResult = parsePath(pathExpression);
    if (!parseResult.success) {
      throw parseResult.error!;
    }
    return this.evaluator.evaluate(parseResult.ast);
  }

  /**
   * Query the document with a path expression
   *
   * This is an alias for get() but semantically clearer for complex queries
   *
   * @param pathExpression - Path expression with wildcards, filters, etc.
   * @returns Query result (may be array for wildcards/filters)
   */
  query(pathExpression: string): any {
    try {
      const result = this.get(pathExpression);
      return result;
    } catch (error) {
      // For parsing errors, return empty array instead of throwing
      if (error instanceof Error && (
          error.message.includes('Expected property name') ||
          error.message.includes('Unexpected character') ||
          error.message.includes('ParseError'))) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Check if a path exists in the document
   *
   * @param pathExpression - Path expression
   * @returns True if path exists, false otherwise
   */
  exists(pathExpression: string): boolean {
    const parseResult = parsePath(pathExpression);
    if (!parseResult.success) {
      return false;
    }
    return this.evaluator.exists(parseResult.ast);
  }

  /**
   * Get the type of value at a path
   *
   * @param pathExpression - Path expression
   * @returns Type string or undefined if path doesn't exist
   */
  typeOf(pathExpression: string): string | undefined {
    const parseResult = parsePath(pathExpression);
    if (!parseResult.success) {
      return undefined;
    }
    return this.evaluator.typeOf(parseResult.ast);
  }

  // ========================================
  // Navigation Methods
  // ========================================

  /**
   * Iterate over [key, value] pairs at the root level
   *
   * @returns Iterator of [key, value] pairs
   */
  *entries(): Generator<[string, any], void, undefined> {
    yield* entries(this.data);
  }

  /**
   * Iterate over keys at the root level
   *
   * @returns Iterator of keys
   */
  *keys(): Generator<string, void, undefined> {
    yield* keys(this.data);
  }

  /**
   * Iterate over values at the root level
   *
   * @returns Iterator of values
   */
  *values(): Generator<any, void, undefined> {
    yield* values(this.data);
  }

  /**
   * Recursively iterate over all [path, value] pairs
   *
   * @param maxDepth - Maximum recursion depth
   * @returns Iterator of [path, value] pairs
   */
  *deepEntries(maxDepth?: number): Generator<[string, any], void, undefined> {
    yield* deepEntries(this.data, '', maxDepth);
  }

  /**
   * Recursively iterate over all paths
   *
   * @param maxDepth - Maximum recursion depth
   * @returns Iterator of paths
   */
  *deepKeys(maxDepth?: number): Generator<string, void, undefined> {
    yield* deepKeys(this.data, '', maxDepth);
  }

  /**
   * Recursively iterate over all values
   *
   * @param maxDepth - Maximum recursion depth
   * @returns Iterator of values
   */
  *deepValues(maxDepth?: number): Generator<any, void, undefined> {
    yield* deepValues(this.data, maxDepth);
  }

  /**
   * Walk the document tree with a callback
   *
   * @param callback - Function called for each node
   * @param options - Walk options
   */
  walk(callback: WalkCallback, options?: WalkOptions): void {
    walk(this.data, callback, options);
  }

  /**
   * Count total number of nodes in the document
   *
   * @returns Node count
   */
  countNodes(): number {
    return countNodes(this.data);
  }

  /**
   * Find a value matching a predicate
   *
   * @param predicate - Test function
   * @returns First matching value or undefined
   */
  find(predicate: (value: any, path: string) => boolean): any {
    return find(this.data, predicate);
  }

  /**
   * Find all values matching a predicate
   *
   * @param predicate - Test function
   * @returns Array of matching values
   */
  findAll(predicate: (value: any, path: string) => boolean): any[] {
    return findAll(this.data, predicate);
  }

  /**
   * Check if any value matches a predicate
   *
   * @param predicate - Test function
   * @returns True if any match
   */
  some(predicate: (value: any, path: string) => boolean): boolean {
    return some(this.data, predicate);
  }

  /**
   * Check if all values match a predicate
   *
   * @param predicate - Test function
   * @returns True if all match
   */
  every(predicate: (value: any, path: string) => boolean): boolean {
    return every(this.data, predicate);
  }

  // ========================================
  // Export Methods
  // ========================================

  /**
   * Convert to JavaScript object/array
   *
   * @returns The underlying data
   */
  toJSON(): any {
    return this.data;
  }

  /**
   * Convert to TONL format string
   *
   * @param options - Encoding options
   * @returns TONL format string
   */
  toTONL(options?: EncodeOptions): string {
    return encodeTONL(this.data, options);
  }

  /**
   * Save document to a file synchronously
   *
   * @param path - File path
   * @param options - Encoding options
   */
  saveSync(path: string, options?: EncodeOptions): void {
    const tonl = this.toTONL(options);
    writeFileSync(path, tonl, 'utf-8');
  }

  /**
   * Save document to a file asynchronously
   *
   * @param path - File path
   * @param options - Encoding options
   */
  async save(path: string, options?: EncodeOptions): Promise<void> {
    const tonl = this.toTONL(options);
    await fs.writeFile(path, tonl, 'utf-8');
  }

  // ========================================
  // Metadata & Statistics
  // ========================================

  /**
   * Get document size in bytes (TONL format)
   *
   * @returns Size in bytes
   */
  size(): number {
    const tonl = this.toTONL();
    return Buffer.byteLength(tonl, 'utf-8');
  }

  /**
   * Get detailed document statistics
   *
   * @returns Document statistics
   */
  stats(): DocumentStats {
    let maxDepth = 0;
    let arrayCount = 0;
    let objectCount = 0;
    let primitiveCount = 0;

    this.walk((path, value, depth) => {
      maxDepth = Math.max(maxDepth, depth);

      if (Array.isArray(value)) {
        arrayCount++;
      } else if (typeof value === 'object' && value !== null) {
        objectCount++;
      } else {
        primitiveCount++;
      }
    });

    return {
      sizeBytes: this.size(),
      nodeCount: this.countNodes(),
      maxDepth,
      arrayCount,
      objectCount,
      primitiveCount
    };
  }

  /**
   * Get the raw data (for advanced use cases)
   *
   * @returns The underlying data
   */
  getData(): TONLValue {
    return this.data;
  }

  // ========================================
  // Modification Methods (NEW in v0.6.5!)
  // ========================================

  /**
   * Set a value at a specific path
   *
   * @param pathExpression - Path expression
   * @param value - Value to set
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * doc.set('user.name', 'Alice Smith');
   * doc.set('users[0].active', true);
   * doc.set('user.profile.age', 31);
   * ```
   */
  set(pathExpression: string, value: any): this {
    const result = setByPath(this.data, pathExpression, value);
    if (!result.success) {
      throw new Error(result.error || 'Set operation failed');
    }
    // Clear cache and recreate evaluator with updated data
    resetGlobalCache();
    this.evaluator = new QueryEvaluator(this.data);
    return this;
  }

  /**
   * Delete a value at a specific path
   */
  delete(pathExpression: string): this {
    const result = deleteByPath(this.data, pathExpression);
    if (!result.success) {
      throw new Error(result.error || 'Delete operation failed');
    }
    resetGlobalCache();
    this.evaluator = new QueryEvaluator(this.data);
    return this;
  }

  /**
   * Push to array
   */
  push(arrayPath: string, ...values: any[]): number {
    const length = pushToArray(this.data, arrayPath, ...values);
    resetGlobalCache();
    this.evaluator = new QueryEvaluator(this.data);
    return length;
  }

  /**
   * Pop from array
   */
  pop(arrayPath: string): any {
    const value = popFromArray(this.data, arrayPath);
    resetGlobalCache();
    this.evaluator = new QueryEvaluator(this.data);
    return value;
  }

  /**
   * Merge object at a specific path or at root level
   *
   * @overload
   * @param updates - Object to merge at root level
   * @returns this for chaining
   *
   * @overload
   * @param pathExpression - Path to merge at
   * @param updates - Object to merge
   * @returns this for chaining
   */
  merge(pathExpressionOrUpdates: string | Record<string, any>, updates?: Record<string, any>): this {
    // If only one argument, merge at root
    if (updates === undefined && typeof pathExpressionOrUpdates === 'object') {
      if (typeof this.data === 'object' && !Array.isArray(this.data) && this.data !== null) {
        Object.assign(this.data, pathExpressionOrUpdates);
      }
    } else if (typeof pathExpressionOrUpdates === 'string' && updates) {
      // Two arguments: merge at specific path
      mergeAtPath(this.data, pathExpressionOrUpdates, updates);
    }

    resetGlobalCache();
    this.evaluator = new QueryEvaluator(this.data);
    return this;
  }

  // ========================================
  // Change Tracking & Diff (NEW in v0.6.5!)
  // ========================================

  /**
   * Compare this document with another and get a diff
   *
   * @param other - The other document to compare with
   * @returns Diff result with all changes
   *
   * @example
   * ```typescript
   * const doc1 = TONLDocument.fromJSON({ a: 1, b: 2 });
   * const doc2 = TONLDocument.fromJSON({ a: 1, b: 3, c: 4 });
   * const diff = doc1.diff(doc2);
   * console.log(diff.summary); // { added: 1, modified: 1, deleted: 0, total: 2 }
   * ```
   */
  diff(other: TONLDocument): DiffResult {
    return diffDocuments(this.data, other.data);
  }

  /**
   * Get a formatted string representation of changes between documents
   *
   * @param other - The other document to compare with
   * @returns Human-readable diff string
   */
  diffString(other: TONLDocument): string {
    const diffResult = this.diff(other);
    return formatDiff(diffResult);
  }

  /**
   * Create a snapshot of the current document state
   *
   * @returns A new document with a deep copy of current data
   */
  snapshot(): TONLDocument {
    return TONLDocument.fromJSON(JSON.parse(JSON.stringify(this.data)));
  }

  // ========================================
  // Indexing (NEW in v0.7.0!)
  // ========================================

  /**
   * Create an index on specified fields
   *
   * @overload
   * @param name - Index name
   * @param path - Path expression to index
   * @param type - Index type ('hash' or 'btree')
   * @returns The created index
   *
   * @overload
   * @param options - Index options
   * @returns The created index
   *
   * @example
   * ```typescript
   * // Simple 3-argument signature
   * doc.createIndex('userById', 'users[*].id', 'hash');
   * doc.createIndex('userByAge', 'users[*].age', 'btree');
   *
   * // Full options signature
   * doc.createIndex({ name: 'userIdIndex', fields: ['id'], unique: true });
   *
   * // Create btree index for range queries
   * doc.createIndex({ name: 'ageIndex', fields: ['age'], type: 'btree' });
   *
   * // Create compound index on multiple fields
   * doc.createIndex({ name: 'nameAgeIndex', fields: ['name', 'age'] });
   * ```
   */
  createIndex(nameOrOptions: string | IndexOptions, path?: string, type?: 'hash' | 'btree'): IIndex {
    // 3-argument signature: createIndex('name', 'path', 'type')
    if (typeof nameOrOptions === 'string' && path !== undefined) {
      return this.createSimpleIndex(nameOrOptions, path, type || 'hash');
    }

    // Object signature: createIndex({ name, fields, type })
    return this.indexManager.createIndex(nameOrOptions as IndexOptions);
  }

  /**
   * Get an index by name
   */
  getIndex(name: string): IIndex | undefined {
    return this.indexManager.getIndex(name);
  }

  /**
   * Drop an index
   */
  dropIndex(name: string): boolean {
    return this.indexManager.dropIndex(name);
  }

  /**
   * List all index names
   */
  listIndices(): string[] {
    return this.indexManager.listIndices();
  }

  /**
   * Get statistics for all indices
   */
  indexStats(): Record<string, any> {
    return this.indexManager.getStats();
  }

  /**
   * Alias for indexStats() - for consistency with test expectations
   */
  getIndexStats(): Record<string, any> {
    return this.indexStats();
  }

  // ========================================
  // Additional Methods for Feature Completeness
  // ========================================

  /**
   * Get query cache statistics
   *
   * @returns Cache statistics with hits, misses, and hit rate
   *
   * @example
   * ```typescript
   * const stats = doc.getCacheStats();
   * console.log(`Cache hit rate: ${stats.hitRate}%`);
   * ```
   *
   * BUG-007 FIX: Now returns accurate misses from cache stats
   */
  getCacheStats(): { hits: number; misses: number; hitRate: number; size: number } {
    const cacheStats = this.evaluator.getCacheStats();
    // BUG-007 FIX: Use actual misses from cache stats instead of incorrect calculation
    return {
      hits: cacheStats.totalHits,
      misses: cacheStats.totalMisses,  // BUG-007 FIX: Now accurate
      hitRate: cacheStats.hitRate,
      size: cacheStats.size
    };
  }

  /**
   * Restore document state from a snapshot
   *
   * @param snapshot - Document snapshot to restore from
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * const snapshot = doc.snapshot();
   * doc.set('user.name', 'New Name');
   * doc.restore(snapshot); // Reverts to original state
   * ```
   */
  restore(snapshot: TONLDocument): this {
    this.data = JSON.parse(JSON.stringify(snapshot.data));
    resetGlobalCache();
    this.evaluator = new QueryEvaluator(this.data);
    this.indexManager = new IndexManager(this.data);
    return this;
  }


  /**
   * Create a simple hash or btree index (private helper)
   *
   * @param name - Index name
   * @param path - Path expression to index
   * @param type - Index type ('hash' or 'btree')
   * @returns The created index
   */
  private createSimpleIndex(name: string, path: string, type: 'hash' | 'btree' = 'hash'): IIndex {
    // Extract field name from path (e.g., 'users[*].id' -> 'id')
    const fieldMatch = path.match(/\.([^.\[\]]+)$/);
    const fieldName = fieldMatch ? fieldMatch[1] : path;

    // Create the index using field name (not full path expression)
    return this.indexManager.createIndex({
      name,
      fields: [fieldName],
      type
    });
  }

  /**
   * Query an index by exact value
   *
   * @param indexName - Name of the index
   * @param value - Value to look up
   * @returns Matching document or undefined
   *
   * @example
   * ```typescript
   * const user = doc.queryIndex('userById', 123);
   * ```
   */
  queryIndex(indexName: string, value: any): any {
    const index = this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index ${indexName} not found`);
    }

    const paths = index.find(value);
    if (!paths || paths.length === 0) {
      return undefined;
    }

    // Path might be 'users[1].id' but we want 'users[1]'
    // Remove the last field from path to get parent object
    let documentPath = paths[0];
    const lastDotIndex = documentPath.lastIndexOf('.');
    if (lastDotIndex > 0) {
      documentPath = documentPath.substring(0, lastDotIndex);
    }

    // Return the matching document
    return this.get(documentPath);
  }

  /**
   * Query an index with range (for btree indices)
   *
   * @param indexName - Name of the btree index
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @returns Array of matching documents
   *
   * @example
   * ```typescript
   * const users = doc.queryIndexRange('userByAge', 25, 35);
   * ```
   */
  queryIndexRange(indexName: string, min: any, max: any): any[] {
    const index = this.getIndex(indexName);
    if (!index) {
      throw new Error(`Index ${indexName} not found`);
    }

    if (!index.range) {
      throw new Error(`Index ${indexName} does not support range queries (use btree index)`);
    }

    const paths = index.range(min, max);
    if (!paths || paths.length === 0) {
      return [];
    }

    // Path might be 'users[1].age' but we want 'users[1]'
    // Remove the last field from path to get parent object
    return paths.map((path: string) => {
      const lastDotIndex = path.lastIndexOf('.');
      const documentPath = lastDotIndex > 0 ? path.substring(0, lastDotIndex) : path;
      return this.get(documentPath);
    }).filter((v: any) => v !== undefined);
  }

  /**
   * Create a compound index on multiple fields
   *
   * @param name - Index name
   * @param paths - Array of path expressions
   * @param type - Index type ('hash' or 'btree', default 'hash')
   * @returns The created compound index
   *
   * @example
   * ```typescript
   * doc.createCompoundIndex('userRoleAge', ['users[*].role', 'users[*].age']);
   * doc.createCompoundIndex('sortedUsers', ['users[*].age', 'users[*].name'], 'btree');
   * ```
   */
  createCompoundIndex(name: string, paths: string[], type: 'hash' | 'btree' = 'hash'): IIndex {
    return this.indexManager.createIndex({
      name,
      fields: paths,
      type
    });
  }

  /**
   * Validate document against a schema file
   *
   * @param schemaPath - Path to schema file (.schema.tonl)
   * @returns Validation result with detailed error information
   *
   * @example
   * ```typescript
   * const result = doc.validate('schemas/users.schema.tonl');
   * if (!result.valid) {
   *   console.error('Validation failed:', result.errors);
   * }
   * ```
   */
  validate(schemaPath: string): ValidationResult {
    // BUG-NEW-001 FIX: Implement schema validation using existing validation infrastructure
    // BUG-NEW-003 FIX: Remove console.warn from library code

    // Load and parse schema
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    const schema = parseSchema(schemaContent);

    // Validate document against schema
    return validateTONL(this.data, schema);
  }

  /**
   * Stream query results (for large result sets)
   *
   * @param pathExpression - Path expression to query
   * @returns Generator yielding results one at a time
   *
   * @example
   * ```typescript
   * for (const item of doc.stream('items[*]')) {
   *   console.log(item);
   * }
   * ```
   */
  *stream(pathExpression: string): Generator<any, void, undefined> {
    const results = this.query(pathExpression);

    if (Array.isArray(results)) {
      for (const item of results) {
        yield item;
      }
    } else {
      yield results;
    }
  }
}
