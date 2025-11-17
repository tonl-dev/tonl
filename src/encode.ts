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
export function encodeTONL(input: TONLValue, opts: {
  delimiter?: TONLDelimiter;
  includeTypes?: boolean;
  version?: string;
  indent?: number;
  singleLinePrimitiveLists?: boolean;
  prettyDelimiters?: boolean;
  compactTables?: boolean;
  schemaFirst?: boolean;
} = {}): string {
  const delimiter = opts.delimiter || ",";
  const includeTypes = opts.includeTypes ?? false;
  const version = opts.version || "1.0";
  // BUGFIX: Validate indent is a valid number, default to 2 if NaN
  const indent = (opts.indent !== undefined && Number.isFinite(opts.indent) && opts.indent >= 0) ? opts.indent : 2;
  const singleLinePrimitiveLists = opts.singleLinePrimitiveLists ?? true;
  const prettyDelimiters = opts.prettyDelimiters ?? false;
  const compactTables = opts.compactTables ?? false;
  const schemaFirst = opts.schemaFirst ?? false;

  const context: TONLEncodeContext = {
    delimiter,
    includeTypes,
    version,
    indent,
    singleLinePrimitiveLists,
    prettyDelimiters,
    compactTables,
    schemaFirst,
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

  // Handle special numeric edge cases that should be converted to null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      // Infinity, -Infinity, NaN should be encoded as null
      return `${key}: null`;
    }
    return `${key}: ${String(value)}`;
  }

  const quoted = tripleQuoteIfNeeded(String(value), context.delimiter);
  return `${key}: ${quoted}`;
}

/**
 * Determine if an object should use compact tables format
 * Objects with mixed primitive values and arrays benefit from compact format
 */
function shouldUseCompactFormat(obj: TONLObject, key: string, context: TONLEncodeContext): boolean {
  const keys = Object.keys(obj);

  // Don't use compact format for very simple objects
  if (keys.length <= 1) {
    return false;
  }

  // Check if object has both primitives and arrays (mixed content)
  const hasPrimitives = keys.some(k => {
    const v = obj[k];
    return v !== null && v !== undefined && !Array.isArray(v) && typeof v !== "object";
  });

  const hasArrays = keys.some(k => Array.isArray(obj[k]));

  return hasPrimitives && hasArrays;
}

/**
 * Encode an object using compact tables format
 * This format displays primitive values inline and arrays as indented tables
 */
function encodeObjectCompact(obj: TONLObject, key: string, context: TONLEncodeContext): string {
  const keys = Object.keys(obj).sort();
  const lines: string[] = [];

  // Create a simple header without column definitions for the container object
  lines.push(`${key}:`);

  const childContext = { ...context, currentIndent: context.currentIndent + 1 };

  // Process each property
  for (const k of keys) {
    const value = obj[k];
    if (value === undefined) continue;

    const indent = makeIndent(childContext.currentIndent, childContext.indent);

    if (Array.isArray(value)) {
      // Handle arrays with compact format
      const arrayContent = encodeArrayCompact(value, k, childContext);
      lines.push(indent + arrayContent);
    } else if (typeof value === "object" && value !== null) {
      // Handle nested objects normally (but they might also use compact format)
      const nestedContent = encodeValue(value, k, childContext);
      lines.push(indent + nestedContent);
    } else {
      // Handle primitives as simple inline values without quotes when possible
      let primitiveValue: string;
      if (value === null) {
        primitiveValue = "null";
      } else if (value === true || value === false) {
        primitiveValue = String(value);
      } else if (typeof value === 'number') {
        primitiveValue = String(value);
      } else {
        // For strings, avoid quotes if they don't contain special characters
        const strVal = String(value);
        if (strVal.includes(context.delimiter) || strVal.includes("\n") || strVal.includes(":") || strVal.includes('"')) {
          primitiveValue = tripleQuoteIfNeeded(strVal, context.delimiter);
        } else {
          primitiveValue = strVal; // No quotes needed
        }
      }
      lines.push(`${indent}${k}: ${primitiveValue}`);
    }
  }

  return lines.join("\n");
}

/**
 * Encode an array using compact tables format
 */
function encodeArrayCompact(arr: TONLArray, key: string, context: TONLEncodeContext): string {
  if (arr.length === 0) {
    return `${key}[0]:`;
  }

  // Check if this is an array of objects that can be displayed as a table
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
      // Use tabular format for the array
      const columns = isSemiUniform ? getAllColumns(arr) : getUniformColumns(arr);
      const columnDefs: string[] = [];

      for (const col of columns) {
        let colDef = col;
        if (col.includes(':') || col.includes(',') || col.includes('{') || col.includes('}') || col.includes('"')) {
          colDef = `"${col.replace(/"/g, '\\"')}"`;
        }
        if (context.includeTypes) {
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
      const arrayChildContext = { ...context, currentIndent: context.currentIndent + 1 };

      for (const item of arr) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const rowValues: string[] = [];
        for (const col of columns) {
          const value = (item as TONLObject)[col];
          if (!(col in item) || value === undefined) {
            rowValues.push(MISSING_FIELD_MARKER);
          } else if (value === null) {
            rowValues.push("null");
          } else if (value === true || value === false) {
            rowValues.push(String(value));
          } else if (typeof value === 'number') {
            rowValues.push(String(value));
          } else {
            // For strings in compact mode, try to avoid quotes
            const strVal = String(value);
            if (strVal.includes(context.delimiter) || strVal.includes("\n") || strVal.includes(":") || strVal.includes('"')) {
              rowValues.push(tripleQuoteIfNeeded(strVal, context.delimiter));
            } else {
              rowValues.push(strVal); // No quotes needed
            }
          }
        }
        const separator = context.prettyDelimiters ? ` ${context.delimiter} ` : context.delimiter;
        lines.push(makeIndent(arrayChildContext.currentIndent, arrayChildContext.indent) + rowValues.join(separator));
      }

      return lines.join("\n");
    }
  }

  // For non-tabular arrays, use the regular array encoding
  return encodeArray(arr, key, context);
}

/**
 * Encode an object
 */
function encodeObject(obj: TONLObject, key: string, context: TONLEncodeContext): string {
  // Check if this object should use compact tables format
  if (context.compactTables && shouldUseCompactFormat(obj, key, context)) {
    return encodeObjectCompact(obj, key, context);
  }
  // BUGFIX BF005: Enhanced circular reference detection
  // Initialize seen set if not present
  if (!context.seen) {
    context.seen = new WeakSet();
  }

  // Check for circular references using multiple methods
  if (context.seen.has(obj)) {
    throw new Error(`Circular reference detected at key: ${key} (object already processed)`);
  }

  // Additional checks for edge cases
  try {
    // Check if object has a reference to itself in its properties
    for (const [prop, value] of Object.entries(obj)) {
      if (value === obj) {
        throw new Error(`Self-reference detected at key: ${key}.${prop}`);
      }
    }
  } catch (error) {
    // Handle cases where Object.entries might fail
    if (!(error instanceof TypeError)) {
      throw error;
    }
  }

  context.seen.add(obj);

  // BUG-013 FIX: Use Reflect.ownKeys() to include all properties including __proto__
  // Object.keys() doesn't include __proto__ as an own property, causing data loss
  const keys = Reflect.ownKeys(obj)
    .filter(k => typeof k === 'string') // Only handle string keys
    .filter(k => obj[k] !== undefined)
    .sort();
  const columns: string[] = [];
  // BUG-013 FIX: Use the keys we already collected to check for nested objects
  const hasNestedObjects = keys.some(k => {
    const v = obj[k];
    return typeof v === "object" && v !== null && !Array.isArray(v);
  });

  // Check if any keys contain special characters that require quoting
  const hasSpecialKeys = keys.some(k =>
    k.includes(':') || k.includes(',') || k.includes('{') || k.includes('}') || k.includes('"') ||
    k.includes('#') || k.includes('@') || k === ''
  );

  // Build column definitions
  for (const k of keys) {
    const value = obj[k];
    // Quote column name if it contains special characters or is whitespace-only
    let col = k;
    const needsQuoting = k.includes(':') || k.includes(',') || k.includes('{') || k.includes('}') || k.includes('"') ||
                        k.includes('#') || k.includes('@') || k.trim() === '' || k.startsWith(' ') || k.endsWith(' ') ||
                        k.includes('\t') || k.includes('\n') || k.includes('\r');
    if (needsQuoting) {
      col = `"${k.replace(/\\/g, '\\\\').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/"/g, '\\"')}"`;
    }
    if (context.includeTypes) {
      const type = inferPrimitiveType(value);
      if (type !== "obj" && type !== "list") {
        col += `:${type}`;
      }
    }
    columns.push(col);
  }

  // For single property objects, don't use column notation to avoid parsing confusion
  let header: string;
  if (keys.length === 1) {
    header = `${key}:`;
  } else {
    header = `${key}{${columns.join(",")}}:`;
  }

  // If object has nested objects, arrays, multiline strings, or special keys, render as multi-line block
  const hasMultilineStrings = Object.values(obj).some(v =>
    typeof v === "string" && (v.includes("\n") || v.includes(context.delimiter) || v.includes(":"))
  );

  // Always use multi-line format for single-property objects to avoid parsing confusion
  const isSinglePropertyObject = keys.length === 1;

  if (hasNestedObjects || Object.values(obj).some(v => Array.isArray(v)) || hasMultilineStrings || hasSpecialKeys || isSinglePropertyObject || keys.length > 1) {
    const lines: string[] = [header];
    const childContext = { ...context, currentIndent: context.currentIndent + 1 };

    for (const k of keys) {
      const value = obj[k];
      // Quote key name if it contains special characters or is whitespace-only
      const needsQuoting = k.includes(':') || k.includes(',') || k.includes('{') || k.includes('}') || k.includes('"') ||
                          k.includes('#') || k.includes('@') || k.trim() === '' || k.startsWith(' ') || k.endsWith(' ') ||
                          k.includes('\t') || k.includes('\n') || k.includes('\r');
      const keyName = needsQuoting ? `"${k.replace(/\\/g, '\\\\').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/"/g, '\\"')}"` : k;

      if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
        const childLine = encodeValue(value, k, childContext);
        lines.push(makeIndent(childContext.currentIndent, childContext.indent) + childLine);
      } else {
        if (value === null) {
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `${keyName}: null`);
        } else if (value === true || value === false) {
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `${keyName}: ${String(value)}`);
        } else if (typeof value === 'number') {
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `${keyName}: ${String(value)}`);
        } else if (value !== undefined) {
          const quoted = tripleQuoteIfNeeded(String(value), context.delimiter);
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `${keyName}: ${quoted}`);
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
      // Quote key name if it contains special characters or is whitespace-only
      const needsQuoting = k.includes(':') || k.includes(',') || k.includes('{') || k.includes('}') || k.includes('"') ||
                          k.includes('#') || k.includes('@') || k.trim() === '' || k.startsWith(' ') || k.endsWith(' ') ||
                          k.includes('\t') || k.includes('\n') || k.includes('\r');
      const keyName = needsQuoting ? `"${k.replace(/\\/g, '\\\\').replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/"/g, '\\"')}"` : k;

      if (value === null) {
        parts.push(`${keyName}: null`);
      } else if (value === true || value === false) {
        parts.push(`${keyName}: ${String(value)}`);
      } else if (typeof value === 'number') {
        parts.push(`${keyName}: ${String(value)}`);
      } else if (value !== undefined) {
        const quoted = tripleQuoteIfNeeded(String(value), context.delimiter);
        parts.push(`${keyName}: ${quoted}`);
      }
      // undefined values are already filtered out from keys
    }
    return parts.join(" ");
  }
}

/**
 * Determine if an array should use schema-first format
 * Arrays of uniform objects with primitive values benefit from schema-first format
 * Now also handles arrays that contain nested primitive arrays
 */
function shouldUseSchemaFirstFormat(arr: TONLArray, key: string, context: TONLEncodeContext): boolean {
  if (arr.length === 0) return false;

  const firstItem = arr[0];
  if (!firstItem || typeof firstItem !== "object" || Array.isArray(firstItem)) {
    return false;
  }

  // Check if this is a uniform array of objects
  const isUniform = isUniformObjectArray(arr);
  if (!isUniform) return false;

  // Check if all values are primitives OR primitive arrays (safe for schema-first format)
  const hasValidValues = arr.every(item => {
    if (!item) return false;

    return Object.values(item).every(v => {
      if (v === null || v === undefined) return true;
      if (typeof v !== "object" && typeof v !== "function") return true; // primitive
      if (Array.isArray(v)) {
        // Check if array contains only primitives
        return v.every(element =>
          element === null ||
          element === undefined ||
          (typeof element !== "object" && typeof element !== "function")
        );
      }
      return false; // non-primitive objects not allowed
    });
  });

  return hasValidValues;
}

/**
 * Encode an array using schema-first format
 * Format: #schema key{field:type,field:type} followed by indented data rows
 * Only for arrays with 3 or fewer elements - larger arrays use regular format
 */
function encodeArraySchemaFirst(arr: TONLArray, key: string, context: TONLEncodeContext): string | null {
  if (arr.length === 0) {
    return `${key}[0]:`;
  }

  // Skip schema-first for arrays with more than 3 elements to avoid token waste
  if (arr.length > 3) {
    return null; // Signal to use regular encoding
  }

  const firstItem = arr[0] as TONLObject;
  const columns = getUniformColumns(arr);

  // Build schema definition using existing working format
  const schemaFields: string[] = [];
  for (const col of columns) {
    let fieldDef = col;

    // Check if this field is an array in the sample data
    const sampleValue = firstItem[col];
    if (Array.isArray(sampleValue)) {
      fieldDef += '[]';
    } else if (context.includeTypes) {
      const type = inferPrimitiveType(sampleValue);
      if (type !== "obj" && type !== "list") {
        fieldDef += `:${type}`;
      }
    }

    schemaFields.push(fieldDef);
  }

  const lines: string[] = [
    `#schema ${key}{${schemaFields.join(",")}}`
  ];

  const childContext = { ...context, currentIndent: context.currentIndent + 1 };

  // Add data rows using existing working format
  for (const item of arr) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;

    const rowValues: string[] = [];
    for (const col of columns) {
      const value = (item as TONLObject)[col];

      if (!(col in item) || value === undefined) {
        rowValues.push(MISSING_FIELD_MARKER);
      } else if (value === null) {
        rowValues.push("null");
      } else if (value === true || value === false) {
        rowValues.push(String(value));
      } else if (typeof value === 'number') {
        rowValues.push(String(value));
      } else if (Array.isArray(value)) {
        // Handle arrays efficiently - use unquoted format when possible
        if (value.length === 0) {
          rowValues.push('[]'); // Empty array
        } else {
          // Check if any array elements contain delimiters that would cause parsing conflicts
          const hasDelimiterConflicts = value.some(item =>
            typeof item === 'string' && item.includes(context.delimiter)
          );

          if (hasDelimiterConflicts) {
            // Use pipe delimiter for array to avoid conflicts (more token efficient than quotes)
            const pipeDelimited = value.map(item => {
              if (typeof item === 'string') {
                return item;
              } else {
                return JSON.stringify(item);
              }
            }).join('|');
            rowValues.push(`[${pipeDelimited}]`);
          } else {
            // Use clean unquoted array format: [elem1,elem2,elem3]
            const arrayElements = value.map(item => {
              if (typeof item === 'string') {
                return item;
              } else {
                return JSON.stringify(item);
              }
            });
            rowValues.push(`[${arrayElements.join(context.delimiter)}]`);
          }
        }
      } else {
        // For strings in schema-first mode, avoid quotes if possible
        const strVal = String(value);
        if (strVal.includes(context.delimiter) || strVal.includes("\n") || strVal.includes(":") || strVal.includes('"')) {
          rowValues.push(tripleQuoteIfNeeded(strVal, context.delimiter));
        } else {
          rowValues.push(strVal); // No quotes needed
        }
      }
    }

    const separator = context.prettyDelimiters ? ` ${context.delimiter} ` : context.delimiter;
    lines.push(makeIndent(childContext.currentIndent, childContext.indent) + rowValues.join(separator));
  }

  return lines.join("\n");
}

/**
 * Encode an array
 */
function encodeArray(arr: TONLArray, key: string, context: TONLEncodeContext): string {
  // Check if schema-first encoding should be used
  if (context.schemaFirst && shouldUseSchemaFirstFormat(arr, key, context)) {
    const schemaFirstResult = encodeArraySchemaFirst(arr, key, context);
    if (schemaFirstResult !== null) {
      return schemaFirstResult;
    }
    // If null returned, fall through to regular encoding (array too large)
  }

  // BUGFIX BF005: Enhanced circular reference detection for arrays
  // Initialize seen set if not present
  if (!context.seen) {
    context.seen = new WeakSet();
  }

  // Check for circular references using multiple methods
  if (context.seen.has(arr)) {
    throw new Error(`Circular reference detected at key: ${key} (array already processed)`);
  }

  // Additional check: array contains reference to itself
  if (arr.includes(arr)) {
    throw new Error(`Self-reference detected at key: ${key} (array contains itself)`);
  }

  context.seen.add(arr);

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
        // Quote column name if it contains special characters (colon, comma, braces, quotes)
        let colDef = col;
        if (col.includes(':') || col.includes(',') || col.includes('{') || col.includes('}') || col.includes('"')) {
          colDef = `"${col.replace(/"/g, '\\"')}"`;
        }
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
        const separator = context.prettyDelimiters ? ` ${context.delimiter} ` : context.delimiter;
        lines.push(makeIndent(childContext.currentIndent, childContext.indent) + rowValues.join(separator));
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
        // Don't quote regular numbers, but convert special numeric values to null
        if (!Number.isFinite(item)) {
          return "null"; // Infinity, -Infinity, NaN should be null
        }
        return String(item);
      } else {
        return tripleQuoteIfNeeded(String(item), context.delimiter);
      }
    });

    const separator = context.prettyDelimiters ? ` ${context.delimiter} ` : context.delimiter;

    // Always use single line for arrays to avoid parsing issues
    // This ensures array values are always on the same line as the header
    return `${key}[${arr.length}]: ${values.join(separator)}`;
  } else {
    // Mixed array - encode as inline JSON-like structure
    const lines: string[] = [`${key}[${arr.length}]:`];
    const childContext = { ...context, currentIndent: context.currentIndent + 1 };

    for (let i = 0; i < arr.length; i++) {
      const value = arr[i];
      if (Array.isArray(value)) {
        // Check if the nested array contains only primitives or has nested objects/arrays
        const hasOnlyPrimitives = value.every(item =>
          item === null || item === undefined ||
          (typeof item !== "object" && typeof item !== "function")
        );

        if (hasOnlyPrimitives) {
          // Special handling for nested arrays with only primitives in mixed arrays
          // Encode as single line with proper array notation
          const nestedValues = value.map(item => {
            if (item === null) {
              return "null";
            } else if (item === undefined) {
              return "null"; // Convert undefined to null to maintain array structure
            } else if (item === true || item === false) {
              return String(item);
            } else if (typeof item === 'number') {
              if (!Number.isFinite(item)) {
                return "null"; // Infinity, -Infinity, NaN should be null
              }
              return String(item);
            } else {
              return tripleQuoteIfNeeded(String(item), context.delimiter);
            }
          });
          const separator = context.prettyDelimiters ? ` ${context.delimiter} ` : context.delimiter;
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `[${i}][${value.length}]: ${nestedValues.join(separator)}`);
        } else {
          // Nested array contains objects or other arrays - use mixed array format
          const nestedBlock = encodeValue(value, `[${i}]`, childContext);
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + nestedBlock);
        }
      } else if (typeof value === "object" && value !== null) {
        const nestedBlock = encodeValue(value, `[${i}]`, childContext);
        lines.push(makeIndent(childContext.currentIndent, childContext.indent) + nestedBlock);
      } else {
        if (value === null) {
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `[${i}]: null`);
        } else if (value !== undefined) {
          let valueStr: string;
          if (typeof value === 'number' || typeof value === 'boolean') {
            // Don't quote numbers and booleans
            valueStr = String(value);
          } else {
            // Quote strings and other types
            valueStr = tripleQuoteIfNeeded(String(value), context.delimiter);
          }
          lines.push(makeIndent(childContext.currentIndent, childContext.indent) + `[${i}]: ${valueStr}`);
        }
        // undefined values in mixed arrays are skipped entirely
      }
    }

    return lines.join("\n");
  }
}