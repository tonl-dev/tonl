/**
 * Security Limits Configuration (Task 013)
 *
 * Centralized security limits for all TONL operations.
 * These limits protect against DoS attacks and resource exhaustion.
 *
 * IMPORTANT: All security-related constants should be defined here.
 * Other modules should import from this file rather than defining their own.
 */

/**
 * Security limits interface for type safety
 */
export interface SecurityLimits {
  /** Maximum characters per line (prevents memory issues) */
  MAX_LINE_LENGTH: number;

  /** Maximum fields per line (prevents parsing issues) */
  MAX_FIELDS_PER_LINE: number;

  /** Maximum nesting depth for objects/arrays */
  MAX_NESTING_DEPTH: number;

  /** Maximum input size in bytes */
  MAX_INPUT_SIZE: number;

  /** Maximum JSON size for inline parsing */
  MAX_JSON_SIZE: number;

  /** Maximum regex pattern length (ReDoS protection) */
  MAX_REGEX_PATTERN_LENGTH: number;

  /** Maximum regex nesting depth (ReDoS protection) */
  MAX_REGEX_NESTING_DEPTH: number;

  /** Maximum query recursion depth */
  MAX_QUERY_DEPTH: number;

  /** Maximum iterations in loops */
  MAX_ITERATIONS: number;

  /** Maximum buffer size for streams */
  MAX_BUFFER_SIZE: number;

  /** Maximum block lines per block (Task 001) */
  MAX_BLOCK_LINES: number;

  /** Maximum indent spaces for string operations */
  MAX_INDENT: number;

  /** Maximum string length for fuzzy matching */
  MAX_STRING_LENGTH: number;

  /** Maximum encoder nesting depth */
  MAX_ENCODE_DEPTH: number;
}

/**
 * Default security limits.
 * These values are chosen to balance functionality and security.
 *
 * Rationale for each limit:
 * - MAX_LINE_LENGTH: 100KB allows for data rows with many columns
 * - MAX_FIELDS_PER_LINE: 10,000 fields supports wide tables
 * - MAX_NESTING_DEPTH: 100 levels handles deep structures safely
 * - MAX_INPUT_SIZE: 10MB total input prevents memory exhaustion
 * - MAX_JSON_SIZE: 10MB for inline JSON parsing
 * - MAX_REGEX_PATTERN_LENGTH: 100 chars prevents complex regex
 * - MAX_REGEX_NESTING_DEPTH: 3 levels prevents nested quantifiers
 * - MAX_QUERY_DEPTH: 500 for recursive query operations
 * - MAX_ITERATIONS: 1,000,000 for loop protection
 * - MAX_BUFFER_SIZE: 10MB for streaming operations
 * - MAX_BLOCK_LINES: 10,000 lines per block
 * - MAX_INDENT: 10,000 spaces max indentation
 * - MAX_STRING_LENGTH: 10,000 chars for fuzzy matching
 * - MAX_ENCODE_DEPTH: 500 for encoder recursion
 */
export const DEFAULT_SECURITY_LIMITS: Readonly<SecurityLimits> = Object.freeze({
  // Input limits
  MAX_LINE_LENGTH: 100_000,           // 100KB per line
  MAX_FIELDS_PER_LINE: 10_000,        // Max fields per line
  MAX_INPUT_SIZE: 10 * 1024 * 1024,   // 10MB total input
  MAX_JSON_SIZE: 10 * 1024 * 1024,    // 10MB JSON limit
  MAX_BUFFER_SIZE: 10 * 1024 * 1024,  // 10MB stream buffer

  // Structure limits
  MAX_NESTING_DEPTH: 100,             // Object/array nesting (parser)
  MAX_BLOCK_LINES: 10_000,            // Lines per block
  MAX_ENCODE_DEPTH: 500,              // Encoder nesting depth

  // Regex limits (ReDoS protection)
  MAX_REGEX_PATTERN_LENGTH: 100,      // Pattern characters
  MAX_REGEX_NESTING_DEPTH: 3,         // Group nesting

  // Query limits
  MAX_QUERY_DEPTH: 500,               // Query recursion
  MAX_ITERATIONS: 1_000_000,          // Loop iterations

  // String operation limits
  MAX_INDENT: 10_000,                 // Maximum indent spaces
  MAX_STRING_LENGTH: 10_000,          // Fuzzy match string length
});


// Re-export individual constants for convenience
export const {
  MAX_LINE_LENGTH,
  MAX_FIELDS_PER_LINE,
  MAX_NESTING_DEPTH,
  MAX_INPUT_SIZE,
  MAX_JSON_SIZE,
  MAX_REGEX_PATTERN_LENGTH,
  MAX_REGEX_NESTING_DEPTH,
  MAX_QUERY_DEPTH,
  MAX_ITERATIONS,
  MAX_BUFFER_SIZE,
  MAX_BLOCK_LINES,
  MAX_INDENT,
  MAX_STRING_LENGTH,
} = DEFAULT_SECURITY_LIMITS;
