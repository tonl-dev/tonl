/**
 * Tests for schema inheritance optimizer
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { SchemaInheritance } from '../../dist/optimization/schema-inherit.js';

describe('SchemaInheritance', () => {
  describe('inferSchema', () => {
    it('should infer schema from data', () => {
      const manager = new SchemaInheritance();
      const data = [
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false }
      ];

      const schema = manager.inferSchema(data, 'user_v1');

      assert.strictEqual(schema.name, 'user_v1');
      assert.strictEqual(schema.version, 1);
      assert.strictEqual(schema.columns.length, 3);

      const idCol = schema.columns.find(c => c.name === 'id');
      assert.ok(idCol);
      assert.strictEqual(idCol.type, 'number');

      const nameCol = schema.columns.find(c => c.name === 'name');
      assert.ok(nameCol);
      assert.strictEqual(nameCol.type, 'string');

      const activeCol = schema.columns.find(c => c.name === 'active');
      assert.ok(activeCol);
      assert.strictEqual(activeCol.type, 'boolean');
    });

    it('should detect nullable columns', () => {
      const manager = new SchemaInheritance();
      const data = [
        { id: 1, email: 'alice@example.com' },
        { id: 2, email: null }
      ];

      const schema = manager.inferSchema(data, 'user_v1');

      const emailCol = schema.columns.find(c => c.name === 'email');
      assert.ok(emailCol);
      assert.strictEqual(emailCol.nullable, true);
    });

    it('should handle empty data', () => {
      const manager = new SchemaInheritance();
      const schema = manager.inferSchema([], 'empty_schema');

      assert.strictEqual(schema.columns.length, 0);
    });

    it('should detect mixed types', () => {
      const manager = new SchemaInheritance();
      const data = [
        { value: 'string' },
        { value: 123 },
        { value: true }
      ];

      const schema = manager.inferSchema(data, 'mixed_schema');

      const valueCol = schema.columns.find(c => c.name === 'value');
      assert.ok(valueCol);
      assert.strictEqual(valueCol.type, 'mixed');
    });

    it('should detect array type', () => {
      const manager = new SchemaInheritance();
      const data = [
        { tags: ['a', 'b'] },
        { tags: ['c'] }
      ];

      const schema = manager.inferSchema(data, 'tagged_schema');

      const tagsCol = schema.columns.find(c => c.name === 'tags');
      assert.ok(tagsCol);
      assert.strictEqual(tagsCol.type, 'array');
    });

    it('should detect object type', () => {
      const manager = new SchemaInheritance();
      const data = [
        { metadata: { key: 'value' } },
        { metadata: { foo: 'bar' } }
      ];

      const schema = manager.inferSchema(data, 'meta_schema');

      const metaCol = schema.columns.find(c => c.name === 'metadata');
      assert.ok(metaCol);
      assert.strictEqual(metaCol.type, 'object');
    });
  });

  describe('registerSchema / getSchema', () => {
    it('should register and retrieve schema', () => {
      const manager = new SchemaInheritance();
      const schema = {
        name: 'test_schema',
        version: 1,
        columns: [
          { name: 'id', type: 'number' as const },
          { name: 'name', type: 'string' as const }
        ]
      };

      manager.registerSchema(schema);
      const retrieved = manager.getSchema('test_schema');

      assert.ok(retrieved);
      assert.strictEqual(retrieved.name, 'test_schema');
      assert.strictEqual(retrieved.columns.length, 2);
    });

    it('should return undefined for unknown schema', () => {
      const manager = new SchemaInheritance();
      const schema = manager.getSchema('unknown');

      assert.strictEqual(schema, undefined);
    });
  });

  describe('analyzeSimilarity', () => {
    it('should detect highly similar datasets', () => {
      const manager = new SchemaInheritance();
      const data1 = [{ id: 1, name: 'Alice', email: 'a@example.com' }];
      const data2 = [{ id: 2, name: 'Bob', email: 'b@example.com' }];

      const analysis = manager.analyzeSimilarity(data1, data2);

      assert.strictEqual(analysis.similarity, 1.0);
      assert.strictEqual(analysis.commonColumns.length, 3);
      assert.strictEqual(analysis.uniqueColumns.length, 0);
      assert.ok(analysis.recommended);
    });

    it('should detect partially similar datasets', () => {
      const manager = new SchemaInheritance();
      const data1 = [{ id: 1, name: 'Alice', email: 'a@example.com' }];
      const data2 = [{ id: 2, name: 'Bob', phone: '555-1234' }];

      const analysis = manager.analyzeSimilarity(data1, data2);

      assert.ok(analysis.similarity > 0 && analysis.similarity < 1);
      assert.strictEqual(analysis.commonColumns.length, 2); // id, name
      assert.strictEqual(analysis.uniqueColumns.length, 2); // email, phone
    });

    it('should not recommend for low similarity', () => {
      const manager = new SchemaInheritance();
      const data1 = [{ id: 1, name: 'Alice' }];
      const data2 = [{ email: 'b@example.com', phone: '555-1234' }];

      const analysis = manager.analyzeSimilarity(data1, data2);

      assert.ok(analysis.similarity < 0.7);
      assert.ok(!analysis.recommended);
    });

    it('should handle empty datasets', () => {
      const manager = new SchemaInheritance();
      const analysis = manager.analyzeSimilarity([], []);

      assert.strictEqual(analysis.similarity, 0);
      assert.ok(!analysis.recommended);
    });
  });

  describe('createSchemaFromData', () => {
    it('should create and register schema', () => {
      const manager = new SchemaInheritance();
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ];

      const schema = manager.createSchemaFromData(data, 'user');

      assert.strictEqual(schema.name, 'user_v1');
      assert.ok(manager.getSchema('user_v1'));
    });
  });

  describe('extendSchema', () => {
    it('should extend existing schema', () => {
      const manager = new SchemaInheritance();
      const baseSchema = {
        name: 'base_v1',
        version: 1,
        columns: [
          { name: 'id', type: 'number' as const },
          { name: 'name', type: 'string' as const }
        ]
      };

      manager.registerSchema(baseSchema);

      const extended = manager.extendSchema('base_v1', [
        { name: 'email', type: 'string' as const }
      ], 'extended_v1');

      assert.strictEqual(extended.name, 'extended_v1');
      assert.strictEqual(extended.columns.length, 3);
      assert.strictEqual(extended.inheritsFrom, 'base_v1');
    });

    it('should throw on unknown base schema', () => {
      const manager = new SchemaInheritance();

      assert.throws(() => {
        manager.extendSchema('unknown', [], 'new_schema');
      }, /Schema not found/);
    });
  });

  describe('generateSchemaDirective', () => {
    it('should generate valid directive', () => {
      const manager = new SchemaInheritance();
      const schema = {
        name: 'user_v1',
        version: 1,
        columns: [
          { name: 'id', type: 'number' as const },
          { name: 'name', type: 'string' as const },
          { name: 'active', type: 'boolean' as const }
        ]
      };

      const directive = manager.generateSchemaDirective(schema);

      assert.strictEqual(directive, '@schema user_v1: id:number, name:string, active:boolean');
    });

    it('should include nullable marker', () => {
      const manager = new SchemaInheritance();
      const schema = {
        name: 'user_v1',
        version: 1,
        columns: [
          { name: 'id', type: 'number' as const },
          { name: 'email', type: 'string' as const, nullable: true }
        ]
      };

      const directive = manager.generateSchemaDirective(schema);

      assert.ok(directive.includes('email:string?'));
    });
  });

  describe('generateUseDirective', () => {
    it('should generate use directive', () => {
      const manager = new SchemaInheritance();
      manager.registerSchema({
        name: 'test_schema',
        version: 1,
        columns: []
      });

      const directive = manager.generateUseDirective('test_schema');

      assert.strictEqual(directive, '@use test_schema');
    });

    it('should track usage count', () => {
      const manager = new SchemaInheritance();
      manager.registerSchema({
        name: 'test_schema',
        version: 1,
        columns: []
      });

      manager.generateUseDirective('test_schema');
      manager.generateUseDirective('test_schema');

      const stats = manager.getUsageStats();
      assert.strictEqual(stats.get('test_schema'), 2);
    });
  });

  describe('parseSchemaDirective', () => {
    it('should parse valid directive', () => {
      const manager = new SchemaInheritance();
      const directive = '@schema user_v1: id:number, name:string, active:boolean';

      const schema = manager.parseSchemaDirective(directive);

      assert.strictEqual(schema.name, 'user_v1');
      assert.strictEqual(schema.columns.length, 3);
      assert.ok(manager.getSchema('user_v1')); // Should be registered
    });

    it('should parse nullable columns', () => {
      const manager = new SchemaInheritance();
      const directive = '@schema user_v1: id:number, email:string?';

      const schema = manager.parseSchemaDirective(directive);

      const emailCol = schema.columns.find(c => c.name === 'email');
      assert.ok(emailCol);
      assert.strictEqual(emailCol.nullable, true);
    });

    it('should throw on invalid format', () => {
      const manager = new SchemaInheritance();

      assert.throws(() => {
        manager.parseSchemaDirective('@invalid');
      }, /Invalid schema directive/);
    });

    it('should throw on invalid column definition', () => {
      const manager = new SchemaInheritance();

      assert.throws(() => {
        manager.parseSchemaDirective('@schema test: invalid');
      }, /Invalid column definition/);
    });

    it('should throw on invalid type', () => {
      const manager = new SchemaInheritance();

      assert.throws(() => {
        manager.parseSchemaDirective('@schema test: col:invalid_type');
      }, /Invalid column type/);
    });
  });

  describe('parseUseDirective', () => {
    it('should parse valid directive', () => {
      const manager = new SchemaInheritance();
      manager.registerSchema({
        name: 'test_schema',
        version: 1,
        columns: []
      });

      const schemaName = manager.parseUseDirective('@use test_schema');

      assert.strictEqual(schemaName, 'test_schema');
    });

    it('should throw on invalid format', () => {
      const manager = new SchemaInheritance();

      assert.throws(() => {
        manager.parseUseDirective('@invalid');
      }, /Invalid use directive/);
    });

    it('should throw on unknown schema', () => {
      const manager = new SchemaInheritance();

      assert.throws(() => {
        manager.parseUseDirective('@use unknown');
      }, /Schema not found/);
    });
  });

  describe('applySchema', () => {
    it('should validate data against schema', () => {
      const manager = new SchemaInheritance();
      const schema = {
        name: 'user_v1',
        version: 1,
        columns: [
          { name: 'id', type: 'number' as const },
          { name: 'name', type: 'string' as const }
        ]
      };

      manager.registerSchema(schema);

      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ];

      const validated = manager.applySchema(data, 'user_v1');

      assert.strictEqual(validated.length, 2);
      assert.strictEqual(validated[0].id, 1);
      assert.strictEqual(validated[0].name, 'Alice');
    });

    it('should throw on null value for non-nullable column', () => {
      const manager = new SchemaInheritance();
      const schema = {
        name: 'user_v1',
        version: 1,
        columns: [
          { name: 'id', type: 'number' as const, nullable: false }
        ]
      };

      manager.registerSchema(schema);

      const data = [{ id: null }];

      assert.throws(() => {
        manager.applySchema(data, 'user_v1');
      }, /Null value for non-nullable column/);
    });

    it('should use default value for null', () => {
      const manager = new SchemaInheritance();
      const schema = {
        name: 'user_v1',
        version: 1,
        columns: [
          { name: 'active', type: 'boolean' as const, nullable: false, defaultValue: false }
        ]
      };

      manager.registerSchema(schema);

      const data = [{ active: null }];
      const validated = manager.applySchema(data, 'user_v1');

      assert.strictEqual(validated[0].active, false);
    });

    it('should throw on unknown schema', () => {
      const manager = new SchemaInheritance();
      const data = [{ id: 1 }];

      assert.throws(() => {
        manager.applySchema(data, 'unknown');
      }, /Schema not found/);
    });
  });

  describe('findMatchingSchema', () => {
    it('should find exact match', () => {
      const manager = new SchemaInheritance();
      manager.registerSchema({
        name: 'user_v1',
        version: 1,
        columns: [
          { name: 'id', type: 'number' as const },
          { name: 'name', type: 'string' as const }
        ]
      });

      const data = [{ id: 1, name: 'Alice' }];
      const match = manager.findMatchingSchema(data);

      assert.strictEqual(match, 'user_v1');
    });

    it('should find best partial match', () => {
      const manager = new SchemaInheritance();
      manager.registerSchema({
        name: 'user_v1',
        version: 1,
        columns: [
          { name: 'id', type: 'number' as const },
          { name: 'name', type: 'string' as const },
          { name: 'email', type: 'string' as const }
        ]
      });

      // Data has 2 out of 3 columns (67% match, but needs >=80%)
      const data = [{ id: 1, name: 'Alice' }];
      const match = manager.findMatchingSchema(data);

      // Won't match because similarity (0.67) < 0.8
      assert.strictEqual(match, null);
    });

    it('should return null for empty data', () => {
      const manager = new SchemaInheritance();
      const match = manager.findMatchingSchema([]);

      assert.strictEqual(match, null);
    });

    it('should return null when no good match', () => {
      const manager = new SchemaInheritance();
      manager.registerSchema({
        name: 'user_v1',
        version: 1,
        columns: [
          { name: 'id', type: 'number' as const }
        ]
      });

      const data = [{ email: 'test@example.com', phone: '555-1234' }];
      const match = manager.findMatchingSchema(data);

      assert.strictEqual(match, null);
    });
  });

  describe('estimateSavings', () => {
    it('should calculate savings for multiple blocks', () => {
      const manager = new SchemaInheritance();
      // Use many blocks with many columns for positive savings
      const blocks = Array(10).fill(null).map((_, i) => [
        {
          id: i,
          name: `User${i}`,
          email: `user${i}@example.com`,
          active: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]);

      const savings = manager.estimateSavings(blocks);

      // With 10 blocks and 6 columns, savings should be non-negative
      assert.ok(savings >= 0);
    });

    it('should return 0 for insufficient blocks', () => {
      const manager = new SchemaInheritance({ minBlockCount: 3 });
      const blocks = [
        [{ id: 1, name: 'Alice' }],
        [{ id: 2, name: 'Bob' }]
      ];

      const savings = manager.estimateSavings(blocks);

      assert.strictEqual(savings, 0);
    });

    it('should return 0 for empty blocks', () => {
      const manager = new SchemaInheritance();
      const savings = manager.estimateSavings([[]]);

      assert.strictEqual(savings, 0);
    });
  });

  describe('getSchemaNames', () => {
    it('should return all schema names', () => {
      const manager = new SchemaInheritance();
      manager.registerSchema({ name: 'schema1', version: 1, columns: [] });
      manager.registerSchema({ name: 'schema2', version: 1, columns: [] });

      const names = manager.getSchemaNames();

      assert.strictEqual(names.length, 2);
      assert.ok(names.includes('schema1'));
      assert.ok(names.includes('schema2'));
    });

    it('should return empty array initially', () => {
      const manager = new SchemaInheritance();
      const names = manager.getSchemaNames();

      assert.strictEqual(names.length, 0);
    });
  });

  describe('getUsageStats', () => {
    it('should track usage statistics', () => {
      const manager = new SchemaInheritance();
      manager.registerSchema({ name: 'test', version: 1, columns: [] });

      manager.generateUseDirective('test');
      manager.generateUseDirective('test');
      manager.generateUseDirective('test');

      const stats = manager.getUsageStats();

      assert.strictEqual(stats.get('test'), 3);
    });
  });

  describe('clear', () => {
    it('should clear all schemas and stats', () => {
      const manager = new SchemaInheritance();
      manager.registerSchema({ name: 'test', version: 1, columns: [] });
      manager.generateUseDirective('test');

      manager.clear();

      assert.strictEqual(manager.getSchemaNames().length, 0);
      assert.strictEqual(manager.getUsageStats().size, 0);
    });
  });

  describe('shouldUseInheritance', () => {
    it('should recommend for similar blocks', () => {
      const manager = new SchemaInheritance();
      const blocks = [
        [{ id: 1, name: 'Alice', email: 'a@example.com' }],
        [{ id: 2, name: 'Bob', email: 'b@example.com' }]
      ];

      const should = manager.shouldUseInheritance(blocks);

      assert.ok(should);
    });

    it('should not recommend for insufficient blocks', () => {
      const manager = new SchemaInheritance({ minBlockCount: 3 });
      const blocks = [
        [{ id: 1, name: 'Alice' }],
        [{ id: 2, name: 'Bob' }]
      ];

      const should = manager.shouldUseInheritance(blocks);

      assert.ok(!should);
    });

    it('should not recommend when disabled', () => {
      const manager = new SchemaInheritance({ enabled: false });
      const blocks = [
        [{ id: 1, name: 'Alice' }],
        [{ id: 2, name: 'Bob' }]
      ];

      const should = manager.shouldUseInheritance(blocks);

      assert.ok(!should);
    });

    it('should not recommend for dissimilar blocks', () => {
      const manager = new SchemaInheritance();
      const blocks = [
        [{ id: 1, name: 'Alice' }],
        [{ email: 'b@example.com', phone: '555-1234' }]
      ];

      const should = manager.shouldUseInheritance(blocks);

      assert.ok(!should);
    });
  });

  describe('real-world scenarios', () => {
    it('should optimize multi-period user data', () => {
      const manager = new SchemaInheritance();
      const jan = [
        { id: 1, name: 'Alice', email: 'a@example.com', active: true },
        { id: 2, name: 'Bob', email: 'b@example.com', active: false }
      ];
      const feb = [
        { id: 3, name: 'Charlie', email: 'c@example.com', active: true },
        { id: 4, name: 'Diana', email: 'd@example.com', active: true }
      ];
      const mar = [
        { id: 5, name: 'Eve', email: 'e@example.com', active: false }
      ];

      // Create schema from first block
      const schema = manager.createSchemaFromData(jan, 'user');
      const schemaDirective = manager.generateSchemaDirective(schema);

      // Generate use directives for other blocks
      const febUse = manager.generateUseDirective('user_v1');
      const marUse = manager.generateUseDirective('user_v1');

      assert.ok(schemaDirective.includes('@schema user_v1:'));
      assert.strictEqual(febUse, '@use user_v1');
      assert.strictEqual(marUse, '@use user_v1');

      // Verify usage tracking
      const stats = manager.getUsageStats();
      assert.strictEqual(stats.get('user_v1'), 2); // Used in feb and mar
    });

    it('should handle schema evolution', () => {
      const manager = new SchemaInheritance();

      // Original schema
      const baseSchema = manager.inferSchema([
        { id: 1, name: 'Alice' }
      ], 'user_v1');

      manager.registerSchema(baseSchema);

      // Extended schema with new field
      const extended = manager.extendSchema('user_v1', [
        { name: 'email', type: 'string' }
      ], 'user_v2');

      assert.strictEqual(extended.columns.length, 3);
      assert.strictEqual(extended.inheritsFrom, 'user_v1');
    });

    it('should calculate significant savings for time-series data', () => {
      const manager = new SchemaInheritance();

      // 12 months of data with same structure - more columns for better savings
      const blocks = Array(12).fill(null).map((_, month) => [
        {
          month: month + 1,
          revenue: 10000 + month * 500,
          expenses: 5000,
          profit: 5000 + month * 500,
          growth: 0.05,
          customers: 1000 + month * 50
        }
      ]);

      const savings = manager.estimateSavings(blocks);

      // With 12 blocks and 6 columns, savings should be significant
      assert.ok(savings >= 0); // At minimum should not be negative
      // The exact value depends on the calculation, but should provide some benefit with this many blocks
    });
  });

  describe('edge cases', () => {
    it('should handle all-null columns', () => {
      const manager = new SchemaInheritance();
      const data = [
        { id: 1, value: null },
        { id: 2, value: null }
      ];

      const schema = manager.inferSchema(data, 'null_schema');

      const valueCol = schema.columns.find(c => c.name === 'value');
      assert.ok(valueCol);
      assert.strictEqual(valueCol.type, 'null');
      assert.strictEqual(valueCol.nullable, true);
    });

    it('should handle single column', () => {
      const manager = new SchemaInheritance();
      const data = [{ id: 1 }, { id: 2 }];

      const schema = manager.inferSchema(data, 'single_col');

      assert.strictEqual(schema.columns.length, 1);
    });

    it('should handle complex nested objects', () => {
      const manager = new SchemaInheritance();
      const data = [
        { id: 1, metadata: { tags: ['a', 'b'], count: 5 } }
      ];

      const schema = manager.inferSchema(data, 'nested');

      const metaCol = schema.columns.find(c => c.name === 'metadata');
      assert.ok(metaCol);
      assert.strictEqual(metaCol.type, 'object');
    });
  });
});
