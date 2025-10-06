# TONL API Documentation

This document provides detailed API documentation for the TONL TypeScript library.

## Core Functions

### `encodeTONL(input, options?)`

Encodes JavaScript/TypeScript data to TONL format string.

#### Parameters

- **`input: any`** - The data to encode (object, array, primitive, etc.)
- **`options?: EncodeOptions`** - Optional encoding configuration

#### Returns

- **`string`** - The TONL formatted string

#### Options

```typescript
interface EncodeOptions {
  delimiter?: "," | "|" | "\t" | ";";    // Field delimiter (default: ",")
  includeTypes?: boolean;                // Add type hints to headers (default: false)
  version?: string;                      // TONL version (default: "1.0")
  indent?: number;                       // Spaces per indentation level (default: 2)
  singleLinePrimitiveLists?: boolean;    // Use single line for primitive arrays (default: true)
}
```

#### Examples

```typescript
import { encodeTONL } from 'tonl';

const data = {
  users: [
    { id: 1, name: "Alice", active: true },
    { id: 2, name: "Bob", active: false }
  ]
};

// Basic encoding
const tonl1 = encodeTONL(data);

// With custom delimiter and type hints
const tonl2 = encodeTONL(data, {
  delimiter: "|",
  includeTypes: true,
  indent: 4
});

// Result:
// #version 1.0
// #delimiter "|"
// users[2]{id:u32,name:str,active:bool}:
// 1|Alice|true
// 2|Bob|false
```

---

### `decodeTONL(text, options?)`

Decodes TONL format string back to JavaScript objects.

#### Parameters

- **`text: string`** - The TONL formatted string to decode
- **`options?: DecodeOptions`** - Optional decoding configuration

#### Returns

- **`any`** - The decoded JavaScript data

#### Options

```typescript
interface DecodeOptions {
  delimiter?: "," | "|" | "\t" | ";";    // Field delimiter (auto-detected if not specified)
  strict?: boolean;                      // Strict mode validation (default: false)
}
``#### Examples

```typescript
import { decodeTONL } from 'tonl';

const tonlText = `#version 1.0
users[2]{id:u32,name:str,active:bool}:
  1, Alice, true
  2, Bob, false`;

// Basic decoding
const data1 = decodeTONL(tonlText);

// With strict mode
const data2 = decodeTONL(tonlText, { strict: true });

// Result:
// {
//   users: [
//     { id: 1, name: "Alice", active: true },
//     { id: 2, name: "Bob", active: false }
//   ]
// }
```

---

### `encodeSmart(input, options?)`

Automatically chooses optimal encoding settings based on data analysis.

#### Parameters

- **`input: any`** - The data to encode
- **`options?: EncodeOptions`** - Optional base configuration (smart options may override)

#### Returns

- **`string`** - The optimized TONL formatted string

#### Smart Optimization Logic

1. **Delimiter Selection**: Analyzes data to choose delimiter that minimizes quoting
2. **Type Hint Decision**: Adds type hints only when beneficial for validation
3. **Layout Optimization**: Chooses between tabular and nested formats
4. **Compression**: Applies whitespace optimization where appropriate

#### Examples

```typescript
import { encodeSmart } from 'tonl';

const data = {
  items: [
    { name: "Item A", category: "Tools, Hardware" },
    { name: "Item B", category: "Electronics" }
  ]
};

// Smart encoding will use "|" delimiter to avoid quoting commas
const optimized = encodeSmart(data);

// Result:
// #version 1.0
// #delimiter "|"
// items[2]{name:str,category:str}:
// Item A|Tools, Hardware
// Item B|Electronics
```

## Utility Functions

### `parseTONLLine(line, delimiter)`

Parses a single TONL line into array of field values.

#### Parameters

- **`line: string`** - The TONL line to parse
- **`delimiter: string`** - The field delimiter

#### Returns

- **`string[]`** - Array of parsed field values

#### Examples

```typescript
import { parseTONLLine } from 'tonl';

const line1 = '1, Alice, admin';
const fields1 = parseTONLLine(line1, ',');
// Result: ['1', 'Alice', 'admin']

const line2 = '2, "Bob, Jr.", "super, admin"';
const fields2 = parseTONLLine(line2, ',');
// Result: ['2', 'Bob, Jr.', 'super, admin']
```

### `inferPrimitiveType(value)`

Infers the primitive type of a value for type hint generation.

#### Parameters

- **`value: unknown`** - The value to analyze

#### Returns

- **`"u32" | "i32" | "f64" | "bool" | "null" | "str" | "obj" | "list"`** - The inferred type

#### Examples

```typescript
import { inferPrimitiveType } from 'tonl';

inferPrimitiveType(42);        // "u32"
inferPrimitiveType(-10);       // "i32"
inferPrimitiveType(3.14);      // "f64"
inferPrimitiveType(true);      // "bool"
inferPrimitiveType(null);      // "null"
inferPrimitiveType("hello");   // "str"
inferPrimitiveType([1,2,3]);   // "list"
inferPrimitiveType({a: 1});    // "obj"
```

## Data Types

### Primitive Types

| Type | Description | Example |
|------|-------------|---------|
| `str` | String values | `"hello world"` |
| `u32` | Unsigned 32-bit integer | `42` |
| `i32` | Signed 32-bit integer | `-10` |
| `f64` | 64-bit floating point | `3.14` |
| `bool` | Boolean values | `true` / `false` |
| `null` | Null value | `null` |

### Complex Types

| Type | Description | TONL Format |
|------|-------------|-------------|
| `obj` | Object/dictionary | Nested block with `{}` header |
| `list` | Array/list | Tabular format or inline list |

## Error Handling

### Common Exceptions

1. **Parse Error**: Invalid TONL syntax
   ```typescript
   try {
     decodeTONL('invalid syntax');
   } catch (error) {
     console.error('Parse error:', error.message);
   }
   ```

2. **Strict Mode Violation**: Data doesn't match header specification
   ```typescript
   try {
     decodeTONL('users[2]:\n  1, Alice\n  2, Bob, extra', { strict: true });
   } catch (error) {
     console.error('Strict mode error:', error.message);
   }
   ```

3. **Type Coercion Error**: Invalid type conversion
   ```typescript
   // Will throw if type hints are present and values can't be coerced
   decodeTONL('value[u32]: "not-a-number"');
   ```

## Advanced Usage

### Custom Type Hints

```typescript
const data = { user: { id: 1, name: "Alice" } };

const tonl = encodeTONL(data, {
  includeTypes: true
});

// Result includes type hints:
// user{id:u32,name:str}:
//   id: 1
//   name: Alice
```

### Multiline Strings

```typescript
const data = {
  description: "Line 1\nLine 2\nLine 3"
};

const tonl = encodeTONL(data);

// Result:
// root{description:str}:
//   description: """Line 1
// Line 2
// Line 3"""
```

### Special Character Handling

```typescript
const data = {
  path: "C:\\Users\\Name\\Documents",
  quote: 'He said: "Hello, world!"',
  delimiter: "Value, with, commas"
};

const tonl = encodeTONL(data);

// Result with proper escaping:
// root{path,str,quote,delimiter}:
//   path: "C:\\Users\\Name\\Documents"
//   quote: "He said: ""Hello, world!"""
//   delimiter: "Value, with, commas"
```

## Performance Considerations

### Encoding Performance
- Linear time complexity O(n) where n is the size of input data
- Memory efficient: uses array joins instead of string concatenation
- Type inference is cached for repeated patterns

### Decoding Performance
- Single-pass parsing with minimal backtracking
- Efficient state machine for quote/delimiter handling
- Lazy evaluation of type coercion

### Optimization Tips
1. Use `encodeSmart()` for automatic optimization
2. Choose appropriate delimiter based on data characteristics
3. Enable strict mode only when validation is needed
4. Consider omitting type hints for maximum compactness

## TypeScript Integration

### Type Safety

```typescript
interface User {
  id: number;
  name: string;
  role: string;
}

const data = {
  users: [] as User[]
};

// Encode with type safety
const tonl = encodeTONL(data);

// Decode with type assertion
const decoded = decodeTONL(tonl) as { users: User[] };
```

### Generic Helper Functions

```typescript
function encodeTyped<T>(data: T, options?: EncodeOptions): string {
  return encodeTONL(data, options);
}

function decodeTyped<T>(text: string, options?: DecodeOptions): T {
  return decodeTONL(text, options) as T;
}

// Usage
const users = encodeTyped<User[]>(userData);
const restored = decodeTyped<User[]>(tonlText);
```

## Browser Compatibility

TONL works in modern browsers and Node.js environments:

```typescript
// Browser usage
import { encodeTONL, decodeTONL } from 'tonl';

// Node.js usage
const { encodeTONL, decodeTONL } = require('tonl');
```

### ES Module Support

```html
<script type="module">
  import { encodeTONL, decodeTONL } from 'https://cdn.skypack.dev/tonl';

  const data = { hello: 'world' };
  const tonl = encodeTONL(data);
</script>
```