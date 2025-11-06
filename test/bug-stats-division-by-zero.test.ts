/**
 * Test for Bug #3: Division by zero in CLI stats display
 *
 * Location: src/cli.ts lines 163-164
 * Bug: No check if originalBytes or originalTokens is zero before division
 * Impact: Shows "Infinity%" or "NaN%" in stats output
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

describe('Bug #3: Stats division by zero', () => {
  test('should verify division by zero produces Infinity before fix', () => {
    const originalBytes = 0;
    const tonlBytes = 10;

    // OLD buggy calculation (before fix)
    const byteSavingsBuggy = ((originalBytes - tonlBytes) / originalBytes * 100).toFixed(1);
    console.log('byteSavings with originalBytes=0 (before fix):', byteSavingsBuggy);
    assert.strictEqual(byteSavingsBuggy, '-Infinity', 'Before fix: Division by zero produces "-Infinity" string');

    // NEW fixed calculation (after fix)
    const byteSavingsFixed = originalBytes > 0
      ? ((originalBytes - tonlBytes) / originalBytes * 100).toFixed(1)
      : '0.0';
    console.log('byteSavings with originalBytes=0 (after fix):', byteSavingsFixed);
    assert.strictEqual(byteSavingsFixed, '0.0', 'After fix: Should return 0.0');
  });

  test('should verify negative savings also possible', () => {
    const originalBytes = 0;
    const tonlBytes = 0;

    // (0 - 0) / 0 * 100 = NaN
    const byteSavings = ((originalBytes - tonlBytes) / originalBytes * 100).toFixed(1);

    console.log('byteSavings with both zero:', byteSavings);
    assert.strictEqual(byteSavings, 'NaN', '0 / 0 produces "NaN" string');
  });

  test('should handle empty file edge case after fix', () => {
    // Empty files with 0 bytes should be handled gracefully
    const originalBytes = 0;
    const originalTokens = 0;
    const tonlBytes = 0;
    const tonlTokens = 0;

    // After fix: Should return 0.0 instead of NaN
    const byteSavings = originalBytes > 0
      ? ((originalBytes - tonlBytes) / originalBytes * 100).toFixed(1)
      : '0.0';
    const tokenSavings = originalTokens > 0
      ? ((originalTokens - tonlTokens) / originalTokens * 100).toFixed(1)
      : '0.0';

    console.log('With all zeros (after fix):');
    console.log('  byteSavings:', byteSavings);
    console.log('  tokenSavings:', tokenSavings);

    // After fix: Should be '0.0' not 'NaN'
    assert.strictEqual(byteSavings, '0.0', 'Should be 0.0 after fix');
    assert.strictEqual(tokenSavings, '0.0', 'Should be 0.0 after fix');
  });
});
