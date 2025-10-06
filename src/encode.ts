/**
 * TONL Encoder - Converts JSON data to TONL format
 */

import type { TONLValue, TONLObject, TONLArray, TONLEncodeContext, TONLDelimiter } from "./types.js";
import { inferPrimitiveType, isUniformObjectArray, getUniformColumns } from "./infer.js";
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
  const indent = opts.indent ?? 2;
  const singleLinePrimitiveLists = opts.singleLinePrimitiveLists ?? true;

  const context: TONLEncodeContext = {
    delimiter,
    includeTypes,
    version,
    indent,
    singleLinePrimitiveLists,
    currentIndent: 0
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
  const quoted = tripleQuoteIfNeeded(String(value), context.delimiter);
  return `${key}: ${quoted}`;
}

/**
 * Encode an object
 */
function encodeObject(obj: TONLObject, key: string, context: TONLEncodeContext): string {
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
  if (arr.length === 0) {
    return `${key}[0]:`;
  }

  // Check if this is an array of objects and if it's uniform
  const isUniform = isUniformObjectArray(arr);
  const firstItem = arr[0];

  if (isUniform && firstItem && typeof firstItem === "object" && !Array.isArray(firstItem)) {
    // Check if all values are primitives (safe for tabular format)
    const hasOnlyPrimitives = arr.every(item =>
      item && Object.values(item).every(v =>
        v === null || v === undefined ||
        (typeof v !== "object" && typeof v !== "function")
      )
    );

    if (hasOnlyPrimitives) {
      // Safe to use tabular format
      const columns = getUniformColumns(arr);
      const columnDefs: string[] = [];

      for (const col of columns) {
        let colDef = col;
        if (context.includeTypes) {
          const sampleValue = firstItem[col];
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
        if (!item) continue;
        const rowValues: string[] = [];
        for (const col of columns) {
          const value = item[col];
          if (value === null) {
            rowValues.push("null");
          } else if (value !== undefined) {
            const quoted = tripleQuoteIfNeeded(String(value), context.delimiter);
            rowValues.push(quoted);
          } else {
            rowValues.push("null");
          }
        }
        lines.push(makeIndent(childContext.currentIndent, childContext.indent) + rowValues.join(` ${context.delimiter} `));
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
      } else {
        return tripleQuoteIfNeeded(String(item), context.delimiter);
      }
    });

    if (context.singleLinePrimitiveLists && values.join(`${context.delimiter} `).length < 80) {
      // Single line for short primitive arrays
      return `${key}[${arr.length}]: ${values.join(`${context.delimiter} `)}`;
    } else {
      // Multi-line for longer arrays
      const lines: string[] = [`${key}[${arr.length}]:`];
      const childContext = { ...context, currentIndent: context.currentIndent + 1 };
      lines.push(makeIndent(childContext.currentIndent, childContext.indent) + values.join(` ${context.delimiter} `));
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

/**
 * Encode a value as a single-line representation for use in tabular arrays (returns just the value part)
 */
function encodeSingleLineTabularValue(value: TONLValue, key: string, context: TONLEncodeContext): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "null"; // For arrays, undefined becomes null to maintain structure
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "";
    }

    // Check if array contains only primitives
    if (value.every(item => typeof item !== "object" || item === null)) {
      const values = value.map(item => {
        if (item === null || item === undefined) {
          return "null";
        } else {
          return tripleQuoteIfNeeded(String(item), context.delimiter);
        }
      });
      return values.join(` ${context.delimiter} `);
    } else {
      // Array of objects - flatten to single line
      const columns = getUniformColumns(value);
      if (columns.length > 0) {
        const columnDefs = columns.join(",");
        const rowValues: string[] = [];
        for (const item of value) {
          if (!item) continue;
          for (const col of columns) {
            const colValue = item[col];
            if (colValue === null || colValue === undefined) {
              rowValues.push("null");
            } else if (typeof colValue === "object" && colValue !== null) {
              // Nested object - recursively encode as single line
              rowValues.push(encodeSingleLineTabularValue(colValue, col, context));
            } else {
              rowValues.push(tripleQuoteIfNeeded(String(colValue), context.delimiter));
            }
          }
        }
        return `{${columnDefs}}: ${rowValues.join(` ${context.delimiter} `)}`;
      } else {
        // Non-uniform array - fall back to simple representation
        return "[complex_array]";
      }
    }
  }

  if (typeof value === "object") {
    const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
    const parts: string[] = [];

    for (const k of keys) {
      const val = value[k];
      if (val === null) {
        parts.push(`${k}: null`);
      } else if (typeof val === "object" && val !== null) {
        // Nested object - recursively encode as single line
        parts.push(`${k}{${Object.keys(val).filter(v => val[v] !== undefined).sort().join(",")}: ${encodeSingleLineTabularValue(val, k, context)}`);
      } else {
        const quoted = tripleQuoteIfNeeded(String(val), context.delimiter);
        parts.push(`${k}: ${quoted}`);
      }
    }

    return `{${keys.join(",")}}: ${parts.join(" ")}`;
  }

  // Primitive value
  return tripleQuoteIfNeeded(String(value), context.delimiter);
}