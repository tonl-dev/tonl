/**
 * String utilities for TONL encoding/decoding
 */

import type { TONLDelimiter, TONLTypeHint } from "../types.js";

/**
 * Check if a value needs quoting based on TONL quoting rules
 */
export function needsQuoting(value: string, delimiter: TONLDelimiter): boolean {
  return value.includes(delimiter) ||
         value.includes(':') ||
         value.includes('{') ||
         value.includes('}') ||
         value.includes('#') ||
         value.includes('\n') ||
         value.startsWith(' ') ||
         value.endsWith(' ');
}

/**
 * Quote a value if needed according to TONL rules
 */
export function quoteIfNeeded(value: string, delimiter: TONLDelimiter): string {
  if (needsQuoting(value, delimiter)) {
    // Escape existing quotes by doubling them and escape backslashes
    return `"${value.replace(/"/g, '""').replace(/\\/g, '\\\\')}"`;
  }
  return value;
}

/**
 * Unquote a value, handling doubled quotes and escaped backslashes
 */
export function unquote(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    // Remove outer quotes and unescape doubled quotes and backslashes
    return value.slice(1, -1).replace(/""/g, '"').replace(/\\\\/g, '\\');
  }
  return value;
}

/**
 * Handle triple-quoted content
 */
export function tripleQuoteIfNeeded(value: string, delimiter: TONLDelimiter): string {
  if (value.includes('\n') || value.includes('"""')) {
    // For multi-line content, always use triple quotes
    // Escape backslashes but not triple quotes inside
    const escaped = value.replace(/\\/g, '\\\\');
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

/**
 * Escape delimiter in plain text mode
 */
export function escapeDelimiter(value: string, delimiter: TONLDelimiter): string {
  return value.replace(new RegExp(`\\${delimiter}`, 'g'), `\\${delimiter}`);
}