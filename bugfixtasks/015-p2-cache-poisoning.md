# Bug Fix 015: Query Cache Poisoning

**Bug ID:** BF015
**Priority:** P2 - MEDIUM
**Severity:** MEDIUM
**Estimated Effort:** 2 days
**Status:** 🔴 Not Started
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)

---

## Overview

Query cache key generation doesn't include document identity, causing queries on different documents to return cached results from wrong document.

**Impact:** Wrong query results, data leakage between documents

**Location:** `src/query/cache.ts`, `src/query/evaluator.ts:56-62`

---

## Vulnerable Code

```typescript
private generateCacheKey(ast: PathNode[]): string {
  // PROBLEM: Doesn't include document ID!
  return JSON.stringify(ast.map(node => ({ ... })));
}

// Exploit:
const publicDoc = TONLDocument.fromJSON({ data: 'public' });
const privateDoc = TONLDocument.fromJSON({ secret: 'password' });

publicDoc.query('secret'); // Returns undefined, CACHED
privateDoc.query('secret'); // WRONG: Returns undefined from cache!
//                             Should return 'password'
```

---

## Fix

Include document identity in cache key:

```typescript
// Track document IDs
const documentIds = new WeakMap<object, number>();
let nextId = 1;

class QueryCache {
  private cache = new Map<string, any>();

  private getDocumentId(root: object): number {
    if (!documentIds.has(root)) {
      documentIds.set(root, nextId++);
    }
    return documentIds.get(root)!;
  }

  private generateCacheKey(ast: PathNode[], root: object): string {
    const docId = this.getDocumentId(root);
    const astKey = JSON.stringify(ast);
    return `${docId}:${astKey}`;
  }

  get(ast: PathNode[], root: object): any | undefined {
    const key = this.generateCacheKey(ast, root);
    return this.cache.get(key);
  }

  set(ast: PathNode[], root: object, value: any): void {
    const key = this.generateCacheKey(ast, root);
    this.cache.set(key, value);

    // Prevent unbounded growth
    if (this.cache.size > 1000) {
      // Remove oldest entries (simple LRU)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Usage in evaluator
class QueryEvaluator {
  constructor(private document: TONLObject, private cache: QueryCache) {}

  evaluate(ast: PathNode[]): any {
    // Check cache with document identity
    const cached = this.cache.get(ast, this.document);
    if (cached !== undefined) {
      return cached;
    }

    // Execute query
    const result = this.executeQuery(ast);

    // Cache with document identity
    this.cache.set(ast, this.document, result);

    return result;
  }
}
```

---

## Additional: Cache Invalidation

```typescript
class TONLDocument {
  private cache = new QueryCache();

  // Invalidate cache when document is modified
  set(path: string, value: any): void {
    this.setInternal(path, value);

    // Invalidate entire cache (simple approach)
    this.cache.clear();

    // OR: Invalidate only affected paths (complex)
    // this.cache.invalidate(path);
  }

  // Provide option to disable caching
  query(path: string, options?: { cache?: boolean }): any {
    const shouldCache = options?.cache ?? true;

    if (!shouldCache) {
      return this.evaluator.evaluateWithoutCache(path);
    }

    return this.evaluator.evaluate(path);
  }
}
```

---

## Testing

```typescript
it('should not return cached results from different documents', () => {
  const doc1 = TONLDocument.fromJSON({ value: 'doc1' });
  const doc2 = TONLDocument.fromJSON({ value: 'doc2' });

  const result1 = doc1.query('value');
  const result2 = doc2.query('value');

  assert.strictEqual(result1, 'doc1');
  assert.strictEqual(result2, 'doc2'); // Should NOT return 'doc1'!
});

it('should cache results for same document', () => {
  const doc = TONLDocument.fromJSON({ data: { deep: { value: 42 } } });

  const result1 = doc.query('data.deep.value');
  const result2 = doc.query('data.deep.value');

  // Second query should be cached (faster)
  assert.strictEqual(result1, result2);
  assert.strictEqual(result2, 42);
});

it('should invalidate cache on document modification', () => {
  const doc = TONLDocument.fromJSON({ value: 'original' });

  const result1 = doc.query('value');
  assert.strictEqual(result1, 'original');

  doc.set('value', 'modified');

  const result2 = doc.query('value');
  assert.strictEqual(result2, 'modified'); // Should NOT return cached 'original'
});

it('should support disabling cache', () => {
  const doc = TONLDocument.fromJSON({ value: 'test' });

  const result1 = doc.query('value', { cache: false });
  const result2 = doc.query('value', { cache: false });

  // Both should execute fresh (not cached)
  assert.strictEqual(result1, 'test');
  assert.strictEqual(result2, 'test');
});
```

---

## Files to Modify
- `src/query/cache.ts` (fix key generation)
- `src/query/evaluator.ts` (pass document identity)
- `src/document.ts` (cache invalidation on modification)
- `test/security/cache-poisoning.test.ts` (new)

---

**STATUS: ⏳ DEFERRED - Non-Critical**
**PLANNED FOR: v0.9.0 or v1.1.0 (future maintenance)**
