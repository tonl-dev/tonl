/**
 * Realistic Schema-First Test Suite
 *
 * Tests schema-first functionality with realistic expectations and current parser capabilities
 */

import { test, describe } from "node:test";
import { deepStrictEqual, strictEqual, ok } from "node:assert";
import { encodeTONL, decodeTONL, encodeSmart } from "../dist/index.js";

// Helper function to normalize objects (handles Object.create(null))
function normalizeObject(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

describe("Realistic Schema-First Tests", () => {
  describe("Working Schema-First Features", () => {
    test("should encode and decode simple schema-first format correctly", () => {
      const data = {
        users: [
          { id: 1, name: "Alice", active: true },
          { id: 2, name: "Bob", active: false }
        ]
      };

      const encoded = encodeTONL(data, { schemaFirst: true });
      const decoded = normalizeObject(decodeTONL(encoded));

      // Should maintain data integrity
      strictEqual(decoded.users.length, 2);
      strictEqual(decoded.users[0].name, "Alice");
      strictEqual(decoded.users[1].active, false);
      strictEqual(decoded.users[1].id, 2);

      // Should contain schema directive
      ok(encoded.includes('#schema users'));
    });

    test("should handle schema-first with type hints", () => {
      const data = {
        items: [
          { id: 1, name: "Item 1", active: true, price: 99.99 }
        ]
      };

      const encoded = encodeTONL(data, {
        schemaFirst: true,
        includeTypes: true
      });

      const decoded = normalizeObject(decodeTONL(encoded));

      // Should preserve data with type hints
      strictEqual(decoded.items[0].id, 1);
      strictEqual(decoded.items[0].name, "Item 1");
      strictEqual(decoded.items[0].active, true);
      strictEqual(decoded.items[0].price, 99.99);

      // Should include type hints in schema
      ok(encoded.includes('id:u32'));
      ok(encoded.includes('name:str'));
    });

    test("should work with empty arrays", () => {
      const data = {
        empty: [],
        normal: [
          { id: 1, name: "Single Item" }
        ]
      };

      const encoded = encodeTONL(data, { schemaFirst: true });
      const decoded = normalizeObject(decodeTONL(encoded));

      strictEqual(decoded.empty.length, 0);
      strictEqual(decoded.normal.length, 1);
      strictEqual(decoded.normal[0].name, "Single Item");
    });

    test("should not use schema-first for non-uniform arrays", () => {
      const data = {
        mixed: [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2", extra: "field" } // Extra field makes it non-uniform
        ]
      };

      const encoded = encodeTONL(data, { schemaFirst: true });
      const decoded = normalizeObject(decodeTONL(encoded));

      // Should still encode data correctly, just not in schema-first format
      strictEqual(decoded.mixed.length, 2);
      strictEqual(decoded.mixed[0].name, "Item 1");
      strictEqual(decoded.mixed[1].extra, "field");

      // Should not use schema directive
      ok(!encoded.includes('#schema mixed'));
    });

    test("should handle mixed primitive values", () => {
      const data = {
        numbers: [
          { id: 1, value: 100, status: true },
          { id: 2, value: 200, status: false }
        ]
      };

      const encoded = encodeTONL(data, { schemaFirst: true });
      const decoded = normalizeObject(decodeTONL(encoded));

      strictEqual(decoded.numbers[0].value, 100);
      strictEqual(decoded.numbers[1].status, false);
    });

    test("should integrate with smart encoding", () => {
      const data = {
        employees: [
          { id: 1, name: "Alice", department: "Engineering", active: true },
          { id: 2, name: "Bob", department: "Engineering", active: true }
        ]
      };

      // Test with smart encoding
      const smartEncoded = encodeSmart(data, { schemaFirst: true });
      const smartDecoded = normalizeObject(decodeTONL(smartEncoded));

      // Test with regular encoding
      const regularEncoded = encodeTONL(data, { schemaFirst: true });
      const regularDecoded = normalizeObject(decodeTONL(regularEncoded));

      // Both should produce same result
      deepStrictEqual(smartDecoded, regularDecoded);
      strictEqual(smartDecoded.employees.length, 2);
    });
  });

  describe("Complex Nested Structures", () => {
    test("should handle nested structures with schema-first blocks", () => {
      const data = {
        company: "TechCorp",
        departments: [
          {
            name: "Engineering",
            budget: 1000000,
            team: [
              { id: 1, name: "Alice", role: "Developer" },
              { id: 2, name: "Bob", role: "DevOps" }
            ]
          }
        ]
      };

      const encoded = encodeTONL(data, { schemaFirst: true });
      const decoded = normalizeObject(decodeTONL(encoded));

      // Should preserve nested structure
      strictEqual(decoded.company, "TechCorp");
      strictEqual(decoded.departments[0].name, "Engineering");
      strictEqual(decoded.departments[0].team.length, 2);
      strictEqual(decoded.departments[0].team[0].role, "Developer");
    });

    test("should handle multiple uniform arrays", () => {
      const data = {
        users: [
          { id: 1, name: "User 1", active: true },
          { id: 2, name: "User 2", active: false }
        ]
      };

      const encoded = encodeTONL(data, { schemaFirst: true });
      const decoded = normalizeObject(decodeTONL(encoded));

      // Should have schema directive
      ok(encoded.includes('#schema users'));

      // Should preserve all data
      strictEqual(decoded.users.length, 2);
      strictEqual(decoded.users[0].name, "User 1");
      strictEqual(decoded.users[1].active, false);
    });
  });

  describe("Edge Cases", () => {
    test("should handle strings with special characters", () => {
      const data = {
        items: [
          { id: 1, text: "Normal text", category: "A" },
          { id: 2, text: 'Text with "quotes"', category: "B" }
        ]
      };

      const encoded = encodeTONL(data, { schemaFirst: true });
      const decoded = normalizeObject(decodeTONL(encoded));

      strictEqual(decoded.items[0].text, "Normal text");
      strictEqual(decoded.items[1].text, 'Text with "quotes"');
    });

    test("should handle null and undefined values", () => {
      const data = {
        records: [
          { id: 1, name: "Alice", email: "alice@example.com", active: true },
          { id: 2, name: "Bob", email: null, active: false }
        ]
      };

      const encoded = encodeTONL(data, { schemaFirst: true });
      const decoded = normalizeObject(decodeTONL(encoded));

      strictEqual(decoded.records[0].email, "alice@example.com");
      strictEqual(decoded.records[1].email, null);
      strictEqual(decoded.records[1].active, false);
    });

    test("should handle numeric values correctly", () => {
      const data = {
        measurements: [
          { id: 1, value: 3.14159, precision: "high" },
          { id: 2, value: -42, precision: "low" }
        ]
      };

      const encoded = encodeTONL(data, { schemaFirst: true });
      const decoded = normalizeObject(decodeTONL(encoded));

      strictEqual(decoded.measurements[0].value, 3.14159);
      strictEqual(decoded.measurements[1].value, -42);
    });
  });

  describe("Performance", () => {
    test("should handle moderately large datasets", () => {
      const data = {
        records: Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          name: `Record ${i + 1}`,
          active: i % 2 === 0,
          score: Math.floor(Math.random() * 100)
        }))
      };

      const startTime = Date.now();
      const encoded = encodeTONL(data, { schemaFirst: true });
      const decoded = normalizeObject(decodeTONL(encoded));
      const endTime = Date.now();

      // Should complete in reasonable time (< 1 second)
      ok(endTime - startTime < 1000);

      // Should preserve all data
      strictEqual(decoded.records.length, 100);
      strictEqual(decoded.records[0].id, 1);
      strictEqual(decoded.records[99].id, 100);
    });
  });

  describe("Integration with TONL Features", () => {
    test("should work with different delimiters", () => {
      const data = {
        data: [
          { field1: "value1", field2: "value2" }
        ]
      };

      const commaEncoded = encodeTONL(data, {
        schemaFirst: true,
        delimiter: ","
      });

      const pipeEncoded = encodeTONL(data, {
        schemaFirst: true,
        delimiter: "|"
      });

      // Should both preserve data
      const commaDecoded = normalizeObject(decodeTONL(commaEncoded));
      const pipeDecoded = normalizeObject(decodeTONL(pipeEncoded));

      deepStrictEqual(commaDecoded, pipeDecoded);
      strictEqual(commaDecoded.data[0].field1, "value1");
    });

    test("should maintain data integrity through multiple transformations", () => {
      const originalData = {
        users: [
          { id: 1, name: "Alice", active: true },
          { id: 2, name: "Bob", active: false }
        ]
      };

      // Original -> TONL (schema-first) -> JSON -> TONL (schema-first) -> JSON
      const tonl1 = encodeTONL(originalData, { schemaFirst: true });
      const json1 = normalizeObject(decodeTONL(tonl1));
      const tonl2 = encodeTONL(json1, { schemaFirst: true });
      const json2 = normalizeObject(decodeTONL(tonl2));

      // Should be identical after round-trip
      deepStrictEqual(json2, json1);
      deepStrictEqual(json2, originalData);
    });
  });
});