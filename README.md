# TONL (Token-Optimized Notation Language)

**TONL** is a text-first, LLM-friendly serialization format that combines the compactness of binary formats with human readability. Designed to reduce token costs in LLM prompts while maintaining clear structure and optional schema hints.

## ✨ Features

- **🗜️ Compact**: Significantly reduces token count compared to JSON
- **👁️ Human-readable**: Clear text format with minimal syntax overhead
- **🧠 LLM-optimized**: Designed specifically for token efficiency in language models
- **🔧 Schema hints**: Optional type information for validation and correctness
- **🔄 Round-trip safe**: Perfect bidirectional conversion with JSON
- **⚡ Fast**: Linear-time parsing and encoding
- **🛠️ TypeScript-first**: Full type safety and IntelliSense support

## 🚀 Quick Start

### Installation

```bash
npm install tonl
```

**🏠 Homepage**: [tonl.dev](https://tonl.dev)
**📦 GitHub**: [github.com/ersinkoc/tonl](https://github.com/ersinkoc/tonl)

### Programmatic Usage

```typescript
import { encodeTONL, decodeTONL, encodeSmart } from 'tonl';

// Basic encoding
const data = {
  users: [
    { id: 1, name: "Alice", role: "admin" },
    { id: 2, name: "Bob, Jr.", role: "user" }
  ]
};

const tonlText = encodeTONL(data);
const restored = decodeTONL(tonlText);

// Smart encoding (optimizes delimiter automatically)
const optimized = encodeSmart(data);
```

### CLI Usage

```bash
# Encode JSON to TONL
tonl encode data.json --out data.tonl --smart --stats

# Decode TONL back to JSON
tonl decode data.tonl --out data.json

# Compare sizes and token costs
tonl stats data.json --tokenizer gpt-5
```

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
npm link               # Install tonl command locally
tonl encode test.json   # Test the CLI
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

## ⚠️ Limitations

- **No streaming API** in current version (designed for future extensibility)
- **No binary format** yet (text-only for MVP)
- **Type hints are optional** and primarily for validation/documentation
- **Mixed arrays** (different object shapes) are encoded as generic object arrays

## 🗺️ Roadmap

- [ ] **Binary TONL format** for maximum compactness
- [ ] **Streaming API** for large datasets
- [ ] **Schema validation** with external schema files
- [ ] **Language bindings** for Python, Go, Rust
- [ ] **VS Code extension** for syntax highlighting
- [ ] **Web playground** for interactive conversion

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines and submit pull requests to the main repository.

---

**TONL**: Making structured data LLM-friendly without sacrificing readability. 🚀