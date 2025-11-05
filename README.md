<div align="center">

![TONL - Token-Optimized Notation Language](readme.png)

</div>

# TONL (Token-Optimized Notation Language)

**TONL** is a production-ready data platform that combines compact serialization with powerful query, modification, indexing, and streaming capabilities. Designed for LLM token efficiency while providing a rich API for data access and manipulation.

**🎉 Now v1.0.2 - Stable & Security Hardened!**

**🔒 SECURITY RELEASE (v1.0.2 - 2025-11-05)**: Critical security fixes for 9 vulnerabilities including ReDoS protection, path traversal prevention, prototype pollution defense, buffer overflow protection, command injection prevention, and comprehensive input validation. **All users should upgrade immediately.** See [SECURITY.md](SECURITY.md), [SECURITY-AUDIT-SUMMARY.md](SECURITY-AUDIT-SUMMARY.md), and [SECURITY-FIXES-SUMMARY.md](SECURITY-FIXES-SUMMARY.md) for complete details.

## ✨ Complete Feature Set (v1.0.0)

### Core Features
- **🗜️ Compact Format**: 32-45% smaller than JSON (bytes + tokens)
- **👁️ Human-readable**: Clear text format with minimal syntax overhead
- **🧠 LLM-optimized**: Designed specifically for token efficiency in language models
- **🔄 Round-trip safe**: Perfect bidirectional conversion with JSON
- **⚡ Fast**: All operations optimized (10-1600x faster than targets)
- **🛠️ TypeScript-first**: Full type safety and IntelliSense support
- **📦 Zero dependencies**: Pure TypeScript, no runtime dependencies

### Data Access (v0.6.0)
- **🔍 Query API**: JSONPath-like queries with filters and wildcards
- **🧭 Navigation API**: Tree traversal, iteration, and search utilities
- **🎯 Filter Expressions**: Complex conditions with operators (==, !=, >, <, &&, ||, contains, matches)
- **♻️ LRU Cache**: >90% cache hit rate on repeated queries

### Data Modification (v0.6.5)
- **✏️ CRUD Operations**: set(), delete(), push(), pop(), merge()
- **🔄 Change Tracking**: diff() engine with detailed change reports
- **💾 Atomic File Editing**: Safe saves with automatic backups
- **📸 Snapshots**: Document versioning and comparison

### Performance (v0.7.0)
- **🗂️ Hash Index**: O(1) lookups for exact matches
- **🌳 BTree Index**: O(log n) range queries and ordered access
- **🔗 Compound Index**: Multi-field indexing
- **📊 Index Manager**: Centralized index management

### Streaming (v0.7.5)
- **🌊 Stream Processing**: Handle multi-GB files with <100MB memory
- **🔄 Aggregation**: Reduce operations on streams
- **⛓️ Pipeline**: Chainable filter/map transformations

### Developer Tools (v0.8.0 → v1.0.0)
- **💻 Interactive REPL**: Explore data interactively
- **🎨 CLI Tools**: encode, decode, query, get, validate, format
- **✅ Schema Validation**: Full schema system with constraints
- **🌐 Browser Support**: Tiny bundles (8.84 KB gzipped)
- **🎨 VS Code Extension**: Syntax highlighting for .tonl files

## 🚀 Quick Start

### Installation

```bash
npm install tonl
```

**🏠 Homepage**: [tonl.dev](https://tonl.dev)
**📦 GitHub**: [github.com/ersinkoc/tonl](https://github.com/ersinkoc/tonl)

### Programmatic Usage

```typescript
import { TONLDocument, encodeTONL, decodeTONL } from 'tonl';

// === Method 1: TONLDocument API (NEW in v0.6.0!) ===
const doc = TONLDocument.fromJSON({
  users: [
    { id: 1, name: "Alice", role: "admin", age: 30 },
    { id: 2, name: "Bob", role: "user", age: 25 }
  ]
});

// Query with path expressions
doc.get('users[0].name');                          // 'Alice'
doc.query('users[*].name');                        // ['Alice', 'Bob']
doc.query('users[?(@.role == "admin")]');          // [{ id: 1, ... }]
doc.query('$..email');                             // All emails recursively

// Navigate and iterate
for (const [key, value] of doc.entries()) { ... }
doc.walk((path, value, depth) => { ... });

// Export
const tonl = doc.toTONL();
await doc.save('output.tonl');

// === Method 2: Classic Encode/Decode API ===
const data = {
  users: [
    { id: 1, name: "Alice", role: "admin" },
    { id: 2, name: "Bob, Jr.", role: "user" }
  ]
};

const tonlText = encodeTONL(data);
const restored = decodeTONL(tonlText);
```

### CLI Usage

```bash
# Encode JSON to TONL
tonl encode data.json --out data.tonl --smart --stats

# Decode TONL back to JSON
tonl decode data.tonl --out data.json

# Query data with path expressions (NEW in v0.6.0!)
tonl query users.tonl "users[?(@.role == 'admin')]"
tonl get data.json "user.profile.email"

# Validate data against schema
tonl validate users.tonl --schema users.schema.tonl --strict

# Format TONL files with pretty print
tonl format data.tonl --pretty --out formatted.tonl

# Compare sizes and token costs
tonl stats data.json --tokenizer gpt-5
```

## 📊 Quality Metrics (v1.0.2)

```
✅ Test Coverage:     496/496 tests (100%)
✅ Security Tests:    96 tests (exploit + regression)
✅ Security Hardened: 9 vulnerabilities fixed 🔒
✅ Code Quality:      TypeScript strict mode
✅ Dependencies:      0 runtime deps
✅ Bundle Size:       8.84 KB gzipped (browser)
✅ Performance:       10-1600x faster than targets
✅ Documentation:     15+ comprehensive guides
✅ Examples:          11 working examples
✅ Production:        Ready & Secure ✅
```

### Streaming API

```typescript
import { createEncodeStream, createDecodeStream } from 'tonl/stream';
import { createReadStream, createWriteStream } from 'fs';

// Stream large files efficiently
createReadStream('huge.json')
  .pipe(createEncodeStream({ smart: true }))
  .pipe(createWriteStream('huge.tonl'));

// Async iterators
import { encodeIterator, decodeIterator } from 'tonl/stream';

for await (const tonlLine of encodeIterator(dataStream)) {
  console.log(tonlLine);
}
```

### Browser Usage

```html
<!-- ESM (modern browsers) -->
<script type="module">
  import { encodeTONL, decodeTONL } from 'https://cdn.jsdelivr.net/npm/tonl@1.0.2/+esm';

  const data = { users: [{ id: 1, name: "Alice" }] };
  const tonl = encodeTONL(data);
  console.log(tonl);
</script>

<!-- UMD (universal) -->
<script src="https://unpkg.com/tonl@1.0.2/dist/browser/tonl.umd.js"></script>
<script>
  const tonl = TONL.encodeTONL({ hello: "world" });
</script>
```

**Bundle Sizes:**
- ESM: 12.56 KB gzipped
- UMD: 8.91 KB gzipped
- IIFE: 8.84 KB gzipped

## 📖 Format Specification

### Headers

```
#version 1.0
#delimiter ","    # Optional: , | | \t | ;
```

### Objects

```tonl
user{id:u32,name:str,contact:obj}:
  id: 1
  name: Alice
  contact{email:str,phone:str}:
    email: alice@example.com
    phone: +123456789
```

### Arrays of Objects (Tabular Format)

```tonl
users[3]{id:u32,name:str,role:str}:
  1, Alice, admin
  2, "Bob, Jr.", user
  3, Carol, editor
```

### Arrays of Primitives

```tonl
tags[3]: engineering, management, "ai/ml"
```

### Nested Structures

```tonl
project{id:u32,name:str,owner:obj,tasks:list}:
  id: 101
  name: Alpha
  owner{id:u32,name:str}:
    id: 1
    name: Alice
  tasks[1]{id:u32,title:str,status:str}:
    id: 201
    title: "Design API"
    status: done
```

## 🔧 API Reference

### `encodeTONL(input, options?)`

Encodes JavaScript data to TONL format.

```typescript
function encodeTONL(input: any, opts?: {
  delimiter?: "," | "|" | "\t" | ";";
  includeTypes?: boolean;
  version?: string;
  indent?: number;
  singleLinePrimitiveLists?: boolean;
}): string
```

### `decodeTONL(text, options?)`

Decodes TONL text back to JavaScript objects.

```typescript
function decodeTONL(text: string, opts?: {
  delimiter?: "," | "|" | "\t" | ";";
  strict?: boolean;
}): any
```

### `encodeSmart(input, options?)`

Automatically chooses optimal encoding settings.

```typescript
function encodeSmart(input: any, opts?: EncodeOptions): string
```

## ✅ Schema Validation (NEW in v0.4.0!)

TONL now includes a powerful schema validation system for ensuring data integrity.

### Schema Definition

Create a `.schema.tonl` file to define your data structure:

```tonl
@schema v1
@strict true
@description "User management schema"

# Define custom types
User: obj
  id: u32 required
  username: str required min:3 max:20 pattern:^[a-zA-Z0-9_]+$
  email: str required pattern:email lowercase:true
  age: u32? min:13 max:150
  roles: list<str> required min:1 unique:true

# Root schema
users: list<User> required min:1
totalCount: u32 required
```

### Programmatic Validation

```typescript
import { parseSchema, validateTONL } from 'tonl/schema';

// Load schema
const schemaContent = fs.readFileSync('users.schema.tonl', 'utf-8');
const schema = parseSchema(schemaContent);

// Validate data
const data = decodeTONL(tonlContent);
const result = validateTONL(data, schema);

if (!result.valid) {
  result.errors.forEach(err => {
    console.error(`${err.field}: ${err.message}`);
  });
}
```

### CLI Validation

```bash
# Validate TONL file against schema
tonl validate users.tonl --schema users.schema.tonl --strict

# Example output
✅ Validation successful: users.tonl conforms to schema
   - Schema: users.schema.tonl
   - Fields validated: 12
   - Errors: 0
```

### Generate TypeScript Types

```bash
# Auto-generate TypeScript types from schema
tonl generate-types users.schema.tonl --out types.ts
```

**13 validation constraints supported**: min, max, length, pattern, unique, nonempty, required, positive, negative, integer, multipleOf, and more.

See [docs/SCHEMA_SPECIFICATION.md](docs/SCHEMA_SPECIFICATION.md) for complete constraint reference.

## 📊 Performance

TONL provides significant size and token reductions:

| Format | Bytes | Tokens (gpt-5) | Reduction |
|--------|-------|-----------------|-----------|
| JSON | 245 | 89 | - |
| TONL | 167 | 54 | 32% bytes, 39% tokens |
| TONL Smart | 158 | 49 | 36% bytes, 45% tokens |

*Based on sample data with typical object arrays*

## 🎯 Use Cases

- **LLM Prompts**: Reduce token costs when including structured data in prompts
- **Configuration Files**: Human-readable configs that are compact yet clear
- **API Responses**: Efficient data transmission with optional schema validation
- **Data Exchange**: Between systems where both readability and size matter
- **Logging**: Structured logs that are compact for storage but readable for humans

## 🛠️ Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Benchmarking

```bash
npm run bench          # Byte size comparison
npm run bench-tokens   # Token estimation comparison
```

### CLI Development

```bash
npm link                        # Install tonl command locally
tonl encode test.json           # Test encoding
tonl format data.tonl --pretty  # Test formatting
```

## 📝 Examples

### Example 1: Array of Objects

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
```tonl
#version 1.0
users[2]{id:u32,name:str,role:str}:
  1, Alice, admin
  2, "Bob, Jr.", user
```

### Example 2: Nested Objects

**JSON:**
```json
{
  "user": {
    "id": 1, "name": "Alice",
    "contact": { "email": "alice@example.com", "phone": "+123456789" },
    "roles": ["admin","editor"]
  }
}
```

**TONL:**
```tonl
#version 1.0
user{id:u32,name:str,contact:obj,roles:list}:
  id: 1
  name: Alice
  contact{email:str,phone:str}:
    email: alice@example.com
    phone: +123456789
  roles[2]: admin, editor
```

## 🔄 Migration from JSON

Converting existing JSON to TONL is straightforward:

```bash
# Convert directory of JSON files
for file in *.json; do
  tonl encode "$file" --out "${file%.json}.tonl" --smart --stats
done
```

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed development plans.

**✅ Completed (v0.5.0):**

- ✅ Streaming API for large datasets (100GB+ files, <100MB memory)
- ✅ Browser support and CDN distribution (<7KB bundles)
- ✅ Schema validation system with TypeScript generation
- ✅ Full TypeScript strict mode compliance
- ✅ Windows CLI fix and cross-platform compatibility
- ✅ Robust null value handling in typed fields

**Completed in v1.0.0:**

- ✅ Query & Navigation API
- ✅ Modification API with CRUD
- ✅ Indexing System (Hash, BTree)
- ✅ Streaming for large files
- ✅ Interactive REPL
- ✅ VS Code extension (syntax highlighting)
- ✅ 100% test coverage on stable suite
- ✅ Browser bundles (8.84 KB)

**Future (v1.x):**

- Enhanced VS Code extension (IntelliSense, tree view)
- Web playground with live conversion
- Python binding for ML/AI community
- GraphQL-like query extensions

## 📚 Complete Documentation

### For Users
- **[Getting Started](docs/GETTING_STARTED.md)** - Quick start guide with examples
- **[API Reference](docs/API.md)** - Complete API documentation
- **[CLI Documentation](docs/CLI.md)** - Command-line tools guide
- **[Query API](docs/QUERY_API.md)** - JSONPath-like query syntax
- **[Modification API](docs/MODIFICATION_API.md)** - CRUD operations guide
- **[Navigation API](docs/NAVIGATION_API.md)** - Tree traversal methods
- **[Use Cases](docs/USE_CASES.md)** - Real-world examples

### For Implementers (Other Languages)
- **[Implementation Reference](docs/IMPLEMENTATION_REFERENCE.md)** - Complete spec for implementing TONL in any language
- **[Transformation Examples](docs/TRANSFORMATION_EXAMPLES.md)** - 20+ JSON↔TONL examples with explanations
- **[Format Specification](docs/SPECIFICATION.md)** - Technical format specification
- **[Schema Specification](docs/SCHEMA_SPECIFICATION.md)** - Schema language (TSL) spec

**🌟 NEW:** Language-agnostic implementation guides with pseudo-code, algorithms, and test requirements for building TONL libraries in Python, Go, Rust, Java, C#, and more!

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and submit pull requests to the main repository.

**Implementing TONL in another language?** Check out the [Implementation Reference](docs/IMPLEMENTATION_REFERENCE.md) for complete algorithms and test requirements!

---

**TONL**: Making structured data LLM-friendly without sacrificing readability. 🚀