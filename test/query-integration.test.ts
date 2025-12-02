/**
 * Integration Tests for Query Extensions
 *
 * Tests aggregation, fuzzy matching, and temporal queries working together
 * through the TONLDocument API.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { TONLDocument } from '../dist/document.js';
import { aggregate } from '../dist/query/aggregators.js';
import {
  levenshteinDistance,
  fuzzyMatch,
  soundsLike,
  fuzzySearch
} from '../dist/query/fuzzy-matcher.js';
import {
  parseTemporalLiteral,
  isBefore,
  isAfter,
  isDaysAgo
} from '../dist/query/temporal-evaluator.js';

describe('Integration: Aggregation + TONLDocument', () => {
  let doc: TONLDocument;

  before(() => {
    doc = TONLDocument.fromJSON({
      products: [
        { id: 1, name: 'Laptop', price: 999.99, category: 'electronics', inStock: true },
        { id: 2, name: 'Phone', price: 599.99, category: 'electronics', inStock: true },
        { id: 3, name: 'Headphones', price: 149.99, category: 'electronics', inStock: false },
        { id: 4, name: 'Book', price: 19.99, category: 'books', inStock: true },
        { id: 5, name: 'Notebook', price: 9.99, category: 'books', inStock: true },
        { id: 6, name: 'Pen', price: 2.99, category: 'office', inStock: true }
      ],
      orders: [
        { id: 101, customerId: 1, total: 1149.98, status: 'completed', date: '2025-01-15' },
        { id: 102, customerId: 2, total: 599.99, status: 'pending', date: '2025-01-20' },
        { id: 103, customerId: 1, total: 29.98, status: 'completed', date: '2025-01-25' },
        { id: 104, customerId: 3, total: 149.99, status: 'shipped', date: '2025-02-01' }
      ],
      customers: [
        { id: 1, name: 'Alice Johnson', email: 'alice@example.com', country: 'US' },
        { id: 2, name: 'Bob Smith', email: 'bob@example.com', country: 'UK' },
        { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', country: 'US' }
      ]
    });
  });

  describe('Complex aggregation chains', () => {
    it('should filter, sort, and aggregate', () => {
      const result = doc.aggregate('products[*]')
        .filter((p: any) => p.inStock)
        .orderBy('price', 'desc')
        .take(3)
        .sum('price');

      assert.ok(result > 0);
    });

    it('should group and then aggregate within groups', () => {
      const groups = doc.groupBy('products[*]', 'category');

      assert.strictEqual(Object.keys(groups).length, 3);
      assert.strictEqual(groups['electronics'].length, 3);
      assert.strictEqual(groups['books'].length, 2);
      assert.strictEqual(groups['office'].length, 1);

      // Aggregate within a group
      const electronicsTotal = aggregate(groups['electronics']).sum('price');
      assert.ok(electronicsTotal > 1500);
    });

    it('should calculate statistics on filtered data', () => {
      const stats = doc.aggregate('products[?(@.inStock)]')
        .stats('price');

      assert.strictEqual(stats.count, 5);
      assert.ok(stats.min < stats.max);
      assert.ok(stats.avg > 0);
      assert.ok(stats.stdDev >= 0);
    });

    it('should find top customers by order total', () => {
      const customerOrderTotals = doc.aggregate('orders[*]')
        .groupBy('customerId');

      const customer1Total = aggregate(customerOrderTotals['1']).sum('total');
      const customer2Total = aggregate(customerOrderTotals['2']).sum('total');

      assert.ok(customer1Total > customer2Total);
    });
  });

  describe('Distinct and frequency analysis', () => {
    it('should get distinct categories', () => {
      const categories = doc.distinct('products[*]', 'category');
      assert.deepStrictEqual(categories.sort(), ['books', 'electronics', 'office']);
    });

    it('should analyze order status frequency', () => {
      const freq = doc.aggregate('orders[*]').frequency('status');
      assert.strictEqual(freq['completed'], 2);
      assert.strictEqual(freq['pending'], 1);
      assert.strictEqual(freq['shipped'], 1);
    });

    it('should find median price', () => {
      const median = doc.aggregate('products[*]').median('price');
      assert.ok(typeof median === 'number');
      assert.ok(median > 0);
    });
  });
});

describe('Integration: Fuzzy Matching Algorithms', () => {
  describe('Real-world name matching', () => {
    it('should match common name variations', () => {
      const names = [
        ['John', 'Jon'],
        ['Michael', 'Micheal'],
        ['Katherine', 'Catherine'],
        ['Steven', 'Stephen'],
        ['Mohammad', 'Muhammad']
      ];

      for (const [a, b] of names) {
        assert.ok(
          fuzzyMatch(a, b, { threshold: 0.7 }),
          `Expected ${a} to fuzzy match ${b}`
        );
      }
    });

    it('should not match very different names', () => {
      assert.ok(!fuzzyMatch('Alice', 'Bob', { threshold: 0.7 }));
      assert.ok(!fuzzyMatch('John', 'Mary', { threshold: 0.7 }));
    });

    it('should handle phonetic matching', () => {
      // Soundex matches names with same code (first letter + 3 consonants)
      assert.ok(soundsLike('Smith', 'Smyth'));     // S530 == S530
      assert.ok(soundsLike('Robert', 'Rupert'));   // R163 == R163
      assert.ok(soundsLike('Meyer', 'Meier'));     // M600 == M600
    });
  });

  describe('Search functionality', () => {
    it('should find best matches in candidate list', () => {
      const candidates = [
        'JavaScript',
        'TypeScript',
        'CoffeeScript',
        'Python',
        'Java',
        'Ruby'
      ];

      const results = fuzzySearch('JavaScrpt', candidates, { limit: 3 });

      assert.ok(results.length > 0);
      assert.strictEqual(results[0].value, 'JavaScript');
    });

    it('should handle typos in search', () => {
      const products = ['Laptop', 'Desktop', 'Tablet', 'Monitor', 'Keyboard'];
      const results = fuzzySearch('Latop', products);

      assert.ok(results.length > 0);
      assert.strictEqual(results[0].value, 'Laptop');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings', () => {
      assert.strictEqual(levenshteinDistance('', ''), 0);
      assert.strictEqual(levenshteinDistance('abc', ''), 3);
      assert.strictEqual(levenshteinDistance('', 'abc'), 3);
    });

    it('should handle single characters', () => {
      assert.strictEqual(levenshteinDistance('a', 'b'), 1);
      assert.strictEqual(levenshteinDistance('a', 'a'), 0);
    });

    it('should handle unicode characters', () => {
      assert.strictEqual(levenshteinDistance('café', 'cafe'), 1);
      assert.strictEqual(levenshteinDistance('naïve', 'naive'), 1);
    });

    it('should handle very similar strings', () => {
      assert.ok(fuzzyMatch('hello world', 'hello worlD', { caseSensitive: false }));
    });
  });
});

describe('Integration: Temporal Queries', () => {
  describe('Date parsing variations', () => {
    it('should parse various ISO formats', () => {
      const formats = [
        '@2025-01-15',
        '@2025-01-15T10:30:00',
        '@2025-01-15T10:30:00Z',
        '@2025-01'
      ];

      for (const format of formats) {
        const result = parseTemporalLiteral(format);
        assert.ok(result.timestamp > 0, `Failed to parse: ${format}`);
      }
    });

    it('should parse named dates', () => {
      const now = Date.now();

      const today = parseTemporalLiteral('@today');
      const yesterday = parseTemporalLiteral('@yesterday');
      const tomorrow = parseTemporalLiteral('@tomorrow');

      assert.ok(yesterday.timestamp < today.timestamp);
      assert.ok(today.timestamp < tomorrow.timestamp);
    });

    it('should parse relative expressions with different units', () => {
      const units = [
        '@now-1d',
        '@now-1w',
        '@now-1M',
        '@now-1y',
        '@now-1h',
        '@now-30m',
        '@now-30s'
      ];

      for (const expr of units) {
        const result = parseTemporalLiteral(expr);
        assert.ok(result.timestamp > 0, `Failed to parse: ${expr}`);
        assert.ok(result.isRelative, `Expected ${expr} to be relative`);
      }
    });
  });

  describe('Temporal comparisons', () => {
    it('should compare dates correctly', () => {
      const earlier = new Date('2025-01-01');
      const later = new Date('2025-12-31');

      assert.ok(isBefore(earlier, later));
      assert.ok(isAfter(later, earlier));
      assert.ok(!isBefore(later, earlier));
      assert.ok(!isAfter(earlier, later));
    });

    it('should check days ago correctly', () => {
      const daysAgo = 7;
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      assert.ok(isDaysAgo(pastDate, daysAgo));
    });
  });

  describe('Edge cases', () => {
    it('should handle year boundaries', () => {
      const dec31 = parseTemporalLiteral('@2025-12-31');
      const jan1 = parseTemporalLiteral('@2025-01-01');

      assert.ok(dec31.timestamp > jan1.timestamp); // Dec 31 is AFTER Jan 1
    });

    it('should handle leap years', () => {
      const feb29 = parseTemporalLiteral('@2025-02-29');
      assert.ok(feb29.timestamp > 0);
    });

    it('should handle timezone-neutral comparisons', () => {
      const date1 = parseTemporalLiteral('@2025-06-15');
      const date2 = parseTemporalLiteral('@2025-06-15');

      assert.strictEqual(date1.timestamp, date2.timestamp);
    });
  });
});

describe('Integration: Combined Features', () => {
  let doc: TONLDocument;

  before(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    doc = TONLDocument.fromJSON({
      users: [
        { name: 'John Smith', createdAt: now.toISOString(), status: 'active' },
        { name: 'Jon Smyth', createdAt: yesterday.toISOString(), status: 'active' },
        { name: 'Jane Doe', createdAt: lastWeek.toISOString(), status: 'inactive' },
        { name: 'Bob Johnson', createdAt: lastMonth.toISOString(), status: 'active' }
      ],
      logs: [
        { level: 'error', message: 'Connection failed', timestamp: now.toISOString() },
        { level: 'warn', message: 'High memory usage', timestamp: yesterday.toISOString() },
        { level: 'info', message: 'User logged in', timestamp: lastWeek.toISOString() }
      ]
    });
  });

  describe('Aggregation with temporal data', () => {
    it('should count active users', () => {
      const count = doc.count('users[?(@.status == "active")]');
      assert.strictEqual(count, 3);
    });

    it('should group logs by level', () => {
      const groups = doc.groupBy('logs[*]', 'level');
      assert.ok('error' in groups);
      assert.ok('warn' in groups);
      assert.ok('info' in groups);
    });
  });

  describe('Fuzzy search in document', () => {
    it('should find users with similar names using fuzzy search', () => {
      const allUsers = doc.query('users[*]') as any[];
      const names = allUsers.map((u: any) => u.name);

      const matches = fuzzySearch('John Smyth', names, { threshold: 0.6 });
      assert.ok(matches.length >= 2);
    });
  });
});

describe('Performance and Stress Tests', () => {
  describe('Large dataset aggregation', () => {
    it('should handle 10000 items efficiently', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: Math.random() * 1000,
        category: ['A', 'B', 'C'][i % 3]
      }));

      const start = Date.now();

      const result = aggregate(largeArray);
      const stats = result.stats('value');
      const groups = result.groupBy('category');

      const elapsed = Date.now() - start;

      assert.ok(elapsed < 1000, `Should complete in under 1 second, took ${elapsed}ms`);
      assert.strictEqual(stats.count, 10000);
      assert.strictEqual(Object.keys(groups).length, 3);
    });
  });

  describe('Fuzzy matching performance', () => {
    it('should handle fuzzy search in large candidate list', () => {
      const candidates = Array.from({ length: 1000 }, (_, i) => `Product${i}`);

      const start = Date.now();
      const results = fuzzySearch('Produc500', candidates, { limit: 10 });
      const elapsed = Date.now() - start;

      assert.ok(elapsed < 500, `Should complete in under 500ms, took ${elapsed}ms`);
      assert.ok(results.length > 0);
    });
  });
});

describe('Error Handling', () => {
  describe('Aggregation errors', () => {
    it('should handle null/undefined gracefully', () => {
      const result = aggregate(null as any);
      assert.strictEqual(result.count(), 0);
      assert.strictEqual(result.sum(), 0);
    });

    it('should handle non-numeric sum', () => {
      const result = aggregate(['a', 'b', 'c']).sum();
      assert.strictEqual(result, 0);
    });
  });

  describe('Fuzzy matching errors', () => {
    it('should reject strings exceeding max length', () => {
      const longString = 'a'.repeat(15000);
      assert.throws(() => levenshteinDistance(longString, 'short'));
    });
  });

  describe('Temporal parsing errors', () => {
    it('should handle invalid temporal literals', () => {
      assert.throws(() => parseTemporalLiteral('@invalid-date-format-xyz'));
    });

    it('should handle very large offsets', () => {
      assert.throws(() => parseTemporalLiteral('@now-999999d'));
    });
  });
});
