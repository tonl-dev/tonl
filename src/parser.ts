/**
 * Core parsing utilities for TONL format
 */

import type { ParserState, TONLDelimiter, TONLObjectHeader, TONLColumnDef } from "./types.js";
import { TONLParseError } from "./errors/index.js";

// Task 013: Import from centralized security limits
import {
  MAX_LINE_LENGTH,
  MAX_FIELDS_PER_LINE,
} from "./utils/security-limits.js";

/**
 * Parse a single TONL line into array of field values.
 * Handles quoting, escaping, and triple-quotes according to spec.
 * SECURITY: Now includes input validation limits (BF006).
 *
 * This is a thin wrapper over the shared `_runParseTONLLine` state
 * machine — see that function for the parsing logic. Setting
 * `fieldQuoted` on the state enables parallel quote-state tracking
 * (used by `parseTONLLineWithQuoteInfo`).
 */
export function parseTONLLine(line: string, delimiter: TONLDelimiter = ","): string[] {
  // Handle empty lines
  if (!line || line.trim() === "") {
    return [];
  }

  const state: ParserState = {
    mode: "plain",
    currentField: "",
    fields: [],
    i: 0,
    line,
    currentFieldWasQuoted: false
    // fieldQuoted intentionally omitted — not requested.
  };

  _runParseTONLLine(state, delimiter);
  return state.fields;
}

/**
 * Parse a single TONL line into array of field values, also returning the
 * "quoted" state of each field. A field is considered quoted when it was
 * surrounded by `"` (or `"""`) on the wire. This is needed to disambiguate
 * between an empty quoted string `""` (which represents the user value "")
 * and an empty unquoted field between two delimiters (which represents a
 * MISSING field in tabular data).
 *
 * @param line Raw line to parse
 * @param delimiter Field delimiter
 * @returns Object containing the parsed values and a parallel array of
 *   boolean flags indicating whether each field was quoted on the wire.
 */
export function parseTONLLineWithQuoteInfo(
  line: string,
  delimiter: TONLDelimiter = ","
): { values: string[]; quoted: boolean[] } {
  if (!line || line.trim() === "") {
    return { values: [], quoted: [] };
  }

  // Drive the impl with a single shared state object so we can read
  // both `fields` (returned) and `fieldQuoted` (populated as a side
  // effect) without duplicating the parser state machine.
  const state: ParserState = {
    mode: "plain",
    currentField: "",
    fields: [],
    i: 0,
    line,
    currentFieldWasQuoted: false,
    fieldQuoted: []
  };

  _runParseTONLLine(state, delimiter);
  return { values: state.fields, quoted: state.fieldQuoted! };
}

/**
 * Shared parse state machine for `parseTONLLine` and
 * `parseTONLLineWithQuoteInfo`. Mutates `state` in place; the caller
 * reads `state.fields` and (if requested) `state.fieldQuoted`.
 *
 * Quote tracking is enabled by setting `state.fieldQuoted = []` before
 * calling; otherwise the array is left untouched.
 *
 * @internal
 */
function _runParseTONLLine(state: ParserState, delimiter: TONLDelimiter): void {
  const line = state.line;
  const trackQuotes = state.fieldQuoted !== undefined;

  // SECURITY FIX (BF006): Validate line length
  if (line.length > MAX_LINE_LENGTH) {
    throw new TONLParseError(
      `Line exceeds maximum length: ${line.length} characters (max: ${MAX_LINE_LENGTH})`
    );
  }

  // Track bracket depth for arrays (schema-first support)
  let bracketDepth = 0;

  while (state.i < line.length) {
    const char = line[state.i];
    const nextChar = line[state.i + 1];

    switch (state.mode) {
      case "plain":
        if (char === '"') {
          if (nextChar === '"' && line[state.i + 2] === '"') {
            state.mode = "inTripleQuote";
            state.currentFieldWasQuoted = true;
            state.currentField = '"""';
            state.i += 2;
          } else {
            state.mode = "inQuote";
            state.currentFieldWasQuoted = true;
          }
        } else if (char === '\\' && nextChar !== undefined && nextChar === delimiter) {
          state.currentField += delimiter;
          state.i++;
        } else if (char === delimiter) {
          if (bracketDepth === 0) {
            if (trackQuotes) {
              state.fieldQuoted!.push(state.currentFieldWasQuoted);
            }
            if (state.currentFieldWasQuoted) {
              state.fields.push(state.currentField);
            } else {
              state.fields.push(state.currentField.trim());
            }
            state.currentField = "";
            state.currentFieldWasQuoted = false;
          } else {
            state.currentField += char;
          }
        } else if ((char === ' ' || char === '\t') && state.currentField.length === 0 && nextChar === '"') {
          // skip formatting whitespace before quoted fields
        } else if ((char === ' ' || char === '\t') && state.currentField.length === 0) {
          state.currentField += char;
        } else if (char === '[') {
          bracketDepth++;
          state.currentField += char;
        } else if (char === ']') {
          if (bracketDepth > 0) bracketDepth--;
          state.currentField += char;
        } else {
          state.currentField += char;
        }
        break;

      case "inQuote":
        if (char === '\\' && nextChar !== undefined) {
          if (nextChar === '"') { state.currentField += '"'; state.i++; }
          else if (nextChar === '\\') { state.currentField += '\\'; state.i++; }
          else if (nextChar === 'r') { state.currentField += '\r'; state.i++; }
          else if (nextChar === 'n') { state.currentField += '\n'; state.i++; }
          else if (nextChar === 't') { state.currentField += '\t'; state.i++; }
          else { state.currentField += char; }
        } else if (char === '"') {
          if (nextChar === '"') {
            state.currentField += '"';
            state.i++;
          } else {
            state.mode = "plain";
          }
        } else if (char === '[') {
          bracketDepth++;
          state.currentField += char;
        } else if (char === ']') {
          if (bracketDepth > 0) bracketDepth--;
          state.currentField += char;
        } else {
          state.currentField += char;
        }
        break;

      case "inTripleQuote":
        if (char === '"' && nextChar === '"' && line[state.i + 2] === '"') {
          state.currentField += '"""';
          state.mode = "plain";
          state.i += 2;
        } else if (char === '[') {
          bracketDepth++;
          state.currentField += char;
        } else if (char === ']') {
          if (bracketDepth > 0) bracketDepth--;
          state.currentField += char;
        } else {
          state.currentField += char;
        }
        break;
    }

    state.i++;
  }

  if (trackQuotes) {
    state.fieldQuoted!.push(state.currentFieldWasQuoted);
  }
  if (state.currentFieldWasQuoted) {
    state.fields.push(state.currentField);
  } else {
    state.fields.push(state.currentField.trim());
  }

  if (state.fields.length > MAX_FIELDS_PER_LINE) {
    throw new TONLParseError(
      `Too many fields: ${state.fields.length} (max: ${MAX_FIELDS_PER_LINE})`
    );
  }
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