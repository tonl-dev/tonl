/**
 * Core type definitions for TONL format
 */

export type TONLPrimitive = string | number | boolean | null;
export type TONLValue = TONLPrimitive | TONLObject | TONLArray;
export interface TONLObject { [key: string]: TONLValue; }
export type TONLArray = TONLValue[];

export type TONLTypeHint = "u32" | "i32" | "f64" | "bool" | "null" | "str" | "obj" | "list";
export type TONLDelimiter = "," | "|" | "\t" | ";";

export interface EncodeOptions {
  delimiter?: TONLDelimiter;
  includeTypes?: boolean;     // add :type hints to headers
  version?: string;           // default "1.0"
  indent?: number;            // spaces per level, default 2
  singleLinePrimitiveLists?: boolean; // default true
}

export interface DecodeOptions {
  delimiter?: TONLDelimiter; // if absent, auto-detect from header or heuristics
  strict?: boolean;          // enforce header N count, column counts, etc.
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
}

export interface TONLEncodeContext {
  delimiter: TONLDelimiter;
  includeTypes: boolean;
  version: string;
  indent: number;
  singleLinePrimitiveLists: boolean;
  currentIndent: number;
}

/** Parser state for line-by-line processing */
export type ParserMode = "plain" | "inQuote" | "inTripleQuote";

export interface ParserState {
  mode: ParserMode;
  currentField: string;
  fields: string[];
  i: number;
  line: string;
}