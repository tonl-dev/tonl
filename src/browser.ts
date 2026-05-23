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
import { chooseSmartDelimiter } from "./utils/delimiter.js";

export { _decodeTONL as decodeTONL, parseTONLLine, parseHeaderLine, parseObjectHeader, detectDelimiter, inferPrimitiveType, coerceValue, isUniformObjectArray };

/**
 * Transform object keys to safe alternatives for TONL compatibility
 */
function transformObjectKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(transformObjectKeys);
  }

  if (obj !== null && typeof obj === 'object') {
    const transformed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      let safeKey = key;

      // Transform problematic keys
      if (key === '#') {
        safeKey = 'hash_key';
      } else if (key === '') {
        safeKey = 'empty_key';
      } else if (key.includes('@')) {
        safeKey = key.replace(/@/g, '_at_');
      } else if (key.includes(':')) {
        safeKey = key.replace(/:/g, '_colon_');
      } else if (key.includes('.')) {
        safeKey = key.replace(/\./g, '_dot_');
      } else if (key.includes(' ')) {
        safeKey = key.replace(/ /g, '_space_');
      } else if (key.includes('$')) {
        safeKey = key.replace(/\$/g, '_dollar_');
      }

      transformed[safeKey] = transformObjectKeys(value);
    }
    return transformed;
  }

  return obj;
}

/**
 * Preprocess JSON string to handle problematic characters in keys
 */
export function preprocessJSON(jsonString: string): any {
  try {
    const data = JSON.parse(jsonString);
    return transformObjectKeys(data);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Analyze a JSON value and choose the most compact text layout automatically. */
export function encodeSmart(input: any, opts?: {
  delimiter?: "," | "|" | "\t" | ";";
  includeTypes?: boolean;
  version?: string;
  indent?: number;
  singleLinePrimitiveLists?: boolean;
}): string {
  const smartOpts = {
    delimiter: opts?.delimiter ?? chooseSmartDelimiter(input),
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
