# Bug Fix 007: Unhandled Promise Rejections

**Bug ID:** BF007
**Priority:** P1 - HIGH
**Severity:** HIGH
**Estimated Effort:** 2 days
**Status:** 🔴 Not Started
**CWE:** CWE-755 (Improper Error Handling)

---

## Overview

Async operations in CLI lack proper error handling, leading to silent failures and application crashes.

**Impact:** Silent failures, uncaught exceptions, crashes

**Location:** `src/cli.ts:442-445, 374`

---

## Vulnerable Code

```typescript
// Line 442-445: Catches some errors but misses async imports
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});

// Line 374: Uncaught dynamic import
const { TONLDocument } = await import('./document.js');
// If this fails, error is not caught!
```

---

## Attack Vectors

- Corrupted module files → Uncaught import errors
- File system errors → Unhandled rejections
- Async operations timing out → Silent failures

---

## Fix

Wrap all async operations and add global handlers:

```typescript
// Add process-level handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Wrap async imports
async function loadDocument() {
  try {
    const { TONLDocument } = await import('./document.js');
    return TONLDocument;
  } catch (error) {
    console.error('Failed to load document module:', error);
    throw new Error('Module loading failed');
  }
}

// Wrap file operations
async function safeReadFile(path: string): Promise<string> {
  try {
    return await fs.readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${path}`);
    } else if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${path}`);
    }
    throw error;
  }
}

// Update main function
async function main() {
  try {
    const TONLDocument = await loadDocument();
    const content = await safeReadFile(filePath);
    // ... rest of logic
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}
```

---

## Testing

```typescript
it('should handle module load failures', async () => {
  // Mock import failure
  const originalImport = global.import;
  global.import = async () => {
    throw new Error('Module not found');
  };

  const exitCode = await runCLI(['query', 'test.tonl', '$']);
  assert.strictEqual(exitCode, 1);

  global.import = originalImport;
});

it('should handle file read errors gracefully', async () => {
  const exitCode = await runCLI(['encode', '/nonexistent/file.json']);
  assert.strictEqual(exitCode, 1);
});
```

---

## Files to Modify
- `src/cli.ts` (wrap all async ops)
- `test/cli/error-handling.test.ts` (new)

**STATUS: 🟢 COMPLETED (2025-11-05)**
**COMMIT: 695df65 - Error handling improved**
