/**
 * Streaming encoder - Transform stream for encoding JSON to TONL
 */

import { Transform } from 'stream';
import type { StreamEncodeOptions } from './types.js';
import { encodeTONL } from '../encode.js';
import { safeJsonParse } from '../utils/strings.js';
import type { TONLValue } from '../types.js';

// Task 013: Import from centralized security limits
import { MAX_BUFFER_SIZE } from '../utils/security-limits.js';

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

  const stream = new Transform({
    objectMode: false,
    highWaterMark: opts.highWaterMark,

    transform(chunk: Buffer, encoding: string, callback: Function) {
      try {
        const chunkStr = chunk.toString('utf-8');

        // BUG-FIX-001: Check buffer size BEFORE appending chunk to prevent memory exhaustion
        if (buffer.length + chunkStr.length > MAX_BUFFER_SIZE) {
          // BUG-NEW-003 FIX: Save buffer size before clearing for accurate error message
          const bufferSize = buffer.length;
          // Clear buffer to prevent memory leak on error
          buffer = '';
          return callback(new Error(
            `Buffer overflow prevented: incoming chunk would exceed ${MAX_BUFFER_SIZE} bytes. ` +
            `Current buffer: ${bufferSize} bytes, chunk: ${chunkStr.length} bytes. ` +
            `This may indicate malformed JSON input or a DoS attack.`
          ));
        }

        buffer += chunkStr;

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
            // HIGH-003 FIX: Check push() return value for backpressure
            if (!isFirst) {
              this.push('\n');
            }
            const canContinue = this.push(tonlOutput);
            isFirst = false;
            // If push returns false, the internal buffer is full
            // The stream will automatically handle pausing/resuming via backpressure
          } catch (err) {
            // Invalid JSON line, skip
            continue;
          }
        }

        callback();
      } catch (error) {
        // BUG-FIX-001: Clear buffer on error to prevent memory leak
        buffer = '';
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

        // BUG-FIX-001: Clear buffer after successful processing
        buffer = '';
        callback();
      } catch (error) {
        // BUG-FIX-001: Clear buffer even on error to prevent memory leak
        buffer = '';
        callback(error);
      }
    }
  });

  // BUG-FIX-001: Add cleanup handler for stream destruction
  stream.on('destroy', () => {
    buffer = '';
  });

  // BUG-FIX-001: Add error handler to ensure cleanup
  stream.on('error', () => {
    buffer = '';
  });

  return stream;
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
