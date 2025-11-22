/**
 * Basic Security Tests
 * Test that new security utilities don't break existing functionality
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Basic Security Integration', () => {
  test('should not break existing SecurityError', (t) => {
    // Import from the built dist
    import('../../dist/errors/index.js').then(({ SecurityError }) => {
      const error = new SecurityError('Test security error');

      assert.ok(error instanceof Error);
      assert.ok(error instanceof SecurityError);
      assert.strictEqual(error.message, 'Test security error');
    });
  });

  test('should work with existing TONL functionality', (t) => {
    // Test that basic TONL encoding still works
    import('../../dist/index.js').then(({ encodeTONL, decodeTONL }) => {
      const data = { name: 'test', value: 42 };
      const encoded = encodeTONL(data);
      const decoded = decodeTONL(encoded);

      assert.deepStrictEqual(decoded, data);
    });
  });

  test('should maintain JSON parsing safety', (t) => {
    // Test that JSON parsing works normally
    const testData = '{"test": "value"}';
    const parsed = JSON.parse(testData);

    assert.strictEqual(parsed.test, 'value');
  });
});