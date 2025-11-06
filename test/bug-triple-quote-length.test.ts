/**
 * Test for potential Bug #2: Triple-quoted string length validation
 *
 * Tests edge case where a string with exactly 5 quote characters
 * could be incorrectly parsed as a triple-quoted string.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeTONL } from '../dist/decode.js';

describe('Potential Bug #2: Triple-quoted string length validation', () => {
  test('should handle minimum valid triple-quoted string (6 chars)', () => {
    const tonl = `#version 1.0
value: """"""`;

    const result = decodeTONL(tonl);
    assert.strictEqual(result.value, '', 'Should parse as empty string');
  });

  test('should handle 5 quotes correctly', () => {
    // This is malformed - could be """" + " (incomplete)
    // or could be " + """" (incomplete)
    // Currently unclear what the expected behavior should be
    const tonl = `#version 1.0
value: """""`;

    // This test will help us understand current behavior
    try {
      const result = decodeTONL(tonl);
      console.log('Result for 5 quotes:', result.value);
      console.log('Type:', typeof result.value);
      console.log('Length:', result.value?.length);

      // If it returns empty string, that might be wrong
      // The input is malformed and should probably error or be treated differently
    } catch (error) {
      console.log('Throws error (might be correct behavior):', error);
    }
  });

  test('should handle triple-quoted string with content', () => {
    const tonl = `#version 1.0
value: """hello"""`;

    const result = decodeTONL(tonl);
    assert.strictEqual(result.value, 'hello', 'Should parse triple-quoted content');
  });

  test('should handle regular quoted string with quotes inside', () => {
    const tonl = `#version 1.0
value: """"`;

    const result = decodeTONL(tonl);
    // Should this be a single double-quote? Let's see what happens
    console.log('Result for 4 quotes:', result.value);
  });
});
