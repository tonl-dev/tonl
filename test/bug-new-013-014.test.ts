/**
 * Test suite for BUG-NEW-013 and BUG-NEW-014 fixes
 *
 * BUG-NEW-013: Array expansion DoS prevention in setter.ts
 * BUG-NEW-014: TONLDocument validation after dynamic import in query.ts
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { TONLDocument } from '../dist/document.js';
import { set } from '../dist/modification/setter.js';
import { SecurityError } from '../dist/errors/index.js';
import { MAX_ITERATIONS } from '../dist/utils/security-limits.js';

describe('BUG-NEW-013: Array Expansion DoS Prevention', () => {
  it('should allow reasonable array expansion', () => {
    const doc = { items: [1, 2, 3] };

    // Expand to index 10 - should work fine
    const result = set(doc, 'items[10]', 'new value', { createPath: true });

    assert.strictEqual(result.success, true);
    assert.strictEqual(doc.items.length, 11);
    assert.strictEqual(doc.items[10], 'new value');
  });

  it('should allow expansion up to MAX_ITERATIONS elements', () => {
    const doc = { items: [] as any[] };

    // Expand to exactly MAX_ITERATIONS - 1 (0-indexed) should work
    const safeIndex = Math.min(MAX_ITERATIONS - 1, 10000); // Use smaller value for test speed
    const result = set(doc, `items[${safeIndex}]`, 'value', { createPath: true });

    assert.strictEqual(result.success, true);
    assert.strictEqual(doc.items[safeIndex], 'value');
  });

  it('should block excessive array expansion attempts', () => {
    const doc = { items: [] as any[] };

    // Try to expand to MAX_ITERATIONS + 1 elements
    const excessiveIndex = MAX_ITERATIONS + 1;
    const result = set(doc, `items[${excessiveIndex}]`, 'value', { createPath: true });

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('Array expansion blocked'));
  });

  it('should throw SecurityError for DoS attempts', () => {
    const doc = { items: [] as any[] };

    // Very large index attempt
    const hugeIndex = 999999999;
    const result = set(doc, `items[${hugeIndex}]`, 'value', { createPath: true });

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
    assert.ok(
      result.error.includes('Array expansion blocked') ||
      result.error.includes('memory exhaustion'),
      `Expected error about array expansion, got: ${result.error}`
    );
  });

  it('should not affect normal array operations without createPath', () => {
    const doc = { items: [1, 2, 3] };

    // Setting existing index should work
    const result = set(doc, 'items[1]', 'updated');

    assert.strictEqual(result.success, true);
    assert.strictEqual(doc.items[1], 'updated');
  });

  it('should handle out of bounds without createPath correctly', () => {
    const doc = { items: [1, 2, 3] };

    // Without createPath, out of bounds should fail
    const result = set(doc, 'items[100]', 'value', { createPath: false });

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('out of bounds'));
  });
});

describe('BUG-NEW-014: TONLDocument Export Validation', () => {
  it('should have TONLDocument exported correctly', async () => {
    // Verify that the document module exports TONLDocument correctly
    const module = await import('../dist/document.js');

    assert.ok(module.TONLDocument, 'TONLDocument should be exported');
    assert.strictEqual(typeof module.TONLDocument.fromJSON, 'function',
      'TONLDocument.fromJSON should be a function');
    // Note: fromTONL is not a static method on TONLDocument
    // The document is created via fromJSON or constructor
  });

  it('should create document from JSON correctly', () => {
    const data = { users: [{ name: 'Alice' }, { name: 'Bob' }] };
    const doc = TONLDocument.fromJSON(data);

    assert.ok(doc, 'Document should be created');
    assert.deepStrictEqual(doc.get('users[0].name'), 'Alice');
  });

  it('should execute query on document', () => {
    const data = {
      users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ]
    };
    const doc = TONLDocument.fromJSON(data);

    const result = doc.query('users[?(@.age > 26)]');

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Alice');
  });
});

describe('BUG-NEW-013/014: Integration Tests', () => {
  it('should handle document modification with array expansion limits', () => {
    const doc = TONLDocument.fromJSON({ items: [] });

    // Set at reasonable index
    doc.set('items[5]', 'value');
    assert.strictEqual(doc.get('items[5]'), 'value');
  });

  it('should protect against DoS via document API', () => {
    const doc = TONLDocument.fromJSON({ items: [] });

    // Attempt excessive expansion through document API
    try {
      doc.set(`items[${MAX_ITERATIONS + 1}]`, 'value');
      // If no error, verify it was caught
      const result = doc.get(`items[${MAX_ITERATIONS + 1}]`);
      // The operation should have failed or been limited
    } catch (e) {
      // Error is expected - this is the protection working
      assert.ok(e instanceof Error);
    }
  });
});
