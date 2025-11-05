# Bug Fix 013: Insufficient Schema Validation

**Bug ID:** BF013
**Priority:** P2 - MEDIUM
**Severity:** MEDIUM
**Estimated Effort:** 2 days
**Status:** 🔴 Not Started
**CWE:** CWE-20 (Improper Input Validation)

---

## Overview

Schema validator doesn't enforce range constraints for integers or reject NaN/Infinity for floats.

**Impact:** Invalid data accepted, data integrity issues

**Location:** `src/schema/validator.ts:148-150`

---

## Vulnerable Code

```typescript
case 'u32':
case 'i32':
case 'f64':
  // Missing: range checks, NaN/Infinity validation
  break;
```

---

## Fix

Add comprehensive validation:

```typescript
case 'u32': {
  if (typeof value !== 'number') {
    errors.push({ field: path, message: 'Expected number' });
  } else if (!Number.isInteger(value)) {
    errors.push({ field: path, message: 'Expected integer' });
  } else if (value < 0 || value > 0xFFFFFFFF) {
    errors.push({
      field: path,
      message: `u32 out of range: ${value} (expected 0-4294967295)`
    });
  }
  break;
}

case 'i32': {
  if (typeof value !== 'number') {
    errors.push({ field: path, message: 'Expected number' });
  } else if (!Number.isInteger(value)) {
    errors.push({ field: path, message: 'Expected integer' });
  } else if (value < -2147483648 || value > 2147483647) {
    errors.push({
      field: path,
      message: `i32 out of range: ${value}`
    });
  }
  break;
}

case 'f64': {
  if (typeof value !== 'number') {
    errors.push({ field: path, message: 'Expected number' });
  } else if (!Number.isFinite(value)) {
    errors.push({
      field: path,
      message: 'f64 cannot be NaN or Infinity'
    });
  }
  break;
}

case 'string': {
  if (typeof value !== 'string') {
    errors.push({ field: path, message: 'Expected string' });
  }

  // Check pattern if defined
  if (schema.pattern) {
    try {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: path,
          message: `Does not match pattern: ${schema.pattern}`
        });
      }
    } catch (error) {
      // Invalid regex pattern in schema
      errors.push({
        field: path,
        message: `Invalid schema pattern: ${schema.pattern}`
      });
    }
  }

  // Check minLength/maxLength
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push({
      field: path,
      message: `String too short: ${value.length} < ${schema.minLength}`
    });
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    errors.push({
      field: path,
      message: `String too long: ${value.length} > ${schema.maxLength}`
    });
  }
  break;
}
```

---

## Testing

```typescript
it('should reject u32 out of range', () => {
  const schema = { type: 'u32' };
  const errors = validateValue(4294967296, schema);
  assert.ok(errors.length > 0);
  assert.match(errors[0].message, /out of range/);
});

it('should reject NaN as f64', () => {
  const schema = { type: 'f64' };
  const errors = validateValue(NaN, schema);
  assert.ok(errors.length > 0);
});

it('should validate string patterns', () => {
  const schema = { type: 'string', pattern: '^[a-z]+$' };
  assert.strictEqual(validateValue('abc', schema).length, 0);
  assert.ok(validateValue('ABC123', schema).length > 0);
});
```

---

**STATUS: ⏳ DEFERRED - Non-Critical**
**PLANNED FOR: v0.9.0 or v1.1.0 (future maintenance)**
