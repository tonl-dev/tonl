/**
 * TONL Decoder - Converts TONL format back to JSON
 */

import type { TONLValue, TONLObject, TONLArray, TONLParseContext, TONLDelimiter } from "./types.js";
import { parseTONLLine, parseHeaderLine, parseObjectHeader, detectDelimiter } from "./parser.js";
import { coerceValue, inferTypeFromString } from "./infer.js";
import { unquote } from "./utils/strings.js";

/**
 * Main decode function
 */
export function decodeTONL(text: string, opts: {
  delimiter?: TONLDelimiter;
  strict?: boolean;
} = {}): any {
  const strict = opts.strict ?? false;
  const lines = text.split('\n').map(line => line.trimEnd()).filter(line => line.length > 0);

  if (lines.length === 0) {
    return {};
  }

  // Parse headers
  const context: TONLParseContext = {
    header: {},
    strict,
    delimiter: opts.delimiter || ","
  };

  let dataStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#')) {
      const header = parseHeaderLine(line);
      if (header) {
        if (header.key === 'version') {
          context.header.version = header.value;
        } else if (header.key === 'delimiter') {
          // Parse delimiter, handle escaped tab
          if (header.value === '\\t') {
            context.header.delimiter = '\t';
          } else if (header.value === ',' || header.value === '|' || header.value === ';') {
            context.header.delimiter = header.value;
          } else {
            throw new Error(`Invalid delimiter: ${header.value}`);
          }
        }
      }
      dataStartIndex = i + 1;
    } else {
      break;
    }
  }

  // Use delimiter from header or auto-detect if not specified
  if (!opts.delimiter) {
    if (context.header.delimiter) {
      context.delimiter = context.header.delimiter;
    } else {
      context.delimiter = detectDelimiter(text);
    }
  }

  // Parse data content
  const content = lines.slice(dataStartIndex).join('\n');
  if (!content) {
    return {};
  }

  const result = parseContent(content, context);

  // If the result has only one key called "root", unwrap it for better round-trip behavior
  if (result && typeof result === 'object' && Object.keys(result).length === 1 && 'root' in result) {
    return result.root;
  }

  return result;
}

/**
 * Parse the main content
 */
function parseContent(content: string, context: TONLParseContext): any {
  const lines = content.split('\n');
  const result: TONLObject = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Check if this is a header line (single-line or multi-line)
    const singleLineMatch = trimmed.match(/^(.+)\{([^}]*)\}:\s+(.+)$/);
    if (singleLineMatch) {
      // Single-line format: key{cols}: val1: val2 val3: val4
      const key = singleLineMatch[1].trim();
      const columnsStr = singleLineMatch[2].trim();
      const valuePart = singleLineMatch[3].trim();

      // Parse columns
      const columns: Array<{ name: string; type?: string }> = [];
      if (columnsStr) {
        const colParts = columnsStr.split(',');
        for (const colPart of colParts) {
          const trimmed = colPart.trim();
          if (!trimmed) continue;
          const colonIndex = trimmed.indexOf(':');
          if (colonIndex > 0) {
            columns.push({
              name: trimmed.slice(0, colonIndex).trim(),
              type: trimmed.slice(colonIndex + 1).trim()
            });
          } else {
            columns.push({ name: trimmed });
          }
        }
      }

      const header = {
        key,
        isArray: false,
        columns
      };

      const value = parseSingleLineObject(header, valuePart, context);
      result[header.key] = value;
      i++;
    } else {
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
  }

  return result;
}

/**
 * Parse a block (object or array)
 */
function parseBlock(header: ReturnType<typeof parseObjectHeader>, lines: string[], startIndex: number, context: TONLParseContext): TONLValue {
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

    // Calculate indentation level
    const currentIndent = line.match(/^(\s*)/)?.[1]?.length || 0;

    
    // Track if we just ended a multiline string on this line
    let justEndedMultiline = false;

    // Check if this line starts or ends a multiline string
    if (trimmed.includes('"""')) {
      const quoteCount = (trimmed.match(/"""/g) || []).length;

      if (inMultilineString) {
        // We're already in a multiline string, check if this line ends it
        if (trimmed.endsWith('"""')) {
          inMultilineString = false;
          justEndedMultiline = true;
        }
      } else {
        // We're not in a multiline string, check if this line starts one
        const afterFirstQuote = trimmed.split('"""')[1];
        if (afterFirstQuote && !afterFirstQuote.endsWith('"""')) {
          // This line starts a multiline string but doesn't end it
          inMultilineString = true;
        }
        // Otherwise, it's a single-line triple-quoted string
      }
    }

    // We've exited the block if we're at or above the header's indentation level
    // But for arrays, content can be at the same level as the header
    // AND we're not inside a multiline string AND we didn't just end one
    const shouldBreak = !inMultilineString && !justEndedMultiline && (currentIndent < headerIndent || (currentIndent === headerIndent && !header.isArray));
    if (shouldBreak) {
      break;
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
 * Parse an object block
 */
function parseObjectBlock(header: ReturnType<typeof parseObjectHeader>, lines: string[], context: TONLParseContext): TONLObject {

  const result: TONLObject = {};

  let lineIndex = 0;
  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const trimmed = line.trim();
    if (!trimmed) {
      lineIndex++;
      continue;
    }

    // Check for single-line nested object format: key{cols}: val1: val2 val3: val4
    const singleLineMatch = trimmed.match(/^(.+)\{([^}]*)\}:\s+(.+)$/);
    if (singleLineMatch) {
      const key = singleLineMatch[1].trim();
      const columnsStr = singleLineMatch[2].trim();
      const valuePart = singleLineMatch[3].trim();

      // Parse columns
      const columns: Array<{ name: string; type?: string }> = [];
      if (columnsStr) {
        const colParts = columnsStr.split(',');
        for (const colPart of colParts) {
          const trimmed = colPart.trim();
          if (!trimmed) continue;
          const colonIndex = trimmed.indexOf(':');
          if (colonIndex > 0) {
            columns.push({
              name: trimmed.slice(0, colonIndex).trim(),
              type: trimmed.slice(colonIndex + 1).trim()
            });
          } else {
            columns.push({ name: trimmed });
          }
        }
      }

      const header = {
        key,
        isArray: false,
        columns
      };

      const value = parseSingleLineObject(header, valuePart, context);
      result[header.key] = value;
      lineIndex++;
      continue;
    }

    // Check for nested header (multi-line)
    const nestedHeader = parseObjectHeader(trimmed);
    if (nestedHeader) {
      // Multi-line nested header
      const nestedContentLines = extractNestedBlockLines(lines, lineIndex);
      // Include the header line at the beginning of the block lines
      const nestedBlockLines = [line, ...nestedContentLines];
      const nestedValue = parseBlock(nestedHeader, nestedBlockLines, 0, context);
      result[nestedHeader.key] = nestedValue;
      // Skip the lines that were consumed by the nested block
      lineIndex += nestedContentLines.length + 1; // +1 for the header line
      continue;
    }

    // Check for array format: key[N]: values or key[N]: (single line primitive array)
    const arrayMatch = trimmed.match(/^(.+)\[(\d+)\]:\s*(.+)$/);
    if (arrayMatch) {
      const key = arrayMatch[1].trim();
      const arrayLength = parseInt(arrayMatch[2], 10);
      const valuePart = arrayMatch[3].trim();

      // Check if this looks like a tabular object array (has object-like content)
      if (valuePart.includes('{') || valuePart.includes(':')) {
        // Treat as object array with empty columns (parse as single-line objects)
        const header = {
          key,
          isArray: true,
          arrayLength,
          columns: []
        };

        const nestedValue = parseSingleLineObject(header, valuePart, context);
        result[header.key] = nestedValue;
      } else {
        // Treat as primitive array
        const fields = parseTONLLine(valuePart, context.delimiter);
        const resultArray: any[] = [];
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

      // Check if this is a triple-quoted string that spans multiple lines
      if (rawValue.startsWith('"""')) {
        // Check if the triple-quoted string ends on the same line
        if (rawValue.endsWith('"""')) {
          // Single-line triple-quoted string
          result[key] = rawValue.slice(3, -3).replace(/\\\\/g, '\\');
        } else {
          // Multi-line triple-quoted string - collect all lines
          const multilineContent: string[] = [rawValue.slice(3)]; // Remove opening """
          lineIndex++;

          // Keep collecting lines until we find the closing """
          while (lineIndex < lines.length) {
            const currentLine = lines[lineIndex];
            const trimmedCurrent = currentLine.trim();

            if (trimmedCurrent.endsWith('"""')) {
              // Found the closing triple quotes
              const content = trimmedCurrent.slice(0, -3); // Remove closing """
              multilineContent.push(content);
              lineIndex++; // Move to the next line after the ending
              break;
            } else {
              // Middle line of the multiline string
              multilineContent.push(trimmedCurrent);
              lineIndex++;
            }
          }

          // Join all lines with newlines and unescape backslashes
          result[key] = multilineContent.join('\n').replace(/\\\\/g, '\\');
          // Note: lineIndex is already positioned at the next line after the ending triple quotes
        }
      } else {
        result[key] = parsePrimitiveValue(rawValue, context);
        lineIndex++;
      }
    }
  }

  return result;
}

/**
 * Parse an array block
 */
function parseArrayBlock(header: ReturnType<typeof parseObjectHeader> | null, lines: string[], context: TONLParseContext): TONLArray {
  const result: TONLArray = [];

  if (!header || header.columns.length === 0) {
    // Check if this is a mixed format array (contains object headers)
    const hasObjectHeaders = lines.some(line => {
      const trimmed = line.trim();
      return parseObjectHeader(trimmed) !== null;
    });

    if (hasObjectHeaders) {
      // Mixed format array - parse as nested objects with indexed keys
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const trimmed = line.trim();
        if (!trimmed) continue;

        const nestedHeader = parseObjectHeader(trimmed);
        if (nestedHeader) {
          // Parse indexed object like [0]{...}:
          const nestedContentLines = extractNestedBlockLines(lines, lineIndex);
          const nestedBlockLines = [line, ...nestedContentLines];
          const nestedValue = parseBlock(nestedHeader, nestedBlockLines, 0, context);

          // Extract index from key like [0] and store at that position
          const indexMatch = nestedHeader.key.match(/^\[(\d+)\]$/);
          if (indexMatch) {
            const index = parseInt(indexMatch[1], 10);
            result[index] = nestedValue;
          } else {
            // Fallback: push to array
            result.push(nestedValue);
          }

          lineIndex += nestedContentLines.length;
        }
      }
    } else {
      // Array of primitives - all values on one line
      if (lines.length > 0) {
        const values = parseTONLLine(lines[0], context.delimiter);
        for (const value of values) {
          result.push(parsePrimitiveValue(value, context));
        }
      }
    }
  } else {
    // Array of objects - tabular format
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const values = parseTONLLine(trimmed, context.delimiter);
      if (values.length === 0) continue;

      // Handle extra fields
      if (values.length > header.columns.length) {
        if (context.strict) {
          throw new Error(`Too many values for array with ${header.columns.length} columns: got ${values.length} values`);
        } else {
          // Truncate extra fields in non-strict mode
          values.length = header.columns.length;
        }
      }

      const rowObj: TONLObject = {};
      for (let j = 0; j < header.columns.length && j < values.length; j++) {
        const column = header.columns[j];
        const value = values[j];

        // Check if this is a nested structure reference
        if (value.startsWith('[') || value.includes('{')) {
          // This would be a more complex case - for now, treat as string
          rowObj[column.name] = parsePrimitiveValue(value, context);
        } else {
          // Parse based on column type if specified
          let parsedValue: any;
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

  // Validate array length if strict mode
  if (context.strict && header && header.arrayLength !== undefined && result.length !== header.arrayLength) {
    throw new Error(`Array length mismatch: expected ${header.arrayLength}, got ${result.length}`);
  }

  return result;
}


/**
 * Parse a primitive value
 */
function parsePrimitiveValue(value: string, context: TONLParseContext): any {
  const trimmed = value.trim();

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

  // Handle quoted strings
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return unquote(trimmed);
  }

  // Handle triple-quoted strings
  if (trimmed.startsWith('"""') && trimmed.endsWith('"""')) {
    return trimmed.slice(3, -3).replace(/\\\\/g, '\\');
  }

  // Try to parse as number
  if (/^-?\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    return num;
  }

  if (/^-?\d*\.\d+$/.test(trimmed)) {
    const num = parseFloat(trimmed);
    return num;
  }

  // Default to string
  return trimmed;
}

/**
 * Extract lines that belong to a nested block, starting from the header line
 */
function extractNestedBlockLines(lines: string[], startIndex: number): string[] {
  const result: string[] = [];
  const headerLine = lines[startIndex];
  if (!headerLine) return result;

  // Get the indentation of the header line
  const headerIndent = headerLine.match(/^(\s*)/)?.[1]?.length || 0;

  // Start from the line after the header
  let i = startIndex + 1;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      // Skip empty lines but include them to preserve structure
      result.push(line);
      i++;
      continue;
    }

    // Check if this line has less or equal indentation than the header (means we've exited the nested block)
    const currentIndent = line.match(/^(\s*)/)?.[1]?.length || 0;
    if (currentIndent <= headerIndent) {
      break;
    }

    result.push(line);
    i++;
  }

  return result;
}

/**
 * Parse a single-line object format: key{cols}: val1: val2 val3: val4
 */
function parseSingleLineObject(header: ReturnType<typeof parseObjectHeader>, valuePart: string, context: TONLParseContext): TONLValue {
  if (!header) {
    throw new Error("Header cannot be null in parseSingleLineObject");
  }

  if (header.isArray) {
    // Parse single-line array format: arr[3]{col1,col2}: val1, val2, val3, val4, val5, val6
    const fields = parseTONLLine(valuePart, context.delimiter);
    const numItems = header.arrayLength || Math.floor(fields.length / header.columns.length);
    const result: any[] = [];

    for (let i = 0; i < numItems; i++) {
      const item: TONLObject = {};
      for (let j = 0; j < header.columns.length; j++) {
        const fieldIndex = i * header.columns.length + j;
        if (fieldIndex < fields.length) {
          const column = header.columns[j];
          const rawValue = fields[fieldIndex];
          item[column.name] = parsePrimitiveValue(rawValue, context);
        }
      }
      result.push(item);
    }
    return result;
  } else {
    // Parse single-line object format: obj{col1,col2}: val1: val2 val3: val4
    const result: TONLObject = {};

    // Use a more robust parsing approach
    let currentPos = 0;
    const valueLength = valuePart.length;

    while (currentPos < valueLength) {
      // Find the next key: pattern
      const keyMatch = valuePart.substring(currentPos).match(/^([^:]+):\s*/);
      if (!keyMatch) break;

      const key = keyMatch[1].trim();
      currentPos += keyMatch[0].length;

      // Find the value - it goes until we see the next "key:" pattern or end of string
      let valueEnd = valueLength;
      const nextKeyMatch = valuePart.substring(currentPos).match(/\s+[a-zA-Z_][a-zA-Z0-9_]*\s*:/);
      if (nextKeyMatch && nextKeyMatch.index !== undefined) {
        valueEnd = currentPos + nextKeyMatch.index;
      }

      const rawValue = valuePart.substring(currentPos, valueEnd).trim();
      result[key] = parsePrimitiveValue(rawValue, context);
      currentPos = valueEnd;
    }

    return result;
  }
}

/**
 * Find the index of the next header at the same or higher level
 */
function findNextHeader(lines: string[], currentIndex: number, context: TONLParseContext): number {
  const currentLine = lines[currentIndex];
  const currentIndent = currentLine?.match(/^(\s*)/)?.[1]?.length || 0;

  let i = currentIndex + 1;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Check if this line is at the same or less indentation level (same level or higher)
    const lineIndent = line.match(/^(\s*)/)?.[1]?.length || 0;
    if (lineIndent <= currentIndent && (trimmed.endsWith(':') || trimmed.startsWith('#'))) {
      return i;
    }

    i++;
  }
  return i;
}