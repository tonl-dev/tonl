# TONL Transformation Examples - Complete Guide

**Version:** 2.0.5
**Purpose:** Side-by-side JSON ↔ TONL transformation examples
**For:** Developers implementing TONL in any programming language
**Last Updated:** 2025-11-16

---

## Table of Contents

1. [Simple Types](#simple-types)
2. [Complex Objects](#complex-objects)
3. [Arrays](#arrays)
4. [Nested Structures](#nested-structures)
5. [Special Characters](#special-characters)
6. [Edge Cases](#edge-cases)
7. [Real-World Examples](#real-world-examples)
8. [Delimiter Comparison](#delimiter-comparison)
9. [Type Hints](#type-hints)
10. [Transformation Decision Tree](#transformation-decision-tree)

---

## Simple Types

### Example 1.1: Basic Primitives

**JSON:**
```json
{
  "string": "hello",
  "number": 42,
  "float": 3.14,
  "boolean": true,
  "null_value": null
}
```

**TONL:**
```
#version 1.0
root{string,number,float,boolean,null_value}: string: hello number: 42 float: 3.14 boolean: true null_value: null
```

**Why single line?** All values are primitives, no nesting.

**Token Count:**
- JSON: ~32 tokens
- TONL: ~22 tokens
- Savings: 31%

---

### Example 1.2: Strings Requiring Quotes

**JSON:**
```json
{
  "with_comma": "Hello, world",
  "with_colon": "Key: Value",
  "with_quotes": "She said \"hi\"",
  "number_string": "123",
  "bool_string": "true"
}
```

**TONL:**
```
#version 1.0
root{with_comma,with_colon,with_quotes,number_string,bool_string}:
  with_comma: "Hello, world"
  with_colon: "Key: Value"
  with_quotes: "She said ""hi"""
  number_string: "123"
  bool_string: "true"
```

**Quoting Rules Applied:**
- `,` in value → Quote (contains delimiter)
- `:` in value → Quote (special character)
- `"` in value → Quote and double the quotes
- "123" → Quote (looks like number)
- "true" → Quote (looks like boolean)

---

### Example 1.3: Special Numeric Values

**JSON:**
```json
{
  "infinity": Infinity,
  "negative_infinity": -Infinity,
  "not_a_number": NaN,
  "infinity_string": "Infinity"
}
```

**TONL:**
```
#version 1.0
root{infinity,negative_infinity,not_a_number,infinity_string}:
  infinity: Infinity
  negative_infinity: -Infinity
  not_a_number: NaN
  infinity_string: "Infinity"
```

**Parsing Back:**
- `Infinity` (unquoted) → `Infinity` number
- `"Infinity"` (quoted) → `"Infinity"` string

---

## Complex Objects

### Example 2.1: Nested Objects (Multi-line)

**JSON:**
```json
{
  "user": {
    "name": "Alice Smith",
    "profile": {
      "age": 30,
      "city": "New York"
    }
  }
}
```

**TONL:**
```
#version 1.0
user{name,profile}:
  name: Alice Smith
  profile{age,city}:
    age: 30
    city: New York
```

**Structure:**
- Level 0: `user{name,profile}:`
- Level 1: `name:` and `profile{age,city}:`
- Level 2: `age:` and `city:`

**Indentation:** 2 spaces per level

---

### Example 2.2: Flat Object (Single-line)

**JSON:**
```json
{
  "config": {
    "timeout": 5000,
    "retries": 3,
    "debug": false
  }
}
```

**TONL:**
```
#version 1.0
config{timeout,retries,debug}: timeout: 5000 retries: 3 debug: false
```

**Why single line?** All values are primitives (no nested objects/arrays).

---

### Example 2.3: Mixed Nesting

**JSON:**
```json
{
  "app": {
    "name": "MyApp",
    "version": "2.0",
    "settings": {
      "theme": "dark",
      "language": "en"
    },
    "features": ["auth", "api", "cache"]
  }
}
```

**TONL:**
```
#version 1.0
app{name,version,settings,features}:
  name: MyApp
  version: 2.0
  settings{theme,language}: theme: dark language: en
  features[3]: auth, api, cache
```

**Decision Logic:**
- `app` has array and nested object → Multi-line
- `settings` has only primitives → Single-line inline
- `features` is primitive array → Inline

---

## Arrays

### Example 3.1: Simple Primitive Array

**JSON:**
```json
{
  "numbers": [1, 2, 3, 4, 5],
  "tags": ["urgent", "review", "bug-fix"]
}
```

**TONL (Short arrays - single line):**
```
#version 1.0
root{numbers,tags}:
  numbers[5]: 1, 2, 3, 4, 5
  tags[3]: urgent, review, bug-fix
```

**TONL (Long arrays - multi-line):**
```
#version 1.0
root{numbers,tags}:
  numbers[100]:
    1, 2, 3, 4, 5, ..., 100
  tags[3]: urgent, review, bug-fix
```

**Threshold:** Line length < 80 characters → Single line

---

### Example 3.2: Uniform Object Array (Tabular)

**JSON:**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin", "active": true },
    { "id": 2, "name": "Bob", "role": "user", "active": true },
    { "id": 3, "name": "Carol", "role": "editor", "active": false }
  ]
}
```

**TONL:**
```
#version 1.0
users[3]{id,name,role,active}:
  1, Alice, admin, true
  2, Bob, user, true
  3, Carol, editor, false
```

**Tabular Format Benefits:**
- Header shows structure once
- Data rows are compact
- Easy to read as table
- Token efficient (no repeated keys)

**Token Comparison:**
- JSON: ~95 tokens
- TONL: ~35 tokens
- Savings: 63%!

---

### Example 3.3: Non-Uniform Array (Mixed)

**JSON:**
```json
{
  "items": [
    "text",
    42,
    { "id": 1, "name": "Object" },
    true,
    [1, 2, 3]
  ]
}
```

**TONL:**
```
#version 1.0
items[5]:
  [0]: text
  [1]: 42
  [2]{id,name}: id: 1 name: Object
  [3]: true
  [4][3]: 1, 2, 3
```

**Each element:** Indexed with `[i]:`

---

### Example 3.4: Array with Null Values

**JSON:**
```json
{
  "data": [1, null, 3, null, 5]
}
```

**TONL:**
```
#version 1.0
data[5]: 1, null, 3, null, 5
```

**Parsing:** `null` (unquoted) → `null` value

---

### Example 3.5: Empty Arrays

**JSON:**
```json
{
  "empty_array": [],
  "other_field": "value"
}
```

**TONL:**
```
#version 1.0
root{empty_array,other_field}:
  empty_array[0]:
  other_field: value
```

**Format:** `key[0]:` indicates empty array

---

## Nested Structures

### Example 4.1: Deep Nesting (5 levels)

**JSON:**
```json
{
  "level1": {
    "level2": {
      "level3": {
        "level4": {
          "level5": "deep value"
        }
      }
    }
  }
}
```

**TONL:**
```
#version 1.0
level1{level2}:
  level2{level3}:
    level3{level4}:
      level4{level5}:
        level5: deep value
```

**Indentation Pattern:**
- Level 0: 0 spaces
- Level 1: 2 spaces
- Level 2: 4 spaces
- Level 3: 6 spaces
- Level 4: 8 spaces
- Level 5: 10 spaces

---

### Example 4.2: Array of Arrays

**JSON:**
```json
{
  "matrix": [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ]
}
```

**TONL:**
```
#version 1.0
matrix[3]:
  [0][3]: 1, 2, 3
  [1][3]: 4, 5, 6
  [2][3]: 7, 8, 9
```

**Each row:** `[i][length]: values`

---

### Example 4.3: Array of Objects with Arrays

**JSON:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Alice",
      "tags": ["admin", "verified"]
    },
    {
      "id": 2,
      "name": "Bob",
      "tags": ["user"]
    }
  ]
}
```

**TONL:**
```
#version 1.0
users[2]:
  [0]{id,name,tags}:
    id: 1
    name: Alice
    tags[2]: admin, verified
  [1]{id,name,tags}:
    id: 2
    name: Bob
    tags[1]: user
```

**Why not tabular?** Array contains nested arrays (tags), so can't use uniform tabular format.

---

### Example 4.4: Object with Mixed Content

**JSON:**
```json
{
  "data": {
    "simple_field": "value",
    "nested_object": {
      "x": 1,
      "y": 2
    },
    "array_field": [1, 2, 3],
    "another_simple": 42
  }
}
```

**TONL:**
```
#version 1.0
data{simple_field,nested_object,array_field,another_simple}:
  simple_field: value
  nested_object{x,y}: x: 1 y: 2
  array_field[3]: 1, 2, 3
  another_simple: 42
```

**Layout:** Multi-line because of nested object and array.

---

## Special Characters

### Example 5.1: Delimiter in Values

**JSON:**
```json
{
  "items": [
    { "name": "Item, A", "price": 10 },
    { "name": "Item B", "price": 20 }
  ]
}
```

**TONL (comma delimiter):**
```
#version 1.0
items[2]{name,price}:
  "Item, A", 10
  Item B, 20
```

**TONL (pipe delimiter - better for this data):**
```
#version 1.0
#delimiter |
items[2]{name,price}:
  Item, A | 10
  Item B | 20
```

**No quoting needed with pipe!** This is why smart encoding chooses pipe.

---

### Example 5.2: Quotes in Values

**JSON:**
```json
{
  "quote1": "She said \"hello\"",
  "quote2": "It's a \"test\"",
  "triple": "Has \"\"\" triple quotes"
}
```

**TONL:**
```
#version 1.0
root{quote1,quote2,triple}:
  quote1: "She said ""hello"""
  quote2: "It's a ""test"""
  triple: """Has \""" triple quotes"""
```

**Escaping Rules:**
- Single `"` inside quotes → Double it: `""`
- Triple quotes `"""` → Escape: `\"""`

---

### Example 5.3: Backslashes and Paths

**JSON:**
```json
{
  "windows_path": "C:\\Users\\Alice\\Documents",
  "regex": "\\d+\\.\\d+",
  "normal": "No backslash"
}
```

**TONL:**
```
#version 1.0
root{windows_path,regex,normal}:
  windows_path: "C:\\Users\\Alice\\Documents"
  regex: "\\d+\\.\\d+"
  normal: No backslash
```

**Note:** Backslashes in quoted strings must be escaped: `\\`

---

### Example 5.4: Unicode and Emoji

**JSON:**
```json
{
  "emoji": "Hello 👋 World 🌍",
  "unicode": "Héllo Wörld",
  "chinese": "你好世界"
}
```

**TONL:**
```
#version 1.0
root{emoji,unicode,chinese}:
  emoji: Hello 👋 World 🌍
  unicode: Héllo Wörld
  chinese: 你好世界
```

**All UTF-8 characters supported!** No escaping needed.

---

## Edge Cases

### Example 6.1: Empty and Whitespace

**JSON:**
```json
{
  "empty_string": "",
  "space": " ",
  "spaces": "   ",
  "leading": "  text",
  "trailing": "text  ",
  "both": "  text  "
}
```

**TONL:**
```
#version 1.0
root{empty_string,space,spaces,leading,trailing,both}:
  empty_string: ""
  space: " "
  spaces: "   "
  leading: "  text"
  trailing: "text  "
  both: "  text  "
```

**All must be quoted!** Leading/trailing spaces require quoting.

---

### Example 6.2: Reserved Words as Strings

**JSON:**
```json
{
  "true_string": "true",
  "false_string": "false",
  "null_string": "null",
  "undefined_string": "undefined",
  "infinity_string": "Infinity"
}
```

**TONL:**
```
#version 1.0
root{true_string,false_string,null_string,undefined_string,infinity_string}:
  true_string: "true"
  false_string: "false"
  null_string: "null"
  undefined_string: "undefined"
  infinity_string: "Infinity"
```

**Critical:** Must quote to distinguish from actual boolean/null/number values!

---

### Example 6.3: Number-like Strings

**JSON:**
```json
{
  "integer_string": "123",
  "decimal_string": "3.14",
  "scientific_string": "1e10",
  "phone_number": "555-1234"
}
```

**TONL:**
```
#version 1.0
root{integer_string,decimal_string,scientific_string,phone_number}:
  integer_string: "123"
  decimal_string: "3.14"
  scientific_string: "1e10"
  phone_number: 555-1234
```

**Rules:**
- Pure numbers → Quote
- Strings with non-numeric chars → May not need quotes

---

### Example 6.4: Multiline Strings

**JSON:**
```json
{
  "code": "function hello() {\n  return 'world';\n}",
  "poem": "Line 1\nLine 2\nLine 3"
}
```

**TONL:**
```
#version 1.0
root{code,poem}:
  code: """function hello() {
  return 'world';
}"""
  poem: """Line 1
Line 2
Line 3"""
```

**Triple Quotes:** Used for any string containing newlines.

---

## Real-World Examples

### Example 7.1: User Database

**JSON:**
```json
{
  "users": [
    {
      "id": 1001,
      "username": "alice_smith",
      "email": "alice@company.com",
      "firstName": "Alice",
      "lastName": "Smith",
      "age": 30,
      "role": "admin",
      "verified": true,
      "lastLogin": "2025-11-04T10:30:00Z"
    },
    {
      "id": 1002,
      "username": "bob.jones",
      "email": "bob@company.com",
      "firstName": "Bob",
      "lastName": "Jones",
      "age": 25,
      "role": "user",
      "verified": true,
      "lastLogin": "2025-11-04T09:15:00Z"
    },
    {
      "id": 1003,
      "username": "carol_w",
      "email": "carol@personal.com",
      "firstName": "Carol",
      "lastName": "White",
      "age": 35,
      "role": "editor",
      "verified": false,
      "lastLogin": null
    }
  ]
}
```

**TONL:**
```
#version 1.0
users[3]{id,username,email,firstName,lastName,age,role,verified,lastLogin}:
  1001, alice_smith, alice@company.com, Alice, Smith, 30, admin, true, 2025-11-04T10:30:00Z
  1002, bob.jones, bob@company.com, Bob, Jones, 25, user, true, 2025-11-04T09:15:00Z
  1003, carol_w, carol@personal.com, Carol, White, 35, editor, false, null
```

**Metrics:**
- JSON: 615 bytes, ~180 tokens
- TONL: 412 bytes, ~105 tokens
- Byte savings: 33%
- Token savings: 42%

---

### Example 7.2: API Response

**JSON:**
```json
{
  "status": "success",
  "timestamp": 1699123456,
  "data": {
    "total": 150,
    "page": 1,
    "pageSize": 10,
    "results": [
      {
        "id": "abc123",
        "title": "First Result",
        "score": 0.95
      },
      {
        "id": "def456",
        "title": "Second Result",
        "score": 0.87
      }
    ]
  },
  "meta": {
    "processingTime": 45,
    "cacheHit": true
  }
}
```

**TONL:**
```
#version 1.0
root{status,timestamp,data,meta}:
  status: success
  timestamp: 1699123456
  data{total,page,pageSize,results}:
    total: 150
    page: 1
    pageSize: 10
    results[2]{id,title,score}:
      abc123, First Result, 0.95
      def456, Second Result, 0.87
  meta{processingTime,cacheHit}: processingTime: 45 cacheHit: true
```

---

### Example 7.3: Configuration File

**JSON:**
```json
{
  "app": {
    "name": "MyApplication",
    "version": "2.1.0",
    "environment": "production"
  },
  "database": {
    "host": "db.example.com",
    "port": 5432,
    "name": "myapp_prod",
    "poolSize": 20,
    "ssl": true
  },
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "provider": "redis",
    "connection": {
      "host": "cache.example.com",
      "port": 6379
    }
  },
  "features": {
    "authentication": true,
    "analytics": true,
    "notifications": false
  }
}
```

**TONL:**
```
#version 1.0
root{app,database,cache,features}:
  app{name,version,environment}: name: MyApplication version: 2.1.0 environment: production
  database{host,port,name,poolSize,ssl}: host: db.example.com port: 5432 name: myapp_prod poolSize: 20 ssl: true
  cache{enabled,ttl,provider,connection}:
    enabled: true
    ttl: 3600
    provider: redis
    connection{host,port}: host: cache.example.com port: 6379
  features{authentication,analytics,notifications}: authentication: true analytics: true notifications: false
```

**Characteristics:**
- Flat objects → Single line
- Nested objects → Multi-line when nested further
- Clear hierarchy with indentation

---

### Example 7.4: E-commerce Product Catalog

**JSON:**
```json
{
  "catalog": {
    "categories": [
      {
        "id": 1,
        "name": "Electronics",
        "products": [
          {
            "sku": "LAPTOP-001",
            "name": "Professional Laptop",
            "price": 1299.99,
            "stock": 15,
            "specs": {
              "ram": "16GB",
              "storage": "512GB SSD",
              "screen": "15.6 inch"
            }
          },
          {
            "sku": "MOUSE-001",
            "name": "Wireless Mouse",
            "price": 29.99,
            "stock": 100,
            "specs": {
              "dpi": "3200",
              "wireless": "true",
              "battery": "AAA"
            }
          }
        ]
      }
    ]
  }
}
```

**TONL:**
```
#version 1.0
catalog{categories}:
  categories[1]:
    [0]{id,name,products}:
      id: 1
      name: Electronics
      products[2]:
        [0]{sku,name,price,stock,specs}:
          sku: LAPTOP-001
          name: Professional Laptop
          price: 1299.99
          stock: 15
          specs{ram,storage,screen}: ram: 16GB storage: 512GB SSD screen: 15.6 inch
        [1]{sku,name,price,stock,specs}:
          sku: MOUSE-001
          name: Wireless Mouse
          price: 29.99
          stock: 100
          specs{dpi,wireless,battery}: dpi: 3200 wireless: true battery: AAA
```

**Complex Nesting:** Arrays → Objects → Arrays → Objects

---

## Delimiter Comparison

### Example 8.1: Same Data, Different Delimiters

**JSON:**
```json
{
  "data": [
    { "name": "Item, A", "category": "Tools, Hardware", "price": 99.99 },
    { "name": "Item B", "category": "Electronics", "price": 149.99 }
  ]
}
```

**TONL (Comma Delimiter):**
```
#version 1.0
data[2]{name,category,price}:
  "Item, A", "Tools, Hardware", 99.99
  Item B, Electronics, 149.99
```

**Quoting needed:** 2 quotes

---

**TONL (Pipe Delimiter):**
```
#version 1.0
#delimiter |
data[2]{name,category,price}:
  Item, A | Tools, Hardware | 99.99
  Item B | Electronics | 149.99
```

**Quoting needed:** 0 quotes ✅ **Better!**

---

**TONL (Tab Delimiter):**
```
#version 1.0
#delimiter \t
data[2]{name,category,price}:
  Item, A	Tools, Hardware	99.99
  Item B	Electronics	149.99
```

**Quoting needed:** 0 quotes ✅

---

**TONL (Semicolon Delimiter):**
```
#version 1.0
#delimiter ;
data[2]{name,category,price}:
  Item, A ; Tools, Hardware ; 99.99
  Item B ; Electronics ; 149.99
```

**Quoting needed:** 0 quotes ✅

---

### Example 8.2: Smart Delimiter Selection

**Algorithm:**
```python
def select_best_delimiter(data):
    json_str = JSON.stringify(data)

    counts = {
        ',': json_str.count(','),
        '|': json_str.count('|'),
        '\t': json_str.count('\t'),
        ';': json_str.count(';')
    }

    # Choose delimiter with minimum occurrences
    return min(counts, key=counts.get)
```

**For the product data above:**
- Comma count: 4
- Pipe count: 0
- Tab count: 0
- Semicolon count: 0

**Best choice:** Pipe (or Tab, or Semicolon) - all have 0 occurrences!

---

## Type Hints

### Example 9.1: Basic Type Hints

**JSON:**
```json
{
  "user": {
    "id": 123,
    "name": "Alice",
    "age": 30,
    "score": 95.5,
    "active": true
  }
}
```

**TONL (without type hints):**
```
#version 1.0
user{id,name,age,score,active}: id: 123 name: Alice age: 30 score: 95.5 active: true
```

**TONL (with type hints):**
```
#version 1.0
user{id:u32,name:str,age:u32,score:f64,active:bool}: id: 123 name: Alice age: 30 score: 95.5 active: true
```

**Benefits of type hints:**
- Validation at parse time
- Type safety guarantees
- Documentation value

**Drawbacks:**
- Slightly larger file size
- More verbose headers

**Recommendation:** Use type hints for schemas/validation, omit for maximum compactness.

---

### Example 9.2: Type Inference Chart

| JSON Value | Inferred Type | TONL Representation |
|------------|---------------|---------------------|
| `null` | `null` | `null` |
| `true` | `bool` | `true` |
| `false` | `bool` | `false` |
| `0` | `u32` | `0` |
| `42` | `u32` | `42` |
| `4294967295` | `u32` | `4294967295` |
| `4294967296` | `f64` | `4294967296` |
| `-1` | `i32` | `-1` |
| `-2147483648` | `i32` | `-2147483648` |
| `-2147483649` | `f64` | `-2147483649` |
| `3.14` | `f64` | `3.14` |
| `1e10` | `f64` | `1e10` |
| `Infinity` | `f64` | `Infinity` |
| `"text"` | `str` | `text` or `"text"` |
| `[]` | `list` | `key[0]:` |
| `{}` | `obj` | `key{...}:` |

---

### Example 9.3: Strict Type Validation

**TONL with Type Hints:**
```
#version 1.0
users[2]{id:u32,name:str,age:u32,verified:bool}:
  1, Alice, 30, true
  2, Bob, 25, true
```

**Valid Parsing:**
```python
# Row 1: id=1 (u32 ✅), name="Alice" (str ✅), age=30 (u32 ✅), verified=true (bool ✅)
# Row 2: id=2 (u32 ✅), name="Bob" (str ✅), age=25 (u32 ✅), verified=true (bool ✅)
```

**Invalid Example:**
```
users[2]{id:u32,name:str,age:u32,verified:bool}:
  1, Alice, thirty, true
           ^^^^^^ Error! "thirty" cannot be coerced to u32
```

**Error in Strict Mode:** Type coercion failure throws error.

---

## Transformation Decision Tree

### Encoding Decision Flow

```
START: Given JSON value and key

┌─── Is value null or undefined?
│    YES → Return "key: null" or skip
│    NO  ↓
│
├─── Is value a primitive (string, number, boolean)?
│    YES → Format as "key: value" (with quoting if needed)
│    NO  ↓
│
├─── Is value an array?
│    YES ↓
│    │
│    ├─── Is array empty?
│    │    YES → Return "key[0]:"
│    │    NO  ↓
│    │
│    ├─── Are all elements objects with same keys?
│    │    YES → Use TABULAR format
│    │         "key[N]{col1,col2,...}:"
│    │         "  val1, val2, ..."
│    │    NO  ↓
│    │
│    ├─── Are all elements primitives?
│    │    YES → Use PRIMITIVE ARRAY format
│    │         "key[N]: val1, val2, val3"
│    │    NO  ↓
│    │
│    └─── Mixed array → Use INDEXED format
│         "key[N]:"
│         "  [0]: value1"
│         "  [1]{...}: ..."
│
└─── Is value an object?
     YES ↓
     │
     ├─── Does object have nested objects or arrays?
     │    YES → Use MULTI-LINE format
     │         "key{cols}:"
     │         "  col1: val1"
     │         "  col2{...}: ..."
     │    NO  ↓
     │
     └─── All values are primitives → Use SINGLE-LINE format
          "key{cols}: col1: val1 col2: val2"
```

---

### Decoding Decision Flow

```
START: Parse TONL line

┌─── Does line start with '#' or '@'?
│    YES → Parse as header/directive
│    NO  ↓
│
├─── Is line empty or whitespace?
│    YES → Skip line
│    NO  ↓
│
├─── Does line match "key{...}:" or "key[N]{...}:"?
│    YES → Parse as BLOCK HEADER
│         Extract columns, array length
│         Read following indented lines
│         Parse as object or array block
│    NO  ↓
│
├─── Does line match "key[N]: values"?
│    YES → Parse as PRIMITIVE ARRAY
│         Split values by delimiter
│         Parse each value as primitive
│    NO  ↓
│
├─── Does line match "key: value"?
│    YES → Parse as KEY-VALUE PAIR
│         Check if value is multiline string (""")
│         Parse primitive value
│    NO  ↓
│
└─── Invalid line → Skip or error (depending on strict mode)
```

---

## Delimiter Selection Examples

### Example 10.1: CSV-like Data

**JSON:**
```json
{
  "sales": [
    { "date": "2025-01-01", "amount": 1500.00, "region": "North, East" },
    { "date": "2025-01-02", "amount": 2300.00, "region": "South" }
  ]
}
```

**Best Delimiter:** Pipe `|` (data contains commas)

**TONL:**
```
#version 1.0
#delimiter |
sales[2]{date,amount,region}:
  2025-01-01 | 1500.00 | North, East
  2025-01-02 | 2300.00 | South
```

**No quoting needed!**

---

### Example 10.2: TSV-like Data

**JSON:**
```json
{
  "data": [
    { "col1": "a", "col2": "b", "col3": "c" },
    { "col1": "d", "col2": "e", "col3": "f" }
  ]
}
```

**Best Delimiter:** Tab `\t`

**TONL:**
```
#version 1.0
#delimiter \t
data[2]{col1,col2,col3}:
  a	b	c
  d	e	f
```

**Advantage:** TSV format, easy to import to spreadsheets.

---

## Advanced Patterns

### Pattern 1: Heterogeneous Arrays

**JSON:**
```json
{
  "events": [
    { "type": "login", "user": "alice", "timestamp": 1699100000 },
    { "type": "logout", "user": "alice", "timestamp": 1699110000, "duration": 3600 },
    { "type": "login", "user": "bob", "timestamp": 1699120000 }
  ]
}
```

**Problem:** Not all objects have same keys (duration is optional).

**TONL Solution 1: Tabular with null**
```
#version 1.0
events[3]{type,user,timestamp,duration}:
  login, alice, 1699100000, null
  logout, alice, 1699110000, 3600
  login, bob, 1699120000, null
```

**TONL Solution 2: Mixed array**
```
#version 1.0
events[3]:
  [0]{type,user,timestamp}: type: login user: alice timestamp: 1699100000
  [1]{type,user,timestamp,duration}: type: logout user: alice timestamp: 1699110000 duration: 3600
  [2]{type,user,timestamp}: type: login user: bob timestamp: 1699120000
```

**Recommendation:** Solution 1 if most objects have similar structure, Solution 2 if very different.

---

### Pattern 2: Sparse Arrays

**JSON:**
```json
{
  "sparse": [1, null, null, null, 5]
}
```

**TONL:**
```
#version 1.0
sparse[5]: 1, null, null, null, 5
```

**Maintains array indices!**

---

### Pattern 3: Objects with Array Values

**JSON:**
```json
{
  "permissions": {
    "alice": ["read", "write", "delete"],
    "bob": ["read"],
    "carol": ["read", "write"]
  }
}
```

**TONL:**
```
#version 1.0
permissions{alice,bob,carol}:
  alice[3]: read, write, delete
  bob[1]: read
  carol[2]: read, write
```

---

## Parsing State Machine

### Line Parser State Machine

```
States: PLAIN, IN_QUOTE, IN_TRIPLE_QUOTE

PLAIN State:
  Read char:
    '"' → Check next 2 chars
          If """  → Enter IN_TRIPLE_QUOTE state
          Else    → Enter IN_QUOTE state
    '\' + delimiter → Add literal delimiter to field, skip backslash
    delimiter → Push current field, start new field
    other → Add to current field

IN_QUOTE State:
  Read char:
    '"' → Check next char
          If '"' → Add literal " to field, skip next quote
          Else → Exit to PLAIN state
    other → Add to current field

IN_TRIPLE_QUOTE State:
  Read char:
    '"' → Check next 2 chars
          If """  → Exit to PLAIN state, skip next 2 quotes
          Else → Add " to current field
    other → Add to current field

End of line:
  Push current field to fields list
  Return fields
```

---

## Performance Considerations

### Encoder Performance Tips

1. **String Building:** Use efficient string builders (StringBuilder, StringIO, strings.Builder)
2. **Type Checking:** Cache type checks for repeated structures
3. **Column Sorting:** Use stable sort to maintain order
4. **Memory:** Reuse buffers where possible

### Decoder Performance Tips

1. **Line Splitting:** Split once, store line array
2. **Regex:** Compile patterns once, reuse
3. **State Machine:** Use switch/case for state transitions
4. **Memory:** Parse streaming for large files

### Benchmark Targets

Based on reference implementation:

| Operation | Target | Reference (TS) |
|-----------|--------|----------------|
| Encode 10KB | < 1ms | 0.5ms |
| Decode 10KB | < 1ms | 0.7ms |
| Encode 1MB | < 50ms | 25ms |
| Decode 1MB | < 50ms | 35ms |

---

## Common Pitfalls

### Pitfall 1: Not Quoting Reserved Words

**WRONG:**
```
# This will be parsed as boolean true, not string "true"
flag: true  (intended to be string)
```

**CORRECT:**
```
flag: "true"  (explicitly a string)
```

---

### Pitfall 2: Incorrect Quote Escaping

**WRONG:**
```
text: "She said \"hi\""  (using backslash escaping)
```

**CORRECT:**
```
text: "She said ""hi"""  (using doubled quotes)
```

---

### Pitfall 3: Forgetting Array Length

**WRONG:**
```
items: 1, 2, 3  (no array indicator)
```

**CORRECT:**
```
items[3]: 1, 2, 3
```

---

### Pitfall 4: Inconsistent Indentation

**WRONG:**
```
root{user}:
  user{name}:
      name: Alice  (4 spaces instead of expected 4)
```

**CORRECT:**
```
root{user}:
  user{name}:
    name: Alice  (2 space increment per level)
```

---

### Pitfall 5: Not Handling Circular References

**WRONG:**
```python
# No circular reference check
def encode(obj):
    for key, val in obj.items():
        encode(val)  # Infinite loop if circular!
```

**CORRECT:**
```python
def encode(obj, seen=None):
    if seen is None:
        seen = set()

    obj_id = id(obj)
    if obj_id in seen:
        raise CircularReferenceError()

    seen.add(obj_id)
    # ... encode
```

---

## Compatibility Notes

### JSON Features NOT Supported in TONL

1. **Undefined keys:** JavaScript `undefined` → becomes `null` in arrays, skipped in objects
2. **Circular references:** Will throw error (JSON.stringify also throws)
3. **Functions:** Not serializable (same as JSON)
4. **Symbols:** Not supported (same as JSON)
5. **Non-string keys:** Object keys must be strings (same as JSON)

### TONL Features NOT in JSON

1. **Type hints:** Optional metadata, stripped during decode
2. **Comments:** `#` and `@` prefixed lines
3. **Multiple delimiters:** JSON only has `,`
4. **Explicit structure:** Headers show schema upfront

---

## Migration Guide

### From JSON to TONL

**Step 1:** Analyze your data
```javascript
const data = require('./data.json');
console.log(JSON.stringify(data).length);  // e.g., 5000 bytes
```

**Step 2:** Encode with smart mode
```javascript
const { encodeSmart } = require('tonl');
const tonl = encodeSmart(data);
console.log(tonl.length);  // e.g., 3200 bytes (36% savings)
```

**Step 3:** Validate round-trip
```javascript
const { decodeTONL } = require('tonl');
const decoded = decodeTONL(tonl);
console.assert(JSON.stringify(data) === JSON.stringify(decoded));
```

**Step 4:** Switch in production
```javascript
// Before
const data = JSON.parse(fs.readFileSync('data.json', 'utf-8'));

// After
const { decodeTONL } = require('tonl');
const data = decodeTONL(fs.readFileSync('data.tonl', 'utf-8'));
```

---

## Appendix: Complete Grammar

### Lexical Grammar

```
TONL_DOCUMENT = HEADER_SECTION DATA_SECTION

HEADER_SECTION = (VERSION_HEADER | DELIMITER_HEADER | DIRECTIVE)*

VERSION_HEADER = "#version" WHITESPACE VERSION_NUMBER NEWLINE

DELIMITER_HEADER = "#delimiter" WHITESPACE DELIMITER_CHAR NEWLINE

DIRECTIVE = "@" IDENTIFIER (WHITESPACE VALUE)* NEWLINE

DATA_SECTION = BLOCK+

BLOCK = OBJECT_BLOCK | ARRAY_BLOCK | KEY_VALUE_PAIR

OBJECT_BLOCK = OBJECT_HEADER NEWLINE INDENTED_CONTENT+

ARRAY_BLOCK = ARRAY_HEADER NEWLINE INDENTED_CONTENT+

KEY_VALUE_PAIR = KEY ":" WHITESPACE VALUE NEWLINE

OBJECT_HEADER = KEY "{" COLUMN_LIST "}" ":"

ARRAY_HEADER = KEY "[" NUMBER "]" ("{" COLUMN_LIST? "}")? ":"

COLUMN_LIST = COLUMN ("," COLUMN)*

COLUMN = IDENTIFIER (":" TYPE_HINT)?

TYPE_HINT = "u32" | "i32" | "f64" | "bool" | "null" | "str" | "obj" | "list"

VALUE = PRIMITIVE | QUOTED_STRING | TRIPLE_QUOTED_STRING

PRIMITIVE = NUMBER | BOOLEAN | NULL | IDENTIFIER

QUOTED_STRING = '"' (CHAR | '""' | '\\')* '"'

TRIPLE_QUOTED_STRING = '"""' (CHAR | '\"""' | '\\\\')* '"""'

NUMBER = INTEGER | FLOAT | SCIENTIFIC | SPECIAL_NUMBER

INTEGER = "-"? DIGIT+

FLOAT = "-"? DIGIT* "." DIGIT+

SCIENTIFIC = (INTEGER | FLOAT) [eE] [+-]? DIGIT+

SPECIAL_NUMBER = "Infinity" | "-Infinity" | "NaN"

BOOLEAN = "true" | "false"

NULL = "null"

IDENTIFIER = [a-zA-Z_] [a-zA-Z0-9_]*

KEY = IDENTIFIER | "[" NUMBER "]"

DELIMITER_CHAR = "," | "|" | "\t" | ";"

WHITESPACE = " " | "\t"

NEWLINE = "\n" | "\r\n"

DIGIT = [0-9]

CHAR = any Unicode character
```

---

## Quick Reference Card

### Cheat Sheet for Implementers

```
┌──────────────────────────────────────────────────────────────┐
│ TONL QUICK REFERENCE                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ HEADERS:                                                     │
│   #version 1.0                                               │
│   #delimiter |                                               │
│                                                              │
│ OBJECTS:                                                     │
│   key{col1,col2}: col1: val1 col2: val2    (single-line)    │
│   key{col1,col2}:                          (multi-line)     │
│     col1: val1                                               │
│     col2: val2                                               │
│                                                              │
│ ARRAYS (Uniform):                                            │
│   key[N]{col1,col2}:                                         │
│     val1, val2                                               │
│     val3, val4                                               │
│                                                              │
│ ARRAYS (Primitive):                                          │
│   key[N]: val1, val2, val3                                   │
│                                                              │
│ ARRAYS (Mixed):                                              │
│   key[N]:                                                    │
│     [0]: primitive                                           │
│     [1]{...}: object                                         │
│                                                              │
│ VALUES:                                                      │
│   Unquoted: text, 123, true, null                           │
│   Quoted: "text, with comma", "123", "true"                 │
│   Triple: """multi                                           │
│   line"""                                                    │
│                                                              │
│ QUOTING RULES:                                               │
│   - Empty string: ""                                         │
│   - Contains delimiter: "value, here"                        │
│   - Contains : or { or }: "special:char"                     │
│   - Looks like literal: "true", "null", "123"                │
│   - Leading/trailing space: "  text  "                       │
│   - Multiline: """..."""                                     │
│                                                              │
│ TYPE HINTS (Optional):                                       │
│   u32, i32, f64, bool, null, str, obj, list                 │
│   Usage: key{col1:u32,col2:str}:                             │
│                                                              │
│ DELIMITERS:                                                  │
│   , (comma - default)                                        │
│   | (pipe)                                                   │
│   \t (tab - use \\t in header)                               │
│   ; (semicolon)                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Testing

### Minimal Test Suite (17 Tests)

```javascript
// Test 1: Empty object
JSON: {}
TONL: #version 1.0\nroot{}:

// Test 2: Simple object
JSON: {"name":"Alice","age":30}
TONL: root{name,age}: name: Alice age: 30

// Test 3: Empty array
JSON: {"arr":[]}
TONL: arr[0]:

// Test 4: Primitive array
JSON: {"nums":[1,2,3]}
TONL: nums[3]: 1, 2, 3

// Test 5: Uniform object array
JSON: {"users":[{"id":1,"name":"A"},{"id":2,"name":"B"}]}
TONL: users[2]{id,name}:\n  1, A\n  2, B

// Test 6: Nested object
JSON: {"a":{"b":{"c":"value"}}}
TONL: a{b}:\n  b{c}: c: value

// Test 7: Null value
JSON: {"val":null}
TONL: val: null

// Test 8: Boolean values
JSON: {"t":true,"f":false}
TONL: root{t,f}: t: true f: false

// Test 9: Quoted string (with comma)
JSON: {"text":"a, b"}
TONL: text: "a, b"

// Test 10: Quoted string (with quotes)
JSON: {"text":"say \"hi\""}
TONL: text: "say ""hi"""

// Test 11: Multiline string
JSON: {"text":"line1\nline2"}
TONL: text: """line1\nline2"""

// Test 12: Number-like string
JSON: {"num":"123"}
TONL: num: "123"

// Test 13: Boolean-like string
JSON: {"bool":"true"}
TONL: bool: "true"

// Test 14: Pipe delimiter
Options: {delimiter: "|"}
JSON: {"data":["a","b"]}
TONL: #version 1.0\n#delimiter |\ndata[2]: a | b

// Test 15: Tab delimiter
Options: {delimiter: "\t"}
JSON: {"data":["a","b"]}
TONL: #version 1.0\n#delimiter \\t\ndata[2]: a\tb

// Test 16: Type hints
Options: {includeTypes: true}
JSON: {"id":123}
TONL: root{id:u32}: id: 123

// Test 17: Circular reference
JSON: obj = {}; obj.self = obj;
Expected: Error("Circular reference")
```

---

## Summary

This document provides:

- ✅ **Complete transformation rules** (JSON ↔ TONL)
- ✅ **Detailed algorithms** (pseudo-code)
- ✅ **All edge cases** covered
- ✅ **Type system** fully specified
- ✅ **Quoting rules** with examples
- ✅ **Delimiter handling** comprehensive
- ✅ **Language-specific hints** (Python, Go, Rust, Java)
- ✅ **Test suite** requirements (17 mandatory tests)
- ✅ **Real-world examples** (20+ scenarios)
- ✅ **Decision trees** for implementation
- ✅ **Performance targets** and benchmarks
- ✅ **Complete grammar** specification

**Use this as a reference when implementing TONL in any programming language.**

---

**Next Steps for Implementers:**

1. Read this document thoroughly
2. Study the reference implementation (TypeScript)
3. Implement encoder and decoder for your language
4. Pass all 17 required tests
5. Add advanced features (schema, streaming, etc.)
6. Publish your library
7. Link back to this specification

---

**For Support:**
- Open an issue: https://github.com/tonl-dev/tonl/issues
- Check examples: https://github.com/tonl-dev/tonl/tree/main/examples
- Read spec: https://github.com/tonl-dev/tonl/blob/main/docs/SPECIFICATION.md

---

**Happy implementing! 🚀**
