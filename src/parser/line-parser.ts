/**
 * Line-level parsing functions
 */

import type { TONLParseContext, TONLValue } from '../types.js';
import { unquote } from '../utils/strings.js';
import { parseTONLLineWithQuoteInfo } from '../parser.js';

/**
 * Parse a primitive value from a string
 * Handles null, undefined, booleans, numbers, and quoted/unquoted strings
 * @param value Raw string value
 * @param context Parse context
 * @returns Parsed primitive value
 */
export function parsePrimitiveValue(value: string, context: TONLParseContext): TONLValue {
  // Don't trim strings that are just whitespace - they might be intentional content
  const isAllWhitespace = /^\s*$/.test(value);
  const trimmed = isAllWhitespace ? value : value.trim();

  if (trimmed === "null") {
    return null;
  }

  if (trimmed === "undefined") {
    return undefined;
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  // Handle special numeric values
  if (trimmed === "Infinity") {
    return Infinity;
  }

  if (trimmed === "-Infinity") {
    return -Infinity;
  }

  if (trimmed === "NaN") {
    return NaN;
  }

  // Handle triple-quoted strings FIRST (before single quotes)
  if (trimmed.startsWith('"""') && trimmed.endsWith('"""')) {
    return trimmed.slice(3, -3)
      .replace(/\\"""/g, '"""')   // Unescape triple quotes first
      .replace(/\\\\/g, '\\')      // Then unescape backslashes
      .replace(/\\r/g, '\r')      // Unescape carriage returns
      .replace(/\\n/g, '\n')      // Unescape newlines
      .replace(/\\t/g, '\t');      // Unescape tabs
  }

  // Handle quoted strings
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return unquote(trimmed);
  }

  // Try to parse as number
  if (/^-?\d+$/.test(trimmed)) {
    // BUGFIX BUG-F002: Validate parseInt result to prevent NaN/Infinity
    const num = parseInt(trimmed, 10);
    if (!Number.isFinite(num)) {
      // For truly invalid numbers (Infinity), keep as string
      return trimmed;
    }

    // BUG-007 FIX: Check for precision loss with large integers
    if (Math.abs(num) > Number.MAX_SAFE_INTEGER) {
      // For any integer exceeding MAX_SAFE_INTEGER, preserve as string
      // This prevents silent data corruption since JavaScript cannot represent
      // these integers precisely without precision loss
      return trimmed;
    }

    return num;
  }

  if (/^-?\d*\.\d+$/.test(trimmed)) {
    // BUGFIX BUG-F002: Validate parseFloat result to prevent NaN/Infinity
    const num = parseFloat(trimmed);
    if (!Number.isFinite(num)) {
      return trimmed; // Keep as string for invalid numbers
    }
    return num;
  }

  // Try to parse as scientific notation (e.g., 1.23e10, -4.56e-7)
  if (/^-?\d+\.?\d*e[+-]?\d+$/i.test(trimmed)) {
    // BUGFIX BUG-F002: Validate parseFloat result to prevent NaN/Infinity
    const num = parseFloat(trimmed);
    if (!Number.isFinite(num)) {
      return trimmed; // Keep as string for invalid numbers
    }
    return num;
  }

  // Default to string
  return trimmed;
}

/**
 * Parse one field of a delimited line.
 *
 * The line parser has already removed the quotes of a quoted field and
 * unescaped its content, so a quoted field is the string itself: it must not
 * be trimmed, unquoted again, or coerced to a number, boolean or null.
 * Triple-quoted fields keep their delimiters and are decoded here.
 *
 * @param value Field content as returned by the line parser
 * @param wasQuoted Whether the field was quoted on the wire
 * @param context Parse context
 * @returns Parsed value
 */
export function parseFieldValue(value: string, wasQuoted: boolean, context: TONLParseContext): TONLValue {
  if (wasQuoted && !value.startsWith('"""')) {
    return value;
  }
  return parsePrimitiveValue(value, context);
}

/**
 * Split a delimited line of values (an inline array) and parse each field,
 * keeping quoted fields as strings.
 *
 * @param line The values part of the line
 * @param context Parse context
 * @returns Parsed values
 */
export function parseDelimitedValues(line: string, context: TONLParseContext): TONLValue[] {
  const { values, quoted } = parseTONLLineWithQuoteInfo(line, context.delimiter);
  return values.map((value, i) => parseFieldValue(value, quoted[i] ?? false, context));
}
