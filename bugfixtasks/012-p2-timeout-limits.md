# Bug Fix 012: Missing Timeout in Recursive Descent

**Bug ID:** BF012
**Priority:** P2 - MEDIUM
**Severity:** MEDIUM
**Estimated Effort:** 2 days
**Status:** 🔴 Not Started
**CWE:** CWE-835 (Loop with Unreachable Exit Condition)

---

## Overview

Recursive descent queries (`$..`) lack timeout and iteration limits, allowing DoS via deeply nested documents.

**Impact:** Query timeouts, CPU exhaustion, DoS

**Location:** `src/query/evaluator.ts:280-327`

---

## Vulnerable Code

```typescript
const search = (value: any, depth: number): void => {
  if (depth > context.maxDepth) {
    return; // Only checks depth, not iterations or time
  }
  // For deep documents with many items, can run for minutes
}
```

---

## Attack

```javascript
// Deep nested doc with 100 levels × 1000 items each
const deep = buildDeepObject(100, 1000);
doc.query('$..needle'); // Iterates 1000^100 times!
```

---

## Fix

Add iteration counter and timeout:

```typescript
interface EvaluationContext {
  maxDepth: number;
  maxIterations: number;   // NEW
  iterations: number;      // NEW
  timeout: number;         // NEW: ms
  startTime: number;       // NEW
}

const search = (value: any, depth: number): void => {
  // Check timeout
  if (Date.now() - context.startTime > context.timeout) {
    throw new Error('Query timeout exceeded');
  }

  // Check iterations
  if (++context.iterations > context.maxIterations) {
    throw new Error('Query complexity exceeded');
  }

  if (depth > context.maxDepth) return;
  // ... rest of search
}

// Usage
evaluate(ast, {
  maxDepth: 100,
  maxIterations: 100_000,   // 100K max iterations
  timeout: 5000,            // 5 second timeout
  iterations: 0,
  startTime: Date.now()
});
```

---

## Testing

```typescript
it('should timeout on slow queries', () => {
  const deep = createDeepObject(1000, 100); // 1000 levels, 100 items each

  assert.throws(
    () => doc.query('$..', { timeout: 1000 }),
    /timeout/
  );
});

it('should enforce iteration limits', () => {
  const wide = createWideObject(10000); // 10K items

  assert.throws(
    () => doc.query('$..', { maxIterations: 1000 }),
    /complexity exceeded/
  );
});
```

---


**STATUS: 🟡 IMPROVED (2025-11-05)**
**COMMIT: f9538df - Iteration limit fully implemented and enforced**
**NOTE: Full timeout mechanism deferred (requires async refactor)**
