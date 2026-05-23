/**
 * Core type definitions for TONL format
 */

export type TONLPrimitive = string | number | boolean | null | undefined;
export type TONLValue = TONLPrimitive | TONLObject | TONLArray;
export interface TONLObject { [key: string]: TONLValue | undefined; }
export type TONLArray = TONLValue[];

export type TONLTypeHint = "u32" | "i32" | "f64" | "bool" | "null" | "str" | "obj" | "list";
export type TONLDelimiter = "," | "|" | "\t" | ";";

/**
 * Sentinel value to represent missing/undefined fields in tabular format.
 *
 * ## Behavior
 * - Distinguishes between explicit `null` (field exists with null value)
 *   and missing field (field doesn't exist in original data)
 * - Used in tabular encoding: trailing comma with nothing = missing field
 *
 * ## Encoding Rules
 * - Missing field (undefined or not in object): outputs nothing after delimiter
 * - Explicit empty string "": outputs `""`  (quoted empty string)
 * - Explicit null: outputs `null`
 *
 * ## Decoding Rules
 * - Empty value after delimiter: field is omitted from decoded object
 * - Quoted empty string `""`: decoded as empty string ""
 * - `null` literal: decoded as null
 *
 * ## Known Limitation
 * In tabular format rows, the parser currently treats unquoted empty and
 * quoted empty `""` identically due to quote stripping. Both become missing
 * fields. For explicit empty strings in tables, use key-value format instead:
 *
 * ```tonl
 * # Preferred: explicit empty string as key-value
 * items[2]{name,value}:
 *   [0]:
 *     name: ""
 *     value: test
 *   [1]:
 *     name: Alice
 *     value: ""
 * ```
 *
 * ## History
 * BUG-001 FIX: Changed from "-" to "" (empty string) to avoid collision
 * with legitimate user data containing "-"
 *
 * @see https://github.com/user/tonl/issues/001
 */
export const MISSING_FIELD_MARKER = "";

export interface EncodeOptions {
  delimiter?: TONLDelimiter;
  includeTypes?: boolean;     // add :type hints to headers
  version?: string;           // default "1.0"
  indent?: number;            // spaces per level, default 2
  singleLinePrimitiveLists?: boolean; // default true
  prettyDelimiters?: boolean; // add spaces around delimiters (e.g., "1 , 2" instead of "1,2")
  compactTables?: boolean;    // use compact tabular format for nested data without repeated headers
  schemaFirst?: boolean;      // use schema-first format: define schema once, data as indented rows
}

export interface DecodeOptions {
  delimiter?: TONLDelimiter; // if absent, auto-detect from header or heuristics
  strict?: boolean;          // enforce header N count, column counts, etc.
  maxBlockLines?: number;    // override maximum lines per parsed block
}

export interface TONLHeader {
  version?: string;
  delimiter?: TONLDelimiter;
}

export interface TONLColumnDef {
  name: string;
  type?: TONLTypeHint;
}

export interface TONLObjectHeader {
  key: string;
  columns: TONLColumnDef[];
  isArray?: boolean;
  arrayLength?: number;
}

export interface TONLParseContext {
  header: TONLHeader;
  strict: boolean;
  delimiter: TONLDelimiter;
  currentLine?: number;      // Current line being parsed (for error reporting)
  allLines?: string[];       // All lines (for error context)
  currentDepth?: number;     // SECURITY FIX (SEC-002): Track recursion depth
  maxDepth?: number;         // SECURITY FIX (SEC-002): Maximum nesting depth (default: 100)
  maxBlockLines?: number;    // SECURITY FIX (Task 001): Maximum lines per block
}

export interface TONLEncodeContext {
  delimiter: TONLDelimiter;
  includeTypes: boolean;
  version: string;
  indent: number;
  singleLinePrimitiveLists: boolean;
  prettyDelimiters: boolean;
  compactTables: boolean;
  schemaFirst: boolean;
  currentIndent: number;
  seen?: WeakSet<object>;  // Track circular references
  currentDepth?: number;     // BUG-NEW-002 FIX: Track recursion depth
  maxDepth?: number;         // BUG-NEW-002 FIX: Maximum nesting depth (default: 500)
}

/** Parser state for line-by-line processing */
export type ParserMode = "plain" | "inQuote" | "inTripleQuote";

export interface ParserState {
  mode: ParserMode;
  currentField: string;
  fields: string[];
  i: number;
  line: string;
  currentFieldWasQuoted: boolean;
}
