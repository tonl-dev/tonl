# TONL CLI Documentation v2.5.2

The TONL Command Line Interface provides powerful tools for converting, analyzing, and optimizing TONL data.

## 🎉 v2.5.2 - Enterprise Security & Optimization

**Updated CLI documentation** with latest bug fix improvements:

- **Version consistency** - Aligned CLI documentation with current version
- **Updated examples** - All CLI commands verified with current version
- **Feature completeness** - All documented features available and tested

## 🎉 v2.0.6 - Dual-Mode System

The CLI now supports **dual-mode encoding** allowing you to choose between:

- **Default Mode (Quoting Only)**: Perfect round-trip safety with automatic key quoting
- **Preprocessing Mode**: Clean, readable output with key transformation

### Dual-Mode Examples

**Problematic JSON:**
```json
{"#":"}","":"","key with spaces":"value","@type":"special"}
```

**Default Mode (Perfect Round-trip):**
```bash
tonl encode problem.json
```
```tonl
"#"[1]:
  "}"
""[1]:
  ""
"key with spaces"[1]:
  value
"@type"[1]:
  special
```

**Preprocessing Mode (Clean Output):**
```bash
tonl encode problem.json --preprocess
```
```tonl
#comment[1]:
  "}"
empty[1]:
  ""
key_with_spaces[1]:
  value
type[1]:
  special
```

### When to Use Each Mode

- **Default Mode**: Data integrity, configuration files, API responses, when exact round-trip matters
- **Preprocessing Mode**: Data analysis, LLM prompts, temporary files, when readability is priority

## Installation

```bash
# Local development
npm link

# Global installation
npm install -g tonl
```

## Overview

The CLI provides eight main commands:

| Command | Description |
|---------|-------------|
| `tonl encode` | Convert JSON to TONL with optimization options |
| `tonl decode` | Convert TONL to JSON |
| `tonl format` | Format and prettify TONL files |
| `tonl validate` | Validate TONL data against schema |
| `tonl generate-types` | Generate TypeScript types from schema |
| `tonl stats` | Analyze and compare data formats |
| `tonl query` | Query TONL files with JSONPath expressions |
| `tonl get` | Get specific values from TONL files (alias for query) |

## Global Options

These options are available across all commands:

```bash
-h, --help              Show help information
-v, --version           Display version information
--quiet                 Suppress non-error output
--verbose               Enable detailed logging
```

## Encode Command

Convert JSON data to TONL format.

### Syntax

```bash
tonl encode <input.json> [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--out` | `-o` | Output file path | stdout |
| `--delimiter` | `-d` | Field delimiter | `,` |
| `--include-types` | `-t` | Add type hints to headers | `false` |
| `--version` | | TONL version | `1.0` |
| `--indent` | `-i` | Indentation spaces | `2` |
| `--smart` | `-s` | Use smart encoding | `false` |
| `--stats` | | Show encoding statistics | `false` |
| `--preprocess` | `-p` | Preprocess JSON keys for readability | `false` |

### Supported Delimiters

- `,` - Comma (default)
- `|` - Pipe
- `\t` - Tab
- `;` - Semicolon

### Basic Usage

```bash
# Basic encoding (default mode with quoting)
tonl encode data.json

# Output to file
tonl encode data.json --out data.tonl

# Use smart encoding with statistics
tonl encode data.json --smart --stats

# Preprocessing mode for problematic keys
tonl encode problem-data.json --preprocess --out clean.tonl
```

### Advanced Usage

```bash
# Custom delimiter with type hints
tonl encode users.json --delimiter "|" --include-types

# Compact encoding for large datasets
tonl encode large-dataset.json --indent 0 --smart

# Preprocessing with custom delimiter
tonl encode messy-data.json --preprocess --delimiter "|" --stats

# Batch processing with preprocessing
for file in *.json; do
  tonl encode "$file" --preprocess --out "${file%.json}.tonl" --smart --stats
done
```

### Examples

#### Basic Encoding

**Input (users.json):**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob, Jr.", "role": "user" }
  ]
}
```

**Command:**
```bash
tonl encode users.json
```

**Output:**
```
#version 1.0
users[2]{id:u32,name:str,role:str}:
  1, Alice, admin
  2, "Bob, Jr.", user
```

#### Dual-Mode Encoding Comparison

**Problematic JSON (messy-keys.json):**
```json
{
  "#": "hash-key",
  "": "empty-key",
  "key with spaces": "spaced-key",
  "@type": "at-symbol-key"
}
```

**Default Mode (Perfect Round-trip):**
```bash
tonl encode messy-keys.json
```
```tonl
"#"[1]:
  hash-key
""[1]:
  empty-key
"key with spaces"[1]:
  spaced-key
"@type"[1]:
  at-symbol-key
```

**Preprocessing Mode (Clean Output):**
```bash
tonl encode messy-keys.json --preprocess
```
```tonl
#comment[1]:
  hash-key
empty[1]:
  empty-key
key_with_spaces[1]:
  spaced-key
type[1]:
  at-symbol-key
```

#### Smart Encoding

**Command:**
```bash
tonl encode complex-data.json --smart --stats
```

**Output:**
```
TONL Encoding Statistics:
========================
Input file: complex-data.json
Output file: stdout
Encoding: smart
Delimiter: |
Original size: 1,247 bytes
TONL size: 843 bytes
Compression: 32.4%
Estimated tokens: 287 (vs 456 for JSON)
```

## Decode Command

Convert TONL data back to JSON format.

### Syntax

```bash
tonl decode <input.tonl> [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--out` | `-o` | Output file path | stdout |
| `--strict` | `-s` | Enable strict mode validation | `false` |
| `--delimiter` | `-d` | Force specific delimiter | auto-detect |

### Basic Usage

```bash
# Basic decoding
tonl decode data.tonl

# Output to file
tonl decode data.tonl --out data.json

# Strict validation
tonl decode data.tonl --strict
```

### Advanced Usage

```bash
# Force specific delimiter
tonl decode data.tonl --delimiter "|"

# Batch processing
for file in *.tonl; do
  tonl decode "$file" --out "${file%.tonl}.json"
done

# Validation only
tonl decode data.tonl --strict --out /dev/null
```

### Examples

#### Basic Decoding

**Input (data.tonl):**
```
#version 1.0
users[2]{id:u32,name:str,role:str}:
  1, Alice, admin
  2, "Bob, Jr.", user
```

**Command:**
```bash
tonl decode data.tonl
```

**Output:**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob, Jr.", "role": "user" }
  ]
}
```

#### Strict Mode Validation

**Command:**
```bash
tonl decode data.tonl --strict
```

**Output (on error):**
```
Error: Validation failed in strict mode:
  - Row 2 has 3 columns, expected 2
  - Value 'invalid' cannot be coerced to u32
```

## Format Command

Format and prettify TONL files with consistent indentation and delimiters.

### Syntax

```bash
tonl format <input.tonl> [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--out` | `-o` | Output file path | stdout |
| `--delimiter` | `-d` | Field delimiter | auto-detect |
| `--indent` | `-i` | Indentation spaces | `2` |
| `--include-types` | `-t` | Add type hints | `false` |
| `--pretty` | | Pretty delimiter spacing | `false` |
| `--strict` | `-s` | Strict mode parsing | `false` |

### Basic Usage

```bash
# Format TONL file to stdout
tonl format data.tonl

# Format with specific delimiter
tonl format data.tonl --delimiter "|" --out formatted.tonl

# Pretty format with type hints
tonl format data.tonl --pretty --include-types --out data-pretty.tonl
```

### Examples

#### Basic Formatting

**Input (messy.tonl):**
```
#version 1.0
users[2]{id,name}:
1,Alice
2,Bob
```

**Command:**
```bash
tonl format messy.tonl --indent 2
```

**Output:**
```
#version 1.0
users[2]{id:u32,name:str}:
  1, Alice
  2, Bob
```

#### Change Delimiter

**Command:**
```bash
tonl format data.tonl --delimiter "|" --out data-pipes.tonl
```

---

## Validate Command

Validate TONL data against a schema file.

### Syntax

```bash
tonl validate <input.tonl> --schema <schema.schema.tonl> [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--schema` | | Schema file (required) | - |
| `--delimiter` | `-d` | Field delimiter | auto-detect |
| `--strict` | `-s` | Strict mode parsing | `false` |

### Basic Usage

```bash
# Validate data against schema
tonl validate users.tonl --schema users.schema.tonl

# Validate with strict mode
tonl validate config.tonl --schema config.schema.tonl --strict
```

### Examples

#### Schema Definition (users.schema.tonl)

```
@schema v1
@strict true

User: obj
  id: u32 required
  name: str required min:2 max:100
  email: str required pattern:email
  age: u32 min:0 max:150

users: list<User>
```

#### Valid Data

**Command:**
```bash
tonl validate users.tonl --schema users.schema.tonl
```

**Output (success):**
```
✅ Validation successful: users.tonl conforms to schema
   - Schema: users.schema.tonl
   - Fields validated: 4
   - Errors: 0
```

#### Invalid Data

**Output (failure):**
```
❌ Validation failed: 2 error(s) found

Error 1: users[0].email
  Invalid email format
  Expected: valid email address
  Actual: not-an-email

Error 2: users[1].age
  Value exceeds maximum
  Expected: max 150
  Actual: 200
```

---

## Generate Types Command

Generate TypeScript type definitions from a TONL schema.

### Syntax

```bash
tonl generate-types <schema.schema.tonl> --out <output.ts>
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--out` | `-o` | Output TypeScript file (required) | - |

### Basic Usage

```bash
# Generate TypeScript types from schema
tonl generate-types users.schema.tonl --out types/users.ts
```

### Examples

#### Schema (api.schema.tonl)

```
@schema v1

User: obj
  id: u32 required
  name: str required
  email: str required pattern:email
  roles: list<str>

ApiResponse: obj
  success: bool required
  data: User
  error: str
```

#### Command

```bash
tonl generate-types api.schema.tonl --out src/types/api.ts
```

#### Generated Output (src/types/api.ts)

```typescript
// Generated by TONL generate-types
// Schema: api.schema.tonl

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

export interface ApiResponse {
  success: boolean;
  data: User;
  error?: string;
}
```

**Output:**
```
✅ Generated TypeScript types: src/types/api.ts
   - Custom types: 2
   - Root fields: 0
```

---

## Stats Command

Analyze and compare data formats with size and token estimates.

### Syntax

```bash
tonl stats <input.(json|tonl)> [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--tokenizer` | `-t` | Tokenizer model for estimation | `gpt-5` |
| `--delimiter` | `-d` | Delimiter for JSON-to-TONL conversion | auto-detect |
| `--compare` | `-c` | Compare with other formats | `json,tonl` |
| `--output` | `-o` | Output format (text|json) | `text` |

### Supported Tokenizers

- `gpt-5` - Latest GPT-5 model (default)
- `gpt-4.5` - GPT-4.5 Turbo
- `gpt-4o` - GPT-4o
- `claude-3.5` - Claude 3.5 Sonnet
- `gemini-2.0` - Google Gemini 2.0
- `llama-4` - Meta Llama 4
- `o200k` - GPT-4o base tokenizer
- `cl100k` - Legacy GPT-4 tokenizer

### Basic Usage

```bash
# Analyze JSON file
tonl stats data.json

# Analyze TONL file
tonl stats data.tonl

# Use specific tokenizer
tonl stats data.json --tokenizer gpt-4o

# JSON output for integration
tonl stats data.json --output json
```

### Advanced Usage

```bash
# Comprehensive comparison
tonl stats data.json --compare json,tonl,csv --tokenizer o200k

# Batch analysis
for file in *.json; do
  echo "=== $file ==="
  tonl stats "$file" --tokenizer cl100k
  echo
done

# Save analysis results
tonl stats data.json --output json > analysis-results.json
```

### Examples

#### Basic Statistics

**Command:**
```bash
tonl stats users.json
```

**Output:**
```
File Analysis: users.json
=========================
Original Format: JSON
File Size: 2,456 bytes

Estimated Tokens:
  JSON (cl100k): 89 tokens
  TONL (default): 54 tokens
  TONL (smart): 49 tokens

Size Comparison:
  JSON: 2,456 bytes
  TONL: 1,687 bytes
  Savings: 453 bytes (18.4%)

Token Savings:
  JSON: 89 tokens
  TONL: 49 tokens
  Savings: 40 tokens (44.9%)
```

#### JSON Output

**Command:**
```bash
tonl stats data.json --output json
```

**Output:**
```json
{
  "file": "data.json",
  "originalSize": 2456,
  "tonlSize": 1687,
  "savings": {
    "bytes": 769,
    "percentage": 31.3
  },
  "tokens": {
    "cl100k": {
      "json": 89,
      "tonl": 54,
      "tonlSmart": 49
    }
  },
  "recommendations": [
    "Use smart encoding for optimal token savings",
    "Consider pipe delimiter to reduce quoting",
    "Enable type hints for validation"
  ]
}
```

#### Comprehensive Comparison

**Command:**
```bash
tonl stats complex-data.json --compare json,tonl --tokenizer o200k
```

**Output:**
```
Comprehensive Format Analysis
=============================
File: complex-data.json
Tokenizer: o200k (GPT-4o)

Format Comparison:
┌─────────┬──────────┬──────────┬────────────┐
│ Format  │   Bytes  │ Tokens   │ % Reduction │
├─────────┼──────────┼──────────┼────────────┤
│ JSON    │   4,567  │    156   │     —      │
│ TONL    │   3,124  │    109   │   30.1%    │
│ TONL*   │   2,987  │     98   │   37.2%    │
└─────────┴──────────┴──────────┴────────────┘
*TONL with smart encoding

Recommendations:
• Use smart encoding for maximum efficiency
• Pipe delimiter recommended (reduces quoting by 23%)
• Add type hints for better validation
• Consider compression for storage
```

## Workflows and Pipelines

### Basic Data Pipeline

```bash
# Convert JSON to optimized TONL (default mode)
tonl encode input.json --smart --stats --out optimized.tonl

# Clean up problematic keys with preprocessing
tonl encode messy-input.json --preprocess --smart --stats --out clean.tonl

# Use the optimized file in your application
your-app --data optimized.tonl

# Convert back to JSON when needed
tonl decode optimized.tonl --out output.json
```

### Batch Processing Pipeline

```bash
#!/bin/bash
# process-data.sh

set -e

echo "Starting TONL batch processing..."

# Create output directory
mkdir -p tonl-output

# Process all JSON files
for json_file in data/*.json; do
  basename=$(basename "$json_file" .json)
  echo "Processing $json_file..."

  # Convert to TONL with smart encoding
  tonl encode "$json_file" \
    --smart \
    --stats \
    --out "tonl-output/${basename}.tonl"
done

echo "Batch processing complete!"
echo "Summary:"
ls -la tonl-output/
```

### Data Validation Pipeline

```bash
#!/bin/bash
# validate-data.sh

echo "Validating TONL files..."

for tonl_file in *.tonl; do
  echo "Validating $tonl_file..."

  # Try to decode with strict mode
  if tonl decode "$tonl_file" --strict --out /dev/null 2>/dev/null; then
    echo "✓ $tonl_file - Valid"
  else
    echo "✗ $tonl_file - Invalid"
    tonl decode "$tonl_file" --out "temp-${tonl_file%.tonl}.json"
  fi
done

# Clean up temporary files
rm -f temp-*.json
```

### CI/CD Integration

```yaml
# .github/workflows/tonl-validation.yml
name: TONL Validation

on: [push, pull_request]

jobs:
  validate-tonl:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'

    - name: Install TONL
      run: npm install -g tonl

    - name: Validate TONL files
      run: |
        for file in data/*.tonl; do
          tonl decode "$file" --strict
        done

    - name: Check token efficiency
      run: |
        for file in data/*.json; do
          tonl stats "$file" --output json >> stats.json
        done

        # Check if token savings meet threshold
        node scripts/check-efficiency.js stats.json
```

## Performance Tips

### Encoding Optimization

1. **Use smart encoding** for automatic optimization
2. **Choose appropriate delimiter** based on data characteristics
3. **Enable type hints** only when validation is needed
4. **Minimize indentation** for storage efficiency

### Decoding Optimization

1. **Skip strict mode** when validation isn't required
2. **Specify delimiter** explicitly for faster parsing
3. **Process files in batches** for better memory usage
4. **Use streaming** for large files (future feature)

### Token Optimization

1. **Analyze data patterns** with stats command
2. **Choose optimal delimiter** to minimize quoting
3. **Compact field names** where appropriate
4. **Consider smart encoding** for automatic optimization

## Troubleshooting

### Common Issues

#### Encoding Errors

**Problem:** Characters not displaying correctly
```bash
tonl encode data.json --out data.tonl
# Error: Invalid character encoding
```

**Solution:** Ensure UTF-8 encoding
```bash
iconv -f utf-8 -t utf-8 data.json > data-utf8.json
tonl encode data-utf8.json --out data.tonl
```

#### Decoding Errors

**Problem:** Strict mode validation fails
```bash
tonl decode data.tonl --strict
# Error: Row 3 has 4 columns, expected 3
```

**Solution:** Fix data or use non-strict mode
```bash
# Check the problematic data
tonl decode data.tonl --out temp.json
cat temp.json | jq '.users[2]'

# Or use non-strict mode
tonl decode data.tonl
```

#### Memory Issues

**Problem:** Large files cause memory errors
```bash
tonl encode large-dataset.json
# Error: JavaScript heap out of memory
```

**Solution:** Increase Node.js memory limit
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
tonl encode large-dataset.json
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
TONL_DEBUG=1 tonl encode data.json --smart
TONL_DEBUG=1 tonl decode data.tonl --strict
```

### Getting Help

```bash
# General help
tonl --help

# Command-specific help
tonl encode --help
tonl decode --help
tonl stats --help

# Version information
tonl --version
```

## Integration Examples

### Node.js Integration

```javascript
const { execSync } = require('child_process');

function convertToTONL(data, options = {}) {
  const tempJson = '/tmp/temp.json';
  const tempTonl = '/tmp/temp.tonl';

  // Write data to temporary file
  require('fs').writeFileSync(tempJson, JSON.stringify(data));

  // Build command
  const cmd = ['tonl', 'encode', tempJson];
  if (options.smart) cmd.push('--smart');
  if (options.delimiter) cmd.push('--delimiter', options.delimiter);
  if (options.stats) cmd.push('--stats');
  cmd.push('--out', tempTonl);

  // Execute command
  execSync(cmd.join(' '), { stdio: 'inherit' });

  // Read result
  const result = require('fs').readFileSync(tempTonl, 'utf8');

  // Cleanup
  require('fs').unlinkSync(tempJson);
  require('fs').unlinkSync(tempTonl);

  return result;
}
```

### Python Integration

```python
import subprocess
import json
import tempfile
import os

def json_to_tonl(data, smart=True, delimiter=None):
    """Convert Python dict/list to TONL format"""

    # Create temporary files
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as json_file:
        json.dump(data, json_file)
        json_path = json_file.name

    # Build command
    cmd = ['tonl', 'encode', json_path]
    if smart:
        cmd.append('--smart')
    if delimiter:
        cmd.extend(['--delimiter', delimiter])

    # Execute command
    result = subprocess.run(cmd, capture_output=True, text=True)

    # Cleanup
    os.unlink(json_path)

    if result.returncode != 0:
        raise Exception(f"TONL conversion failed: {result.stderr}")

    return result.stdout

# Usage
data = {"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}
tonl_output = json_to_tonl(data, smart=True)
print(tonl_output)
```

---

## Query and Get Commands (v2.0.0+)

### Query Command

Query TONL files using JSONPath expressions.

#### Syntax

```bash
tonl query <file> <expression> [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `--out <file>` | Save query result to file |
| `--pretty` | Format JSON output |

#### Examples

```bash
# Get all users
tonl query users.tonl "users"

# Filter users by age
tonl query users.tonl "users[?(@.age > 25)]"

# Get all email addresses
tonl query users.tonl "$..email"

# Complex query with multiple conditions
tonl query data.tonl "users[?(@.active && @.role == 'admin')]"

# Save result to file
tonl query users.tonl "users[?(@.department == 'Engineering')]" --out engineers.json
```

### Get Command

Get a specific value from a TONL file.

#### Syntax

```bash
tonl get <file> <path> [options]
```

#### Examples

```bash
# Get specific user
tonl get users.tonl "users[0]"

# Get nested property
tonl get config.tonl "database.connection.url"

# Get array element
tonl get data.tonl "items[2].price"
```

---

## Optimization Features (v2.0.0+)

The TONL CLI now includes advanced optimization features for additional compression savings.

### Smart Encoding with Optimization

```bash
# Enable all optimization strategies
tonl encode data.json --smart --optimize --stats

# Use specific optimization strategies
tonl encode data.json --optimize dictionary,delta,bitpack --stats

# Show detailed optimization analysis
tonl encode data.json --optimize --verbose --stats
```

### Optimization Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| `dictionary` | Compress repetitive values | Categorical data, enums |
| `delta` | Compress sequential numbers | Timestamps, IDs, counters |
| `bitpack` | Compress booleans and flags | Status fields, binary data |
| `rle` | Run-length encoding | Repeated patterns |
| `quantize` | Reduce numeric precision | Floating point data |
| `column-reorder` | Optimize field order | Tabular data |

### Example with Optimization

```bash
# Original data
tonl encode employees.json --stats
# Output: 2.1MB, 145,230 tokens

# With optimization
tonl encode employees.json --smart --optimize --stats
# Output: 1.4MB, 87,450 tokens (33% additional savings)

# Optimization analysis
tonl encode employees.json --optimize --verbose
# Output:
# Applying optimizations:
# ✓ Dictionary encoding for 'department' (saves 23.4KB)
# ✓ Delta encoding for 'employee_id' (saves 15.2KB)
# ✓ Bit packing for 'active' flag (saves 8.7KB)
# ✓ Column reordering (saves 12.1KB)
#
# Total optimization savings: 59.4KB (2.8% additional)
```

The TONL CLI provides a comprehensive toolkit for working with TONL data, from simple conversions to complex data analysis and optimization workflows.