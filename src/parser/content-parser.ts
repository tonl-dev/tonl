/**
 * Content-level parsing - orchestrates parsing of entire TONL document
 */

import type { TONLParseContext, TONLObject, TONLObjectHeader, TONLColumnDef } from '../types.js';
import { parseObjectHeader } from '../parser.js';
import { parsePrimitiveValue } from './line-parser.js';
import { parseSingleLineObject } from './value-parser.js';
import { parseBlock } from './block-parser.js';
import { findNextHeader } from './utils.js';

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

    // Skip empty lines and comments (# or @)
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('@')) {
      i++;
      continue;
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
      // Simple key-value pair
      const kvMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const rawValue = kvMatch[2].trim();
        result[key] = parsePrimitiveValue(rawValue, context);
      }
      i++;
    }
  }

  return result;
}
