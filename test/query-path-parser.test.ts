/**
 * Comprehensive test suite for Query Path Parser (T001)
 *
 * Tests cover all supported path syntax:
 * - Simple property access
 * - Array indexing (positive and negative)
 * - Wildcards
 * - Recursive descent
 * - Array slicing
 * - Filter expressions
 * - Complex nested paths
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parsePath, tokenize, validate, analyzeAST, astToString } from '../dist/src/query/index.js';

describe('Query Path Parser - T001', () => {
  // ========================================
  // Simple Property Access (Tests 1-10)
  // ========================================

  describe('Simple Property Access', () => {
    test('should parse single property', () => {
      const result = parsePath('name');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 1);
      assert.strictEqual(result.ast[0].type, 'property');
      assert.strictEqual(result.ast[0].name, 'name');
    });

    test('should parse dotted property path', () => {
      const result = parsePath('user.name');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 2);
      assert.strictEqual(result.ast[0].name, 'user');
      assert.strictEqual(result.ast[1].name, 'name');
    });

    test('should parse deep nested properties', () => {
      const result = parsePath('user.profile.contact.email');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 4);
      assert.strictEqual(result.ast[3].name, 'email');
    });

    test('should parse property with underscore', () => {
      const result = parsePath('user_name');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[0].name, 'user_name');
    });

    test('should parse property with dollar sign', () => {
      const result = parsePath('$price');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[0].name, '$price');
    });

    test('should parse property with numbers', () => {
      const result = parsePath('user123');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[0].name, 'user123');
    });

    test('should parse path starting with root ($)', () => {
      const result = parsePath('$.user.name');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[0].type, 'root');
      assert.strictEqual(result.ast[1].name, 'user');
    });

    test('should parse single root ($)', () => {
      const result = parsePath('$');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 1);
      assert.strictEqual(result.ast[0].type, 'root');
    });

    test('should handle whitespace in path', () => {
      const result = parsePath('  user  .  name  ');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 2);
    });

    test('should parse mixed case properties', () => {
      const result = parsePath('firstName.lastName');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[0].name, 'firstName');
      assert.strictEqual(result.ast[1].name, 'lastName');
    });
  });

  // ========================================
  // Array Indexing (Tests 11-20)
  // ========================================

  describe('Array Indexing', () => {
    test('should parse simple array index', () => {
      const result = parsePath('users[0]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[0].name, 'users');
      assert.strictEqual(result.ast[1].type, 'index');
      assert.strictEqual(result.ast[1].index, 0);
    });

    test('should parse negative array index', () => {
      const result = parsePath('users[-1]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].index, -1);
    });

    test('should parse array index with property access', () => {
      const result = parsePath('users[0].name');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 3);
      assert.strictEqual(result.ast[2].name, 'name');
    });

    test('should parse nested array indices', () => {
      const result = parsePath('matrix[0][1]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].index, 0);
      assert.strictEqual(result.ast[2].index, 1);
    });

    test('should parse large array index', () => {
      const result = parsePath('items[999]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].index, 999);
    });

    test('should parse array index at root', () => {
      const result = parsePath('$[0]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[0].type, 'root');
      assert.strictEqual(result.ast[1].type, 'index');
    });

    test('should parse complex path with multiple indices', () => {
      const result = parsePath('data[0].items[5].value');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 5);
    });

    test('should parse array index with zero', () => {
      const result = parsePath('arr[0]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].index, 0);
    });

    test('should parse deeply nested array access', () => {
      const result = parsePath('a[0].b[1].c[2]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 6);
    });

    test('should parse path ending with array index', () => {
      const result = parsePath('user.addresses[0]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[2].type, 'index');
    });
  });

  // ========================================
  // Wildcards (Tests 21-26)
  // ========================================

  describe('Wildcards', () => {
    test('should parse wildcard in bracket notation', () => {
      const result = parsePath('users[*]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'wildcard');
    });

    test('should parse wildcard with property access', () => {
      const result = parsePath('users[*].name');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'wildcard');
      assert.strictEqual(result.ast[2].name, 'name');
    });

    test('should parse multiple wildcards', () => {
      const result = parsePath('users[*].roles[*]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'wildcard');
      assert.strictEqual(result.ast[3].type, 'wildcard');
    });

    test('should parse wildcard after dot', () => {
      const result = parsePath('data.*');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'wildcard');
    });

    test('should parse wildcard at root', () => {
      const result = parsePath('$[*]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'wildcard');
    });

    test('should parse complex wildcard path', () => {
      const result = parsePath('users[*].posts[*].comments[*].text');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 7);
    });
  });

  // ========================================
  // Recursive Descent (Tests 27-32)
  // ========================================

  describe('Recursive Descent', () => {
    test('should parse recursive descent with property', () => {
      const result = parsePath('$..email');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'recursive');
      assert.strictEqual(result.ast[1].name, 'email');
    });

    test('should parse recursive descent without property', () => {
      const result = parsePath('$..');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'recursive');
      assert.strictEqual(result.ast[1].name, undefined);
    });

    test('should parse multiple recursive descents', () => {
      const result = parsePath('$..user..name');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'recursive');
      assert.strictEqual(result.ast[2].type, 'recursive');
    });

    test('should parse recursive descent with array access', () => {
      const result = parsePath('$..items[0]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'recursive');
      assert.strictEqual(result.ast[2].type, 'index');
    });

    test('should parse recursive descent with wildcard', () => {
      const result = parsePath('$..[*]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'recursive');
      assert.strictEqual(result.ast[2].type, 'wildcard');
    });

    test('should parse deep recursive path', () => {
      const result = parsePath('root..nested..value');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 3);
    });
  });

  // ========================================
  // Array Slicing (Tests 33-42)
  // ========================================

  describe('Array Slicing', () => {
    test('should parse basic slice with start and end', () => {
      const result = parsePath('users[0:5]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'slice');
      assert.strictEqual(result.ast[1].start, 0);
      assert.strictEqual(result.ast[1].end, 5);
      assert.strictEqual(result.ast[1].step, undefined);
    });

    test('should parse slice with only end', () => {
      const result = parsePath('users[:3]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].start, undefined);
      assert.strictEqual(result.ast[1].end, 3);
    });

    test('should parse slice with only start', () => {
      const result = parsePath('users[2:]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].start, 2);
      assert.strictEqual(result.ast[1].end, undefined);
    });

    test('should parse slice with step', () => {
      const result = parsePath('users[0:10:2]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].start, 0);
      assert.strictEqual(result.ast[1].end, 10);
      assert.strictEqual(result.ast[1].step, 2);
    });

    test('should parse slice with only step', () => {
      const result = parsePath('users[::2]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].start, undefined);
      assert.strictEqual(result.ast[1].end, undefined);
      assert.strictEqual(result.ast[1].step, 2);
    });

    test('should parse negative slice indices', () => {
      const result = parsePath('users[-5:-1]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].start, -5);
      assert.strictEqual(result.ast[1].end, -1);
    });

    test('should parse slice with property access', () => {
      const result = parsePath('users[0:5].name');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[2].name, 'name');
    });

    test('should parse full slice [::]', () => {
      const result = parsePath('arr[::]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'slice');
    });

    test('should parse large slice range', () => {
      const result = parsePath('data[100:200:5]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].step, 5);
    });

    test('should parse slice in nested path', () => {
      const result = parsePath('data.items[1:10].values[0:3]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[2].type, 'slice');
      assert.strictEqual(result.ast[4].type, 'slice');
    });
  });

  // ========================================
  // Filter Expressions (Tests 43-60)
  // ========================================

  describe('Filter Expressions', () => {
    test('should parse simple equality filter', () => {
      const result = parsePath('users[?(@.role == "admin")]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'filter');
      assert.strictEqual(result.ast[1].expression.type, 'binary');
      assert.strictEqual(result.ast[1].expression.operator, '==');
    });

    test('should parse numeric comparison filter', () => {
      const result = parsePath('users[?(@.age > 18)]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.operator, '>');
    });

    test('should parse filter with AND operator', () => {
      const result = parsePath('users[?(@.age > 18 && @.active == true)]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.operator, '&&');
    });

    test('should parse filter with OR operator', () => {
      const result = parsePath('users[?(@.role == "admin" || @.role == "moderator")]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.operator, '||');
    });

    test('should parse filter with NOT operator', () => {
      const result = parsePath('users[?(!@.deleted)]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.type, 'unary');
      assert.strictEqual(result.ast[1].expression.operator, '!');
    });

    test('should parse filter with nested property', () => {
      const result = parsePath('users[?(@.profile.age > 25)]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.left.path, 'profile.age');
    });

    test('should parse filter with boolean literal', () => {
      const result = parsePath('items[?(@.active == true)]');
      assert.strictEqual(result.success, true);
      const rightExpr = result.ast[1].expression.right;
      assert.strictEqual(rightExpr.type, 'literal');
      assert.strictEqual(rightExpr.value, true);
    });

    test('should parse filter with null literal', () => {
      const result = parsePath('items[?(@.deletedAt == null)]');
      assert.strictEqual(result.success, true);
      const rightExpr = result.ast[1].expression.right;
      assert.strictEqual(rightExpr.value, null);
    });

    test('should parse filter with string literal', () => {
      const result = parsePath('items[?(@.status == "active")]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.right.value, 'active');
    });

    test('should parse filter with >= operator', () => {
      const result = parsePath('products[?(@.price >= 100)]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.operator, '>=');
    });

    test('should parse filter with <= operator', () => {
      const result = parsePath('products[?(@.stock <= 10)]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.operator, '<=');
    });

    test('should parse filter with != operator', () => {
      const result = parsePath('users[?(@.status != "banned")]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.operator, '!=');
    });

    test('should parse complex nested filter', () => {
      const result = parsePath('users[?(@.age > 18 && (@.role == "admin" || @.verified == true))]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.type, 'binary');
    });

    test('should parse filter with property access after', () => {
      const result = parsePath('users[?(@.active == true)].name');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[2].name, 'name');
    });

    test('should parse multiple filters in path', () => {
      const result = parsePath('users[?(@.active == true)].posts[?(@.published == true)]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].type, 'filter');
      assert.strictEqual(result.ast[3].type, 'filter');
    });

    test('should parse filter with negative number', () => {
      const result = parsePath('items[?(@.balance < -100)]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.right.value, -100);
    });

    test('should parse filter with decimal number', () => {
      const result = parsePath('items[?(@.rating > 4.5)]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.right.value, 4.5);
    });

    test('should parse filter with false literal', () => {
      const result = parsePath('items[?(@.hidden == false)]');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[1].expression.right.value, false);
    });
  });

  // ========================================
  // Complex Paths (Tests 61-70)
  // ========================================

  describe('Complex Paths', () => {
    test('should parse very long nested path', () => {
      const result = parsePath('a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 16);
    });

    test('should parse mixed syntax path', () => {
      const result = parsePath('$.users[*].posts[0:5].comments[?(@.approved == true)].text');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 8); // root + users + wildcard + posts + slice + comments + filter + text
    });

    test('should parse path with all features', () => {
      const result = parsePath('$..users[*].profile.addresses[0].city');
      assert.strictEqual(result.success, true);
      assert.ok(result.ast.some(n => n.type === 'recursive'));
      assert.ok(result.ast.some(n => n.type === 'wildcard'));
      assert.ok(result.ast.some(n => n.type === 'index'));
    });

    test('should parse e-commerce style path', () => {
      const result = parsePath('categories[*].products[?(@.price < 100 && @.inStock == true)]');
      assert.strictEqual(result.success, true);
    });

    test('should parse social media style path', () => {
      const result = parsePath('users[*].posts[?(@.likes > 1000)].comments[:10]');
      assert.strictEqual(result.success, true);
    });

    test('should parse analytics style path', () => {
      const result = parsePath('$.events[?(@.type == "click")]..userId');
      assert.strictEqual(result.success, true);
    });

    test('should parse deeply nested object access', () => {
      const result = parsePath('root.level1.level2.level3.level4.level5.value');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast.length, 7);
    });

    test('should parse mixed array and object access', () => {
      const result = parsePath('data[0].items[1].values[2].name');
      assert.strictEqual(result.success, true);
    });

    test('should parse path with multiple wildcards and filters', () => {
      const result = parsePath('data[*].items[?(@.active == true)].values[*]');
      assert.strictEqual(result.success, true);
    });

    test('should parse empty brackets not allowed', () => {
      const result = parsePath('users[]');
      assert.strictEqual(result.success, false);
    });
  });

  // ========================================
  // Tokenizer Tests (Tests 71-75)
  // ========================================

  describe('Tokenizer', () => {
    test('should tokenize simple path', () => {
      const tokens = tokenize('user.name');
      assert.ok(tokens.length > 0);
      assert.strictEqual(tokens[tokens.length - 1].type, 'EOF');
    });

    test('should tokenize string literals with quotes', () => {
      const tokens = tokenize('"hello world"');
      assert.strictEqual(tokens[0].value, 'hello world');
    });

    test('should tokenize numbers correctly', () => {
      const tokens = tokenize('[123]');
      assert.strictEqual(tokens[1].value, 123);
    });

    test('should tokenize operators', () => {
      const tokens = tokenize('== != > < >= <=');
      assert.ok(tokens.some(t => t.type === 'EQ'));
      assert.ok(tokens.some(t => t.type === 'NEQ'));
    });

    test('should handle escaped strings', () => {
      const tokens = tokenize('"hello\\"world"');
      assert.strictEqual(tokens[0].value, 'hello"world');
    });
  });

  // ========================================
  // Validator Tests (Tests 76-80)
  // ========================================

  describe('Validator', () => {
    test('should validate correct AST', () => {
      const result = parsePath('users[0].name');
      const validation = validate(result.ast);
      assert.strictEqual(validation.valid, true);
      assert.strictEqual(validation.errors.length, 0);
    });

    test('should analyze AST correctly', () => {
      const result = parsePath('users[*].name');
      const analysis = analyzeAST(result.ast);
      assert.strictEqual(analysis.hasWildcard, true);
      assert.strictEqual(analysis.isDeterministic, false);
      assert.ok(analysis.complexity > 1);
    });

    test('should convert AST back to string', () => {
      const result = parsePath('users[0].name');
      const str = astToString(result.ast);
      assert.strictEqual(str, 'users[0].name');
    });

    test('should detect recursive descent in analysis', () => {
      const result = parsePath('$..email');
      const analysis = analyzeAST(result.ast);
      assert.strictEqual(analysis.hasRecursive, true);
    });

    test('should detect filter in analysis', () => {
      const result = parsePath('users[?(@.age > 18)]');
      const analysis = analyzeAST(result.ast);
      assert.strictEqual(analysis.hasFilter, true);
    });
  });

  // ========================================
  // Error Cases (Tests 81-85)
  // ========================================

  describe('Error Handling', () => {
    test('should fail on invalid character', () => {
      const result = parsePath('user#name');
      assert.strictEqual(result.success, false);
    });

    test('should fail on unclosed bracket', () => {
      const result = parsePath('users[0');
      assert.strictEqual(result.success, false);
    });

    test('should fail on invalid filter syntax', () => {
      const result = parsePath('users[?(@.age >)]');
      assert.strictEqual(result.success, false);
    });

    test('should provide error context', () => {
      const result = parsePath('users[');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.message.length > 0);
    });

    test('should parse $$ as valid identifier', () => {
      // $$ is a valid JavaScript identifier (property name)
      const result = parsePath('$$');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ast[0].type, 'property');
      assert.strictEqual(result.ast[0].name, '$$');
    });
  });
});
