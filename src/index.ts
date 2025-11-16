/**
 * TONL (Token-Optimized Notation Language) - A text-first, LLM-friendly serialization format
 *
 * Main entry point exporting the core TONL API.
 */

export type { EncodeOptions, DecodeOptions } from "./types.js";
export type { TONLValue, TONLObject, TONLArray, TONLTypeHint, TONLDelimiter } from "./types.js";
import type { TONLValue } from "./types.js";

// Re-export encodeTONL with the original interface for direct use
import { encodeTONL as _encodeTONL } from "./encode.js";
import { decodeTONL as _decodeTONL } from "./decode.js";
import { parseTONLLine, parseHeaderLine, parseObjectHeader, detectDelimiter } from "./parser.js";
import { inferPrimitiveType, coerceValue, isUniformObjectArray } from "./infer.js";

export { _encodeTONL as encodeTONL, _decodeTONL as decodeTONL, parseTONLLine, parseHeaderLine, parseObjectHeader, detectDelimiter, inferPrimitiveType, coerceValue, isUniformObjectArray };

/** Analyze a JSON value and choose the most compact text layout automatically. */
export function encodeSmart(input: TONLValue, opts?: {
  delimiter?: "," | "|" | "\t" | ";";
  includeTypes?: boolean;
  version?: string;
  indent?: number;
  singleLinePrimitiveLists?: boolean;
  compactTables?: boolean;
  schemaFirst?: boolean;
}): string {
  // Smart encoding logic to choose optimal delimiter and formatting
  const jsonStr = JSON.stringify(input);

  // Optimized delimiter counting - single pass through string (O(n) instead of O(4n))
  let commaCount = 0, pipeCount = 0, tabCount = 0, semicolonCount = 0;
  for (let i = 0; i < jsonStr.length; i++) {
    switch (jsonStr[i]) {
      case ',': commaCount++; break;
      case '|': pipeCount++; break;
      case '\t': tabCount++; break;
      case ';': semicolonCount++; break;
    }
  }

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

// Export TONLDocument class (NEW in v0.6.0!)
export { TONLDocument, type DocumentStats } from './document.js';

// Export Modification API (NEW in v0.6.5!)
export { FileEditor, type FileEditorOptions, type DiffResult, type DiffEntry } from './modification/index.js';

// Export Streaming API (NEW in v0.7.5!)
export { streamQuery, streamAggregate, streamCount, streamCollect, StreamPipeline, type StreamQueryOptions } from './stream/index.js';

// Export REPL (NEW in v0.8.0!)
export { TONLREPL, type REPLOptions } from './repl/index.js';

// Export Optimization API (NEW in v2.0.0+)
export {
  // Phase 1: Core Optimizations
  DictionaryBuilder,
  DictionaryDecoder,
  ColumnReorderer,
  NumericQuantizer,
  // Phase 2: Advanced Encodings
  DeltaEncoder,
  DeltaDecoder,
  RunLengthEncoder,
  RunLengthDecoder,
  AdaptiveOptimizer,
  // Phase 3: Advanced Features
  BitPacker,
  BitPackDecoder,
  SchemaInheritance,
  HierarchicalGrouping,
  TokenizerAware,
  // Types
  type Dictionary,
  type DictionaryEntry,
  type DictionaryOptions,
  type QuantizationOptions,
  type PrecisionAnalysis,
  type DeltaOptions,
  type DeltaAnalysis,
  type RLEOptions,
  type RLEAnalysis,
  type BitPackOptions,
  type BitPackAnalysis,
  type SchemaInheritOptions,
  type Schema,
  type ColumnSchema,
  type SchemaAnalysis,
  type HierarchicalOptions,
  type HierarchyNode,
  type HierarchyAnalysis,
  type TokenizerAwareOptions,
  type TokenizerAnalysis,
  type AdaptiveOptions,
  type ColumnAnalysis,
  type OptimizationStrategy,
  type ColumnReorderResult,
  type Run,
  type OptimizationAnalysis,
  type EncodingHints
} from './optimization/index.js';