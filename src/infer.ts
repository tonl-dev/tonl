/**
 * Type inference utilities for TONL
 */

import type { TONLTypeHint, TONLValue, TONLObject, TONLArray } from "./types.js";

/**
 * Infer the TONL type hint for a JavaScript value
 */
export function inferPrimitiveType(value: unknown): TONLTypeHint {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "boolean") {
    return "bool";
  }

  if (typeof value === "number") {
    // Handle special values
    if (!isFinite(value)) {
      return "f64";
    }

    if (Number.isInteger(value)) {
      // Check bounds for integer types
      if (value >= 0 && value <= 0xFFFFFFFF) {
        return "u32";
      } else if (value >= -0x80000000 && value <= 0x7FFFFFFF) {
        return "i32";
      } else {
        // Integer outside i32/u32 range, use f64
        return "f64";
      }
    }
    return "f64";
  }

  if (typeof value === "string") {
    return "str";
  }

  if (Array.isArray(value)) {
    return "list";
  }

  if (typeof value === "object") {
    return "obj";
  }

  // Fallback to string for unknown types
  return "str";
}

/**
 * Coerce a string value to the specified TONL type
 */
export function coerceValue(value: string, type: TONLTypeHint): any {
  const unquoted = value.startsWith('"') ? value.slice(1, -1).replace(/""/g, '"') : value;

  // Handle null values for all types
  if (unquoted === "null") {
    return null;
  }

  switch (type) {
    case "null":
      return null;
    case "bool":
      return unquoted === "true";
    case "u32":
      // SECURITY FIX (BF010): Strict validation - must be decimal integer only
      if (!/^[0-9]+$/.test(unquoted)) {
        throw new TypeError(`Invalid u32: must be decimal integer, got: ${unquoted}`);
      }
      const u32 = parseInt(unquoted, 10);
      if (!Number.isFinite(u32) || u32 < 0 || u32 > 0xFFFFFFFF) {
        throw new RangeError(`Invalid u32: out of range (0-4294967295): ${u32}`);
      }
      // SECURITY FIX (BF010): Verify no overflow occurred
      if (u32.toString() !== unquoted) {
        throw new RangeError(`Invalid u32: overflow detected: ${unquoted}`);
      }
      return u32;
    case "i32":
      // SECURITY FIX (BF010): Strict validation
      if (!/^-?[0-9]+$/.test(unquoted)) {
        throw new TypeError(`Invalid i32: must be decimal integer, got: ${unquoted}`);
      }
      const i32 = parseInt(unquoted, 10);
      if (!Number.isFinite(i32) || i32 < -0x80000000 || i32 > 0x7FFFFFFF) {
        throw new RangeError(`Invalid i32: out of range (-2147483648 to 2147483647): ${i32}`);
      }
      if (i32.toString() !== unquoted.replace(/^-/, '-')) {
        throw new RangeError(`Invalid i32: overflow detected: ${unquoted}`);
      }
      return i32;
    case "f64":
      // SECURITY FIX (BF010): Reject NaN and Infinity
      const f64 = parseFloat(unquoted);
      if (!Number.isFinite(f64)) {
        throw new RangeError(`Invalid f64: NaN or Infinity not allowed: ${value}`);
      }
      return f64;
    case "str":
      return unquoted;
    default:
      return unquoted;
  }
}

/**
 * Check if an array is uniform (all objects have same keys)
 */
export function isUniformObjectArray(arr: any[]): boolean {
  if (arr.length === 0) return true;
  if (!arr.every(item => typeof item === "object" && item !== null && !Array.isArray(item))) {
    return false;
  }

  const firstKeys = Object.keys(arr[0]).sort();
  return arr.every(item => {
    const keys = Object.keys(item).sort();
    return keys.length === firstKeys.length &&
           keys.every((key, index) => key === firstKeys[index]);
  });
}

/**
 * Get stable column order for uniform object array
 */
export function getUniformColumns(arr: any[]): string[] {
  if (arr.length === 0) return [];
  return Object.keys(arr[0]).sort();
}

/**
 * Try to infer type from string value (when no type hint provided)
 */
export function inferTypeFromString(value: string): TONLTypeHint {
  const trimmed = value.trim();

  // Handle quoted values as strings
  if (value.startsWith('"') && value.endsWith('"')) {
    return "str";
  }

  // Handle null values
  if (trimmed === "null" || trimmed === "") {
    return "null";
  }

  // Handle boolean values
  if (trimmed === "true" || trimmed === "false") {
    return "bool";
  }

  // Handle numeric values
  if (/^-?\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    return num >= 0 ? "u32" : "i32";
  }

  if (/^-?\d*\.\d+$/.test(trimmed)) {
    return "f64";
  }

  // Default to string
  return "str";
}