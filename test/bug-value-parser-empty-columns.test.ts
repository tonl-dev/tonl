/**
 * Test for BUG-NEW-005: Division by zero in value parser
 *
 * Validates that parseSingleLineObject handles empty columns array gracefully
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { parseSingleLineObject } from '../dist/parser/value-parser.js';
import type { TONLObjectHeader, TONLParseContext } from '../dist/types.js';

describe('BUG-NEW-005: Division by zero in value parser', () => {
  it('should throw error for empty columns array in array format', () => {
    const header: TONLObjectHeader = {
      key: 'test',
      isArray: true,
      columns: [], // Empty columns - would cause division by zero
      arrayLength: undefined
    };

    const context: TONLParseContext = {
      delimiter: ',',
      strict: false
    };

    assert.throws(
      () => parseSingleLineObject(header, 'val1, val2, val3', context),
      /Array header must define at least one column when using tabular format/,
      'Should throw error for empty columns array'
    );
  });

  it('should work correctly with valid columns array', () => {
    const header: TONLObjectHeader = {
      key: 'test',
      isArray: true,
      columns: [
        { name: 'col1' },
        { name: 'col2' }
      ],
      arrayLength: undefined
    };

    const context: TONLParseContext = {
      delimiter: ',',
      strict: false
    };

    const result = parseSingleLineObject(header, 'val1, val2, val3, val4', context);

    assert.ok(Array.isArray(result), 'Result should be an array');
    assert.strictEqual(result.length, 2, 'Should parse 2 items (4 fields / 2 columns)');
    assert.deepStrictEqual(result[0], { col1: 'val1', col2: 'val2' }, 'First item should be correct');
    assert.deepStrictEqual(result[1], { col1: 'val3', col2: 'val4' }, 'Second item should be correct');
  });

  it('should use arrayLength if provided, avoiding division', () => {
    const header: TONLObjectHeader = {
      key: 'test',
      isArray: true,
      columns: [
        { name: 'col1' },
        { name: 'col2' }
      ],
      arrayLength: 3 // Explicitly specified length
    };

    const context: TONLParseContext = {
      delimiter: ',',
      strict: false
    };

    const result = parseSingleLineObject(header, 'a, b, c, d, e, f', context);

    assert.ok(Array.isArray(result), 'Result should be an array');
    assert.strictEqual(result.length, 3, 'Should have 3 items as specified by arrayLength');
  });

  it('should handle object format (not array) with empty columns gracefully', () => {
    const header: TONLObjectHeader = {
      key: 'test',
      isArray: false,
      columns: [] // Empty columns for object format
    };

    const context: TONLParseContext = {
      delimiter: ',',
      strict: false
    };

    // Object format doesn't use columns.length for division, so this should work
    const result = parseSingleLineObject(header, 'val1, val2', context);

    assert.ok(typeof result === 'object' && !Array.isArray(result), 'Result should be an object');
  });
});
