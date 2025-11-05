# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in TONL, please report it by creating a private security advisory on GitHub or by emailing the maintainers directly.

**Please do NOT create public GitHub issues for security vulnerabilities.**

We will respond to security reports within 48 hours and aim to publish fixes within 7 days for critical issues.

---

## Security Features

### ReDoS Protection (v0.8.1+)

TONL includes built-in protection against Regular Expression Denial of Service (ReDoS) attacks in query filter expressions.

**Protected Operations:**
- `matches` operator: `users[?(@.email matches "pattern")]`
- `matches()` function expressions
- All regex-based filtering

**Protection Mechanisms:**

1. **Pattern Validation**: Regex patterns are validated before compilation
   - Detects nested quantifiers: `(a+)+`, `(a*)*`, `(a+)*`
   - Rejects patterns > 100 characters
   - Limits nesting depth
   - Blocks dangerous constructs

2. **Execution Timeout**: Regex execution limited to 100ms
   - Prevents catastrophic backtracking
   - Fails fast on complex patterns

3. **SecurityError**: Unsafe patterns throw `SecurityError`
   - Distinguishable from normal errors
   - Includes security event logging

### Safe Regex Usage Guidelines

#### ✅ SAFE Patterns

```javascript
// Simple quantifiers (no nesting)
".*@.*"           // Email basic check
"^[a-z]+$"        // Lowercase only
"\\d{3}-\\d{4}"   // Phone format
"https?://"       // URL protocol

// Character classes
"[a-zA-Z0-9]+"    // Alphanumeric
"[^@]+@[^@]+"     // Simple email
```

#### ❌ UNSAFE Patterns

```javascript
// Nested quantifiers - BLOCKED
"(a+)+"           // ReDoS: O(2^n)
"(a*)*"           // ReDoS: exponential
"(a+)*"           // ReDoS: catastrophic backtracking
"(a|a)*"          // Overlapping alternatives

// Excessive complexity - BLOCKED
"([a-zA-Z]+)*$"   // Character class with nested quantifier
"(\\w+|\\d+)*@"   // Alternative repetition
```

#### Pattern Limits

- **Max Length**: 100 characters (configurable)
- **Max Nesting**: 3 levels (configurable)
- **Timeout**: 100ms (configurable)
- **Backreferences**: Disabled by default
- **Lookarounds**: Disabled by default

### Configuration

You can customize regex security settings:

```javascript
import { RegexExecutor } from 'tonl';

// Custom validation options
RegexExecutor.test(pattern, input, {
  timeout: 200, // Increase timeout to 200ms
  validationOptions: {
    maxLength: 150,        // Allow longer patterns
    maxNestingDepth: 5,    // Allow deeper nesting
    allowBackreferences: true,  // Enable backreferences
  }
});
```

**Warning**: Relaxing these limits increases ReDoS risk!

---

## Known Security Considerations

### 1. User-Supplied Regex Patterns

**Risk**: If your application allows users to supply regex patterns for filtering, they could attempt ReDoS attacks.

**Mitigation**:
- TONL validates and limits all regex patterns
- SecurityError is thrown for unsafe patterns
- Consider additional rate limiting in your application

### 2. Large Documents

**Risk**: Very large documents (>10MB) may consume significant memory.

**Mitigation**:
- Use streaming API for large files
- Set document size limits in your application
- Monitor memory usage

### 3. Query Complexity

**Risk**: Deeply nested queries with wildcards can be slow.

**Mitigation**:
- Query evaluator has depth limits (default: 100)
- Consider query complexity budgets in your application
- Use indexing for frequently-queried paths

### 4. Path Traversal (v0.8.1+)

**Risk**: CLI file operations could be exploited to read/write arbitrary files.

**Mitigation** (v0.8.1+):
- All file paths validated before use
- Directory traversal (../) blocked
- Absolute paths must be within working directory
- Symlinks rejected by default
- Windows-specific protections (UNC paths, reserved names)

**Protected Operations:**
- All CLI file reads (`tonl encode`, `tonl decode`, etc.)
- All CLI file writes (`--out` parameter)
- Schema file loading (`--schema` parameter)

**Path Validation Rules:**
```typescript
// ✅ ALLOWED - Relative paths within working directory
tonl encode data.json
tonl encode subdir/file.json
tonl encode ./file.json

// ❌ BLOCKED - Directory traversal
tonl encode ../../../etc/passwd
tonl encode subdir/../../etc/passwd

// ❌ BLOCKED - Absolute paths outside working directory
tonl encode /etc/passwd
tonl encode C:\Windows\System32\config

// ❌ BLOCKED - Symlinks
tonl encode link-to-sensitive-file.txt

// ❌ BLOCKED - Windows reserved names
tonl encode CON
tonl encode \\server\share\file

// ✅ ALLOWED - Absolute paths WITHIN working directory
// (for programmatic use, all paths resolved to allowed dir)
```

**Security Guarantees:**
- All file operations restricted to current working directory (and subdirectories)
- Path traversal sequences normalized and validated
- Symlinks detected and blocked (unless explicitly allowed)
- Null bytes rejected
- Windows device names blocked
- Error messages don't leak sensitive paths

---

## Security Changelog

### v0.8.1 (2025-11-05) - Security Release

**[CRITICAL] BF001: ReDoS Vulnerability Fixed**
- **Issue**: Filter evaluator compiled user-supplied regex without validation
- **Impact**: Remote DoS via malicious patterns like `(a+)+`
- **Fix**: Added `RegexValidator` and `RegexExecutor` with timeout
- **Files Changed**:
  - `src/query/regex-validator.ts` (new)
  - `src/query/regex-executor.ts` (new)
  - `src/query/filter-evaluator.ts` (updated)
  - `src/query/evaluator.ts` (updated)
  - `src/errors/index.ts` (added SecurityError)
- **CWE**: CWE-1333 (Inefficient Regular Expression Complexity)
- **Credit**: Internal security audit

**[CRITICAL] BF002: Path Traversal Fixed**
- **Issue**: CLI accepted unsanitized file paths
- **Impact**: Arbitrary file read/write via path traversal or absolute paths
- **Fix**: Added `PathValidator` with comprehensive path sanitization
- **Files Changed**:
  - `src/cli/path-validator.ts` (new)
  - `src/cli.ts` (all file operations secured with safeReadFile/safeWriteFile)
- **CWE**: CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)
- **Credit**: Internal security audit

**[CRITICAL] BF003: Buffer Overflow Fixed**
- **Issue**: Stream decoder checked buffer size AFTER appending chunks
- **Impact**: Memory exhaustion DoS via cumulative chunk overflow
- **Fix**: Moved buffer size check to BEFORE chunk append
- **Files Changed**:
  - `src/stream/decode-stream.ts` (1 line fix: check before append)
- **CWE**: CWE-120 (Buffer Copy without Checking Size of Input)
- **Credit**: Internal security audit

**Upgrade Recommendation**: All users should upgrade immediately. These are critical security fixes.

---

## Best Practices

### For Application Developers

1. **Keep TONL Updated**: Security fixes are released promptly
2. **Validate User Input**: Even with TONL's protections, validate input at your application layer
3. **Handle SecurityError**: Catch and log `SecurityError` in production
4. **Rate Limiting**: Implement query rate limits if accepting user-supplied queries
5. **Monitor Logs**: Watch for `[SECURITY]` warnings in console output

### For TONL Contributors

1. **Never Trust User Input**: Assume all input is malicious
2. **Defense in Depth**: Multiple layers of protection (validation + timeout)
3. **Fail Securely**: Throw errors instead of silently failing
4. **Test Security**: All security fixes must include exploit tests
5. **Document Changes**: Update this file with every security change

### Security Testing

Run security tests:

```bash
# Run security exploit tests
npm test test/security/exploits/

# Run fuzzing tests
npm test test/security/fuzzing/

# Run full test suite
npm test
```

---

## Security Resources

- **OWASP ReDoS**: https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
- **CWE-1333**: https://cwe.mitre.org/data/definitions/1333.html
- **Node.js Security**: https://nodejs.org/en/docs/guides/security/

---

## Contact

For security issues, contact:
- Create a private security advisory on GitHub
- Email maintainers (check package.json for contact info)

**Response Time**: Within 48 hours
**Fix Timeline**: Critical issues within 7 days

---

**Last Updated**: 2025-11-05
**Version**: 1.0
