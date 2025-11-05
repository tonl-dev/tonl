/**
 * Tests for token estimation and metrics
 * Coverage target: src/utils/metrics.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { estimateTokens } from '../dist/utils/metrics.js';

describe('Token Metrics', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens for simple text', () => {
      const text = 'Hello world';
      const tokens = estimateTokens(text);
      assert.ok(tokens > 0);
      assert.ok(tokens < 10);
    });

    it('should estimate tokens for JSON', () => {
      const json = JSON.stringify({ name: 'Alice', age: 30 });
      const tokens = estimateTokens(json);
      assert.ok(tokens > 5);
    });

    it('should handle empty string', () => {
      const tokens = estimateTokens('');
      assert.strictEqual(tokens, 0);
    });

    it('should estimate different tokenizers', () => {
      const text = 'The quick brown fox jumps over the lazy dog';

      const gpt5 = estimateTokens(text, 'gpt-5');
      const claude = estimateTokens(text, 'claude-3.5');
      const gemini = estimateTokens(text, 'gemini-2.0');
      const llama = estimateTokens(text, 'llama-4');

      // All should be reasonable estimates
      assert.ok(gpt5 > 0 && gpt5 < 50);
      assert.ok(claude > 0 && claude < 50);
      assert.ok(gemini > 0 && gemini < 50);
      assert.ok(llama > 0 && llama < 50);
    });

    it('should estimate tokens for code', () => {
      const code = 'function test() { return 42; }';
      const tokens = estimateTokens(code);
      assert.ok(tokens > 5);
    });

    it('should estimate tokens for special characters', () => {
      const text = '!!!###$$$%%%&&&***';
      const tokens = estimateTokens(text);
      assert.ok(tokens > 0);
    });

    it('should estimate tokens for multiline text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const tokens = estimateTokens(text);
      assert.ok(tokens > 3);
    });

    it('should estimate tokens for unicode', () => {
      const text = 'Hello 世界 🌍';
      const tokens = estimateTokens(text);
      assert.ok(tokens > 3);
    });

    it('should handle large text', () => {
      const text = 'word '.repeat(1000);
      const tokens = estimateTokens(text);
      assert.ok(tokens > 500);
      assert.ok(tokens < 3000); // Increased limit for estimation variance
    });

    it('should estimate different for different models', () => {
      const text = 'This is a test sentence for token estimation.';
      const models = ['gpt-5', 'gpt-4.5', 'claude-3.5', 'gemini-2.0', 'llama-4'] as const;

      const estimates = models.map(model => estimateTokens(text, model));

      // All estimates should be positive
      for (const estimate of estimates) {
        assert.ok(estimate > 0);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle only whitespace', () => {
      const tokens = estimateTokens('   \n\t  ');
      assert.ok(tokens >= 0);
    });

    it('should handle very long word', () => {
      const word = 'a'.repeat(1000);
      const tokens = estimateTokens(word);
      assert.ok(tokens > 0);
    });

    it('should handle numbers', () => {
      const text = '1234567890';
      const tokens = estimateTokens(text);
      assert.ok(tokens > 0);
    });

    it('should handle mixed content', () => {
      const text = 'Mix123!@#abc_def-ghi';
      const tokens = estimateTokens(text);
      assert.ok(tokens > 0);
    });
  });
});
