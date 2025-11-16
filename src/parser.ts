/**
 * Core parsing utilities for TONL format
 */

import type { ParserState, ParserMode, TONLDelimiter, TONLObjectHeader, TONLColumnDef } from "./types.js";
import { TONLParseError } from "./errors/index.js";

/**
 * Input validation limits to prevent DoS attacks
 * SECURITY: These limits prevent parser crashes, stack overflow, and memory exhaustion
 */
const MAX_LINE_LENGTH = 100_000;   // 100KB per line
const MAX_FIELDS_PER_LINE = 10_000; // Maximum fields in a single line
const MAX_NESTING_DEPTH = 100;      // Maximum nesting levels

/**
 * Parse a single TONL line into array of field values
 * Handles quoting, escaping, and triple-quotes according to spec
 * SECURITY: Now includes input validation limits (BF006)
 */
export function parseTONLLine(line: string, delimiter: TONLDelimiter = ","): string[] {
  // Handle empty lines
  if (!line || line.trim() === "") {
    return [];
  }

  // SECURITY FIX (BF006): Validate line length
  if (line.length > MAX_LINE_LENGTH) {
    throw new TONLParseError(
      `Line exceeds maximum length: ${line.length} characters (max: ${MAX_LINE_LENGTH})`
    );
  }

  const state: ParserState = {
    mode: "plain",
    currentField: "",
    fields: [],
    i: 0,
    line,
    currentFieldWasQuoted: false
  };

  // Track bracket depth for arrays (schema-first support)
  let bracketDepth = 0;

  while (state.i < line.length) {
    const char = line[state.i];
    const nextChar = line[state.i + 1];

    switch (state.mode) {
      case "plain":
        if (char === '"') {
          // Check for triple quote
          if (nextChar === '"' && line[state.i + 2] === '"') {
            state.mode = "inTripleQuote";
            state.currentFieldWasQuoted = true;
            state.currentField = '"""'; // Start with triple quotes
            state.i += 2; // Skip the next two quotes
          } else {
            state.mode = "inQuote";
            state.currentFieldWasQuoted = true;
          }
        } else if (char === '\\' && nextChar !== undefined && nextChar === delimiter) {
          // Escaped delimiter
          state.currentField += delimiter;
          state.i++; // Skip the backslash
        } else if (char === delimiter) {
          // Field separator - only split if we're not inside brackets or quotes
          if (bracketDepth === 0) {
            if (state.currentFieldWasQuoted) {
              state.fields.push(state.currentField);
            } else {
              state.fields.push(state.currentField.trim());
            }
            state.currentField = "";
            state.currentFieldWasQuoted = false;
          } else {
            // We're inside brackets, include delimiter in the field
            state.currentField += char;
          }
        } else if ((char === ' ' || char === '\t') && state.currentField.length === 0 && nextChar === '"') {
          // Skip formatting whitespace before quoted fields (space after comma)
          // This handles cases like "2, \"Bob, Jr.\""
        } else if ((char === ' ' || char === '\t') && state.currentField.length === 0) {
          // For other leading whitespace, preserve it (might be content)
          state.currentField += char;
        } else if (char === '[') {
          // Track bracket depth for arrays
          bracketDepth++;
          state.currentField += char;
        } else if (char === ']') {
          // Decrease bracket depth when closing bracket found
          if (bracketDepth > 0) {
            bracketDepth--;
          }
          state.currentField += char;
        } else {
          state.currentField += char;
        }
        break;

      case "inQuote":
        if (char === '\\' && nextChar !== undefined) {
          // Backslash escape - handle all escape sequences
          if (nextChar === '"') {
            state.currentField += '"';
            state.i++; // Skip the escaped character
          } else if (nextChar === '\\') {
            state.currentField += '\\';
            state.i++; // Skip the escaped character
          } else if (nextChar === 'r') {
            state.currentField += '\r';
            state.i++; // Skip the escaped character
          } else if (nextChar === 'n') {
            state.currentField += '\n';
            state.i++; // Skip the escaped character
          } else if (nextChar === 't') {
            state.currentField += '\t';
            state.i++; // Skip the escaped character
          } else {
            // Unknown escape sequence, preserve as-is
            state.currentField += char;
          }
        } else if (char === '"') {
          if (nextChar === '"') {
            // Doubled quote = literal quote (backward compatibility)
            state.currentField += '"';
            state.i++; // Skip the second quote
          } else {
            // End of quoted field
            state.mode = "plain";
          }
        } else if (char === '[') {
          // Track bracket depth for arrays
          bracketDepth++;
          state.currentField += char;
        } else if (char === ']') {
          // Decrease bracket depth when closing bracket found
          if (bracketDepth > 0) {
            bracketDepth--;
          }
          state.currentField += char;
        } else {
          state.currentField += char;
        }
        break;

      case "inTripleQuote":
        // Look for closing triple quote
        if (char === '"' && nextChar === '"' && line[state.i + 2] === '"') {
          state.currentField += '"""'; // Add closing triple quotes
          state.mode = "plain";
          state.i += 2; // Skip the next two quotes
        } else if (char === '[') {
          // Track bracket depth for arrays
          bracketDepth++;
          state.currentField += char;
        } else if (char === ']') {
          // Decrease bracket depth when closing bracket found
          if (bracketDepth > 0) {
            bracketDepth--;
          }
          state.currentField += char;
        } else {
          state.currentField += char;
        }
        break;
    }

    state.i++;
  }

  // Add the last field - trim unquoted fields, preserve quoted fields
  if (state.currentFieldWasQuoted) {
    state.fields.push(state.currentField);
  } else {
    state.fields.push(state.currentField.trim());
  }

  // SECURITY FIX (BF006): Validate field count
  if (state.fields.length > MAX_FIELDS_PER_LINE) {
    throw new TONLParseError(
      `Too many fields: ${state.fields.length} (max: ${MAX_FIELDS_PER_LINE})`
    );
  }

  return state.fields;
}

/**
 * Parse TONL header lines (starting with #)
 */
export function parseHeaderLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("#")) {
    return null;
  }

  const match = trimmed.match(/^#(\w+)\s+(.+)$/);
  if (!match) {
    return null;
  }

  return { key: match[1], value: match[2].trim() };
}

/**
 * Parse object header like: users[2]{id:u32,name:str,role:str}:
 */
export function parseObjectHeader(line: string): TONLObjectHeader | null {
  const trimmed = line.trim();
  if (!trimmed.endsWith(":")) {
    return null;
  }

  // Remove trailing colon
  const headerContent = trimmed.slice(0, -1);

  // Extract key first - support both regular keys and indexed keys like [0]
  let key: string;
  let remaining: string;

  const indexedKeyMatch = headerContent.match(/^\[(\d+)\]/);
  if (indexedKeyMatch) {
    // Indexed key like [0]
    key = `[${indexedKeyMatch[1]}]`;
    remaining = headerContent.slice(indexedKeyMatch[0].length);
  } else {
    // Regular key starting with letter
    const keyMatch = headerContent.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (!keyMatch) {
      return null;
    }
    key = keyMatch[1];
    remaining = headerContent.slice(key.length);
  }

  // Check for array notation [N]
  let isArray = false;
  let arrayLength: number | undefined;
  let content = remaining;

  const arrayMatch = remaining.match(/^\[(\d+)\]/);
  if (arrayMatch) {
    isArray = true;
    arrayLength = parseInt(arrayMatch[1], 10);
    content = remaining.slice(arrayMatch[0].length);
  }

  // Parse column definitions {col1:type1,col2:type2,...}
  const columns: TONLColumnDef[] = [];
  const colMatch = content.match(/^\{(.+)\}$/);
  if (colMatch) {
    const colContent = colMatch[1];
    const colParts = splitColumnDefinitions(colContent);

    for (const colPart of colParts) {
      const trimmed = colPart.trim();
      if (!trimmed) continue;

      // Handle quoted column names
      let columnName: string;
      let typeHint: string | undefined;

      if (trimmed.startsWith('"')) {
        // Find the end of the quoted name
        const endQuoteIndex = trimmed.indexOf('"', 1);
        if (endQuoteIndex > 0) {
          columnName = trimmed.slice(1, endQuoteIndex).replace(/""/g, '"');
          const remainder = trimmed.slice(endQuoteIndex + 1);
          const colonIndex = remainder.indexOf(':');
          if (colonIndex >= 0) {
            typeHint = remainder.slice(colonIndex + 1).trim();
          }
        } else {
          columnName = trimmed;
        }
      } else {
        // Unquoted column name - find first colon for type hint
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          columnName = trimmed.slice(0, colonIndex).trim();
          typeHint = trimmed.slice(colonIndex + 1).trim();
        } else {
          columnName = trimmed;
        }
      }

      if (typeHint) {
        columns.push({
          name: columnName,
          type: typeHint as any
        });
      } else {
        columns.push({ name: columnName });
      }
    }
  }

  return {
    key,
    isArray,
    arrayLength,
    columns
  };
}

/**
 * Helper to split column definitions by comma, respecting quotes
 */
function splitColumnDefinitions(content: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      if (i + 1 < content.length && content[i + 1] === '"') {
        current += '""';
        i++; // Skip escaped quote
      } else {
        inQuote = !inQuote;
        current += '"';
      }
    } else if (char === ',' && !inQuote) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Detect delimiter from TONL content
 */
export function detectDelimiter(content: string): TONLDelimiter {
  // Check for explicit delimiter directive
  const delimiterMatch = content.match(/^#delimiter\s+([,|\t;])/m);
  if (delimiterMatch) {
    const delim = delimiterMatch[1];
    if (delim === "," || delim === "|" || delim === "\t" || delim === ";") {
      return delim;
    }
  }

  // Heuristic: look at first data line and guess
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.endsWith('{') && !trimmed.endsWith(':')) {
      // Count potential delimiters in a single pass (optimized)
      let commaCount = 0, pipeCount = 0, tabCount = 0, semicolonCount = 0;

      for (let i = 0; i < trimmed.length; i++) {
        switch (trimmed[i]) {
          case ',': commaCount++; break;
          case '|': pipeCount++; break;
          case '\t': tabCount++; break;
          case ';': semicolonCount++; break;
        }
      }

      const max = Math.max(commaCount, pipeCount, tabCount, semicolonCount);
      if (max === 0) return ","; // default

      if (commaCount === max) return ",";
      if (pipeCount === max) return "|";
      if (tabCount === max) return "\t";
      if (semicolonCount === max) return ";";
    }
  }

  return ","; // default fallback
}