/**
 * Transform and bulk update operations
 */

import { parsePath } from '../query/path-parser.js';
import { evaluate } from '../query/evaluator.js';
import { set } from './setter.js';

/**
 * Transform a value at a path using a function
 *
 * @param document - The document to modify
 * @param pathExpression - Path expression
 * @param transformFn - Transform function
 * @returns Number of values transformed
 */
export function transform(
  document: any,
  pathExpression: string,
  transformFn: (value: any) => any
): number {
  const parseResult = parsePath(pathExpression);
  if (!parseResult.success) {
    throw parseResult.error!;
  }

  const value = evaluate(document, parseResult.ast);

  // Transform single value
  if (!Array.isArray(value)) {
    const transformed = transformFn(value);
    set(document, pathExpression, transformed);
    return 1;
  }

  // HIGH-002 FIX: Transform each array element individually
  // Extract the base path (remove wildcard/filter suffix) to set each element
  let count = 0;
  for (let i = 0; i < value.length; i++) {
    const transformed = transformFn(value[i]);
    // Build indexed path by replacing wildcard/filter with concrete index
    const basePath = pathExpression.replace(/\[\*\]|\[\?[^\]]*\]/, `[${i}]`);
    const result = set(document, basePath, transformed);
    if (result.success) {
      count++;
    }
  }
  return count;
}

/**
 * Update multiple paths with same value
 *
 * @param document - The document
 * @param paths - Array of path expressions
 * @param value - Value to set
 * @returns Number of paths updated
 */
export function updateMany(
  document: any,
  paths: string[],
  value: any
): number {
  let count = 0;
  for (const path of paths) {
    try {
      const result = set(document, path, value);
      if (result.success) {
        count++;
      }
    } catch (e) {
      // Continue on error
    }
  }
  return count;
}

/**
 * Merge object at path
 *
 * @param document - The document
 * @param pathExpression - Path to object
 * @param updates - Object to merge
 */
export function merge(
  document: any,
  pathExpression: string,
  updates: Record<string, any>
): void {
  const parseResult = parsePath(pathExpression);
  if (!parseResult.success) {
    throw parseResult.error!;
  }

  const target = evaluate(document, parseResult.ast);
  if (!target || typeof target !== 'object' || Array.isArray(target)) {
    throw new Error(`Path '${pathExpression}' does not point to an object`);
  }

  // Shallow merge
  Object.assign(target, updates);
}
