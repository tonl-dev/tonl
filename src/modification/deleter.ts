/**
 * Delete operations for document modification
 */

import { parsePath } from '../query/path-parser.js';
import type { PathNode } from '../query/types.js';
import type { ModificationResult } from './types.js';

/**
 * Delete a value at a specific path
 *
 * @param document - The document to modify
 * @param pathExpression - Path expression
 * @returns Modification result
 */
export function deleteValue(
  document: any,
  pathExpression: string
): ModificationResult {
  const parseResult = parsePath(pathExpression);
  if (!parseResult.success) {
    return {
      success: false,
      path: pathExpression,
      error: parseResult.error?.message
    };
  }

  try {
    const oldValue = deleteByAST(document, parseResult.ast);
    return {
      success: true,
      path: pathExpression,
      oldValue
    };
  } catch (error) {
    return {
      success: false,
      path: pathExpression,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Delete using parsed AST
 */
function deleteByAST(root: any, ast: PathNode[]): any {
  if (ast.length === 0) {
    throw new Error('Cannot delete root');
  }

  let startIndex = 0;
  if (ast[0].type === 'root') {
    startIndex = 1;
  }

  return deleteAtPath(root, ast, startIndex);
}

/**
 * Navigate to path and delete
 */
function deleteAtPath(current: any, ast: PathNode[], index: number): any {
  const node = ast[index];
  const isLast = index === ast.length - 1;

  if (!isLast) {
    // Navigate deeper
    let next: any;
    if (node.type === 'property') {
      next = current?.[node.name];
    } else if (node.type === 'index') {
      // BUG-NEW-016 FIX: Check if current is an array before accessing .length
      // This prevents "Cannot read property 'length' of null/undefined" errors
      if (!Array.isArray(current)) {
        return undefined; // Can't index into non-array
      }
      const actualIndex = node.index < 0 ? current.length + node.index : node.index;
      next = current?.[actualIndex];
    }

    if (next === undefined) {
      return undefined; // Path doesn't exist
    }

    return deleteAtPath(next, ast, index + 1);
  }

  // Delete the final node
  if (node.type === 'property') {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      const oldValue = current[node.name];
      delete current[node.name];
      return oldValue;
    }
  } else if (node.type === 'index') {
    if (Array.isArray(current)) {
      const actualIndex = node.index < 0 ? current.length + node.index : node.index;
      if (actualIndex >= 0 && actualIndex < current.length) {
        const oldValue = current[actualIndex];
        current.splice(actualIndex, 1); // Remove and shift indices
        return oldValue;
      }
    }
  }

  return undefined;
}
