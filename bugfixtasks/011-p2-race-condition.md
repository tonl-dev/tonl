# Bug Fix 011: Race Condition in File Editor

**Bug ID:** BF011
**Priority:** P2 - MEDIUM
**Severity:** MEDIUM
**Estimated Effort:** 3 days
**Status:** 🔴 Not Started
**CWE:** CWE-362 (Concurrent Execution using Shared Resource with Improper Synchronization)

---

## Overview

File save operation has TOCTOU (time-of-check to time-of-use) race condition between backup creation and file rename.

**Impact:** Data loss, file corruption in concurrent scenarios

**Location:** `src/modification/file-editor.ts:93-121`

---

## Vulnerable Code

```typescript
async save(): Promise<void> {
  const tempPath = `${this.filePath}.tmp`;
  const backupPath = `${this.filePath}${this.options.backupSuffix}`;

  // RACE: Another process could modify/delete file here
  if (this.options.backup && existsSync(this.filePath)) {
    await fs.copyFile(this.filePath, backupPath);
  }

  await fs.writeFile(tempPath, tonlContent, 'utf-8');

  // RACE: File could be modified between copyFile and rename
  await fs.rename(tempPath, this.filePath);
}
```

---

## Fix

Implement file locking:

```typescript
import { open, FileHandle } from 'fs/promises';

async save(): Promise<void> {
  const lockPath = `${this.filePath}.lock`;
  let lockFd: FileHandle | null = null;

  try {
    // Acquire exclusive lock
    lockFd = await open(lockPath, 'wx'); // Fails if lock exists

    // Perform atomic save
    const tempPath = `${this.filePath}.tmp.${Date.now()}`;
    const backupPath = `${this.filePath}.bak`;

    if (this.options.backup && existsSync(this.filePath)) {
      await fs.copyFile(this.filePath, backupPath);
    }

    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, this.filePath);

  } finally {
    // Release lock
    if (lockFd) {
      await lockFd.close();
      await fs.unlink(lockPath).catch(() => {});
    }
  }
}
```

---

## Testing

```typescript
it('should prevent concurrent saves', async () => {
  const editor = await FileEditor.open('test.tonl');

  // Start two saves concurrently
  const save1 = editor.save();
  const save2 = editor.save();

  // One should succeed, one should fail with lock error
  await Promise.allSettled([save1, save2]);
  // Verify file integrity
});
```

---

**STATUS: ⏳ DEFERRED - Non-Critical**
**PLANNED FOR: v0.9.0 or v1.1.0 (future maintenance)**
