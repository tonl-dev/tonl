/**
 * TONL Browser Entry Point
 *
 * Browser-safe exports (excludes Node.js-specific features like fs, readline)
 */

// Core encode/decode
export type { EncodeOptions, DecodeOptions } from "./types.js";
export type { TONLValue, TONLObject, TONLArray, TONLTypeHint, TONLDelimiter } from "./types.js";

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

  const smartOpts = {
    delimiter: bestDelimiter,
    includeTypes: false,
    version: "1.0",
    indent: 2,
    singleLinePrimitiveLists: true,
    ...opts
  };

  return _encodeTONL(input, smartOpts);
}

export const encodeTONL = _encodeTONL;

// Export browser-safe TONLDocument (without file operations)
export { TONLDocumentBrowser as TONLDocument, type DocumentStats } from './document-browser.js';

// Export Query API
export * from './query/index.js';

// Export Navigation API
export * from './navigation/index.js';
