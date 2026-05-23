/**
 * TONL Browser Build - Core Features (No Node.js dependencies)
 *
 * This build includes only browser-safe features:
 * - encodeTONL / decodeTONL
 * - Query parser and tokenizer
 * - Type definitions
 *
 * Excluded (Node.js-specific):
 * - TONLDocument (uses fs)
 * - FileEditor (uses fs)
 * - REPL (uses readline)
 * - Streaming (uses fs, readline)
 */

import { encodeTONL as _encodeTONL } from "./encode.js";
import { decodeTONL as _decodeTONL } from "./decode.js";
import { chooseSmartDelimiter } from "./utils/delimiter.js";

// Core types
export type { EncodeOptions, DecodeOptions, TONLValue, TONLObject, TONLArray, TONLTypeHint, TONLDelimiter } from "./types.js";

// Core encode/decode functions
export { _encodeTONL as encodeTONL, _decodeTONL as decodeTONL };

// Smart encoding function
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

// Query API types and utilities (pure TypeScript, no Node.js deps)
export * from './query/types.js';
export { parsePath } from './query/path-parser.js';
export { tokenize } from './query/tokenizer.js';
export { validate, analyzeAST, optimizeAST, astToString } from './query/validator.js';

// Parser utilities (pure TypeScript)
export { parseTONLLine, parseHeaderLine, parseObjectHeader, detectDelimiter } from "./parser.js";
export { inferPrimitiveType, coerceValue, isUniformObjectArray } from "./infer.js";
