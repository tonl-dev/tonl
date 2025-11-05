/**
 * Query Evaluator - Executes parsed path expressions against TONL documents
 *
 * Takes an AST from the path parser and evaluates it against actual data,
 * returning the matched values.
 */

import type {
  PathNode,
  PropertyNode,
  IndexNode,
  WildcardNode,
  RecursiveNode,
  SliceNode,
  FilterNode
} from './types.js';
import type { TONLValue } from '../types.js';
import { createContext, createChildContext, isMaxDepthReached, checkIterationLimit, type EvaluationContext } from './context.js';
import { QueryCache, getGlobalCache } from './cache.js';
import { evaluateFilterExpression } from './filter-evaluator.js';
import { SecurityError } from '../errors/index.js';

/**
 * Dangerous property names that could lead to prototype pollution
 * These properties are blocked in all query and modification operations
 */
const DANGEROUS_PROPERTIES = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

/**
 * Check if a property name is dangerous (prototype pollution risk)
 */
function isDangerousProperty(propertyName: string): boolean {
  return DANGEROUS_PROPERTIES.has(propertyName);
}

/**
 * Query Evaluator - evaluates path expressions against documents
 */
export class QueryEvaluator {
  private context: EvaluationContext;
  private cache: QueryCache;

  constructor(
    document: TONLValue,
    options: {
      maxDepth?: number;
      enableCache?: boolean;
      cache?: QueryCache;
    } = {}
  ) {
    this.context = createContext(document, {
      maxDepth: options.maxDepth,
      enableCache: options.enableCache
    });
    this.cache = options.cache || getGlobalCache();
  }

  /**
   * Evaluate a path expression and return results
   *
   * @param ast - Parsed AST nodes
   * @returns Matched value(s) or undefined if not found
   */
  evaluate(ast: PathNode[]): any {
    if (ast.length === 0) {
      return this.context.root;
    }

    // Check cache if enabled
    if (this.context.enableCache) {
      const cacheKey = this.generateCacheKey(ast);
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Handle root node
    let startIndex = 0;
    if (ast[0].type === 'root') {
      startIndex = 1;
    }

    // Evaluate the path
    const result = this.evaluatePath(this.context.root, ast, startIndex, this.context);

    // Cache result if enabled
    if (this.context.enableCache) {
      const cacheKey = this.generateCacheKey(ast);
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Recursively evaluate a path starting from a specific node
   */
  private evaluatePath(
    current: any,
    ast: PathNode[],
    startIndex: number,
    context: EvaluationContext
  ): any {
    // Base case: no more nodes to process
    if (startIndex >= ast.length) {
      return current;
    }

    // Get current node
    const node = ast[startIndex];

    // Evaluate current node
    const nodeResult = this.evaluateNode(current, node, context);

    // If result is undefined, path doesn't exist
    if (nodeResult === undefined) {
      return undefined;
    }

    // Check if this is a multi-value result (array from wildcard, recursive, slice, or filter)
    const isMultiValue = node.type === 'wildcard' || node.type === 'recursive' || node.type === 'slice' || node.type === 'filter';

    // If there are more nodes to process and this was a multi-value operation
    if (startIndex + 1 < ast.length && isMultiValue && Array.isArray(nodeResult)) {
      // Apply remaining path to each element
      const results: any[] = [];
      for (const item of nodeResult) {
        const itemResult = this.evaluatePath(item, ast, startIndex + 1, context);
        if (itemResult !== undefined) {
          // If the item result is an array, flatten it
          if (Array.isArray(itemResult)) {
            results.push(...itemResult);
          } else {
            results.push(itemResult);
          }
        }
      }
      return results;
    }

    // Continue with next node
    return this.evaluatePath(nodeResult, ast, startIndex + 1, context);
  }

  /**
   * Check if a path exists in the document
   *
   * @param ast - Parsed AST nodes
   * @returns True if the path exists, false otherwise
   */
  exists(ast: PathNode[]): boolean {
    const result = this.evaluate(ast);
    return result !== undefined;
  }

  /**
   * Get the type of value at a path
   *
   * @param ast - Parsed AST nodes
   * @returns Type string or undefined if path doesn't exist
   */
  typeOf(ast: PathNode[]): string | undefined {
    const result = this.evaluate(ast);
    if (result === undefined) {
      return undefined;
    }
    if (result === null) {
      return 'null';
    }
    // Check for array before typeof (since typeof [] === 'object')
    if (Array.isArray(result)) {
      return 'array';
    }
    return typeof result;
  }

  /**
   * Evaluate a single AST node against current value
   */
  private evaluateNode(
    current: any,
    node: PathNode,
    context: EvaluationContext
  ): any {
    // Check recursion depth
    if (isMaxDepthReached(context)) {
      throw new Error('Maximum recursion depth exceeded');
    }

    // SECURITY FIX (BF012): Check iteration limit
    checkIterationLimit(context);

    switch (node.type) {
      case 'root':
        return context.root;

      case 'property':
        return this.evaluateProperty(current, node);

      case 'index':
        return this.evaluateIndex(current, node);

      case 'wildcard':
        return this.evaluateWildcard(current);

      case 'recursive':
        return this.evaluateRecursive(current, node, context);

      case 'slice':
        return this.evaluateSlice(current, node);

      case 'filter':
        return this.evaluateFilter(current, node, context);

      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  /**
   * Evaluate property access (e.g., user.name)
   * SECURITY: Protected against prototype pollution (BF004)
   */
  private evaluateProperty(current: any, node: PropertyNode): any {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }

    // SECURITY FIX (BF004): Block dangerous properties
    if (isDangerousProperty(node.name)) {
      throw new SecurityError(
        `Access to '${node.name}' is forbidden (prototype pollution protection)`,
        {
          property: node.name,
          reason: 'Accessing prototype chain properties can lead to security vulnerabilities',
        }
      );
    }

    // SECURITY FIX (BF004): Only access own properties (not inherited)
    if (!Object.prototype.hasOwnProperty.call(current, node.name)) {
      return undefined;
    }

    return current[node.name];
  }

  /**
   * Evaluate array index access (e.g., users[0])
   * SECURITY: Protected against integer overflow (BF008)
   */
  private evaluateIndex(current: any, node: IndexNode): any {
    if (!Array.isArray(current)) {
      return undefined;
    }

    const { index } = node;
    const length = current.length;

    // SECURITY FIX (BF008): Validate index is safe integer
    if (!Number.isSafeInteger(index)) {
      throw new Error(`Array index out of safe integer range: ${index}`);
    }

    // Handle negative indices (from end)
    const actualIndex = index < 0 ? length + index : index;

    // Check bounds
    if (actualIndex < 0 || actualIndex >= length) {
      return undefined;
    }

    return current[actualIndex];
  }

  /**
   * Evaluate wildcard (e.g., users[*] or data.*)
   *
   * Returns an array of all values
   */
  private evaluateWildcard(current: any): any[] {
    if (current === null || current === undefined) {
      return [];
    }

    // For arrays, return all elements
    if (Array.isArray(current)) {
      return current;
    }

    // For objects, return all property values
    if (typeof current === 'object') {
      return Object.values(current);
    }

    // For primitives, return empty array
    return [];
  }

  /**
   * Evaluate recursive descent (e.g., $..email)
   *
   * Searches for matching properties at any depth
   */
  private evaluateRecursive(
    current: any,
    node: RecursiveNode,
    context: EvaluationContext
  ): any[] {
    const results: any[] = [];

    // Create child context to track depth
    const childContext = createChildContext(context, current);

    // Recursive helper function
    const search = (value: any, depth: number): void => {
      if (depth > context.maxDepth) {
        return;
      }

      if (value === null || value === undefined) {
        return;
      }

      // If searching for specific property
      if (node.name) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Check if this object has the property
          if (node.name in value) {
            results.push(value[node.name]);
          }

          // Recursively search nested objects
          for (const key in value) {
            search(value[key], depth + 1);
          }
        } else if (Array.isArray(value)) {
          // Search in array elements
          for (const item of value) {
            search(item, depth + 1);
          }
        }
      } else {
        // No specific property - collect all values at all depths
        if (Array.isArray(value)) {
          results.push(...value);
          for (const item of value) {
            search(item, depth + 1);
          }
        } else if (typeof value === 'object') {
          results.push(...Object.values(value));
          for (const key in value) {
            search(value[key], depth + 1);
          }
        } else {
          results.push(value);
        }
      }
    };

    search(current, 0);
    return results;
  }

  /**
   * Evaluate array slice (e.g., users[0:5])
   */
  /**
   * Evaluate array slice (e.g., users[0:5] or users[::2])
   * SECURITY: Protected against integer overflow and infinite loops (BF008)
   */
  private evaluateSlice(current: any, node: SliceNode): any[] {
    if (!Array.isArray(current)) {
      return [];
    }

    let { start, end, step = 1 } = node;
    const length = current.length;

    // SECURITY FIX (BF008): Validate step (prevent infinite loop)
    if (step === 0) {
      throw new Error('Slice step cannot be zero');
    }

    // SECURITY FIX (BF008): Validate safe integers
    if (start !== undefined && !Number.isSafeInteger(start)) {
      throw new Error(`Slice start out of safe range: ${start}`);
    }
    if (end !== undefined && !Number.isSafeInteger(end)) {
      throw new Error(`Slice end out of safe range: ${end}`);
    }
    if (!Number.isSafeInteger(step)) {
      throw new Error(`Slice step out of safe range: ${step}`);
    }

    // Resolve start and end indices
    let actualStart = start !== undefined ? start : 0;
    let actualEnd = end !== undefined ? end : length;

    // Handle negative indices
    if (actualStart < 0) {
      actualStart = Math.max(0, length + actualStart);
    }
    if (actualEnd < 0) {
      actualEnd = Math.max(0, length + actualEnd);
    }

    // Clamp to array bounds
    actualStart = Math.max(0, Math.min(actualStart, length));
    actualEnd = Math.max(0, Math.min(actualEnd, length));

    // Handle negative step (reverse iteration)
    if (step < 0) {
      [actualStart, actualEnd] = [actualEnd - 1, actualStart - 1];
      step = Math.abs(step);
    }

    // Extract slice with step
    const result: any[] = [];
    for (let i = actualStart; i < actualEnd && i < length; i += step) {
      // Additional safety: limit iterations
      if (result.length > length) {
        break; // Prevent infinite loops
      }
      result.push(current[i]);
    }

    return result;
  }

  /**
   * Evaluate filter expression (e.g., users[?(@.age > 18)])
   */
  private evaluateFilter(
    current: any,
    node: FilterNode,
    context: EvaluationContext
  ): any[] {
    if (!Array.isArray(current)) {
      return [];
    }

    // Filter the array using the filter expression
    const filtered: any[] = [];

    for (const item of current) {
      try {
        const matches = evaluateFilterExpression(node.expression, item);
        if (matches) {
          filtered.push(item);
        }
      } catch (error) {
        // Re-throw security errors (ReDoS protection, etc.)
        if (error instanceof SecurityError) {
          throw error;
        }
        // Skip items that cause normal evaluation errors
        continue;
      }
    }

    return filtered;
  }

  /**
   * Generate cache key from AST nodes
   */
  private generateCacheKey(ast: PathNode[]): string {
    return JSON.stringify(ast.map(node => ({
      type: node.type,
      ...('name' in node && { name: node.name }),
      ...('index' in node && { index: node.index }),
      ...('start' in node && { start: node.start }),
      ...('end' in node && { end: node.end }),
      ...('step' in node && { step: node.step }),
      ...('expression' in node && { expression: node.expression })
    })));
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear the evaluator's cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Convenience function to evaluate a path expression
 *
 * @param document - The document to query
 * @param ast - Parsed AST nodes
 * @param options - Evaluation options
 * @returns Matched value(s)
 */
export function evaluate(
  document: TONLValue,
  ast: PathNode[],
  options?: {
    maxDepth?: number;
    enableCache?: boolean;
  }
): any {
  // Disable caching by default for convenience function to avoid cache pollution
  // across different documents. Users should create a QueryEvaluator instance
  // directly if they want to cache results for the same document.
  const evaluator = new QueryEvaluator(document, {
    ...options,
    enableCache: options?.enableCache ?? false
  });
  return evaluator.evaluate(ast);
}

/**
 * Check if a path exists in a document
 */
export function exists(document: TONLValue, ast: PathNode[]): boolean {
  const evaluator = new QueryEvaluator(document, { enableCache: false });
  return evaluator.exists(ast);
}

/**
 * Get the type of value at a path
 */
export function typeOf(document: TONLValue, ast: PathNode[]): string | undefined {
  const evaluator = new QueryEvaluator(document, { enableCache: false });
  return evaluator.typeOf(ast);
}
