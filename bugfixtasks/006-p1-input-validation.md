# Bug Fix 006: Missing Input Validation in Parser

**Bug ID:** BF006
**Priority:** P1 - HIGH
**Severity:** HIGH
**Estimated Effort:** 3 days
**Status:** 🔴 Not Started
**CWE:** CWE-20 (Improper Input Validation)

---

## Overview

Parser accepts unlimited line lengths, field counts, and nesting depths, leading to stack overflow, memory exhaustion, and DoS attacks.

**Impact:** Parser crashes, memory exhaustion, stack overflow

**Location:** `src/parser.ts:11-85`

---

## Vulnerable Code

```typescript
// No limits on line length, field count, or depth
export function parseTONLLine(line: string, delimiter: TONLDelimiter = ","): string[] {
  if (!line || line.trim() === "") {
    return [];
  }
  // Processes arbitrarily long lines without checks
}
```

---

## Attack Vectors

- Million-character lines → Memory exhaustion
- Million fields per line → CPU exhaustion
- 10000-level nesting → Stack overflow

---

## Fix

Add limits before processing:

```typescript
const MAX_LINE_LENGTH = 100_000;   // 100KB
const MAX_FIELDS = 10_000;          // Max fields per line
const MAX_NESTING_DEPTH = 100;      // Max nesting levels

export function parseTONLLine(line: string, delimiter: TONLDelimiter = ","): string[] {
  // Validate length
  if (line.length > MAX_LINE_LENGTH) {
    throw new TONLParseError(`Line exceeds maximum length: ${line.length}`);
  }

  // ... parsing logic ...

  // Validate field count
  if (fields.length > MAX_FIELDS) {
    throw new TONLParseError(`Too many fields: ${fields.length}`);
  }

  return fields;
}

// Add nesting depth tracking
function parseNested(data: string, depth: number = 0): any {
  if (depth > MAX_NESTING_DEPTH) {
    throw new TONLParseError(`Nesting depth exceeds maximum: ${depth}`);
  }
  // ... recursive parsing with depth + 1
}
```

---

## Testing

```typescript
it('should reject lines > 100KB', () => {
  const longLine = 'a,'.repeat(100_000);
  assert.throws(() => parseTONLLine(longLine), TONLParseError);
});

it('should reject > 10K fields', () => {
  const manyFields = Array(20_000).fill('a').join(',');
  assert.throws(() => parseTONLLine(manyFields), TONLParseError);
});

it('should reject > 100 nesting levels', () => {
  const deep = '['.repeat(200) + ']'.repeat(200);
  assert.throws(() => decodeTONL(deep), TONLParseError);
});
```

---

## Files to Modify
- `src/parser.ts`
- `src/parser/content-parser.ts`
- `src/parser/block-parser.ts`
- `test/security/input-validation.test.ts` (new)

**STATUS: 🟢 COMPLETED (2025-11-05)**
**COMMIT: e973c93 - All 11 security tests passing**
