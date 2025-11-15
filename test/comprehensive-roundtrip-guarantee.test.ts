/**
 * Comprehensive Round-Trip Guarantee Tests
 *
 * This test suite guarantees 100% reliable TONL ↔ JSON conversion for ALL possible JSON data types
 * including extreme edge cases, Unicode handling, and complex nested structures.
 */

import { test, describe } from "node:test";
import assert from "node:assert";
import { encodeTONL, decodeTONL, encodeSmart } from "../dist/index.js";

describe("Comprehensive Round-Trip Guarantee - ALL JSON Types", () => {

  describe("Primitive Values - Complete Coverage", () => {
    test("should round-trip all string variations", () => {
      const testCases = [
        // Basic strings
        "",
        "hello",
        "Hello, World!",
        "123",
        "true",
        "false",
        "null",

        // Special characters
        "Hello\nWorld",
        "Hello\tWorld",
        "Hello\rWorld",
        "Hello\bWorld",
        "Hello\fWorld",
        "Path\\to\\file",
        "Quote: \"Hello\"",
        "Single: 'quote'",
        "Backslash: \\",
        "Forward slash: /",

        // Unicode strings
        "Café",
        "Naïve",
        "你好",
        "こんにちは",
        "안녕하세요",
        "🎉 Emoji",
        "💯💪🚀",
        "Math: ∑∏∫∆∇∂",
        "Currency: $€£¥₹",
        "Symbols: ©®™§¶†‡•…‰‹›«»\"\"''–—",

        // JSON-like strings that could be ambiguous
        "\"quoted\"",
        "'single quoted'",
        "{object: like}",
        "[array: like]",
        "123.456",
        "trueish",
        "nullish",

        // Whitespace variations
        "   leading",
        "trailing   ",
        "   both   ",
        "\tleading tab",
        "newline\nembedded",
        "multiple\nlines\nhere",

        // Special JSON characters
        "Colon: here",
        "Comma, here",
        "Brackets [] here",
        "Braces {} here",

        // Long strings
        "a".repeat(1000),
        "This is a very long string that contains many words and spaces and punctuation and should test the encoding and decoding of long content properly.",

        // Empty and whitespace-only
        "",
        " ",
        "  ",
        "\t",
        "\n",
        "\r",
        "\r\n",
        " \t\n\r ",
      ];

      for (const str of testCases) {
        const original = { value: str };
        const encoded = encodeTONL(original);
        const decoded = decodeTONL(encoded);
        assert.deepStrictEqual(
          decoded,
          original,
          `Failed for string: ${JSON.stringify(str)}`
        );
      }
    });

    test("should round-trip all numeric variations", () => {
      const testCases = [
        // Integers
        0,
        1,
        -1,
        42,
        -42,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,

        // Floating point
        0.0,
        1.0,
        -1.0,
        3.14159,
        -3.14159,
        0.1,
        0.01,
        0.001,

        // Scientific notation
        1e5,
        1e-5,
        -1e5,
        -1e-5,
        1.23e10,
        1.23e-10,

        // Special numbers
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NaN,

        // Edge cases
        Number.MAX_VALUE,
        Number.MIN_VALUE,
        Number.EPSILON,

        // Very large and small numbers
        999999999999999999,
        0.0000000000000001,
      ];

      for (const num of testCases) {
        const original = { value: num };
        const encoded = encodeTONL(original);
        const decoded = decodeTONL(encoded);

        // Special handling for NaN, Infinity, and precision-protected integers
        if (Number.isNaN(num)) {
          assert(Number.isNaN(decoded.value), `NaN not preserved correctly`);
        } else if (!Number.isFinite(num)) {
          // Infinity and -Infinity should remain as numbers
          assert.strictEqual(decoded.value, num, `Infinity not preserved correctly: ${num}`);
        } else if (Math.abs(num) > Number.MAX_SAFE_INTEGER &&
                   num % 1 === 0 &&
                   !Number.isNaN(num) &&
                   String(num).length <= 20) {
          // BUG-007 FIX: Very large integers (but not floating point numbers like MAX_VALUE) should be preserved as strings
          // Exclude very large floating point numbers that happen to be "integer-like"
          const expectedValue = String(num);
          assert.strictEqual(
            decoded.value,
            expectedValue,
            `Large integer not preserved as string: ${num}`
          );
        } else {
          assert.deepStrictEqual(
            decoded,
            original,
            `Failed for number: ${num}`
          );
        }
      }
    });

    test("should round-trip boolean values", () => {
      const testCases = [
        true,
        false,
      ];

      for (const bool of testCases) {
        const original = { value: bool };
        const encoded = encodeTONL(original);
        const decoded = decodeTONL(encoded);
        assert.deepStrictEqual(decoded, original);
      }
    });

    test("should round-trip null values", () => {
      const original = {
        nullValue: null,
        alsoNull: null,
        nested: {
          nullInside: null
        },
        arrayWithNulls: [null, 1, null, "test", null]
      };

      const encoded = encodeTONL(original);
      const decoded = decodeTONL(encoded);
      assert.deepStrictEqual(decoded, original);
    });
  });

  describe("Complex Arrays - Complete Coverage", () => {
    test("should round-trip all array types", () => {
      const testCases = [
        // Empty arrays
        [],
        [[]],
        [[[]]],

        // Single type arrays
        [1, 2, 3, 4, 5],
        ["a", "b", "c"],
        [true, false, true],
        [null, null],

        // Mixed type arrays
        [1, "two", true, null, [6, 7], { eight: 8 }],

        // Nested arrays
        [[1, 2], [3, 4], [5, 6]],
        [[[1, 2], [3, 4]], [[5, 6], [7, 8]]],

        // Arrays with special values
        [0, -0, Infinity, -Infinity, NaN],
        ["", " ", "\t", "\n"],
        ["comma,separated", "pipe|separated", "tab\tseparated"],

        // Sparse-like arrays (with undefined that gets filtered out)
        [1, undefined, 2, undefined, 3],

        // Large arrays
        Array.from({ length: 1000 }, (_, i) => i),
        Array.from({ length: 100 }, (_, i) => `item_${i}`),

        // Arrays with objects
        [{ id: 1 }, { id: 2 }, { id: 3 }],
        [{ name: "test", value: 42 }, { name: "other", value: -1 }],
      ];

      for (const arr of testCases) {
        const original = { array: arr };
        const encoded = encodeTONL(original);
        const decoded = decodeTONL(encoded);

        // Filter out undefined values for comparison (they get removed in JSON)
        const expected = JSON.parse(JSON.stringify(original));
        assert.deepStrictEqual(decoded, expected);
      }
    });

    test("should round-trip arrays with conflicting delimiters", () => {
      const original = [
        "value,with,commas",
        "value|with|pipes",
        "value\twith\ttabs",
        "value;with;semicolons",
        "Complex value with all: ,,|; and quotes ' \"",
        { nested: "object,with,commas" },
        ["nested", "array,with,commas"]
      ];

      // Test with each delimiter
      const delimiters = [",", "|", "\t", ";"];
      for (const delimiter of delimiters) {
        const encoded = encodeTONL(original, { delimiter });
        const decoded = decodeTONL(encoded);
        assert.deepStrictEqual(decoded, original);
      }

      // Test smart encoding
      const smartEncoded = encodeSmart(original);
      const smartDecoded = decodeTONL(smartEncoded);
      assert.deepStrictEqual(smartDecoded, original);
    });
  });

  describe("Complex Objects - Complete Coverage", () => {
    test("should round-trip all object types", () => {
      const testCases = [
        // Empty objects
        {},
        { empty: {} },
        { nested: { deeper: { empty: {} } } },

        // Single type properties
        { numbers: [1, 2, 3] },
        { strings: ["a", "b", "c"] },
        { booleans: [true, false] },
        { nulls: [null, null] },

        // Mixed properties
        {
          string: "hello",
          number: 42,
          boolean: true,
          nullValue: null,
          array: [1, "two", true],
          object: { nested: "value" }
        },

        // Objects with special property names
        { "": "empty key" },
        { " ": "space key" },
        { "property.with.dots": "dotted" },
        { "property-with-dashes": "dashed" },
        { "property_with_underscores": "underscored" },
        { "123": "numeric key" },
        { "special-chars!@#$%^&*()": "symbols" },
        { "中文键": "Chinese key" },
        { "emoji🎉key": "emoji key" },

        // Deeply nested objects
        {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: "deep value"
                }
              }
            }
          }
        },

        // Objects with arrays of objects
        {
          users: [
            { id: 1, name: "Alice", active: true },
            { id: 2, name: "Bob", active: false }
          ]
        },
      ];

      for (const obj of testCases) {
        const original = obj;
        const encoded = encodeTONL(original);
        const decoded = decodeTONL(encoded);
        assert.deepStrictEqual(decoded, original);
      }
    });

    test("should round-trip objects with conflicting delimiters", () => {
      const original = {
        "comma,separated,key": "value,with,commas",
        "pipe|separated|key": "value|with|pipes",
        "tab\tseparated\tkey": "value\twith\ttabs",
        "semicolon;separated;key": "value;with;semicolons",
        "complex:key": "value with all: ,,|; and quotes",
        nested: {
          "nested,comma,key": "nested,value",
          "array": ["comma,value", "pipe|value", "tab\tvalue"]
        }
      };

      // Test with each delimiter
      const delimiters = [",", "|", "\t", ";"];
      for (const delimiter of delimiters) {
        const encoded = encodeTONL(original, { delimiter });
        const decoded = decodeTONL(encoded);
        assert.deepStrictEqual(decoded, original);
      }

      // Test smart encoding
      const smartEncoded = encodeSmart(original);
      const smartDecoded = decodeTONL(smartEncoded);
      assert.deepStrictEqual(smartDecoded, original);
    });
  });

  describe("Extreme Edge Cases", () => {
    test("should handle deeply nested structures", () => {
      // Create a deeply nested structure
      let deepObject = {};
      let current = deepObject;
      for (let i = 0; i < 100; i++) {
        current[`level${i}`] = {};
        current = current[`level${i}`];
      }
      current.value = "deep value";

      const encoded = encodeTONL(deepObject);
      const decoded = decodeTONL(encoded);
      assert.deepStrictEqual(decoded, deepObject);
    });

    test("should handle wide objects with many properties", () => {
      const wideObject = {};
      for (let i = 0; i < 1000; i++) {
        wideObject[`property_${i}`] = `value_${i}`;
      }

      const encoded = encodeTONL(wideObject);
      const decoded = decodeTONL(encoded);
      assert.deepStrictEqual(decoded, wideObject);
    });

    test("should handle large arrays", () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `item_${i}`,
        value: Math.random(),
        active: i % 2 === 0
      }));

      const encoded = encodeTONL({ data: largeArray });
      const decoded = decodeTONL(encoded);
      assert.deepStrictEqual(decoded, { data: largeArray });
    });

    test("should handle mixed Unicode and special characters", () => {
      const original = {
        "unicode_中文_日本語_한국어_العربية": "mixed_unicode_values",
        "emoji_🎉_🚀_💯_💪": "emoji_values",
        "math_∑_∏_∫_∆_∇": "math_symbols",
        "currency_$€£¥₹": "currency_symbols",
        "quotes_'_\"_''_\"\"": "quote_variations",
        "whitespace_\t_\n_\r": "whitespace_chars",
        "special_©®™§¶†‡": "special_symbols"
      };

      const encoded = encodeTONL(original);
      const decoded = decodeTONL(encoded);
      assert.deepStrictEqual(decoded, original);
    });

    test("should handle JSON-like strings that could confuse parser", () => {
      const original = {
        "json_like_object": '{"key": "value", "number": 42}',
        "json_like_array": '[1, 2, "three", true, null]',
        "json_like_nested": '{"outer": {"inner": [1, 2, 3]}}',
        "tonl_like": 'key1{prop1,prop2}: value1, value2',
        "mixed_separators": 'value1,value2|value3;value4\tvalue5',
        "header_like": '#version 1.0\n#delimiter |\nusers[3]{id,name}:',
        "complex_quotes": 'He said: "Hello, world!" and she replied: \'Hi there!\''
      };

      const encoded = encodeTONL(original);
      const decoded = decodeTONL(encoded);
      assert.deepStrictEqual(decoded, original);
    });
  });

  describe("Performance and Memory Tests", () => {
    test("should handle large documents efficiently", () => {
      // Create a large document
      const largeDoc = {
        metadata: {
          version: "1.0",
          created: new Date().toISOString(),
          size: "large"
        },
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          profile: {
            age: 20 + (i % 50),
            active: i % 2 === 0,
            tags: [`tag${i % 10}`, `category${i % 5}`]
          },
          history: Array.from({ length: 10 }, (_, j) => ({
            action: `action_${j}`,
            timestamp: Date.now() - (j * 1000),
            data: `Some data for user ${i + 1}, action ${j}`
          }))
        })),
        categories: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          name: `Category ${i + 1}`,
          description: `Description for category ${i + 1} with some detail`,
          itemCount: i * 20
        }))
      };

      const startTime = Date.now();
      const encoded = encodeTONL(largeDoc);
      const encodeTime = Date.now() - startTime;

      const decodeStartTime = Date.now();
      const decoded = decodeTONL(encoded);
      const decodeTime = Date.now() - decodeStartTime;

      assert.deepStrictEqual(decoded, largeDoc);

      // Performance assertions (should complete reasonably fast)
      assert(encodeTime < 5000, `Encoding took too long: ${encodeTime}ms`);
      assert(decodeTime < 5000, `Decoding took too long: ${decodeTime}ms`);

      // Memory efficiency check (encoded should be reasonable size)
      const encodedSize = encoded.length;
      const originalSize = JSON.stringify(largeDoc).length;
      const compressionRatio = encodedSize / originalSize;
      assert(compressionRatio < 1.5, `Poor compression: ${compressionRatio.toFixed(2)}x`);
    });
  });

  describe("Real-World Data Scenarios", () => {
    test("should handle e-commerce product catalog", () => {
      const catalog = {
        products: [
          {
            id: "PROD-001",
            name: "Wireless Headphones",
            description: "High-quality wireless headphones with noise cancellation",
            price: 299.99,
            currency: "USD",
            categories: ["Electronics", "Audio", "Wireless"],
            specifications: {
              brand: "AudioTech",
              model: "WH-1000XM4",
              color: "Black",
              weight: "254g",
              batteryLife: "30 hours",
              connectivity: ["Bluetooth 5.0", "USB-C", "3.5mm jack"]
            },
            inventory: {
              inStock: true,
              quantity: 150,
              warehouses: ["US-West", "EU-Central", "Asia-Pacific"]
            },
            reviews: [
              { rating: 5, comment: "Excellent sound quality!", author: "John D." },
              { rating: 4, comment: "Good but expensive", author: "Sarah M." }
            ]
          },
          {
            id: "PROD-002",
            name: "Smart Watch",
            description: "Fitness tracking smartwatch with heart rate monitor",
            price: 199.99,
            currency: "USD",
            categories: ["Electronics", "Wearables", "Fitness"],
            specifications: {
              brand: "TechWatch",
              model: "SW-Fit2024",
              color: "Silver",
              display: "1.4\" AMOLED",
              batteryLife: "7 days",
              features: ["Heart Rate", "GPS", "Water Resistant", "Sleep Tracking"]
            },
            inventory: {
              inStock: false,
              quantity: 0,
              warehouses: [],
              restockDate: "2024-02-15"
            }
          }
        ],
        categories: [
          { id: "electronics", name: "Electronics", productCount: 245 },
          { id: "audio", name: "Audio Equipment", productCount: 89 },
          { id: "wearables", name: "Wearable Technology", productCount: 156 }
        ],
        promotions: [
          { code: "WINTER20", discount: 0.2, applicableCategories: ["electronics"] },
          { code: "NEWYEAR10", discount: 0.1, minPurchase: 100 }
        ]
      };

      const encoded = encodeTONL(catalog);
      const decoded = decodeTONL(encoded);
      assert.deepStrictEqual(decoded, catalog);
    });

    test("should handle social media data", () => {
      const socialData = {
        users: [
          {
            id: "user_123",
            username: "tech_enthusiast",
            profile: {
              displayName: "Tech Enthusiast",
              bio: "Love all things tech! 🚀 #AI #ML #Programming",
              avatar: "https://example.com/avatars/123.jpg",
              verified: true,
              followers: 15000,
              following: 500,
              location: "San Francisco, CA"
            },
            posts: [
              {
                id: "post_456",
                content: "Just discovered an amazing new framework! Check it out 👀",
                timestamp: "2024-01-15T10:30:00Z",
                likes: 234,
                retweets: 45,
                hashtags: ["programming", "javascript", "webdev"],
                media: [
                  { type: "image", url: "https://example.com/media/456.jpg" }
                ]
              }
            ]
          }
        ],
        trending: [
          { hashtag: "#AI", count: 50000 },
          { hashtag: "#TechNews", count: 32000 },
          { hashtag: "#Programming", count: 28000 }
        ]
      };

      const encoded = encodeTONL(socialData);
      const decoded = decodeTONL(encoded);
      assert.deepStrictEqual(decoded, socialData);
    });
  });
});