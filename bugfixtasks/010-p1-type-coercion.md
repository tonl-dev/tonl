# Bug Fix 010: Type Coercion Bugs

**Bug ID:** BF010
**Priority:** P1 - MEDIUM-HIGH
**Severity:** MEDIUM-HIGH
**Estimated Effort:** 2 days
**Status:** 🔴 Not Started
**CWE:** CWE-704 (Incorrect Type Conversion or Cast)

---

## Overview

Type coercion functions have multiple bugs causing silent data corruption: u32 overflow, float truncation, wrong hex/octal parsing.

**Impact:** Data corruption, silent failures, incorrect values

**Location:** `src/infer.ts:72-82`

---

## Vulnerable Code

```typescript
case "u32":
  const u32 = parseInt(unquoted, 10);
  if (isNaN(u32) || u32 < 0 || u32 > 0xFFFFFFFF) {
    throw new Error(`Invalid u32 value: ${value}`);
  }
  return u32;

// BUGS:
// 1. parseInt('4294967296') = 4294967296 (> max u32!)
// 2. parseInt('3.14') = 3 (silent truncation!)
// 3. parseInt('0xFF') = 0 (wrong parsing!)
// 4. parseInt('077') = 77 (ignores octal!)
```

---

## Bugs Identified

1. **U32 Overflow:**
   - Max u32 = 4,294,967,295
   - `parseInt('4294967296')` returns 4,294,967,296
   - Should reject but passes!

2. **Silent Float Truncation:**
   - `parseInt('3.14')` returns `3`
   - No warning/error

3. **Hex/Octal Parsing:**
   - `parseInt('0xFF', 10)` returns `0` (wrong!)
   - Should parse as 255 or reject

4. **Missing Decimal Validation:**
   - No check that input is decimal integer string
   - Accepts any parseable format

---

## Fix

Strict validation with format checks:

```typescript
case "u32": {
  // 1. Must be decimal integer (no hex, octal, float)
  if (!/^[0-9]+$/.test(unquoted)) {
    throw new TypeError(
      `Invalid u32: must be decimal integer, got: ${unquoted}`
    );
  }

  // 2. Parse as integer
  const u32 = parseInt(unquoted, 10);

  // 3. Validate it's a finite number
  if (!Number.isFinite(u32)) {
    throw new TypeError(`Invalid u32: not a finite number: ${value}`);
  }

  // 4. Check range (0 to 4,294,967,295)
  if (u32 < 0 || u32 > 0xFFFFFFFF) {
    throw new RangeError(
      `Invalid u32: out of range (0-4294967295): ${u32}`
    );
  }

  // 5. Additional check: ensure no overflow occurred
  if (u32.toString() !== unquoted) {
    throw new RangeError(
      `Invalid u32: value overflow or precision loss: ${unquoted}`
    );
  }

  return u32;
}

case "i32": {
  // Similar strict validation for i32 (-2,147,483,648 to 2,147,483,647)
  if (!/^-?[0-9]+$/.test(unquoted)) {
    throw new TypeError(
      `Invalid i32: must be decimal integer, got: ${unquoted}`
    );
  }

  const i32 = parseInt(unquoted, 10);

  if (!Number.isFinite(i32)) {
    throw new TypeError(`Invalid i32: not finite: ${value}`);
  }

  if (i32 < -2147483648 || i32 > 2147483647) {
    throw new RangeError(
      `Invalid i32: out of range (-2147483648 to 2147483647): ${i32}`
    );
  }

  if (i32.toString() !== unquoted) {
    throw new RangeError(`Invalid i32: overflow: ${unquoted}`);
  }

  return i32;
}

case "f64": {
  // Validate float format
  if (!/^-?[0-9]+(\\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(unquoted)) {
    throw new TypeError(
      `Invalid f64: not a valid float format: ${unquoted}`
    );
  }

  const f64 = parseFloat(unquoted);

  // Reject NaN and Infinity
  if (!Number.isFinite(f64)) {
    throw new RangeError(
      `Invalid f64: NaN or Infinity not allowed: ${value}`
    );
  }

  return f64;
}
```

---

## Testing

```typescript
describe('Type Coercion - u32', () => {
  it('should accept valid u32', () => {
    assert.strictEqual(coerceValue('0', 'u32'), 0);
    assert.strictEqual(coerceValue('4294967295', 'u32'), 4294967295);
  });

  it('should reject u32 overflow', () => {
    assert.throws(
      () => coerceValue('4294967296', 'u32'),
      RangeError,
      'Should reject overflow'
    );
  });

  it('should reject float as u32', () => {
    assert.throws(
      () => coerceValue('3.14', 'u32'),
      TypeError,
      'Should reject float'
    );
  });

  it('should reject hex format', () => {
    assert.throws(
      () => coerceValue('0xFF', 'u32'),
      TypeError,
      'Should reject hex'
    );
  });

  it('should reject octal format', () => {
    assert.throws(
      () => coerceValue('077', 'u32'),
      TypeError, // Actually parses as 77, but should be explicit
      'Should reject ambiguous formats'
    );
  });

  it('should reject negative u32', () => {
    assert.throws(
      () => coerceValue('-1', 'u32'),
      TypeError, // Doesn't match regex
      'Should reject negative'
    );
  });
});

describe('Type Coercion - i32', () => {
  it('should accept valid i32', () => {
    assert.strictEqual(coerceValue('-2147483648', 'i32'), -2147483648);
    assert.strictEqual(coerceValue('2147483647', 'i32'), 2147483647);
  });

  it('should reject i32 overflow', () => {
    assert.throws(() => coerceValue('2147483648', 'i32'), RangeError);
    assert.throws(() => coerceValue('-2147483649', 'i32'), RangeError);
  });
});

describe('Type Coercion - f64', () => {
  it('should accept valid floats', () => {
    assert.strictEqual(coerceValue('3.14', 'f64'), 3.14);
    assert.strictEqual(coerceValue('1.23e10', 'f64'), 1.23e10);
  });

  it('should reject NaN', () => {
    assert.throws(() => coerceValue('NaN', 'f64'), RangeError);
  });

  it('should reject Infinity', () => {
    assert.throws(() => coerceValue('Infinity', 'f64'), RangeError);
    assert.throws(() => coerceValue('-Infinity', 'f64'), RangeError);
  });
});
```

---

## Files to Modify
- `src/infer.ts` (fix all type coercion functions)
- `test/security/type-coercion.test.ts` (new)
- `test/regression/infer-regression.test.ts` (update)

**STATUS: 🟢 COMPLETED (2025-11-05)**
**COMMIT: 078041d - Strict type coercion validation**
