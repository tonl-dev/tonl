/**
 * Tests for query sanitizer
 * Coverage target: src/cli/query-sanitizer.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { QuerySanitizer } from '../dist/cli/query-sanitizer.js';
import { SecurityError } from '../dist/errors/index.js';

describe('QuerySanitizer', () => {
  describe('sanitize', () => {
    it('should sanitize basic query', () => {
      const result = QuerySanitizer.sanitize('$.users[0].name');
      assert.strictEqual(result, '$.users[0].name');
    });

    it('should throw on eval pattern', () => {
      assert.throws(
        () => QuerySanitizer.sanitize('$.test eval()'),
        SecurityError
      );
    });

    it('should throw on require pattern', () => {
      assert.throws(
        () => QuerySanitizer.sanitize('require("fs")'),
        SecurityError
      );
    });

    it('should throw on directory traversal', () => {
      assert.throws(
        () => QuerySanitizer.sanitize('../../../etc/passwd'),
        SecurityError
      );
    });

    it('should handle empty query', () => {
      const result = QuerySanitizer.sanitize('');
      assert.strictEqual(result, '');
    });

    it('should handle complex nested query', () => {
      const result = QuerySanitizer.sanitize('$.users[*].profile.settings');
      assert.strictEqual(result, '$.users[*].profile.settings');
    });

    it('should throw on too long query', () => {
      const longQuery = 'a'.repeat(2000);
      assert.throws(
        () => QuerySanitizer.sanitize(longQuery),
        /too long/i
      );
    });

    it('should throw on too deep nesting', () => {
      const deepQuery = '['.repeat(150) + ']'.repeat(150);
      assert.throws(
        () => QuerySanitizer.sanitize(deepQuery),
        /too deep/i
      );
    });

    it('should throw on null bytes', () => {
      assert.throws(
        () => QuerySanitizer.sanitize('test\0null'),
        /null byte/i
      );
    });

    it('should strip ANSI codes by default', () => {
      const result = QuerySanitizer.sanitize('\x1b[31mred\x1b[0m');
      assert.strictEqual(result, 'red');
    });

    it('should respect maxLength option', () => {
      const query = 'a'.repeat(100);
      const result = QuerySanitizer.sanitize(query, { maxLength: 200 });
      assert.strictEqual(result, query);
    });

    it('should throw on non-string query', () => {
      assert.throws(
        () => QuerySanitizer.sanitize(123 as any),
        SecurityError
      );
    });
  });

  describe('sanitizeForLogging', () => {
    it('should truncate long queries', () => {
      const longQuery = 'a'.repeat(200);
      const result = QuerySanitizer.sanitizeForLogging(longQuery);
      assert.ok(result.length <= 100);
      assert.ok(result.endsWith('...'));
    });

    it('should replace newlines', () => {
      const query = 'line1\nline2\rline3';
      const result = QuerySanitizer.sanitizeForLogging(query);
      assert.ok(!result.includes('\n'));
      assert.ok(!result.includes('\r'));
    });

    it('should strip ANSI codes', () => {
      const query = '\x1b[31mred\x1b[0m';
      const result = QuerySanitizer.sanitizeForLogging(query);
      assert.strictEqual(result, 'red');
    });
  });
});
