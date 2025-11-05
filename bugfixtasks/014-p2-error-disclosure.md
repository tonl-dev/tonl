# Bug Fix 014: Error Message Information Disclosure

**Bug ID:** BF014
**Priority:** P2 - MEDIUM
**Severity:** MEDIUM
**Estimated Effort:** 2 days
**Status:** 🔴 Not Started
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

---

## Overview

Error messages include full source code snippets, file paths, and internal details that could aid attackers.

**Impact:** Information disclosure, easier exploitation

**Location:** `src/errors/index.ts:20-38`

---

## Vulnerable Code

```typescript
toString(): string {
  let result = `${this.name}: ${this.message}`;
  if (this.source) {
    result += `\\n\\n  ${this.source}`; // Exposes source code!
  }
  if (this.line) {
    result += `\\n  at line ${this.line}, column ${this.column}`;
  }
  return result;
}

// Example leaked info:
// TONLParseError: Invalid syntax
//
//   users:
//     - name: "admin"
//       password: "secret123"  <-- LEAKED!
//   at line 3, column 10
//   File: /var/www/app/config/database.tonl
```

---

## Fix

Sanitize error messages for production:

```typescript
toString(verbose: boolean = false): string {
  let result = `${this.name}: ${this.message}`;

  // Only show details in development
  const isDev = process.env.NODE_ENV === 'development' || verbose;

  if (isDev) {
    if (this.line !== undefined) {
      result += `\\n  at line ${this.line}`;
      if (this.column !== undefined) {
        result += `, column ${this.column}`;
      }
    }

    if (this.source && isDev) {
      // Sanitize source before showing
      const sanitized = this.sanitizeSource(this.source);
      result += `\\n\\n  ${sanitized}`;
    }
  } else {
    // Production: minimal info
    if (this.line !== undefined) {
      result += ` (line ${this.line})`;
    }
  }

  return result;
}

private sanitizeSource(source: string): string {
  // Remove potential secrets
  let sanitized = source;

  // Patterns to redact
  const patterns = [
    { regex: /password['":]?\\s*['"](.*?)['"]/gi, replace: 'password: "***"' },
    { regex: /token['":]?\\s*['"](.*?)['"]/gi, replace: 'token: "***"' },
    { regex: /api[-_]?key['":]?\\s*['"](.*?)['"]/gi, replace: 'api_key: "***"' },
    { regex: /secret['":]?\\s*['"](.*?)['"]/gi, replace: 'secret: "***"' },
  ];

  for (const { regex, replace } of patterns) {
    sanitized = sanitized.replace(regex, replace);
  }

  // Truncate if too long
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...';
  }

  return sanitized;
}

// Usage in CLI
try {
  const result = decodeTONL(input);
} catch (error) {
  if (error instanceof TONLError) {
    // Don't use verbose mode in production
    console.error(error.toString(false));
  }
}
```

---

## Testing

```typescript
it('should redact passwords in error messages', () => {
  const source = 'password: "secret123"';
  const error = new TONLParseError('Invalid', { source });

  const message = error.toString(false); // Production mode
  assert.ok(!message.includes('secret123'));
  assert.ok(message.includes('***'));
});

it('should show full details in development', () => {
  process.env.NODE_ENV = 'development';

  const error = new TONLParseError('Test', {
    source: 'data: value',
    line: 5,
    column: 10
  });

  const message = error.toString();
  assert.ok(message.includes('line 5'));
  assert.ok(message.includes('column 10'));
  assert.ok(message.includes('data: value'));
});

it('should minimize info in production', () => {
  process.env.NODE_ENV = 'production';

  const error = new TONLParseError('Test', {
    source: 'sensitive data',
    line: 5
  });

  const message = error.toString();
  assert.ok(!message.includes('sensitive data'));
  assert.ok(message.includes('(line 5)')); // Minimal info
});
```

---

**STATUS: ⏳ DEFERRED - Non-Critical**
**PLANNED FOR: v0.9.0 or v1.1.0 (future maintenance)**
