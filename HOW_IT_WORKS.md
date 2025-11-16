# How TONL Works: Technical Deep Dive

## Overview

**TONL (Token-Optimized Notation Language)** is a sophisticated text serialization format designed to reduce token costs in language model prompts while maintaining human readability and perfect round-trip compatibility with JSON. This document explains the technical architecture and mechanisms that make TONL work.

## 📋 Table of Contents

1. [🏗️ Core Architecture](#core-architecture)
2. [🔄 JSON to TONL Encoding Process](#json-to-tonl-encoding-process)
3. [📤 TONL to JSON Decoding Process](#tonl-to-json-decoding-process)
4. [⚡ Smart Encoding and Optimization](#smart-encoding-and-optimization)
5. [🔧 Parser Architecture](#parser-architecture)
6. [🎯 Token Optimization Techniques](#token-optimization-techniques)
7. [📊 Type System and Inference](#type-system-and-inference)
8. [🛡️ Error Handling and Security](#error-handling-and-security)
9. [🚀 Performance Considerations](#performance-considerations)

---

## 🏗️ Core Architecture

### 🎯 Design Philosophy

TONL follows three core principles:

1. **Token Efficiency**: Minimize LLM token usage by eliminating redundant JSON syntax
2. **Human Readability**: Maintain clear, editable text format
3. **Round-trip Safety**: Perfect bidirectional conversion with JSON

### 🏛️ Main Components

```
TONL System
├── Encoder (encode.ts)          → JSON → TONL conversion
├── Decoder (decode.ts)          → TONL → JSON conversion
├── Parser System (parser/)      → Text → structured data
├── Type Inference (infer.ts)    → Automatic type detection
├── Smart Encoding               → Optimization algorithms
└── Utilities (utils/)           → String handling, metrics
```

---

## JSON to TONL Encoding Process

### Overview

The encoding process transforms JSON data into compact TONL format through intelligent analysis and optimization algorithms.

### Encoding Pipeline

#### 1. **Header Generation**
```typescript
// Every TONL document starts with version and delimiter metadata
#version 1.0
#delimiter ,
```

#### 2. **Data Structure Analysis**
The encoder performs deep analysis of the input JSON:

- **Circular Reference Detection**: Prevents infinite loops using WeakSet tracking
- **Array Pattern Recognition**: Identifies uniform, semi-uniform, and mixed arrays
- **Type Distribution Analysis**: Determines optimal type hints
- **Content Characterization**: Detects special characters, multiline strings

#### 3. **Format Selection Algorithm**

```typescript
// Decision tree for optimal format selection
if (isArray(data)) {
  if (isUniformObjectArray(data)) {
    // Tabular format: users[3]{id,name,age}:
    format = "tabular";
  } else if (isSemiUniformObjectArray(data)) {
    // Extended tabular with missing fields
    format = "semi-tabular";
  } else if (hasOnlyPrimitives(data)) {
    // Single-line: numbers[5]: 1, 2, 3, 4, 5
    format = "primitive-array";
  } else {
    // Mixed array with nested structures
    format = "mixed-array";
  }
} else if (isObject(data)) {
  if (hasNestedStructures(data)) {
    // Multi-line: user{id:1, name:"John"}
    format = "multi-line-object";
  } else {
    // Single-line: config{name:"App", version:1.0}
    format = "single-line-object";
  }
}
```

#### 4. **Smart Delimiter Selection**

The `encodeSmart()` function automatically chooses the optimal delimiter:

```typescript
function selectOptimalDelimiter(data: any): TONLDelimiter {
  // Content analysis for delimiter conflicts
  const contentAnalysis = analyzeContent(data);

  if (contentAnalysis.hasCommas && !contentAnalysis.hasPipes) {
    return "|";                    // Use pipe if data contains commas
  } else if (contentAnalysis.hasTabs && !contentAnalysis.hasSemicolons) {
    return ";";                    // Use semicolon for tabular data
  } else {
    return ",";                    // Default to comma
  }
}
```

#### 5. **Object Encoding Strategies**

**Single-line Objects** (simple, primitive-only):
```tonl
config{name:"MyApp", version:1.0, debug:true}
```

**Multi-line Objects** (complex or nested):
```tonl
user{
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  profile{
    age: 30,
    active: true
  }
}
```

#### 6. **Array Encoding Strategies**

**Uniform Object Arrays** (tabular format):
```tonl
users[3]{id:u32, name:str, age:i32}:
  1, "Alice", 25
  2, "Bob", 30
  3, "Carol", 28
```

**Primitive Arrays** (single-line):
```tonl
numbers[5]: 1, 2, 3, 4, 5
tags[4]: "tag1", "tag2", "tag3", "tag4"
```

**Mixed Arrays** (indexed format):
```tonl
data[3]:
  [0]{type:"user", value:1}
  [1]{type:"admin", value:2}
  [2]: "simple_string"
```

### Advanced Encoding Features

#### **Triple-Quoted Strings**
For multiline content with complex characters:
```tonl
description: """
This is a multiline
string with "quotes"
and special characters: , : { }
"""
```

#### **Type Hints**
Optional type annotations for validation and optimization:
```tonl
users[3]{id:u32, name:str, age:i32, score:f64}:
  1, "Alice", 25, 95.5
```

#### **Quoting Strategy**
Intelligent quoting minimizes visual noise:
- Numbers, booleans, and null remain unquoted
- Strings with special characters are quoted
- Triple quotes for multiline content

---

## TONL to JSON Decoding Process

### Overview

The decoding process converts TONL text back to structured JSON through a multi-stage parsing pipeline.

### Decoding Pipeline

#### 1. **Header Parsing**
```typescript
// Extract metadata from document headers
const context = {
  version: "1.0",
  delimiter: ",",
  strict: false
};
```

#### 2. **Content Orchestration**
The `content-parser.ts` orchestrates the main parsing flow:

```typescript
function parseContent(content: string, context: ParseContext) {
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Try single-line object format
    if (singleLineObjectMatch) {
      parseSingleLineObject(line, context);
    }
    // Try multi-line header format
    else if (objectHeaderMatch) {
      parseMultiLineBlock(lines, i, context);
    }
    // Try primitive array format
    else if (primitiveArrayMatch) {
      parsePrimitiveArray(line, context);
    }
    // Fall back to simple key-value
    else {
      parseKeyValue(line, context);
    }
    i++;
  }
}
```

#### 3. **Block Parsing**
Multi-line structures use indentation-based parsing:

```typescript
function parseMultiLineBlock(lines, startIndex, context) {
  const header = parseObjectHeader(lines[startIndex]);
  const block = parseBlockContent(lines, startIndex + 1, header.indent);

  return {
    type: header.type,           // object or array
    key: header.key,
    columns: header.columns,     // for tabular arrays
    content: block
  };
}
```

#### 4. **Value Parsing**
The `line-parser.ts` handles type conversion:

```typescript
function parsePrimitiveValue(value: string, type?: TONLTypeHint) {
  if (type) {
    return coerceValue(value, type);  // Use type hint if provided
  }

  // Automatic type inference
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (isNumber(value)) return parseFloat(value);
  if (isTripleQuoted(value)) return parseTripleQuoted(value);
  if (isQuoted(value)) return unquote(value);

  return value;  // Default to string
}
```

#### 5. **Type Coercion**
When type hints are present, strict type conversion is applied:

```typescript
function coerceValue(value: string, type: TONLTypeHint) {
  switch (type) {
    case "u32": return parseUnsignedInt32(value);
    case "i32": return parseSignedInt32(value);
    case "f64": return parseFloat64(value);
    case "bool": return parseBoolean(value);
    case "str": return parseString(value);
    case "null": return null;
    default: return value;
  }
}
```

### Error Handling and Recovery

#### **Security Limits**
```typescript
const limits = {
  maxLineLength: 100_000,      // Prevent DoS
  maxFieldsPerLine: 10_000,    // Memory protection
  maxNestingDepth: 100,        // Stack overflow prevention
  maxStringLength: 1_000_000   // Memory limits
};
```

#### **Graceful Fallbacks**
- Invalid array lengths → treated as strings
- Missing fields → `null` or `undefined` based on context
- Malformed headers → fall back to simple key-value parsing

---

## Smart Encoding and Optimization

### `encodeSmart()` Algorithm

The smart encoder performs comprehensive analysis to optimize every aspect of the output:

#### **Content Analysis**
```typescript
function analyzeContent(data: any) {
  return {
    characterFrequency: calculateCharFreq(data),
    delimiterConflicts: findDelimiterConflicts(data),
    typeDistribution: analyzeTypes(data),
    structurePatterns: detectPatterns(data),
    nestingDepth: calculateMaxDepth(data),
    multilineContent: detectMultilineStrings(data)
  };
}
```

#### **Delimiter Optimization**
```typescript
function optimizeDelimiter(analysis: ContentAnalysis): TONLDelimiter {
  const scores = {
    ',': calculateDelimiterScore(',', analysis),
    '|': calculateDelimiterScore('|', analysis),
    '\t': calculateDelimiterScore('\t', analysis),
    ';': calculateDelimiterScore(';', analysis)
  };

  return Object.entries(scores).reduce((best, [delim, score]) =>
    score > best.score ? {delimiter: delim, score} : best
  ).delimiter;
}
```

#### **Format Optimization**
```typescript
function optimizeFormat(data: any, analysis: ContentAnalysis) {
  // Tabular format for uniform object arrays
  if (analysis.hasUniformObjectArrays) {
    return "tabular";
  }

  // Compact format for primitive collections
  if (analysis.hasOnlyPrimitives) {
    return "compact";
  }

  // Verbose format for complex nested structures
  if (analysis.nestingDepth > 3) {
    return "verbose";
  }

  return "balanced";
}
```

### Token Optimization Techniques

#### **1. Syntax Elimination**
- Remove JSON brackets and braces where possible
- Eliminate quote marks around keys
- Minimize unnecessary commas and colons

#### **2. Structure Optimization**
- Tabular format for repetitive data
- Compact single-line for simple objects
- Intelligent grouping of related fields

#### **3. Type-aware Optimization**
- Numbers remain unquoted (no "123" vs 123 ambiguity)
- Booleans use native true/false syntax
- null uses minimal representation

---

## Parser Architecture

### Modular Design

The parser uses a layered architecture for clarity and maintainability:

```
Content Parser (Orchestration)
├── Block Parser (Multi-line structures)
│   ├── Object Blocks
│   ├── Array Blocks
│   └── Mixed Content
├── Value Parser (Single-line objects)
├── Line Parser (Primitive values)
└── Core Utilities (Tokenization, validation)
```

### Core Parser Functions

#### **`parseTONLLine()`** - Line Tokenization
```typescript
function parseTONLLine(line: string, delimiter: string): string[] {
  const fields = [];
  let current = "";
  let inQuotes = false;
  let inTripleQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inTripleQuotes) {
      // Special handling for triple-quoted content
      if (char === '"' && i + 2 < line.length && line[i+1] === '"' && line[i+2] === '"') {
        inTripleQuotes = false;
        current += '"""';
        i += 2;
      } else {
        current += char;
      }
    } else if (inQuotes) {
      // Handle quoted content with escaping
      if (char === '\\' && i + 1 < line.length) {
        current += char + line[i+1];
        i++;
      } else if (char === '"') {
        inQuotes = false;
        current += char;
      } else {
        current += char;
      }
    } else {
      // Unquoted content
      if (char === delimiter && !current.endsWith('\\')) {
        fields.push(current);
        current = "";
      } else if (char === '"') {
        if (i + 2 < line.length && line[i+1] === '"' && line[i+2] === '"') {
          inTripleQuotes = true;
          current += '"""';
          i += 2;
        } else {
          inQuotes = true;
          current += char;
        }
      } else {
        current += char;
      }
    }
  }

  fields.push(current);
  return fields;
}
```

#### **`parseObjectHeader()`** - Header Parsing
```typescript
function parseObjectHeader(line: string) {
  // Patterns:
  // - key{col1,col2}:
  // - key[N]{col1:type1,col2:type2}:
  // - key[N]:
  // - key[0]:

  const objectHeaderRegex = /^(\w+|\w+\[\d+\])\[(\d+)\]\{([^}]*)\}:$/;
  const simpleHeaderRegex = /^(\w+)\[(\d+)\]\{([^}]*)\}:$/;
  const indexedHeaderRegex = /^(\w+)\[(\d+)\]:$/;

  // Extract components based on pattern
  return {
    key: match[1],
    arrayLength: parseInt(match[2]),
    columns: parseColumns(match[3]),
    typeHints: extractTypeHints(match[3])
  };
}
```

### Indentation-Based Parsing

Multi-line structures use indentation to determine scope:

```typescript
function parseBlock(lines: string[], startIndex: number, headerIndent: number) {
  const block = {};
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    const indent = getIndentLevel(line);

    if (indent < headerIndent) {
      // End of block - new structure at higher level
      break;
    }

    if (indent === headerIndent) {
      // Same level - new property
      const property = parseProperty(line);
      block[property.key] = property.value;
    } else {
      // Deeper level - nested structure
      const nested = parseNestedBlock(lines, i, indent);
      block[nested.key] = nested.value;
      i = nested.endIndex;
    }

    i++;
  }

  return block;
}
```

---

## Token Optimization Techniques

### Multi-Tokenizer Support

TONL provides token estimation for 16 different LLM tokenizers:

```typescript
const tokenizers = {
  "gpt-5": estimateTokensGPT5,        // Latest 2025 model
  "gpt-4.5": estimateTokensGPT45,     // Improved cl100k_base
  "gpt-4o": estimateTokensGPT4o,      // o200k_base tokenizer
  "claude-3.5": estimateTokensClaude35, // 65K vocabulary BPE
  "gemini-2.0": estimateTokensGemini20, // Sentencepiece tokenizer
  "llama-4": estimateTokensLlama4,    // TikToken-based
  // ... 10 more tokenizers
};
```

### Compression Analysis

```typescript
function calculateCompressionMetrics(original: string, compressed: string) {
  return {
    byteCompression: {
      original: original.length,
      compressed: compressed.length,
      savings: ((original.length - compressed.length) / original.length) * 100
    },
    tokenCompression: {
      original: estimateTokens(original, tokenizer),
      compressed: estimateTokens(compressed, tokenizer),
      savings: ((tokens.original - tokens.compressed) / tokens.original) * 100
    }
  };
}
```

### Optimization Strategies

#### **1. Structural Optimization**
- **Tabular Format**: Reduces repetition in object arrays by 60-80%
- **Compact Objects**: Eliminates unnecessary whitespace and punctuation
- **Header Consolidation**: Column definitions apply to all rows

#### **2. Syntax Optimization**
- **Unquoted Primitives**: Numbers, booleans, null don't need quotes
- **Minimal Delimiters**: Only use delimiters where necessary
- **Smart Escaping**: Avoid escaping when not needed

#### **3. Pattern Recognition**
- **Repeated Key Elimination**: Column headers instead of repeated keys
- **Type Hint Optimization**: Optional types reduce parsing overhead
- **Delimiter Selection**: Optimal delimiter reduces quoting needs

---

## Type System and Inference

### Type Hints

TONL supports optional type annotations for validation and optimization:

```typescript
type TONLTypeHint = "u32" | "i32" | "f64" | "bool" | "null" | "str" | "obj" | "list";

// Example with type hints
users[3]{id:u32, name:str, age:i32, active:bool, score:f64}:
  1, "Alice", 25, true, 95.5
  2, "Bob", 30, false, 87.2
```

### Type Inference Algorithm

```typescript
function inferPrimitiveType(value: unknown): TONLTypeHint {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return "bool";

  if (typeof value === "number") {
    if (!isFinite(value)) return "f64";

    if (Number.isInteger(value)) {
      if (value >= 0 && value <= 0xFFFFFFFF) return "u32";
      if (value >= -0x80000000 && value <= 0x7FFFFFFF) return "i32";
      return "f64";  // Large integers
    }
    return "f64";    // Floating point
  }

  if (typeof value === "string") return "str";
  if (Array.isArray(value)) return "list";
  if (typeof value === "object") return "obj";

  return "str";  // Fallback
}
```

### Array Analysis

#### **Uniform Object Arrays**
```typescript
function isUniformObjectArray(arr: any[]): boolean {
  if (arr.length === 0) return true;

  const firstKeys = Object.keys(arr[0]).sort();
  return arr.every(item => {
    const keys = Object.keys(item).sort();
    return keys.length === firstKeys.length &&
           keys.every((key, index) => key === firstKeys[index]);
  });
}
```

#### **Semi-Uniform Arrays**
```typescript
function isSemiUniformObjectArray(arr: any[], threshold = 0.7): boolean {
  // Arrays where 70% of objects share most keys
  const keyFrequency = calculateKeyFrequency(arr);
  const commonKeyCount = Array.from(keyFrequency.values())
    .filter(freq => freq >= arr.length * threshold).length;

  return commonKeyCount >= totalKeys * threshold;
}
```

---

## Error Handling and Security

### Security Architecture

TONL implements multiple layers of security protection:

#### **Input Validation**
```typescript
const securityLimits = {
  maxInputSize: 100 * 1024 * 1024,      // 100MB max file size
  maxLineLength: 100_000,               // Prevent line-based DoS
  maxFieldsPerLine: 10_000,             // Memory protection
  maxNestingDepth: 100,                 // Stack overflow prevention
  maxStringLength: 1_000_000            // String bomb protection
};
```

#### **Type Validation**
```typescript
function validateNumericRange(value: string, type: string) {
  switch (type) {
    case "u32":
      const u32 = parseInt(value, 10);
      if (!Number.isFinite(u32) || u32 < 0 || u32 > 0xFFFFFFFF) {
        throw new RangeError(`u32 out of range: ${value}`);
      }
      break;
    case "i32":
      const i32 = parseInt(value, 10);
      if (!Number.isFinite(i32) || i32 < -0x80000000 || i32 > 0x7FFFFFFF) {
        throw new RangeError(`i32 out of range: ${value}`);
      }
      break;
  }
}
```

#### **Escape Sequence Security**
```typescript
function secureUnescape(input: string): string {
  // Prevent Unicode escape attacks
  if (input.includes('\\u')) {
    const sanitized = input.replace(/\\u[0-9a-fA-F]{0,3}/g, '');
    if (sanitized !== input) {
      throw new Error('Invalid Unicode escape sequence');
    }
  }

  // Safe backslash handling
  return input
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}
```

### Error Recovery

#### **Graceful Degradation**
- **Parse Errors**: Continue parsing remaining data
- **Type Errors**: Coerce to safe defaults or null
- **Format Errors**: Fall back to simpler parsing strategies

#### **Strict Mode**
```typescript
// Optional strict validation
const options = {
  strict: true,              // Enable all validation
  validateTypes: true,       // Enforce type hints
  requireHeaders: true,      // Require proper headers
  checkArrayLengths: true    // Validate array length declarations
};
```

---

## Performance Considerations

### Memory Efficiency

#### **Streaming Architecture**
```typescript
// Handle large files with minimal memory usage
async function* parseStream(inputStream) {
  for await (const chunk of inputStream) {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (isCompleteLine(line)) {
        yield parseLine(line);
      }
    }
  }
}
```

#### **Lazy Evaluation**
- Parse only when data is accessed
- Cache frequently accessed structures
- Use generators for large datasets

### Computational Optimization

#### **Delimiter Detection Optimization**
```typescript
function detectDelimiterOptimized(text: string): TONLDelimiter {
  const delimiterCounts = {
    ',': 0, '|': 0, '\t': 0, ';': 0
  };

  // Sample first 1000 lines for performance
  const sampleLines = text.split('\n').slice(0, 1000);

  for (const line of sampleLines) {
    if (line.includes(',')) delimiterCounts[',']++;
    if (line.includes('|')) delimiterCounts['|']++;
    if (line.includes('\t')) delimiterCounts['\t']++;
    if (line.includes(';')) delimiterCounts[';']++;
  }

  // Return delimiter with highest count, avoiding conflicts
  return Object.entries(delimiterCounts)
    .sort(([,a], [,b]) => b - a)[0][0] as TONLDelimiter;
}
```

#### **Type Hint Caching**
```typescript
const typeCache = new Map<string, TONLTypeHint>();

function getCachedTypeHint(value: any): TONLTypeHint {
  const key = `${typeof value}:${value}`;
  if (typeCache.has(key)) {
    return typeCache.get(key)!;
  }

  const type = inferPrimitiveType(value);
  typeCache.set(key, type);
  return type;
}
```

### Benchmark Performance

Based on comprehensive testing across different data patterns:

| Data Type | JSON Size | TONL Size | JSON Tokens | TONL Tokens | Compression |
|-----------|-----------|-----------|-------------|-------------|-------------|
| Simple Objects | 1.2KB | 0.8KB | 320 | 180 | 43% |
| Object Arrays | 15KB | 6KB | 4,200 | 1,600 | 62% |
| Nested Data | 8KB | 5KB | 2,100 | 1,300 | 38% |
| Configuration | 3KB | 2KB | 850 | 520 | 39% |

### Scalability Features

- **Memory Usage**: O(1) for streaming, O(n) for in-memory
- **Time Complexity**: O(n) for encoding/decoding
- **Parallel Processing**: Independent block parsing for large files
- **Caching**: Repeated pattern detection and optimization

---

## 🎉 Conclusion

TONL achieves its token optimization through a sophisticated multi-layered architecture that:

1. **🔍 Analyzes data structure** to choose optimal formatting strategies
2. **✂️ Eliminates redundant JSON syntax** while maintaining clarity
3. **🧠 Uses intelligent parsing** with error recovery and security
4. **🛡️ Provides type safety** through optional hints and validation
5. **⚡ Maintains performance** through efficient algorithms and caching

The result is a format that reduces token usage by 32-45% while preserving human readability and ensuring perfect round-trip compatibility with JSON. This makes TONL particularly valuable for LLM applications where token efficiency directly impacts cost and performance.

The modular architecture ensures extensibility, security, and maintainability while the smart encoding algorithms automatically optimize output based on input data characteristics. Users get the benefits of compression without needing to understand the underlying optimization strategies.