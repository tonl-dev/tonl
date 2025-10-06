# TONL CLI Documentation

The TONL Command Line Interface provides powerful tools for converting, analyzing, and optimizing TONL data.

## Installation

```bash
# Local development
npm link

# Global installation
npm install -g tonl
```

## Overview

The CLI provides three main commands:

- `tonl encode` - Convert JSON to TONL
- `tonl decode` - Convert TONL to JSON
- `tonl stats` - Analyze and compare data formats

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

### Supported Delimiters

- `,` - Comma (default)
- `|` - Pipe
- `\t` - Tab
- `;` - Semicolon

### Basic Usage

```bash
# Basic encoding
tonl encode data.json

# Output to file
tonl encode data.json --out data.tonl

# Use smart encoding with statistics
tonl encode data.json --smart --stats
```

### Advanced Usage

```bash
# Custom delimiter with type hints
tonl encode users.json --delimiter "|" --include-types

# Compact encoding for large datasets
tonl encode large-dataset.json --indent 0 --smart

# Batch processing
for file in *.json; do
  tonl encode "$file" --out "${file%.json}.tonl" --smart --stats
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
# Convert JSON to optimized TONL
tonl encode input.json --smart --stats --out optimized.tonl

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

The TONL CLI provides a comprehensive toolkit for working with TONL data, from simple conversions to complex data analysis and optimization workflows.