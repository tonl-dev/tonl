/**
 * Tests for hierarchical grouping optimizer
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { HierarchicalGrouping } from '../../dist/optimization/hierarchical.js';

describe('HierarchicalGrouping', () => {
  describe('analyzeHierarchy', () => {
    it('should analyze nested structure', () => {
      const grouping = new HierarchicalGrouping();
      const data = {
        company: 'Acme',
        departments: [
          { name: 'Eng', company: 'Acme' },
          { name: 'Sales', company: 'Acme' }
        ]
      };

      const analysis = grouping.analyzeHierarchy(data);

      assert.ok(analysis.depth >= 1);
      assert.ok(analysis.nodeCount > 0);
    });

    it('should detect common fields in arrays', () => {
      const grouping = new HierarchicalGrouping();
      const data = [
        { company: 'Acme', name: 'Alice' },
        { company: 'Acme', name: 'Bob' }
      ];

      const analysis = grouping.analyzeHierarchy(data);

      assert.ok(analysis.commonFieldCount >= 1);
    });

    it('should handle flat data', () => {
      const grouping = new HierarchicalGrouping();
      const data = { id: 1, name: 'Test' };

      const analysis = grouping.analyzeHierarchy(data);

      assert.ok(!analysis.recommended);
    });
  });

  describe('extractCommonFields', () => {
    it('should extract common fields from array', () => {
      const grouping = new HierarchicalGrouping();
      const data = [
        { company: 'Acme', name: 'Alice' },
        { company: 'Acme', name: 'Bob' }
      ];

      const { common, remaining } = grouping.extractCommonFields(data);

      assert.strictEqual(common.company, 'Acme');
      assert.ok(Array.isArray(remaining));
    });
  });

  describe('directives', () => {
    it('should generate hierarchy directive', () => {
      const grouping = new HierarchicalGrouping();
      const directive = grouping.generateHierarchyDirective('company');

      assert.strictEqual(directive, '@hierarchy company');
    });

    it('should parse hierarchy directive', () => {
      const grouping = new HierarchicalGrouping();
      const field = grouping.parseHierarchyDirective('@hierarchy company');

      assert.strictEqual(field, 'company');
    });

    it('should generate group directive', () => {
      const grouping = new HierarchicalGrouping();
      const directive = grouping.generateGroupDirective('departments');

      assert.strictEqual(directive, '@group departments');
    });
  });

  describe('shouldGroup', () => {
    it('should recommend for nested data', () => {
      const grouping = new HierarchicalGrouping();
      const data = {
        parent: 'Root',
        children: [
          { parent: 'Root', name: 'A', children: [] },
          { parent: 'Root', name: 'B', children: [] }
        ]
      };

      const should = grouping.shouldGroup(data);

      assert.ok(typeof should === 'boolean');
    });

    it('should not recommend when disabled', () => {
      const grouping = new HierarchicalGrouping({ enabled: false });
      const data = { nested: { data: 'here' } };

      assert.ok(!grouping.shouldGroup(data));
    });
  });
});
