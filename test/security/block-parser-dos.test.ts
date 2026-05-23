/**
 * Security Tests: Block Parser DoS Protection
 *
 * Tests for Task 001 - Ensures block parser has iteration limits
 * to prevent resource exhaustion attacks.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { decodeTONL } from '../../dist/decode.js';

const TEST_BLOCK_LINE_LIMIT = 10_000;

describe('Block Parser DoS Protection', () => {
  describe('Block Line Limit Enforcement', () => {
    it('should reject blocks exceeding configured line limit', () => {
      // Generate a TONL string with 15000 lines in a single block
      const lines = ['data:'];
      for (let i = 0; i < 15000; i++) {
        lines.push(`  field${i}: value${i}`);
      }
      const hugeBlock = lines.join('\n');

      assert.throws(
        () => decodeTONL(hugeBlock, { strict: true, maxBlockLines: TEST_BLOCK_LINE_LIMIT }),
        /maximum.*block.*lines.*exceeded/i
      );
    });

    it('should allow blocks within default limit', () => {
      // Generate a TONL string with 100 lines in a single block
      const lines = ['data:'];
      for (let i = 0; i < 100; i++) {
        lines.push(`  field${i}: value${i}`);
      }
      const normalBlock = lines.join('\n');

      assert.doesNotThrow(() => {
        decodeTONL(normalBlock);
      });
    });

    it('should reject large array blocks', () => {
      // Generate a TONL array with too many elements
      const lines = ['items[15000]:'];
      for (let i = 0; i < 15000; i++) {
        lines.push(`  [${i}]: value${i}`);
      }
      const hugeArrayBlock = lines.join('\n');

      assert.throws(
        () => decodeTONL(hugeArrayBlock, { strict: true, maxBlockLines: TEST_BLOCK_LINE_LIMIT }),
        /maximum.*block.*lines.*exceeded/i
      );
    });

    it('should allow normal-sized array blocks', () => {
      // Generate a TONL array with reasonable number of elements
      const lines = ['items[100]:'];
      for (let i = 0; i < 100; i++) {
        lines.push(`  [${i}]: value${i}`);
      }
      const normalArrayBlock = lines.join('\n');

      assert.doesNotThrow(() => {
        decodeTONL(normalArrayBlock);
      });
    });
  });

  describe('Performance - Normal Files', () => {
    it('should parse medium-sized files without performance regression', () => {
      // Generate a TONL string with 1000 key-value pairs (well within limit)
      const lines = ['data:'];
      for (let i = 0; i < 1000; i++) {
        lines.push(`  field${i}: value${i}`);
      }
      const normalFile = lines.join('\n');

      const startTime = Date.now();
      const result = decodeTONL(normalFile);
      const elapsed = Date.now() - startTime;

      // Should complete in under 1 second
      assert.ok(elapsed < 1000, `Parsing took too long: ${elapsed}ms`);
      assert.ok(result.data);
      assert.strictEqual(Object.keys(result.data as object).length, 1000);
    });

    it('should handle small nested blocks', () => {
      // Create a simple nested structure
      const tonl = `name: Alice
age: 30
address:
  city: Istanbul
  country: Turkey`;

      const result = decodeTONL(tonl);
      assert.strictEqual(result.name, 'Alice');
      assert.strictEqual(result.age, 30);
      assert.ok(result.address);
    });
  });

  describe('Error Messages', () => {
    it('should include line count in error message', () => {
      const lines = ['data:'];
      for (let i = 0; i < 15000; i++) {
        lines.push(`  field${i}: value${i}`);
      }
      const hugeBlock = lines.join('\n');

      try {
        decodeTONL(hugeBlock, { strict: true, maxBlockLines: TEST_BLOCK_LINE_LIMIT });
        assert.fail('Expected an error to be thrown');
      } catch (error: any) {
        assert.ok(error.message.includes(String(TEST_BLOCK_LINE_LIMIT)), `Error should mention limit: ${error.message}`);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle blocks at exactly the limit', () => {
      // Generate a block with exactly 10000 lines (should pass)
      const lines = ['data:'];
      for (let i = 0; i < 9999; i++) {
        lines.push(`  field${i}: value${i}`);
      }
      const exactLimitBlock = lines.join('\n');

      // Should not throw
      assert.doesNotThrow(() => {
        decodeTONL(exactLimitBlock);
      });
    });

    it('should handle blocks just over the limit', () => {
      // Generate a block with 10001 lines (should fail)
      const lines = ['data:'];
      for (let i = 0; i < 10001; i++) {
        lines.push(`  field${i}: value${i}`);
      }
      const overLimitBlock = lines.join('\n');

      assert.throws(
        () => decodeTONL(overLimitBlock, { strict: true, maxBlockLines: TEST_BLOCK_LINE_LIMIT }),
        /maximum.*block.*lines.*exceeded/i
      );
    });

    it('should handle multiline strings within limits', () => {
      // Create a block with a large multiline string
      const content = 'line\n'.repeat(100);
      const tonl = `data:
  message: """${content}"""
  status: ok`;

      assert.doesNotThrow(() => {
        decodeTONL(tonl);
      });
    });

    it('should handle empty blocks gracefully', () => {
      const tonl = `data:`;

      assert.doesNotThrow(() => {
        const result = decodeTONL(tonl);
        assert.ok(result.data !== undefined);
      });
    });
  });
});
