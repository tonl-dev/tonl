/**
 * Content-level parsing - orchestrates parsing of entire TONL document
 */

import type { TONLParseContext, TONLObject, TONLObjectHeader, TONLColumnDef } from '../types.js';
import { parseObjectHeader, parseTONLLine } from '../parser.js';
import { parsePrimitiveValue } from './line-parser.js';
import { parseSingleLineObject } from './value-parser.js';
import { parseBlock } from './block-parser.js';
import { findNextHeader } from './utils.js';
import { TONLParseError } from '../errors/index.js';

/**
 * Parse the main content of a TONL document
 * Orchestrates parsing of all top-level structures
 * @param content TONL content (without @tonl headers)
 * @param context Parse context
 * @returns Parsed object tree
 */
export function parseContent(content: string, context: TONLParseContext): TONLObject {
  const lines = content.split('\n');
  const result: TONLObject = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments (#)
    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    // BUG-014 FIX: Only skip real @ directives, not @ symbol keys
    if (trimmed.startsWith('@')) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const keyword = trimmed.substring(1, colonIndex).trim();
        const knownDirectives = ['version', 'delimiter', 'import', 'schema', 'type', 'description'];
        if (knownDirectives.includes(keyword)) {
          i++;
          continue; // Skip real directives
        }
      }
      // Not a known directive, treat as data
    }

    // Check for single-line format: key{cols}: val1: val2
    const singleLineMatch = trimmed.match(/^(.+)\{([^}]*)\}:\s+(.+)$/);
    if (singleLineMatch) {
      const key = singleLineMatch[1].trim();
      const columnsStr = singleLineMatch[2].trim();
      const valuePart = singleLineMatch[3].trim();

      // Parse columns
      const columns: TONLColumnDef[] = [];
      if (columnsStr) {
        const colParts = columnsStr.split(',');
        for (const colPart of colParts) {
          const trimmedCol = colPart.trim();
          if (!trimmedCol) continue;

          // Handle quoted column names
          let columnName: string;
          let typeHint: string | undefined;

          if (trimmedCol.startsWith('"')) {
            // Find the end of the quoted name
            const endQuoteIndex = trimmedCol.indexOf('"', 1);
            if (endQuoteIndex > 0) {
              columnName = trimmedCol.slice(1, endQuoteIndex).replace(/""/g, '"');
              const remainder = trimmedCol.slice(endQuoteIndex + 1);
              const colonIndex = remainder.indexOf(':');
              if (colonIndex >= 0) {
                typeHint = remainder.slice(colonIndex + 1).trim();
              }
            } else {
              columnName = trimmedCol;
            }
          } else {
            // Unquoted column name - find first colon for type hint
            const colonIndex = trimmedCol.indexOf(':');
            if (colonIndex > 0) {
              columnName = trimmedCol.slice(0, colonIndex).trim();
              typeHint = trimmedCol.slice(colonIndex + 1).trim();
            } else {
              columnName = trimmedCol;
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

      const header: TONLObjectHeader = { key, isArray: false, columns };
      const value = parseSingleLineObject(header, valuePart, context);
      result[header.key] = value;
      i++;
      continue;
    }

    // Check for multi-line header
    const header = parseObjectHeader(trimmed);
    if (header) {
      const value = parseBlock(header, lines, i, context);
      result[header.key] = value;
      i = findNextHeader(lines, i, context);
    } else {
      // Check for primitive array format: key[N]: val1, val2, val3
      // SECURITY FIX: Pre-validate input length to prevent ReDoS attacks
      // Use more conservative regex to prevent catastrophic backtracking
      let arrayMatch: RegExpMatchArray | null = null;
      if (trimmed.length < 1000) { // Pre-validation limit
        try {
          arrayMatch = trimmed.match(/^(.{1,200})\[([^\]]{1,20})\]:\s*(.{0,1000})$/);
        } catch (error) {
          // Silently continue if regex fails due to complexity
        }
      }
      if (arrayMatch) {
        const key = arrayMatch[1].trim();
        const arrayLengthStr = arrayMatch[2].trim();

        // BUG-NEW-008 FIX: Check length before regex to prevent ReDoS
        // Max safe integer has 16 digits, reject longer strings immediately
        if (arrayLengthStr.length > 16) {
          throw new TONLParseError(
            `Invalid array length: "${arrayLengthStr.substring(0, 20)}...". Array length too long (max 16 digits).`,
            context.currentLine,
            undefined,
            line
          );
        }

        // BUGFIX BUG-F001: Validate array length string
        if (!/^\d+$/.test(arrayLengthStr)) {
          throw new TONLParseError(
            `Invalid array length: "${arrayLengthStr}". Array length must be a positive integer.`,
            context.currentLine,
            undefined,
            line
          );
        }

        const arrayLength = parseInt(arrayLengthStr, 10);
        if (!Number.isSafeInteger(arrayLength) || arrayLength < 0) {
          throw new TONLParseError(
            `Invalid array length: ${arrayLengthStr}. Must be a safe integer >= 0.`,
            context.currentLine,
            undefined,
            line
          );
        }
        const valuePart = arrayMatch[3].trim();

        // Parse as primitive array
        const fields = parseTONLLine(valuePart, context.delimiter);
        const resultArray: any[] = [];
        for (const field of fields) {
          resultArray.push(parsePrimitiveValue(field, context));
        }
        result[key] = resultArray;
        i++;
        continue;
      }

      // Simple key-value pair
      const kvMatch = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        let rawValue = kvMatch[2].trim();

        // Check if this is the start of a multi-line triple-quoted string
        if (rawValue.startsWith('"""')) {
          // Check if it ends on the same line
          const afterTripleQuote = rawValue.slice(3);
          const closingIndex = afterTripleQuote.indexOf('"""');

          if (closingIndex === -1) {
            // Multi-line triple-quoted string - continue reading lines
            let fullValue = rawValue;
            i++;
            while (i < lines.length) {
              const nextLine = lines[i];
              fullValue += '\n' + nextLine;

              // Check if this line contains the closing """
              if (nextLine.includes('"""')) {
                break;
              }
              i++;
            }
            rawValue = fullValue.trim();
          }
        }

        result[key] = parsePrimitiveValue(rawValue, context);
      }
      i++;
    }
  }

  return result;
}
