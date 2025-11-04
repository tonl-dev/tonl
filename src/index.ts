/**
 * TONL (Token-Optimized Notation Language) - A text-first, LLM-friendly serialization format
 *
 * Main entry point exporting the core TONL API.
 */

export type { EncodeOptions, DecodeOptions } from "./types.js";
export type { TONLValue, TONLObject, TONLArray, TONLTypeHint, TONLDelimiter } from "./types.js";

// Re-export encodeTONL with the original interface for direct use
import { encodeTONL as _encodeTONL } from "./encode.js";
import { decodeTONL as _decodeTONL } from "./decode.js";
import { parseTONLLine, parseHeaderLine, parseObjectHeader, detectDelimiter } from "./parser.js";
import { inferPrimitiveType, coerceValue, isUniformObjectArray } from "./infer.js";

export { _decodeTONL as decodeTONL, parseTONLLine, parseHeaderLine, parseObjectHeader, detectDelimiter, inferPrimitiveType, coerceValue, isUniformObjectArray };

/** Analyze a JSON value and choose the most compact text layout automatically. */
export function encodeSmart(input: any, opts?: {
  delimiter?: "," | "|" | "\t" | ";";
  includeTypes?: boolean;
  version?: string;
  indent?: number;
  singleLinePrimitiveLists?: boolean;
}): string {
  // Smart encoding logic to choose optimal delimiter and formatting
  const jsonStr = JSON.stringify(input);

  // Analyze content to choose best delimiter
  const commaCount = (jsonStr.match(/,/g) || []).length;
  const pipeCount = (jsonStr.match(/\|/g) || []).length;
  const tabCount = (jsonStr.match(/\t/g) || []).length;
  const semicolonCount = (jsonStr.match(/;/g) || []).length;

  let bestDelimiter: "," | "|" | "\t" | ";" = ",";
  let minQuoting = commaCount;

  if (pipeCount < minQuoting) {
    bestDelimiter = "|";
    minQuoting = pipeCount;
  }
  if (tabCount < minQuoting) {
    bestDelimiter = "\t";
    minQuoting = tabCount;
  }
  if (semicolonCount < minQuoting) {
    bestDelimiter = ";";
    minQuoting = semicolonCount;
  }

  // Choose optimal encoding options
  const smartOpts = {
    delimiter: bestDelimiter,
    includeTypes: false, // Omit types for compactness
    version: "1.0",
    indent: 2,
    singleLinePrimitiveLists: true,
    ...opts
  };

  return _encodeTONL(input, smartOpts);
}

export const encodeTONL = _encodeTONL;

// Export TONLDocument class (NEW in v0.6.0!)
export { TONLDocument, type DocumentStats } from './document.js';

// Export Modification API (NEW in v0.6.5!)
export { FileEditor, type FileEditorOptions, type DiffResult, type DiffEntry } from './modification/index.js';