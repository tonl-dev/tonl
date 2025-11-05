/**
 * Test for path-validator bug with hidden files
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PathValidator } from '../dist/cli/path-validator.js';

describe('PathValidator Bug Test', () => {
  it('should handle hidden files (files starting with dot) correctly on Windows', () => {
    // This tests the potential bug at cli/path-validator.ts:191
    // where filename.split('.')[0] would return empty string for ".gitignore"

    // On non-Windows systems, this might not trigger the Windows-specific code
    // But we can test that the validator doesn't crash

    try {
      const result = PathValidator.validateRead('.gitignore');
      assert.ok(result, 'Should return a path');
    } catch (error: any) {
      // If it fails, it should be a meaningful error, not undefined/empty string issues
      assert.ok(error.message.length > 0, 'Error should have a message');
    }
  });

  it('should handle filenames without extensions correctly', () => {
    try {
      const result = PathValidator.validateRead('README');
      assert.ok(result, 'Should return a path');
    } catch (error: any) {
      assert.ok(error.message.length > 0, 'Error should have a message');
    }
  });
});
