/**
 * Core setter implementation for document modification
 */

import type { TONLValue } from '../types.js';
import type { SetOptions, ModificationResult } from './types.js';
import { parsePath } from '../query/path-parser.js';
import type { PathNode } from '../query/types.js';
import { SecurityError } from '../errors/index.js';
import { isDangerousProperty } from '../utils/property-security.js';
import { MAX_ITERATIONS } from '../utils/security-limits.js';

/**
 * Set a value at a specific path in a document
 *
 * @param document - The document to modify (will be mutated)
 * @param pathExpression - Path expression
 * @param value - Value to set
 * @param options - Set options
 * @returns Modification result
 */
export function set(
  document: any,
  pathExpression: string,
  value: any,
  options: SetOptions = {}
): ModificationResult {
  const { createPath = true } = options;

  // Parse path
  const parseResult = parsePath(pathExpression);
  if (!parseResult.success) {
    return {
      success: false,
      path: pathExpression,
      error: parseResult.error?.message
    };
  }

  try {
    // Execute set operation
    const oldValue = setByAST(document, parseResult.ast, value, createPath);

    return {
      success: true,
      path: pathExpression,
      oldValue,
      newValue: value
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
 * Set value using parsed AST
 */
function setByAST(
  root: any,
  ast: PathNode[],
  value: any,
  createPath: boolean
): any {
  if (ast.length === 0) {
    throw new Error('Cannot set root value');
  }

  // Handle root node
  let startIndex = 0;
  if (ast[0].type === 'root') {
    startIndex = 1;
  }

  if (startIndex >= ast.length) {
    throw new Error('Invalid path: only root specified');
  }

  // Navigate to parent and set the final property
  return setAtPath(root, ast, startIndex, value, createPath);
}

/**
 * Recursively navigate to path and set value
 */
function setAtPath(
  current: any,
  ast: PathNode[],
  index: number,
  value: any,
  createPath: boolean
): any {
  const node = ast[index];
  const isLast = index === ast.length - 1;

  switch (node.type) {
    case 'property':
      return setProperty(current, node.name, ast, index, value, isLast, createPath);

    case 'index':
      return setIndex(current, node.index, ast, index, value, isLast, createPath);

    case 'wildcard':
    case 'filter':
    case 'slice':
    case 'recursive':
      throw new Error(`Cannot set value using ${node.type} in path`);

    default:
      throw new Error(`Unknown node type: ${(node as any).type}`);
  }
}

/**
 * Set a property value
 */
function setProperty(
  current: any,
  propertyName: string,
  ast: PathNode[],
  index: number,
  value: any,
  isLast: boolean,
  createPath: boolean
): any {
  // Ensure current is an object
  if (current === null || current === undefined) {
    throw new Error(`Cannot set property '${propertyName}' on null/undefined`);
  }

  if (typeof current !== 'object' || Array.isArray(current)) {
    throw new Error(`Cannot set property '${propertyName}' on non-object`);
  }

  // SECURITY FIX (BF004): Block dangerous properties
  if (isDangerousProperty(propertyName)) {
    throw new SecurityError(
      `Cannot set '${propertyName}': prototype pollution protection`,
      {
        property: propertyName,
        reason: 'Setting prototype chain properties can lead to security vulnerabilities',
      }
    );
  }

  const oldValue = current[propertyName];

  if (isLast) {
    // BUGFIX BF002: Enhanced prototype pollution protection
    // Use direct assignment for normal objects instead of Object.defineProperty
    // This prevents potential bypass of prototype pollution checks
    if (Object.prototype.hasOwnProperty.call(current, propertyName) ||
        !isDangerousProperty(propertyName)) {
      current[propertyName] = value;
    } else {
      throw new SecurityError(
        `Cannot set '${propertyName}': prototype pollution protection`,
        {
          property: propertyName,
          reason: 'Property assignment blocked for security',
        }
      );
    }
    return oldValue;
  }

  // Navigate deeper
  if (current[propertyName] === undefined || current[propertyName] === null) {
    if (!createPath) {
      throw new Error(`Property '${propertyName}' does not exist and createPath is false`);
    }

    // Create intermediate object or array based on next node
    const nextNode = ast[index + 1];
    if (nextNode.type === 'index') {
      current[propertyName] = [];
    } else {
      current[propertyName] = {};
    }
  }

  return setAtPath(current[propertyName], ast, index + 1, value, createPath);
}

/**
 * Set an array element
 */
function setIndex(
  current: any,
  arrayIndex: number,
  ast: PathNode[],
  index: number,
  value: any,
  isLast: boolean,
  createPath: boolean
): any {
  // Ensure current is an array
  if (!Array.isArray(current)) {
    throw new Error(`Cannot use array index on non-array`);
  }

  // Handle negative indices
  const actualIndex = arrayIndex < 0 ? current.length + arrayIndex : arrayIndex;

  // Check bounds
  if (actualIndex < 0 || actualIndex >= current.length) {
    // BUGFIX: Always throw error for negative normalized indices
    if (actualIndex < 0) {
      throw new Error(`Array index ${arrayIndex} out of bounds (length: ${current.length})`);
    }

    if (!createPath || !isLast) {
      throw new Error(`Array index ${arrayIndex} out of bounds (length: ${current.length})`);
    }

    // Extend array if createPath is enabled and this is the last node
    // Note: actualIndex >= 0 at this point due to check above
    if (isLast && createPath && actualIndex >= current.length) {
      // BUG-NEW-013 FIX: Prevent DoS via excessive array expansion
      // Limit how many elements can be added in a single operation
      const elementsToAdd = actualIndex - current.length + 1;
      if (elementsToAdd > MAX_ITERATIONS) {
        throw new SecurityError(
          `Array expansion blocked: would add ${elementsToAdd} elements (max: ${MAX_ITERATIONS})`,
          {
            requestedIndex: arrayIndex,
            currentLength: current.length,
            reason: 'Excessive array expansion can cause memory exhaustion',
          }
        );
      }

      // Fill with undefined up to the index
      while (current.length <= actualIndex) {
        current.push(undefined);
      }
    }
  }

  const oldValue = current[actualIndex];

  if (isLast) {
    // Set the value
    current[actualIndex] = value;
    return oldValue;
  }

  // Navigate deeper
  if (current[actualIndex] === undefined || current[actualIndex] === null) {
    if (!createPath) {
      throw new Error(`Array element at ${actualIndex} does not exist and createPath is false`);
    }

    // Create intermediate object or array based on next node
    const nextNode = ast[index + 1];
    if (nextNode.type === 'index') {
      current[actualIndex] = [];
    } else {
      current[actualIndex] = {};
    }
  }

  return setAtPath(current[actualIndex], ast, index + 1, value, createPath);
}
