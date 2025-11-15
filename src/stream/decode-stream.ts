/**
 * Streaming decoder - Transform stream for decoding TONL to JSON
 */

import { Transform } from 'stream';
import type { StreamDecodeOptions } from './types.js';
import { decodeTONL } from '../decode.js';

/**
 * Maximum buffer size to prevent memory exhaustion (10MB)
 * If a single TONL block exceeds this size, an error will be thrown
 */
const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Create a transform stream that decodes TONL chunks to JSON
 */
export function createDecodeStream(options?: StreamDecodeOptions): Transform {
  const opts = {
    highWaterMark: options?.highWaterMark || 16 * 1024, // 16KB default
    ...options
  };

  let buffer = '';

  const stream = new Transform({
    objectMode: true, // Output as objects
    highWaterMark: opts.highWaterMark,

    transform(chunk: Buffer, encoding: string, callback: Function) {
      try {
        const chunkStr = chunk.toString('utf-8');

        // SECURITY FIX (BF003): Check buffer size BEFORE appending chunk
        // Previous code checked AFTER, allowing cumulative overflow bypass
        if (buffer.length + chunkStr.length > MAX_BUFFER_SIZE) {
          return callback(new Error(
            `Buffer overflow prevented: incoming chunk would exceed ${MAX_BUFFER_SIZE} bytes. ` +
            `Current buffer: ${buffer.length} bytes, chunk: ${chunkStr.length} bytes. ` +
            `This may indicate a malformed TONL file or a DoS attack.`
          ));
        }

        buffer += chunkStr;

        // Split by double newline (TONL block separator) or @tonl markers
        const blocks = buffer.split(/\n\n+|(?=@tonl\s)/);
        buffer = blocks.pop() || ''; // Keep incomplete block in buffer

        for (const block of blocks) {
          if (!block.trim()) continue;

          try {
            const jsonData = decodeTONL(block, opts);
            this.push(jsonData);
          } catch (err) {
            // Invalid TONL block, skip or emit error
            if (opts.strict) {
              // BUG-009 FIX: Clear buffer on error to prevent memory leak
              buffer = '';
              return callback(err);
            }
            continue;
          }
        }

        callback();
      } catch (error) {
        // BUG-009 FIX: Clear buffer on transform error to prevent memory leak
        buffer = '';
        callback(error);
      }
    },

    flush(callback: Function) {
      try {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          const jsonData = decodeTONL(buffer, opts);
          this.push(jsonData);
        }

        // BUG-009 FIX: Clear buffer after successful processing
        buffer = '';
        callback();
      } catch (error) {
        // BUG-009 FIX: Clear buffer even on error to prevent memory leak
        buffer = '';

        if (opts.strict) {
          callback(error);
        } else {
          // In non-strict mode, ignore errors but still clear buffer
          callback();
        }
      }
    }
  });

  // BUG-009 FIX: Add cleanup handler for stream destruction
  stream.on('destroy', () => {
    buffer = '';
  });

  // BUG-009 FIX: Add error handler to ensure cleanup
  stream.on('error', () => {
    buffer = '';
  });

  return stream;
}

/**
 * Async iterator for decoding
 */
export async function* decodeIterator(
  iterable: AsyncIterable<string> | Iterable<string>,
  options?: StreamDecodeOptions
): AsyncGenerator<any> {
  for await (const item of iterable) {
    if (item.trim()) {
      yield decodeTONL(item, options);
    }
  }
}
