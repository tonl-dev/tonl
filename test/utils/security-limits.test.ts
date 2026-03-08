/**
 * Security Limits Tests (Task 013)
 *
 * Tests for centralized security limits module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_SECURITY_LIMITS,
  MAX_LINE_LENGTH,
  MAX_BUFFER_SIZE,
  MAX_NESTING_DEPTH,
} from '../../dist/utils/security-limits.js';

describe('Security Limits', () => {
  describe('DEFAULT_SECURITY_LIMITS', () => {
    it('should export all required limits', () => {
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_LINE_LENGTH === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_FIELDS_PER_LINE === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_NESTING_DEPTH === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_INPUT_SIZE === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_JSON_SIZE === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_REGEX_PATTERN_LENGTH === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_REGEX_NESTING_DEPTH === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_QUERY_DEPTH === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_ITERATIONS === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_BUFFER_SIZE === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_BLOCK_LINES === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_INDENT === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_STRING_LENGTH === 'number');
      assert.ok(typeof DEFAULT_SECURITY_LIMITS.MAX_ENCODE_DEPTH === 'number');
    });

    it('should have expected default values', () => {
      assert.strictEqual(DEFAULT_SECURITY_LIMITS.MAX_LINE_LENGTH, 100_000);
      assert.strictEqual(DEFAULT_SECURITY_LIMITS.MAX_FIELDS_PER_LINE, 10_000);
      assert.strictEqual(DEFAULT_SECURITY_LIMITS.MAX_NESTING_DEPTH, 100);
      assert.strictEqual(DEFAULT_SECURITY_LIMITS.MAX_INPUT_SIZE, 10 * 1024 * 1024);
      assert.strictEqual(DEFAULT_SECURITY_LIMITS.MAX_BUFFER_SIZE, 10 * 1024 * 1024);
      assert.strictEqual(DEFAULT_SECURITY_LIMITS.MAX_BLOCK_LINES, 10_000);
      assert.strictEqual(DEFAULT_SECURITY_LIMITS.MAX_REGEX_PATTERN_LENGTH, 100);
      assert.strictEqual(DEFAULT_SECURITY_LIMITS.MAX_REGEX_NESTING_DEPTH, 3);
    });

    it('should be frozen (immutable)', () => {
      assert.ok(Object.isFrozen(DEFAULT_SECURITY_LIMITS));
    });
  });

  describe('Individual constant exports', () => {
    it('should export individual constants matching defaults', () => {
      assert.strictEqual(MAX_LINE_LENGTH, DEFAULT_SECURITY_LIMITS.MAX_LINE_LENGTH);
      assert.strictEqual(MAX_BUFFER_SIZE, DEFAULT_SECURITY_LIMITS.MAX_BUFFER_SIZE);
      assert.strictEqual(MAX_NESTING_DEPTH, DEFAULT_SECURITY_LIMITS.MAX_NESTING_DEPTH);
    });
  });

});
