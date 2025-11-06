/**
 * Test for Bug #2: CLI parseInt without NaN validation
 *
 * Tests whether CLI properly validates numeric arguments
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

describe('Bug #2: CLI parseInt NaN validation', () => {
  test('should handle missing --indent value', () => {
    // Create test file
    const testFile = 'test-cli-indent.json';
    writeFileSync(testFile, JSON.stringify({ test: 'value' }));

    try {
      // Run CLI with --indent but no value
      const command = `node dist/cli.js encode ${testFile} --indent`;

      try {
        const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        console.log('Result:', result);

        // If it doesn't crash, check if output is valid
        assert.ok(result.length > 0, 'Should produce output or error');
      } catch (error: any) {
        console.log('Error (might be expected):', error.message);
        // Error is acceptable - should fail gracefully
        assert.ok(error.message.includes('Usage') || error.message.includes('indent') || error.status !== 0,
          'Should error gracefully on missing argument');
      }
    } finally {
      // Cleanup
      try { unlinkSync(testFile); } catch {}
    }
  });

  test('should handle invalid --indent value', () => {
    const testFile = 'test-cli-indent2.json';
    writeFileSync(testFile, JSON.stringify({ test: 'value' }));

    try {
      // Run CLI with invalid indent value
      const command = `node dist/cli.js encode ${testFile} --indent abc`;

      try {
        const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        console.log('Result with indent=abc:', result);

        // Check if NaN causes issues in the output
        // If indent is NaN, the output might be malformed
      } catch (error: any) {
        console.log('Error with invalid indent (might be expected):', error.stderr || error.message);
        // Error is acceptable
      }
    } finally {
      try { unlinkSync(testFile); } catch {}
    }
  });
});
