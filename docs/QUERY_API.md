# TONL Query API Reference

**Version:** 0.6.0
**Status:** Stable
**Last Updated:** 2025-11-04

## Overview

The TONL Query API provides JSONPath-like query capabilities for accessing and filtering data in TONL documents. It supports path-based access, wildcards, filters, recursive descent, and array slicing.

## Quick Start

```typescript
import { TONLDocument } from 'tonl';

// Create document
const doc = TONLDocument.fromJSON({
  users: [
    { id: 1, name: 'Alice', role: 'admin', age: 30 },
    { id: 2, name: 'Bob', role: 'user', age: 25 }
  ]
});

// Simple queries
doc.get('users[0].name');           // 'Alice'
doc.query('users[*].name');         // ['Alice', 'Bob']
doc.query('users[?(@.age > 25)]');  // [{ id: 1, ... }]
```

## Path Syntax

### Property Access

```typescript
doc.get('user.name')                  // Single property
doc.get('user.profile.contact.email') // Nested properties
doc.get('$.user.name')                // Explicit root ($)
```

### Array Indexing

```typescript
doc.get('users[0]')          // First element
doc.get('users[-1]')         // Last element
doc.get('users[0].name')     // Property of array element
doc.get('matrix[0][1]')      // Nested arrays
```

### Wildcards

```typescript
doc.query('users[*]')         // All array elements
doc.query('users[*].name')    // All names
doc.query('data.*')           // All object properties
doc.query('*')                // All root properties
```

### Recursive Descent

```typescript
doc.query('$..email')         // All 'email' properties at any depth
doc.query('$..')              // All values at any depth
doc.query('user..phone')      // All 'phone' under 'user'
```

### Array Slicing

```typescript
doc.query('users[0:3]')       // Elements 0, 1, 2
doc.query('users[:5]')        // First 5 elements
doc.query('users[2:]')        // From index 2 to end
doc.query('users[::2]')       // Every 2nd element
doc.query('users[1:10:3]')    // Start:End:Step
doc.query('users[-3:]')       // Last 3 elements
```

### Filter Expressions

```typescript
// Comparison operators: ==, !=, >, <, >=, <=
doc.query('users[?(@.age > 18)]')
doc.query('products[?(@.price <= 100)]')

// Logical operators: &&, ||, !
doc.query('users[?(@.age > 18 && @.active == true)]')
doc.query('items[?(@.category == "A" || @.category == "B")]')
doc.query('users[?(!@.deleted)]')

// String operators: contains, startsWith, endsWith, matches
doc.query('users[?(@.email contains "@company.com")]')
doc.query('files[?(@.name startsWith "test")]')
doc.query('logs[?(@.message matches "^ERROR")]')

// Nested properties in filters
doc.query('users[?(@.profile.age > 25)]')

// Complex expressions
doc.query('users[?(@.age > 25 && (@.role == "admin" || @.verified == true))]')
```

## API Reference

### TONLDocument.get()

Get a value at a specific path.

```typescript
get(pathExpression: string): any
```

**Parameters:**
- `pathExpression`: Path expression string

**Returns:** Value at path or `undefined` if not found

**Examples:**
```typescript
doc.get('user.name')           // 'Alice'
doc.get('users[0]')            // { id: 1, ... }
doc.get('nonExistent')         // undefined
```

### TONLDocument.query()

Query the document (alias for get(), semantically clearer for complex queries).

```typescript
query(pathExpression: string): any
```

**Examples:**
```typescript
doc.query('users[*].name')                    // Array of names
doc.query('users[?(@.active == true)]')       // Filtered array
doc.query('$..email')                         // All emails
```

### TONLDocument.exists()

Check if a path exists.

```typescript
exists(pathExpression: string): boolean
```

**Examples:**
```typescript
doc.exists('user.name')        // true
doc.exists('user.missing')     // false
```

### TONLDocument.typeOf()

Get the type of value at a path.

```typescript
typeOf(pathExpression: string): string | undefined
```

**Returns:** `'string' | 'number' | 'boolean' | 'null' | 'array' | 'object' | undefined`

**Examples:**
```typescript
doc.typeOf('user.name')        // 'string'
doc.typeOf('user.age')         // 'number'
doc.typeOf('users')            // 'array'
```

## Performance

- **Simple path access:** <0.1ms
- **Wildcard queries (1000 nodes):** <20ms
- **Filter queries (1000 nodes):** <50ms
- **Recursive descent:** O(n) where n = total nodes
- **Caching:** Enabled by default with LRU eviction

## Error Handling

```typescript
try {
  const value = doc.get('users[invalid]');
} catch (error) {
  console.error(error.message); // Parse error details
}
```

## See Also

- [Navigation API](NAVIGATION_API.md)
- [Examples](../examples/)
- [API Reference](API.md)
