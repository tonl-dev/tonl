/**
 * Regression tests for two bugs found during the v2.5.x audit:
 *
 * BUG-A (CRITICAL): Empty strings in tabular (uniform-object-array) data
 *   were silently dropped because MISSING_FIELD_MARKER === "" collided
 *   with the wire representation of an explicit empty string `""`. The
 *   parser's `if (value === MISSING_FIELD_MARKER) continue;` check
 *   matched both "missing" (unquoted empty between delimiters) and the
 *   user value `""` (quoted empty string), causing data loss.
 *
 * BUG-B (HIGH): Large integers exceeding Number.MAX_SAFE_INTEGER were
 *   encoded as plain numbers on the wire but the parser returned them
 *   as strings for precision safety. The encoder/decoder were
 *   asymmetric: roundtripping `9007199254740992` produced `"9007199254740992"`.
 *
 * Fixes:
 *   - Bug A: Added `parseTONLLineWithQuoteInfo` to parser.ts and updated
 *     the tabular block parser to consult the parallel quoted-state array.
 *   - Bug B: Added `encodeNumberToken` helper in encode.ts that emits
 *     integer literals exceeding MAX_SAFE_INTEGER as quoted JSON strings,
 *     matching the parser's precision-preservation behavior. Numbers whose
 *     wire form is scientific notation (parseable by parseFloat) are left
 *     unquoted.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { encodeTONL, decodeTONL, parseTONLLineWithQuoteInfo } from '../dist/index.js';

// ============================================================
// BUG-A regression tests
// ============================================================

test('BUG-A: explicit empty string in tabular is preserved (not dropped as missing)', () => {
  const original = { items: [{ name: 'a', desc: '' }, { name: 'b', desc: 'test' }] };
  const encoded = encodeTONL(original);
  const decoded = decodeTONL(encoded);

  assert.strictEqual(decoded.items[0].desc, '', 'Empty string desc must be preserved');
  assert.strictEqual(decoded.items[0].name, 'a');
  assert.strictEqual(decoded.items[1].desc, 'test');
  assert.strictEqual(decoded.items[1].name, 'b');
});

test('BUG-A: empty string in first column of tabular is preserved', () => {
  const original = { items: [{ a: '', b: 'x' }, { a: 'y', b: 'z' }] };
  const encoded = encodeTONL(original);
  const decoded = decodeTONL(encoded);

  assert.strictEqual(decoded.items[0].a, '', 'Empty string in column 0 must be preserved');
  assert.strictEqual(decoded.items[0].b, 'x');
  assert.strictEqual(decoded.items[1].a, 'y');
  assert.strictEqual(decoded.items[1].b, 'z');
});

test('BUG-A: empty string in mid column of tabular is preserved', () => {
  const original = { items: [{ a: 'x', b: '', c: 'z' }] };
  const encoded = encodeTONL(original);
  const decoded = decodeTONL(encoded);

  assert.strictEqual(decoded.items[0].a, 'x');
  assert.strictEqual(decoded.items[0].b, '', 'Empty string in middle column must be preserved');
  assert.strictEqual(decoded.items[0].c, 'z');
});

test('BUG-A: distinguishes empty string, missing field, and null in tabular', () => {
  const original = {
    items: [
      { a: '', b: null, c: 'z' }, // empty string in a
      { a: 'x', c: 'z' },          // a is present, b is missing (not in object)
      { b: 'q', c: 'w' },          // b is 'q', a is missing
    ]
  };
  const encoded = encodeTONL(original);
  const decoded = decodeTONL(encoded);

  assert.strictEqual(decoded.items[0].a, '', 'Empty string preserved');
  assert.strictEqual(decoded.items[0].b, null, 'Explicit null preserved');
  assert.strictEqual('c' in decoded.items[0], true);

  assert.strictEqual(decoded.items[1].a, 'x');
  assert.strictEqual('b' in decoded.items[1], false, 'Missing field b not added');

  assert.strictEqual(decoded.items[2].b, 'q');
  assert.strictEqual('a' in decoded.items[2], false, 'Missing field a not added');
});

test('BUG-A: empty string roundtrips via parseTONLLineWithQuoteInfo correctly', () => {
  // Direct check of the new helper exposed via the public API.
  // Quoted empty string between values: ["hello", "", "world"]
  const r1 = parseTONLLineWithQuoteInfo('"hello","",world');
  assert.deepStrictEqual(r1.values, ['hello', '', 'world']);
  assert.deepStrictEqual(r1.quoted, [true, true, false]);

  // Unquoted empty between delimiters (missing field): ["", "x"]
  const r2 = parseTONLLineWithQuoteInfo(',x');
  assert.deepStrictEqual(r2.values, ['', 'x']);
  assert.deepStrictEqual(r2.quoted, [false, false]);

  // Mixed: quoted empty in middle, unquoted at start
  const r3 = parseTONLLineWithQuoteInfo(',"",x');
  assert.deepStrictEqual(r3.values, ['', '', 'x']);
  assert.deepStrictEqual(r3.quoted, [false, true, false]);
});

// ============================================================
// BUG-B regression tests
// ============================================================

test('BUG-B: integer at MAX_SAFE_INTEGER roundtrips as number', () => {
  const original = { val: Number.MAX_SAFE_INTEGER };
  const decoded = decodeTONL(encodeTONL(original));
  assert.strictEqual(decoded.val, Number.MAX_SAFE_INTEGER);
  assert.strictEqual(typeof decoded.val, 'number');
});

test('BUG-B: integer exceeding MAX_SAFE_INTEGER roundtrips as quoted string', () => {
  const original = { val: Number.MAX_SAFE_INTEGER + 1 };
  const encoded = encodeTONL(original);
  // Wire form must be a quoted JSON string so the parser preserves precision.
  assert.ok(encoded.includes('"9007199254740992"'),
    'Large integer must be encoded as a quoted string for precision');
  const decoded = decodeTONL(encoded);
  assert.strictEqual(decoded.val, String(Number.MAX_SAFE_INTEGER + 1));
  assert.strictEqual(typeof decoded.val, 'string');
});

test('BUG-B: large negative integer roundtrips as quoted string', () => {
  const original = { val: -(Number.MAX_SAFE_INTEGER + 1) };
  const encoded = encodeTONL(original);
  assert.ok(encoded.includes('"-9007199254740992"'),
    'Large negative integer must be encoded as a quoted string');
  const decoded = decodeTONL(encoded);
  assert.strictEqual(decoded.val, String(-(Number.MAX_SAFE_INTEGER + 1)));
  assert.strictEqual(typeof decoded.val, 'string');
});

test('BUG-B: MAX_VALUE (scientific notation) roundtrips as number', () => {
  // MAX_VALUE is technically an integer in JS (no fractional part) but its
  // String() form is scientific notation. The parser handles scientific
  // notation natively via parseFloat, so we MUST NOT quote it as a string.
  const original = { val: Number.MAX_VALUE };
  const encoded = encodeTONL(original);
  // The wire form should NOT be a quoted string.
  assert.ok(!encoded.includes(`"${Number.MAX_VALUE}"`),
    'MAX_VALUE must NOT be quoted (parser would return string)');
  const decoded = decodeTONL(encoded);
  assert.strictEqual(decoded.val, Number.MAX_VALUE);
  assert.strictEqual(typeof decoded.val, 'number');
});

test('BUG-B: Infinity and NaN roundtrip as actual numeric values in object form', () => {
  // Non-finite numbers must still be handled by the encoder. The
  // `encodeObject` path emits the literal token `Infinity`/`-Infinity`/`NaN`
  // on the wire; the parser recognises those tokens and returns the
  // actual non-finite JS values. This is the path exercised by the
  // `edge-cases.test.ts` regression test, and the roundtrip MUST remain
  // symmetric after the BUG-B fix.
  const original = { inf: Infinity, nan: NaN, negInf: -Infinity };
  const decoded = decodeTONL(encodeTONL(original));
  assert.strictEqual(decoded.inf, Infinity, 'Infinity must roundtrip as Infinity');
  assert.ok(Number.isNaN(decoded.nan), 'NaN must roundtrip as NaN');
  assert.strictEqual(decoded.negInf, -Infinity, '-Infinity must roundtrip as -Infinity');
});

test('BUG-B: large integer in tabular array is correctly encoded as quoted string', () => {
  const original = {
    items: [
      { id: 1, big: Number.MAX_SAFE_INTEGER + 1 },
      { id: 2, big: Number.MAX_SAFE_INTEGER + 2 },
    ]
  };
  const encoded = encodeTONL(original);
  const decoded = decodeTONL(encoded);
  assert.strictEqual(decoded.items[0].id, 1);
  assert.strictEqual(decoded.items[0].big, String(Number.MAX_SAFE_INTEGER + 1));
  assert.strictEqual(decoded.items[1].big, String(Number.MAX_SAFE_INTEGER + 2));
});

test('BUG-B: SAFE integer in tabular array is NOT quoted (preserved as number)', () => {
  const original = {
    items: [
      { id: Number.MAX_SAFE_INTEGER, val: 'safe' },
    ]
  };
  const encoded = encodeTONL(original);
  // Must NOT be quoted.
  assert.ok(!encoded.includes(`"${Number.MAX_SAFE_INTEGER}"`),
    'Safe integer must not be quoted in tabular form');
  const decoded = decodeTONL(encoded);
  assert.strictEqual(decoded.items[0].id, Number.MAX_SAFE_INTEGER);
  assert.strictEqual(typeof decoded.items[0].id, 'number');
});