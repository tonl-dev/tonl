# Bug Fix 008: Integer Overflow in Array Operations

**Bug ID:** BF008
**Priority:** P1 - HIGH
**Severity:** HIGH
**Estimated Effort:** 2 days
**Status:** 🔴 Not Started
**CWE:** CWE-190 (Integer Overflow or Wraparound)

---

## Overview

Array index calculations and slice operations don't validate bounds, causing infinite loops, crashes, or incorrect results.

**Impact:** Infinite loops, incorrect array access, crashes

**Location:** `src/query/evaluator.ts:231, 347-350`

---

## Vulnerable Code

```typescript
// Line 231: No bounds check
const actualIndex = index < 0 ? length + index : index;
// If index = -2147483648, result overflows!

// Line 347-350: Infinite loop with step=0
for (let i = actualStart; i < actualEnd; i += step) {
  result.push(current[i]);
}
// If step=0, loops forever!
```

---

## Attack Vectors

- Negative overflow: `arr[-2147483648]`
- Slice with step=0: Infinite loop
- Negative step not handled: Wrong results

---

## Fix

Add validation and bounds checking:

```typescript
// Fix index access
private evaluateIndex(current: any, node: IndexNode): any {
  if (!Array.isArray(current)) return undefined;

  const { index } = node;
  const length = current.length;

  // Validate safe integer range
  if (!Number.isSafeInteger(index)) {
    throw new Error(`Index out of safe range: ${index}`);
  }

  // Calculate actual index with bounds
  let actualIndex = index < 0 ? length + index : index;

  // Clamp to valid range
  actualIndex = Math.max(0, Math.min(actualIndex, length - 1));

  // Check if still out of bounds
  if (actualIndex < 0 || actualIndex >= length) {
    return undefined;
  }

  return current[actualIndex];
}

// Fix slice operation
private evaluateSlice(current: any, node: SliceNode): any[] {
  if (!Array.isArray(current)) return [];

  let { start, end, step } = node;
  const length = current.length;

  // Validate step
  if (step === 0) {
    throw new Error('Slice step cannot be zero');
  }

  // Default step
  step = step ?? 1;

  // Handle negative step
  if (step < 0) {
    [start, end] = [end ?? -1, start ?? length];
    step = Math.abs(step);
  } else {
    start = start ?? 0;
    end = end ?? length;
  }

  // Normalize negative indices
  if (start < 0) start = Math.max(0, length + start);
  if (end < 0) end = Math.max(0, length + end);

  // Bounds checking
  start = Math.max(0, Math.min(start, length));
  end = Math.max(0, Math.min(end, length));

  // Collect results
  const result = [];
  for (let i = start; i < end && i < length; i += step) {
    result.push(current[i]);
  }

  return result;
}
```

---

## Testing

```typescript
it('should handle negative index overflow', () => {
  const doc = TONLDocument.fromJSON({ arr: [1, 2, 3] });

  // Should not crash
  assert.doesNotThrow(() => {
    doc.query('arr[-2147483648]');
  });
});

it('should throw on step=0', () => {
  const doc = TONLDocument.fromJSON({ arr: [1, 2, 3, 4, 5] });

  assert.throws(
    () => doc.query('arr[0:5:0]'),
    /step cannot be zero/
  );
});

it('should handle negative step', () => {
  const doc = TONLDocument.fromJSON({ arr: [1, 2, 3, 4, 5] });

  const result = doc.query('arr[4:0:-1]');
  assert.deepStrictEqual(result, [5, 4, 3, 2]);
});

it('should clamp out-of-bounds indices', () => {
  const doc = TONLDocument.fromJSON({ arr: [1, 2, 3] });

  assert.strictEqual(doc.query('arr[999]'), undefined);
  assert.strictEqual(doc.query('arr[-999]'), 1); // Clamped to 0
});
```

---

## Files to Modify
- `src/query/evaluator.ts` (fix index/slice logic)
- `test/security/integer-overflow.test.ts` (new)

**STATUS: 🟢 COMPLETED (2025-11-05)**
**COMMIT: 078041d - Integer overflow protection added**
