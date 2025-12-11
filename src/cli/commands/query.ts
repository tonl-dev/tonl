/**
 * Query Command
 */

import { decodeTONL } from "../../index.js";
import { safeJsonParse } from "../../utils/strings.js";
import { QuerySanitizer } from "../query-sanitizer.js";
import { SecurityError } from "../../errors/index.js";
import { safeWriteFile } from "../utils.js";
import type { Command, CommandContext } from "../types.js";
import type { TONLValue } from "../../types.js";

export const QueryCommand: Command = {
  name: "query",
  description: "Query TONL or JSON files with JSONPath expressions",

  async execute(context: CommandContext): Promise<void> {
    const { file, options, input } = context;

    if (!file.endsWith('.tonl') && !file.endsWith('.json')) {
      console.error("❌ Error: query/get requires a .tonl or .json file");
      process.exit(1);
    }

    // Parse file (already safely read)
    let data: any;

    if (file.endsWith('.json')) {
      data = safeJsonParse(input) as TONLValue;
    } else {
      data = decodeTONL(input, { delimiter: options.delimiter });
    }

    // Get query expression from context (provided by the main CLI)
    const queryExpr = context.queryExpression;

    if (!queryExpr) {
      console.error("❌ Error: Query expression required");
      console.error("Usage: tonl query <file> <expression>");
      console.error('Example: tonl query data.tonl "users[?(@.age > 25)]"');
      process.exit(1);
    }

    // Execute query
    // SECURITY FIX (BF007): Wrap async import in try-catch
    let TONLDocument;
    try {
      const module = await import('../../document.js');
      TONLDocument = module.TONLDocument;
      // BUG-NEW-014 FIX: Validate TONLDocument was successfully imported
      if (!TONLDocument) {
        throw new Error('TONLDocument export not found in module');
      }
    } catch (error) {
      console.error('❌ Failed to load document module:', error);
      process.exit(1);
    }

    const doc = TONLDocument.fromJSON(data);
    const result = context.commandType === 'get' ? doc.get(queryExpr) : doc.query(queryExpr);

    // Output result
    if (options.out) {
      safeWriteFile(options.out, JSON.stringify(result, null, 2));
      console.log(`✅ Query result saved to ${options.out}`);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  }
};

/**
 * Process query arguments from raw CLI args
 */
export function processQueryArgs(args: string[], command: string, file: string): string {
  // Find indices of command and file to determine where query expression starts
  const commandIndex = args.indexOf(command);
  const fileIndex = args.indexOf(file);
  const queryStartIndex = Math.max(commandIndex, fileIndex) + 1;

  // Collect all remaining non-option args and join them
  // This handles cases where the expression contains spaces
  const rawQuery = args
    .slice(queryStartIndex)
    .filter(a => !a.startsWith('-'))
    .join(' ')
    .trim();

  if (!rawQuery) {
    console.error("❌ Error: Query expression required");
    console.error("Usage: tonl query <file> <expression>");
    console.error('Example: tonl query data.tonl "users[?(@.age > 25)]"');
    process.exit(1);
  }

  // SECURITY FIX (BF005): Sanitize query expression
  let queryExpr: string;
  try {
    queryExpr = QuerySanitizer.sanitize(rawQuery, {
      maxLength: 1000,
      maxDepth: 100,
    });
  } catch (error) {
    if (error instanceof SecurityError) {
      console.error(`❌ Security Error: ${error.message}`);
      console.error(`❌ Query blocked: ${QuerySanitizer.sanitizeForLogging(rawQuery)}`);
      process.exit(1);
    }
    throw error;
  }

  return queryExpr;
}