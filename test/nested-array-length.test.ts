/**
 * Test for nested array length preservation in TONL encoding
 */

import { test, describe } from "node:test";
import assert from "node:assert";
import { encodeTONL, decodeTONL } from "../dist/index.js";

describe("Nested Array Length Preservation", () => {
  test("should preserve length for nested primitive arrays", () => {
    const input = {
      a: [1, 2, 3, 4, 5, [1, 2, 3]]
    };

    const encoded = encodeTONL(input);
    
    // Check that nested array includes length notation
    assert(encoded.includes("[5][3]: 1,2,3"), "Nested array should include length [3]");
    
    // Verify round-trip
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, input);
  });

  test("should handle multiple nested arrays with different lengths", () => {
    const input = {
      data: [
        1,
        2,
        [3, 4, 5],
        [6, 7],
        8,
        [9, 10, 11, 12]
      ]
    };

    const encoded = encodeTONL(input);
    
    // Check that each nested array includes its correct length
    assert(encoded.includes("[2][3]: 3,4,5"), "Should include [3] for 3-element array");
    assert(encoded.includes("[3][2]: 6,7"), "Should include [2] for 2-element array");
    assert(encoded.includes("[5][4]: 9,10,11,12"), "Should include [4] for 4-element array");
    
    // Verify round-trip
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, input);
  });

  test("should handle arrays that start with nested arrays", () => {
    const input = {
      nested: [
        [1, 2],
        [3, 4, 5],
        6,
        [7, 8, 9, 10]
      ]
    };

    const encoded = encodeTONL(input);
    
    // Check nested array lengths
    assert(encoded.includes("[0][2]: 1,2"), "First nested array should include [2]");
    assert(encoded.includes("[1][3]: 3,4,5"), "Second nested array should include [3]");
    assert(encoded.includes("[3][4]: 7,8,9,10"), "Fourth nested array should include [4]");
    
    // Verify round-trip
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, input);
  });

  test("should handle empty nested arrays", () => {
    const input = {
      arrays: [1, [], 3, [4, 5], []]
    };

    const encoded = encodeTONL(input);
    
    // Check that empty arrays show [0]
    assert(encoded.includes("[1][0]:"), "Empty nested array should show [0]");
    assert(encoded.includes("[3][2]: 4,5"), "Non-empty nested array should show correct length");
    
    // Verify round-trip
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, input);
  });

  test("should handle nested arrays with various primitive types", () => {
    const input = {
      mixed: [
        [true, false, true],
        [1, 2.5, -3],
        ["a", "b", "c"],
        [null, 1, "test", true]
      ]
    };

    const encoded = encodeTONL(input);
    
    // Check lengths are preserved for all types
    assert(encoded.includes("[0][3]: true,false,true"), "Boolean array should include length");
    assert(encoded.includes("[1][3]: 1,2.5,-3"), "Number array should include length");
    assert(encoded.includes("[2][3]: a,b,c"), "String array should include length");
    assert(encoded.includes("[3][4]: null,1,test,true"), "Mixed type array should include length");
    
    // Verify round-trip
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, input);
  });

  test("should not add length for nested arrays containing objects", () => {
    const input = {
      complex: [
        1,
        [{id: 1}, {id: 2}],
        3
      ]
    };

    const encoded = encodeTONL(input);
    
    // Nested array with objects should use block notation, not inline with length
    assert(!encoded.includes("[1][2]:"), "Nested array with objects should not use inline notation");
    
    // Verify round-trip
    const decoded = decodeTONL(encoded);
    assert.deepStrictEqual(decoded, input);
  });
});
