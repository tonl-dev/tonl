/**
 * TONL Encoder - Converts JSON data to TONL format
 */

import type { TONLValue, TONLObject, TONLArray, TONLEncodeContext, TONLDelimiter } from "./types.js";
import { MISSING_FIELD_MARKER } from "./types.js";
import { inferPrimitiveType, isUniformObjectArray, getUniformColumns, isSemiUniformObjectArray, getAllColumns } from "./infer.js";
import { quoteIfNeeded, tripleQuoteIfNeeded, makeIndent } from "./utils/strings.js";

/**
 * Main encode function
 */
export function encodeTONL(input: any, opts: {
  delimiter?: TONLDelimiter;
  includeTypes?: boolean;
  version?: string;
  indent?: number;
  singleLinePrimitiveLists?: boolean;
} = {}): string {
  const delimiter = opts.delimiter || ",";
  const includeTypes = opts.includeTypes ?? false;
  const version = opts.version || "1.0";
  // BUGFIX: Validate indent is a valid number, default to 2 if NaN
  const indent = (opts.indent !== undefined && Number.isFinite(opts.indent) && opts.indent >= 0) ? opts.indent : 2;
  const singleLinePrimitiveLists = opts.singleLinePrimitiveLists ?? true;

  const context: TONLEncodeContext = {
    delimiter,
    includeTypes,
    version,
    indent,
    singleLinePrimitiveLists,
    currentIndent: 0,
    seen: new WeakSet()
  };

  const lines: string[] = [];

  // Add header
  lines.push(`#version ${version}`);
  if (delimiter !== ",") {
    lines.push(`#delimiter ${delimiter === "\t" ? "\\t" : delimiter}`);
  }

  // Encode the input object
  const encoded = encodeValue(input, "root", context);
  if (encoded) {
    lines.push(encoded);
  }

  return lines.join("\n");
}

/**
 * Encode a value with a key
 */
function encodeValue(value: TONLValue, key: string, context: TONLEncodeContext): string {
  if (value === null) {
    return `${key}: null`;
  }
  if (value === undefined) {
    return ""; // Skip undefined values entirely
  }

  if (Array.isArray(value)) {
    return encodeArray(value, key, context);
  }

  if (typeof value === "object") {
    return encodeObject(value as TONLObject, key, context);
  }

  // Primitive value
  // Special handling for boolean, null, and numbers to avoid quoting
  if (value === true || value === false || value === null) {
    return `${key}: ${String(value)}`;
  }

  // All numbers (including Infinity, NaN, scientific notation) should not be quoted
  if (typeof value === 'number') {
    return `${key}: ${String(value)}`;
  }

  const quoted = tripleQuoteIfNeeded(String(value), context.delimiter);
  return `${key}: ${quoted}`;
}

/**
 * Encode an object
 */
function encodeObject(obj: TONLObject, key: string, context: TONLEncodeContext): string {
  // Check for circular references
  if (context.seen?.has(obj)) {
    throw new Error(`Circular reference detected at key: ${key}`);
  }
  context.seen?.add(obj);

  const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort();
  const columns: string[] = [];
  const hasNestedObjects = Object.values(obj).some(v =>
    typeof v === "object" && v !== null && !Array.isArray(v)
  );

  // Build column definitions
  for (const k of keys) {
    const value = obj[k];
    let col = k;
    if (context.includeTypes) {
      const type = inferPrimitiveType(value);
      if (type !== "obj" && type !== "list") {
        col += `:${type}`;
      }
    }
    columns.push(col);
  }

  const header = `${key}{${columns.join(",")}}:`;

  // If object has nested objects, arrays, or multiline strings, render as multi-line block
  const hasMultilineStrings = Object.values(obj).some(v =>
    typeof v === "string" && v.includes("\n")
  );

  if (hasNestedObjects || Object.values(obj).some(v => Array.isArray(v)) || hasMultilineStrings) {
    const lines: string[] = [header];
    const childContext = { ...context, currentIndent: context.currentIndent + 1 };

    for (const k of keys) {
      const value = obj[k];
      if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
        const childLine = encodeValue(value, k, childContext);
        lines.push(makeIndent(childContext.currentIndent, childContext.indent) + childLine);
      } else {
        if (value === null) {
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `${k}: null`);
        } else if (value === true || value === false) {
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `${k}: ${String(value)}`);
        } else if (typeof value === 'number') {
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `${k}: ${String(value)}`);
        } else if (value !== undefined) {
          const quoted = tripleQuoteIfNeeded(String(value), context.delimiter);
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `${k}: ${quoted}`);
        }
        // undefined values are already filtered out from keys
      }
    }

    return lines.join("\n");
  } else {
    // Simple object with only primitives - render as single line
    const parts: string[] = [header];
    for (const k of keys) {
      const value = obj[k];
      if (value === null) {
        parts.push(`${k}: null`);
      } else if (value === true || value === false) {
        parts.push(`${k}: ${String(value)}`);
      } else if (typeof value === 'number') {
        parts.push(`${k}: ${String(value)}`);
      } else if (value !== undefined) {
        const quoted = tripleQuoteIfNeeded(String(value), context.delimiter);
        parts.push(`${k}: ${quoted}`);
      }
      // undefined values are already filtered out from keys
    }
    return parts.join(" ");
  }
}

/**
 * Encode an array
 */
function encodeArray(arr: TONLArray, key: string, context: TONLEncodeContext): string {
  // Check for circular references
  if (context.seen?.has(arr)) {
    throw new Error(`Circular reference detected at key: ${key}`);
  }
  context.seen?.add(arr);

  if (arr.length === 0) {
    return `${key}[0]:`;
  }

  // Check if this is an array of objects and if it's uniform or semi-uniform
  const isStrictlyUniform = isUniformObjectArray(arr);
  const isSemiUniform = !isStrictlyUniform && isSemiUniformObjectArray(arr, 0.6);
  const firstItem = arr[0];

  if ((isStrictlyUniform || isSemiUniform) && firstItem && typeof firstItem === "object" && !Array.isArray(firstItem)) {
    // Check if all values are primitives (safe for tabular format)
    const hasOnlyPrimitives = arr.every(item =>
      item && Object.values(item).every(v =>
        v === null || v === undefined ||
        (typeof v !== "object" && typeof v !== "function")
      )
    );

    if (hasOnlyPrimitives) {
      // Safe to use tabular format
      // For semi-uniform arrays, get ALL columns from all objects
      const columns = isSemiUniform ? getAllColumns(arr) : getUniformColumns(arr);
      const columnDefs: string[] = [];

      // For type inference with semi-uniform arrays, we need to check all items
      for (const col of columns) {
        let colDef = col;
        if (context.includeTypes) {
          // Find the first non-null, non-undefined value for this column
          let sampleValue = null;
          for (const item of arr) {
            const obj = item as TONLObject;
            if (obj && typeof obj === 'object' && !Array.isArray(obj) && col in obj && obj[col] !== null && obj[col] !== undefined) {
              sampleValue = obj[col];
              break;
            }
          }
          const type = inferPrimitiveType(sampleValue);
          if (type !== "obj" && type !== "list") {
            colDef += `:${type}`;
          }
        }
        columnDefs.push(colDef);
      }

      const lines: string[] = [`${key}[${arr.length}]{${columnDefs.join(",")}}:`];
      const childContext = { ...context, currentIndent: context.currentIndent + 1 };

      for (const item of arr) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const rowValues: string[] = [];
        for (const col of columns) {
          const value = (item as TONLObject)[col];
          // Distinguish between missing field (undefined/not in object) and explicit null
          if (!(col in item) || value === undefined) {
            // Missing field - use sentinel marker
            rowValues.push(MISSING_FIELD_MARKER);
          } else if (value === null) {
            // Explicit null value
            rowValues.push("null");
          } else if (value === true || value === false) {
            // Don't quote booleans
            rowValues.push(String(value));
          } else if (typeof value === 'number') {
            // Don't quote any numbers
            rowValues.push(String(value));
          } else {
            const quoted = tripleQuoteIfNeeded(String(value), context.delimiter);
            rowValues.push(quoted);
          }
        }
        lines.push(makeIndent(childContext.currentIndent, childContext.indent) + rowValues.join(context.delimiter));
      }

      return lines.join("\n");
    } else {
      // Contains nested objects/arrays - use mixed array format instead
      const lines: string[] = [`${key}[${arr.length}]:`];
      const childContext = { ...context, currentIndent: context.currentIndent + 1 };

      for (let i = 0; i < arr.length; i++) {
        const value = arr[i];
        if (typeof value === "object" && value !== null) {
          const nestedBlock = encodeValue(value, `[${i}]`, childContext);
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + nestedBlock);
        } else {
          if (value === null) {
            lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `[${i}]: null`);
          } else if (value === true || value === false) {
            lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `[${i}]: ${String(value)}`);
          } else if (typeof value === 'number') {
            lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `[${i}]: ${String(value)}`);
          } else if (value !== undefined) {
            const quoted = tripleQuoteIfNeeded(String(value), context.delimiter);
            lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `[${i}]: ${quoted}`);
          }
        }
      }

      return lines.join("\n");
    }
  } else if (arr.every(item => typeof item !== "object" || item === null)) {
    // Array of primitives
    const values = arr.map(item => {
      if (item === null) {
        return "null";
      } else if (item === undefined) {
        // For primitive arrays, undefined becomes null to maintain array structure
        return "null";
      } else if (item === true || item === false) {
        // Don't quote booleans
        return String(item);
      } else if (typeof item === 'number') {
        // Don't quote any numbers
        return String(item);
      } else {
        return tripleQuoteIfNeeded(String(item), context.delimiter);
      }
    });

    if (context.singleLinePrimitiveLists && values.join(context.delimiter).length < 80) {
      // Single line for short primitive arrays
      return `${key}[${arr.length}]: ${values.join(context.delimiter)}`;
    } else {
      // Multi-line for longer arrays
      const lines: string[] = [`${key}[${arr.length}]:`];
      const childContext = { ...context, currentIndent: context.currentIndent + 1 };
      lines.push(makeIndent(childContext.currentIndent, childContext.indent) + values.join(context.delimiter));
      return lines.join("\n");
    }
  } else {
    // Mixed array - encode as inline JSON-like structure
    const lines: string[] = [`${key}[${arr.length}]:`];
    const childContext = { ...context, currentIndent: context.currentIndent + 1 };

    for (let i = 0; i < arr.length; i++) {
      const value = arr[i];
      if (typeof value === "object" && value !== null) {
        const nestedBlock = encodeValue(value, `[${i}]`, childContext);
        lines.push(makeIndent(childContext.currentIndent, childContext.indent) + nestedBlock);
      } else {
        if (value === null) {
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `[${i}]: null`);
        } else if (value !== undefined) {
          const quoted = tripleQuoteIfNeeded(String(value), context.delimiter);
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `[${i}]: ${quoted}`);
        }
        // undefined values in mixed arrays are skipped entirely
      }
    }

    return lines.join("\n");
  }
}