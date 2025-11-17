/**
 * Streaming query support for large files (T029-T034)
 *
 * Enables memory-efficient processing of large TONL/JSON files
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { parsePath } from '../query/path-parser.js';
import { evaluate } from '../query/evaluator.js';
import { safeJsonParse } from '../utils/strings.js';
import { decodeTONL } from '../decode.js';
import type { TONLValue } from '../types.js';
import { PathValidator } from '../cli/path-validator.js';

/**
 * Maximum buffer size for TONL accumulation (10MB)
 * BUG-FIX-003: Added buffer limit to prevent memory exhaustion
 */
const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB

export interface StreamQueryOptions {
  /**
   * Batch size for processing
   */
  batchSize?: number;

  /**
   * Filter predicate
   */
  filter?: (item: any) => boolean;

  /**
   * Map transform
   */
  map?: (item: any) => any;

  /**
   * Skip first N items
   */
  skip?: number;

  /**
   * Take only N items
   */
  limit?: number;
}

/**
 * Stream query a TONL file line by line
 * SECURITY FIX: Added path validation to prevent path traversal attacks
 *
 * @param filePath - Path to TONL file
 * @param queryExpression - Query path expression
 * @param options - Streaming options
 */
export async function* streamQuery(
  filePath: string,
  queryExpression: string,
  options: StreamQueryOptions = {}
): AsyncGenerator<any> {
  const { filter, map, skip = 0, limit } = options;

  // Validate path to prevent directory traversal
  const validatedPath = PathValidator.validateRead(filePath);

  // Parse query
  const parseResult = parsePath(queryExpression);
  if (!parseResult.success) {
    throw parseResult.error!;
  }

  const fileStream = createReadStream(validatedPath, 'utf-8');
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let buffer = '';
  let lineNumber = 0;
  let yieldedCount = 0;
  let skippedCount = 0;

  try {
    for await (const line of rl) {
      lineNumber++;

      // Skip empty lines
      if (!line.trim()) continue;

      // Try to parse line as JSON or TONL
      try {
        const data = safeJsonParse(line) as TONLValue;

        // Apply query
        const result = evaluate(data, parseResult.ast);

        if (result !== undefined) {
          // Apply skip
          if (skippedCount < skip) {
            skippedCount++;
            continue;
          }

          // Apply filter
          if (filter && !filter(result)) {
            continue;
          }

          // Apply map
          const output = map ? map(result) : result;

          yield output;
          yieldedCount++;

          // Apply limit
          if (limit && yieldedCount >= limit) {
            break;
          }
        }
      } catch (e) {
        // Not JSON, accumulate for TONL parsing
        // BUG-FIX-003: Check buffer size before accumulating
        if (buffer.length + line.length + 1 > MAX_BUFFER_SIZE) {
          throw new Error(
            `Buffer overflow prevented: TONL accumulation would exceed ${MAX_BUFFER_SIZE} bytes. ` +
            `This may indicate a malformed file or excessive data.`
          );
        }
        buffer += line + '\n';
      }
    }

    // If we have buffered content, try to parse as TONL
    if (buffer.trim()) {
      try {
        const data = decodeTONL(buffer);
        const result = evaluate(data, parseResult.ast);

        if (result !== undefined) {
          // BUG-FIX-003: Fixed skip logic - should check skip, not >=
          if (skippedCount < skip) {
            skippedCount++;
          } else {
            const output = map ? map(result) : result;
            if (!filter || filter(output)) {
              yield output;
            }
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  } finally {
    // BUG-FIX-003: Use destroy() instead of close() for proper async cleanup
    fileStream.destroy();
    rl.close();
    // Clear buffer to prevent memory leak
    buffer = '';
  }
}

/**
 * Stream and aggregate results
 *
 * @param filePath - Path to file
 * @param queryExpression - Query expression
 * @param aggregator - Aggregation function
 * @param initialValue - Initial accumulator value
 */
export async function streamAggregate<T>(
  filePath: string,
  queryExpression: string,
  aggregator: (acc: T, item: any) => T,
  initialValue: T
): Promise<T> {
  let result = initialValue;

  for await (const item of streamQuery(filePath, queryExpression)) {
    result = aggregator(result, item);
  }

  return result;
}

/**
 * Stream and count matching items
 */
export async function streamCount(
  filePath: string,
  queryExpression: string,
  options?: StreamQueryOptions
): Promise<number> {
  return streamAggregate(
    filePath,
    queryExpression,
    (count) => count + 1,
    0
  );
}

/**
 * Stream and collect all results (memory limit)
 */
export async function streamCollect(
  filePath: string,
  queryExpression: string,
  options?: StreamQueryOptions
): Promise<any[]> {
  const results: any[] = [];

  for await (const item of streamQuery(filePath, queryExpression, options)) {
    results.push(item);
  }

  return results;
}

/**
 * Stream pipeline for complex transformations
 */
export class StreamPipeline {
  private operations: Array<(item: any) => any> = [];
  private filterOps: Array<(item: any) => boolean> = [];

  /**
   * Add map operation
   */
  map(fn: (item: any) => any): this {
    this.operations.push(fn);
    return this;
  }

  /**
   * Add filter operation
   */
  filter(fn: (item: any) => boolean): this {
    this.filterOps.push(fn);
    return this;
  }

  /**
   * Execute pipeline on stream
   */
  async *execute(filePath: string, queryExpression: string): AsyncGenerator<any> {
    for await (const item of streamQuery(filePath, queryExpression)) {
      // Apply filters
      let passed = true;
      for (const filterFn of this.filterOps) {
        if (!filterFn(item)) {
          passed = false;
          break;
        }
      }

      if (!passed) continue;

      // Apply transformations
      let result = item;
      for (const op of this.operations) {
        result = op(result);
      }

      yield result;
    }
  }
}
