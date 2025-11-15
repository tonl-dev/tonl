/**
 * Streaming encoder - Transform stream for encoding JSON to TONL
 */

import { Transform } from 'stream';
import type { StreamEncodeOptions } from './types.js';
import { encodeTONL } from '../encode.js';
import { safeJsonParse } from '../utils/strings.js';
import type { TONLValue } from '../types.js';

/**
 * Create a transform stream that encodes JSON chunks to TONL format
 */
export function createEncodeStream(options?: StreamEncodeOptions): Transform {
  const opts = {
    highWaterMark: options?.highWaterMark || 16 * 1024, // 16KB default
    ...options
  };

  let buffer = '';
  let isFirst = true;

  return new Transform({
    objectMode: false,
    highWaterMark: opts.highWaterMark,

    transform(chunk: Buffer, encoding: string, callback: Function) {
      try {
        buffer += chunk.toString('utf-8');

        // Try to parse complete JSON objects from buffer
        // For streaming, we expect newline-delimited JSON (NDJSON)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const jsonData = safeJsonParse(line) as TONLValue;
            const tonlOutput = encodeTONL(jsonData, opts);

            // Add newline separator between blocks
            if (!isFirst) {
              this.push('\n');
            }
            this.push(tonlOutput);
            isFirst = false;
          } catch (err) {
            // Invalid JSON line, skip
            continue;
          }
        }

        callback();
      } catch (error) {
        callback(error);
      }
    },

    flush(callback: Function) {
      try {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          const jsonData = safeJsonParse(buffer) as TONLValue;
          const tonlOutput = encodeTONL(jsonData, opts);
          this.push(tonlOutput);
        }
        callback();
      } catch (error) {
        callback(error);
      }
    }
  });
}

/**
 * Async iterator for encoding
 */
export async function* encodeIterator(
  iterable: AsyncIterable<any> | Iterable<any>,
  options?: StreamEncodeOptions
): AsyncGenerator<string> {
  for await (const item of iterable) {
    yield encodeTONL(item, options);
  }
}
