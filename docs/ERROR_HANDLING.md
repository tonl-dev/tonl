# TONL Error Handling Guide

**Version:** 2.5.1
**Status:** Stable & Production Ready
**Last Updated:** 2025-12-20

This guide covers error handling in TONL, including error types, best practices, and troubleshooting.

---

## Table of Contents

1. [Error Classes](#error-classes)
2. [Error Messages](#error-messages)
3. [Catching Errors](#catching-errors)
4. [Security Considerations](#security-considerations)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

---

## Error Classes

TONL provides a hierarchy of error classes for different failure scenarios:

### TONLError (Base Class)

Base class for all TONL-specific errors with location tracking.

```typescript
import { TONLError } from 'tonl/errors';

class TONLError extends Error {
  line?: number;      // Line number where error occurred
  column?: number;    // Column number
  source?: string;    // Source code snippet
}
```

**Example:**
```typescript
try {
  decodeTONL(invalidContent);
} catch (e) {
  if (e instanceof TONLError) {
    console.log(`Error at line ${e.line}: ${e.message}`);
  }
}
```

---

### TONLParseError

Thrown for syntax errors during parsing.

```typescript
import { TONLParseError } from 'tonl/errors';

class TONLParseError extends TONLError {
  suggestion?: string;  // Helpful suggestion for fixing
}
```

**Common Causes:**
- Invalid header format
- Unclosed quotes
- Malformed lines
- Invalid delimiters

**Example:**
```typescript
try {
  TONLDocument.parse(`
    invalid: content: here
  `);
} catch (e) {
  if (e instanceof TONLParseError) {
    console.log(e.message);      // Error description
    console.log(e.suggestion);   // How to fix it
  }
}
```

---

### TONLValidationError

Thrown when data fails schema validation.

```typescript
import { TONLValidationError } from 'tonl/errors';

class TONLValidationError extends TONLError {
  field: string;      // Field that failed validation
  expected?: string;  // Expected value/type
  actual?: string;    // Actual value/type
}
```

**Example:**
```typescript
import { validateTONL, parseSchema } from 'tonl/schema';

const schema = parseSchema(`@schema v1
age: u32 min:0 max:150
`);

const result = validateTONL({ age: -5 }, schema);
if (!result.valid) {
  for (const error of result.errors) {
    console.log(`Field: ${error.field}`);
    console.log(`Expected: ${error.expected}`);
    console.log(`Actual: ${error.actual}`);
  }
}
```

---

### TONLTypeError

Thrown for type mismatch errors.

```typescript
import { TONLTypeError } from 'tonl/errors';

class TONLTypeError extends TONLError {
  expected: string;  // Expected type
  actual: string;    // Actual type
}
```

**Example:**
```typescript
try {
  doc.push('notAnArray', 'value');
} catch (e) {
  if (e instanceof TONLTypeError) {
    console.log(`Expected ${e.expected}, got ${e.actual}`);
  }
}
```

---

### SecurityError

Thrown for security-related issues.

```typescript
import { SecurityError } from 'tonl/errors';

class SecurityError extends Error {
  details?: Record<string, any>;  // Additional context
}
```

**Triggers:**
- Prototype pollution attempts
- Path traversal attacks
- ReDoS (regex denial of service)
- Buffer overflow attempts
- Excessive nesting depth

**Example:**
```typescript
try {
  // Attempting prototype pollution
  doc.set('__proto__.polluted', true);
} catch (e) {
  if (e instanceof SecurityError) {
    console.log('Security violation:', e.message);
    console.log('Details:', e.details);
  }
}
```

---

## Error Messages

TONL uses centralized, consistent error messages:

### Parse Errors

| Error | Description |
|-------|-------------|
| `UNEXPECTED_TOKEN` | Unexpected character during parsing |
| `INVALID_HEADER` | Malformed header line |
| `UNCLOSED_QUOTE` | String quote not closed |
| `INVALID_DELIMITER` | Unsupported delimiter character |
| `MALFORMED_LINE` | Line doesn't match expected format |

### Type Errors

| Error | Description |
|-------|-------------|
| `TYPE_MISMATCH` | Value type doesn't match expected |
| `INVALID_INDEX` | Array index out of bounds |
| `NOT_AN_ARRAY` | Expected array, got something else |
| `NOT_AN_OBJECT` | Expected object, got something else |

### Security Errors

| Error | Description |
|-------|-------------|
| `PROTOTYPE_POLLUTION` | Attempt to access `__proto__` or similar |
| `PATH_TRAVERSAL` | Attempt to escape allowed directories |
| `REGEX_TOO_LONG` | Regex pattern exceeds safe length |
| `REGEX_TOO_COMPLEX` | Regex nesting depth too high |
| `DANGEROUS_REGEX` | Known ReDoS pattern detected |

### Resource Limit Errors

| Error | Description |
|-------|-------------|
| `INPUT_TOO_LARGE` | Input exceeds maximum size |
| `LINE_TOO_LONG` | Single line exceeds maximum length |
| `DEPTH_EXCEEDED` | Nesting depth exceeds maximum |
| `BLOCK_LINES_EXCEEDED` | Block has too many lines |
| `BUFFER_OVERFLOW` | Stream buffer would overflow |

### Query Errors

| Error | Description |
|-------|-------------|
| `INVALID_PATH` | Path expression is invalid |
| `FILTER_SYNTAX` | Filter expression has syntax error |
| `QUERY_TOO_DEEP` | Query nesting exceeds maximum |

### Schema Errors

| Error | Description |
|-------|-------------|
| `SCHEMA_VIOLATION` | Data violates schema constraint |
| `REQUIRED_FIELD` | Required field is missing |
| `INVALID_ENUM` | Value not in allowed enum list |
| `PATTERN_MISMATCH` | Value doesn't match regex pattern |

### File Errors

| Error | Description |
|-------|-------------|
| `FILE_NOT_FOUND` | File doesn't exist |
| `FILE_LOCKED` | File is locked by another process |
| `BACKUP_NOT_FOUND` | Backup file for recovery not found |

---

## Catching Errors

### Basic Error Handling

```typescript
import { decodeTONL } from 'tonl';
import { TONLError, TONLParseError } from 'tonl/errors';

function safeParse(content: string) {
  try {
    return decodeTONL(content);
  } catch (e) {
    if (e instanceof TONLParseError) {
      console.error('Parse error:', e.message);
      if (e.suggestion) {
        console.log('Suggestion:', e.suggestion);
      }
      return null;
    }

    if (e instanceof TONLError) {
      console.error('TONL error:', e.message);
      return null;
    }

    // Re-throw unknown errors
    throw e;
  }
}
```

### Async/Await with Errors

```typescript
import { TONLDocument } from 'tonl';
import { SecurityError } from 'tonl/errors';

async function loadDocument(path: string) {
  try {
    return await TONLDocument.load(path);
  } catch (e) {
    if (e instanceof SecurityError) {
      console.error('Security issue:', e.message);
      // Log for security audit
      logSecurityEvent(e);
      return null;
    }
    throw e;
  }
}
```

### Validation Result Handling

Schema validation returns a result object instead of throwing:

```typescript
import { validateTONL, parseSchema } from 'tonl/schema';

const schema = parseSchema(`@schema v1
name: str required min:2
age: u32 min:0 max:150
email: str pattern:email
`);

const data = {
  name: 'A',        // Too short
  age: 200,         // Out of range
  // email missing
};

const result = validateTONL(data, schema);

if (!result.valid) {
  console.log(`Found ${result.errors.length} validation errors:`);

  for (const error of result.errors) {
    console.log(`- ${error.field}: ${error.message}`);
  }
}

// Output:
// Found 3 validation errors:
// - name: Value too short (min: 2)
// - age: Value exceeds maximum (max: 150)
// - email: Required field is missing
```

---

## Security Considerations

### Development vs Production Mode

Error detail level is controlled by `NODE_ENV`:

```typescript
// Development mode (NODE_ENV=development)
// Full error details including source code

// Production mode (NODE_ENV=production or unset)
// Minimal error info to prevent information leakage
```

**Development output:**
```
TONLParseError: Unexpected token '{'
  at line 5:12

    4 | name: Alice
  > 5 | invalid: {{{
           ^
    6 | age: 30

💡 Suggestion: Check for unclosed braces
```

**Production output:**
```
TONLParseError: Unexpected token '{' (line 5)
```

### Protected Properties

TONL prevents access to dangerous object properties:

```typescript
const BLOCKED_PROPERTIES = [
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__'
];
```

Attempting to access these throws `SecurityError`:

```typescript
try {
  doc.set('__proto__.polluted', true);
} catch (e) {
  // SecurityError: Access to '__proto__' is forbidden
}
```

### Resource Limits

Default security limits:

| Resource | Limit |
|----------|-------|
| Max input size | 10MB |
| Max line length | 100,000 chars |
| Max nesting depth | 100 levels |
| Max block lines | 10,000 lines |
| Max regex length | 1,000 chars |
| Max regex nesting | 5 levels |
| Max buffer size | 50MB |

---

## Troubleshooting

### "Unexpected token" errors

**Cause:** Usually malformed TONL syntax.

**Solution:**
1. Check for unclosed quotes or braces
2. Verify delimiter consistency
3. Check indentation (spaces vs tabs)

```typescript
// Bad
name: "unclosed quote
items: [1, 2, 3

// Good
name: "closed quote"
items: [1, 2, 3]
```

### "Maximum nesting depth exceeded"

**Cause:** Data structure too deeply nested.

**Solution:**
1. Flatten data structure if possible
2. Increase depth limit (not recommended for untrusted input)

```typescript
// Increase limit (for trusted data only)
const doc = TONLDocument.parse(content, {
  maxDepth: 200
});
```

### "Buffer overflow prevented"

**Cause:** Streaming input exceeds buffer size.

**Solution:**
1. Process smaller chunks
2. Use streaming with backpressure

```typescript
const stream = createDecodeStream({
  highWaterMark: 64 * 1024  // 64KB chunks
});
```

### "Path traversal detected"

**Cause:** File path attempts to escape allowed directory.

**Solution:**
1. Validate and sanitize file paths
2. Use absolute paths within allowed directories

```typescript
import { resolve, relative } from 'path';

function safePath(userPath: string, baseDir: string): string {
  const resolved = resolve(baseDir, userPath);
  const rel = relative(baseDir, resolved);

  if (rel.startsWith('..')) {
    throw new Error('Path traversal attempt');
  }

  return resolved;
}
```

### "Required field is missing"

**Cause:** Data doesn't include a field marked as `required` in schema.

**Solution:**
1. Add the missing field
2. Mark field as optional in schema

```typescript
// Schema
@schema v1
name: str required
nickname: str  // Optional (no 'required')

// Data must include 'name'
{ name: "Alice" }  // ✓ Valid
{ nickname: "Ali" }  // ✗ Missing 'name'
```

---

## Best Practices

### 1. Always Catch Specific Error Types

```typescript
try {
  // TONL operations
} catch (e) {
  if (e instanceof TONLParseError) {
    // Handle parse errors
  } else if (e instanceof TONLValidationError) {
    // Handle validation errors
  } else if (e instanceof SecurityError) {
    // Handle security issues
  } else {
    // Unknown error - re-throw or log
    throw e;
  }
}
```

### 2. Use Validation Results for User Input

```typescript
// Don't throw on user input - use validation
const result = validateTONL(userInput, schema);
if (!result.valid) {
  return {
    success: false,
    errors: result.errors.map(e => ({
      field: e.field,
      message: e.message
    }))
  };
}
```

### 3. Log Security Errors

```typescript
import { SecurityError } from 'tonl/errors';

try {
  processInput(untrustedData);
} catch (e) {
  if (e instanceof SecurityError) {
    // Log for security monitoring
    securityLogger.warn({
      type: 'TONL_SECURITY_ERROR',
      message: e.message,
      details: e.details,
      timestamp: new Date().toISOString()
    });

    // Return generic error to user
    throw new Error('Invalid input');
  }
  throw e;
}
```

### 4. Set Appropriate Limits for Untrusted Input

```typescript
// For user-provided content
const strictOptions = {
  maxDepth: 20,
  maxLineLength: 10000,
  strict: true
};

const doc = TONLDocument.parse(userContent, strictOptions);
```

### 5. Use formatErrorLocation for Debugging

```typescript
import { formatErrorLocation, TONLParseError } from 'tonl/errors';

try {
  decodeTONL(content);
} catch (e) {
  if (e instanceof TONLParseError && e.line !== undefined) {
    const lines = content.split('\n');
    const context = formatErrorLocation(lines, e.line - 1, e.column);
    console.log('Error context:');
    console.log(context);
  }
}
```

---

## API Reference

### Importing Error Classes

```typescript
// All error classes
import {
  TONLError,
  TONLParseError,
  TONLValidationError,
  TONLTypeError,
  SecurityError,
  formatErrorLocation
} from 'tonl/errors';

// Error messages
import { ErrorMessages, type ErrorMessageKey } from 'tonl/errors';
```

### Error Message Usage

```typescript
import { ErrorMessages } from 'tonl/errors';

// Generate consistent error messages
const msg1 = ErrorMessages.TYPE_MISMATCH('string', 'number', 'user.age');
// "Expected string but got number at path 'user.age'"

const msg2 = ErrorMessages.REQUIRED_FIELD('email');
// "Required field 'email' is missing"

const msg3 = ErrorMessages.DEPTH_EXCEEDED(101, 100);
// "Maximum nesting depth exceeded: 101 (max: 100)"
```
