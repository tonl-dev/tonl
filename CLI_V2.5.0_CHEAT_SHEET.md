# TONL v2.5.0 CLI Cheat Sheet

## Quick Start

```bash
npm install -g tonl
tonl --version
tonl --help
```

---

## Commands

| Command | Description |
|---------|-------------|
| `encode` | JSON to TONL |
| `decode` | TONL to JSON |
| `stats` | Compression statistics |
| `format` | Format TONL file |
| `validate` | Validate against schema |
| `query` | JSONPath query |
| `get` | Get path value |
| `generate-types` | Schema to TypeScript |

---

## Encode

```bash
tonl encode data.json --out data.tonl
tonl encode data.json --smart --stats --out data.tonl
tonl encode data.json --optimize --verbose --stats
tonl encode data.json --delimiter "|" --include-types
tonl encode data.json --preprocess --indent 4
```

| Option | Description |
|--------|-------------|
| `--out` | Output file |
| `--smart` | Auto-optimize |
| `--optimize` | Advanced optimization |
| `--verbose` | Detailed analysis |
| `--stats` | Show statistics |
| `--delimiter` | `,` `\|` `\t` `;` |
| `--include-types` | Type hints |
| `--preprocess` | Clean keys |
| `--indent` | Spaces (default: 2) |

---

## Decode

```bash
tonl decode data.tonl --out data.json
tonl decode data.tonl --strict
```

| Option | Description |
|--------|-------------|
| `--out` | Output file |
| `--strict` | Strict parsing |
| `--delimiter` | Field delimiter |

---

## Stats

```bash
tonl stats data.json
tonl stats data.json --interactive
tonl stats data.json -i --theme neon
tonl stats data.json --tokenizer gpt-5
tonl stats data.json --compare
```

| Option | Description |
|--------|-------------|
| `-i, --interactive` | Interactive dashboard |
| `--theme` | `default` `neon` `matrix` `cyberpunk` |
| `--tokenizer` | LLM tokenizer |
| `--compare` | Comparison mode |
| `--verbose` | Detailed stats |

### Tokenizers
`gpt-5` `gpt-4.5` `gpt-4o` `claude-3.5` `gemini-2.0` `llama-4` `o200k` `cl100k`

---

## Format

```bash
tonl format data.tonl --pretty --out formatted.tonl
tonl format data.tonl --indent 4 --include-types
```

| Option | Description |
|--------|-------------|
| `--out` | Output file |
| `--pretty` | Pretty format |
| `--indent` | Indentation |
| `--include-types` | Type hints |
| `--delimiter` | Field delimiter |

---

## Validate

```bash
tonl validate data.tonl --schema data.schema.tonl
tonl validate data.tonl --schema data.schema.tonl --strict
```

| Option | Description |
|--------|-------------|
| `--schema` | Schema file (required) |
| `--strict` | Strict mode |

---

## Query & Get

```bash
tonl query data.tonl "users[?(@.age > 25)]"
tonl query data.json "$..email"
tonl get data.tonl "user.profile.email"
tonl query data.tonl "users[0]" --out result.json
```

### JSONPath Examples
| Expression | Result |
|------------|--------|
| `users[0]` | First user |
| `users[*].name` | All names |
| `users[?(@.age > 25)]` | Filter by age |
| `$..email` | All emails |
| `users[-1]` | Last user |

---

## Generate Types

```bash
tonl generate-types schema.tonl --out types.ts
```

| Option | Description |
|--------|-------------|
| `--out` | Output .ts file (required) |

---

## Delimiters

```bash
--delimiter ","   # Comma (default)
--delimiter "|"   # Pipe
--delimiter "\t"  # Tab
--delimiter ";"   # Semicolon
```

---

## Interactive Menu

```
1. Analyze another file
2. Compare two files
3. Change theme
4. Change tokenizer
5. Detailed statistics
6. Exit
```

---

## Workflows

### LLM Optimization
```bash
tonl stats data.json --tokenizer gpt-5
tonl encode data.json --optimize --stats --out optimized.tonl
tonl decode optimized.tonl --out restored.json
```

### Schema Workflow
```bash
tonl generate-types schema.tonl --out types.ts
tonl validate data.tonl --schema schema.tonl --strict
tonl query data.tonl "users[?(@.active)]"
```

### Interactive Analysis
```bash
tonl stats data.json -i --theme neon
```

---

## v2.5.0 Highlights

- Advanced optimization (`--optimize`)
- 8 LLM tokenizers
- Interactive dashboard with 4 themes
- Schema validation (13 constraint types)
- JSONPath queries with filtering
- 791+ tests, 100% coverage
- Enterprise security hardening