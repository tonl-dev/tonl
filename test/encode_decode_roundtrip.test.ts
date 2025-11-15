/**
 * Round-trip tests for encode/decode functionality
 */

import { test, describe } from "node:test";
import assert from "node:assert";
import { encodeTONL, decodeTONL, encodeSmart } from "../dist/index.js";

describe("encode/decode round-trip", () => {
  test("should round-trip simple object", () => {
    const original = {
      id: 1,
      name: "Alice",
      active: true,
      email: "alice@example.com"
    };

    const encoded = encodeTONL(original);
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  test("should round-trip array of objects", () => {
    const original = [
      { id: 1, name: "Alice", role: "admin" },
      { id: 2, name: "Bob, Jr.", role: "user" },
      { id: 3, name: "Carol", role: "editor" }
    ];

    const encoded = encodeTONL(original, { includeTypes: true });
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  test("should round-trip nested structures", () => {
    const original = {
      user: {
        id: 1,
        name: "Alice",
        contact: {
          email: "alice@example.com",
          phone: "+123456789"
        },
        roles: ["admin", "editor"]
      }
    };

    const encoded = encodeTONL(original);
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  test("should round-trip complex nested arrays", () => {
    const original = {
      project: {
        id: 101,
        name: "Alpha",
        owner: { id: 1, name: "Alice" },
        tasks: [{
          id: 201,
          title: "Design API",
          assignee: { id: 2, name: "Bob" },
          status: "done",
          comments: [
            { id: 301, author: "Alice", message: "Looks good!" },
            { id: 302, author: "Eve", message: "Add more tests." }
          ]
        }]
      }
    };

    const encoded = encodeTONL(original);
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  test("should handle special characters in values", () => {
    const original = {
      message: "Hello, world! This contains: special {chars}",
      path: "C:\\Users\\Name\\Documents",
      quote: 'He said: "Hello, world!"',
      multiline: "Line 1\nLine 2\nLine 3"
    };

    const encoded = encodeTONL(original);
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  test("should handle null and undefined values", () => {
    const original = {
      id: 1,
      name: "Test",
      description: null,
      optional: undefined
    };

    const encoded = encodeTONL(original);
    const decoded = decodeTONL(encoded);
    // Note: undefined becomes missing key in JSON
    assert.deepStrictEqual(decoded, {
      id: 1,
      name: "Test",
      description: null
    });
  });

  test("should handle different delimiters", () => {
    const original = [
      { id: 1, name: "Alice, Jr.", role: "admin" },
      { id: 2, name: "Bob", role: "user" }
    ];

    // Test with pipe delimiter to avoid quoting
    const encoded = encodeTONL(original, { delimiter: "|" });
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  test("should handle empty arrays and objects", () => {
    const original = {
      users: [],
      settings: {},
      tags: ["tag1", "tag2"],
      metadata: null
    };

    const encoded = encodeTONL(original);
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  test("should handle numeric values correctly", () => {
    // BUG-007 FIX TEST: Test with actual Number.MAX_SAFE_INTEGER + 1
    const original = {
      intPositive: 42,
      intNegative: -17,
      float: 3.14159,
      zero: 0,
      bigNumber: Number.MAX_SAFE_INTEGER + 1
    };

    const encoded = encodeTONL(original, { includeTypes: true });
    const decoded = decodeTONL(encoded);

    // BUG-007: Large integers should be preserved as strings to prevent precision loss
    // We expect the string version because it preserves the exact value
    const expected = {
      intPositive: 42,
      intNegative: -17,
      float: 3.14159,
      zero: 0,
      bigNumber: String(Number.MAX_SAFE_INTEGER + 1)
    };

    assert.deepStrictEqual(decoded, expected);
  });

  test("should encodeSmart correctly", () => {
    const original = [
      { id: 1, name: "Alice, Jr.", email: "alice@example.com" },
      { id: 2, name: "Bob", email: "bob@example.com" }
    ];

    const encoded = encodeSmart(original);
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, original);

    // Should choose pipe delimiter to reduce quoting
    assert(encoded.includes("#delimiter |"));
  });
});

describe("error handling", () => {
  test("should handle malformed headers gracefully", () => {
    const malformed = `#version 1.0
users[2]{id,name}:
1, Alice
2, Bob, extra_field`;

    // Should not throw but be forgiving
    const decoded = decodeTONL(malformed, { strict: false });
    assert(Array.isArray(decoded.users));
    assert.strictEqual(decoded.users.length, 2);
  });

  test("should enforce strict mode", () => {
    const malformed = `#version 1.0
users[2]{id,name}:
1, Alice
2, Bob, extra_field`;

    assert.throws(() => {
      decodeTONL(malformed, { strict: true });
    });
  });

  test("should handle empty input", () => {
    const decoded = decodeTONL("");
    assert.deepStrictEqual(decoded, {});
  });

  test("should handle headers only", () => {
    const headersOnly = "#version 1.0\n#delimiter |";
    const decoded = decodeTONL(headersOnly);
    assert.deepStrictEqual(decoded, {});
  });
});