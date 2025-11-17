/**
 * File Editor for Safe In-Place Editing (T017 - Simplified)
 *
 * Provides atomic file operations with backup support
 * SECURITY FIX (BF011): Added file locking to prevent race conditions
 */

import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync, copyFileSync } from 'fs';
import { promises as fs } from 'fs';
import { decodeTONL } from '../decode.js';
import { encodeTONL } from '../encode.js';
import type { EncodeOptions } from '../types.js';
import { PathValidator } from '../cli/path-validator.js';

/**
 * Simple file lock using lock files
 * SECURITY FIX (BF011): Prevents concurrent modifications
 */
class FileLock {
  private lockPath: string;
  private locked: boolean = false;

  constructor(filePath: string) {
    this.lockPath = `${filePath}.lock`;
  }

  async acquire(timeoutMs: number = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Try to create lock file exclusively (fails if exists)
        await fs.writeFile(this.lockPath, String(process.pid), { flag: 'wx' });
        this.locked = true;
        return;
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock file exists, wait and retry
          await new Promise(resolve => setTimeout(resolve, 50));
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Failed to acquire file lock after ${timeoutMs}ms`);
  }

  async release(): Promise<void> {
    if (this.locked && existsSync(this.lockPath)) {
      try {
        await fs.unlink(this.lockPath);
      } catch (error) {
        // Log error but don't throw - lock cleanup failure shouldn't break the application
        console.warn(`Warning: Failed to release file lock at ${this.lockPath}:`, error);
      }
      this.locked = false;
    }
  }

  releaseSync(): void {
    if (this.locked && existsSync(this.lockPath)) {
      try {
        unlinkSync(this.lockPath);
      } catch (error) {
        // Log error but don't throw - lock cleanup failure shouldn't break the application
        console.warn(`Warning: Failed to release file lock at ${this.lockPath}:`, error);
      }
      this.locked = false;
    }
  }
}

export interface FileEditorOptions {
  /**
   * Create backup before saving
   */
  backup?: boolean;

  /**
   * Backup file suffix
   */
  backupSuffix?: string;

  /**
   * Encoding options for TONL output
   */
  encoding?: EncodeOptions;
}

/**
 * FileEditor provides safe in-place editing of TONL files
 *
 * Features:
 * - Atomic saves (write to temp + rename)
 * - Optional backup before modification
 * - Transaction-like semantics
 *
 * @example
 * ```typescript
 * const editor = await FileEditor.open('data.tonl', { backup: true });
 * editor.data.users.push({ name: 'New User' });
 * await editor.save(); // Atomic save with backup
 * ```
 */
export class FileEditor {
  private filePath: string;
  private options: FileEditorOptions;
  public data: any;
  private originalContent: string;

  private constructor(
    filePath: string,
    data: any,
    originalContent: string,
    options: FileEditorOptions
  ) {
    this.filePath = filePath;
    this.data = data;
    this.originalContent = originalContent;
    this.options = {
      backup: true,
      backupSuffix: '.bak',
      ...options
    };
  }

  /**
   * Open a TONL file for editing (async)
   * SECURITY FIX: Added path validation to prevent path traversal attacks
   */
  static async open(filePath: string, options: FileEditorOptions = {}): Promise<FileEditor> {
    // Validate path to prevent directory traversal
    const validatedPath = PathValidator.validateRead(filePath);
    const content = await fs.readFile(validatedPath, 'utf-8');
    const data = decodeTONL(content);
    return new FileEditor(validatedPath, data, content, options);
  }

  /**
   * Open a TONL file for editing (sync)
   * SECURITY FIX: Added path validation to prevent path traversal attacks
   */
  static openSync(filePath: string, options: FileEditorOptions = {}): FileEditor {
    // Validate path to prevent directory traversal
    const validatedPath = PathValidator.validateRead(filePath);
    const content = readFileSync(validatedPath, 'utf-8');
    const data = decodeTONL(content);
    return new FileEditor(validatedPath, data, content, options);
  }

  /**
   * Save changes atomically
   *
   * Process:
   * 1. Create backup (if enabled)
   * 2. Write to temporary file
   * 3. Rename temp file to original (atomic on most systems)
   */
  async save(): Promise<void> {
    // SECURITY FIX (BF011): Acquire file lock before save
    const lock = new FileLock(this.filePath);

    try {
      await lock.acquire(5000); // 5 second timeout

      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const tempPath = `${this.filePath}.tmp.${timestamp}.${random}`;
      const backupPath = `${this.filePath}${this.options.backupSuffix}`;

      try {
        // Create backup
        if (this.options.backup && existsSync(this.filePath)) {
          await fs.copyFile(this.filePath, backupPath);
        }

        // Encode to TONL
        const tonlContent = encodeTONL(this.data, this.options.encoding);

        // Write to temp file
        await fs.writeFile(tempPath, tonlContent, 'utf-8');

        // Atomic rename
        await fs.rename(tempPath, this.filePath);

        // Update original content
        this.originalContent = tonlContent;
      } catch (error) {
        // Cleanup temp file if it exists
        if (existsSync(tempPath)) {
          await fs.unlink(tempPath).catch(() => {});
        }
        throw error;
      }
    } finally {
      // SECURITY FIX (BF011): Always release lock
      await lock.release();
    }
  }

  /**
   * Save changes synchronously (atomic)
   */
  saveSync(): void {
    // SECURITY FIX (BF011): Use unique temp filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const tempPath = `${this.filePath}.tmp.${timestamp}.${random}`;
    const backupPath = `${this.filePath}${this.options.backupSuffix}`;
    const lock = new FileLock(this.filePath);

    // Simple sync lock: create lock file
    const lockPath = lock['lockPath'];
    try {
      writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        throw new Error('File is locked by another process');
      }
      throw error;
    }

    try {
      // Create backup
      if (this.options.backup && existsSync(this.filePath)) {
        copyFileSync(this.filePath, backupPath);
      }

      // Encode to TONL
      const tonlContent = encodeTONL(this.data, this.options.encoding);

      // Write to temp file
      writeFileSync(tempPath, tonlContent, 'utf-8');

      // Atomic rename
      renameSync(tempPath, this.filePath);

      // Update original content
      this.originalContent = tonlContent;
    } catch (error) {
      // Cleanup temp file if it exists
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
      throw error;
    } finally {
      // Release lock
      lock.releaseSync();
    }
  }

  /**
   * Check if file has been modified
   */
  isModified(): boolean {
    const current = encodeTONL(this.data, this.options.encoding);
    return current !== this.originalContent;
  }

  /**
   * Discard changes and reload from file
   */
  async reload(): Promise<void> {
    const content = await fs.readFile(this.filePath, 'utf-8');
    this.data = decodeTONL(content);
    this.originalContent = content;
  }

  /**
   * Discard changes and reload from file (sync)
   */
  reloadSync(): void {
    const content = readFileSync(this.filePath, 'utf-8');
    this.data = decodeTONL(content);
    this.originalContent = content;
  }

  /**
   * Restore from backup
   */
  async restoreBackup(): Promise<void> {
    const backupPath = `${this.filePath}${this.options.backupSuffix}`;
    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    await fs.copyFile(backupPath, this.filePath);
    await this.reload();
  }

  /**
   * Restore from backup (sync)
   */
  restoreBackupSync(): void {
    const backupPath = `${this.filePath}${this.options.backupSuffix}`;
    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    copyFileSync(backupPath, this.filePath);
    this.reloadSync();
  }

  /**
   * Get file path
   */
  getFilePath(): string {
    return this.filePath;
  }
}
