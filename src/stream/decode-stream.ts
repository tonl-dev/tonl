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

  return new Transform({
    objectMode: true, // Output as objects
    highWaterMark: opts.highWaterMark,

    transform(chunk: Buffer, encoding: string, callback: Function) {
      try {
        buffer += chunk.toString('utf-8');

        // Prevent buffer overflow attacks or malformed files
        if (buffer.length > MAX_BUFFER_SIZE) {
          return callback(new Error(
            `Buffer overflow: TONL block exceeds ${MAX_BUFFER_SIZE} bytes. ` +
            `This may indicate a malformed TONL file without proper block separators.`
          ));
        }

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
              return callback(err);
            }
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
          const jsonData = decodeTONL(buffer, opts);
          this.push(jsonData);
        }
        callback();
      } catch (error) {
        if (opts.strict) {
          callback(error);
        } else {
          callback();
        }
      }
    }
  });
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
