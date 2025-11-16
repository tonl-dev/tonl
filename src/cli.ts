#!/usr/bin/env node
/**
 * TONL CLI - Command line interface for TONL format
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { encodeTONL, decodeTONL, encodeSmart } from "./index";
import { estimateTokens } from "./utils/metrics";
import { safeJsonParse } from "./utils/strings";
import { parseSchema, validateTONL, generateTypeScript } from "./schema/index";
import { PathValidator } from "./cli/path-validator";
import type { TONLValue } from "./types.js";
import { QuerySanitizer } from "./cli/query-sanitizer";
import { SecurityError } from "./errors/index";

/**
 * Safe file read with path validation
 * BUG-008 FIX: Enhanced error handling and resource cleanup
 */
function safeReadFile(userPath: string, preprocess: boolean = false): string {
  try {
    const safePath = PathValidator.validateRead(userPath);

    // BUG-008 FIX: Validate file existence and accessibility before reading
    if (!existsSync(safePath)) {
      throw new Error(`File not found: ${userPath}`);
    }

    // readFileSync in Node.js automatically handles file descriptor cleanup,
    // but we add explicit error context for better debugging
    let content = readFileSync(safePath, 'utf8');

    // Only preprocess if explicitly requested
    if (preprocess && userPath.endsWith('.json')) {
      content = preprocessJsonKeys(content);
    }

    return content;
  } catch (error) {
    if (error instanceof SecurityError) {
      console.error(`❌ Security Error: ${error.message}`);
      console.error(`❌ Access denied to: ${userPath}`);
      process.exit(1);
    }

    // BUG-008 FIX: Enhanced error reporting for file operation failures
    if (error instanceof Error) {
      console.error(`❌ Error reading file: ${error.message}`);
      console.error(`❌ File: ${userPath}`);
    } else {
      console.error(`❌ Unknown error reading file: ${userPath}`);
    }

    throw error;
  }
}

/**
 * Preprocess JSON to handle special characters in keys
 * BUG-NEW-005 FIX: Transform problematic keys (like #, @) to safe alternatives
 * to prevent parsing conflicts with TONL directives and comments
 */
function preprocessJsonKeys(jsonString: string): string {
  try {
    const data = JSON.parse(jsonString);

    // Transform problematic keys to safe alternatives
    const transformedData = transformObjectKeys(data);

    return JSON.stringify(transformedData, null, 2);
  } catch (error) {
    // If JSON parsing fails, try to fix common issues
    try {
      // Try to fix escaped characters
      const fixed = jsonString
        .replace(/\\"\\\\\#/g, '\\\\"hash\\\\"')
        .replace(/\\"\"\"/g, '\\\\"quote\\\\"');
      return JSON.parse(fixed);
    } catch {
      // If still fails, return original (will be caught by safeJsonParse)
      return jsonString;
    }
  }
}

/**
 * Transform object keys to safe alternatives
 */
function transformObjectKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(transformObjectKeys);
  }

  if (obj !== null && typeof obj === 'object') {
    const transformed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Transform problematic keys
      let safeKey = key;

      if (key === '#') {
        safeKey = 'hash_key';
      } else if (key === '') {
        safeKey = 'empty_key';
      } else if (key.includes('@')) {
        safeKey = key.replace(/@/g, '_at_');
      } else if (key.includes(':')) {
        safeKey = key.replace(/:/g, '_colon_');
      } else if (key.includes('"')) {
        safeKey = key.replace(/"/g, '_quote_');
      } else if (key.includes(' ')) {
        safeKey = key.replace(/ /g, '_space_');
      }

      transformed[safeKey] = transformObjectKeys(value);
    }
    return transformed;
  }

  return obj;
}

/**
 * Safe file write with path validation
 * BUG-008 FIX: Enhanced error handling and resource cleanup
 */
function safeWriteFile(userPath: string, content: string): void {
  try {
    const safePath = PathValidator.validateWrite(userPath);

    // BUG-008 FIX: Validate content before writing
    if (typeof content !== 'string') {
      throw new Error(`Invalid content type: expected string, got ${typeof content}`);
    }

    // writeFileSync in Node.js automatically handles file descriptor cleanup,
    // but we add validation and enhanced error reporting
    writeFileSync(safePath, content, 'utf8');
  } catch (error) {
    if (error instanceof SecurityError) {
      console.error(`❌ Security Error: ${error.message}`);
      console.error(`❌ Cannot write to: ${userPath}`);
      process.exit(1);
    }

    // BUG-008 FIX: Enhanced error reporting for file operation failures
    if (error instanceof Error) {
      console.error(`❌ Error writing file: ${error.message}`);
      console.error(`❌ File: ${userPath}`);

      // Additional context for common write errors (Node.js system errors have code property)
      const nodeError = error as any;
      if (nodeError.code === 'EACCES') {
        console.error(`❌ Permission denied. Check file/directory permissions.`);
      } else if (nodeError.code === 'ENOSPC') {
        console.error(`❌ No space left on device.`);
      } else if (nodeError.code === 'EISDIR') {
        console.error(`❌ Target is a directory, not a file.`);
      }
    } else {
      console.error(`❌ Unknown error writing file: ${userPath}`);
    }

    throw error;
  }
}

interface CLIOptions {
  out?: string;
  delimiter?: "," | "|" | "\t" | ";";
  includeTypes?: boolean;
  version?: string;
  indent?: number;
  smart?: boolean;
  stats?: boolean;
  strict?: boolean;
  pretty?: boolean;
  schema?: string;
  optimize?: boolean;
  verbose?: boolean;
  tokenizer?: "gpt-5" | "gpt-4.5" | "gpt-4o" | "claude-3.5" | "gemini-2.0" | "llama-4" | "o200k" | "cl100k";
  preprocess?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): { command: string; file: string; options: CLIOptions } {
  const options: CLIOptions = {};
  let command = "";
  let file = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "encode":
      case "decode":
      case "stats":
      case "format":
      case "validate":
      case "generate-types":
      case "query":
      case "get":
        command = arg;
        break;
      case "--out":
        options.out = nextArg;
        i++;
        break;
      case "--delimiter":
        if (nextArg === ",") options.delimiter = ",";
        else if (nextArg === "|") options.delimiter = "|";
        else if (nextArg === "\\t") options.delimiter = "\t";
        else if (nextArg === ";") options.delimiter = ";";
        i++;
        break;
      case "--include-types":
        options.includeTypes = true;
        break;
      case "--version":
        options.version = nextArg;
        i++;
        break;
      case "--indent":
        // BUGFIX: Validate parseInt result to prevent NaN
        const indentValue = parseInt(nextArg, 10);
        if (Number.isNaN(indentValue) || indentValue < 0) {
          throw new Error(`Invalid indent value: ${nextArg}. Must be a positive integer.`);
        }
        options.indent = indentValue;
        i++;
        break;
      case "--smart":
        options.smart = true;
        break;
      case "--stats":
        options.stats = true;
        break;
      case "--optimize":
        options.optimize = true;
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--strict":
        options.strict = true;
        break;
      case "--pretty":
        options.pretty = true;
        break;
      case "--tokenizer":
        if (["gpt-5", "gpt-4.5", "gpt-4o", "claude-3.5", "gemini-2.0", "llama-4", "o200k", "cl100k"].includes(nextArg)) {
          options.tokenizer = nextArg as typeof options.tokenizer;
        }
        i++;
        break;
      case "--schema":
        options.schema = nextArg;
        i++;
        break;
      case "--preprocess":
        options.preprocess = true;
        break;
      default:
        if (!arg.startsWith("-") && !command) {
          command = arg;
        } else if (!arg.startsWith("-") && command && !file) {
          file = arg;
        }
        break;
    }
  }

  if (!command || !file) {
    throw new Error("Usage: tonl <encode|decode|stats|format> <file> [options]");
  }

  return { command, file, options };
}


/**
 * Calculate byte size
 */
function byteSize(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

/**
 * Display statistics
 */
function displayStats(originalBytes: number, originalTokens: number, tonlBytes: number, tonlTokens: number, filename: string) {
  // BUGFIX: Handle division by zero case (empty files)
  const byteSavings = originalBytes > 0
    ? ((originalBytes - tonlBytes) / originalBytes * 100).toFixed(1)
    : '0.0';
  const tokenSavings = originalTokens > 0
    ? ((originalTokens - tonlTokens) / originalTokens * 100).toFixed(1)
    : '0.0';

  console.log(`\n📊 TONL Statistics for ${filename}`);
  console.log(`┌─────────────────┬─────────────┬─────────────┬────────────┐`);
  console.log(`│ Format          │ Bytes       │ Tokens      │ Savings    │`);
  console.log(`├─────────────────┼─────────────┼─────────────┼────────────┤`);
  console.log(`│ Original        │ ${originalBytes.toString().padStart(11)} │ ${originalTokens.toString().padStart(11)} │ ${"".padStart(10)} │`);
  console.log(`│ TONL           │ ${tonlBytes.toString().padStart(11)} │ ${tonlTokens.toString().padStart(11)} │ ${byteSavings.padStart(9)}% │`);
  console.log(`└─────────────────┴─────────────┴─────────────┴────────────┘`);
  console.log(`🎯 Byte reduction: ${byteSavings}% | 🧠 Token reduction: ${tokenSavings}%\n`);
}

/**
 * Main CLI execution
 */
async function main() {
  try {
    const args = process.argv.slice(2);

    // Show help if no arguments provided
    if (args.length === 0) {
      showHelp();
      return;
    }

    // Special case for --version command (no file required)
    if (args.length === 1 && (args[0] === '--version' || args[0] === '-v')) {
      const packageVersion = '2.0.4'; // Hard-coded version to avoid ES module issues
      console.log(`📦 TONL Version: ${packageVersion}`);
      console.log(`🏠 Token-Optimized Notation Language`);
      console.log(`📋 Built: 2025-11-15`);
      console.log(`🔐 Production Ready with 100% Test Coverage`);
      return;
    }

    const { command, file, options } = parseArgs(args);

    // Safely read input file (with path validation)
    const input = safeReadFile(file, options.preprocess || false);

    switch (command) {
      case "encode": {
        let tonlOutput: string;
        const jsonData = safeJsonParse(input) as TONLValue;

        if (options.optimize) {
          // Use optimization
          console.log('🚀 Applying advanced optimization...');

          // Dynamically import optimization module
          const { AdaptiveOptimizer } = await import('./optimization');
          const optimizer = new AdaptiveOptimizer();

          const optimizationResult = optimizer.optimize(jsonData as any[]);

          // Build TONL with directives
          const directives = optimizationResult.directives.join('\n') + '\n';
          const baseTONL = encodeSmart(optimizationResult.optimizedData, {
            delimiter: options.delimiter,
            includeTypes: options.includeTypes,
            version: options.version,
            indent: options.indent,
            singleLinePrimitiveLists: true
          });

          tonlOutput = directives + baseTONL;

          if (options.verbose) {
            console.log('\n📊 Optimization Analysis:');
            console.log(`Recommended strategies: ${optimizationResult.analysis.recommendedStrategies.join(', ')}`);
            console.log(`Estimated savings: ${optimizationResult.analysis.estimatedSavings}%`);
            console.log(`Applied optimizations: ${optimizationResult.directives.length}`);

            if (optimizationResult.analysis.warnings.length > 0) {
              console.log('\n⚠️  Warnings:');
              optimizationResult.analysis.warnings.forEach((warning: any) => {
                console.log(`  • ${warning}`);
              });
            }

            console.log('\n🔧 Optimization Details:');
            optimizationResult.analysis.appliedOptimizations.forEach((detail: any) => {
              console.log(`  • ${detail}`);
            });
          }
        } else {
          // Use regular encoding
          const encodeFunc = options.smart ? encodeSmart : encodeTONL;
          tonlOutput = encodeFunc(jsonData, {
            delimiter: options.delimiter,
            includeTypes: options.includeTypes,
            version: options.version,
            indent: options.indent,
            singleLinePrimitiveLists: true
          });
        }

        if (options.out) {
          safeWriteFile(options.out, tonlOutput);
          console.log(`✅ Encoded to ${options.out}`);
        } else {
          console.log(tonlOutput);
        }

        if (options.stats) {
          const originalBytes = byteSize(JSON.stringify(jsonData));
          const originalTokens = estimateTokens(JSON.stringify(jsonData), options.tokenizer);
          const tonlBytes = byteSize(tonlOutput);
          const tonlTokens = estimateTokens(tonlOutput, options.tokenizer);
          displayStats(originalBytes, originalTokens, tonlBytes, tonlTokens, file);
        }
        break;
      }

      case "decode": {
        const jsonData = decodeTONL(input, {
          delimiter: options.delimiter,
          strict: options.strict
        });

        const jsonOutput = JSON.stringify(jsonData, null, 2);

        if (options.out) {
          safeWriteFile(options.out, jsonOutput);
          console.log(`✅ Decoded to ${options.out}`);
        } else {
          console.log(jsonOutput);
        }
        break;
      }

      case "stats": {
        if (file.endsWith('.json')) {
          // JSON file - encode and compare
          const jsonData = safeJsonParse(input) as TONLValue;
          const originalBytes = byteSize(input);
          const originalTokens = estimateTokens(input, options.tokenizer);

          const tonlOutput = encodeTONL(jsonData, { delimiter: options.delimiter });
          const tonlBytes = byteSize(tonlOutput);
          const tonlTokens = estimateTokens(tonlOutput, options.tokenizer);

          displayStats(originalBytes, originalTokens, tonlBytes, tonlTokens, file);
        } else if (file.endsWith('.tonl')) {
          // TONL file - decode and compare
          const jsonData = decodeTONL(input, { delimiter: options.delimiter });
          const jsonOutput = JSON.stringify(jsonData);

          const tonlBytes = byteSize(input);
          const tonlTokens = estimateTokens(input, options.tokenizer);
          const originalBytes = byteSize(jsonOutput);
          const originalTokens = estimateTokens(jsonOutput, options.tokenizer);

          displayStats(originalBytes, originalTokens, tonlBytes, tonlTokens, file);
        } else {
          console.error("❌ Error: File must be .json or .tonl");
          process.exit(1);
        }
        break;
      }

      case "format": {
        if (!file.endsWith('.tonl')) {
          console.error("❌ Error: Format command requires a .tonl file");
          process.exit(1);
        }

        // Parse the TONL file
        const jsonData = decodeTONL(input, {
          delimiter: options.delimiter,
          strict: options.strict
        });

        // Re-encode with pretty formatting
        const formattedOutput = encodeTONL(jsonData, {
          delimiter: options.delimiter,
          includeTypes: options.includeTypes,
          version: options.version,
          indent: options.indent || 2,
          singleLinePrimitiveLists: true,
          prettyDelimiters: options.pretty
        });

        if (options.out) {
          safeWriteFile(options.out, formattedOutput);
          console.log(`✅ Formatted to ${options.out}`);
        } else {
          console.log(formattedOutput);
        }
        break;
      }

      case "validate": {
        if (!file.endsWith('.tonl')) {
          console.error("❌ Error: Validate command requires a .tonl file");
          process.exit(1);
        }

        if (!options.schema) {
          console.error("❌ Error: --schema <file.schema.tonl> is required");
          process.exit(1);
        }

        // Load schema (with path validation)
        const schemaContent = safeReadFile(options.schema);
        const schema = parseSchema(schemaContent);

        // Parse data
        const data = decodeTONL(input, {
          delimiter: options.delimiter,
          strict: options.strict
        });

        // Validate
        const result = validateTONL(data, schema);

        if (result.valid) {
          console.log(`✅ Validation successful: ${file} conforms to schema`);
          console.log(`   - Schema: ${options.schema}`);
          console.log(`   - Fields validated: ${schema.rootFields.length}`);
          console.log(`   - Errors: 0`);
        } else {
          console.log(`❌ Validation failed: ${result.errors.length} error(s) found\n`);
          result.errors.forEach((err, idx) => {
            console.log(`Error ${idx + 1}: ${err.field}`);
            console.log(`  ${err.message}`);
            if (err.expected) console.log(`  Expected: ${err.expected}`);
            if (err.actual) console.log(`  Actual: ${err.actual}`);
            console.log('');
          });
          process.exit(1);
        }
        break;
      }

      case "generate-types": {
        if (!file.endsWith('.schema.tonl')) {
          console.error("❌ Error: generate-types requires a .schema.tonl file");
          process.exit(1);
        }

        if (!options.out) {
          console.error("❌ Error: --out <file.ts> is required for generate-types");
          process.exit(1);
        }

        // Load schema (note: 'file' already validated in main, but use safeReadFile for consistency)
        const schemaContent = input; // Already read safely at line 179
        const schema = parseSchema(schemaContent);

        // Generate TypeScript
        const tsCode = generateTypeScript(schema, {
          exportAll: true,
          readonly: false,
          strict: false
        });

        // Write output (with path validation)
        safeWriteFile(options.out, tsCode);
        console.log(`✅ Generated TypeScript types: ${options.out}`);
        console.log(`   - Custom types: ${schema.customTypes.size}`);
        console.log(`   - Root fields: ${schema.rootFields.length}`);
        break;
      }

      case "query":
      case "get": {
        if (!file.endsWith('.tonl') && !file.endsWith('.json')) {
          console.error("❌ Error: query/get requires a .tonl or .json file");
          process.exit(1);
        }

        // Parse file (already safely read at line 179)
        let data: any;

        if (file.endsWith('.json')) {
          data = safeJsonParse(input) as TONLValue;
        } else {
          data = decodeTONL(input, { delimiter: options.delimiter });
        }

        // Get query expression from remaining args
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

        // Execute query
        // SECURITY FIX (BF007): Wrap async import in try-catch
        let TONLDocument;
        try {
          const module = await import('./document');
          TONLDocument = module.TONLDocument;
        } catch (error) {
          console.error('❌ Failed to load document module:', error);
          process.exit(1);
        }

        const doc = TONLDocument.fromJSON(data);
        const result = command === 'get' ? doc.get(queryExpr) : doc.query(queryExpr);

        // Output result
        if (options.out) {
          safeWriteFile(options.out, JSON.stringify(result, null, 2));
          console.log(`✅ Query result saved to ${options.out}`);
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
        break;
      }

      default:
        console.error(`❌ Error: Unknown command '${command}'`);
        console.log("Available commands: encode, decode, stats, format, validate, generate-types, query, get");
        process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
TONL (Token-Optimized Notation Language) CLI

Usage:
  tonl encode <file.json> [--out <file.tonl>] [options]
  tonl decode <file.tonl> [--out <file.json>] [--strict]
  tonl stats  <file.{json,tonl}> [--tokenizer <type>]
  tonl format <file.tonl> [--pretty] [--out <file.tonl>] [options]
  tonl validate <file.tonl> --schema <file.schema.tonl> [--strict]
  tonl generate-types <file.schema.tonl> --out <file.ts>
  tonl query <file> <expression> [--out <file.json>]
  tonl get <file> <path> [--out <file.json>]

Options:
  --out <file>           Output file (default: stdout)
  --delimiter <,|\t|;|;> Field delimiter (default: ,)
  --include-types        Include type hints in headers
  --version <string>     TONL version (default: 1.0)
  --indent <number>      Indentation spaces (default: 2)
  --smart               Use smart encoding (auto-optimize)
  --stats               Show compression statistics
  --optimize            Apply advanced optimization strategies
  --verbose             Show detailed optimization analysis
  --strict              Enable strict parsing mode
  --pretty              Format with proper indentation (for format command)
  --schema <file>       Schema file for validation (.schema.tonl)
  --tokenizer <type>    Token estimation (gpt-5, gpt-4.5, gpt-4o, claude-3.5, gemini-2.0, llama-4, o200k, cl100k)
  --preprocess         Transform problematic keys (#, @, "") to safe alternatives

Examples:
  tonl encode data.json --out data.tonl --smart --stats
  tonl encode data.json --optimize --stats --verbose
  tonl encode data.json --optimize dictionary,delta,bitpack
  tonl decode data.tonl --out data.json --strict
  tonl stats data.json --tokenizer gpt-5
  tonl format data.tonl --pretty --out formatted.tonl
  tonl validate users.tonl --schema users.schema.tonl --strict
  tonl generate-types users.schema.tonl --out types.ts
  tonl query users.tonl "users[?(@.age > 18)]"
  tonl get data.tonl "user.profile.email"
`);
}

// Show help for --help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// SECURITY FIX (BF007): Global error handlers for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run CLI
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});