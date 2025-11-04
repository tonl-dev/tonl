/**
 * TONLDocument - Browser-Safe Version
 *
 * Browser-compatible version excluding Node.js-specific features
 */

import type { TONLValue, EncodeOptions, DecodeOptions } from './types.js';
import { encodeTONL } from './encode.js';
import { decodeTONL } from './decode.js';
import { parsePath, QueryEvaluator, resetGlobalCache } from './query/index.js';
import { entries, keys, values, deepEntries, deepKeys, deepValues, walk, type WalkCallback, type WalkOptions, countNodes, find, findAll, some, every } from './navigation/index.js';
import { set } from './modification/setter.js';
import { deleteValue } from './modification/deleter.js';
import { push, pop } from './modification/array-ops.js';
import { merge } from './modification/transform.js';
import { diff, formatDiff, type DiffResult } from './modification/change-tracker.js';
import { IndexManager, type IndexOptions, type IIndex } from './indexing/index.js';

export interface DocumentStats {
  sizeBytes: number;
  nodeCount: number;
  maxDepth: number;
  arrayCount: number;
  objectCount: number;
  primitiveCount: number;
}

export class TONLDocumentBrowser {
  private data: TONLValue;
  private evaluator: QueryEvaluator;
  private indexManager: IndexManager;

  private constructor(data: TONLValue) {
    this.data = data;
    this.evaluator = new QueryEvaluator(data);
    this.indexManager = new IndexManager(data);
  }

  static parse(tonlText: string, options?: DecodeOptions): TONLDocumentBrowser {
    const data = decodeTONL(tonlText, options);
    return new TONLDocumentBrowser(data);
  }

  static fromJSON(data: any): TONLDocumentBrowser {
    return new TONLDocumentBrowser(data);
  }

  // Query methods
  get(pathExpression: string): any {
    const parseResult = parsePath(pathExpression);
    if (!parseResult.success) {
      throw parseResult.error!;
    }
    return this.evaluator.evaluate(parseResult.ast);
  }

  query(pathExpression: string): any {
    return this.get(pathExpression);
  }

  exists(pathExpression: string): boolean {
    const parseResult = parsePath(pathExpression);
    if (!parseResult.success) {
      return false;
    }
    return this.evaluator.exists(parseResult.ast);
  }

  typeOf(pathExpression: string): string | undefined {
    const parseResult = parsePath(pathExpression);
    if (!parseResult.success) {
      return undefined;
    }
    return this.evaluator.typeOf(parseResult.ast);
  }

  // Navigation
  entries(): IterableIterator<[string, any]> { return entries(this.data); }
  keys(): IterableIterator<string> { return keys(this.data); }
  values(): IterableIterator<any> { return values(this.data); }
  deepEntries(): Generator<[string, any], void, undefined> { return deepEntries(this.data); }
  deepKeys(): Generator<string, void, undefined> { return deepKeys(this.data); }
  deepValues(): Generator<any, void, undefined> { return deepValues(this.data); }
  walk(callback: WalkCallback, options?: WalkOptions): void { walk(this.data, callback, options); }
  countNodes(): number { return countNodes(this.data); }
  find(predicate: (value: any, path: string) => boolean): [string, any] | undefined { return find(this.data, predicate); }
  findAll(predicate: (value: any, path: string) => boolean): Array<[string, any]> { return findAll(this.data, predicate); }
  some(predicate: (value: any, path: string) => boolean): boolean { return some(this.data, predicate); }
  every(predicate: (value: any, path: string) => boolean): boolean { return every(this.data, predicate); }

  // Export
  toJSON(): any { return this.data; }
  toTONL(options?: EncodeOptions): string { return encodeTONL(this.data, options); }
  size(): number { return new Blob([this.toTONL()]).size; }

  stats(): DocumentStats {
    let maxDepth = 0, arrayCount = 0, objectCount = 0, primitiveCount = 0;
    this.walk((path, value, depth) => {
      maxDepth = Math.max(maxDepth, depth);
      if (Array.isArray(value)) arrayCount++;
      else if (typeof value === 'object' && value !== null) objectCount++;
      else primitiveCount++;
    });
    return { sizeBytes: this.size(), nodeCount: this.countNodes(), maxDepth, arrayCount, objectCount, primitiveCount };
  }

  getData(): TONLValue { return this.data; }

  // Modification
  set(pathExpression: string, value: any): this {
    const result = set(this.data, pathExpression, value);
    if (!result.success) throw new Error(result.error || 'Set failed');
    resetGlobalCache();
    this.evaluator = new QueryEvaluator(this.data);
    return this;
  }

  delete(pathExpression: string): this {
    const result = deleteValue(this.data, pathExpression);
    if (!result.success) throw new Error(result.error || 'Delete failed');
    resetGlobalCache();
    this.evaluator = new QueryEvaluator(this.data);
    return this;
  }

  push(arrayPath: string, ...values: any[]): number {
    const length = push(this.data, arrayPath, ...values);
    resetGlobalCache();
    this.evaluator = new QueryEvaluator(this.data);
    return length;
  }

  pop(arrayPath: string): any {
    const value = pop(this.data, arrayPath);
    resetGlobalCache();
    this.evaluator = new QueryEvaluator(this.data);
    return value;
  }

  merge(pathExpression: string, updates: Record<string, any>): this {
    merge(this.data, pathExpression, updates);
    resetGlobalCache();
    this.evaluator = new QueryEvaluator(this.data);
    return this;
  }

  // Change tracking
  diff(other: TONLDocumentBrowser): DiffResult { return diff(this.data, other.data); }
  diffString(other: TONLDocumentBrowser): string { return formatDiff(this.diff(other)); }
  snapshot(): TONLDocumentBrowser { return TONLDocumentBrowser.fromJSON(JSON.parse(JSON.stringify(this.data))); }

  // Indexing
  createIndex(options: IndexOptions): IIndex { return this.indexManager.createIndex(options); }
  getIndex(name: string): IIndex | undefined { return this.indexManager.getIndex(name); }
  dropIndex(name: string): boolean { return this.indexManager.dropIndex(name); }
  listIndices(): string[] { return this.indexManager.listIndices(); }
  indexStats(): Record<string, any> { return this.indexManager.getStats(); }
}
