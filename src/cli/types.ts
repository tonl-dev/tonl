/**
 * CLI Types and Interfaces
 */

export interface CLIOptions {
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
  compactTables?: boolean;
  schemaFirst?: boolean;
  interactive?: boolean;
  compare?: boolean;
}

export interface ParsedArgs {
  command: string;
  file: string;
  options: CLIOptions;
}

export interface CommandContext {
  file: string;
  options: CLIOptions;
  input: string;
}

export interface Command {
  name: string;
  description: string;
  execute(context: CommandContext): Promise<void> | void;
}