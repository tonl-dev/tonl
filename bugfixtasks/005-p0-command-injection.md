# Bug Fix 005: Command Injection Risk in CLI

**Bug ID:** BF005
**Bug Name:** Command Injection / Shell Injection
**Priority:** P0 - HIGH
**Severity:** HIGH (Close to CRITICAL)
**Estimated Effort:** 1 day
**Status:** 🔴 Not Started
**CWE:** CWE-78 (OS Command Injection)
**CVE:** Pending Assignment

---

## Overview

### Summary
The CLI query command processes user-supplied query expressions without proper sanitization before passing them to the evaluator. While not directly executing shell commands, the query string could be exploited through error messages, logging, or if combined with other vulnerabilities.

### Impact
**HIGH - Potential Code Injection**
- Query expression injection
- Error message exploitation
- Log injection attacks
- Chained with other vulns for RCE
- Information disclosure via crafted errors

### Affected Versions
All versions: v0.1.0 - v0.8.0

---

## Technical Details

### Vulnerable Code

**Location:** `src/cli.ts:360-364`

```typescript
// VULNERABLE CODE - No sanitization
const queryExpr = args
  .slice(queryStartIndex)
  .filter(a => !a.startsWith('-'))
  .join(' ')
  .trim();

// Directly passed to evaluator
const result = doc.query(queryExpr);
```

### Root Cause

1. **No Input Sanitization**: Query strings accepted as-is
2. **No Length Limits**: Can send arbitrarily long queries
3. **No Validation**: Malformed queries not caught early
4. **Error Message Leakage**: Errors may expose internals

### Attack Vectors

**Attack 1: Query Injection**
```bash
# Malicious query with special characters
tonl query data.tonl '$[?(@ && require("child_process").exec("rm -rf /"))]'

# ANSI escape code injection in output
tonl query data.tonl '$[?(@ && "\\x1b[H\\x1b[2J")]'
```

**Attack 2: Log Injection**
```bash
# Inject newlines to fake log entries
tonl query data.tonl '$\nFAKE LOG ENTRY\n$'

# Inject ANSI codes to hide malicious queries in logs
tonl query data.tonl '\\x1b[0m[INFO] Legitimate query\\x1b[0m\\nMALICIOUS'
```

**Attack 3: DoS via Complex Queries**
```bash
# Extremely long query (1MB+)
tonl query data.tonl "$(cat /dev/zero | head -c 1000000)"

# Deeply nested query
tonl query data.tonl '$[0][0][0]...[0]'  # 10000 levels
```

---

## Security Fix

### Proposed Solution

**Multi-Layer Defense:**

1. **Input Validation**: Length limits, character allowlist
2. **Query Sanitization**: Strip dangerous characters
3. **Error Sanitization**: Don't leak query in errors
4. **Logging Protection**: Sanitize before logging

### Implementation

```typescript
// src/cli/query-sanitizer.ts (new)

export interface QueryValidationOptions {
  maxLength?: number;        // Default: 1000
  maxDepth?: number;          // Default: 100
  allowedChars?: RegExp;      // Default: safe chars only
  stripAnsiCodes?: boolean;   // Default: true
}

export class QuerySanitizer {
  /**
   * Validate and sanitize query expression
   * @throws {SecurityError} if query is unsafe
   */
  static sanitize(
    query: string,
    options?: QueryValidationOptions
  ): string {
    const opts = {
      maxLength: options?.maxLength ?? 1000,
      maxDepth: options?.maxDepth ?? 100,
      allowedChars: options?.allowedChars ?? /^[\\w\\s.$\\[\\]()@?!<>=&|*,:\\-\\"']+$/,
      stripAnsiCodes: options?.stripAnsiCodes ?? true,
    };

    // 1. Type validation
    if (typeof query !== 'string') {
      throw new SecurityError('Query must be string');
    }

    // 2. Length validation
    if (query.length > opts.maxLength) {
      throw new SecurityError(
        `Query too long: ${query.length} chars (max: ${opts.maxLength})`
      );
    }

    // 3. Strip ANSI escape codes
    if (opts.stripAnsiCodes) {
      query = this.stripAnsiCodes(query);
    }

    // 4. Strip null bytes
    if (query.includes('\\0')) {
      throw new SecurityError('Null bytes not allowed in query');
    }

    // 5. Character allowlist validation
    if (!opts.allowedChars.test(query)) {
      throw new SecurityError(
        'Query contains invalid characters'
      );
    }

    // 6. Check for dangerous patterns
    const dangerousPatterns = [
      /require\\s*\\(/i,           // require() calls
      /import\\s*\\(/i,            // import() calls
      /eval\\s*\\(/i,              // eval() calls
      /exec\\s*\\(/i,              // exec() calls
      /Function\\s*\\(/i,          // new Function()
      /__proto__/i,                // Prototype pollution
      /constructor/i,              // Constructor access
      /process\\.env/i,            // Environment access
      /child_process/i,            // Child process
      /fs\\./i,                    // File system
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new SecurityError(
          `Query contains forbidden pattern: ${pattern.source}`
        );
      }
    }

    // 7. Validate bracket/parenthesis nesting
    const depth = this.getMaxNestingDepth(query);
    if (depth > opts.maxDepth) {
      throw new SecurityError(
        `Query nesting too deep: ${depth} (max: ${opts.maxDepth})`
      );
    }

    // 8. Return sanitized query
    return query.trim();
  }

  /**
   * Strip ANSI escape codes
   */
  private static stripAnsiCodes(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\\x1b\\[[0-9;]*[a-zA-Z]/g, '');
  }

  /**
   * Calculate maximum nesting depth
   */
  private static getMaxNestingDepth(query: string): number {
    let depth = 0;
    let maxDepth = 0;

    for (const char of query) {
      if (char === '[' || char === '(') {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
      } else if (char === ']' || char === ')') {
        depth--;
      }
    }

    return maxDepth;
  }

  /**
   * Sanitize for logging (remove sensitive data)
   */
  static sanitizeForLogging(query: string): string {
    // Truncate long queries
    if (query.length > 100) {
      query = query.substring(0, 97) + '...';
    }

    // Strip ANSI codes
    query = this.stripAnsiCodes(query);

    // Replace newlines with spaces
    query = query.replace(/[\\r\\n]+/g, ' ');

    return query;
  }
}
```

### Update CLI

```typescript
// src/cli.ts (update)

import { QuerySanitizer } from './cli/query-sanitizer.js';

// BEFORE - VULNERABLE
const queryExpr = args
  .slice(queryStartIndex)
  .filter(a => !a.startsWith('-'))
  .join(' ')
  .trim();

const result = doc.query(queryExpr);

// AFTER - SECURE
const rawQuery = args
  .slice(queryStartIndex)
  .filter(a => !a.startsWith('-'))
  .join(' ')
  .trim();

try {
  // Sanitize query
  const sanitizedQuery = QuerySanitizer.sanitize(rawQuery, {
    maxLength: 1000,
    maxDepth: 100,
  });

  // Log sanitized version
  if (options.verbose) {
    console.log(
      '[QUERY]',
      QuerySanitizer.sanitizeForLogging(sanitizedQuery)
    );
  }

  // Execute sanitized query
  const result = doc.query(sanitizedQuery);

  // Output result
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  // Don't leak query in error message
  if (error instanceof SecurityError) {
    console.error('❌ Security Error:', error.message);
    // DO NOT: console.error(`Query: ${rawQuery}`);
  } else {
    console.error('❌ Error:', error.message);
  }
  process.exit(1);
}
```

---

## Testing

### Exploit Tests

```typescript
// test/security/exploits/BF005-command-injection.exploit.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';
import { SecurityError } from '../../../src/errors/index.js';
import { QuerySanitizer } from '../../../src/cli/query-sanitizer.js';

describe('BF005: Command Injection', () => {
  it('should block require() in queries', () => {
    const malicious = '$[?(@.x && require("child_process"))]';

    assert.throws(
      () => QuerySanitizer.sanitize(malicious),
      SecurityError,
      'Should block require()'
    );
  });

  it('should block eval() in queries', () => {
    const malicious = '$[?(@.x && eval("code"))]';

    assert.throws(
      () => QuerySanitizer.sanitize(malicious),
      SecurityError,
      'Should block eval()'
    );
  });

  it('should block ANSI escape codes', () => {
    const malicious = '\\x1b[H\\x1b[2J$[*]';

    const sanitized = QuerySanitizer.sanitize(malicious);

    // ANSI codes should be stripped
    assert.ok(!sanitized.includes('\\x1b'));
  });

  it('should block null bytes', () => {
    const malicious = '$[*]\\0/etc/passwd';

    assert.throws(
      () => QuerySanitizer.sanitize(malicious),
      SecurityError,
      'Should block null bytes'
    );
  });

  it('should enforce length limits', () => {
    const longQuery = '$[*]'.repeat(500); // 2000 chars

    assert.throws(
      () => QuerySanitizer.sanitize(longQuery, { maxLength: 1000 }),
      SecurityError,
      'Should enforce length limit'
    );
  });

  it('should enforce nesting depth limits', () => {
    const deepQuery = '['.repeat(200) + ']'.repeat(200);

    assert.throws(
      () => QuerySanitizer.sanitize(deepQuery, { maxDepth: 100 }),
      SecurityError,
      'Should enforce nesting depth'
    );
  });

  it('should block __proto__ access', () => {
    const malicious = '$.__proto__.polluted';

    assert.throws(
      () => QuerySanitizer.sanitize(malicious),
      SecurityError,
      'Should block __proto__'
    );
  });

  it('should sanitize for logging', () => {
    const query = 'Very long query ' + 'x'.repeat(200);

    const sanitized = QuerySanitizer.sanitizeForLogging(query);

    assert.ok(sanitized.length <= 100);
    assert.ok(sanitized.endsWith('...'));
  });

  it('should allow legitimate queries', () => {
    const legitimate = [
      '$[*]',
      '$.users[?(@.age > 18)]',
      '$.products[?(@.price < 100 && @.inStock)]',
      '$..email',
    ];

    for (const query of legitimate) {
      assert.doesNotThrow(() => {
        QuerySanitizer.sanitize(query);
      });
    }
  });
});
```

---

## Deployment

### Files to Create/Modify

**New Files:**
- `src/cli/query-sanitizer.ts`
- `test/security/exploits/BF005-command-injection.exploit.test.ts`

**Modified Files:**
- `src/cli.ts` (add sanitization)
- `src/errors/index.ts` (SecurityError)

### Success Criteria

- [ ] Input validation and sanitization
- [ ] Length and depth limits enforced
- [ ] Dangerous patterns blocked
- [ ] ANSI codes stripped
- [ ] Error messages don't leak queries
- [ ] All exploit tests pass
- [ ] Legitimate queries work

---


**STATUS: 🟢 COMPLETED (2025-11-05)**
**COMMIT: 3bd5e32 - All 22 security tests passing**
