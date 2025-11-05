/**
 * Evaluation context for query execution
 *
 * Tracks state during query evaluation including current position,
 * filter context, and caching information.
 */

import type { TONLValue } from '../types.js';

/**
 * Evaluation context - tracks state during query execution
 * SECURITY FIX (BF012): Added iteration tracking to prevent query DoS
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
   * Maximum iterations (nodes visited) to prevent DoS
   * SECURITY FIX (BF012): Default 100,000 iterations
   */
  maxIterations: number;

  /**
   * Current iteration count
   * SECURITY FIX (BF012): Tracks total nodes visited
   */
  iterations: number;

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
    maxIterations?: number;
    enableCache?: boolean;
  } = {}
): EvaluationContext {
  const { maxDepth = 100, maxIterations = 100_000, enableCache = true } = options;

  return {
    root,
    maxDepth,
    currentDepth: 0,
    maxIterations,
    iterations: 0,
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
    maxIterations: parent.maxIterations,
    iterations: parent.iterations, // Share iteration counter
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
 * Check and increment iteration counter
 * SECURITY FIX (BF012): Prevents query DoS via excessive iterations
 */
export function checkIterationLimit(context: EvaluationContext): void {
  context.iterations++;

  if (context.iterations > context.maxIterations) {
    throw new Error(
      `Query iteration limit exceeded: ${context.iterations} (max: ${context.maxIterations}). ` +
      `This may indicate an overly complex query or deeply nested data structure.`
    );
  }
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
