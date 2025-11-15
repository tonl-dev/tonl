/**
 * Tests for column reordering optimization
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { ColumnReorderer } from '../../dist/optimization/column-reorder.js';

describe('ColumnReorderer', () => {
  describe('calculateEntropy', () => {
    it('should return 0 for uniform values', () => {
      const reorderer = new ColumnReorderer();
      const values = ['admin', 'admin', 'admin', 'admin'];

      const entropy = reorderer.calculateEntropy(values);

      assert.strictEqual(entropy, 0);
    });

    it('should return higher entropy for diverse values', () => {
      const reorderer = new ColumnReorderer();
      const uniformValues = ['admin', 'admin', 'admin', 'admin'];
      const diverseValues = ['alice', 'bob', 'carol', 'dave'];

      const uniformEntropy = reorderer.calculateEntropy(uniformValues);
      const diverseEntropy = reorderer.calculateEntropy(diverseValues);

      assert.ok(diverseEntropy > uniformEntropy);
    });

    it('should handle empty array', () => {
      const reorderer = new ColumnReorderer();

      const entropy = reorderer.calculateEntropy([]);

      assert.strictEqual(entropy, 0);
    });

    it('should handle mixed data types', () => {
      const reorderer = new ColumnReorderer();
      const values = [1, 'two', true, null, 1, 'two'];

      const entropy = reorderer.calculateEntropy(values);

      // Should be > 0 but less than max entropy for 4 unique values
      assert.ok(entropy > 0);
      assert.ok(entropy < 2); // Max for 4 values is 2 bits
    });

    it('should calculate correct entropy for binary distribution', () => {
      const reorderer = new ColumnReorderer();
      // 50/50 distribution has max entropy for binary: 1 bit
      const values = ['active', 'active', 'inactive', 'inactive'];

      const entropy = reorderer.calculateEntropy(values);

      // Should be close to 1.0 (max for binary)
      assert.ok(Math.abs(entropy - 1.0) < 0.01);
    });
  });

  describe('analyzeColumns', () => {
    it('should analyze multiple columns', () => {
      const reorderer = new ColumnReorderer();
      const data = [
        { role: 'admin', status: 'active', name: 'Alice' },
        { role: 'admin', status: 'active', name: 'Bob' },
        { role: 'user', status: 'active', name: 'Carol' },
        { role: 'admin', status: 'inactive', name: 'Dave' }
      ];

      const entropies = reorderer.analyzeColumns(data, ['role', 'status', 'name']);

      assert.ok(entropies.has('role'));
      assert.ok(entropies.has('status'));
      assert.ok(entropies.has('name'));

      // role has lower entropy (3 admin, 1 user) than name (all unique)
      assert.ok(entropies.get('role')! < entropies.get('name')!);
    });

    it('should return empty map for empty columns', () => {
      const reorderer = new ColumnReorderer();
      const data = [{ a: 1 }, { a: 2 }];

      const entropies = reorderer.analyzeColumns(data, []);

      assert.strictEqual(entropies.size, 0);
    });
  });

  describe('reorderColumns', () => {
    it('should reorder columns by ascending entropy', () => {
      const reorderer = new ColumnReorderer();
      const data = [
        { role: 'admin', age: 30, name: 'Alice' },
        { role: 'admin', age: 25, name: 'Bob' },
        { role: 'admin', age: 35, name: 'Carol' },
        { role: 'user', age: 28, name: 'Dave' }
      ];

      const result = reorderer.reorderColumns(data, ['name', 'age', 'role']);

      // role should come first (lowest entropy: 3 admin, 1 user)
      // age should be middle (4 unique values)
      // name should be last (4 unique values, but names might vary)
      assert.strictEqual(result.reorderedColumns[0], 'role');

      // Verify mapping
      assert.ok(Array.isArray(result.mapping));
      assert.strictEqual(result.mapping.length, 3);

      // Verify entropies are included
      assert.ok(result.entropies.has('name'));
      assert.ok(result.entropies.has('age'));
      assert.ok(result.entropies.has('role'));
    });

    it('should handle single column', () => {
      const reorderer = new ColumnReorderer();
      const data = [{ id: 1 }, { id: 2 }];

      const result = reorderer.reorderColumns(data, ['id']);

      assert.deepStrictEqual(result.reorderedColumns, ['id']);
      assert.deepStrictEqual(result.mapping, [0]);
    });

    it('should preserve column names exactly', () => {
      const reorderer = new ColumnReorderer();
      const data = [
        { a: 1, b: 1, c: 1 },
        { a: 2, b: 1, c: 1 }
      ];
      const columns = ['a', 'b', 'c'];

      const result = reorderer.reorderColumns(data, columns);

      // All column names should be present
      for (const col of columns) {
        assert.ok(result.reorderedColumns.includes(col));
      }
    });
  });

  describe('generateMappingDirective', () => {
    it('should generate valid directive', () => {
      const reorderer = new ColumnReorderer();
      const mapping = [2, 0, 1];

      const directive = reorderer.generateMappingDirective(mapping);

      assert.strictEqual(directive, '@colmap 2,0,1');
    });

    it('should handle single element', () => {
      const reorderer = new ColumnReorderer();

      const directive = reorderer.generateMappingDirective([0]);

      assert.strictEqual(directive, '@colmap 0');
    });

    it('should handle large mappings', () => {
      const reorderer = new ColumnReorderer();
      const mapping = [5, 3, 1, 0, 2, 4];

      const directive = reorderer.generateMappingDirective(mapping);

      assert.strictEqual(directive, '@colmap 5,3,1,0,2,4');
    });
  });

  describe('parseMappingDirective', () => {
    it('should parse valid directive', () => {
      const reorderer = new ColumnReorderer();

      const mapping = reorderer.parseMappingDirective('@colmap 2,0,1');

      assert.deepStrictEqual(mapping, [2, 0, 1]);
    });

    it('should handle whitespace', () => {
      const reorderer = new ColumnReorderer();

      const mapping = reorderer.parseMappingDirective('@colmap  2 , 0 , 1 ');

      assert.deepStrictEqual(mapping, [2, 0, 1]);
    });

    it('should throw on invalid numbers', () => {
      const reorderer = new ColumnReorderer();

      assert.throws(() => {
        reorderer.parseMappingDirective('@colmap 1,abc,2');
      });
    });

    it('should throw on negative numbers', () => {
      const reorderer = new ColumnReorderer();

      assert.throws(() => {
        reorderer.parseMappingDirective('@colmap 1,-1,2');
      });
    });

    it('should handle single element', () => {
      const reorderer = new ColumnReorderer();

      const mapping = reorderer.parseMappingDirective('@colmap 0');

      assert.deepStrictEqual(mapping, [0]);
    });
  });

  describe('restoreOriginalOrder', () => {
    it('should restore original column order', () => {
      const reorderer = new ColumnReorderer();
      const reorderedColumns = ['role', 'age', 'name'];
      const mapping = [2, 0, 1]; // role was at index 2, age at 0, name at 1

      const original = reorderer.restoreOriginalOrder(reorderedColumns, mapping);

      assert.deepStrictEqual(original, ['age', 'name', 'role']);
    });

    it('should handle identity mapping', () => {
      const reorderer = new ColumnReorderer();
      const columns = ['a', 'b', 'c'];
      const mapping = [0, 1, 2];

      const original = reorderer.restoreOriginalOrder(columns, mapping);

      assert.deepStrictEqual(original, columns);
    });

    it('should throw on mismatched lengths', () => {
      const reorderer = new ColumnReorderer();

      assert.throws(() => {
        reorderer.restoreOriginalOrder(['a', 'b'], [0, 1, 2]);
      });
    });
  });

  describe('reorderRow', () => {
    it('should reorder row data', () => {
      const reorderer = new ColumnReorderer();
      const row = { name: 'Alice', age: 30, role: 'admin' };
      const originalColumns = ['name', 'age', 'role'];
      const reorderedColumns = ['role', 'age', 'name'];

      const reordered = reorderer.reorderRow(row, originalColumns, reorderedColumns);

      // Check that keys are in the new order
      const keys = Object.keys(reordered);
      assert.deepStrictEqual(keys, reorderedColumns);

      // Check values are preserved
      assert.strictEqual(reordered.name, 'Alice');
      assert.strictEqual(reordered.age, 30);
      assert.strictEqual(reordered.role, 'admin');
    });

    it('should handle missing fields', () => {
      const reorderer = new ColumnReorderer();
      const row = { name: 'Alice', role: 'admin' }; // age missing
      const originalColumns = ['name', 'age', 'role'];
      const reorderedColumns = ['role', 'age', 'name'];

      const reordered = reorderer.reorderRow(row, originalColumns, reorderedColumns);

      assert.strictEqual(reordered.name, 'Alice');
      assert.strictEqual(reordered.role, 'admin');
      assert.ok(!('age' in reordered));
    });
  });

  describe('estimateSavings', () => {
    it('should estimate savings from reordering', () => {
      const reorderer = new ColumnReorderer();
      const entropies = new Map([
        ['role', 0.5],    // Low entropy
        ['age', 2.0],     // Medium entropy
        ['name', 3.5]     // High entropy
      ]);

      const originalOrder = ['name', 'age', 'role']; // High entropy first (bad)
      const optimizedOrder = ['role', 'age', 'name']; // Low entropy first (good)

      const savings = reorderer.estimateSavings(entropies, originalOrder, optimizedOrder);

      // Should show positive savings
      assert.ok(savings > 0);
      assert.ok(savings <= 1); // Should be a fraction
    });

    it('should return 0 for same order', () => {
      const reorderer = new ColumnReorderer();
      const entropies = new Map([
        ['a', 1.0],
        ['b', 2.0]
      ]);

      const order = ['a', 'b'];
      const savings = reorderer.estimateSavings(entropies, order, order);

      assert.strictEqual(savings, 0);
    });

    it('should handle empty columns', () => {
      const reorderer = new ColumnReorderer();
      const entropies = new Map();

      const savings = reorderer.estimateSavings(entropies, [], []);

      assert.strictEqual(savings, 0);
    });
  });

  describe('shouldReorder', () => {
    it('should recommend reordering when beneficial', () => {
      const reorderer = new ColumnReorderer();
      const data = [
        { name: 'Alice', age: 30, role: 'admin' },
        { name: 'Bob', age: 25, role: 'admin' },
        { name: 'Carol', age: 35, role: 'admin' },
        { name: 'Dave', age: 28, role: 'user' }
      ];
      const columns = ['name', 'age', 'role']; // High entropy first

      const should = reorderer.shouldReorder(data, columns, 0.01); // 1% threshold

      // role has much lower entropy, should recommend reordering
      assert.strictEqual(should, true);
    });

    it('should not recommend reordering for single column', () => {
      const reorderer = new ColumnReorderer();
      const data = [{ id: 1 }, { id: 2 }];

      const should = reorderer.shouldReorder(data, ['id']);

      assert.strictEqual(should, false);
    });

    it('should not recommend reordering if already optimal', () => {
      const reorderer = new ColumnReorderer();
      const data = [
        { role: 'admin', age: 30, name: 'Alice' },
        { role: 'admin', age: 25, name: 'Bob' },
        { role: 'user', age: 35, name: 'Carol' }
      ];
      const columns = ['role', 'age', 'name']; // Already low to high entropy

      const should = reorderer.shouldReorder(data, columns, 0.01);

      // Should return false (already optimal or savings below threshold)
      assert.strictEqual(should, false);
    });

    it('should respect savings threshold', () => {
      const reorderer = new ColumnReorderer();
      const data = [
        { a: 1, b: 1 },
        { a: 2, b: 1 }
      ];
      const columns = ['a', 'b'];

      // With very high threshold, should not recommend
      const shouldWithHighThreshold = reorderer.shouldReorder(data, columns, 0.50); // 50%

      assert.strictEqual(shouldWithHighThreshold, false);
    });
  });

  describe('Integration', () => {
    it('should complete full reorder workflow', () => {
      const reorderer = new ColumnReorderer();
      const data = [
        { name: 'Alice', age: 30, role: 'admin', status: 'active' },
        { name: 'Bob', age: 25, role: 'admin', status: 'active' },
        { name: 'Carol', age: 35, role: 'user', status: 'active' },
        { name: 'Dave', age: 28, role: 'admin', status: 'inactive' }
      ];
      const originalColumns = ['name', 'age', 'role', 'status'];

      // Step 1: Reorder columns
      const result = reorderer.reorderColumns(data, originalColumns);

      // Step 2: Generate directive
      const directive = reorderer.generateMappingDirective(result.mapping);
      assert.ok(directive.startsWith('@colmap'));

      // Step 3: Parse directive
      const parsedMapping = reorderer.parseMappingDirective(directive);
      assert.deepStrictEqual(parsedMapping, result.mapping);

      // Step 4: Restore original order
      const restored = reorderer.restoreOriginalOrder(result.reorderedColumns, result.mapping);
      assert.deepStrictEqual(restored, originalColumns);

      // Step 5: Reorder row data
      const reorderedRow = reorderer.reorderRow(data[0], originalColumns, result.reorderedColumns);
      const rowKeys = Object.keys(reorderedRow);
      assert.deepStrictEqual(rowKeys, result.reorderedColumns);
    });

    it('should handle real-world dataset', () => {
      const reorderer = new ColumnReorderer();

      // Simulate e-commerce dataset
      const data = Array(100).fill(null).map((_, i) => ({
        id: i + 1,
        productName: `Product ${i}`,
        category: ['Electronics', 'Books', 'Clothing'][i % 3],
        status: 'active',
        price: Math.round(Math.random() * 1000),
        inStock: true
      }));

      const columns = ['id', 'productName', 'category', 'status', 'price', 'inStock'];

      // Should recommend reordering (status and inStock have low entropy)
      const should = reorderer.shouldReorder(data, columns, 0.01);
      assert.strictEqual(should, true);

      // Get optimized order
      const result = reorderer.reorderColumns(data, columns);

      // status and inStock should be early in the list (low entropy)
      const statusIndex = result.reorderedColumns.indexOf('status');
      const inStockIndex = result.reorderedColumns.indexOf('inStock');
      const productNameIndex = result.reorderedColumns.indexOf('productName');

      assert.ok(statusIndex < productNameIndex);
      assert.ok(inStockIndex < productNameIndex);
    });
  });
});
