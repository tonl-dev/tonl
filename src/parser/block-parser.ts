/**
 * Block-level parsing - handles multi-line structures
 */

import type { TONLParseContext, TONLValue, TONLObject, TONLArray, TONLObjectHeader, TONLColumnDef, TONLDelimiter } from '../types.js';
import { MISSING_FIELD_MARKER } from '../types.js';
import { parseObjectHeader, parseTONLLine } from '../parser.js';
import { coerceValue } from '../infer.js';
import { parsePrimitiveValue } from './line-parser.js';
import { unquote } from '../utils/strings.js';
import { parseSingleLineObject } from './value-parser.js';
import { extractNestedBlockLines } from './utils.js';
import { TONLParseError } from '../errors/index.js';

/**
 * Parse TONL line with bracket support for schema-first arrays
 * This parser properly handles quotes inside bracket notation
 */
function parseTONLLineWithBracketSupport(line: string, delimiter: TONLDelimiter = ","): string[] {
  // Handle empty lines
  if (!line || line.trim() === "") {
    return [];
  }

  const fields: string[] = [];
  let currentField = "";
  let bracketDepth = 0;
  let inQuotes = false;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escaped) {
      // Previous character was backslash, add this character literally
      currentField += char;
      escaped = false;
    } else if (char === '\\' && inQuotes) {
      // Start of escape sequence inside quotes
      escaped = true;
      currentField += char;
    } else if (char === '"' && !inQuotes) {
      inQuotes = true;
      currentField += char;
    } else if (char === '"' && inQuotes) {
      inQuotes = false;
      currentField += char;
    } else if (char === '[' && !inQuotes) {
      bracketDepth++;
      currentField += char;
    } else if (char === ']' && !inQuotes) {
      bracketDepth--;
      currentField += char;
    } else if (char === delimiter && bracketDepth === 0 && !inQuotes) {
      // Field separator - only split if we're not inside brackets or quotes
      fields.push(currentField.trim());
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Add the last field
  if (currentField.trim()) {
    fields.push(currentField.trim());
  }

  return fields;
}

/**
 * Parse a block starting from a header
 * Dispatches to parseObjectBlock or parseArrayBlock based on header type
 *
 * SECURITY FIX (SEC-002): Added recursion depth limiting to prevent stack overflow
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

  // SECURITY FIX (SEC-002): Check and enforce recursion depth limit
  const currentDepth = context.currentDepth || 0;
  const maxDepth = context.maxDepth || 500;

  if (currentDepth >= maxDepth) {
    throw new TONLParseError(
      `Maximum nesting depth exceeded (${maxDepth}). Possible deeply nested structure or circular reference.`,
      context.currentLine,
      undefined,
      lines[startIndex]
    );
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

    // Track multiline strings - BUG-012 FIX: Enhanced triple-quote detection
    let justEndedMultiline = false;
    if (trimmed.includes('"""')) {
      // Find all triple-quote positions in the line
      const tripleQuotePositions: number[] = [];
      let searchStart = 0;
      let position = trimmed.indexOf('"""', searchStart);

      while (position !== -1) {
        tripleQuotePositions.push(position);
        searchStart = position + 3; // Skip past this triple-quote
        position = trimmed.indexOf('"""', searchStart);
      }

      if (inMultilineString) {
        // We're inside a multiline string, look for the closing quotes
        if (trimmed.endsWith('"""') && tripleQuotePositions.length === 1) {
          inMultilineString = false;
          justEndedMultiline = true;
        }
        // Edge case: if we have multiple triple-quotes, only the last one counts as closing
        else if (trimmed.endsWith('"""') && tripleQuotePositions.length > 1) {
          // We have an odd number of triple-quotes, the last one closes
          inMultilineString = false;
          justEndedMultiline = true;
        }
      } else {
        // We're not in a multiline string, check if this line starts one
        if (tripleQuotePositions.length >= 2) {
          // We have both opening and closing quotes on the same line (edge case)
          // This is a single-line multiline string, so don't change inMultilineString
          justEndedMultiline = true;
        } else if (tripleQuotePositions.length === 1) {
          // We have exactly one triple-quote
          const afterFirstQuote = trimmed.substring(tripleQuotePositions[0] + 3);
          // If there's content after the triple-quote and it doesn't end with quotes,
          // this is an opening triple-quote
          if (afterFirstQuote.length > 0 || !trimmed.endsWith('"""')) {
            inMultilineString = true;
          } else {
            // This is a closing triple-quote or empty multiline string
            justEndedMultiline = true;
          }
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
  // First pass: check if we have any keys that require special handling
  const needsSpecialHandling: string[] = [];

  // Collect keys from all lines to determine if special handling is needed
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      // Check for schema-first directive
      if (trimmed.startsWith('#schema ')) {
        const schemaMatch = trimmed.match(/^#schema\s+(\w+)\{([^}]*)\}$/);
        if (schemaMatch) {
          needsSpecialHandling.push('schema_first_' + schemaMatch[1]);
        }
      }
      continue;
    }

    // BUG-014 FIX: Only skip real @ directives, not @ symbol keys
    if (trimmed.startsWith('@')) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const keyword = trimmed.substring(1, colonIndex).trim();
        const knownDirectives = ['version', 'delimiter', 'import', 'schema', 'type', 'description'];
        if (knownDirectives.includes(keyword)) {
          continue; // Skip real directives
        }
      }
      // Not a known directive, treat as data
    }

    // Extract key from the line (simplified check)
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      let key = trimmed.substring(0, colonIndex).trim();
      // Remove quotes if present
      if (key.startsWith('"') && key.endsWith('"')) {
        key = key.slice(1, -1);
      }

      // Check for dangerous prototype-related keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        needsSpecialHandling.push(key);
      }
    }
  }

  // BUG-013 FIX: Use null prototype only when we have dangerous keys
  // This prevents __proto__ from being treated as a special setter while
  // maintaining normal object behavior for all other cases
  const result: TONLObject = needsSpecialHandling.length > 0
    ? Object.create(null)
    : {};

  let lineIndex = 0;
  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const trimmed = line.trim();

    // Check for schema-first directive: #schema key{fields}
    if (trimmed.startsWith('#schema ')) {
      const schemaMatch = trimmed.match(/^#schema\s+(\w+)\{([^}]*)\}$/);
      if (schemaMatch) {
        const key = schemaMatch[1];
        const fieldsStr = schemaMatch[2];

        // Parse fields
        const columns: TONLColumnDef[] = [];
        if (fieldsStr) {
          const fieldParts = fieldsStr.split(',');
          for (const fieldPart of fieldParts) {
            const trimmedField = fieldPart.trim();
            if (!trimmedField) continue;

            let fieldName: string;
            let typeHint: string | undefined;

            const colonIndex = trimmedField.indexOf(':');
            if (colonIndex > 0) {
              fieldName = trimmedField.slice(0, colonIndex).trim();
              typeHint = trimmedField.slice(colonIndex + 1).trim();
            } else {
              fieldName = trimmedField;
            }

            // Handle [] notation for arrays (e.g., "projects[]" -> "projects")
            if (fieldName.endsWith('[]')) {
              fieldName = fieldName.slice(0, -2);
              if (!typeHint) {
                typeHint = 'array'; // Set type hint for arrays
              }
            }

            if (typeHint) {
              columns.push({
                name: fieldName,
                type: typeHint as any
              });
            } else {
              columns.push({ name: fieldName });
            }
          }
        }

        // Parse following indented lines as data
        const arrayData: any[] = [];
        lineIndex++;

        // Process indented data lines
        while (lineIndex < lines.length) {
          const dataLine = lines[lineIndex];
          const dataTrimmed = dataLine.trim();

          // Stop when we hit a non-indented line
          if (!dataLine.startsWith(' ') && !dataLine.startsWith('\t') && dataTrimmed !== '') {
            break;
          }

          if (dataTrimmed) {
            const values = parseTONLLineWithBracketSupport(dataTrimmed, context.delimiter);
            const rowObject: any = {};

            for (let j = 0; j < columns.length; j++) {
              const column = columns[j];
              const value = values[j];

              if (value === undefined || value === '') {
                continue; // Skip missing fields
              }

              // Handle potential array values (check for different array formats)
              if (value && value.startsWith('"""') && value.endsWith('"""')) {
                // Triple-quoted JSON array (complex arrays)
                try {
                  const jsonStr = value.slice(3, -3); // Remove triple quotes
                  rowObject[column.name] = JSON.parse(jsonStr);
                } catch (e) {
                  // If JSON parsing fails, treat as string
                  rowObject[column.name] = value;
                }
              } else if (value && value.startsWith('[') && value.endsWith(']')) {
                // Simple unquoted array format: [elem1,elem2,elem3]
                try {
                  const innerContent = value.slice(1, -1).trim(); // Remove brackets and trim
                  if (innerContent === '') {
                    rowObject[column.name] = []; // Empty array
                  } else if (innerContent.startsWith('{') || innerContent.startsWith('[')) {
                    // If inner content starts with { or [, it's likely a JSON array - parse it directly
                    try {
                      rowObject[column.name] = JSON.parse(value);
                    } catch (e) {
                      // If JSON parsing fails, fall back to delimiter splitting
                      throw e;
                    }
                  } else {
                    // Split by delimiter or pipe (for arrays with delimiter conflicts)
                    let arrayDelimiter = context.delimiter;
                    // If content contains pipe delimiter, use that as array delimiter
                    if (innerContent.includes('|')) {
                      arrayDelimiter = '|';
                    }
                    const elements = innerContent.split(arrayDelimiter);
                    const parsedElements = elements.map(element => {
                      element = element.trim();
                      // Try parsing as JSON first (for numbers, booleans, objects)
                      try {
                        return JSON.parse(element);
                      } catch {
                        // If not valid JSON, treat as string
                        return element;
                      }
                    });
                    rowObject[column.name] = parsedElements;
                  }
                } catch (e) {
                  // If parsing fails, treat as string
                  rowObject[column.name] = value;
                }
              } else if (value && (value.startsWith('[') || value.includes('['))) {
                // Regular JSON array or fallback for other cases
                try {
                  rowObject[column.name] = JSON.parse(value);
                } catch (e) {
                  // If JSON parsing fails, fall back to sub-delimiter handling
                  const subDelimiter = context.delimiter === ',' ? ';' : context.delimiter;
                  if (value && value.includes(subDelimiter)) {
                    // This is likely an array value that needs special parsing
                    let parsedValue = value.trim();
                    // Remove quotes if present
                    if ((parsedValue.startsWith('"') && parsedValue.endsWith('"')) || (parsedValue.startsWith("'") && parsedValue.endsWith("'"))) {
                      parsedValue = parsedValue.slice(1, -1);
                    }
                    // Split into array
                    const arrayValues = parsedValue.split(subDelimiter).map(item => {
                      item = item.trim();
                      return parsePrimitiveValue(item, context);
                    });
                    rowObject[column.name] = arrayValues;
                  } else {
                    // Apply type hints if present
                    if (column.type) {
                      rowObject[column.name] = coerceValue(value, column.type);
                    } else {
                      rowObject[column.name] = parsePrimitiveValue(value, context);
                    }
                  }
                }
              } else {
                // Apply type hints if present
                if (column.type) {
                  rowObject[column.name] = coerceValue(value, column.type);
                } else {
                  rowObject[column.name] = parsePrimitiveValue(value, context);
                }
              }
            }

            arrayData.push(rowObject);
          }

          lineIndex++;
        }

        result[key] = arrayData;
        continue;
      }
    }

    // Skip empty lines and other comments
    if (!trimmed || trimmed.startsWith('#')) {
      lineIndex++;
      continue;
    }

    // BUG-014 FIX: Only skip real @ directives, not @ symbol keys
    if (trimmed.startsWith('@')) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const keyword = trimmed.substring(1, colonIndex).trim();
        const knownDirectives = ['version', 'delimiter', 'import', 'schema', 'type', 'description'];
        if (knownDirectives.includes(keyword)) {
          lineIndex++;
          continue; // Skip real directives
        }
      }
      // Not a known directive, treat as data
    }

    // Single-line nested object format - only match if {columns}: is part of key definition, not in quoted value
    const singleLineMatch = trimmed.match(/^(?:([^"\s]+)\{([^}]*)\}|("[^"]+")\{([^}]*)\}):\s+(.+)$/);
    if (singleLineMatch) {
      const key = singleLineMatch[1] || singleLineMatch[3]; // Unquoted or quoted key
      const columnsStr = singleLineMatch[2] || singleLineMatch[4]; // Columns from either match
      const valuePart = singleLineMatch[5].trim();

      // Only treat as single-line object if:
      // 1. There are multiple column definitions (contains comma), OR
      // 2. The value part looks like tabular data (contains delimiters that aren't in quotes)
      const hasMultipleColumns = columnsStr.includes(',');
      const valueHasDelimiter = valuePart.includes(context.delimiter) &&
                                (valuePart.includes('"') || valuePart.split(context.delimiter).length > 1);

      if (hasMultipleColumns || valueHasDelimiter) {
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
    }

    // Multi-line nested header
    const nestedHeader = parseObjectHeader(trimmed);
    if (nestedHeader) {
      const nestedContentLines = extractNestedBlockLines(lines, lineIndex);
      const nestedBlockLines = [line, ...nestedContentLines];
      // SECURITY FIX (SEC-002): Increment depth for recursive call
      const currentDepth = context.currentDepth || 0;
      const childContext = { ...context, currentDepth: currentDepth + 1 };
      const nestedValue = parseBlock(nestedHeader, nestedBlockLines, 0, childContext);
      result[nestedHeader.key] = nestedValue;
      lineIndex += nestedContentLines.length + 1;
      continue;
    }

    // Array format: key[N]: values
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

      // Only treat as object if it contains braces (column definitions)
      // Colons in string values should not trigger object parsing
      if (valuePart.includes('{')) {
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
    // Need to handle quoted keys that may contain colons
    let key: string | null = null;
    let rawValue: string | null = null;

    if (trimmed.startsWith('"')) {
      // Quoted key - find the closing quote
      let i = 1;
      let keyStr = '';
      while (i < trimmed.length) {
        if (trimmed[i] === '\\' && i + 1 < trimmed.length && (trimmed[i + 1] === '"' || trimmed[i + 1] === '\\')) {
          keyStr += trimmed[i + 1];
          i += 2;
        } else if (trimmed[i] === '"') {
          // Found closing quote
          key = unquote('"' + keyStr + '"'); // Use unquote to handle all escape sequences
          // Skip past the colon and whitespace
          i++;
          while (i < trimmed.length && (trimmed[i] === ':' || trimmed[i] === ' ')) {
            i++;
          }
          rawValue = trimmed.slice(i).trim();
          break;
        } else {
          keyStr += trimmed[i];
          i++;
        }
      }
    } else {
      // Unquoted key - find first colon (allow empty key)
      const kvMatch = trimmed.match(/^(.*?):\s*(.+)$/);
      if (kvMatch) {
        const rawKey = kvMatch[1];
        // Only trim the key if it's not just whitespace (preserve space-only keys)
        if (rawKey.trim() === '') {
          key = rawKey; // Keep the original whitespace
        } else {
          key = rawKey.trim();
        }
        rawValue = kvMatch[2].trim();
      }
    }

    if (key !== null && rawValue !== null) {

      // Multiline triple-quoted string
      if (rawValue.startsWith('"""')) {
        if (rawValue.endsWith('"""')) {
          result[key] = rawValue.slice(3, -3)
            .replace(/\\"""/g, '"""')
            .replace(/\\\\/g, '\\')
            .replace(/\\r/g, '\r')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t');
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
            .replace(/\\\\/g, '\\')
            .replace(/\\r/g, '\r')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t');
          continue;
        }
      } else {
        result[key] = parsePrimitiveValue(rawValue, context);
      }
      lineIndex++;
    } else {
      // BUG-010 FIX: Enhanced error handling for malformed lines
      // In strict mode, report unparseable lines; in non-strict mode, skip silently
      if (context.strict || trimmed.length > 0) {
        const contextLines = Math.max(0, lineIndex - 1);
        const surroundingLines = lines.slice(
          Math.max(0, lineIndex - 2),
          Math.min(lines.length, lineIndex + 3)
        ).map((l, i) => `${lineIndex - 2 + i}: ${l}`).join('\n');

        if (context.strict) {
          throw new TONLParseError(
            `Unparseable line in object block: "${trimmed.substring(0, 50)}${trimmed.length > 50 ? '...' : ''}"\n` +
            `Context (line ${(context.currentLine || 0) + lineIndex + 1}):\n${surroundingLines}`,
            (context.currentLine || 0) + lineIndex,
            undefined,
            line
          );
        }
        // BUG-NEW-007 FIX: Remove console.warn from library code
        // In non-strict mode, skip unparseable lines silently
        // Library code should not produce console output
      }
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
    // Check for mixed format (object headers OR indexed headers)
    const hasObjectHeaders = lines.some(line => {
      const trimmed = line.trim();
      return parseObjectHeader(trimmed) !== null;
    });

    const hasIndexedHeaders = lines.some(line => {
      const trimmed = line.trim();
      return /^\[\d+\]/.test(trimmed);
    });

    if (hasObjectHeaders || hasIndexedHeaders) {
      // Mixed format array
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue;

        // BUG-014 FIX: Only skip real @ directives, not @ symbol keys
        if (trimmed.startsWith('@')) {
          const colonIndex = trimmed.indexOf(':');
          if (colonIndex > 0) {
            const keyword = trimmed.substring(1, colonIndex).trim();
            const knownDirectives = ['version', 'delimiter', 'import', 'schema', 'type', 'description'];
            if (knownDirectives.includes(keyword)) {
              continue; // Skip real directives
            }
          }
          // Not a known directive, treat as data
        }

        // Check for indexed headers like [0]: value or [0][3]: value first (before object headers)
        if (hasIndexedHeaders) {
          // Match both [index]: value and [index][length]: value patterns
          const indexedMatch = trimmed.match(/^\[(\d+)\](?:\[(\d+)\])?:\s*(.*)$/);
          if (indexedMatch) {
            const index = parseInt(indexedMatch[1], 10);
            const nestedArrayLength = indexedMatch[2] ? parseInt(indexedMatch[2], 10) : undefined;
            const valuePart = indexedMatch[3].trim();

            // If nested array length is specified, always parse as an array
            if (nestedArrayLength !== undefined) {
              if (valuePart) {
                // Parse as an array with values
                const arrayValues = parseTONLLine(valuePart, context.delimiter);
                const parsedArray: TONLValue[] = [];
                for (const arrayValue of arrayValues) {
                  parsedArray.push(parsePrimitiveValue(arrayValue, context));
                }
                result[index] = parsedArray;
              } else {
                // Check if there are nested content lines for this array
                const nestedContentLines = extractNestedBlockLines(lines, lineIndex);
                if (nestedContentLines.length > 0) {
                  // Parse nested content as elements of this array
                  const nestedArray: TONLValue[] = [];

                  for (let nestedLineIndex = 0; nestedLineIndex < nestedContentLines.length; nestedLineIndex++) {
                    const nestedLine = nestedContentLines[nestedLineIndex];
                    const nestedTrimmed = nestedLine.trim();

                    // Skip empty lines and comments
                    if (!nestedTrimmed || nestedTrimmed.startsWith('#')) continue;

                    // Check for indexed headers in nested content
                    const nestedIndexedMatch = nestedTrimmed.match(/^\[(\d+)\](?:\[(\d+)\])?:\s*(.*)$/);
                    if (nestedIndexedMatch) {
                      const nestedIndex = parseInt(nestedIndexedMatch[1], 10);
                      const nestedArrayLength = nestedIndexedMatch[2] ? parseInt(nestedIndexedMatch[2], 10) : undefined;
                      const nestedValuePart = nestedIndexedMatch[3].trim();

                      if (nestedArrayLength !== undefined) {
                        if (nestedValuePart) {
                          // Parse as array with values
                          const arrayValues = parseTONLLine(nestedValuePart, context.delimiter);
                          const parsedArray: TONLValue[] = [];
                          for (const arrayValue of arrayValues) {
                            parsedArray.push(parsePrimitiveValue(arrayValue, context));
                          }
                          nestedArray[nestedIndex] = parsedArray;
                        } else {
                          nestedArray[nestedIndex] = [];
                        }
                      } else if (nestedValuePart) {
                        // Parse as primitive
                        nestedArray[nestedIndex] = parsePrimitiveValue(nestedValuePart, context);
                      } else {
                        nestedArray[nestedIndex] = [];
                      }
                    }
                  }

                  result[index] = nestedArray;
                  lineIndex += nestedContentLines.length;
                } else {
                  // Empty array with specified length
                  result[index] = [];
                }
              }
            } else if (valuePart) {
              // Check if this looks like an array (contains delimiters but not quoted or triple quotes)
              const isQuoted = valuePart.startsWith('"') && valuePart.endsWith('"');
              if (valuePart.includes(context.delimiter) &&
                  !isQuoted &&
                  !valuePart.startsWith('"""') &&
                  !valuePart.includes('"""') &&
                  !valuePart.includes(':')) {  // Not an object and not quoted
                // Parse as an array
                const arrayValues = parseTONLLine(valuePart, context.delimiter);
                const parsedArray: TONLValue[] = [];
                for (const arrayValue of arrayValues) {
                  parsedArray.push(parsePrimitiveValue(arrayValue, context));
                }
                result[index] = parsedArray;
              } else {
                // Parse as a primitive value
                result[index] = parsePrimitiveValue(valuePart, context);
              }
            } else {
              // Check if next lines are indented content for this index
              const nestedContentLines = extractNestedBlockLines(lines, lineIndex);
              if (nestedContentLines.length > 0) {
                // If nested array length was specified, this should be an array
                if (nestedArrayLength !== undefined) {
                  // Check if the first nested line is an indexed header
                  const firstNestedLine = nestedContentLines[0].trim();
                  const firstNestedIndexedMatch = firstNestedLine.match(/^\[(\d+)\](?:\[(\d+)\])?:\s*(.*)$/);

                  if (firstNestedIndexedMatch) {
                    // This is a nested array - create an array and parse nested content
                    const nestedArray: TONLValue[] = [];

                    // Parse the nested content lines using the same logic as the parent array
                    for (let nestedLineIndex = 0; nestedLineIndex < nestedContentLines.length; nestedLineIndex++) {
                      const nestedLine = nestedContentLines[nestedLineIndex];
                      const nestedTrimmed = nestedLine.trim();

                      // Skip empty lines and comments
                      if (!nestedTrimmed || nestedTrimmed.startsWith('#')) continue;

                      // Check for indexed headers in nested content
                      const nestedIndexedMatch = nestedTrimmed.match(/^\[(\d+)\](?:\[(\d+)\])?:\s*(.*)$/);
                      if (nestedIndexedMatch) {
                        const nestedIndex = parseInt(nestedIndexedMatch[1], 10);
                        const nestedArrayLength = nestedIndexedMatch[2] ? parseInt(nestedIndexedMatch[2], 10) : undefined;
                        const nestedValuePart = nestedIndexedMatch[3].trim();

                        if (nestedArrayLength !== undefined) {
                          if (nestedValuePart) {
                            // Parse as an array with values
                            const arrayValues = parseTONLLine(nestedValuePart, context.delimiter);
                            const parsedArray: TONLValue[] = [];
                            for (const arrayValue of arrayValues) {
                              parsedArray.push(parsePrimitiveValue(arrayValue, context));
                            }
                            nestedArray[nestedIndex] = parsedArray;
                          } else {
                            // Check if there are further nested lines for this nested array
                            const furtherNestedLines = [];
                            let nextLineIndex = nestedLineIndex + 1;

                            // Collect indented lines that belong to this nested array
                            while (nextLineIndex < nestedContentLines.length) {
                              const nextLine = nestedContentLines[nextLineIndex];
                              if (nextLine.length > 0 && (nextLine[0] === ' ' || nextLine[0] === '\t')) {
                                // This line is indented (space or tab), so it belongs to the nested array
                                furtherNestedLines.push(nextLine);
                                nextLineIndex++;
                              } else {
                                // Not indented, so it doesn't belong to this nested array
                                break;
                              }
                            }

                            if (furtherNestedLines.length > 0) {
                              // Recursively parse the further nested content
                              const tempHeader: TONLObjectHeader = {
                                key: `[${nestedIndex}]`,
                                isArray: true,
                                columns: []
                              };
                              const furtherNestedArray: TONLValue[] = [];

                              // Parse the further nested lines
                              for (let furtherLineIndex = 0; furtherLineIndex < furtherNestedLines.length; furtherLineIndex++) {
                                const furtherLine = furtherNestedLines[furtherLineIndex];
                                const furtherTrimmed = furtherLine.trim();

                                if (!furtherTrimmed || furtherTrimmed.startsWith('#')) continue;

                                const furtherIndexedMatch = furtherTrimmed.match(/^\[(\d+)\](?:\[(\d+)\])?:\s*(.*)$/);
                                if (furtherIndexedMatch) {
                                  const furtherIndex = parseInt(furtherIndexedMatch[1], 10);
                                  const furtherArrayLength = furtherIndexedMatch[2] ? parseInt(furtherIndexedMatch[2], 10) : undefined;
                                  const furtherValuePart = furtherIndexedMatch[3].trim();

                                  if (furtherArrayLength !== undefined) {
                                    if (furtherValuePart) {
                                      const arrayValues = parseTONLLine(furtherValuePart, context.delimiter);
                                      const parsedArray: TONLValue[] = [];
                                      for (const arrayValue of arrayValues) {
                                        parsedArray.push(parsePrimitiveValue(arrayValue, context));
                                      }
                                      furtherNestedArray[furtherIndex] = parsedArray;
                                    } else {
                                      furtherNestedArray[furtherIndex] = [];
                                    }
                                  } else if (furtherValuePart) {
                                    furtherNestedArray[furtherIndex] = parsePrimitiveValue(furtherValuePart, context);
                                  } else {
                                    furtherNestedArray[furtherIndex] = [];
                                  }
                                }
                              }

                              nestedArray[nestedIndex] = furtherNestedArray;
                              nestedLineIndex = nextLineIndex - 1; // Adjust for the loop increment
                            } else {
                              // Empty array
                              nestedArray[nestedIndex] = [];
                            }
                          }
                        } else if (nestedValuePart) {
                          // Parse as primitive
                          nestedArray[nestedIndex] = parsePrimitiveValue(nestedValuePart, context);
                        } else {
                          nestedArray[nestedIndex] = [];
                        }
                      }
                    }

                    result[index] = nestedArray;
                    lineIndex += nestedContentLines.length;
                  } else {
                    // Parse as an object block
                    const tempHeader: TONLObjectHeader = {
                      key: `[${index}]`,
                      isArray: false,
                      columns: []
                    };
                    const nestedBlockLines = nestedContentLines;
                    const nestedValue = parseObjectBlock(tempHeader, nestedBlockLines, context);
                    result[index] = nestedValue;
                    lineIndex += nestedContentLines.length;
                  }
                } else {
                  // No nested array length specified - check if nested content has indexed headers with array lengths
                  const firstNestedLine = nestedContentLines[0].trim();
                  const firstNestedIndexedMatch = firstNestedLine.match(/^\[(\d+)\](?:\[(\d+)\])?:\s*(.*)$/);

                  if (firstNestedIndexedMatch && firstNestedIndexedMatch[2]) {
                    // Nested content has indexed headers with array lengths - parse as array
                    const nestedArray: TONLValue[] = [];

                    // Parse the nested content lines
                    for (let nestedLineIndex = 0; nestedLineIndex < nestedContentLines.length; nestedLineIndex++) {
                      const nestedLine = nestedContentLines[nestedLineIndex];
                      const nestedTrimmed = nestedLine.trim();

                      // Skip empty lines and comments
                      if (!nestedTrimmed || nestedTrimmed.startsWith('#')) continue;

                      // Check for indexed headers in nested content
                      const nestedIndexedMatch = nestedTrimmed.match(/^\[(\d+)\](?:\[(\d+)\])?:\s*(.*)$/);
                      if (nestedIndexedMatch) {
                        const nestedIndex = parseInt(nestedIndexedMatch[1], 10);
                        const nestedArrayLength = nestedIndexedMatch[2] ? parseInt(nestedIndexedMatch[2], 10) : undefined;
                        const nestedValuePart = nestedIndexedMatch[3].trim();

                        if (nestedArrayLength !== undefined) {
                          if (nestedValuePart) {
                            // Parse as array with values
                            const arrayValues = parseTONLLine(nestedValuePart, context.delimiter);
                            const parsedArray: TONLValue[] = [];
                            for (const arrayValue of arrayValues) {
                              parsedArray.push(parsePrimitiveValue(arrayValue, context));
                            }
                            nestedArray[nestedIndex] = parsedArray;
                          } else {
                            // Empty array
                            nestedArray[nestedIndex] = [];
                          }
                        } else if (nestedValuePart) {
                          // Parse as primitive
                          nestedArray[nestedIndex] = parsePrimitiveValue(nestedValuePart, context);
                        } else {
                          nestedArray[nestedIndex] = [];
                        }
                      }
                    }

                    result[index] = nestedArray;
                    lineIndex += nestedContentLines.length;
                  } else {
                    // Parse as object block
                    const tempHeader: TONLObjectHeader = {
                      key: `[${index}]`,
                      isArray: false,
                      columns: []
                    };
                    const nestedBlockLines = nestedContentLines;
                    const nestedValue = parseObjectBlock(tempHeader, nestedBlockLines, context);
                    result[index] = nestedValue;
                    lineIndex += nestedContentLines.length;
                  }
                }
              } else {
                // Empty value - for arrays, this should be an empty array, not null
                result[index] = [];
              }
            }
          } else {
            // Not an indexed header, check for object header
            const nestedHeader = parseObjectHeader(trimmed);
            if (nestedHeader) {
              const nestedContentLines = extractNestedBlockLines(lines, lineIndex);
              const nestedBlockLines = [line, ...nestedContentLines];
              // SECURITY FIX (SEC-002): Increment depth for recursive call
              const currentDepth = context.currentDepth || 0;
              const childContext = { ...context, currentDepth: currentDepth + 1 };
              const nestedValue = parseBlock(nestedHeader, nestedBlockLines, 0, childContext);

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
          // No indexed headers, check for object headers
          const nestedHeader = parseObjectHeader(trimmed);
          if (nestedHeader) {
            const nestedContentLines = extractNestedBlockLines(lines, lineIndex);
            const nestedBlockLines = [line, ...nestedContentLines];
            // SECURITY FIX (SEC-002): Increment depth for recursive call
            const currentDepth = context.currentDepth || 0;
            const childContext = { ...context, currentDepth: currentDepth + 1 };
            const nestedValue = parseBlock(nestedHeader, nestedBlockLines, 0, childContext);

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
      }
    } else {
      // Primitive array
      if (lines.length > 0) {
        const firstLine = lines[0].trim();
        // Check if the first line looks like an array header with inline values
        const arrayWithValuesMatch = firstLine.match(/^(.+)\[([^\]]+)\]:\s*(.+)$/);

        if (arrayWithValuesMatch) {
          // Parse the inline values from the array header
          const key = arrayWithValuesMatch[1].trim();
          const valuePart = arrayWithValuesMatch[3].trim();
          const values = parseTONLLine(valuePart, context.delimiter);
          for (const value of values) {
            result.push(parsePrimitiveValue(value, context));
          }
        } else {
          // Parse as raw values (original behavior)
          const values = parseTONLLine(lines[0], context.delimiter);
          for (const value of values) {
            result.push(parsePrimitiveValue(value, context));
          }
        }
      }
    }
  } else {
    // Tabular object array
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // BUG-014 FIX: Only skip real @ directives, not @ symbol keys
      if (trimmed.startsWith('@')) {
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const keyword = trimmed.substring(1, colonIndex).trim();
          const knownDirectives = ['version', 'delimiter', 'import', 'schema', 'type', 'description'];
          if (knownDirectives.includes(keyword)) {
            continue; // Skip real directives
          }
        }
        // Not a known directive, treat as data
      }

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
