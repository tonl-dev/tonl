/**
 * Evaluation context for query execution
 *
 * Tracks state during query evaluation including current position,
 * filter context, and caching information.
 */

import type { TONLValue } from '../types.js';

/**
 * Evaluation context - tracks state during query execution
 */
export interface EvaluationContext {
  /**
   * The root document being queried
   */
  root: TONLValue;

  /**
   * Current value being evaluated (for filter expressions with @)
   */
  current?: TONLValue;

  /**
   * Maximum recursion depth to prevent infinite loops
   */
  maxDepth: number;

  /**
   * Current recursion depth
   */
  currentDepth: number;

  /**
   * Whether to enable query result caching
   */
  enableCache: boolean;

  /**
   * Cache of evaluated queries (path string -> result)
   */
  cache?: Map<string, any>;
}

/**
 * Create a new evaluation context
 */
export function createContext(
  root: TONLValue,
  options: {
    maxDepth?: number;
    enableCache?: boolean;
  } = {}
): EvaluationContext {
  const { maxDepth = 100, enableCache = true } = options;

  return {
    root,
    maxDepth,
    currentDepth: 0,
    enableCache,
    cache: enableCache ? new Map() : undefined
  };
}

/**
 * Create a child context for nested evaluation
 */
export function createChildContext(
  parent: EvaluationContext,
  current: TONLValue
): EvaluationContext {
  return {
    root: parent.root,
    current,
    maxDepth: parent.maxDepth,
    currentDepth: parent.currentDepth + 1,
    enableCache: parent.enableCache,
    cache: parent.cache // Share cache with parent
  };
}

/**
 * Check if recursion depth limit has been reached
 */
export function isMaxDepthReached(context: EvaluationContext): boolean {
  return context.currentDepth >= context.maxDepth;
}

/**
 * Get cached result for a path
 */
export function getCachedResult(
  context: EvaluationContext,
  pathKey: string
): any | undefined {
  if (!context.enableCache || !context.cache) {
    return undefined;
  }
  return context.cache.get(pathKey);
}

/**
 * Cache a query result
 */
export function cacheResult(
  context: EvaluationContext,
  pathKey: string,
  result: any
): void {
  if (context.enableCache && context.cache) {
    context.cache.set(pathKey, result);
  }
}

/**
 * Clear the query cache
 */
export function clearCache(context: EvaluationContext): void {
  if (context.cache) {
    context.cache.clear();
  }
}

/**
 * Generate a cache key from path nodes
 */
export function generateCacheKey(pathNodes: any[]): string {
  return JSON.stringify(pathNodes);
}
