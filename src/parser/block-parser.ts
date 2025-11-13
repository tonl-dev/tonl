/**
 * Block-level parsing - handles multi-line structures
 */

import type { TONLParseContext, TONLValue, TONLObject, TONLArray, TONLObjectHeader, TONLColumnDef } from '../types.js';
import { MISSING_FIELD_MARKER } from '../types.js';
import { parseObjectHeader, parseTONLLine } from '../parser.js';
import { coerceValue } from '../infer.js';
import { parsePrimitiveValue } from './line-parser.js';
import { parseSingleLineObject } from './value-parser.js';
import { extractNestedBlockLines } from './utils.js';
import { TONLParseError } from '../errors/index.js';

/**
 * Parse a block starting from a header
 * Dispatches to parseObjectBlock or parseArrayBlock based on header type
 */
export function parseBlock(
  header: TONLObjectHeader | null,
  lines: string[],
  startIndex: number,
  context: TONLParseContext
): TONLValue {
  if (!header) {
    throw new Error("Invalid header for block parsing");
  }

  const blockLines: string[] = [];
  const headerIndent = lines[startIndex]?.match(/^(\s*)/)?.[1]?.length || 0;
  let i = startIndex + 1;

  // Find the block's content lines
  let inMultilineString = false;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const currentIndent = line.match(/^(\s*)/)?.[1]?.length || 0;

    // Track multiline strings
    let justEndedMultiline = false;
    if (trimmed.includes('"""')) {
      const quoteCount = (trimmed.match(/"""/g) || []).length;

      if (inMultilineString) {
        if (trimmed.endsWith('"""')) {
          inMultilineString = false;
          justEndedMultiline = true;
        }
      } else {
        const afterFirstQuote = trimmed.split('"""')[1];
        if (afterFirstQuote && !afterFirstQuote.endsWith('"""')) {
          inMultilineString = true;
        }
      }
    }

    // Break if we're at a lower indent level
    if (!inMultilineString && currentIndent < headerIndent) {
      break;
    }

    // Break if we're at the same level and this is a new header (for arrays) or not an array
    if (!inMultilineString && !justEndedMultiline && currentIndent === headerIndent) {
      const isNewHeader = trimmed.endsWith(':');
      if (!header.isArray || isNewHeader) {
        break;
      }
    }

    blockLines.push(line);
    i++;
  }

  if (header.isArray) {
    return parseArrayBlock(header, blockLines, context);
  } else {
    return parseObjectBlock(header, blockLines, context);
  }
}

/**
 * Parse an object block - handles nested objects and key-value pairs
 */
export function parseObjectBlock(
  header: TONLObjectHeader | null,
  lines: string[],
  context: TONLParseContext
): TONLObject {
  const result: TONLObject = {};

  let lineIndex = 0;
  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('@')) {
      lineIndex++;
      continue;
    }

    // Single-line nested object format
    const singleLineMatch = trimmed.match(/^(.+)\{([^}]*)\}:\s+(.+)$/);
    if (singleLineMatch) {
      const key = singleLineMatch[1].trim();
      const columnsStr = singleLineMatch[2].trim();
      const valuePart = singleLineMatch[3].trim();

      const columns: TONLColumnDef[] = [];
      if (columnsStr) {
        const colParts = columnsStr.split(',');
        for (const colPart of colParts) {
          const trimmedCol = colPart.trim();
          if (!trimmedCol) continue;
          const colonIndex = trimmedCol.indexOf(':');
          if (colonIndex > 0) {
            columns.push({
              name: trimmedCol.slice(0, colonIndex).trim(),
              type: trimmedCol.slice(colonIndex + 1).trim() as any
            });
          } else {
            columns.push({ name: trimmedCol });
          }
        }
      }

      const nestedHeader: TONLObjectHeader = { key, isArray: false, columns };
      result[key] = parseSingleLineObject(nestedHeader, valuePart, context);
      lineIndex++;
      continue;
    }

    // Multi-line nested header
    const nestedHeader = parseObjectHeader(trimmed);
    if (nestedHeader) {
      const nestedContentLines = extractNestedBlockLines(lines, lineIndex);
      const nestedBlockLines = [line, ...nestedContentLines];
      const nestedValue = parseBlock(nestedHeader, nestedBlockLines, 0, context);
      result[nestedHeader.key] = nestedValue;
      lineIndex += nestedContentLines.length + 1;
      continue;
    }

    // Array format: key[N]: values
    const arrayMatch = trimmed.match(/^(.+)\[(\d+)\]:\s*(.+)$/);
    if (arrayMatch) {
      const key = arrayMatch[1].trim();
      // BUGFIX BUG-F001: Validate parseInt result to prevent NaN
      const arrayLength = parseInt(arrayMatch[2], 10);
      if (!Number.isSafeInteger(arrayLength) || arrayLength < 0) {
        throw new TONLParseError(
          `Invalid array length: ${arrayMatch[2]}`,
          context.currentLine,
          undefined,
          line
        );
      }
      const valuePart = arrayMatch[3].trim();

      if (valuePart.includes('{') || valuePart.includes(':')) {
        const nestedHeader: TONLObjectHeader = { key, isArray: true, arrayLength, columns: [] as TONLColumnDef[] };
        result[key] = parseSingleLineObject(nestedHeader, valuePart, context);
      } else {
        const fields = parseTONLLine(valuePart, context.delimiter);
        const resultArray: TONLValue[] = [];
        for (const field of fields) {
          resultArray.push(parsePrimitiveValue(field, context));
        }
        result[key] = resultArray;
      }
      lineIndex++;
      continue;
    }

    // Simple key-value pair
    const kvMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const rawValue = kvMatch[2].trim();

      // Multiline triple-quoted string
      if (rawValue.startsWith('"""')) {
        if (rawValue.endsWith('"""')) {
          result[key] = rawValue.slice(3, -3)
            .replace(/\\"""/g, '"""')
            .replace(/\\\\/g, '\\');
        } else {
          const multilineContent: string[] = [rawValue.slice(3)];
          lineIndex++;

          while (lineIndex < lines.length) {
            const currentLine = lines[lineIndex];
            const trimmedForCheck = currentLine.trim();

            if (trimmedForCheck.endsWith('"""')) {
              // For the last line, find the closing quotes in the actual line (not trimmed)
              const closeIndex = currentLine.lastIndexOf('"""');
              if (closeIndex >= 0) {
                // Get indent (only spaces/tabs, not other whitespace like \r)
                const indent = currentLine.match(/^([ \t]*)/)?.[1]?.length || 0;
                const content = currentLine.slice(indent, closeIndex);
                multilineContent.push(content);
              }
              lineIndex++;
              break;
            } else {
              // Preserve line content with proper indentation handling
              const indent = currentLine.match(/^([ \t]*)/)?.[1]?.length || 0;
              const content = currentLine.slice(indent);
              multilineContent.push(content);
              lineIndex++;
            }
          }
          result[key] = multilineContent.join('\n')
            .replace(/\\"""/g, '"""')
            .replace(/\\\\/g, '\\');
          continue;
        }
      } else {
        result[key] = parsePrimitiveValue(rawValue, context);
      }
      lineIndex++;
    } else {
      lineIndex++;
    }
  }

  return result;
}

/**
 * Parse an array block - handles both primitive and object arrays
 */
export function parseArrayBlock(
  header: TONLObjectHeader | null,
  lines: string[],
  context: TONLParseContext
): TONLArray {
  const result: TONLArray = [];

  if (!header || header.columns.length === 0) {
    // Check for mixed format (object headers)
    const hasObjectHeaders = lines.some(line => {
      const trimmed = line.trim();
      return parseObjectHeader(trimmed) !== null;
    });

    if (hasObjectHeaders) {
      // Mixed format array
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('@')) continue;

        const nestedHeader = parseObjectHeader(trimmed);
        if (nestedHeader) {
          const nestedContentLines = extractNestedBlockLines(lines, lineIndex);
          const nestedBlockLines = [line, ...nestedContentLines];
          const nestedValue = parseBlock(nestedHeader, nestedBlockLines, 0, context);

          const indexMatch = nestedHeader.key.match(/^\[(\d+)\]$/);
          if (indexMatch) {
            const index = parseInt(indexMatch[1], 10);
            result[index] = nestedValue;
          } else {
            result.push(nestedValue);
          }

          lineIndex += nestedContentLines.length;
        }
      }
    } else {
      // Primitive array
      if (lines.length > 0) {
        const values = parseTONLLine(lines[0], context.delimiter);
        for (const value of values) {
          result.push(parsePrimitiveValue(value, context));
        }
      }
    }
  } else {
    // Tabular object array
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('@')) continue;

      const values = parseTONLLine(trimmed, context.delimiter);
      if (values.length === 0) continue;

      if (values.length > header.columns.length) {
        if (context.strict) {
          throw new Error(`Too many values for array with ${header.columns.length} columns: got ${values.length} values`);
        } else {
          values.length = header.columns.length;
        }
      }

      const rowObj: TONLObject = {};
      for (let j = 0; j < header.columns.length && j < values.length; j++) {
        const column = header.columns[j];
        const value = values[j];

        // Skip missing field marker - don't add the field to the object
        if (value === MISSING_FIELD_MARKER) {
          continue;
        }

        if (value.startsWith('[') || value.includes('{')) {
          rowObj[column.name] = parsePrimitiveValue(value, context);
        } else {
          let parsedValue: TONLValue;
          if (column.type) {
            parsedValue = coerceValue(value, column.type as any);
          } else {
            parsedValue = parsePrimitiveValue(value, context);
          }
          rowObj[column.name] = parsedValue;
        }
      }
      result.push(rowObj);
    }
  }

  // Validate array length in strict mode
  if (context.strict && header && header.arrayLength !== undefined && result.length !== header.arrayLength) {
    throw new Error(`Array length mismatch: expected ${header.arrayLength}, got ${result.length}`);
  }

  return result;
}
