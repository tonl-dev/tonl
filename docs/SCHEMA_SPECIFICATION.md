# TONL Schema Language (TSL) Specification

**Version:** 2.0.5
**Status:** Stable & Production Ready
**Last Updated:** November 16, 2025

---

## Table of Contents

- [Overview](#overview)
- [Design Goals](#design-goals)
- [Basic Syntax](#basic-syntax)
- [Type System](#type-system)
- [Validation Constraints](#validation-constraints)
- [Examples](#examples)
- [CLI Integration](#cli-integration)
- [TypeScript Generation](#typescript-generation)

---

## Overview

TONL Schema Language (TSL) provides a declarative way to define data structures, validation rules, and constraints for TONL documents. It enables:

- **Type Safety**: Ensure data conforms to expected types
- **Validation**: Runtime validation with detailed error messages
- **Documentation**: Self-documenting data structures
- **Code Generation**: Generate TypeScript types automatically
- **Versioning**: Schema evolution and migration support

---

## Design Goals

1. **Human-Readable**: Easy to read and write, similar to TONL itself
2. **Expressive**: Support rich validation rules and constraints
3. **Backward Compatible**: Work with existing TONL documents
4. **Extensible**: Allow custom validators and types
5. **Tool-Friendly**: Enable IDE support and static analysis

---

## Basic Syntax

### Schema Header

```tonl
@schema v1
@strict true
@description "User management system schema"
```

**Directives:**
- `@schema v1` - Schema format version (required)
- `@strict true|false` - Enable strict validation (default: false)
- `@description "..."` - Schema description (optional)
- `@version "1.2.0"` - Data schema version (optional)

### Field Definitions

```tonl
fieldName: type [constraints...]
```

**Format:**
- Field name (identifier)
- Colon separator
- Type specification
- Optional constraints (space-separated)

---

## Type System

### Primitive Types

| Type | Description | Example Values |
|------|-------------|----------------|
| `str` | String | `"hello"`, `""` |
| `u32` | Unsigned 32-bit integer | `0`, `42`, `4294967295` |
| `i32` | Signed 32-bit integer | `-100`, `0`, `2147483647` |
| `f64` | 64-bit floating point | `3.14`, `-0.5`, `1e10` |
| `bool` | Boolean | `true`, `false` |
| `null` | Null value | `null` |

### Complex Types

```tonl
# Object type
obj              # Generic object (any structure)

# Array/List type
list<type>       # List of specific type
list<str>        # List of strings
list<obj>        # List of objects

# Optional type
type?            # Nullable type (can be null or undefined)
str?             # Optional string

# Union types (future)
str | i32        # Either string or integer
```

### Custom Object Types

```tonl
# Define a custom type
User: obj
  id: u32 required
  name: str required min:2 max:100
  email: str required pattern:email
  age: u32? min:0 max:150

# Use custom type
users: list<User>
admin: User?
```

---

## Validation Constraints

### Universal Constraints

```tonl
required         # Field must be present (not null/undefined)
optional         # Field can be omitted (default for nullable types)
default:value    # Default value if not provided
```

### String Constraints

```tonl
# Length constraints
min:n            # Minimum length (characters)
max:n            # Maximum length (characters)
length:n         # Exact length

# Pattern constraints
pattern:regex    # Custom regex pattern
pattern:email    # Built-in email pattern
pattern:url      # Built-in URL pattern
pattern:uuid     # Built-in UUID pattern
pattern:date     # Built-in date pattern (ISO 8601)

# Content constraints
trim:true        # Auto-trim whitespace
lowercase:true   # Convert to lowercase
uppercase:true   # Convert to uppercase
```

**Example:**
```tonl
username: str required min:3 max:20 pattern:^[a-zA-Z0-9_]+$
email: str required pattern:email lowercase:true
bio: str? max:500 trim:true
```

### Numeric Constraints

```tonl
# Range constraints
min:n            # Minimum value (inclusive)
max:n            # Maximum value (inclusive)
range:min,max    # Shorthand for min and max

# Multiple constraints
multipleOf:n     # Must be multiple of n
integer:true     # Must be integer (no decimals)
positive:true    # Must be > 0
negative:true    # Must be < 0
```

**Example:**
```tonl
age: u32 required min:0 max:150
price: f64 required min:0.01 multipleOf:0.01
quantity: i32 positive:true
```

### Array/List Constraints

```tonl
# Size constraints
min:n            # Minimum number of items
max:n            # Maximum number of items
length:n         # Exact number of items

# Content constraints
unique:true      # All items must be unique
nonempty:true    # Array cannot be empty (alias for min:1)
```

**Example:**
```tonl
tags: list<str> min:1 max:10 unique:true
coordinates: list<f64> length:2
items: list<obj> nonempty:true
```

### Object Constraints

```tonl
# Additional properties
sealed:true      # No additional properties allowed
strict:true      # Alias for sealed

# Required fields
requiredKeys:key1,key2,...  # Specific keys must be present
```

---

## Examples

### User Management System

```tonl
@schema v1
@strict true
@description "User management system with roles and permissions"
@version "1.0.0"

# Define role enum (future feature)
Role: str pattern:^(admin|moderator|user|guest)$

# Define user type
User: obj
  id: u32 required
  username: str required min:3 max:20 pattern:^[a-zA-Z0-9_]+$
  email: str required pattern:email lowercase:true
  password: str required min:8 max:100
  firstName: str required min:1 max:50 trim:true
  lastName: str required min:1 max:50 trim:true
  age: u32? min:13 max:150
  roles: list<str> required min:1 unique:true
  createdAt: str required pattern:date
  updatedAt: str required pattern:date
  metadata: obj? sealed:false

# Root schema
users: list<User> required min:1
totalCount: u32 required
```

### E-Commerce Product Catalog

```tonl
@schema v1
@description "Product catalog with variants and pricing"

# Product variant
Variant: obj
  sku: str required min:3 max:50 pattern:^[A-Z0-9-]+$
  size: str? pattern:^(XS|S|M|L|XL|XXL)$
  color: str? min:3 max:30
  price: f64 required min:0.01 multipleOf:0.01
  stock: u32 required min:0

# Product category
Category: obj
  id: u32 required
  name: str required min:2 max:100
  slug: str required min:2 max:100 pattern:^[a-z0-9-]+$

# Main product
Product: obj
  id: u32 required
  name: str required min:3 max:200
  description: str required min:10 max:2000
  category: Category required
  variants: list<Variant> required min:1
  tags: list<str> max:20 unique:true
  images: list<str> required min:1 max:10 pattern:url
  rating: f64? min:0 max:5
  reviewCount: u32 default:0

# Root
products: list<Product> required
```

### Configuration File

```tonl
@schema v1
@strict true
@description "Application configuration"

# Database config
DatabaseConfig: obj
  host: str required pattern:^[a-zA-Z0-9.-]+$
  port: u32 required min:1 max:65535
  database: str required min:1 max:64
  username: str required
  password: str required min:8
  ssl: bool default:true
  connectionPool: obj
    min: u32 default:5 min:1
    max: u32 default:20 min:1

# Server config
ServerConfig: obj
  port: u32 required min:1024 max:65535
  host: str default:"0.0.0.0"
  cors: bool default:true
  rateLimit: obj?
    windowMs: u32 default:900000
    maxRequests: u32 default:100

# Root configuration
config: obj required
  server: ServerConfig required
  database: DatabaseConfig required
  environment: str required pattern:^(development|staging|production)$
  debug: bool default:false
```

### API Response Schema

```tonl
@schema v1
@description "Standard API response format"

# Generic API response
ApiResponse: obj
  success: bool required
  message: str? max:500
  data: obj?
  errors: list<obj>? max:10
  meta: obj?
    page: u32? min:1
    pageSize: u32? min:1 max:100
    total: u32?

# Root
response: ApiResponse required
```

---

## CLI Integration

### Validation Command

```bash
# Validate TONL file against schema
tonl validate data.tonl --schema schema.tonl

# Example output
✓ Validation successful: data.tonl conforms to schema
  - 150 fields validated
  - 0 errors, 0 warnings

# With errors
✗ Validation failed: 3 errors found

Error at line 15, field "user.email":
  Invalid email format: "not-an-email"
  Pattern: ^[\w\.-]+@[\w\.-]+\.\w+$

Error at line 23, field "user.age":
  Value out of range: 200
  Must be between 0 and 150

Error at line 45, field "users":
  Array too short: 0 items
  Required: minimum 1 item
```

### Schema Validation

```bash
# Validate schema file itself
tonl validate-schema schema.tonl

# Example output
✓ Schema is valid
  - Format: TSL v1
  - Types defined: 5
  - Total constraints: 47
```

---

## TypeScript Generation

### Generate Types Command

```bash
# Generate TypeScript types from schema
tonl generate-types schema.tonl --output types.ts

# With options
tonl generate-types schema.tonl \
  --output types.ts \
  --export-all \
  --readonly \
  --strict
```

### Generated TypeScript Example

**Input Schema:**
```tonl
@schema v1

User: obj
  id: u32 required
  name: str required min:2 max:100
  email: str required pattern:email
  age: u32? min:0 max:150
  roles: list<str> required

users: list<User>
```

**Generated TypeScript:**
```typescript
/**
 * Auto-generated from schema.tonl
 * Do not edit manually - regenerate with: tonl generate-types
 */

export interface User {
  /** @minimum 0 */
  id: number;

  /** @minLength 2 @maxLength 100 */
  name: string;

  /** @format email */
  email: string;

  /** @minimum 0 @maximum 150 */
  age?: number;

  roles: string[];
}

export interface Root {
  users: User[];
}

// Validation functions (optional)
export function validateUser(data: unknown): data is User {
  // Runtime validation logic
}

export function validateRoot(data: unknown): data is Root {
  // Runtime validation logic
}
```

---

## Schema Evolution

### Version Management

```tonl
@schema v1
@version "2.0.0"
@previousVersion "1.0.0"
@changelog "Added 'phoneNumber' field, deprecated 'phone'"

User: obj
  id: u32 required
  name: str required
  email: str required pattern:email
  phoneNumber: str? pattern:phone  # New field
  phone: str? pattern:phone deprecated:true  # Old field
```

### Migration Support

```tonl
@schema v1
@version "2.0.0"

# Migration rules (future feature)
@migrate from:"1.0.0"
  rename: phone -> phoneNumber
  transform: age = age * 12 if ageType == "months"
  addDefault: roles = ["user"]
```

---

## Advanced Features (Future)

### Custom Validators

```tonl
@validator checksum
  function: validateChecksum
  message: "Invalid checksum"

creditCard: str required pattern:^[0-9]{16}$ validator:checksum
```

### Conditional Validation

```tonl
User: obj
  type: str required pattern:^(personal|business)$
  firstName: str required if:type=="personal"
  lastName: str required if:type=="personal"
  companyName: str required if:type=="business"
  taxId: str required if:type=="business"
```

### References and Relationships

```tonl
@schema v1

User: obj
  id: u32 required unique:true
  name: str required

Post: obj
  id: u32 required
  title: str required
  authorId: u32 required ref:User.id  # Foreign key
  author: User computed:true  # Resolved reference
```

---

## Best Practices

### 1. Clear Naming

```tonl
# Good
userEmail: str pattern:email
productPrice: f64 min:0
itemCount: u32 positive:true

# Avoid
e: str
p: f64
c: u32
```

### 2. Appropriate Constraints

```tonl
# Good - realistic constraints
age: u32 min:0 max:150
username: str min:3 max:30

# Avoid - too restrictive
age: u32 min:18 max:65  # Excludes valid ages
username: str length:8  # Too inflexible
```

### 3. Documentation

```tonl
@schema v1
@description "Comprehensive schema with field-level docs"

# User account information
User: obj
  # Unique user identifier (auto-generated)
  id: u32 required

  # Display name (3-50 characters, letters/numbers/spaces)
  displayName: str required min:3 max:50 trim:true

  # Contact email (must be verified)
  email: str required pattern:email lowercase:true
```

### 4. Sensible Defaults

```tonl
Settings: obj
  theme: str default:"light" pattern:^(light|dark|auto)$
  language: str default:"en" pattern:^[a-z]{2}$
  notifications: bool default:true
  pageSize: u32 default:20 min:10 max:100
```

---

## Implementation Roadmap

### Phase 1: Parser (v0.4.0)
- [x] Schema format design
- [ ] Schema file parser
- [ ] Basic type validation
- [ ] Error reporting

### Phase 2: Constraints (v0.4.0)
- [ ] String constraints (min, max, pattern)
- [ ] Numeric constraints (min, max, range)
- [ ] Array constraints (min, max, unique)
- [ ] Custom validators

### Phase 3: Code Generation (v0.4.0)
- [ ] TypeScript type generation
- [ ] JSDoc annotations
- [ ] Runtime validators
- [ ] JSON Schema export

### Phase 4: Advanced (v0.5.0+)
- [ ] Schema evolution/migration
- [ ] Conditional validation
- [ ] References and relationships
- [ ] IDE integration (VS Code extension)

---

## References

- **JSON Schema**: Inspiration for validation constraints
- **Protocol Buffers**: Type system design
- **TypeScript**: Type generation target
- **Zod**: Runtime validation patterns

---

**Document Version:** 1.0 (Draft)
**Status:** Design Phase
**Feedback**: [GitHub Discussions](https://github.com/tonl-dev/tonl/discussions)

---

*This specification is subject to change during the implementation phase. Community feedback is welcome!* 🚀
