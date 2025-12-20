/**
 * Full Pipeline Integration Tests
 * Tests complete workflows: encode -> parse -> query -> modify -> encode
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { encodeTONL, decodeTONL, TONLDocument } from '../../dist/index.js';
import { HashIndex } from '../../dist/indexing/hash-index.js';
import { Transaction } from '../../dist/modification/transaction.js';
import { parseSchema, validateTONL } from '../../dist/schema/index.js';

describe('Full Pipeline Integration', () => {
  describe('encode -> decode -> modify -> encode roundtrip', () => {
    test('should handle complete CRUD workflow', () => {
      // 1. Start with JSON data
      const originalData = {
        users: [
          { id: 1, name: 'Alice', role: 'admin' },
          { id: 2, name: 'Bob', role: 'user' }
        ],
        settings: { theme: 'dark', notifications: true }
      };

      // 2. Encode to TONL
      const tonl = encodeTONL(originalData);
      assert.ok(tonl.includes('#version'));

      // 3. Decode back
      const decoded = decodeTONL(tonl);
      assert.deepStrictEqual(decoded, originalData);

      // 4. Create document and modify
      const doc = TONLDocument.fromJSON(decoded);
      doc.set('users[0].name', 'Alice Smith');
      doc.push('users', { id: 3, name: 'Charlie', role: 'user' });
      doc.set('settings.theme', 'light');

      // 5. Export to TONL again
      const modifiedTonl = doc.toTONL();
      assert.ok(modifiedTonl.includes('Alice Smith'));

      // 6. Verify final state
      const finalDoc = TONLDocument.parse(modifiedTonl);
      assert.strictEqual(finalDoc.get('users[0].name'), 'Alice Smith');
      assert.strictEqual(finalDoc.get('users[2].name'), 'Charlie');
      assert.strictEqual(finalDoc.get('settings.theme'), 'light');
    });

    test('should preserve data integrity through multiple transformations', () => {
      const data = {
        nested: {
          deeply: {
            value: 'preserved',
            array: [1, 2, { inner: 'data' }]
          }
        }
      };

      // Multiple encode/decode cycles
      let current = data;
      for (let i = 0; i < 3; i++) {
        const tonl = encodeTONL(current);
        current = decodeTONL(tonl);
      }

      assert.deepStrictEqual(current, data);
    });

    test('should handle special characters through pipeline', () => {
      const data = {
        text: 'Line 1\nLine 2\nLine 3',
        quoted: '"Hello, World!"',
        unicode: 'こんにちは',
        special: 'Tab:\there, Backslash: \\'
      };

      const tonl = encodeTONL(data);
      const decoded = decodeTONL(tonl);
      const doc = TONLDocument.fromJSON(decoded);
      const exported = doc.toTONL();
      const final = TONLDocument.parse(exported);

      assert.strictEqual(final.get('unicode'), 'こんにちは');
    });
  });

  describe('query -> modify -> query workflow', () => {
    test('should query, modify results, and re-query', () => {
      const doc = TONLDocument.fromJSON({
        products: [
          { id: 1, name: 'Widget', price: 10, active: true },
          { id: 2, name: 'Gadget', price: 20, active: false },
          { id: 3, name: 'Gizmo', price: 30, active: true }
        ]
      });

      // Query active products
      const activeProducts = doc.query('products[*]').filter((p: any) => p.active);
      assert.strictEqual(activeProducts.length, 2);

      // Modify: increase all prices by 10%
      for (let i = 0; i < 3; i++) {
        const currentPrice = doc.get(`products[${i}].price`);
        doc.set(`products[${i}].price`, currentPrice * 1.1);
      }

      // Re-query
      const updatedPrice = doc.get('products[0].price');
      assert.strictEqual(updatedPrice, 11);
    });

    test('should use recursive query with modifications', () => {
      const doc = TONLDocument.fromJSON({
        level1: {
          level2: {
            level3: {
              target: 'found'
            }
          }
        }
      });

      // Recursive query
      const results = doc.query('$..target');
      assert.ok(results.includes('found'));

      // Modify deep value
      doc.set('level1.level2.level3.target', 'modified');

      // Verify modification
      const newResults = doc.query('$..target');
      assert.ok(newResults.includes('modified'));
    });
  });
});

describe('Schema + Modification Integration', () => {
  test('should validate before modification', () => {
    const schemaContent = `@schema v1
name: str required
age: u32 min:0 max:150
`;

    const schema = parseSchema(schemaContent);
    const data = { name: 'Alice', age: 30 };
    const doc = TONLDocument.fromJSON(data);

    // Validate initial state
    const initialResult = validateTONL(doc.toJSON(), schema);
    assert.strictEqual(initialResult.valid, true);

    // Modify with valid data
    doc.set('age', 31);
    const afterModify = validateTONL(doc.toJSON(), schema);
    assert.strictEqual(afterModify.valid, true);
  });

  test('should detect validation errors after modification', () => {
    const schemaContent = `@schema v1
quantity: i32 min:0
`;

    const schema = parseSchema(schemaContent);
    const doc = TONLDocument.fromJSON({ quantity: 10 });

    // Valid modification
    doc.set('quantity', 5);
    let result = validateTONL(doc.toJSON(), schema);
    assert.strictEqual(result.valid, true);

    // Invalid modification (negative value)
    doc.set('quantity', -1);
    result = validateTONL(doc.toJSON(), schema);
    assert.strictEqual(result.valid, false);
  });
});

describe('Indexing + Query Integration', () => {
  test('should create index and use for fast lookups', () => {
    const doc = TONLDocument.fromJSON({
      users: [
        { id: 1, email: 'alice@example.com', name: 'Alice' },
        { id: 2, email: 'bob@example.com', name: 'Bob' },
        { id: 3, email: 'charlie@example.com', name: 'Charlie' }
      ]
    });

    // Create index on email field
    const index = new HashIndex('email-index', { unique: true });

    // Populate index from document
    const users = doc.get('users') as any[];
    users.forEach((user, i) => {
      index.insert(user.email, `users[${i}]`);
    });

    // Use index for fast lookup
    const paths = index.find('bob@example.com');
    assert.strictEqual(paths.length, 1);
    assert.strictEqual(paths[0], 'users[1]');

    // Verify with document query
    const bob = doc.get(paths[0]);
    assert.strictEqual(bob.name, 'Bob');
  });

  test('should update index after modifications', () => {
    const doc = TONLDocument.fromJSON({
      items: [
        { sku: 'A001', name: 'Item A' },
        { sku: 'B002', name: 'Item B' }
      ]
    });

    const index = new HashIndex('sku-index', { unique: true });

    // Initial index build
    const items = doc.get('items') as any[];
    items.forEach((item, i) => {
      index.insert(item.sku, `items[${i}]`);
    });

    assert.strictEqual(index.size(), 2);

    // Add new item to document
    doc.push('items', { sku: 'C003', name: 'Item C' });

    // Update index
    index.insert('C003', 'items[2]');

    assert.strictEqual(index.size(), 3);
    assert.deepStrictEqual(index.find('C003'), ['items[2]']);
  });

  test('should handle compound lookups', () => {
    const doc = TONLDocument.fromJSON({
      orders: [
        { customerId: 1, productId: 100, status: 'pending' },
        { customerId: 1, productId: 101, status: 'shipped' },
        { customerId: 2, productId: 100, status: 'delivered' }
      ]
    });

    // Create index on status
    const statusIndex = new HashIndex('status-index');

    const orders = doc.get('orders') as any[];
    orders.forEach((order, i) => {
      statusIndex.insert(order.status, `orders[${i}]`);
    });

    // Find all pending orders
    const pendingPaths = statusIndex.find('pending');
    assert.strictEqual(pendingPaths.length, 1);

    // Verify each pending order
    for (const path of pendingPaths) {
      const order = doc.get(path);
      assert.strictEqual(order.status, 'pending');
    }
  });
});

describe('Transaction + Modification Integration', () => {
  test('should commit transaction after successful modifications', () => {
    const data = { balance: 100, transactions: [] as any[] };
    const tx = new Transaction(data);

    // Record changes
    tx.recordChange({
      type: 'set',
      path: 'balance',
      oldValue: 100,
      newValue: 80
    });

    tx.recordChange({
      type: 'push',
      path: 'transactions',
      newValue: { amount: -20, date: '2025-01-01' }
    });

    // Commit
    const changes = tx.commit();
    assert.strictEqual(changes.length, 2);
    assert.strictEqual(changes[0].newValue, 80);
  });

  test('should rollback transaction on error', () => {
    const data = { items: ['a', 'b', 'c'], count: 3 };
    const tx = new Transaction(data);

    // Record some changes
    tx.recordChange({ type: 'push', path: 'items', newValue: 'd' });
    tx.recordChange({ type: 'set', path: 'count', oldValue: 3, newValue: 4 });

    // Simulate error - rollback
    const snapshot = tx.rollback();

    // Verify original state restored
    assert.deepStrictEqual(snapshot.items, ['a', 'b', 'c']);
    assert.strictEqual(snapshot.count, 3);
  });

  test('should track all changes in transaction', () => {
    const tx = new Transaction({});

    // Multiple changes
    tx.recordChange({ type: 'set', path: 'a', newValue: 1 });
    tx.recordChange({ type: 'set', path: 'b', newValue: 2 });
    tx.recordChange({ type: 'set', path: 'c', newValue: 3 });
    tx.recordChange({ type: 'delete', path: 'a', oldValue: 1 });

    const changes = tx.getChanges();
    assert.strictEqual(changes.length, 4);

    // Verify change types
    const types = changes.map(c => c.type);
    assert.deepStrictEqual(types, ['set', 'set', 'set', 'delete']);
  });
});

describe('Document Navigation + Query Integration', () => {
  test('should combine walk with query for complex traversal', () => {
    const doc = TONLDocument.fromJSON({
      departments: [
        {
          name: 'Engineering',
          teams: [
            { name: 'Backend', members: ['Alice', 'Bob'] },
            { name: 'Frontend', members: ['Charlie', 'David'] }
          ]
        },
        {
          name: 'Marketing',
          teams: [
            { name: 'Digital', members: ['Eve', 'Frank'] }
          ]
        }
      ]
    });

    // Walk to find all paths containing 'members'
    const memberPaths: string[] = [];
    doc.walk((path) => {
      if (path.endsWith('members')) {
        memberPaths.push(path);
      }
    });

    assert.strictEqual(memberPaths.length, 3);

    // Use paths to get all members
    let totalMembers = 0;
    for (const path of memberPaths) {
      const members = doc.get(path) as string[];
      totalMembers += members.length;
    }

    assert.strictEqual(totalMembers, 6);
  });

  test('should use find and findAll for value discovery', () => {
    const doc = TONLDocument.fromJSON({
      config: {
        primary: { enabled: true, timeout: 30 },
        secondary: { enabled: false, timeout: 60 },
        tertiary: { enabled: true, timeout: 45 }
      }
    });

    // Find first enabled
    const firstEnabled = doc.find((v) => v === true);
    assert.strictEqual(firstEnabled, true);

    // Find all timeouts > 30
    const highTimeouts = doc.findAll((v) => typeof v === 'number' && v > 30);
    assert.strictEqual(highTimeouts.length, 2);
    assert.ok(highTimeouts.includes(60));
    assert.ok(highTimeouts.includes(45));
  });

  test('should check conditions with some and every', () => {
    const doc = TONLDocument.fromJSON({
      scores: [85, 90, 78, 92, 88]
    });

    // Check if any score > 90
    const hasExcellent = doc.some((v) => typeof v === 'number' && v > 90);
    assert.strictEqual(hasExcellent, true);

    // Check if all scores > 70
    // Note: every checks all values including non-numbers
    const allPassing = doc.every((v) => {
      if (typeof v === 'number') return v > 70;
      return true; // Non-numbers pass
    });
    assert.strictEqual(allPassing, true);
  });
});

describe('Snapshot + Diff Integration', () => {
  test('should create snapshot and detect differences', () => {
    const doc = TONLDocument.fromJSON({
      version: 1,
      data: { value: 'original' }
    });

    // Create snapshot
    const snapshot = doc.snapshot();

    // Modify document
    doc.set('version', 2);
    doc.set('data.value', 'modified');

    // Verify snapshot unchanged
    assert.strictEqual(snapshot.get('version'), 1);
    assert.strictEqual(snapshot.get('data.value'), 'original');

    // Verify document changed
    assert.strictEqual(doc.get('version'), 2);
    assert.strictEqual(doc.get('data.value'), 'modified');
  });

  test('should diff two documents', () => {
    const doc1 = TONLDocument.fromJSON({
      name: 'Alice',
      age: 30,
      city: 'NYC'
    });

    const doc2 = TONLDocument.fromJSON({
      name: 'Alice',
      age: 31,
      country: 'USA'
    });

    const diff = doc1.diff(doc2);
    assert.ok(diff);
  });
});

describe('End-to-End Workflow Scenarios', () => {
  test('scenario: config file update workflow', () => {
    // 1. Load config
    const configTonl = `@v1.0
app_name: MyApp
version: 1.0.0
features{}:
  auth: true
  cache: false
  logging: true`;

    const doc = TONLDocument.parse(configTonl);

    // 2. Verify current state
    assert.strictEqual(doc.get('app_name'), 'MyApp');
    assert.strictEqual(doc.get('features.cache'), false);

    // 3. Update configuration
    doc.set('version', '1.1.0');
    doc.set('features.cache', true);

    // 4. Export and verify
    const newConfig = doc.toTONL();
    const reloaded = TONLDocument.parse(newConfig);

    assert.strictEqual(reloaded.get('version'), '1.1.0');
    assert.strictEqual(reloaded.get('features.cache'), true);
  });

  test('scenario: data migration workflow', () => {
    // Old format
    const oldData = {
      user_name: 'alice',
      user_email: 'alice@example.com',
      created_at: '2024-01-01'
    };

    const doc = TONLDocument.fromJSON(oldData);

    // Migrate to new format
    const userName = doc.get('user_name');
    const userEmail = doc.get('user_email');
    const createdAt = doc.get('created_at');

    // Create new structure
    const newDoc = TONLDocument.fromJSON({
      user: {
        name: userName,
        email: userEmail,
        metadata: {
          createdAt: createdAt,
          updatedAt: new Date().toISOString().split('T')[0]
        }
      }
    });

    // Verify migration
    assert.strictEqual(newDoc.get('user.name'), 'alice');
    assert.strictEqual(newDoc.get('user.email'), 'alice@example.com');
    assert.ok(newDoc.exists('user.metadata.updatedAt'));
  });

  test('scenario: batch processing workflow', () => {
    const records = [
      { id: 1, status: 'pending' },
      { id: 2, status: 'pending' },
      { id: 3, status: 'completed' },
      { id: 4, status: 'pending' }
    ];

    const doc = TONLDocument.fromJSON({ records });

    // Find all pending
    const pendingIndices: number[] = [];
    const allRecords = doc.get('records') as any[];
    allRecords.forEach((record, i) => {
      if (record.status === 'pending') {
        pendingIndices.push(i);
      }
    });

    // Update all pending to processing
    for (const idx of pendingIndices) {
      doc.set(`records[${idx}].status`, 'processing');
    }

    // Verify updates
    const updatedRecords = doc.get('records') as any[];
    const processingCount = updatedRecords.filter(r => r.status === 'processing').length;
    assert.strictEqual(processingCount, 3);
  });
});
