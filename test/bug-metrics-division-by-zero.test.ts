/**
 * Test for BUG-NEW-004: Division by zero in compression metrics
 *
 * Validates that calculateCompressionMetrics handles edge cases:
 * - Empty strings (zero bytes/tokens)
 * - Perfect compression (compressed = 0 bytes)
 * - No compression (equal sizes)
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { calculateCompressionMetrics } from '../dist/utils/metrics.js';

describe('BUG-NEW-004: Division by zero in compression metrics', () => {
  it('should handle both empty strings (0/0 case)', () => {
    const metrics = calculateCompressionMetrics('', '', 'gpt-5');

    assert.strictEqual(metrics.originalBytes, 0, 'Original bytes should be 0');
    assert.strictEqual(metrics.compressedBytes, 0, 'Compressed bytes should be 0');
    assert.strictEqual(metrics.originalTokens, 0, 'Original tokens should be 0');
    assert.strictEqual(metrics.compressedTokens, 0, 'Compressed tokens should be 0');

    // When both are 0, ratio should be 1 (no change)
    assert.strictEqual(metrics.byteCompressionRatio, 1, 'Byte ratio should be 1 for empty/empty');
    assert.strictEqual(metrics.tokenCompressionRatio, 1, 'Token ratio should be 1 for empty/empty');

    // Savings should be 0 when original is 0
    assert.strictEqual(metrics.byteSavingsPercent, 0, 'Byte savings should be 0');
    assert.strictEqual(metrics.tokenSavingsPercent, 0, 'Token savings should be 0');

    // All values should be finite (not NaN or Infinity in the problematic sense)
    assert.ok(Number.isFinite(metrics.byteSavingsPercent), 'Byte savings percent should be finite');
    assert.ok(Number.isFinite(metrics.tokenSavingsPercent), 'Token savings percent should be finite');
  });

  it('should handle perfect compression (non-zero to zero)', () => {
    const metrics = calculateCompressionMetrics('hello world', '', 'gpt-5');

    assert.ok(metrics.originalBytes > 0, 'Original bytes should be > 0');
    assert.strictEqual(metrics.compressedBytes, 0, 'Compressed bytes should be 0');

    // Perfect compression: original/0 = Infinity (intended behavior)
    assert.strictEqual(metrics.byteCompressionRatio, Infinity, 'Byte ratio should be Infinity for perfect compression');
    assert.strictEqual(metrics.tokenCompressionRatio, Infinity, 'Token ratio should be Infinity for perfect compression');

    // Savings should be 100% (or close to it, depending on rounding)
    assert.ok(metrics.byteSavingsPercent > 99, 'Byte savings should be ~100%');
    assert.ok(metrics.tokenSavingsPercent > 99, 'Token savings should be ~100%');
  });

  it('should handle zero compression (compressed to empty)', () => {
    const metrics = calculateCompressionMetrics('', 'hello world', 'gpt-5');

    assert.strictEqual(metrics.originalBytes, 0, 'Original bytes should be 0');
    assert.ok(metrics.compressedBytes > 0, 'Compressed bytes should be > 0');

    // Savings percent should be 0 when original is 0 (nothing to save)
    assert.strictEqual(metrics.byteSavingsPercent, 0, 'Byte savings should be 0 when original is empty');
    assert.strictEqual(metrics.tokenSavingsPercent, 0, 'Token savings should be 0 when original is empty');

    // Ratio: 0/positive = 0 (decompression from nothing)
    assert.strictEqual(metrics.byteCompressionRatio, 0, 'Byte ratio should be 0 for decompression');
    assert.strictEqual(metrics.tokenCompressionRatio, 0, 'Token ratio should be 0 for decompression');
  });

  it('should handle normal compression correctly', () => {
    const original = 'hello world';
    const compressed = 'hello';

    const metrics = calculateCompressionMetrics(original, compressed, 'gpt-5');

    assert.ok(metrics.originalBytes > metrics.compressedBytes, 'Original should be larger');
    assert.ok(metrics.byteCompressionRatio > 1, 'Compression ratio should be > 1');
    assert.ok(metrics.byteSavingsPercent > 0 && metrics.byteSavingsPercent < 100, 'Savings should be 0-100%');

    // All values should be finite numbers
    assert.ok(Number.isFinite(metrics.byteCompressionRatio), 'Byte ratio should be finite');
    assert.ok(Number.isFinite(metrics.tokenCompressionRatio), 'Token ratio should be finite');
    assert.ok(Number.isFinite(metrics.byteSavingsPercent), 'Byte savings should be finite');
    assert.ok(Number.isFinite(metrics.tokenSavingsPercent), 'Token savings should be finite');
  });

  it('should handle no compression (identical strings)', () => {
    const text = 'hello world';
    const metrics = calculateCompressionMetrics(text, text, 'gpt-5');

    assert.strictEqual(metrics.originalBytes, metrics.compressedBytes, 'Bytes should be equal');
    assert.strictEqual(metrics.originalTokens, metrics.compressedTokens, 'Tokens should be equal');

    // No compression: ratio = 1
    assert.strictEqual(metrics.byteCompressionRatio, 1, 'Byte ratio should be 1');
    assert.strictEqual(metrics.tokenCompressionRatio, 1, 'Token ratio should be 1');

    // No savings: 0%
    assert.strictEqual(metrics.byteSavingsPercent, 0, 'Byte savings should be 0%');
    assert.strictEqual(metrics.tokenSavingsPercent, 0, 'Token savings should be 0%');
  });

  it('should handle expansion (compressed larger than original)', () => {
    const original = 'hi';
    const compressed = 'hello world this is much longer';

    const metrics = calculateCompressionMetrics(original, compressed, 'gpt-5');

    assert.ok(metrics.compressedBytes > metrics.originalBytes, 'Compressed should be larger');

    // Expansion: ratio < 1
    assert.ok(metrics.byteCompressionRatio < 1, 'Byte ratio should be < 1 for expansion');
    assert.ok(metrics.tokenCompressionRatio < 1, 'Token ratio should be < 1 for expansion');

    // Negative savings
    assert.ok(metrics.byteSavingsPercent < 0, 'Byte savings should be negative for expansion');
    assert.ok(metrics.tokenSavingsPercent < 0, 'Token savings should be negative for expansion');

    // All values should be finite
    assert.ok(Number.isFinite(metrics.byteCompressionRatio), 'Byte ratio should be finite');
    assert.ok(Number.isFinite(metrics.byteSavingsPercent), 'Byte savings should be finite');
  });

  it('should work across all tokenizer models', () => {
    const tokenizers = ['gpt-5', 'gpt-4.5', 'gpt-4o', 'claude-3.5', 'gemini-2.0', 'llama-4'] as const;

    for (const tokenizer of tokenizers) {
      const metrics = calculateCompressionMetrics('', '', tokenizer);

      assert.strictEqual(metrics.byteCompressionRatio, 1, `Byte ratio should be 1 for ${tokenizer}`);
      assert.strictEqual(metrics.byteSavingsPercent, 0, `Byte savings should be 0 for ${tokenizer}`);
      assert.ok(Number.isFinite(metrics.byteSavingsPercent), `Should be finite for ${tokenizer}`);
    }
  });
});
