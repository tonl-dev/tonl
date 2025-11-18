/**
 * CLI Help
 */

export function showHelp() {
  console.log(`
TONL (Token-Optimized Notation Language) CLI

Usage:
  tonl encode <file.json> [--out <file.tonl>] [options]
  tonl decode <file.tonl> [--out <file.json>] [--strict]
  tonl stats  <file.{json,tonl}> [--tokenizer <type>] [--interactive] [--theme <theme>]
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
  --interactive, -i    Launch interactive stats dashboard (EXPERIMENTAL)
  --theme <theme>      Color theme for interactive mode (default, neon, matrix, cyberpunk)
  --compare            Enable comparison mode for file analysis

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
  tonl stats data.json --interactive
  tonl stats data.tonl -i --theme cyberpunk
`);
}