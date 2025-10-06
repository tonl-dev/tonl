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
    if (Number.isInteger(value)) {
      return value >= 0 ? "u32" : "i32";
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

  switch (type) {
    case "null":
      return null;
    case "bool":
      return unquoted === "true";
    case "u32":
      const u32 = parseInt(unquoted, 10);
      if (isNaN(u32) || u32 < 0 || u32 > 0xFFFFFFFF) {
        throw new Error(`Invalid u32 value: ${value}`);
      }
      return u32;
    case "i32":
      const i32 = parseInt(unquoted, 10);
      if (isNaN(i32) || i32 < -0x80000000 || i32 > 0x7FFFFFFF) {
        throw new Error(`Invalid i32 value: ${value}`);
      }
      return i32;
    case "f64":
      const f64 = parseFloat(unquoted);
      if (isNaN(f64)) {
        throw new Error(`Invalid f64 value: ${value}`);
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