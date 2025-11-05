/**
 * BULLETPROOF TESTS for Path Validator
 * Target: 80%+ coverage for src/cli/path-validator.ts
 * Focus: Security validation tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PathValidator } from '../dist/cli/path-validator.js';
import { SecurityError } from '../dist/errors/index.js';

describe('BULLETPROOF: PathValidator', () => {
  describe('validate - Core Security Tests', () => {
    it('should throw on empty path', () => {
      assert.throws(
        () => PathValidator.validate(''),
        SecurityError
      );
    });

    it('should throw on null bytes', () => {
      assert.throws(
        () => PathValidator.validate('test\0.json'),
        SecurityError
      );
    });

    it('should throw on UNC paths (Windows)', () => {
      assert.throws(
        () => PathValidator.validate('\\\\server\\share\\file'),
        SecurityError
      );
    });

    it('should throw on directory traversal', () => {
      assert.throws(
        () => PathValidator.validate('../../../etc/passwd'),
        SecurityError
      );
    });

    it('should accept valid relative paths', () => {
      const result = PathValidator.validate('test.json');
      assert.ok(result.endsWith('test.json'));
    });

    it('should normalize paths with dots', () => {
      const result = PathValidator.validate('./test/./file.json');
      assert.ok(result.endsWith('file.json'));
    });

    it('should throw on non-string input', () => {
      assert.throws(
        () => PathValidator.validate(null as any),
        SecurityError
      );
    });

    it('should throw on whitespace-only path', () => {
      assert.throws(
        () => PathValidator.validate('   '),
        SecurityError
      );
    });
  });

  describe('validateRead - Read-specific Tests', () => {
    it('should accept valid read paths', () => {
      const result = PathValidator.validateRead('package.json');
      assert.ok(result.endsWith('package.json'));
    });

    it('should throw on traversal for reads', () => {
      assert.throws(
        () => PathValidator.validateRead('../../../etc/passwd'),
        SecurityError
      );
    });

    it('should allow nested paths', () => {
      const result = PathValidator.validateRead('src/index.ts');
      assert.ok(result.includes('index.ts'));
    });
  });

  describe('validateWrite - Write-specific Tests', () => {
    it('should accept valid write paths', () => {
      const result = PathValidator.validateWrite('output.json');
      assert.ok(result.endsWith('output.json'));
    });

    it('should throw on traversal for writes', () => {
      assert.throws(
        () => PathValidator.validateWrite('../../../tmp/evil'),
        SecurityError
      );
    });

    it('should allow nested output paths', () => {
      const result = PathValidator.validateWrite('out/result.json');
      assert.ok(result.includes('result.json'));
    });
  });

  describe('Security Edge Cases', () => {
    it('should reject multiple traversal attempts', () => {
      assert.throws(
        () => PathValidator.validate('../../../../../../etc'),
        SecurityError
      );
    });

    it('should handle mixed slashes', () => {
      const result = PathValidator.validate('test/data\\file.json');
      assert.ok(result.includes('file.json'));
    });

    it('should trim whitespace from paths', () => {
      const result = PathValidator.validate('  test.json  ');
      assert.ok(result.endsWith('test.json'));
    });
  });
});
