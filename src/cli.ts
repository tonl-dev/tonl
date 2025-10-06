#!/usr/bin/env node

/**
 * TONL CLI - Command line interface for TONL format
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { encodeTONL, decodeTONL, encodeSmart } from "./index.js";
import { estimateTokens } from "./utils/metrics.js";

interface CLIOptions {
  out?: string;
  delimiter?: "," | "|" | "\t" | ";";
  includeTypes?: boolean;
  version?: string;
  indent?: number;
  smart?: boolean;
  stats?: boolean;
  strict?: boolean;
  tokenizer?: "gpt-5" | "gpt-4.5" | "gpt-4o" | "claude-3.5" | "gemini-2.0" | "llama-4" | "o200k" | "cl100k";
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
        options.indent = parseInt(nextArg, 10);
        i++;
        break;
      case "--smart":
        options.smart = true;
        break;
      case "--stats":
        options.stats = true;
        break;
      case "--strict":
        options.strict = true;
        break;
      case "--tokenizer":
        if (["gpt-5", "gpt-4.5", "gpt-4o", "claude-3.5", "gemini-2.0", "llama-4", "o200k", "cl100k"].includes(nextArg)) {
          options.tokenizer = nextArg as any;
        }
        i++;
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
    throw new Error("Usage: tonl <encode|decode|stats> <file> [options]");
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
  const byteSavings = ((originalBytes - tonlBytes) / originalBytes * 100).toFixed(1);
  const tokenSavings = ((originalTokens - tonlTokens) / originalTokens * 100).toFixed(1);

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
function main() {
  try {
    const args = process.argv.slice(2);
    const { command, file, options } = parseArgs(args);

    if (!existsSync(file)) {
      console.error(`❌ Error: File '${file}' not found`);
      process.exit(1);
    }

    const input = readFileSync(file, 'utf8');

    switch (command) {
      case "encode": {
        const encodeFunc = options.smart ? encodeSmart : encodeTONL;

        const jsonData = JSON.parse(input);
        const tonlOutput = encodeFunc(jsonData, {
          delimiter: options.delimiter,
          includeTypes: options.includeTypes,
          version: options.version,
          indent: options.indent,
          singleLinePrimitiveLists: true
        });

        if (options.out) {
          writeFileSync(options.out, tonlOutput);
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
          writeFileSync(options.out, jsonOutput);
          console.log(`✅ Decoded to ${options.out}`);
        } else {
          console.log(jsonOutput);
        }
        break;
      }

      case "stats": {
        if (file.endsWith('.json')) {
          // JSON file - encode and compare
          const jsonData = JSON.parse(input);
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

      default:
        console.error(`❌ Error: Unknown command '${command}'`);
        console.log("Available commands: encode, decode, stats");
        process.exit(1);
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
TONL (Token-Optimized Notation Language) CLI

Usage:
  tonl encode <file.json> [--out <file.tonl>] [options]
  tonl decode <file.tonl> [--out <file.json>] [--strict]
  tonl stats  <file.{json,tonl}> [--tokenizer <type>]

Options:
  --out <file>           Output file (default: stdout)
  --delimiter <,|\t|;|;> Field delimiter (default: ,)
  --include-types        Include type hints in headers
  --version <string>     TONL version (default: 1.0)
  --indent <number>      Indentation spaces (default: 2)
  --smart               Use smart encoding (auto-optimize)
  --stats               Show compression statistics
  --strict              Enable strict parsing mode
  --tokenizer <type>    Token estimation (gpt-5, gpt-4.5, gpt-4o, claude-3.5, gemini-2.0, llama-4, o200k, cl100k)

Examples:
  tonl encode data.json --out data.tonl --smart --stats
  tonl decode data.tonl --out data.json --strict
  tonl stats data.json --tokenizer gpt-5
`);
  process.exit(0);
}

// Run CLI
main();