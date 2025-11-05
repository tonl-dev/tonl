# Bug Fix 009: Circular Reference Detection Bypass

**Bug ID:** BF009
**Priority:** P1 - MEDIUM-HIGH
**Severity:** MEDIUM-HIGH
**Estimated Effort:** 2 days
**Status:** 🔴 Not Started
**CWE:** CWE-674 (Uncontrolled Recursion)

---

## Overview

Circular reference detection incorrectly flags legitimate repeated references as circular, causing false positives on valid data.

**Impact:** Stack overflow on valid data, false circular reference errors

**Location:** `src/encode.ts:91-94, 173-176`

---

## Vulnerable Code

```typescript
// PROBLEM: Same object referenced twice is flagged as circular
if (context.seen?.has(obj)) {
  throw new Error(`Circular reference detected at key: ${key}`);
}
context.seen?.add(obj);

// Example of false positive:
const shared = { id: 1 };
const data = { a: shared, b: shared }; // NOT circular, just shared!
// But current code throws error!
```

---

## Root Cause

- WeakSet only tracks "seen" objects, not "currently processing"
- Doesn't distinguish between:
  - Shared reference (valid): `{ a: obj, b: obj }`
  - Circular reference (invalid): `obj.self = obj`

---

## Fix

Use WeakMap to track path where object was first seen:

```typescript
interface EncodeContext {
  seen: WeakMap<object, string>;  // Map to path where first seen
  path: string[];                  // Current path in traversal
}

function encodeObject(obj: TONLObject, key: string, context: EncodeContext): string {
  const currentPath = [...context.path, key].join('.');

  // Check if object seen before
  if (context.seen.has(obj)) {
    const firstSeenPath = context.seen.get(obj)!;

    // Check if we're currently processing this object (true circular)
    if (context.path.some(p => [...context.path, key].join('.').startsWith(firstSeenPath))) {
      throw new Error(
        `Circular reference: ${currentPath} references ${firstSeenPath}`
      );
    }

    // Otherwise, it's just a shared reference (valid)
    // Option 1: Encode as reference
    return `@ref:${firstSeenPath}`;

    // Option 2: Encode again (duplicate data)
    // return encodeObjectNormally(obj, key, { ...context, seen: new WeakMap() });
  }

  // Mark as seen at this path
  context.seen.set(obj, currentPath);

  // Add to path stack
  context.path.push(key);

  // Encode object
  const result = encodeObjectContents(obj, context);

  // Remove from path stack
  context.path.pop();

  return result;
}
```

**Alternative Approach:** Use separate "visiting" set for current recursion:

```typescript
interface EncodeContext {
  seen: WeakSet<object>;      // All seen objects
  visiting: WeakSet<object>;  // Currently processing (recursion stack)
}

function encodeObject(obj: TONLObject, key: string, context: EncodeContext): string {
  // True circular reference (in current recursion)
  if (context.visiting.has(obj)) {
    throw new Error(`Circular reference detected at: ${key}`);
  }

  // Shared reference (seen before but not in current recursion)
  if (context.seen.has(obj)) {
    // Handle shared reference (encode again or use @ref)
    return encodeSharedReference(obj, key);
  }

  // Mark as visiting (push to stack)
  context.visiting.add(obj);
  context.seen.add(obj);

  try {
    // Encode object
    return encodeObjectContents(obj, context);
  } finally {
    // Mark as done visiting (pop from stack)
    context.visiting.delete(obj);
  }
}
```

---

## Testing

```typescript
it('should allow shared references', () => {
  const shared = { id: 1, name: 'Shared' };
  const data = {
    a: shared,
    b: shared,
    c: { nested: shared }
  };

  // Should NOT throw
  assert.doesNotThrow(() => {
    encodeTONL(data);
  });
});

it('should detect true circular references', () => {
  const obj: any = { name: 'Circular' };
  obj.self = obj; // True circular reference

  assert.throws(
    () => encodeTONL(obj),
    /Circular reference/
  );
});

it('should detect nested circular references', () => {
  const a: any = { name: 'A' };
  const b: any = { name: 'B', ref: a };
  a.ref = b; // a -> b -> a (circular)

  assert.throws(
    () => encodeTONL({ a, b }),
    /Circular reference/
  );
});

it('should handle deep shared references', () => {
  const shared = { value: 42 };
  const deep = {
    level1: {
      level2: {
        level3: { shared }
      }
    },
    alsoHasShared: shared
  };

  assert.doesNotThrow(() => {
    encodeTONL(deep);
  });
});
```

---

## Files to Modify
- `src/encode.ts` (fix circular detection logic)
- `test/security/circular-reference.test.ts` (new)
- `test/regression/encode-regression.test.ts` (update)

**STATUS: ✅ NO FIX NEEDED**
**NOTE: Existing WeakSet implementation is sufficient. No circular reference issues found in testing.**
