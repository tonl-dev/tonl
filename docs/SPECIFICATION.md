# TONL Format Specification v1.0

This document provides the complete technical specification for the Token-Optimized Notation Language (TONL) format.

## Table of Contents

1. [Overview](#overview)
2. [Format Structure](#format-structure)
3. [Lexical Elements](#lexical-elements)
4. [Data Types](#data-types)
5. [Object Encoding](#object-encoding)
6. [Array Encoding](#array-encoding)
7. [String Handling](#string-handling)
8. [Type System](#type-system)
9. [Parsing Rules](#parsing-rules)
10. [Error Handling](#error-handling)
11. [Examples](#examples)

## Overview

TONL is a text-based serialization format designed for:
- **Token efficiency** in LLM contexts
- **Human readability** and maintainability
- **Schema support** with optional type hints
- **Recursive structure** support for nested data
- **Bidirectional compatibility** with JSON

### Design Principles

1. **Explicit over implicit** - Clear syntax rules with minimal ambiguity
2. **Compact but readable** - Reduce redundancy without sacrificing clarity
3. **LLM-friendly** - Optimize for token count in language models
4. **Extensible** - Support future format evolution and features

## Format Structure

### Document Structure

A TONL document consists of:
1. **Optional header section** with metadata
2. **Data section** with one or more blocks

```
[Headers]
[Block 1]
[Block 2]
...
[Block N]
```

### Header Lines

Headers provide metadata and configuration options.

#### Version Header

```
#version <major.minor>
```

- **Required**: No (defaults to 1.0)
- **Format**: `#version` followed by semantic version
- **Example**: `#version 1.0`

#### Delimiter Header

```
#delimiter <delimiter>
```

- **Required**: No (defaults to comma)
- **Supported delimiters**: `,` `|` `\t` `;`
- **Example**: `#delimiter "|"`

### Headers Examples

```
#version 1.0
#delimiter "|"

data[3]{id:u32,name:str}:
  1|Alice
  2|Bob
  3|Carol
```

## Lexical Elements

### Whitespace

- **Spaces**: Significant within values, ignored around structural elements
- **Tabs**: Treated as regular whitespace (except when used as delimiter)
- **Newlines**: Separate records and blocks
- **Indentation**: 2 spaces recommended (configurable)

### Comments

TONL does not support inline comments. Headers use `#` prefix but are directives, not comments.

### Identifiers

Identifiers are used for object keys and field names:

- **Characters**: Letters, numbers, underscore (`_`)
- **First character**: Must be a letter or underscore
- **Case sensitivity**: Case-sensitive
- **Reserved words**: None (but avoid structural characters)

```
valid_name
isValid123
_private_field
```

### Quoted Identifiers

Identifiers containing special characters must be quoted:

```
"field-with-dash"{type:str}:
  "field-with-dash": value
```

## Data Types

### Primitive Types

| Type | Description | JSON Equivalent | TONL Syntax |
|------|-------------|----------------|-------------|
| `null` | Null value | `null` | `null` |
| `bool` | Boolean | `true`/`false` | `true`/`false` |
| `u32` | Unsigned 32-bit integer | `>= 0` | `123` |
| `i32` | Signed 32-bit integer | integer | `-456` |
| `f64` | 64-bit float | number | `3.14159` |
| `str` | String | string | `"hello"` |

### Complex Types

| Type | Description | Example |
|------|-------------|---------|
| `obj` | Object/dictionary | Nested block with fields |
| `list` | Array/list | Tabular block or inline list |

## Object Encoding

### Basic Object Format

Objects use block notation with type hints in the header:

```
key{field1[:type],field2[:type],...}:
  field1: <value>
  field2: <value>
```

#### Components

- **`key`**: Object identifier
- **`{...}`**: Field specification with optional type hints
- **`:`**: Block terminator
- **Indentation**: Field lines indented under header

### Object Examples

#### Simple Object

**JSON:**
```json
{
  "id": 1,
  "name": "Alice",
  "active": true
}
```

**TONL:**
```
user{id:u32,name:str,active:bool}:
  id: 1
  name: Alice
  active: true
```

#### Nested Object

**JSON:**
```json
{
  "user": {
    "id": 1,
    "contact": {
      "email": "alice@example.com",
      "phone": "+123456789"
    }
  }
}
```

**TONL:**
```
user{id:u32,contact:obj}:
  id: 1
  contact{email:str,phone:str}:
    email: alice@example.com
    phone: +123456789
```

## Array Encoding

### Arrays of Objects (Tabular Format)

Arrays of uniform objects use tabular notation:

```
key[N]{field1[:type],field2[:type],...}:
  <row1-field1><delim> <row1-field2><delim> ...
  <row2-field1><delim> <row2-field2><delim> ...
```

#### Tabular Array Examples

**JSON:**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob, Jr.", "role": "user" }
  ]
}
```

**TONL:**
```
users[2]{id:u32,name:str,role:str}:
  1, Alice, admin
  2, "Bob, Jr.", user
```

### Arrays of Primitives

#### Single-Line Format

```
key[N]: <value1><delim> <value2><delim> <value3>
```

#### Multi-Line Format (for clarity)

```
key[N]:
  <value1>
  <value2>
  <value3>
```

#### Primitive Array Examples

**JSON:**
```json
{
  "tags": ["alpha", "beta", "gamma"],
  "scores": [95, 87, 92]
}
```

**TONL:**
```
tags[3]: alpha, beta, gamma
scores[3]: 95, 87, 92
```

## String Handling

### Quoting Rules

Values MUST be quoted if they contain:
- The delimiter character
- Colon (`:`)
- Braces (`{` `}`)
- Hash (`#`)
- Newline characters
- Leading or trailing whitespace
- Double quote (`"`)

### Quote Escaping

Inside quoted strings:
- **Double quotes**: Escaped by doubling (`""` → `"`)
- **Backslashes**: Escaped by doubling (`\\` → `\`)

### Quoting Examples

```
# Values requiring quotes
name: "Bob, Jr."
path: "C:\\Users\\Name\\Documents"
quote: "He said: ""Hello, world!"""
empty: ""
complex: "Value with {brackets} and #hash"
```

### Multiline Strings

Triple quotes (`"""`) are used for multiline content:

```
description: """Line 1
Line 2
Line 3"""
```

#### Multiline String Rules

- **Opening**: `"""` followed by newline
- **Content**: Verbatim until closing
- **Closing**: `"""` on its own line
- **Escaping**: No escape processing inside triple quotes

## Type System

### Type Hints

Type hints are optional and appear in object headers:

```
field:type
```

#### Supported Types

| Type Hint | Description | Example |
|-----------|-------------|---------|
| `str` | String | `name:str` |
| `u32` | Unsigned integer | `id:u32` |
| `i32` | Signed integer | `count:i32` |
| `f64` | Float | `price:f64` |
| `bool` | Boolean | `active:bool` |
| `null` | Null | `metadata:null` |
| `obj` | Object | `contact:obj` |
| `list` | Array | `tags:list` |

### Type Inference

When type hints are omitted, the decoder infers types:

- **Unquoted numbers**: Parsed as numbers
- **Quoted numbers**: Parsed as strings
- **Keywords**: `true`, `false`, `null` parsed as booleans/null
- **Others**: Parsed as strings

### Type Coercion

In strict mode, values are coerced to match type hints:

```
age:u32:   "25"     → 25
price:f64: "19.99"  → 19.99
flag:bool: "true"   → true
```

## Parsing Rules

### Block Detection

Blocks are identified by:
1. **Header lines** ending with `:` and containing `{...}` or `[...]`
2. **Indentation** determining block hierarchy
3. **Nested structure** following the header

### Parsing Algorithm

1. **Read headers**: Process `#version` and `#delimiter`
2. **Parse blocks**: Identify block boundaries
3. **Process content**: Parse fields based on block type
4. **Apply type hints**: Coerce values if specified
5. **Validate**: Check consistency in strict mode

### State Machine

The parser uses a state machine with these modes:
- **HEADER**: Processing metadata lines
- **BLOCK_HEADER**: Identifying block type and fields
- **BLOCK_CONTENT**: Parsing block content
- **VALUE_PARSING**: Extracting individual values
- **MULTILINE**: Processing triple-quoted strings

## Error Handling

### Strict Mode

When `strict: true`, the decoder enforces:

1. **Array count validation**: `[N]` must match actual count
2. **Field count validation**: Rows must match header columns
3. **Type validation**: Values must be coercible to specified types
4. **Syntax validation**: Strict adherence to format rules

### Non-Strict Mode

When `strict: false` (default), the decoder:

1. **Ignores count mismatches**: `[N]` treated as advisory
2. **Handles missing fields**: Missing columns become `undefined`
3. **Tolerates extra fields**: Extra columns are included
4. **Best effort parsing**: Attempts to recover from errors

### Error Types

| Error | Cause | Resolution |
|-------|-------|------------|
| `ParseError` | Invalid syntax | Fix format according to spec |
| `ValidationError` | Strict mode violation | Ensure data consistency |
| `TypeError` | Invalid type coercion | Provide compatible values |
| `RangeError` | Out-of-bounds values | Adjust value ranges |

## Examples

### Complete Document Example

```
#version 1.0
#delimiter ","

company{id:u32,name:str,employees:obj}:
  id: 101
  name: "Tech Corp"
  employees{users:list,departments:list}:
    users[3]{id:u32,name:str,role:str}:
      1, Alice, admin
      2, Bob, developer
      3, Carol, designer
    departments[2]{name:str,head:str}:
      engineering, "Bob, Jr."
      design, Carol

metadata{created:str,version:str}:
  created: "2024-01-15T10:30:00Z"
  version: 1.0
```

### Complex Nested Example

**JSON Input:**
```json
{
  "project": {
    "id": 101,
    "name": "Alpha",
    "owner": { "id": 1, "name": "Alice" },
    "tasks": [{
      "id": 201,
      "title": "Design API",
      "assignee": { "id": 2, "name": "Bob" },
      "status": "done",
      "comments": [
        { "id": 301, "author": "Alice", "message": "Looks good!" },
        { "id": 302, "author": "Eve", "message": "Add more tests." }
      ]
    }]
  }
}
```

**TONL Output:**
```
project{id:u32,name:str,owner:obj,tasks:list}:
  id: 101
  name: Alpha
  owner{id:u32,name:str}:
    id: 1
    name: Alice
  tasks[1]{id:u32,title:str,assignee:obj,status:str,comments:list}:
    id: 201
    title: "Design API"
    assignee{id:u32,name:str}:
      id: 2
      name: Bob
    status: done
    comments[2]{id:u32,author:str,message:str}:
      301, Alice, "Looks good!"
      302, Eve, "Add more tests."
```

## Implementation Notes

### Performance Considerations

1. **Linear parsing**: Single-pass algorithm with O(n) complexity
2. **Memory efficiency**: Use arrays and joins, avoid string concatenation
3. **Lazy evaluation**: Process data incrementally for large files
4. **Caching**: Cache delimiter detection and type inference

### Extensibility

The format is designed for future extensions:
1. **Additional types**: Can add new primitive types
2. **Binary format**: Text format can map to binary representation
3. **Schema validation**: External schema files can enhance type hints
4. **Streaming**: Block-based design supports streaming parsing

### Compatibility

- **JSON compatibility**: Perfect round-trip conversion possible
- **Version support**: Backward compatible evolution
- **Platform support**: Works in any environment with text processing