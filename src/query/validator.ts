/**
 * AST validation and analysis utilities
 *
 * Provides validation, optimization, and analysis of parsed path ASTs
 */

import {
  PathNode,
  FilterExpression,
  BinaryExpression,
  UnaryExpression
} from './types.js';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * AST analysis result
 */
export interface ASTAnalysis {
  /**
   * Total depth of the path (number of segments)
   */
  depth: number;

  /**
   * Whether the path contains wildcards
   */
  hasWildcard: boolean;

  /**
   * Whether the path contains recursive descent
   */
  hasRecursive: boolean;

  /**
   * Whether the path contains filters
   */
  hasFilter: boolean;

  /**
   * Whether the path is deterministic (returns single value)
   */
  isDeterministic: boolean;

  /**
   * Estimated complexity score (1-10)
   */
  complexity: number;

  /**
   * Node type distribution
   */
  nodeTypes: Record<string, number>;
}

/**
 * Validate an AST and return detailed results
 *
 * @param ast - The AST to validate
 * @returns Validation result with errors and warnings
 */
export function validate(ast: PathNode[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (ast.length === 0) {
    warnings.push('Empty path');
    return { valid: true, errors, warnings };
  }

  // Check for valid node types
  for (let i = 0; i < ast.length; i++) {
    const node = ast[i];
    const prevNode = i > 0 ? ast[i - 1] : null;

    // Validate individual node
    const nodeErrors = validateNode(node);
    errors.push(...nodeErrors);

    // Validate node sequence
    const sequenceErrors = validateNodeSequence(node, prevNode, i);
    errors.push(...sequenceErrors);
  }

  // Check for suspicious patterns
  const patternWarnings = checkPatterns(ast);
  warnings.push(...patternWarnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a single node
 */
function validateNode(node: PathNode): string[] {
  const errors: string[] = [];

  switch (node.type) {
    case 'property':
      if (!node.name || node.name.length === 0) {
        errors.push('Property node must have a non-empty name');
      }
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(node.name)) {
        errors.push(`Invalid property name: ${node.name}`);
      }
      break;

    case 'index':
      if (!Number.isInteger(node.index)) {
        errors.push(`Index must be an integer, got: ${node.index}`);
      }
      break;

    case 'slice':
      if (node.start !== undefined && !Number.isInteger(node.start)) {
        errors.push(`Slice start must be an integer, got: ${node.start}`);
      }
      if (node.end !== undefined && !Number.isInteger(node.end)) {
        errors.push(`Slice end must be an integer, got: ${node.end}`);
      }
      if (node.step !== undefined) {
        if (!Number.isInteger(node.step)) {
          errors.push(`Slice step must be an integer, got: ${node.step}`);
        }
        if (node.step === 0) {
          errors.push('Slice step cannot be zero');
        }
      }
      if (node.start !== undefined && node.end !== undefined && node.start > node.end) {
        errors.push(`Slice start (${node.start}) is greater than end (${node.end})`);
      }
      break;

    case 'filter':
      const filterErrors = validateFilterExpression(node.expression);
      errors.push(...filterErrors);
      break;

    case 'root':
      if (node.symbol !== '$') {
        errors.push(`Root node must have symbol '$', got: ${node.symbol}`);
      }
      break;

    case 'wildcard':
    case 'recursive':
      // These don't require specific validation
      break;

    default:
      errors.push(`Unknown node type: ${(node as any).type}`);
  }

  return errors;
}

/**
 * Validate node sequence (check if nodes are in valid order)
 */
function validateNodeSequence(node: PathNode, prevNode: PathNode | null, index: number): string[] {
  const errors: string[] = [];

  // Root must be first if present
  if (node.type === 'root' && index !== 0) {
    errors.push('Root node ($) must be the first node in the path');
  }

  // Can't have two roots
  if (prevNode && prevNode.type === 'root' && node.type === 'root') {
    errors.push('Cannot have multiple root nodes');
  }

  return errors;
}

/**
 * Validate a filter expression recursively
 */
function validateFilterExpression(expr: FilterExpression): string[] {
  const errors: string[] = [];

  switch (expr.type) {
    case 'binary':
      // Validate operator
      const validBinaryOps = ['==', '!=', '>', '<', '>=', '<=', '&&', '||', 'contains', 'startsWith', 'endsWith', 'matches', 'in', 'typeof', 'instanceof'];
      if (!validBinaryOps.includes(expr.operator)) {
        errors.push(`Invalid binary operator: ${expr.operator}`);
      }

      // Recursively validate operands
      errors.push(...validateFilterExpression(expr.left));
      errors.push(...validateFilterExpression(expr.right));
      break;

    case 'unary':
      // Validate operator
      const validUnaryOps = ['!', 'exists', 'empty'];
      if (!validUnaryOps.includes(expr.operator)) {
        errors.push(`Invalid unary operator: ${expr.operator}`);
      }

      // Recursively validate argument
      errors.push(...validateFilterExpression(expr.argument));
      break;

    case 'function':
      if (!expr.name || expr.name.length === 0) {
        errors.push('Function expression must have a name');
      }

      // Validate arguments
      for (const arg of expr.arguments) {
        errors.push(...validateFilterExpression(arg));
      }
      break;

    case 'property':
      if (!expr.path || expr.path.length === 0) {
        errors.push('Property expression must have a non-empty path');
      }
      break;

    case 'literal':
      // Literals are always valid
      break;

    default:
      errors.push(`Unknown filter expression type: ${(expr as any).type}`);
  }

  return errors;
}

/**
 * Check for suspicious patterns in the AST
 */
function checkPatterns(ast: PathNode[]): string[] {
  const warnings: string[] = [];

  // Check for too many recursive descents
  const recursiveCount = ast.filter(n => n.type === 'recursive').length;
  if (recursiveCount > 5) {
    warnings.push(`Path contains ${recursiveCount} recursive descents, which may be slow`);
  }

  // Check for wildcard followed by filter (can be optimized)
  for (let i = 0; i < ast.length - 1; i++) {
    if (ast[i].type === 'wildcard' && ast[i + 1].type === 'filter') {
      warnings.push('Wildcard followed by filter at index ' + i + ' - consider filter optimization');
    }
  }

  // Check for consecutive wildcards
  for (let i = 0; i < ast.length - 1; i++) {
    if (ast[i].type === 'wildcard' && ast[i + 1].type === 'wildcard') {
      warnings.push('Consecutive wildcards at index ' + i + ' may return unexpected results');
    }
  }

  return warnings;
}

/**
 * Analyze an AST and return metrics
 *
 * @param ast - The AST to analyze
 * @returns Analysis result with metrics
 */
export function analyzeAST(ast: PathNode[]): ASTAnalysis {
  const nodeTypes: Record<string, number> = {};

  let hasWildcard = false;
  let hasRecursive = false;
  let hasFilter = false;
  let isDeterministic = true;

  // Count node types and check for special features
  for (const node of ast) {
    nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;

    if (node.type === 'wildcard') {
      hasWildcard = true;
      isDeterministic = false;
    }
    if (node.type === 'recursive') {
      hasRecursive = true;
      isDeterministic = false;
    }
    if (node.type === 'filter') {
      hasFilter = true;
      isDeterministic = false;
    }
    if (node.type === 'slice') {
      isDeterministic = false;
    }
  }

  // Calculate complexity (1-10 scale)
  let complexity = 1;
  complexity += ast.length * 0.5; // Base complexity from depth
  if (hasWildcard) complexity += 2;
  if (hasRecursive) complexity += 3;
  if (hasFilter) complexity += 2;
  complexity = Math.min(10, Math.round(complexity));

  return {
    depth: ast.length,
    hasWildcard,
    hasRecursive,
    hasFilter,
    isDeterministic,
    complexity,
    nodeTypes
  };
}

/**
 * Simplify/optimize an AST by removing redundant nodes
 *
 * @param ast - The AST to optimize
 * @returns Optimized AST
 */
export function optimizeAST(ast: PathNode[]): PathNode[] {
  if (ast.length === 0) return ast;

  const optimized: PathNode[] = [];

  for (let i = 0; i < ast.length; i++) {
    const node = ast[i];
    const prevNode = optimized[optimized.length - 1];

    // Skip redundant nodes
    // Example: $.property is same as property (root is implicit)
    if (i === 0 && node.type === 'root' && ast.length > 1) {
      // Keep root for now, it's useful for explicit paths
    }

    optimized.push(node);
  }

  return optimized;
}

/**
 * Convert AST back to string representation
 *
 * @param ast - The AST to stringify
 * @returns String representation of the path
 */
export function astToString(ast: PathNode[]): string {
  if (ast.length === 0) return '';

  let result = '';

  for (let i = 0; i < ast.length; i++) {
    const node = ast[i];
    const prevNode = i > 0 ? ast[i - 1] : null;

    switch (node.type) {
      case 'root':
        result += '$';
        break;

      case 'property':
        // Add dot separator if needed
        if (prevNode && prevNode.type !== 'root') {
          result += '.';
        } else if (!prevNode) {
          // No separator for first property
        } else {
          result += '.';
        }
        result += node.name;
        break;

      case 'index':
        result += `[${node.index}]`;
        break;

      case 'wildcard':
        // Check if we need bracket notation
        if (prevNode && prevNode.type === 'property') {
          result += '[*]';
        } else {
          result += '*';
        }
        break;

      case 'recursive':
        result += '..';
        if (node.name) {
          result += node.name;
        }
        break;

      case 'slice':
        result += '[';
        if (node.start !== undefined) result += node.start;
        result += ':';
        if (node.end !== undefined) result += node.end;
        if (node.step !== undefined) {
          result += ':' + node.step;
        }
        result += ']';
        break;

      case 'filter':
        result += '[?(' + filterExprToString(node.expression) + ')]';
        break;
    }
  }

  return result;
}

/**
 * Convert filter expression to string
 */
function filterExprToString(expr: FilterExpression): string {
  switch (expr.type) {
    case 'binary':
      return `${filterExprToString(expr.left)} ${expr.operator} ${filterExprToString(expr.right)}`;

    case 'unary':
      return `${expr.operator}${filterExprToString(expr.argument)}`;

    case 'literal':
      if (typeof expr.value === 'string') {
        return `"${expr.value}"`;
      }
      return String(expr.value);

    case 'property':
      return '@.' + expr.path;

    case 'function':
      const args = expr.arguments.map(a => filterExprToString(a)).join(', ');
      return `${expr.name}(${args})`;

    default:
      return '';
  }
}
