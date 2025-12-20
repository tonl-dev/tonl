/**
 * Concurrency Tests
 * Tests for concurrent operations and thread safety
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { TONLDocument } from '../dist/index.js';
import { encodeTONL, decodeTONL } from '../dist/index.js';

describe('Concurrency - Parallel Document Operations', () => {
  test('should handle multiple documents simultaneously', async () => {
    const docs = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(TONLDocument.fromJSON({
          id: i,
          name: `Doc${i}`,
          data: Array.from({ length: 100 }, (_, j) => ({ index: j, value: `item-${i}-${j}` }))
        }))
      )
    );

    assert.strictEqual(docs.length, 10);
    docs.forEach((doc, i) => {
      assert.strictEqual(doc.get('id'), i);
      assert.strictEqual(doc.get('name'), `Doc${i}`);
    });
  });

  test('should handle concurrent queries on same document', async () => {
    const doc = TONLDocument.fromJSON({
      users: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User${i}`,
        active: i % 2 === 0
      }))
    });

    const queries = [
      'users[*].name',
      'users[?(@.active == true)]',
      'users[0:10]',
      '$..id',
      'users[50].name'
    ];

    const results = await Promise.all(
      queries.map(q => Promise.resolve(doc.query(q)))
    );

    assert.strictEqual(results[0].length, 100); // All names
    assert.strictEqual(results[1].length, 50);  // Active users
    assert.strictEqual(results[2].length, 10);  // First 10
    assert.strictEqual(results[3].length, 100); // All IDs
    assert.strictEqual(results[4], 'User50');   // Specific user
  });

  test('should handle concurrent encode operations', async () => {
    const data = {
      items: Array.from({ length: 50 }, (_, i) => ({
        id: i,
        value: `item-${i}`
      }))
    };

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        Promise.resolve(encodeTONL(data))
      )
    );

    // All results should be identical
    const first = results[0];
    results.forEach(result => {
      assert.strictEqual(result, first);
    });
  });

  test('should handle concurrent decode operations', async () => {
    const tonl = `#version 1.0
items[3]{id,value}:
  1, alpha
  2, beta
  3, gamma`;

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        Promise.resolve(decodeTONL(tonl))
      )
    );

    // All results should be equivalent
    const first = JSON.stringify(results[0]);
    results.forEach(result => {
      assert.strictEqual(JSON.stringify(result), first);
    });
  });
});

describe('Concurrency - Independent Modifications', () => {
  test('should handle independent document modifications', async () => {
    // Each task modifies its own document
    const tasks = Array.from({ length: 10 }, async (_, i) => {
      const doc = TONLDocument.fromJSON({ counter: 0, items: [] });

      // Perform multiple modifications
      for (let j = 0; j < 10; j++) {
        doc.set('counter', j);
        doc.push('items', { index: j, value: `item-${i}-${j}` });
      }

      return {
        docId: i,
        counter: doc.get('counter'),
        itemCount: doc.get('items').length
      };
    });

    const results = await Promise.all(tasks);

    results.forEach((result, i) => {
      assert.strictEqual(result.docId, i);
      assert.strictEqual(result.counter, 9);
      assert.strictEqual(result.itemCount, 10);
    });
  });

  test('should maintain document isolation', async () => {
    const docs = Array.from({ length: 5 }, (_, i) =>
      TONLDocument.fromJSON({ id: i, shared: 'initial' })
    );

    // Modify each document independently
    await Promise.all(
      docs.map(async (doc, i) => {
        doc.set('shared', `modified-${i}`);
        doc.set('unique', i * 100);
      })
    );

    // Verify each document has its own modifications
    docs.forEach((doc, i) => {
      assert.strictEqual(doc.get('shared'), `modified-${i}`);
      assert.strictEqual(doc.get('unique'), i * 100);
    });
  });
});

describe('Concurrency - Round-Trip Operations', () => {
  test('should handle concurrent round-trips', async () => {
    const originalData = {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' }
      ],
      settings: {
        theme: 'dark',
        notifications: true
      }
    };

    const roundTrips = await Promise.all(
      Array.from({ length: 50 }, async () => {
        const tonl = encodeTONL(originalData);
        const decoded = decodeTONL(tonl);
        return decoded;
      })
    );

    // Use deep equality since object key order may differ
    roundTrips.forEach(result => {
      assert.deepStrictEqual(result.users, originalData.users);
      assert.deepStrictEqual(result.settings, originalData.settings);
    });
  });

  test('should handle mixed operations concurrently', async () => {
    const operations = [
      // Encode operations
      ...Array.from({ length: 10 }, () => async () => {
        const data = { type: 'encode', value: Math.random() };
        return { op: 'encode', result: encodeTONL(data).length > 0 };
      }),
      // Decode operations
      ...Array.from({ length: 10 }, () => async () => {
        const tonl = '#version 1.0\nvalue: test';
        return { op: 'decode', result: decodeTONL(tonl).value === 'test' };
      }),
      // Query operations
      ...Array.from({ length: 10 }, () => async () => {
        const doc = TONLDocument.fromJSON({ items: [1, 2, 3] });
        return { op: 'query', result: doc.query('items[*]').length === 3 };
      })
    ];

    const results = await Promise.all(operations.map(op => op()));

    results.forEach(result => {
      assert.strictEqual(result.result, true);
    });
  });
});

describe('Concurrency - Index Operations', () => {
  test('should handle concurrent index creation', async () => {
    const docs = Array.from({ length: 5 }, (_, i) => {
      const doc = TONLDocument.fromJSON({
        items: Array.from({ length: 100 }, (_, j) => ({
          id: j,
          category: `cat-${j % 5}`,
          docId: i
        }))
      });
      return doc;
    });

    // Create indices concurrently
    await Promise.all(
      docs.map(async (doc, i) => {
        doc.createIndex({
          name: `idx-${i}`,
          fields: ['id'],
          unique: true
        });
      })
    );

    // Verify indices work
    docs.forEach((doc, i) => {
      const idx = doc.getIndex(`idx-${i}`);
      assert.ok(idx);
    });
  });
});

describe('Concurrency - Stream-like Processing', () => {
  test('should handle batch processing', async () => {
    const batches = Array.from({ length: 10 }, (_, batchId) =>
      Array.from({ length: 100 }, (_, itemId) => ({
        batchId,
        itemId,
        value: `batch-${batchId}-item-${itemId}`
      }))
    );

    const results = await Promise.all(
      batches.map(async (batch) => {
        const doc = TONLDocument.fromJSON({ items: batch });
        const tonl = doc.toTONL();
        const parsed = TONLDocument.parse(tonl);
        return {
          itemCount: parsed.query('items[*]').length,
          batchId: parsed.get('items[0].batchId')
        };
      })
    );

    results.forEach((result, i) => {
      assert.strictEqual(result.itemCount, 100);
      assert.strictEqual(result.batchId, i);
    });
  });
});

describe('Concurrency - Error Isolation', () => {
  test('should isolate errors between concurrent operations', async () => {
    const operations = [
      // Valid operation
      async () => {
        try {
          return { success: true, result: encodeTONL({ valid: true }) };
        } catch {
          return { success: false };
        }
      },
      // Another valid operation
      async () => {
        try {
          return { success: true, result: decodeTONL('#version 1.0\ntest: value') };
        } catch {
          return { success: false };
        }
      },
      // Valid query
      async () => {
        try {
          const doc = TONLDocument.fromJSON({ items: [1, 2, 3] });
          return { success: true, result: doc.get('items[0]') };
        } catch {
          return { success: false };
        }
      }
    ];

    const results = await Promise.all(operations.map(op => op()));

    // All valid operations should succeed
    results.forEach(result => {
      assert.strictEqual(result.success, true);
    });
  });
});

describe('Concurrency - Performance Under Load', () => {
  test('should maintain performance with many concurrent operations', async () => {
    const startTime = Date.now();

    const operations = Array.from({ length: 100 }, async (_, i) => {
      const doc = TONLDocument.fromJSON({
        id: i,
        data: Array.from({ length: 10 }, (_, j) => ({ x: j, y: j * 2 }))
      });

      // Perform operations
      const query1 = doc.query('data[*].x');
      const query2 = doc.get('id');
      doc.set('processed', true);
      const tonl = doc.toTONL();

      return {
        id: i,
        queryCount: query1.length,
        hasId: query2 === i,
        tonlLength: tonl.length
      };
    });

    const results = await Promise.all(operations);
    const elapsed = Date.now() - startTime;

    // Verify all operations completed
    assert.strictEqual(results.length, 100);
    results.forEach((result, i) => {
      assert.strictEqual(result.id, i);
      assert.strictEqual(result.queryCount, 10);
      assert.strictEqual(result.hasId, true);
      assert.ok(result.tonlLength > 0);
    });

    // Should complete in reasonable time (< 5 seconds)
    assert.ok(elapsed < 5000, `Operations took too long: ${elapsed}ms`);
  });
});
