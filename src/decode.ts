/**
 * TONL Decoder - Converts TONL format back to JSON
 */

import type { TONLValue, TONLObject, TONLArray, TONLParseContext, TONLDelimiter, TONLColumnDef } from "./types.js";
import { parseTONLLine, parseHeaderLine, parseObjectHeader, detectDelimiter } from "./parser.js";
import { coerceValue, inferTypeFromString } from "./infer.js";
import { unquote } from "./utils/strings.js";
import { TONLParseError } from "./errors/index.js";
import { parseContent } from "./parser/content-parser.js";

/**
 * Main decode function
 */
export function decodeTONL(text: string, opts: {
  delimiter?: TONLDelimiter;
  strict?: boolean;
} = {}): any {
  const strict = opts.strict ?? false;
  // Split lines and only remove \r (Windows line endings), don't trim other whitespace
  const lines = text.split('\n').map(line => line.replace(/\r$/, '')).filter(line => line.length > 0);

  if (lines.length === 0) {
    return {};
  }

  // Parse headers
  const context: TONLParseContext = {
    header: {},
    strict,
    delimiter: opts.delimiter || ",",
    allLines: lines,
    currentLine: 0
  };

  let dataStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // BUG-014 FIX: Only skip real @ directives, not @ symbol keys
    // Real directives are @keyword: value format (with colon)
    // @ symbol keys are @key: value but should be treated as data
    if (line.startsWith('@')) {
      const colonIndex = line.indexOf(':');
      const spaceIndex = line.indexOf(' ');
      const tabIndex = line.indexOf('\t');

      // Check if this looks like a real directive (@keyword: value format)
      // If colon comes first and it's a known directive keyword, skip it
      // Otherwise, treat it as data
      if (colonIndex > 0) {
        const keyword = line.substring(1, colonIndex).trim();
        const knownDirectives = ['version', 'delimiter', 'import', 'schema', 'type', 'description'];
        if (knownDirectives.includes(keyword)) {
          dataStartIndex = i + 1;
          continue;
        }
        // Not a known directive, treat as data (break out of header parsing)
        break;
      }
      // If no colon, this might be a malformed directive or data
      // For safety, treat as data
      break;
    }
    if (line.startsWith('#')) {
      const header = parseHeaderLine(line);
      if (header) {
        if (header.key === 'version') {
          context.header.version = header.value;
        } else if (header.key === 'delimiter') {
          // Parse delimiter, handle escaped tab
          if (header.value === '\\t') {
            context.header.delimiter = '\t';
          } else if (header.value === ',' || header.value === '|' || header.value === ';') {
            context.header.delimiter = header.value;
          } else {
            throw new TONLParseError(
              `Invalid delimiter: ${header.value}`,
              i,
              undefined,
              line,
              `Valid delimiters are: , | \\t ;`
            );
          }
        }
      }
      dataStartIndex = i + 1;
    } else {
      break;
    }
  }

  // Use delimiter from header or auto-detect if not specified
  if (!opts.delimiter) {
    if (context.header.delimiter) {
      context.delimiter = context.header.delimiter;
    } else {
      context.delimiter = detectDelimiter(text);
    }
  }

  // Parse data content
  const content = lines.slice(dataStartIndex).join('\n');
  if (!content) {
    return {};
  }

  const result = parseContent(content, context);

  // If the result has only one key called "root", unwrap it for better round-trip behavior
  if (result && typeof result === 'object' && Object.keys(result).length === 1 && 'root' in result) {
    return result.root;
  }

  return result;
}

/**
 * Parse the main content
 */
