/**
 * Type definitions for TONL optimization features
 */

/**
 * Dictionary entry representing a value mapping
 */
export interface DictionaryEntry {
  original: string;
  encoded: string | number;
  frequency: number;
  savings: number; // bytes saved by using this encoding
}

/**
 * Dictionary for value compression
 */
export interface Dictionary {
  name: string; // Column name
  entries: Map<string, DictionaryEntry>;
  type: 'string' | 'number' | 'mixed';
  encoding: 'numeric' | 'alpha' | 'optimal';
  totalSavings: number;
}

/**
 * Options for dictionary encoding
 */
export interface DictionaryOptions {
  enabled: boolean;
  minFrequency: number;      // Min times a value must appear (default: 3)
  minSavings: number;        // Min bytes saved to create dict (default: 100)
  maxDictSize: number;       // Max unique values in dict (default: 1000)
  encodingStrategy: 'auto' | 'numeric' | 'alpha';
}

/**
 * Options for numeric quantization
 */
export interface QuantizationOptions {
  enabled: boolean;
  defaultPrecision: number;  // Default: 2
  autoDetect: boolean;       // Analyze and suggest precision
  preserveIntegers: boolean; // Don't quantize if all values are integers
  columnOverrides: Map<string, number>; // Per-column precision
}

/**
 * Options for delta encoding
 */
export interface DeltaOptions {
  enabled: boolean;
  minSequenceLength: number;  // Min length to apply delta (default: 5)
  maxDeltaSize: number;       // Maximum delta value (default: 1000)
  detectMonotonic: boolean;   // Require monotonic sequences (default: true)
}

/**
 * Options for run-length encoding
 */
export interface RLEOptions {
  enabled: boolean;
  minRunLength: number;       // Min consecutive count to encode (default: 2)
  maxRunLength: number;       // Max run length to prevent overflow (default: 10000)
  preserveSingletons: boolean; // Keep single values as-is (default: true)
}

/**
 * Options for bit packing
 */
export interface BitPackOptions {
  enabled: boolean;
  packBooleans: boolean;       // Pack boolean values (default: true)
  packSmallIntegers: boolean;  // Pack small integers (default: true)
  maxIntValue: number;         // Max integer value to pack (default: 255)
  minPackSize: number;         // Min values to pack (default: 4)
}

/**
 * Options for schema inheritance
 */
export interface SchemaInheritOptions {
  enabled: boolean;
  autoDetect: boolean;         // Automatically detect reusable schemas
  minBlockCount: number;       // Minimum blocks to justify schema (default: 2)
  allowPartial: boolean;       // Allow partial schema inheritance
  versionSchemas: boolean;     // Enable schema versioning
}

/**
 * Options for hierarchical grouping
 */
export interface HierarchicalOptions {
  enabled: boolean;
  maxDepth: number;            // Maximum nesting depth to process (default: 3)
  minGroupSize: number;        // Minimum items in a group (default: 2)
  extractCommon: boolean;      // Extract common parent fields (default: true)
  flattenArrays: boolean;      // Flatten nested arrays when beneficial (default: true)
}

/**
 * Options for adaptive compression
 */
export interface AdaptiveOptions {
  enabled: boolean;
  perBlockOptimization: boolean;
  strategies: OptimizationStrategy[];
}

/**
 * Optimization strategy type
 */
export type OptimizationStrategy =
  | 'dictionary'
  | 'delta'
  | 'rle'
  | 'column-reorder'
  | 'bit-pack'
  | 'quantize'
  | 'schema-inherit'
  | 'hierarchical'
  | 'tokenizer-aware';

/**
 * Column reordering result
 */
export interface ColumnReorderResult {
  reorderedColumns: string[];
  mapping: number[]; // Original indices in new order
  entropies: Map<string, number>;
}

/**
 * Run-length encoding run
 */
export interface Run {
  value: any;
  length: number;
  startIndex: number;
}

/**
 * Optimization analysis result
 */
export interface OptimizationAnalysis {
  recommendedStrategies: OptimizationStrategy[];
  estimatedSavings: number; // Percentage
  appliedOptimizations: string[];
  warnings: string[];
}

/**
 * Encoding hints for tokenizer-aware optimization
 */
export interface EncodingHints {
  preferSpaces: boolean;
  lineBreakStrategy: 'minimal' | 'readable';
  delimiterPreference: string[];
  quotingStrategy: 'minimal' | 'conservative';
}

/**
 * Options for tokenizer-aware encoding
 */
export interface TokenizerAwareOptions {
  enabled: boolean;
  targetTokenizer: 'gpt' | 'claude' | 'gemini' | 'generic';
  preferSpaces: boolean;       // Use spaces over tabs (default: true)
  minimalQuoting: boolean;     // Avoid unnecessary quotes (default: true)
  compactNumbers: boolean;     // Use compact number formats (default: true)
  optimizeCase: boolean;       // Optimize case sensitivity (default: false)
}
