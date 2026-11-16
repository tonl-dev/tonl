/**
 * Regression tests for issue #34: plain JSON that did not survive
 * decodeTONL(encodeTONL(value)).
 *
 * 1. Quoted values in inline arrays were trimmed, unquoted again and coerced
 *    (["1.0"] came back as [1]).
 * 2. A string containing "[" was written unquoted, and brackets inside quoted
 *    strings were counted, so the element swallowed the ones after it.
 * 3. An array of empty objects was written as a table with no columns, which
 *    decoded to [].
 * 4. Keys of object and array values were written unquoted, so a key with
 *    TONL syntax in it (brackets, commas, quotes, "#") or any key that is not
 *    an identifier was re-parsed as syntax.
 * 5. An object inside a nested array decoded as [].
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { encodeTONL, decodeTONL } from '../dist/index.js';

const delimiters = [',', '|', ';', '\t'] as const;

function assertRoundTrip(value: unknown): void {
  for (const delimiter of delimiters) {
    const encoded = encodeTONL(value as any, { delimiter });
    assert.deepStrictEqual(
      decodeTONL(encoded, { delimiter }),
      value,
      `round trip with delimiter ${JSON.stringify(delimiter)}:\n${encoded}`
    );
  }
}

test('#34-1: quoted values in inline arrays stay strings', () => {
  assertRoundTrip(['1.0', 'true', 'null', '42']);
  assertRoundTrip({ a: ['1.0', 'x'] });
  assertRoundTrip(['-7', '1e5', 'false', 'Infinity']);
});

test('#34-1: padding and quote characters inside quoted array values are kept', () => {
  assertRoundTrip([' x', 'y ']);
  assertRoundTrip(['"']);
  assertRoundTrip(['a"b', '\\', '"x"']);
  assertRoundTrip({ rows: [[' a', 'b '], ['"', '1.0']] });
});

test('#34-2: array elements with brackets do not swallow the next element', () => {
  assertRoundTrip(['[b', 'c']);
  assertRoundTrip(['a]', '[', 'x[1]y', 'z']);
  assertRoundTrip({ a: ['[b', 'c'], b: 'k[0]' });
});

test('#34-3: arrays of empty objects keep their objects', () => {
  assertRoundTrip([{}]);
  assertRoundTrip({ a: [{}] });
  assertRoundTrip([{}, {}, {}]);
});

test('#34-4: keys with TONL syntax are quoted', () => {
  assertRoundTrip({ 'k[0]': 1 });
  assertRoundTrip({ 'a[b]': 1 });
  assertRoundTrip({ 'a,b': { c: 1 } });
  assertRoundTrip({ '"a': { b: 1 } });
  assertRoundTrip({ '#': [] });
  assertRoundTrip({ 'a]': [1, 2], 'b[': { c: [3] }, 'x:y': { z: 'w' } });
});

test('#34-4: object and array values under keys that are not identifiers', () => {
  assertRoundTrip({ '1': {} });
  assertRoundTrip({ 'x-': [] });
  assertRoundTrip({ 'k|': [{}, { a: false }, [1, true]] });
  assertRoundTrip({ 'user-id': { 'first name': 'Ann' }, '2024': [1, 2] });
});

test('#34-5: objects inside nested arrays are kept', () => {
  assertRoundTrip([[1, { a: 1 }]]);
  assertRoundTrip([[{ a: 1, b: 2 }, 3]]);
  assertRoundTrip({ a: [[1, { b: [2, { c: 3 }] }]] });
});

test('#34: a quoted value containing "[1]:" is not read as an array', () => {
  const decoded = decodeTONL('#version 1.0\nroot:\n  a: "x[1]: y"\n  b: 1\n');
  assert.deepStrictEqual(decoded, { a: 'x[1]: y', b: 1 });
});
