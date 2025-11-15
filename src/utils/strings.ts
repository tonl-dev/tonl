/**
 * String utilities for TONL encoding/decoding
 */

import type { TONLDelimiter, TONLTypeHint } from "../types.js";

/**
 * Maximum JSON string size to prevent ReDoS attacks (10MB)
 */
const MAX_JSON_SIZE = 10 * 1024 * 1024;

/**
 * Complexity limits for JSON parsing to prevent ReDoS
 */
interface ComplexityLimits {
  maxNesting: number;
  maxProperties: number;
  maxArrayLength: number;
}

const DEFAULT_LIMITS: ComplexityLimits = {
  maxNesting: 100,
  maxProperties: 10000,
  maxArrayLength: 10000
};

/**
 * Safely parse JSON with protection against ReDoS attacks and memory exhaustion
 * @param jsonString - JSON string to parse
 * @param limits - Optional complexity limits
 * @returns Parsed JSON object
 * @throws Error if JSON is invalid or exceeds limits
 */
export function safeJsonParse(jsonString: string, limits: Partial<ComplexityLimits> = {}): unknown {
  const finalLimits = { ...DEFAULT_LIMITS, ...limits };

  // Check input size
  if (jsonString.length > MAX_JSON_SIZE) {
    throw new Error(`JSON input too large: ${jsonString.length} bytes (max: ${MAX_JSON_SIZE})`);
  }

  // Basic structure validation before parsing
  const trimmed = jsonString.trim();
  if (!trimmed) {
    throw new Error('JSON input cannot be empty');
  }

  // Check for basic JSON structure
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    throw new Error('Invalid JSON format: must start with { or [');
  }

  let nesting = 0;
  let inString = false;
  let escapeNext = false;
  let objectCount = 0;
  let arrayCount = 0;

  // Pre-validate complexity
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      switch (char) {
        case '{':
          nesting++;
          objectCount++;
          if (nesting > finalLimits.maxNesting) {
            throw new Error(`JSON nesting too deep: ${nesting} (max: ${finalLimits.maxNesting})`);
          }
          if (objectCount > finalLimits.maxProperties) {
            throw new Error(`Too many objects: ${objectCount} (max: ${finalLimits.maxProperties})`);
          }
          break;
        case '[':
          nesting++;
          arrayCount++;
          if (nesting > finalLimits.maxNesting) {
            throw new Error(`JSON nesting too deep: ${nesting} (max: ${finalLimits.maxNesting})`);
          }
          break;
        case '}':
        case ']':
          nesting--;
          break;
      }
    }
  }

  if (nesting !== 0) {
    throw new Error('Invalid JSON: unbalanced brackets');
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if a value needs quoting based on TONL quoting rules
 */
export function needsQuoting(value: string, delimiter: TONLDelimiter): boolean {
  // Empty strings must be quoted to distinguish from missing values
  if (value === '') return true;

  // Quote boolean-like strings to distinguish from actual booleans
  if (value === 'true' || value === 'false') return true;

  // Quote null-like strings to distinguish from actual null
  if (value === 'null' || value === 'undefined') return true;

  // Quote special numeric strings to distinguish from actual Infinity/NaN
  if (value === 'Infinity' || value === '-Infinity' || value === 'NaN') return true;

  // Quote strings that look like numbers to prevent type confusion
  if (/^-?\d+$/.test(value)) return true;                          // Integer-like strings
  if (/^-?\d*\.\d+$/.test(value)) return true;                     // Decimal-like strings
  if (/^-?\d+\.?\d*e[+-]?\d+$/i.test(value)) return true;          // Scientific notation strings

  return value.includes(delimiter) ||
         value.includes(':') ||
         value.includes('{') ||
         value.includes('}') ||
         value.includes('#') ||
         value.includes('"') ||       // Quote characters need quoting
         value.includes('\n') ||
         value.includes('\t') ||      // Tab characters need quoting
         value.includes('\r') ||      // Carriage return needs quoting
         value.startsWith(' ') ||
         value.endsWith(' ');
}

/**
 * Quote a value if needed according to TONL rules
 */
export function quoteIfNeeded(value: string, delimiter: TONLDelimiter): string {
  if (needsQuoting(value, delimiter)) {
    // Escape backslashes first, then special characters, then quotes
    return `"${value.replace(/\\/g, '\\\\').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/"/g, '\\"')}"`;
  }
  return value;
}

/**
 * Unquote a value, handling backslash-escaped quotes and backslashes
 */
export function unquote(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    // Remove outer quotes and unescape backslash-escaped characters
    const inner = value.slice(1, -1);
    let result = '';
    let i = 0;
    while (i < inner.length) {
      if (inner[i] === '\\' && i + 1 < inner.length) {
        const nextChar = inner[i + 1];
        if (nextChar === '\\' || nextChar === '"' || nextChar === 'r' || nextChar === 'n' || nextChar === 't') {
          // Handle escaped backslashes, quotes, and special characters
          if (nextChar === 'r') {
            result += '\r';
          } else if (nextChar === 'n') {
            result += '\n';
          } else if (nextChar === 't') {
            result += '\t';
          } else {
            result += nextChar;
          }
          i += 2;
        } else {
          result += inner[i];
          i++;
        }
      } else {
        result += inner[i];
        i++;
      }
    }
    return result;
  }
  return value;
}

/**
 * Handle triple-quoted content
 */
export function tripleQuoteIfNeeded(value: string, delimiter: TONLDelimiter): string {
  if (value.includes('\n') || value.includes('"""')) {
    // For multi-line content, always use triple quotes
    // Escape backslashes, special characters, and triple quotes inside
    const escaped = value
      .replace(/\\/g, '\\\\')      // Escape backslashes first
      .replace(/\r/g, '\\r')       // Escape carriage returns to preserve them
      .replace(/\n/g, '\\n')       // Escape newlines to preserve them
      .replace(/\t/g, '\\t')       // Escape tabs to preserve them
      .replace(/"""/g, '\\"""');    // Escape triple quotes
    return `"""${escaped}"""`;
  }
  return quoteIfNeeded(value, delimiter);
}

/**
 * Create proper indentation string
 */
export function makeIndent(level: number, spaces: number): string {
  return " ".repeat(level * spaces);
}