/**
 * TONL Schema validator
 */

import type {
  TONLSchema,
  ValidationResult,
  ValidationError,
  SchemaField,
  SchemaType,
  ValidationConstraint
} from './types.js';
import type { TONLValue, TONLObject, TONLArray } from '../types.js';

/**
 * Validate TONL data against a schema
 */
export function validateTONL(data: TONLValue, schema: TONLSchema): ValidationResult {
  const errors: ValidationError[] = [];

  // BUGFIX (BUG-001): Validate that root data matches schema expectations
  // If schema defines root fields, data MUST be an object
  if (schema.rootFields.length > 0) {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      errors.push({
        field: 'root',
        message: `Schema expects object at root but got ${Array.isArray(data) ? 'array' : typeof data}`,
        expected: 'object',
        actual: Array.isArray(data) ? 'array' : typeof data
      });
      // Return early - no point validating fields if root type is wrong
      return {
        valid: false,
        errors
      };
    }
  }

  // Validate root fields
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    for (const field of schema.rootFields) {
      const value = (data as TONLObject)[field.name];
      validateField(field, value, field.name, errors, schema);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a single field
 * BUGFIX (BUG-002): Added visitedTypes parameter for circular reference detection
 */
function validateField(
  field: SchemaField,
  value: TONLValue | undefined,
  path: string,
  errors: ValidationError[],
  schema: TONLSchema,
  visitedTypes: Set<string> = new Set()
): void {
  // Check required constraint
  const isRequired = field.constraints.some(c => c.type === 'required');
  if (isRequired && (value === undefined || value === null)) {
    errors.push({
      field: path,
      message: `Field '${path}' is required but was ${value === undefined ? 'undefined' : 'null'}`
    });
    return;
  }

  // Skip validation if value is null/undefined and not required
  if (value === undefined || value === null) {
    return;
  }

  // Type validation
  validateType(field.type, value, path, errors, schema, visitedTypes);

  // Constraint validation
  for (const constraint of field.constraints) {
    validateConstraint(constraint, value, path, errors);
  }
}

/**
 * Validate type match
 * BUGFIX (BUG-002): Added visitedTypes parameter to prevent infinite recursion
 */
function validateType(
  schemaType: SchemaType,
  value: TONLValue,
  path: string,
  errors: ValidationError[],
  schema: TONLSchema,
  visitedTypes: Set<string> = new Set()
): void {
  if (schemaType.kind === 'primitive') {
    validatePrimitiveType(schemaType, value, path, errors);
  } else if (schemaType.kind === 'complex') {
    if (schemaType.baseType === 'list') {
      if (!Array.isArray(value)) {
        errors.push({
          field: path,
          message: `Expected array but got ${typeof value}`,
          expected: 'array',
          actual: typeof value
        });
      } else if (schemaType.elementType) {
        // Validate each element
        (value as TONLArray).forEach((item, idx) => {
          validateType(schemaType.elementType!, item, `${path}[${idx}]`, errors, schema, visitedTypes);
        });
      }
    } else if (schemaType.baseType === 'obj') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push({
          field: path,
          message: `Expected object but got ${Array.isArray(value) ? 'array' : typeof value}`,
          expected: 'object',
          actual: Array.isArray(value) ? 'array' : typeof value
        });
      } else if (schemaType.fields) {
        // Validate object fields
        for (const field of schemaType.fields) {
          const fieldValue = (value as TONLObject)[field.name];
          validateField(field, fieldValue, `${path}.${field.name}`, errors, schema, visitedTypes);
        }
      }
    }
  } else if (schemaType.kind === 'custom') {
    // BUGFIX (BUG-002): Check for circular type references
    if (visitedTypes.has(schemaType.typeName)) {
      errors.push({
        field: path,
        message: `Circular type reference detected: ${schemaType.typeName}`,
        expected: 'non-circular type definition',
        actual: `circular reference to ${schemaType.typeName}`
      });
      return;
    }

    // Add to visited set
    visitedTypes.add(schemaType.typeName);

    // Resolve custom type
    const customType = schema.customTypes.get(schemaType.typeName);
    if (customType && customType.fields) {
      const objType: SchemaType = {
        kind: 'complex',
        baseType: 'obj',
        fields: customType.fields
      };
      validateType(objType, value, path, errors, schema, visitedTypes);
    }

    // Remove from visited set after validation
    visitedTypes.delete(schemaType.typeName);
  }
}

/**
 * Validate primitive type
 */
function validatePrimitiveType(
  schemaType: any,
  value: TONLValue,
  path: string,
  errors: ValidationError[]
): void {
  const { baseType } = schemaType;

  switch (baseType) {
    case 'str':
      if (typeof value !== 'string') {
        errors.push({
          field: path,
          message: `Expected string but got ${typeof value}`,
          expected: 'string',
          actual: typeof value
        });
      }
      break;
    case 'u32':
      if (typeof value !== 'number') {
        errors.push({
          field: path,
          message: `Expected number but got ${typeof value}`,
          expected: 'number',
          actual: typeof value
        });
      } else if (!Number.isInteger(value)) {
        errors.push({
          field: path,
          message: `Expected integer but got ${value}`,
          expected: 'integer',
          actual: 'float'
        });
      } else if (!Number.isSafeInteger(value)) {
        errors.push({
          field: path,
          message: `u32 not safe integer: ${value} (exceeds safe integer range)`,
          expected: '0-4294967295 (safe integer)',
          actual: String(value)
        });
      } else if (value < 0 || value > 0xFFFFFFFF) {
        errors.push({
          field: path,
          message: `u32 out of range: ${value} (expected 0-4294967295)`,
          expected: '0-4294967295',
          actual: String(value)
        });
      }
      // BUGFIX BF006: Additional validation for edge cases
      else if (Object.is(value, -0)) {
        // Handle negative zero case explicitly
        errors.push({
          field: path,
          message: `u32 cannot be negative zero: ${value}`,
          expected: '0-4294967295',
          actual: String(value)
        });
      }
      break;
    case 'i32':
      if (typeof value !== 'number') {
        errors.push({
          field: path,
          message: `Expected number but got ${typeof value}`,
          expected: 'number',
          actual: typeof value
        });
      } else if (!Number.isInteger(value)) {
        errors.push({
          field: path,
          message: `Expected integer but got ${value}`,
          expected: 'integer',
          actual: 'float'
        });
      } else if (value < -0x80000000 || value > 0x7FFFFFFF) {
        errors.push({
          field: path,
          message: `i32 out of range: ${value} (expected -2147483648 to 2147483647)`,
          expected: '-2147483648 to 2147483647',
          actual: String(value)
        });
      }
      break;
    case 'f64':
      if (typeof value !== 'number') {
        errors.push({
          field: path,
          message: `Expected number but got ${typeof value}`,
          expected: 'number',
          actual: typeof value
        });
      } else if (!Number.isFinite(value)) {
        errors.push({
          field: path,
          message: `f64 cannot be NaN or Infinity`,
          expected: 'finite number',
          actual: String(value)
        });
      }
      break;
    case 'bool':
      if (typeof value !== 'boolean') {
        errors.push({
          field: path,
          message: `Expected boolean but got ${typeof value}`,
          expected: 'boolean',
          actual: typeof value
        });
      }
      break;
  }
}

/**
 * Validate a constraint
 */
function validateConstraint(
  constraint: ValidationConstraint,
  value: TONLValue,
  path: string,
  errors: ValidationError[]
): void {
  switch (constraint.type) {
    case 'min':
      if (typeof value === 'string' && value.length < (constraint.value as number)) {
        errors.push({
          field: path,
          message: `String length ${value.length} is less than minimum ${constraint.value}`,
          expected: `min length ${constraint.value}`,
          actual: `length ${value.length}`
        });
      } else if (typeof value === 'number' && value < (constraint.value as number)) {
        errors.push({
          field: path,
          message: `Value ${value} is less than minimum ${constraint.value}`,
          expected: `>= ${constraint.value}`,
          actual: String(value)
        });
      } else if (Array.isArray(value) && value.length < (constraint.value as number)) {
        errors.push({
          field: path,
          message: `Array length ${value.length} is less than minimum ${constraint.value}`,
          expected: `min ${constraint.value} items`,
          actual: `${value.length} items`
        });
      }
      break;

    case 'max':
      if (typeof value === 'string' && value.length > (constraint.value as number)) {
        errors.push({
          field: path,
          message: `String length ${value.length} exceeds maximum ${constraint.value}`,
          expected: `max length ${constraint.value}`,
          actual: `length ${value.length}`
        });
      } else if (typeof value === 'number' && value > (constraint.value as number)) {
        errors.push({
          field: path,
          message: `Value ${value} exceeds maximum ${constraint.value}`,
          expected: `<= ${constraint.value}`,
          actual: String(value)
        });
      } else if (Array.isArray(value) && value.length > (constraint.value as number)) {
        errors.push({
          field: path,
          message: `Array length ${value.length} exceeds maximum ${constraint.value}`,
          expected: `max ${constraint.value} items`,
          actual: `${value.length} items`
        });
      }
      break;

    case 'pattern':
      if (typeof value === 'string') {
        const pattern = getBuiltinPattern(constraint.value as string);
        if (pattern && !pattern.test(value)) {
          errors.push({
            field: path,
            message: `String does not match pattern '${constraint.value}'`,
            expected: `pattern: ${constraint.value}`,
            actual: value
          });
        }
      }
      break;

    case 'enum':
      {
        const allowedValues = String(constraint.value).split('|');
        if (!allowedValues.includes(String(value))) {
          errors.push({
            field: path,
            message: `Value '${value}' is not one of: ${allowedValues.join(', ')}`,
            expected: allowedValues.join(' | '),
            actual: String(value)
          });
        }
      }
      break;

    case 'unique':
      if (Array.isArray(value)) {
        const seen = new Set();
        const duplicates: any[] = [];
        for (const item of value) {
          const key = JSON.stringify(item);
          if (seen.has(key)) {
            duplicates.push(item);
          }
          seen.add(key);
        }
        if (duplicates.length > 0) {
          errors.push({
            field: path,
            message: `Array contains ${duplicates.length} duplicate value(s)`,
            expected: 'all unique values',
            actual: `${duplicates.length} duplicates`
          });
        }
      }
      break;

    case 'nonempty':
      if (Array.isArray(value) && value.length === 0) {
        errors.push({
          field: path,
          message: 'Array cannot be empty',
          expected: 'at least 1 item',
          actual: '0 items'
        });
      }
      break;

    case 'positive':
      if (typeof value === 'number' && value <= 0) {
        errors.push({
          field: path,
          message: `Value must be positive but got ${value}`,
          expected: '> 0',
          actual: String(value)
        });
      }
      break;

    case 'negative':
      if (typeof value === 'number' && value >= 0) {
        errors.push({
          field: path,
          message: `Value must be negative but got ${value}`,
          expected: '< 0',
          actual: String(value)
        });
      }
      break;

    case 'integer':
      if (typeof value === 'number' && !Number.isInteger(value)) {
        errors.push({
          field: path,
          message: `Value must be an integer but got ${value}`,
          expected: 'integer',
          actual: String(value)
        });
      }
      break;

    case 'length':
      if (typeof value === 'string' && value.length !== (constraint.value as number)) {
        errors.push({
          field: path,
          message: `String length ${value.length} does not match required length ${constraint.value}`,
          expected: `length ${constraint.value}`,
          actual: `length ${value.length}`
        });
      } else if (Array.isArray(value) && value.length !== (constraint.value as number)) {
        errors.push({
          field: path,
          message: `Array length ${value.length} does not match required length ${constraint.value}`,
          expected: `${constraint.value} items`,
          actual: `${value.length} items`
        });
      }
      break;

    case 'multipleOf':
      if (typeof value === 'number') {
        const divisor = constraint.value as number;
        // Use epsilon for floating point comparison
        const remainder = Math.abs(value % divisor);
        const epsilon = 1e-10;
        if (remainder > epsilon && Math.abs(remainder - divisor) > epsilon) {
          errors.push({
            field: path,
            message: `Value ${value} is not a multiple of ${divisor}`,
            expected: `multiple of ${divisor}`,
            actual: String(value)
          });
        }
      }
      break;
  }
}

/**
 * Get built-in regex patterns
 * BUGFIX (BUG-003): Added validation to prevent ReDoS attacks
 */
function getBuiltinPattern(name: string): RegExp | null {
  switch (name) {
    case 'email':
      return /^[\w\.-]+@[\w\.-]+\.\w+$/;
    case 'url':
      return /^https?:\/\/.+/;
    case 'date':
      return /^\d{4}-\d{2}-\d{2}/;
    default:
      // BUGFIX (BUG-003): Validate regex pattern to prevent ReDoS
      // Reject patterns that are too long (potential DoS)
      // Aligned with DEFAULT_SECURITY_LIMITS.MAX_REGEX_PATTERN_LENGTH (Task 004)
      if (name.length > 100) {
        return null;
      }

      // BUG-NEW-012 FIX: Check for balanced parentheses/brackets before running ReDoS detection regexes
      // This prevents the ReDoS detection regexes themselves from being vulnerable
      let parenCount = 0;
      let bracketCount = 0;
      for (let i = 0; i < name.length; i++) {
        if (name[i] === '(' && (i === 0 || name[i-1] !== '\\')) parenCount++;
        if (name[i] === ')' && (i === 0 || name[i-1] !== '\\')) parenCount--;
        if (name[i] === '[' && (i === 0 || name[i-1] !== '\\')) bracketCount++;
        if (name[i] === ']' && (i === 0 || name[i-1] !== '\\')) bracketCount--;
        // Reject patterns with unbalanced brackets (negative count indicates more closing than opening)
        if (parenCount < 0 || bracketCount < 0) {
          return null;
        }
      }
      // Reject patterns with unclosed parentheses/brackets
      if (parenCount !== 0 || bracketCount !== 0) {
        return null;
      }

      // Reject patterns with dangerous constructs
      // Look for nested quantifiers: (a+)+ or (a*)* or (a+)* etc.
      if (/(\([^)]*[+*]\)[+*?{])|(\[[^\]]*[+*]\][+*?{])/.test(name)) {
        return null;
      }

      // Reject excessive backtracking patterns
      if (/(\.\*){2,}|(\.\+){2,}/.test(name)) {
        return null;
      }

      // BUGFIX BF003: Additional ReDoS pattern detection
      // Reject patterns with catastrophic backtracking potential
      const dangerousPatterns = [
        // Nested quantifiers
        /\(\.\*\*\)/,
        /\(\.\+\+\)/,
        /\(\[\^\\n\]\*\*\)/,
        // Alternation with overlapping patterns
        /(\.\*\|.*\.\*)/,
        /(\.\+\|.*\.\+)/,
        // Excessive repetition
        /\{1000,\}/,
        // Complex lookahead/behind combinations
        /\(\?=[^\)]*\)\(\?\!/,
        // Multiple consecutive wildcards
        /\.\*\.\*\.\*/,
        // Unicode property abuse
        /\\p\{\w+\}\*\{10,\}/,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(name)) {
          return null;
        }
      }

      // Check pattern complexity (count of special regex characters)
      const specialChars = (name.match(/[.*+?^${}()|[\]\\]/g) || []).length;
      if (specialChars > 50) { // Arbitrary limit to prevent extremely complex patterns
        return null;
      }

      try {
        return new RegExp(name);
      } catch {
        return null;
      }
  }
}
