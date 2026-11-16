/**
 * Value-level parsing - single-line objects and inline values
 */

import type { TONLParseContext, TONLValue, TONLObject, TONLObjectHeader } from '../types.js';
import { parseTONLLineWithQuoteInfo } from '../parser.js';
import { parseFieldValue, parsePrimitiveValue } from './line-parser.js';

/**
 * Parse a single-line object format: key{cols}: val1: val2 val3: val4
 * Handles both object and array formats
 * @param header Parsed object header
 * @param valuePart String containing the values after the colon
 * @param context Parse context
 * @returns Parsed object or array
 */
export function parseSingleLineObject(header: TONLObjectHeader | null, valuePart: string, context: TONLParseContext): TONLValue {
  if (!header) {
    throw new Error("Header cannot be null in parseSingleLineObject");
  }

  if (header.isArray) {
    // Parse single-line array format: arr[3]{col1,col2}: val1, val2, val3, val4, val5, val6
    const { values: fields, quoted } = parseTONLLineWithQuoteInfo(valuePart, context.delimiter);

    // BUG-NEW-005 FIX: Validate columns length before division
    if (header.columns.length === 0) {
      throw new Error('Array header must define at least one column when using tabular format');
    }

    // BUGFIX: Use !== undefined to avoid treating 0 as falsy
    const numItems = header.arrayLength !== undefined
      ? header.arrayLength
      : Math.floor(fields.length / header.columns.length);
    const result: TONLObject[] = [];

    for (let i = 0; i < numItems; i++) {
      const item: TONLObject = {};
      for (let j = 0; j < header.columns.length; j++) {
        const fieldIndex = i * header.columns.length + j;
        if (fieldIndex < fields.length) {
          const column = header.columns[j];
          const rawValue = fields[fieldIndex];
          item[column.name] = parseFieldValue(rawValue, quoted[fieldIndex] ?? false, context);
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
      // Match alphanumeric keys (including numeric keys like "0", "1", "10")
      const nextKeyMatch = valuePart.substring(currentPos).match(/\s+[a-zA-Z0-9_]+\s*:/);
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
