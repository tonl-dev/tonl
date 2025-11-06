/**
 * Test for Bug #2: CLI doesn't validate parseInt results for --indent
 *
 * Location: src/cli.ts line 104
 * Bug: parseInt(nextArg, 10) can return NaN if nextArg is invalid
 * Impact: NaN indent causes " ".repeat(NaN) = "" (no indentation)
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeTONL } from '../dist/index.js';

describe('Bug #2: CLI parseInt NaN validation', () => {
  test('should detect when indent option becomes NaN', () => {
    // Simulate what happens when CLI gets --indent abc
    const invalidIndent = parseInt('abc', 10);
    assert.ok(Number.isNaN(invalidIndent), 'parseInt("abc") should return NaN');

    // When NaN is passed to encodeTONL, it uses ?? 2 fallback
    const data = { nested: { a: 1, b: 2 } };
    const tonl = encodeTONL(data, { indent: invalidIndent });

    // With NaN indent, " ".repeat(level * NaN) = " ".repeat(NaN) = ""
    // This causes no indentation
    console.log('Output with NaN indent:');
    console.log(tonl);

    // Check if there's proper indentation
    const lines = tonl.split('\n');
    const nestedLine = lines.find(l => l.includes('nested'));
    const aLine = lines.find(l => l.includes('a:'));

    console.log('Nested line:', nestedLine);
    console.log('A line:', aLine);

    // After fix: Should use default indentation
    if (aLine) {
      const hasIndent = aLine.startsWith(' ') || aLine.startsWith('\t');
      assert.ok(hasIndent, 'After fix: Nested values should be indented even when NaN was attempted');
    }
  });

  test('should use default indent when NaN is provided', () => {
    // The encoder should handle NaN gracefully by using default
    const data = { outer: { inner: { value: 123 } } };

    // Explicitly pass NaN
    const tonl = encodeTONL(data, { indent: NaN });
    console.log('TONL with NaN indent:', tonl);

    // Check if indentation exists
    const lines = tonl.split('\n');
    let hasAnyIndentation = false;

    for (const line of lines) {
      if (line.startsWith('  ') || line.startsWith('\t')) {
        hasAnyIndentation = true;
        break;
      }
    }

    // After fix: Should use default indent (2 spaces)
    assert.ok(hasAnyIndentation, 'Should use default indentation when NaN is provided');
  });

  test('verifies " ".repeat(NaN) returns empty string', () => {
    const result = " ".repeat(NaN);
    assert.strictEqual(result, '', '" ".repeat(NaN) should return empty string');

    const result2 = " ".repeat(2 * NaN);
    assert.strictEqual(result2, '', '" ".repeat(2 * NaN) should return empty string');
  });
});
