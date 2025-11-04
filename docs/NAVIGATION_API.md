# TONL Navigation API Reference

**Version:** 0.6.0
**Status:** Stable
**Last Updated:** 2025-11-04

## Overview

The Navigation API provides iteration and tree traversal capabilities for TONL documents.

## Iterators

### entries()

Iterate over [key, value] pairs at the root level.

```typescript
for (const [key, value] of doc.entries()) {
  console.log(`${key}: ${JSON.stringify(value)}`);
}
```

### keys()

Iterate over keys at the root level.

```typescript
for (const key of doc.keys()) {
  console.log(key);
}
```

### values()

Iterate over values at the root level.

```typescript
for (const value of doc.values()) {
  console.log(value);
}
```

## Deep Iterators

### deepEntries()

Recursively iterate over all [path, value] pairs.

```typescript
for (const [path, value] of doc.deepEntries()) {
  console.log(`${path}: ${value}`);
}

// Output:
// user: { name: 'Alice', age: 30 }
// user.name: Alice
// user.age: 30
// users: [...]
// users[0]: { id: 1, name: 'Bob' }
// users[0].id: 1
// users[0].name: Bob
```

### deepKeys()

Recursively iterate over all paths.

```typescript
const allPaths = Array.from(doc.deepKeys());
// ['user', 'user.name', 'user.age', 'users', 'users[0]', ...]
```

### deepValues()

Recursively iterate over all values.

```typescript
for (const value of doc.deepValues()) {
  if (typeof value === 'string') {
    console.log(value);
  }
}
```

## Tree Walking

### walk()

Walk the tree with a callback function.

```typescript
doc.walk((path, value, depth) => {
  console.log(`[Depth ${depth}] ${path}: ${value}`);
});
```

**Callback Signature:**
```typescript
type WalkCallback = (
  path: string,
  value: any,
  depth: number
) => void | boolean;
```

Return `false` to stop traversal early.

**Options:**
```typescript
interface WalkOptions {
  maxDepth?: number;              // Default: 100
  filter?: (value: any) => boolean;
  strategy?: 'depth-first' | 'breadth-first';
  order?: 'pre-order' | 'post-order';
  includeRoot?: boolean;
}
```

**Examples:**
```typescript
// Depth-first (default)
doc.walk((path, value) => {
  console.log(path);
}, { strategy: 'depth-first' });

// Breadth-first
doc.walk((path, value) => {
  console.log(path);
}, { strategy: 'breadth-first' });

// With filter
doc.walk((path, value) => {
  console.log(path, value);
}, {
  filter: (v) => typeof v === 'number'
});

// Early termination
doc.walk((path, value) => {
  if (value === 'STOP') {
    return false; // Stop walking
  }
});

// Post-order traversal
doc.walk((path, value, depth) => {
  console.log(`Visited ${path} after children`);
}, { order: 'post-order' });
```

## Search Utilities

### find()

Find the first value matching a predicate.

```typescript
const user = doc.find((value, path) => {
  return value.email === 'alice@example.com';
});
```

### findAll()

Find all values matching a predicate.

```typescript
const numbers = doc.findAll((value) => {
  return typeof value === 'number';
});
```

### some()

Check if any value matches a predicate.

```typescript
const hasAdmins = doc.some((value) => {
  return value.role === 'admin';
});
```

### every()

Check if all values match a predicate.

```typescript
const allActive = doc.every((value, path) => {
  return path.includes('active') ? value === true : true;
});
```

### countNodes()

Count total nodes in the document.

```typescript
const nodeCount = doc.countNodes();  // e.g., 156
```

## Advanced Examples

### Find all email addresses

```typescript
const emails = doc.findAll((value) => {
  return typeof value === 'string' && value.includes('@');
});
```

### Collect all IDs recursively

```typescript
const ids: number[] = [];
doc.walk((path, value) => {
  if (path.endsWith('.id') && typeof value === 'number') {
    ids.push(value);
  }
});
```

### Build a path map

```typescript
const pathMap = new Map();
for (const [path, value] of doc.deepEntries()) {
  pathMap.set(path, value);
}
```

### Count nodes by type

```typescript
const typeCounts = { strings: 0, numbers: 0, booleans: 0 };
doc.walk((_, value) => {
  const type = typeof value;
  if (type === 'string') typeCounts.strings++;
  if (type === 'number') typeCounts.numbers++;
  if (type === 'boolean') typeCounts.booleans++;
});
```

## Performance

- **Iterators:** Lazy evaluation, memory efficient
- **Deep iteration:** O(n) where n = total nodes
- **Walk:** O(n) with early termination support
- **Search utilities:** O(n), stops on first match for find()

## See Also

- [Query API](QUERY_API.md)
- [Examples](../examples/)
