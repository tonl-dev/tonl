/**
 * FileEditor Tests
 * Tests for safe in-place TONL file editing with backup and atomic saves
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { FileEditor } from '../dist/modification/file-editor.js';
import { encodeTONL } from '../dist/encode.js';

// Test directory setup - must be within project directory for PathValidator security
const testDir = join(process.cwd(), 'test-temp', `file-editor-${Date.now()}-${Math.random().toString(36).substring(7)}`);

function createTestFile(name: string, data: any): string {
  const filePath = join(testDir, name);
  const content = encodeTONL(data);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function cleanupFile(filePath: string): void {
  const files = [
    filePath,
    `${filePath}.bak`,
    `${filePath}.lock`,
    `${filePath}.backup`
  ];
  for (const f of files) {
    if (existsSync(f)) {
      try { unlinkSync(f); } catch { /* ignore */ }
    }
  }
}

describe('FileEditor', () => {
  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('open/openSync', () => {
    test('should open existing TONL file (async)', async () => {
      const testData = { name: 'Alice', age: 30 };
      const filePath = createTestFile('open-async.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath);
        assert.deepStrictEqual(editor.data, testData);
        assert.strictEqual(editor.getFilePath(), filePath);
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should open existing TONL file (sync)', () => {
      const testData = { users: [{ id: 1, name: 'Bob' }] };
      const filePath = createTestFile('open-sync.tonl', testData);

      try {
        const editor = FileEditor.openSync(filePath);
        assert.deepStrictEqual(editor.data, testData);
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should throw on non-existent file', async () => {
      const fakePath = join(testDir, 'non-existent.tonl');

      await assert.rejects(
        async () => FileEditor.open(fakePath),
        /File not found|ENOENT|no such file/i
      );
    });

    test('should throw on non-existent file (sync)', () => {
      const fakePath = join(testDir, 'non-existent-sync.tonl');

      assert.throws(
        () => FileEditor.openSync(fakePath),
        /File not found|ENOENT|no such file/i
      );
    });
  });

  describe('save/saveSync', () => {
    test('should save modifications (async)', async () => {
      const testData = { count: 0 };
      const filePath = createTestFile('save-async.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath, { backup: false });
        editor.data.count = 42;
        await editor.save();

        // Verify file was updated
        const content = readFileSync(filePath, 'utf-8');
        assert.ok(content.includes('42'));
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should save modifications (sync)', () => {
      const testData = { value: 'original' };
      const filePath = createTestFile('save-sync.tonl', testData);

      try {
        const editor = FileEditor.openSync(filePath, { backup: false });
        editor.data.value = 'modified';
        editor.saveSync();

        // Verify file was updated
        const content = readFileSync(filePath, 'utf-8');
        assert.ok(content.includes('modified'));
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should create backup before save', async () => {
      const testData = { version: 1 };
      const filePath = createTestFile('backup-test.tonl', testData);
      const backupPath = `${filePath}.bak`;

      try {
        const editor = await FileEditor.open(filePath, { backup: true });
        editor.data.version = 2;
        await editor.save();

        // Verify backup was created
        assert.ok(existsSync(backupPath), 'Backup file should exist');

        // Verify backup contains original data
        const backupContent = readFileSync(backupPath, 'utf-8');
        assert.ok(backupContent.includes('1'), 'Backup should contain original version');
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should use custom backup suffix', async () => {
      const testData = { data: 'test' };
      const filePath = createTestFile('custom-suffix.tonl', testData);
      const customBackupPath = `${filePath}.backup`;

      try {
        const editor = await FileEditor.open(filePath, {
          backup: true,
          backupSuffix: '.backup'
        });
        editor.data.data = 'updated';
        await editor.save();

        assert.ok(existsSync(customBackupPath), 'Custom backup file should exist');
      } finally {
        cleanupFile(filePath);
        if (existsSync(customBackupPath)) unlinkSync(customBackupPath);
      }
    });

    test('should perform atomic save (no partial writes)', async () => {
      const testData = {
        items: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` }))
      };
      const filePath = createTestFile('atomic-save.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath, { backup: false });

        // Modify all items
        for (let i = 0; i < 100; i++) {
          editor.data.items[i].value = `modified-${i}`;
        }

        await editor.save();

        // Read back and verify integrity
        const content = readFileSync(filePath, 'utf-8');

        // Check that all modifications are present
        for (let i = 0; i < 100; i++) {
          assert.ok(
            content.includes(`modified-${i}`),
            `Should contain modified-${i}`
          );
        }
      } finally {
        cleanupFile(filePath);
      }
    });
  });

  describe('isModified', () => {
    test('should return false when no changes', async () => {
      const testData = { unchanged: true };
      const filePath = createTestFile('unmodified.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath);
        assert.strictEqual(editor.isModified(), false);
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should return true when data is changed', async () => {
      const testData = { value: 1 };
      const filePath = createTestFile('modified.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath);
        editor.data.value = 2;
        assert.strictEqual(editor.isModified(), true);
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should return false after save', async () => {
      const testData = { counter: 0 };
      const filePath = createTestFile('modified-saved.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath, { backup: false });
        editor.data.counter = 1;
        assert.strictEqual(editor.isModified(), true);

        await editor.save();
        assert.strictEqual(editor.isModified(), false);
      } finally {
        cleanupFile(filePath);
      }
    });
  });

  describe('reload/reloadSync', () => {
    test('should reload file and discard changes (async)', async () => {
      const testData = { status: 'original' };
      const filePath = createTestFile('reload-async.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath);
        editor.data.status = 'modified';
        assert.strictEqual(editor.data.status, 'modified');

        await editor.reload();
        assert.strictEqual(editor.data.status, 'original');
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should reload file and discard changes (sync)', () => {
      const testData = { flag: false };
      const filePath = createTestFile('reload-sync.tonl', testData);

      try {
        const editor = FileEditor.openSync(filePath);
        editor.data.flag = true;

        editor.reloadSync();
        assert.strictEqual(editor.data.flag, false);
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should pick up external changes on reload', async () => {
      const testData = { externalValue: 1 };
      const filePath = createTestFile('external-change.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath);

        // Simulate external change
        const newContent = encodeTONL({ externalValue: 999 });
        writeFileSync(filePath, newContent, 'utf-8');

        // Reload should pick up external change
        await editor.reload();
        assert.strictEqual(editor.data.externalValue, 999);
      } finally {
        cleanupFile(filePath);
      }
    });
  });

  describe('restoreBackup/restoreBackupSync', () => {
    test('should restore from backup (async)', async () => {
      const testData = { version: 1 };
      const filePath = createTestFile('restore-async.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath, { backup: true });
        editor.data.version = 2;
        await editor.save();

        // Now restore from backup
        await editor.restoreBackup();
        assert.strictEqual(editor.data.version, 1);

        // File should also be restored
        const content = readFileSync(filePath, 'utf-8');
        assert.ok(content.includes('1'));
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should restore from backup (sync)', () => {
      const testData = { data: 'original' };
      const filePath = createTestFile('restore-sync.tonl', testData);

      try {
        const editor = FileEditor.openSync(filePath, { backup: true });
        editor.data.data = 'changed';
        editor.saveSync();

        editor.restoreBackupSync();
        assert.strictEqual(editor.data.data, 'original');
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should throw when backup does not exist', async () => {
      const testData = { noBackup: true };
      const filePath = createTestFile('no-backup.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath, { backup: false });

        await assert.rejects(
          async () => editor.restoreBackup(),
          /backup file not found/i
        );
      } finally {
        cleanupFile(filePath);
      }
    });
  });

  describe('file locking', () => {
    test('should prevent concurrent sync saves', () => {
      const testData = { concurrent: true };
      const filePath = createTestFile('lock-test.tonl', testData);
      const lockPath = `${filePath}.lock`;

      try {
        // Create a lock file manually
        writeFileSync(lockPath, '12345', { flag: 'wx' });

        const editor = FileEditor.openSync(filePath, { backup: false });
        editor.data.concurrent = false;

        // Should fail because file is locked
        assert.throws(
          () => editor.saveSync(),
          /locked by another process/i
        );
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should release lock after save', async () => {
      const testData = { lockRelease: true };
      const filePath = createTestFile('lock-release.tonl', testData);
      const lockPath = `${filePath}.lock`;

      try {
        const editor = await FileEditor.open(filePath, { backup: false });
        editor.data.lockRelease = false;
        await editor.save();

        // Lock should be released
        assert.ok(!existsSync(lockPath), 'Lock file should be removed after save');
      } finally {
        cleanupFile(filePath);
      }
    });
  });

  describe('encoding options', () => {
    test('should use custom encoding options', async () => {
      const testData = { items: ['a', 'b', 'c'] };
      const filePath = createTestFile('encoding-options.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath, {
          backup: false,
          encoding: { delimiter: '|' }
        });
        editor.data.items.push('d');
        await editor.save();

        const content = readFileSync(filePath, 'utf-8');
        // With pipe delimiter, values should be separated by |
        assert.ok(content.includes('|'), 'Should use pipe delimiter');
      } finally {
        cleanupFile(filePath);
      }
    });
  });

  describe('complex data', () => {
    test('should handle nested objects', async () => {
      const testData = {
        user: {
          profile: {
            name: 'Test',
            settings: {
              theme: 'dark'
            }
          }
        }
      };
      const filePath = createTestFile('nested.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath, { backup: false });
        editor.data.user.profile.settings.theme = 'light';
        await editor.save();

        // Reload and verify
        const editor2 = await FileEditor.open(filePath);
        assert.strictEqual(editor2.data.user.profile.settings.theme, 'light');
      } finally {
        cleanupFile(filePath);
      }
    });

    test('should handle arrays of objects', async () => {
      const testData = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' }
        ]
      };
      const filePath = createTestFile('array-objects.tonl', testData);

      try {
        const editor = await FileEditor.open(filePath, { backup: false });
        editor.data.items.push({ id: 3, name: 'Item 3' });
        await editor.save();

        const editor2 = await FileEditor.open(filePath);
        assert.strictEqual(editor2.data.items.length, 3);
        assert.strictEqual(editor2.data.items[2].id, 3);
      } finally {
        cleanupFile(filePath);
      }
    });
  });
});
