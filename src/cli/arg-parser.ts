/**
 * Command line argument parser
 */

import type { CLIOptions, ParsedArgs } from './types.js';

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): ParsedArgs {
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
      case "--compact-tables":
        options.compactTables = true;
        break;
      case "--schema-first":
        options.schemaFirst = true;
        break;
      case "--interactive":
      case "-i":
        options.interactive = true;
        break;
      case "--theme":
        if (["default", "neon", "matrix", "cyberpunk"].includes(nextArg)) {
          (options as any).theme = nextArg;
        }
        i++;
        break;
      case "--compare":
        options.compare = true;
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