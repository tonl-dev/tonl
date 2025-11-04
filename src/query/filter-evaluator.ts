/**
 * Filter Expression Evaluator
 *
 * Evaluates filter expressions in query paths like users[?(@.age > 18)]
 */

import type {
  FilterExpression,
  BinaryExpression,
  UnaryExpression,
  LiteralExpression,
  PropertyExpression,
  FunctionExpression,
  BinaryOperator,
  UnaryOperator
} from './types.js';

/**
 * Evaluate a filter expression against a current value (context item)
 *
 * @param expression - The filter expression AST
 * @param currentItem - The current item being filtered (@ in expression)
 * @returns Boolean result of the filter
 */
export function evaluateFilterExpression(
  expression: FilterExpression,
  currentItem: any
): boolean {
  switch (expression.type) {
    case 'binary':
      return evaluateBinaryExpression(expression, currentItem);

    case 'unary':
      return evaluateUnaryExpression(expression, currentItem);

    case 'literal':
      return Boolean(expression.value);

    case 'property':
      return Boolean(getPropertyValue(expression.path, currentItem));

    case 'function':
      return evaluateFunctionExpression(expression, currentItem);

    default:
      throw new Error(`Unknown filter expression type: ${(expression as any).type}`);
  }
}

/**
 * Evaluate a binary expression (comparison or logical operators)
 */
function evaluateBinaryExpression(
  expr: BinaryExpression,
  currentItem: any
): boolean {
  const left = evaluateFilterValue(expr.left, currentItem);
  const right = evaluateFilterValue(expr.right, currentItem);

  switch (expr.operator) {
    // Comparison operators
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    case '>':
      return left > right;
    case '<':
      return left < right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;

    // Logical operators (with short-circuit evaluation)
    case '&&':
      return evaluateFilterExpression(expr.left, currentItem) &&
             evaluateFilterExpression(expr.right, currentItem);
    case '||':
      return evaluateFilterExpression(expr.left, currentItem) ||
             evaluateFilterExpression(expr.right, currentItem);

    // String operators
    case 'contains':
      return String(left).includes(String(right));
    case 'startsWith':
      return String(left).startsWith(String(right));
    case 'endsWith':
      return String(left).endsWith(String(right));
    case 'matches':
      // Regex match
      try {
        const regex = new RegExp(String(right));
        return regex.test(String(left));
      } catch (e) {
        return false;
      }

    // Array operators
    case 'in':
      if (Array.isArray(right)) {
        return right.includes(left);
      }
      return false;

    // Type operators
    case 'typeof':
      return typeof left === String(right);
    case 'instanceof':
      // Limited instanceof support
      if (right === 'Array') {
        return Array.isArray(left);
      }
      if (right === 'Object') {
        return typeof left === 'object' && left !== null && !Array.isArray(left);
      }
      return false;

    default:
      throw new Error(`Unknown binary operator: ${expr.operator}`);
  }
}

/**
 * Evaluate a unary expression (negation or checks)
 */
function evaluateUnaryExpression(
  expr: UnaryExpression,
  currentItem: any
): boolean {
  switch (expr.operator) {
    case '!':
      // Logical NOT
      return !evaluateFilterExpression(expr.argument, currentItem);

    case 'exists':
      // Check if property exists
      if (expr.argument.type === 'property') {
        const value = getPropertyValue(expr.argument.path, currentItem);
        return value !== undefined;
      }
      return evaluateFilterExpression(expr.argument, currentItem);

    case 'empty':
      // Check if value is empty (array, object, string)
      const value = evaluateFilterValue(expr.argument, currentItem);
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length === 0;
      }
      if (typeof value === 'string') {
        return value.length === 0;
      }
      return value === null || value === undefined;

    default:
      throw new Error(`Unknown unary operator: ${expr.operator}`);
  }
}

/**
 * Evaluate a function expression
 * Returns any value (not just boolean) for use in comparisons
 */
function evaluateFunctionExpression(
  expr: FunctionExpression,
  currentItem: any
): any {
  const args = expr.arguments.map(arg => evaluateFilterValue(arg, currentItem));

  switch (expr.name) {
    case 'contains':
      if (args.length !== 2) {
        throw new Error('contains() requires exactly 2 arguments');
      }
      return String(args[0]).includes(String(args[1]));

    case 'startsWith':
      if (args.length !== 2) {
        throw new Error('startsWith() requires exactly 2 arguments');
      }
      return String(args[0]).startsWith(String(args[1]));

    case 'endsWith':
      if (args.length !== 2) {
        throw new Error('endsWith() requires exactly 2 arguments');
      }
      return String(args[0]).endsWith(String(args[1]));

    case 'matches':
      if (args.length !== 2) {
        throw new Error('matches() requires exactly 2 arguments');
      }
      try {
        const regex = new RegExp(String(args[1]));
        return regex.test(String(args[0]));
      } catch (e) {
        return false;
      }

    case 'size':
      if (args.length !== 1) {
        throw new Error('size() requires exactly 1 argument');
      }
      const value = args[0];
      if (Array.isArray(value)) {
        return value.length;
      }
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length;
      }
      if (typeof value === 'string') {
        return value.length;
      }
      return 0;

    case 'typeof':
      if (args.length !== 1) {
        throw new Error('typeof() requires exactly 1 argument');
      }
      if (Array.isArray(args[0])) {
        return 'array';
      }
      if (args[0] === null) {
        return 'null';
      }
      return typeof args[0];

    case 'exists':
      if (args.length !== 1) {
        throw new Error('exists() requires exactly 1 argument');
      }
      return args[0] !== undefined && args[0] !== null;

    case 'empty':
      if (args.length !== 1) {
        throw new Error('empty() requires exactly 1 argument');
      }
      const val = args[0];
      if (Array.isArray(val)) {
        return val.length === 0;
      }
      if (typeof val === 'object' && val !== null) {
        return Object.keys(val).length === 0;
      }
      if (typeof val === 'string') {
        return val.length === 0;
      }
      return val === null || val === undefined;

    default:
      throw new Error(`Unknown function: ${expr.name}()`);
  }
}

/**
 * Evaluate a filter expression to get its value (not boolean)
 * Used for getting operand values in comparisons
 */
function evaluateFilterValue(
  expression: FilterExpression,
  currentItem: any
): any {
  switch (expression.type) {
    case 'literal':
      return expression.value;

    case 'property':
      return getPropertyValue(expression.path, currentItem);

    case 'binary':
    case 'unary':
      return evaluateFilterExpression(expression, currentItem);

    case 'function':
      return evaluateFunctionExpression(expression, currentItem);

    default:
      return undefined;
  }
}

/**
 * Get a property value from the current item using dot-separated path
 *
 * @param path - Dot-separated property path (e.g., "profile.age")
 * @param currentItem - The current object
 * @returns Property value or undefined
 */
function getPropertyValue(path: string, currentItem: any): any {
  if (currentItem === null || currentItem === undefined) {
    return undefined;
  }

  if (!path || path.length === 0) {
    return currentItem;
  }

  const parts = path.split('.');
  let current = currentItem;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object') {
      return undefined;
    }

    current = current[part];
  }

  return current;
}
