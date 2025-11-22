/**
 * Security Integration Test
 * Tests that security improvements don't break existing functionality
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Security Integration', () => {
  test('should not break basic encode/decode functionality', async (t) => {
    const { encodeTONL, decodeTONL } = await import('../../dist/index.js');

    const testData = {
      name: 'test',
      value: 42,
      active: true,
      tags: ['tag1', 'tag2']
    };

    const encoded = encodeTONL(testData);
    const decoded = decodeTONL(encoded);

    assert.deepStrictEqual(decoded, testData);
  });

  test('should not break TONLDocument functionality', async (t) => {
    const { TONLDocument } = await import('../../dist/index.js');

    const doc = TONLDocument.fromJSON({ users: [{ id: 1, name: 'Alice' }] });

    // Basic functionality should work
    assert.strictEqual(doc.get('users[0].name'), 'Alice');
    assert.ok(doc.query('users[?(@.id == 1)]'));
  });

  test('should handle complex nested structures', async (t) => {
    const { encodeTONL, decodeTONL } = await import('../../dist/index.js');

    const complexData = {
      level1: {
        level2: {
          level3: {
            deep: 'value',
            array: [1, 2, 3, { nested: true }]
          }
        }
      }
    };

    const encoded = encodeTONL(complexData);
    const decoded = decodeTONL(encoded);

    assert.deepStrictEqual(decoded, complexData);
  });

  test('should maintain performance characteristics', async (t) => {
    const { encodeTONL, decodeTONL } = await import('../../dist/index.js');

    // Create moderately complex test data
    const testData = {
      users: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        active: i % 2 === 0,
        metadata: {
          created: new Date().toISOString(),
          tags: [`tag${i}`, `category${i % 5}`]
        }
      }))
    };

    const start = Date.now();
    const encoded = encodeTONL(testData);
    const decoded = decodeTONL(encoded);
    const duration = Date.now() - start;

    // Should complete within reasonable time (1 second for 100 users)
    assert.ok(duration < 1000, `Encoding/decoding took ${duration}ms, expected < 1000ms`);
    assert.deepStrictEqual(decoded, testData);
  });

  test('should handle special characters safely', async (t) => {
    const { encodeTONL, decodeTONL } = await import('../../dist/index.js');

    const specialData = {
      'special:chars': 'test:value',
      'quotes"inside': 'text with "quotes"',
      'newlines\ninside': 'text with\nnewlines',
      'unicode\u00e9': 'café',
      'math:π': 3.14159
    };

    const encoded = encodeTONL(specialData);
    const decoded = decodeTONL(encoded);

    assert.deepStrictEqual(decoded, specialData);
  });
});