# TONL Implementation Reference Guide

**Version:** 1.0.1
**Target Audience:** Language implementers (Python, Go, Rust, Java, C#, etc.)
**Purpose:** Complete specification for implementing TONL encoder/decoder in any language
**Last Updated:** 2025-11-04

---

## Table of Contents

1. [Format Overview](#format-overview)
2. [JSON to TONL Transformation](#json-to-tonl-transformation)
3. [TONL to JSON Parsing](#tonl-to-json-parsing)
4. [Type System](#type-system)
5. [Notation Rules](#notation-rules)
6. [String Handling and Quoting](#string-handling-and-quoting)
7. [Delimiter System](#delimiter-system)
8. [Algorithm Pseudo-code](#algorithm-pseudo-code)
9. [Edge Cases](#edge-cases)
10. [Test Suite Requirements](#test-suite-requirements)
11. [Implementation Checklist](#implementation-checklist)

---

## Format Overview

### What is TONL?

TONL (Token-Optimized Notation Language) is a text-based serialization format designed for:
- **Token efficiency** in LLM contexts (32-45% smaller than JSON)
- **Human readability** and maintainability
- **Bidirectional compatibility** with JSON (perfect round-trip)
- **Schema support** with optional type hints

### Core Design Principles

1. **Tabular for uniform arrays** - Reduces redundancy
2. **Nested blocks for objects** - Clear hierarchy
3. **Smart delimiter selection** - Minimizes quoting
4. **Optional type hints** - Enable validation
5. **Minimal syntax overhead** - Maximum compactness

---

## JSON to TONL Transformation

### Algorithm Overview

```
1. Start with root value
2. Determine value type (primitive, object, array)
3. Apply appropriate encoding strategy:
   - Primitive → key-value pair
   - Object → block with fields
   - Array → tabular or nested format
4. Recursively encode nested structures
5. Apply quoting rules
6. Generate headers
```

### Transformation Rules

#### Rule 1: Simple Object Encoding

**JSON:**
```json
{
  "name": "Alice",
  "age": 30,
  "active": true
}
```

**TONL:**
```
#version 1.0
root{name,age,active}:
  name: Alice
  age: 30
  active: true
```

**Algorithm:**
```
function encodeObject(obj, key):
  columns = sorted_keys(obj, excluding undefined)
  header = key + "{" + join(columns, ",") + "}:"

  if has_nested_objects_or_arrays(obj):
    output header
    for each column in columns:
      value = obj[column]
      output "  " + encodeValue(value, column)
  else:
    // Single line for simple objects
    output header + " " + join(values, " ")
```

---

#### Rule 2: Uniform Object Array (Tabular Format)

**JSON:**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" }
  ]
}
```

**TONL:**
```
#version 1.0
users[2]{id,name,role}:
  1, Alice, admin
  2, Bob, user
```

**Algorithm:**
```
function encodeUniformArray(arr, key):
  if not all_objects_with_same_keys(arr):
    return encodeMixedArray(arr, key)

  columns = sorted_keys(arr[0])
  header = key + "[" + arr.length + "]{" + join(columns, ",") + "}:"

  output header
  for each item in arr:
    row_values = []
    for each column in columns:
      value = item[column]
      row_values.push(formatValue(value))
    output "  " + join(row_values, " " + delimiter + " ")
```

**Key Points:**
- Array must have uniform structure (all objects with same keys)
- Column order: alphabetically sorted
- Array length included in header: `[N]`
- Each row on separate line with consistent delimiter

---

#### Rule 3: Primitive Array Encoding

**JSON:**
```json
{
  "numbers": [1, 2, 3, 4, 5],
  "tags": ["urgent", "important", "review"]
}
```

**TONL:**
```
#version 1.0
root{numbers,tags}:
  numbers[5]: 1, 2, 3, 4, 5
  tags[3]: urgent, important, review
```

**Algorithm:**
```
function encodePrimitiveArray(arr, key):
  if arr.length == 0:
    return key + "[0]:"

  formatted_values = []
  for each item in arr:
    formatted_values.push(formatValue(item))

  joined = join(formatted_values, delimiter + " ")

  if joined.length < 80:  // Single line threshold
    return key + "[" + arr.length + "]: " + joined
  else:
    return key + "[" + arr.length + "]:\n  " + joined
```

---

#### Rule 4: Nested Object Encoding

**JSON:**
```json
{
  "user": {
    "profile": {
      "name": "Alice",
      "age": 30
    }
  }
}
```

**TONL:**
```
#version 1.0
user{profile}:
  profile{name,age}: name: Alice age: 30
```

**OR with multi-line:**
```
#version 1.0
user{profile}:
  profile{name,age}:
    name: Alice
    age: 30
```

**Decision Algorithm:**
```
function shouldUseMultiLine(obj):
  if has_nested_objects(obj):
    return true
  if has_arrays(obj):
    return true
  if has_multiline_strings(obj):
    return true
  return false
```

---

#### Rule 5: Mixed Array Encoding

**JSON:**
```json
{
  "items": [
    "text",
    42,
    { "id": 1, "name": "Object" },
    [1, 2, 3]
  ]
}
```

**TONL:**
```
#version 1.0
items[4]:
  [0]: text
  [1]: 42
  [2]{id,name}: id: 1 name: Object
  [3][3]: 1, 2, 3
```

**Algorithm:**
```
function encodeMixedArray(arr, key):
  header = key + "[" + arr.length + "]:"
  output header

  for i, item in enumerate(arr):
    if is_primitive(item):
      output "  [" + i + "]: " + formatValue(item)
    else:
      output "  " + encodeValue(item, "[" + i + "]")
```

---

### Complete Encoding Algorithm (Pseudo-code)

```python
function encodeTONL(data, options):
  # 1. Initialize
  delimiter = options.delimiter or ","
  include_types = options.include_types or false
  indent_size = options.indent or 2

  # 2. Generate headers
  output "#version " + (options.version or "1.0")
  if delimiter != ",":
    output "#delimiter " + escape_delimiter(delimiter)

  # 3. Encode root value
  encoded = encodeValue(data, "root", context)
  output encoded

  return joined_output

function encodeValue(value, key, context):
  # Handle null/undefined
  if value is null:
    return key + ": null"
  if value is undefined:
    return ""  # Skip undefined

  # Handle primitives
  if is_primitive(value):
    return encodePrimitive(value, key, context)

  # Handle arrays
  if is_array(value):
    return encodeArray(value, key, context)

  # Handle objects
  if is_object(value):
    return encodeObject(value, key, context)

function encodePrimitive(value, key, context):
  # Don't quote booleans, null, or numbers
  if value is boolean or null or number:
    return key + ": " + toString(value)

  # Quote strings as needed
  quoted = quoteIfNeeded(toString(value), context.delimiter)
  return key + ": " + quoted

function encodeArray(arr, key, context):
  if arr.length == 0:
    return key + "[0]:"

  # Check if uniform object array
  if isUniformObjectArray(arr):
    return encodeTabularArray(arr, key, context)

  # Check if primitive array
  if all(is_primitive(item) for item in arr):
    return encodePrimitiveArray(arr, key, context)

  # Mixed array
  return encodeMixedArray(arr, key, context)

function encodeObject(obj, key, context):
  # Filter undefined values and sort keys
  keys = sorted(k for k in obj.keys() if obj[k] is not undefined)

  # Build column definitions
  columns = []
  for k in keys:
    col = k
    if context.include_types:
      type_hint = inferType(obj[k])
      if type_hint not in ["obj", "list"]:
        col = col + ":" + type_hint
    columns.push(col)

  header = key + "{" + join(columns, ",") + "}:"

  # Decide single-line vs multi-line
  if shouldUseMultiLine(obj):
    return encodeMultiLineObject(obj, keys, header, context)
  else:
    return encodeSingleLineObject(obj, keys, header, context)
```

---

## TONL to JSON Parsing

### Algorithm Overview

```
1. Split input into lines
2. Parse headers (#version, #delimiter, @ directives)
3. Detect delimiter if not specified
4. Parse data section line by line:
   - Identify block headers (object/array)
   - Parse values within blocks
   - Handle nesting via indentation
5. Construct JSON structure
6. Apply type coercion if type hints present
```

### Parsing Rules

#### Rule 1: Header Parsing

```python
function parseHeaders(lines):
  context = {
    version: "1.0",
    delimiter: ",",
    strict: false
  }

  data_start = 0
  for i, line in enumerate(lines):
    # Skip schema directives
    if line.startswith("@"):
      data_start = i + 1
      continue

    # Parse header directives
    if line.startswith("#"):
      match = regex_match(r'^#(\w+)\s+(.+)$', line)
      if match:
        key = match.group(1)
        value = match.group(2)

        if key == "version":
          context.version = value
        elif key == "delimiter":
          if value == "\\t":
            context.delimiter = "\t"
          elif value in [",", "|", ";"]:
            context.delimiter = value

      data_start = i + 1
    else:
      break

  return context, data_start
```

---

#### Rule 2: Block Header Recognition

**Patterns to Recognize:**

```
Object Header:
  key{col1,col2,col3}:

Array Header:
  key[N]{col1,col2}:

Primitive Array:
  key[N]: val1, val2, val3

Key-Value Pair:
  key: value

Indexed Key (in arrays):
  [0]: value
  [123]{id,name}: ...
```

**Parsing Algorithm:**

```python
function parseObjectHeader(line):
  # Match: key[N]{cols}:  or  key{cols}:
  pattern = r'^([a-zA-Z_]\w*|\[\d+\])(\[\d+\])?\{([^}]*)\}:$'
  match = regex_match(pattern, line.strip())

  if not match:
    return null

  key = match.group(1)
  array_bracket = match.group(2)  # Optional [N]
  columns_str = match.group(3)

  is_array = array_bracket is not null
  array_length = int(array_bracket[1:-1]) if is_array else null

  # Parse column definitions
  columns = []
  for col_part in split_columns(columns_str):
    if ":" in col_part:
      name, type_hint = col_part.split(":", 1)
      columns.push({name: name.strip(), type: type_hint.strip()})
    else:
      columns.push({name: col_part.strip(), type: null})

  return {
    key: key,
    is_array: is_array,
    array_length: array_length,
    columns: columns
  }
```

---

#### Rule 3: Value Parsing

**Value Types and Recognition:**

```python
function parsePrimitiveValue(value_str, context):
  trimmed = value_str.strip()

  # Quoted string
  if trimmed.startswith('"') and trimmed.endswith('"'):
    return unquote(trimmed)

  # Triple-quoted string
  if trimmed.startswith('"""') and trimmed.endswith('"""'):
    return trimmed[3:-3].replace('\\"""', '"""').replace('\\\\', '\\')

  # Null
  if trimmed == "null" or trimmed == "":
    return null

  # Boolean
  if trimmed == "true":
    return true
  if trimmed == "false":
    return false

  # Number
  if is_number(trimmed):
    if "." in trimmed or "e" in trimmed.lower():
      return parseFloat(trimmed)
    else:
      return parseInt(trimmed)

  # Unquoted string (no special chars)
  return trimmed

function is_number(s):
  # Match: -?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?
  return matches(r'^-?\d+\.?\d*([eE][+-]?\d+)?$', s)
```

---

#### Rule 4: Line Parsing with Delimiter

**Handle quoted values and delimiters:**

```python
function parseTONLLine(line, delimiter):
  fields = []
  current_field = ""
  mode = "plain"  # Modes: plain, inQuote, inTripleQuote
  i = 0

  while i < len(line):
    char = line[i]
    next_char = line[i+1] if i+1 < len(line) else null

    if mode == "plain":
      if char == '"':
        # Check for triple quote
        if next_char == '"' and line[i+2] == '"':
          mode = "inTripleQuote"
          i += 2  # Skip next two quotes
        else:
          mode = "inQuote"

      elif char == '\\' and next_char == delimiter:
        # Escaped delimiter
        current_field += delimiter
        i += 1  # Skip backslash

      elif char == delimiter:
        # Field separator
        fields.push(current_field.strip())
        current_field = ""

      else:
        current_field += char

    elif mode == "inQuote":
      if char == '"':
        if next_char == '"':
          # Doubled quote = literal quote
          current_field += '"'
          i += 1
        else:
          # End of quoted field
          mode = "plain"
      else:
        current_field += char

    elif mode == "inTripleQuote":
      if char == '"' and next_char == '"' and line[i+2] == '"':
        mode = "plain"
        i += 2
      else:
        current_field += char

    i += 1

  # Add last field
  fields.push(current_field.strip())
  return fields
```

---

### Example Transformations (Step-by-Step)

#### Example 1: Simple Object

**Input JSON:**
```json
{
  "id": 123,
  "name": "Alice Smith",
  "active": true
}
```

**Step 1:** Identify type → Object
**Step 2:** Extract keys → ["active", "id", "name"] (sorted)
**Step 3:** Check for nesting → No nested objects/arrays
**Step 4:** Generate header → `root{active,id,name}:`
**Step 5:** Format values:
- `active: true` (boolean, unquoted)
- `id: 123` (number, unquoted)
- `name: Alice Smith` (string, check quoting)

**Step 6:** Check quoting needs:
- "Alice Smith" has space? Yes → Quote? No, space is internal
- Needs quoting? No special chars

**Output TONL:**
```
#version 1.0
root{active,id,name}: active: true id: 123 name: Alice Smith
```

---

#### Example 2: Array with Special Characters

**Input JSON:**
```json
{
  "items": [
    { "name": "Item, A", "price": 99.99 },
    { "name": "Item B", "price": 149.99 }
  ]
}
```

**Step 1:** Identify array → Uniform object array
**Step 2:** Columns → ["name", "price"]
**Step 3:** Header → `items[2]{name,price}:`
**Step 4:** Format row 1:
- name: "Item, A" → Contains delimiter (`,`) → **Must quote**: `"Item, A"`
- price: 99.99 → Number → No quote: `99.99`

**Step 5:** Format row 2:
- name: "Item B" → No special chars → No quote: `Item B`
- price: 149.99 → Number → No quote: `149.99`

**Output TONL:**
```
#version 1.0
items[2]{name,price}:
  "Item, A", 99.99
  Item B, 149.99
```

---

#### Example 3: Nested Structures

**Input JSON:**
```json
{
  "config": {
    "database": {
      "host": "localhost",
      "port": 5432
    },
    "cache": true
  }
}
```

**Step 1:** Root object with nested object
**Step 2:** Multi-line format required
**Step 3:** Recursive encoding

**Output TONL:**
```
#version 1.0
config{cache,database}:
  cache: true
  database{host,port}:
    host: localhost
    port: 5432
```

**Indentation Rules:**
- Each nesting level: +2 spaces (configurable)
- Consistent throughout document

---

## Type System

### Primitive Types

| Type | Description | Range | JSON Equivalent | TONL Syntax |
|------|-------------|-------|-----------------|-------------|
| `null` | Null value | N/A | `null` | `null` |
| `bool` | Boolean | true/false | `true`/`false` | `true`/`false` |
| `u32` | Unsigned 32-bit int | 0 to 4,294,967,295 | number | `123` |
| `i32` | Signed 32-bit int | -2,147,483,648 to 2,147,483,647 | number | `-456` |
| `f64` | 64-bit float | Full IEEE 754 | number | `3.14`, `1e10`, `Infinity`, `NaN` |
| `str` | String | Any UTF-8 | string | `text` or `"text"` |

### Type Inference Rules

```python
function inferType(value):
  if value is null:
    return "null"

  if value is boolean:
    return "bool"

  if value is number:
    if not isFinite(value):
      return "f64"  # Infinity, -Infinity, NaN

    if isInteger(value):
      if value >= 0 and value <= 0xFFFFFFFF:
        return "u32"
      elif value >= -0x80000000 and value <= 0x7FFFFFFF:
        return "i32"
      else:
        return "f64"  # Outside i32/u32 range

    return "f64"  # Has decimal

  if value is string:
    return "str"

  if value is array:
    return "list"

  if value is object:
    return "obj"

  return "str"  # Fallback
```

### Type Coercion (When Reading)

```python
function coerceValue(string_value, type_hint):
  unquoted = unquote(string_value)

  # Handle null for all types
  if unquoted == "null":
    return null

  if type_hint == "null":
    return null

  elif type_hint == "bool":
    return unquoted == "true"

  elif type_hint == "u32":
    val = parseInt(unquoted)
    if val < 0 or val > 0xFFFFFFFF:
      throw TypeError("Invalid u32: " + string_value)
    return val

  elif type_hint == "i32":
    val = parseInt(unquoted)
    if val < -0x80000000 or val > 0x7FFFFFFF:
      throw TypeError("Invalid i32: " + string_value)
    return val

  elif type_hint == "f64":
    val = parseFloat(unquoted)
    if isNaN(val):
      throw TypeError("Invalid f64: " + string_value)
    return val

  elif type_hint == "str":
    return unquoted

  else:
    return unquoted  # Unknown type hint
```

---

## Notation Rules

### Identifiers

**Valid identifiers:**
```
user
userName
user_name
_privateField
field123
```

**Rules:**
- Must start with letter or underscore: `[a-zA-Z_]`
- Can contain letters, numbers, underscore: `[a-zA-Z0-9_]*`
- Case-sensitive
- No reserved words

**Invalid identifiers:**
```
123user        # Starts with number
user-name      # Contains hyphen
user.name      # Contains dot
```

---

### Block Headers

**Syntax:**
```
key{column1,column2,...}:              # Object header
key[N]{column1,column2,...}:           # Array header (N elements)
key[N]:                                # Primitive array header
```

**Examples:**
```
user{name,age,email}:
users[10]{id,name,role}:
tags[5]:
config{database,cache}:
[0]{x,y,z}:                           # Indexed key in array
```

---

### Key-Value Pairs

**Syntax:**
```
key: value
key: "quoted value"
key: """multiline
value"""
```

**Examples:**
```
name: Alice
age: 30
active: true
description: "Text with, comma"
code: """
function example() {
  return 42;
}
"""
```

---

### Indentation

**Rules:**
- Default: 2 spaces per level
- Must be consistent within document
- Only spaces (not tabs for indentation, unless tab is NOT the delimiter)
- Indentation indicates nesting depth

**Example:**
```
root{user,config}:
  user{name,age}:
    name: Alice
    age: 30
  config{debug}:
    debug: false
```

**Indentation levels:**
- Line 1: 0 spaces (root header)
- Lines 2-3: 2 spaces (level 1)
- Lines 4-5: 4 spaces (level 2)
- Lines 6-7: 2 spaces (level 1)
- Line 8: 4 spaces (level 2)

---

## String Handling and Quoting

### Quoting Rules

**When to Quote:**

```python
function needsQuoting(value, delimiter):
  # Empty strings must be quoted
  if value == "":
    return true

  # Quote reserved literals
  if value in ["true", "false", "null", "undefined"]:
    return true

  # Quote special numeric strings
  if value in ["Infinity", "-Infinity", "NaN"]:
    return true

  # Quote number-like strings
  if matches(r'^-?\d+$', value):           # Integers
    return true
  if matches(r'^-?\d*\.\d+$', value):      # Decimals
    return true
  if matches(r'^-?\d+\.?\d*e[+-]?\d+$', value, ignorecase=true):  # Scientific
    return true

  # Quote if contains special characters
  if delimiter in value:
    return true
  if ":" in value:
    return true
  if "{" in value or "}" in value:
    return true
  if "#" in value:
    return true
  if "\n" in value:
    return true  # Use triple quotes instead
  if "\t" in value or "\r" in value:
    return true
  if value.startswith(" ") or value.endswith(" "):
    return true

  return false
```

---

### Quote Types

#### Single Double Quotes

**For:** Values with delimiter or special chars (no newlines)

```python
function quoteValue(value, delimiter):
  # Escape existing quotes by doubling
  escaped = value.replace('"', '""')
  # Escape backslashes
  escaped = escaped.replace('\\', '\\\\')
  return '"' + escaped + '"'
```

**Examples:**
```
Input:  Hello, world
Quoted: "Hello, world"

Input:  She said "hi"
Quoted: "She said ""hi"""

Input:  Path: C:\Users
Quoted: "Path: C:\\Users"
```

---

#### Triple Quotes

**For:** Multi-line strings or strings containing `"""`

```python
function tripleQuote(value, delimiter):
  if "\n" not in value and '"""' not in value:
    return quoteValue(value, delimiter)

  # Escape backslashes first
  escaped = value.replace('\\', '\\\\')
  # Escape triple quotes
  escaped = escaped.replace('"""', '\\"""')

  return '"""' + escaped + '"""'
```

**Examples:**

**Input:**
```
Line 1
Line 2
Line 3
```

**TONL:**
```
description: """Line 1
Line 2
Line 3"""
```

**Input:**
```
Text with """ quotes
```

**TONL:**
```
text: """Text with \""" quotes"""
```

---

### Unquoting Rules

```python
function unquote(value):
  # Single quotes
  if value.startswith('"') and value.endswith('"') and not value.startswith('"""'):
    inner = value[1:-1]
    # Unescape doubled quotes
    unescaped = inner.replace('""', '"')
    # Unescape backslashes
    unescaped = unescaped.replace('\\\\', '\\')
    return unescaped

  # Triple quotes
  if value.startswith('"""') and value.endswith('"""'):
    inner = value[3:-3]
    # Unescape triple quotes
    unescaped = inner.replace('\\"""', '"""')
    # Unescape backslashes
    unescaped = unescaped.replace('\\\\', '\\')
    return unescaped

  # No quotes - return as-is
  return value
```

---

## Delimiter System

### Supported Delimiters

| Delimiter | Character | Escape in Header | When to Use |
|-----------|-----------|------------------|-------------|
| Comma | `,` | (default) | General purpose |
| Pipe | `\|` | `#delimiter \|` | Data with commas |
| Tab | `\t` | `#delimiter \\t` | TSV-like data |
| Semicolon | `;` | `#delimiter ;` | European formats |

### Delimiter Selection Algorithm

```python
function selectBestDelimiter(json_data):
  json_str = JSON.stringify(json_data)

  # Count occurrences of each delimiter
  comma_count = count_char(json_str, ',')
  pipe_count = count_char(json_str, '|')
  tab_count = count_char(json_str, '\t')
  semicolon_count = count_char(json_str, ';')

  # Choose delimiter with minimum occurrences
  counts = {
    ',': comma_count,
    '|': pipe_count,
    '\t': tab_count,
    ';': semicolon_count
  }

  best_delimiter = min(counts, key=counts.get)
  return best_delimiter
```

### Delimiter Detection (When Parsing)

```python
function detectDelimiter(content):
  # 1. Check for explicit directive
  match = regex_match(r'^#delimiter\s+(.+)$', content, multiline=true)
  if match:
    delim_str = match.group(1)
    if delim_str == "\\t":
      return "\t"
    elif delim_str in [",", "|", ";"]:
      return delim_str

  # 2. Heuristic: analyze first data line
  lines = content.split('\n')
  for line in lines:
    trimmed = line.strip()
    # Skip headers and block headers
    if trimmed and not trimmed.startswith('#') and not trimmed.endswith(':'):
      # Count potential delimiters
      counts = {
        ',': count_char(trimmed, ','),
        '|': count_char(trimmed, '|'),
        '\t': count_char(trimmed, '\t'),
        ';': count_char(trimmed, ';')
      }

      max_count = max(counts.values())
      if max_count == 0:
        return ","  # Default

      # Return delimiter with max count
      for delim, count in counts.items():
        if count == max_count:
          return delim

  return ","  # Default fallback
```

---

## Algorithm Pseudo-code

### Complete TONL Encoder

```python
class TONLEncoder:
  def __init__(self, options):
    self.delimiter = options.get('delimiter', ',')
    self.include_types = options.get('include_types', false)
    self.version = options.get('version', '1.0')
    self.indent_size = options.get('indent', 2)
    self.single_line_primitives = options.get('single_line_primitives', true)
    self.current_indent = 0
    self.seen = new WeakSet()  # Track circular references

  def encode(self, data):
    lines = []

    # Add headers
    lines.append("#version " + self.version)
    if self.delimiter != ",":
      escaped_delim = "\\t" if self.delimiter == "\t" else self.delimiter
      lines.append("#delimiter " + escaped_delim)

    # Encode root
    encoded = self.encode_value(data, "root")
    if encoded:
      lines.append(encoded)

    return "\n".join(lines)

  def encode_value(self, value, key):
    # Check circular reference
    if is_object(value) or is_array(value):
      if value in self.seen:
        throw Error("Circular reference at: " + key)
      self.seen.add(value)

    # Dispatch by type
    if value is null:
      return key + ": null"

    if value is undefined:
      return ""  # Skip

    if is_primitive(value):
      return self.encode_primitive(value, key)

    if is_array(value):
      return self.encode_array(value, key)

    if is_object(value):
      return self.encode_object(value, key)

  def encode_primitive(self, value, key):
    # Booleans, null, numbers: no quotes
    if is_boolean(value) or is_null(value) or is_number(value):
      return key + ": " + str(value)

    # Strings: quote if needed
    quoted = self.quote_if_needed(str(value))
    return key + ": " + quoted

  def encode_array(self, arr, key):
    if len(arr) == 0:
      return key + "[0]:"

    # Check if uniform object array
    if self.is_uniform_object_array(arr):
      return self.encode_tabular_array(arr, key)

    # Check if primitive array
    if all(is_primitive(item) for item in arr):
      return self.encode_primitive_array(arr, key)

    # Mixed array
    return self.encode_mixed_array(arr, key)

  def encode_object(self, obj, key):
    # Get sorted keys (excluding undefined)
    keys = sorted(k for k in obj.keys() if obj[k] is not undefined)

    # Build columns
    columns = []
    for k in keys:
      col = k
      if self.include_types:
        type_hint = self.infer_type(obj[k])
        if type_hint not in ["obj", "list"]:
          col = col + ":" + type_hint
      columns.append(col)

    header = key + "{" + ",".join(columns) + "}:"

    # Check if multi-line needed
    if self.should_use_multiline(obj):
      return self.encode_multiline_object(obj, keys, header)
    else:
      return self.encode_singleline_object(obj, keys, header)
```

---

### Complete TONL Decoder

```python
class TONLDecoder:
  def __init__(self, options):
    self.delimiter = options.get('delimiter')  # May be null (auto-detect)
    self.strict = options.get('strict', false)

  def decode(self, text):
    # 1. Split into lines
    lines = text.split('\n')
    lines = [line.rstrip('\r') for line in lines if line]

    if len(lines) == 0:
      return {}

    # 2. Parse headers
    context, data_start = self.parse_headers(lines)

    # 3. Auto-detect delimiter if needed
    if self.delimiter is null:
      if context.delimiter:
        self.delimiter = context.delimiter
      else:
        self.delimiter = self.detect_delimiter(text)

    context.delimiter = self.delimiter

    # 4. Parse content
    content = "\n".join(lines[data_start:])
    if not content:
      return {}

    result = self.parse_content(content, context)

    # 5. Unwrap root if needed
    if len(result.keys()) == 1 and "root" in result:
      return result["root"]

    return result

  def parse_content(self, content, context):
    lines = content.split('\n')
    result = {}
    i = 0

    while i < len(lines):
      line = lines[i]
      trimmed = line.strip()

      # Skip empty lines and comments
      if not trimmed or trimmed.startswith('#') or trimmed.startswith('@'):
        i += 1
        continue

      # Try to parse as block header
      header = self.parse_object_header(trimmed)
      if header:
        block_lines = self.extract_block(lines, i)
        value = self.parse_block(header, block_lines, context)
        result[header.key] = value
        i += len(block_lines) + 1
        continue

      # Try to parse as primitive array
      match = regex_match(r'^(.+)\[(\d+)\]:\s*(.*)$', trimmed)
      if match:
        key = match.group(1).strip()
        length = int(match.group(2))
        value_part = match.group(3).strip()

        if value_part:
          fields = self.parse_line(value_part, context.delimiter)
          result[key] = [self.parse_primitive(f, context) for f in fields]
        else:
          result[key] = []
        i += 1
        continue

      # Try to parse as key-value
      match = regex_match(r'^([^:]+):\s*(.*)$', trimmed)
      if match:
        key = match.group(1).strip()
        value_str = match.group(2).strip()

        # Handle multiline triple-quoted strings
        if value_str.startswith('"""') and not value_str.endswith('"""'):
          multiline_content = [value_str[3:]]
          i += 1
          while i < len(lines):
            current = lines[i]
            if current.strip().endswith('"""'):
              close_idx = current.rfind('"""')
              multiline_content.append(current[:close_idx])
              i += 1
              break
            else:
              multiline_content.append(current)
              i += 1

          result[key] = "\n".join(multiline_content)
          result[key] = result[key].replace('\\"""', '"""').replace('\\\\', '\\')
          continue

        result[key] = self.parse_primitive(value_str, context)

      i += 1

    return result
```

---

## Edge Cases

### Edge Case 1: Empty Strings vs Null

**JSON:**
```json
{
  "empty": "",
  "null_val": null
}
```

**TONL:**
```
root{empty,null_val}:
  empty: ""
  null_val: null
```

**Parsing Rule:**
- `""` → empty string
- `null` → null value
- Missing field → undefined (in strict mode: error)

---

### Edge Case 2: Boolean and Null Strings

**JSON:**
```json
{
  "bool_str": "true",
  "bool_val": true,
  "null_str": "null",
  "null_val": null
}
```

**TONL:**
```
root{bool_str,bool_val,null_str,null_val}:
  bool_str: "true"
  bool_val: true
  null_str: "null"
  null_val: null
```

**Rule:** Strings that look like literals MUST be quoted to distinguish from actual literals.

---

### Edge Case 3: Number-like Strings

**JSON:**
```json
{
  "num_str": "123",
  "num_val": 123,
  "decimal_str": "3.14",
  "decimal_val": 3.14
}
```

**TONL:**
```
root{num_str,num_val,decimal_str,decimal_val}:
  num_str: "123"
  num_val: 123
  decimal_str: "3.14"
  decimal_val: 3.14
```

**Rule:** Strings that look like numbers MUST be quoted.

---

### Edge Case 4: Special Numeric Values

**JSON:**
```json
{
  "infinity": Infinity,
  "neg_infinity": -Infinity,
  "nan": NaN,
  "inf_str": "Infinity"
}
```

**TONL:**
```
root{infinity,neg_infinity,nan,inf_str}:
  infinity: Infinity
  neg_infinity: -Infinity
  nan: NaN
  inf_str: "Infinity"
```

**Parsing:**
```python
if value_str == "Infinity":
  return float('inf')
elif value_str == "-Infinity":
  return float('-inf')
elif value_str == "NaN":
  return float('nan')
elif value_str == '"Infinity"':
  return "Infinity"  # String
```

---

### Edge Case 5: Circular References

**JSON (throws error in JSON.stringify):**
```javascript
const obj = { name: "Alice" };
obj.self = obj;  // Circular!
```

**TONL Encoding:**
```python
def encode_with_circular_check(value, key, seen):
  if is_object(value) or is_array(value):
    if value in seen:
      throw CircularReferenceError("Circular reference at: " + key)
    seen.add(value)

  # ... encode normally
```

**Must throw error:** Circular references are not supported in TONL.

---

### Edge Case 6: Whitespace Preservation

**JSON:**
```json
{
  "leading": "  text",
  "trailing": "text  ",
  "tabs": "\t\ttext",
  "newlines": "line1\nline2"
}
```

**TONL:**
```
root{leading,trailing,tabs,newlines}:
  leading: "  text"
  trailing: "text  "
  tabs: "\t\ttext"
  newlines: """line1
line2"""
```

**Rules:**
- Leading/trailing spaces → Must quote
- Tabs → Must quote (if tab is not delimiter)
- Newlines → Must use triple quotes

---

### Edge Case 7: Objects with Numeric Keys

**JSON:**
```json
{
  "0": "zero",
  "1": "one",
  "10": "ten"
}
```

**TONL:**
```
#version 1.0
root{0,1,10}:
  0: zero
  1: one
  10: ten
```

**Note:** Keys are strings in JSON, remain strings in TONL.

---

### Edge Case 8: Arrays with Undefined

**JSON:**
```json
{
  "arr": [1, undefined, 3]
}
```

**JavaScript Behavior:** `JSON.stringify` removes undefined:
```json
{
  "arr": [1, null, 3]
}
```

**TONL:**
```
arr[3]: 1, null, 3
```

**Rule:** In arrays, `undefined` becomes `null` to maintain array structure.

---

## Algorithm Pseudo-code

### Minimal Encoder (Language-Agnostic)

```
FUNCTION encode_tonl(data, options):
    SET delimiter = options.delimiter OR ","
    SET version = options.version OR "1.0"

    // Initialize output
    CREATE lines AS empty list

    // Headers
    APPEND "#version " + version TO lines
    IF delimiter != ",":
        APPEND "#delimiter " + escape(delimiter) TO lines

    // Encode data
    SET encoded = encode_value(data, "root", {delimiter, indent: 0})
    IF encoded:
        APPEND encoded TO lines

    RETURN join(lines, "\n")

FUNCTION encode_value(value, key, context):
    IF value IS NULL:
        RETURN key + ": null"

    IF value IS BOOLEAN:
        RETURN key + ": " + lowercase(value)

    IF value IS NUMBER:
        RETURN key + ": " + string(value)

    IF value IS STRING:
        SET quoted = quote_if_needed(value, context.delimiter)
        RETURN key + ": " + quoted

    IF value IS ARRAY:
        RETURN encode_array(value, key, context)

    IF value IS OBJECT:
        RETURN encode_object(value, key, context)

FUNCTION encode_array(arr, key, context):
    IF length(arr) == 0:
        RETURN key + "[0]:"

    // Check if uniform object array
    IF all items are objects WITH same keys:
        RETURN encode_tabular(arr, key, context)

    // Check if all primitives
    IF all items are primitive:
        SET values = []
        FOR EACH item IN arr:
            APPEND format_value(item, context) TO values
        RETURN key + "[" + length(arr) + "]: " + join(values, context.delimiter + " ")

    // Mixed array
    CREATE lines AS empty list
    APPEND key + "[" + length(arr) + "]:" TO lines
    FOR i, item IN enumerate(arr):
        SET encoded = encode_value(item, "[" + i + "]", indent_context(context))
        APPEND "  " + encoded TO lines
    RETURN join(lines, "\n")

FUNCTION encode_tabular(arr, key, context):
    SET columns = sorted(keys(arr[0]))
    SET header = key + "[" + length(arr) + "]{" + join(columns, ",") + "}:"

    CREATE lines AS empty list
    APPEND header TO lines

    FOR EACH row IN arr:
        CREATE values AS empty list
        FOR EACH col IN columns:
            APPEND format_value(row[col], context) TO values
        APPEND "  " + join(values, " " + context.delimiter + " ") TO lines

    RETURN join(lines, "\n")

FUNCTION quote_if_needed(value, delimiter):
    IF value == "":
        RETURN '""'

    IF value IN ["true", "false", "null", "undefined", "Infinity", "-Infinity", "NaN"]:
        RETURN '"' + value + '"'

    IF matches_number_pattern(value):
        RETURN '"' + value + '"'

    IF contains(value, delimiter) OR contains(value, ":") OR contains(value, "{"):
        SET escaped = replace(value, '"', '""')
        SET escaped = replace(escaped, '\\', '\\\\')
        RETURN '"' + escaped + '"'

    IF contains(value, "\n"):
        RETURN triple_quote(value)

    RETURN value  // No quoting needed
```

---

### Minimal Decoder (Language-Agnostic)

```
FUNCTION decode_tonl(text, options):
    SET lines = split(text, "\n")
    SET lines = [strip_carriage_return(line) FOR line IN lines IF line]

    IF length(lines) == 0:
        RETURN {}

    // Parse headers
    SET context = {delimiter: ",", version: "1.0", strict: false}
    SET data_start = 0

    FOR i, line IN enumerate(lines):
        IF startswith(line, "@"):
            SET data_start = i + 1
            CONTINUE

        IF startswith(line, "#"):
            SET parsed = parse_header_line(line)
            IF parsed:
                IF parsed.key == "version":
                    SET context.version = parsed.value
                ELIF parsed.key == "delimiter":
                    SET context.delimiter = parse_delimiter(parsed.value)
            SET data_start = i + 1
        ELSE:
            BREAK

    // Detect delimiter if not specified
    IF options.delimiter IS NOT NULL:
        SET context.delimiter = options.delimiter
    ELIF context.delimiter IS NULL:
        SET context.delimiter = detect_delimiter(text)

    // Parse content
    SET content_lines = lines[data_start:]
    SET result = parse_content(content_lines, context)

    // Unwrap root if present
    IF length(keys(result)) == 1 AND "root" IN result:
        RETURN result["root"]

    RETURN result

FUNCTION parse_content(lines, context):
    CREATE result AS empty object
    SET i = 0

    WHILE i < length(lines):
        SET line = lines[i]
        SET trimmed = trim(line)

        // Skip empty/comments
        IF NOT trimmed OR startswith(trimmed, "#") OR startswith(trimmed, "@"):
            INCREMENT i
            CONTINUE

        // Try block header: key{cols}: or key[N]{cols}:
        SET header = parse_object_header(trimmed)
        IF header:
            SET block_lines = extract_block_lines(lines, i, context)
            SET value = parse_block(header, block_lines, context)
            SET result[header.key] = value
            SET i = i + length(block_lines) + 1
            CONTINUE

        // Try primitive array: key[N]: val1, val2
        IF matches(trimmed, r'^(.+)\[(\d+)\]:\s*(.+)$'):
            EXTRACT key, length, values_str
            SET fields = parse_line(values_str, context.delimiter)
            SET result[key] = [parse_primitive(f, context) FOR f IN fields]
            INCREMENT i
            CONTINUE

        // Try key-value: key: value
        IF matches(trimmed, r'^([^:]+):\s*(.+)$'):
            EXTRACT key, value_str
            SET result[key] = parse_primitive(value_str, context)
            INCREMENT i
            CONTINUE

        INCREMENT i

    RETURN result

FUNCTION parse_block(header, lines, context):
    IF header.is_array:
        RETURN parse_array_block(header, lines, context)
    ELSE:
        RETURN parse_object_block(header, lines, context)

FUNCTION parse_array_block(header, lines, context):
    CREATE result AS empty array

    IF header.columns IS EMPTY:
        // Mixed array - parse each line
        FOR line IN lines:
            // Parse nested structures or primitives
            ADD parsed_value TO result
    ELSE:
        // Tabular array - each line is one row
        FOR line IN lines:
            SET fields = parse_line(line, context.delimiter)
            CREATE row AS empty object

            FOR j, column IN enumerate(header.columns):
                IF j < length(fields):
                    SET value = fields[j]
                    IF column.type:
                        SET row[column.name] = coerce_type(value, column.type)
                    ELSE:
                        SET row[column.name] = parse_primitive(value, context)

            ADD row TO result

    // Validate array length in strict mode
    IF context.strict AND header.array_length:
        IF length(result) != header.array_length:
            THROW Error("Array length mismatch")

    RETURN result

FUNCTION parse_primitive(value_str, context):
    SET trimmed = trim(value_str)

    // Quoted string
    IF startswith(trimmed, '"') AND endswith(trimmed, '"'):
        RETURN unquote(trimmed)

    // Triple-quoted string
    IF startswith(trimmed, '"""') AND endswith(trimmed, '"""'):
        RETURN unquote_triple(trimmed)

    // Null
    IF trimmed == "null" OR trimmed == "":
        RETURN null

    // Boolean
    IF trimmed == "true":
        RETURN true
    IF trimmed == "false":
        RETURN false

    // Special numbers
    IF trimmed == "Infinity":
        RETURN positive_infinity
    IF trimmed == "-Infinity":
        RETURN negative_infinity
    IF trimmed == "NaN":
        RETURN not_a_number

    // Number
    IF is_numeric(trimmed):
        IF contains(trimmed, ".") OR contains(lower(trimmed), "e"):
            RETURN parse_float(trimmed)
        ELSE:
            RETURN parse_int(trimmed)

    // Unquoted string
    RETURN trimmed
```

---

## Test Suite Requirements

### Required Test Cases for Compliance

Any TONL implementation MUST pass these tests:

#### 1. Basic Round-Trip Tests

```javascript
// Test 1: Simple object
input = { name: "Alice", age: 30 }
tonl = encode(input)
output = decode(tonl)
assert(output == input)

// Test 2: Uniform array
input = { users: [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" }
]}
tonl = encode(input)
output = decode(tonl)
assert(output == input)

// Test 3: Nested structures
input = { user: { profile: { name: "Alice" } } }
tonl = encode(input)
output = decode(tonl)
assert(output == input)
```

---

#### 2. Delimiter Tests

```javascript
// Test 4: All delimiters
for delimiter in [",", "|", "\t", ";"]:
  input = { data: ["a", "b", "c"] }
  tonl = encode(input, {delimiter: delimiter})
  output = decode(tonl)
  assert(output == input)

// Test 5: Auto-detection
tonl_comma = "items[3]: a, b, c"
tonl_pipe = "items[3]: a | b | c"
assert(detect_delimiter(tonl_comma) == ",")
assert(detect_delimiter(tonl_pipe) == "|")
```

---

#### 3. Special Character Tests

```javascript
// Test 6: Delimiter in value
input = { text: "Hello, world" }
tonl = encode(input, {delimiter: ","})
assert(tonl.includes('"Hello, world"'))
output = decode(tonl)
assert(output.text == "Hello, world")

// Test 7: Quotes in value
input = { text: 'She said "Hi"' }
tonl = encode(input)
output = decode(tonl)
assert(output.text == 'She said "Hi"')

// Test 8: Backslashes
input = { path: "C:\\Users\\Name" }
tonl = encode(input)
output = decode(tonl)
assert(output.path == "C:\\Users\\Name")
```

---

#### 4. Type Handling Tests

```javascript
// Test 9: Null vs "null"
input = { null_val: null, null_str: "null" }
tonl = encode(input)
output = decode(tonl)
assert(output.null_val === null)
assert(output.null_str === "null")

// Test 10: Boolean vs "boolean"
input = { bool_val: true, bool_str: "true" }
tonl = encode(input)
output = decode(tonl)
assert(output.bool_val === true)
assert(output.bool_str === "true")

// Test 11: Number vs "number"
input = { num_val: 123, num_str: "123" }
tonl = encode(input)
output = decode(tonl)
assert(output.num_val === 123)
assert(output.num_str === "123")

// Test 12: Special numbers
input = { inf: Infinity, ninf: -Infinity, nan: NaN }
tonl = encode(input)
output = decode(tonl)
assert(output.inf === Infinity)
assert(is_nan(output.nan))
```

---

#### 5. Multiline String Tests

```javascript
// Test 13: Basic multiline
input = { text: "Line 1\nLine 2\nLine 3" }
tonl = encode(input)
output = decode(tonl)
assert(output.text == "Line 1\nLine 2\nLine 3")

// Test 14: Triple quotes in content
input = { text: 'Has """ quotes' }
tonl = encode(input)
output = decode(tonl)
assert(output.text == 'Has """ quotes')
```

---

#### 6. Edge Case Tests

```javascript
// Test 15: Empty strings
input = { empty: "", not_empty: "x" }
tonl = encode(input)
output = decode(tonl)
assert(output.empty === "")
assert(output.not_empty === "x")

// Test 16: Empty arrays/objects
input = { arr: [], obj: {} }
tonl = encode(input)
output = decode(tonl)
assert(output.arr == [])
assert(output.obj == {})

// Test 17: Circular reference detection
obj = { name: "Alice" }
obj.self = obj
try:
  encode(obj)
  assert(false, "Should throw error")
catch CircularReferenceError:
  assert(true)
```

---

## Implementation Checklist

### Must-Have Features (Core)

- [ ] **Encoder**
  - [ ] Basic object encoding
  - [ ] Primitive array encoding
  - [ ] Tabular (uniform) array encoding
  - [ ] Mixed array encoding
  - [ ] Nested object encoding
  - [ ] Header generation (#version, #delimiter)
  - [ ] Delimiter selection
  - [ ] Circular reference detection

- [ ] **Decoder**
  - [ ] Header parsing
  - [ ] Delimiter detection
  - [ ] Object block parsing
  - [ ] Array block parsing
  - [ ] Primitive value parsing
  - [ ] Type coercion (with type hints)
  - [ ] Line parsing with quote handling

- [ ] **String Handling**
  - [ ] Quote detection
  - [ ] Quote escaping (doubled quotes)
  - [ ] Backslash escaping
  - [ ] Triple quote handling
  - [ ] Multiline string parsing
  - [ ] Unquoting

- [ ] **Type System**
  - [ ] Type inference (inferPrimitiveType)
  - [ ] Type coercion (coerceValue)
  - [ ] Bounds checking (u32, i32)
  - [ ] Special number handling (Infinity, NaN)

### Should-Have Features (Enhanced)

- [ ] **Smart Encoding**
  - [ ] Automatic delimiter selection
  - [ ] Layout optimization
  - [ ] Type hint optimization

- [ ] **Validation**
  - [ ] Strict mode parsing
  - [ ] Array length validation
  - [ ] Column count validation

- [ ] **Error Handling**
  - [ ] Parse errors with line numbers
  - [ ] Helpful error messages
  - [ ] Suggestions for common errors

### Nice-to-Have Features (Advanced)

- [ ] **Schema Support**
  - [ ] Schema parsing (TSL)
  - [ ] Validation against schema
  - [ ] Type generation

- [ ] **Streaming**
  - [ ] Stream encoder
  - [ ] Stream decoder
  - [ ] Memory-efficient processing

- [ ] **Query API**
  - [ ] Path-based access
  - [ ] JSONPath-like queries
  - [ ] Filter expressions

---

## Complete Examples

### Example 1: E-commerce Data

**JSON Input:**
```json
{
  "store": {
    "name": "TechStore",
    "products": [
      {
        "id": 101,
        "name": "Laptop",
        "price": 999.99,
        "stock": 5,
        "tags": ["computers", "portable"]
      },
      {
        "id": 102,
        "name": "Mouse",
        "price": 25.99,
        "stock": 50,
        "tags": ["accessories"]
      }
    ]
  }
}
```

**TONL Output (with delimiter `,`):**
```
#version 1.0
store{name,products}:
  name: TechStore
  products[2]{id,name,price,stock,tags}:
    101, Laptop, 999.99, 5, computers, portable
    102, Mouse, 25.99, 50, accessories
```

**TONL Output (with smart encoding - pipe delimiter):**
```
#version 1.0
#delimiter |
store{name,products}:
  name: TechStore
  products[2]{id,name,price,stock,tags}:
    101 | Laptop | 999.99 | 5 | computers, portable
    102 | Mouse | 25.99 | 50 | accessories
```

**Why pipe?** Product names might contain commas, so pipe minimizes quoting.

---

### Example 2: Configuration File

**JSON Input:**
```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "credentials": {
      "username": "admin",
      "password": "secret123"
    }
  },
  "features": {
    "cache": true,
    "debug": false,
    "maxConnections": 100
  }
}
```

**TONL Output:**
```
#version 1.0
root{database,features}:
  database{credentials,host,port}:
    credentials{password,username}: password: secret123 username: admin
    host: localhost
    port: 5432
  features{cache,debug,maxConnections}: cache: true debug: false maxConnections: 100
```

**Note:** Alphabetical sorting of keys at each level.

---

### Example 3: Time Series Data

**JSON Input:**
```json
{
  "measurements": [
    { "timestamp": 1699123200, "temperature": 22.5, "humidity": 45 },
    { "timestamp": 1699123260, "temperature": 22.7, "humidity": 46 },
    { "timestamp": 1699123320, "temperature": 22.6, "humidity": 45 }
  ]
}
```

**TONL Output (tabular):**
```
#version 1.0
measurements[3]{timestamp,temperature,humidity}:
  1699123200, 22.5, 45
  1699123260, 22.7, 46
  1699123320, 22.6, 45
```

**Token Comparison:**
- JSON: ~245 tokens
- TONL: ~145 tokens
- Savings: ~40% (typical for tabular data)

---

## Implementation Guide by Language

### Python Implementation Hints

```python
# Use dataclasses for structured data
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class TONLHeader:
    version: str = "1.0"
    delimiter: str = ","

@dataclass
class TONLColumnDef:
    name: str
    type_hint: Optional[str] = None

@dataclass
class TONLObjectHeader:
    key: str
    columns: List[TONLColumnDef]
    is_array: bool = False
    array_length: Optional[int] = None

# Use regex for parsing
import re

def parse_object_header(line: str) -> Optional[TONLObjectHeader]:
    match = re.match(r'^([a-zA-Z_]\w*)(\[(\d+)\])?\{([^}]*)\}:$', line.strip())
    if not match:
        return None
    # ... extract and build header

# Use StringIO for efficient string building
from io import StringIO

def encode(data):
    output = StringIO()
    output.write("#version 1.0\n")
    # ...
    return output.getvalue()
```

---

### Go Implementation Hints

```go
// Define types
type TONLEncoder struct {
    Delimiter        string
    IncludeTypes     bool
    Version          string
    Indent           int
    CurrentIndent    int
    Seen             map[uintptr]bool  // Track circular refs
}

type TONLHeader struct {
    Version   string
    Delimiter string
}

type TONLColumnDef struct {
    Name string
    Type string
}

// Use strings.Builder for efficiency
import "strings"

func (e *TONLEncoder) Encode(data interface{}) (string, error) {
    var buf strings.Builder
    buf.WriteString("#version ")
    buf.WriteString(e.Version)
    buf.WriteString("\n")
    // ...
    return buf.String(), nil
}

// Use reflect for type detection
import "reflect"

func inferType(value interface{}) string {
    if value == nil {
        return "null"
    }

    v := reflect.ValueOf(value)
    switch v.Kind() {
    case reflect.Bool:
        return "bool"
    case reflect.Int, reflect.Int32:
        return "i32"
    // ...
    }
}
```

---

### Rust Implementation Hints

```rust
// Use serde for JSON compatibility
use serde::{Serialize, Deserialize};
use serde_json::Value as JsonValue;

#[derive(Debug, Clone)]
pub struct TONLEncoder {
    delimiter: char,
    include_types: bool,
    version: String,
    indent: usize,
    seen: HashSet<*const ()>,  // Track circular refs
}

#[derive(Debug)]
pub struct TONLHeader {
    version: String,
    delimiter: char,
}

impl TONLEncoder {
    pub fn encode(&mut self, value: &JsonValue) -> Result<String, TONLError> {
        let mut output = String::new();
        output.push_str("#version ");
        output.push_str(&self.version);
        output.push('\n');
        // ...
        Ok(output)
    }

    fn encode_value(&mut self, value: &JsonValue, key: &str) -> Result<String, TONLError> {
        match value {
            JsonValue::Null => Ok(format!("{}: null", key)),
            JsonValue::Bool(b) => Ok(format!("{}: {}", key, b)),
            JsonValue::Number(n) => Ok(format!("{}: {}", key, n)),
            JsonValue::String(s) => self.encode_string(s, key),
            JsonValue::Array(arr) => self.encode_array(arr, key),
            JsonValue::Object(obj) => self.encode_object(obj, key),
        }
    }
}

// Use regex crate for parsing
use regex::Regex;

lazy_static! {
    static ref HEADER_REGEX: Regex = Regex::new(
        r"^([a-zA-Z_]\w*)(\[(\d+)\])?\{([^}]*)\}:$"
    ).unwrap();
}
```

---

### Java Implementation Hints

```java
// Use Jackson for JSON compatibility
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

public class TONLEncoder {
    private String delimiter = ",";
    private boolean includeTypes = false;
    private String version = "1.0";
    private int indent = 2;
    private Set<Object> seen = Collections.newSetFromMap(new IdentityHashMap<>());

    public String encode(Object data) throws TONLException {
        StringBuilder output = new StringBuilder();
        output.append("#version ").append(version).append("\n");

        if (!delimiter.equals(",")) {
            String escaped = delimiter.equals("\t") ? "\\t" : delimiter;
            output.append("#delimiter ").append(escaped).append("\n");
        }

        // Encode root
        ObjectMapper mapper = new ObjectMapper();
        JsonNode node = mapper.valueToTree(data);
        String encoded = encodeValue(node, "root");
        output.append(encoded);

        return output.toString();
    }

    private String encodeValue(JsonNode node, String key) throws TONLException {
        if (node.isNull()) {
            return key + ": null";
        }

        if (node.isBoolean()) {
            return key + ": " + node.asBoolean();
        }

        if (node.isNumber()) {
            return key + ": " + node.asText();
        }

        if (node.isTextual()) {
            String quoted = quoteIfNeeded(node.asText());
            return key + ": " + quoted;
        }

        if (node.isArray()) {
            return encodeArray(node, key);
        }

        if (node.isObject()) {
            return encodeObject(node, key);
        }

        throw new TONLException("Unknown node type");
    }
}

// Use Pattern for regex
import java.util.regex.Pattern;
import java.util.regex.Matcher;

public class TONLDecoder {
    private static final Pattern HEADER_PATTERN = Pattern.compile(
        "^([a-zA-Z_]\\w*)(\\[(\\d+)\\])?\\{([^}]*)\\}:$"
    );

    public Object decode(String text) throws TONLException {
        String[] lines = text.split("\n");
        // ... parse
    }
}
```

---

## Reference Implementation (TypeScript)

The reference implementation is available at:
- **GitHub:** https://github.com/ersinkoc/tonl
- **NPM:** https://www.npmjs.com/package/tonl
- **Version:** 1.0.1

**Key Files to Study:**
- `src/encode.ts` - Complete encoder implementation
- `src/decode.ts` - Complete decoder implementation
- `src/parser.ts` - Line parsing and header parsing
- `src/infer.ts` - Type inference and coercion
- `src/utils/strings.ts` - Quoting and escaping utilities

**Test Suite:**
- `test/encode_decode_roundtrip.test.ts` - 100 round-trip tests
- `test/edge-cases.test.ts` - Edge case coverage
- `test/parser.test.ts` - Parser unit tests

---

## Format Specification Summary

### Document Structure

```
TONL Document ::= Headers DataSection

Headers ::= VersionHeader? DelimiterHeader? SchemaDirective*

VersionHeader ::= "#version" VersionNumber
DelimiterHeader ::= "#delimiter" Delimiter
SchemaDirective ::= "@" Identifier Value*

DataSection ::= Block+

Block ::= ObjectBlock | ArrayBlock | KeyValuePair

ObjectBlock ::= ObjectHeader "\n" IndentedContent

ArrayBlock ::= ArrayHeader "\n" IndentedContent

KeyValuePair ::= Identifier ":" Value

ObjectHeader ::= Identifier "{" ColumnList "}" ":"

ArrayHeader ::= Identifier "[" Number "]" "{" ColumnList? "}" ":"

ColumnList ::= Column ("," Column)*

Column ::= Identifier (":" TypeHint)?

TypeHint ::= "u32" | "i32" | "f64" | "bool" | "null" | "str" | "obj" | "list"

Value ::= Primitive | QuotedString | TripleQuotedString

Primitive ::= Number | Boolean | Null | Identifier

QuotedString ::= '"' (Character | '""')* '"'

TripleQuotedString ::= '"""' (Character | '\"""')* '"""'

Delimiter ::= "," | "|" | "\t" | ";"

Number ::= Integer | Float | Scientific | SpecialNumber

Integer ::= "-"? Digit+

Float ::= "-"? Digit* "." Digit+

Scientific ::= (Integer | Float) [eE] [+-]? Digit+

SpecialNumber ::= "Infinity" | "-Infinity" | "NaN"

Boolean ::= "true" | "false"

Null ::= "null"

Identifier ::= [a-zA-Z_] [a-zA-Z0-9_]*
```

---

## Version History and Compatibility

### Version 1.0 (Current)

**Features:**
- All core encoding/decoding
- Type hints
- Multiple delimiters
- Multiline strings
- Circular reference detection
- Strict mode

**Breaking Changes from 0.x:**
- None - fully backward compatible

**Recommendation:** Target v1.0 for new implementations

---

## Additional Resources

### Documentation
- [API Reference](./API.md)
- [Format Specification](./SPECIFICATION.md)
- [Getting Started](./GETTING_STARTED.md)

### Reference Implementation
- **Language:** TypeScript
- **Repo:** https://github.com/ersinkoc/tonl
- **Tests:** 496 passing tests
- **License:** MIT

### Community
- **Issues:** https://github.com/ersinkoc/tonl/issues
- **Discussions:** https://github.com/ersinkoc/tonl/discussions

---

## FAQ for Implementers

### Q: Do I need to support all features?

**A:** Minimum viable implementation:
- Basic encode/decode
- At least comma delimiter
- Quote handling
- Round-trip fidelity for basic types

Optional but recommended:
- All 4 delimiters
- Type hints
- Smart encoding
- Strict mode

### Q: How do I handle language-specific types?

**A:** Map to TONL's basic types:
- **Python:** `None` → `null`, `True/False` → `bool`
- **Go:** `nil` → `null`, `true/false` → `bool`, `int` → `i32`/`f64`
- **Rust:** `Option::None` → `null`, `bool` → `bool`, `i32/u32` → `i32/u32`
- **Java:** `null` → `null`, `Boolean` → `bool`, `Integer` → `i32`

### Q: What about custom types?

**A:** Serialize to basic JSON-compatible structure first:
```python
# Python example
from datetime import datetime

def prepare_for_tonl(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()  # Convert to string
    # ... handle other custom types
    return obj

data = prepare_for_tonl(my_data)
tonl = encode(data)
```

### Q: How to handle large files?

**A:** Implement streaming:
1. Read file in chunks
2. Parse block-by-block (blocks separated by double newline)
3. Yield/emit each parsed block
4. Don't load entire file into memory

### Q: Performance targets?

**A:** Reference benchmarks (TypeScript implementation):
- Encoding: ~50MB/sec
- Decoding: ~40MB/sec
- Delimiter detection: < 0.1ms for 10KB
- Query (simple): < 0.1ms
- Query (filter): < 50ms for 1000 items

---

## Validation and Compliance

### Compliance Test Suite

To be considered a compliant TONL implementation, your library must:

1. **Pass all 17 required test cases** (listed in "Test Suite Requirements")
2. **Round-trip fidelity** for all JSON-compatible types
3. **Correct delimiter handling** for all 4 delimiters
4. **Proper quote escaping** (doubled quotes, backslashes)
5. **Type inference** matches reference implementation
6. **Error handling** for malformed input

### Test Your Implementation

```bash
# Clone reference implementation
git clone https://github.com/ersinkoc/tonl.git
cd tonl

# Use test fixtures
cat test/fixtures/sample.json

# Encode with reference
tonl encode test/fixtures/sample.json > reference.tonl

# Compare with your implementation
your-encoder test/fixtures/sample.json > yours.tonl
diff reference.tonl yours.tonl  # Should be identical (or semantically equivalent)

# Decode test
tonl decode yours.tonl > decoded.json
diff test/fixtures/sample.json decoded.json  # Should be identical
```

---

## License and Attribution

This specification and reference implementation are released under the MIT License.

When implementing TONL in other languages:
- You MAY use this specification freely
- You SHOULD credit the original TONL project
- You MAY create compatible implementations
- You SHOULD link to this reference

**Suggested attribution:**
```
This library implements the TONL format specification.
TONL spec: https://github.com/ersinkoc/tonl/blob/main/docs/IMPLEMENTATION_REFERENCE.md
```

---

**Last Updated:** 2025-11-04
**Specification Version:** 1.0.1
**Maintainer:** Ersin KOÇ (ersinkoc@gmail.com)
**Reference Implementation:** https://github.com/ersinkoc/tonl

---

**Happy implementing! 🚀**

For questions or clarifications, please open an issue on GitHub.
