/**
 * Path Validator - Path Traversal Protection
 *
 * Validates and sanitizes file paths to prevent directory traversal attacks.
 * Ensures all file operations stay within allowed directories.
 *
 * Security Features:
 * - Blocks absolute paths (unless explicitly allowed)
 * - Detects and blocks ../ traversal sequences
 * - Validates symlink targets
 * - Checks for null bytes
 * - Windows-specific protections (UNC paths, reserved names)
 */

import { resolve, normalize, relative, isAbsolute, sep } from 'path';
import { existsSync, lstatSync, realpathSync } from 'fs';
import { SecurityError } from '../errors/index.js';

export interface PathValidationOptions {
  /**
   * Base directory to restrict paths to (default: process.cwd())
   * All paths must resolve within this directory
   */
  allowedDirectory?: string;

  /**
   * Allow absolute paths (default: false)
   * If false, absolute paths will be rejected
   */
  allowAbsolutePaths?: boolean;

  /**
   * Follow symlinks and validate their targets (default: false)
   * If false, symlinks will be rejected immediately
   */
  followSymlinks?: boolean;

  /**
   * Require that the file/directory exists (default: false)
   * Useful for read operations; set false for write operations
   */
  requireExists?: boolean;
}

/**
 * Path validator with security checks
 */
export class PathValidator {
  /**
   * Validate and sanitize a file path
   *
   * @param userPath - User-supplied path (untrusted input)
   * @param options - Validation options
   * @returns Sanitized absolute path (safe to use)
   * @throws {SecurityError} if path is unsafe
   */
  static validate(userPath: string, options?: PathValidationOptions): string {
    const opts: Required<PathValidationOptions> = {
      allowedDirectory: options?.allowedDirectory ?? process.cwd(),
      allowAbsolutePaths: options?.allowAbsolutePaths ?? false,
      followSymlinks: options?.followSymlinks ?? false,
      requireExists: options?.requireExists ?? false,
    };

    // 1. Type and basic validation
    if (!userPath || typeof userPath !== 'string') {
      throw new SecurityError('Invalid path: must be non-empty string', {
        type: typeof userPath,
        value: userPath,
      });
    }

    // Trim whitespace
    userPath = userPath.trim();

    if (userPath.length === 0) {
      throw new SecurityError('Invalid path: cannot be empty after trim');
    }

    // 2. Check for null bytes (path injection)
    if (userPath.includes('\0')) {
      throw new SecurityError('Invalid path: null byte detected', {
        path: userPath,
      });
    }

    // 3. Windows: Check for UNC paths (before other processing)
    if (process.platform === 'win32') {
      // UNC paths start with \\ (e.g., \\server\share)
      if (userPath.startsWith('\\\\')) {
        throw new SecurityError('UNC paths not allowed', {
          path: userPath,
        });
      }
    }

    // 4. Normalize path (resolve . and ..)
    const normalizedPath = normalize(userPath);

    // 5. Resolve to absolute path
    // If path is already absolute, use it as-is
    // Otherwise, resolve relative to allowed directory
    let absolutePath: string;
    try {
      if (isAbsolute(normalizedPath)) {
        absolutePath = normalizedPath;
      } else {
        absolutePath = resolve(opts.allowedDirectory, normalizedPath);
      }
    } catch (error: any) {
      throw new SecurityError(`Path resolution failed: ${error.message}`, {
        path: userPath,
        allowedDirectory: opts.allowedDirectory,
      });
    }

    // 6. Verify path is within allowed directory
    const normalizedAllowed = normalize(resolve(opts.allowedDirectory));
    const relativePath = relative(normalizedAllowed, absolutePath);

    // If relative path starts with .. or is absolute, it's outside allowed directory
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new SecurityError(
        'Path traversal detected: path escapes allowed directory',
        {
          userPath,
          resolvedPath: absolutePath,
          allowedDirectory: normalizedAllowed,
          relativePath,
        }
      );
    }

    // 8. If path exists, check for symlinks
    if (existsSync(absolutePath)) {
      try {
        const stats = lstatSync(absolutePath);

        if (stats.isSymbolicLink()) {
          if (!opts.followSymlinks) {
            throw new SecurityError(
              'Symlinks not allowed',
              {
                path: userPath,
                resolvedPath: absolutePath,
              }
            );
          }

          // Resolve symlink and recursively validate its target
          try {
            const symlinkTarget = realpathSync(absolutePath);

            // Recursively validate symlink target
            // (This prevents symlink chains that escape directory)
            return this.validate(symlinkTarget, {
              ...options,
              requireExists: false, // Already checked existence
            });
          } catch (error: any) {
            throw new SecurityError(
              `Invalid symlink target: ${error.message}`,
              {
                symlink: absolutePath,
                error: error.message,
              }
            );
          }
        }
      } catch (error: any) {
        if (error instanceof SecurityError) {
          throw error;
        }
        // lstatSync errors are not security issues
      }
    }

    // 9. Windows: Check for reserved device names
    if (process.platform === 'win32') {
      const reservedNames = new Set([
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5',
        'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5',
        'LPT6', 'LPT7', 'LPT8', 'LPT9'
      ]);

      // Get just the filename (without path and extension)
      const parts = absolutePath.split(sep);
      const filename = parts[parts.length - 1] || '';
      const nameWithoutExt = filename.split('.')[0].toUpperCase();

      if (reservedNames.has(nameWithoutExt)) {
        throw new SecurityError(
          'Reserved device name not allowed',
          {
            path: userPath,
            deviceName: nameWithoutExt,
          }
        );
      }
    }

    // 10. Check existence if required
    if (opts.requireExists && !existsSync(absolutePath)) {
      throw new SecurityError(
        'File not found',
        {
          path: userPath,
          resolvedPath: absolutePath,
        }
      );
    }

    // 11. Path is safe - return sanitized absolute path
    return absolutePath;
  }

  /**
   * Validate path for reading (requires existence)
   */
  static validateRead(userPath: string, allowedDir?: string): string {
    return this.validate(userPath, {
      allowedDirectory: allowedDir,
      requireExists: true,
      followSymlinks: false,
      allowAbsolutePaths: false,
    });
  }

  /**
   * Validate path for writing (doesn't require existence)
   */
  static validateWrite(userPath: string, allowedDir?: string): string {
    return this.validate(userPath, {
      allowedDirectory: allowedDir,
      requireExists: false,
      followSymlinks: false,
      allowAbsolutePaths: false,
    });
  }
}
