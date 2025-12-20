# TONL Browser API Documentation

**Version:** 2.5.1
**Status:** Stable & Production Ready
**Last Updated:** 2025-12-20

This document covers browser-specific usage of TONL, including bundled builds, CDN usage, and browser-safe APIs.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Browser Builds](#browser-builds)
4. [Core API](#core-api)
5. [TONLDocument (Browser)](#tonldocument-browser)
6. [Utility Functions](#utility-functions)
7. [Differences from Node.js](#differences-from-nodejs)
8. [Examples](#examples)
9. [Bundle Size](#bundle-size)

---

## Overview

TONL provides browser-safe builds that exclude Node.js-specific features (filesystem, readline, etc.) while maintaining full functionality for:

- Encoding/decoding TONL data
- Document querying and navigation
- Data modification and transformation
- Schema validation (in-memory only)
- Indexing for fast lookups

---

## Installation

### NPM/Yarn

```bash
npm install tonl
# or
yarn add tonl
```

### ES Modules (Recommended)

```javascript
// Import browser-specific build
import { encodeTONL, decodeTONL, TONLDocument } from 'tonl/browser';

// Or use the main entry (auto-detects browser environment)
import { encodeTONL, decodeTONL, TONLDocument } from 'tonl';
```

### CDN Usage

```html
<!-- ESM via CDN -->
<script type="module">
  import { encodeTONL, decodeTONL, TONLDocument } from 'https://unpkg.com/tonl/dist/browser/tonl.esm.js';

  const data = { name: 'Alice', age: 30 };
  const tonl = encodeTONL(data);
  console.log(tonl);
</script>
```

---

## Browser Builds

TONL provides multiple browser build formats in `dist/browser/`:

| File | Format | Use Case |
|------|--------|----------|
| `tonl.esm.js` | ES Modules | Modern bundlers (Vite, Webpack 5, Rollup) |
| `tonl.umd.js` | UMD | Legacy bundlers, `<script>` tags |
| `tonl.iife.js` | IIFE | Direct `<script>` inclusion |

### Build Commands

```bash
# Generate browser builds
npm run build:browser

# Build everything (Node.js + browser)
npm run build:all
```

---

## Core API

### `encodeTONL(data, options?)`

Encode JavaScript data to TONL format.

```typescript
function encodeTONL(data: any, options?: EncodeOptions): string
```

**Options:**
```typescript
interface EncodeOptions {
  delimiter?: ',' | '|' | '\t' | ';';  // Default: ','
  includeTypes?: boolean;              // Include type hints
  version?: string;                    // TONL version header
  indent?: number;                     // Indentation spaces
  singleLinePrimitiveLists?: boolean;  // Inline primitive arrays
}
```

**Example:**
```javascript
import { encodeTONL } from 'tonl/browser';

const data = {
  users: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]
};

const tonl = encodeTONL(data, { delimiter: ',' });
console.log(tonl);
// #version 1.0
// users[2]{id,name}:
//   1, Alice
//   2, Bob
```

---

### `decodeTONL(tonlText, options?)`

Decode TONL text to JavaScript data.

```typescript
function decodeTONL(tonlText: string, options?: DecodeOptions): any
```

**Example:**
```javascript
import { decodeTONL } from 'tonl/browser';

const tonl = `@v1.0
name: Alice
age: 30`;

const data = decodeTONL(tonl);
console.log(data); // { name: 'Alice', age: 30 }
```

---

### `encodeSmart(data, options?)`

Automatically choose the optimal delimiter based on data content.

```typescript
function encodeSmart(data: any, options?: EncodeOptions): string
```

**Example:**
```javascript
import { encodeSmart } from 'tonl/browser';

// Data with commas - will auto-select pipe delimiter
const data = { text: 'Hello, World' };
const tonl = encodeSmart(data);
// Uses '|' delimiter since data contains commas
```

---

### `preprocessJSON(jsonString)`

Transform problematic JSON keys to TONL-safe alternatives.

```typescript
function preprocessJSON(jsonString: string): any
```

**Key Transformations:**
| Original | Transformed |
|----------|-------------|
| `#` | `hash_key` |
| `""` (empty) | `empty_key` |
| `@` | `_at_` |
| `:` | `_colon_` |
| `.` | `_dot_` |
| ` ` (space) | `_space_` |
| `$` | `_dollar_` |

**Example:**
```javascript
import { preprocessJSON } from 'tonl/browser';

const json = '{"email@domain": "test", "#id": 123}';
const safe = preprocessJSON(json);
// { email_at_domain: 'test', hash_key: 123 }
```

---

## TONLDocument (Browser)

The browser version of `TONLDocument` provides the same API as the Node.js version, excluding file operations.

### Creating Documents

```javascript
import { TONLDocument } from 'tonl/browser';

// From TONL text
const doc1 = TONLDocument.parse(`
@v1.0
name: Alice
items: 1, 2, 3
`);

// From JavaScript data
const doc2 = TONLDocument.fromJSON({
  name: 'Bob',
  items: [4, 5, 6]
});
```

### Query Methods

```javascript
// Get value by path
const name = doc.get('name');           // 'Alice'
const first = doc.get('items[0]');      // 1

// Query with expressions
const items = doc.query('items[*]');    // [1, 2, 3]

// Check existence
const exists = doc.exists('name');      // true

// Get type
const type = doc.typeOf('items');       // 'array'
```

### Navigation Methods

```javascript
// Iterate entries
for (const [key, value] of doc.entries()) {
  console.log(`${key}: ${value}`);
}

// Walk all nodes
doc.walk((path, value, depth) => {
  console.log(`${path} (depth ${depth}): ${value}`);
});

// Find values
const found = doc.find(v => v === 'Alice');
const all = doc.findAll(v => typeof v === 'number');

// Predicates
const hasName = doc.some(v => v === 'Alice');
const allPositive = doc.every(v => typeof v !== 'number' || v > 0);

// Count nodes
const count = doc.countNodes();
```

### Modification Methods

```javascript
// Set values
doc.set('name', 'Charlie');
doc.set('items[0]', 10);

// Delete values
doc.delete('items[2]');

// Array operations
doc.push('items', 7);
const popped = doc.pop('items');

// Merge objects
doc.merge('settings', { theme: 'dark' });
```

### Export Methods

```javascript
// To JavaScript
const json = doc.toJSON();

// To TONL string
const tonl = doc.toTONL({ delimiter: '|' });

// Get statistics
const stats = doc.stats();
// { sizeBytes, nodeCount, maxDepth, arrayCount, objectCount, primitiveCount }
```

### Snapshot & Diff

```javascript
// Create snapshot
const snapshot = doc.snapshot();

// Make changes
doc.set('name', 'David');

// Compare
const changes = doc.diff(snapshot);
console.log(formatDiff(changes));
```

### Indexing

```javascript
// Create index for fast lookups
const index = doc.createIndex({
  name: 'user-id',
  fields: ['users[*].id']
});

// List indices
const indices = doc.listIndices();

// Drop index
doc.dropIndex('user-id');
```

---

## Utility Functions

### Parser Utilities

```javascript
import {
  parseTONLLine,
  parseHeaderLine,
  parseObjectHeader,
  detectDelimiter
} from 'tonl/browser';

// Parse a single line
const values = parseTONLLine('a, b, c', ',');
// ['a', 'b', 'c']

// Parse header directive
const header = parseHeaderLine('#version 1.0');
// { key: 'version', value: '1.0' }

// Parse object header
const objHeader = parseObjectHeader('users{}:');
// { key: 'users', ... }

// Detect delimiter from content
const delimiter = detectDelimiter('name, age\nAlice, 30');
// ','
```

### Type Inference

```javascript
import { inferPrimitiveType, coerceValue } from 'tonl/browser';

// Infer TONL type from JavaScript value
inferPrimitiveType('hello');    // 'str'
inferPrimitiveType(42);         // 'u32'
inferPrimitiveType(-10);        // 'i32'
inferPrimitiveType(3.14);       // 'f64'
inferPrimitiveType(true);       // 'bool'
inferPrimitiveType(null);       // 'null'
inferPrimitiveType([1, 2]);     // 'list'
inferPrimitiveType({ a: 1 });   // 'obj'

// Coerce string to typed value
coerceValue('42', 'u32');       // 42
coerceValue('true', 'bool');    // true
coerceValue('3.14', 'f64');     // 3.14
coerceValue('null', 'null');    // null
```

---

## Differences from Node.js

| Feature | Node.js | Browser |
|---------|---------|---------|
| `TONLDocument.load(path)` | ✅ | ❌ |
| `TONLDocument.save(path)` | ✅ | ❌ |
| `FileEditor` class | ✅ | ❌ |
| `TONLREPL` class | ✅ | ❌ |
| `loadSchemaFromFile()` | ✅ | ❌ |
| Streaming (fs.createReadStream) | ✅ | ❌ |
| All other APIs | ✅ | ✅ |

### Browser Alternatives

For file operations in browsers, use the File API:

```javascript
// Read file
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const text = await file.text();
  const doc = TONLDocument.parse(text);
});

// Download file
function downloadTONL(doc, filename) {
  const blob = new Blob([doc.toTONL()], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Examples

### React Component

```jsx
import { useState } from 'react';
import { TONLDocument, encodeTONL } from 'tonl/browser';

function TONLEditor() {
  const [data, setData] = useState({ name: '', items: [] });
  const [tonlOutput, setTonlOutput] = useState('');

  const handleEncode = () => {
    setTonlOutput(encodeTONL(data));
  };

  return (
    <div>
      <textarea
        value={JSON.stringify(data, null, 2)}
        onChange={e => setData(JSON.parse(e.target.value))}
      />
      <button onClick={handleEncode}>Encode to TONL</button>
      <pre>{tonlOutput}</pre>
    </div>
  );
}
```

### Vue 3 Composable

```javascript
import { ref, computed } from 'vue';
import { TONLDocument } from 'tonl/browser';

export function useTONL(initialData) {
  const doc = ref(TONLDocument.fromJSON(initialData));

  const get = (path) => doc.value.get(path);
  const set = (path, value) => {
    doc.value.set(path, value);
  };

  const tonl = computed(() => doc.value.toTONL());
  const json = computed(() => doc.value.toJSON());

  return { doc, get, set, tonl, json };
}
```

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>TONL Demo</title>
</head>
<body>
  <textarea id="input" rows="10" cols="50">{
  "name": "Alice",
  "items": [1, 2, 3]
}</textarea>
  <button id="encode">Encode</button>
  <pre id="output"></pre>

  <script type="module">
    import { encodeTONL, decodeTONL } from 'https://unpkg.com/tonl/dist/browser/tonl.esm.js';

    document.getElementById('encode').onclick = () => {
      const json = JSON.parse(document.getElementById('input').value);
      const tonl = encodeTONL(json);
      document.getElementById('output').textContent = tonl;
    };
  </script>
</body>
</html>
```

---

## Bundle Size

| Build | Size | Gzipped |
|-------|------|---------|
| ESM | ~45KB | ~12KB |
| UMD | ~48KB | ~13KB |
| IIFE | ~48KB | ~13KB |

### Tree Shaking

The ESM build supports tree-shaking. Import only what you need:

```javascript
// Minimal import (~5KB gzipped)
import { encodeTONL, decodeTONL } from 'tonl/browser';

// Full import (~12KB gzipped)
import {
  TONLDocument,
  encodeTONL,
  decodeTONL,
  encodeSmart,
  preprocessJSON
} from 'tonl/browser';
```

---

## TypeScript Support

All browser APIs are fully typed:

```typescript
import type {
  EncodeOptions,
  DecodeOptions,
  TONLValue,
  TONLObject,
  TONLArray,
  DocumentStats
} from 'tonl/browser';

import { TONLDocument, encodeTONL } from 'tonl/browser';

const doc: TONLDocument = TONLDocument.fromJSON({ name: 'Alice' });
const stats: DocumentStats = doc.stats();
```

---

## Browser Compatibility

| Browser | Version |
|---------|---------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 14+ |
| Edge | 80+ |

**Note:** Requires ES2020+ support. For older browsers, use a transpiler like Babel.
