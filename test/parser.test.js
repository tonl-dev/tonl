/**
 * Parser unit tests
 */
import { test, describe } from "node:test";
import assert from "node:assert";
import { parseTONLLine, parseHeaderLine, parseObjectHeader, detectDelimiter } from "../src/parser.js";
describe("parseTONLLine", () => {
    test("should parse simple comma-separated values", () => {
        const result = parseTONLLine("1, Alice, admin", ",");
        assert.deepStrictEqual(result, ["1", "Alice", "admin"]);
    });
    test("should handle quoted values containing delimiter", () => {
        const result = parseTONLLine("2, \"Bob, Jr.\", \"super,admin\"", ",");
        assert.deepStrictEqual(result, ["2", "Bob, Jr.", "super,admin"]);
    });
    test("should handle doubled quotes inside quoted strings", () => {
        const result = parseTONLLine("3, \"Alice \"\"Queen\"\" Smith\", user", ",");
        assert.deepStrictEqual(result, ["3", "Alice \"Queen\" Smith", "user"]);
    });
    test("should handle custom delimiter", () => {
        const result = parseTONLLine("1|Alice|admin", "|");
        assert.deepStrictEqual(result, ["1", "Alice", "admin"]);
    });
    test("should handle escaped delimiter in plain mode", () => {
        const result = parseTONLLine("3, value\\,with\\,commas, normal", ",");
        assert.deepStrictEqual(result, ["3", "value,with,commas", "normal"]);
    });
    test("should handle empty fields", () => {
        const result = parseTONLLine("1, , admin", ",");
        assert.deepStrictEqual(result, ["1", "", "admin"]);
    });
    test("should handle trailing whitespace", () => {
        const result = parseTONLLine("1, Alice , admin ", ",");
        assert.deepStrictEqual(result, ["1", "Alice", "admin"]);
    });
    test("should return empty array for empty line", () => {
        const result = parseTONLLine("", ",");
        assert.deepStrictEqual(result, []);
    });
    test("should return empty array for whitespace-only line", () => {
        const result = parseTONLLine("   ", ",");
        assert.deepStrictEqual(result, []);
    });
});
describe("parseHeaderLine", () => {
    test("should parse version header", () => {
        const result = parseHeaderLine("#version 1.0");
        assert.deepStrictEqual(result, { key: "version", value: "1.0" });
    });
    test("should parse delimiter header", () => {
        const result = parseHeaderLine("#delimiter |");
        assert.deepStrictEqual(result, { key: "delimiter", value: "|" });
    });
    test("should handle extra whitespace", () => {
        const result = parseHeaderLine("  #version    2.0  ");
        assert.deepStrictEqual(result, { key: "version", value: "2.0" });
    });
    test("should return null for non-header lines", () => {
        const result = parseHeaderLine("users[2]{id,name}:");
        assert.strictEqual(result, null);
    });
    test("should return null for malformed headers", () => {
        const result = parseHeaderLine("#invalidheader");
        assert.strictEqual(result, null);
    });
});
describe("parseObjectHeader", () => {
    test("should parse simple object header", () => {
        const result = parseObjectHeader("user{id,name,email}:");
        assert.deepStrictEqual(result, {
            key: "user",
            isArray: false,
            columns: [
                { name: "id" },
                { name: "name" },
                { name: "email" }
            ]
        });
    });
    test("should parse array header with type hints", () => {
        const result = parseObjectHeader("users[2]{id:u32,name:str,role:str}:");
        assert.deepStrictEqual(result, {
            key: "users",
            isArray: true,
            arrayLength: 2,
            columns: [
                { name: "id", type: "u32" },
                { name: "name", type: "str" },
                { name: "role", type: "str" }
            ]
        });
    });
    test("should parse object header with mixed types", () => {
        const result = parseObjectHeader("project{id:u32,name:str,active:bool}:");
        assert.deepStrictEqual(result, {
            key: "project",
            isArray: false,
            columns: [
                { name: "id", type: "u32" },
                { name: "name", type: "str" },
                { name: "active", type: "bool" }
            ]
        });
    });
    test("should handle empty columns", () => {
        const result = parseObjectHeader("empty{}:");
        assert.deepStrictEqual(result, {
            key: "empty",
            isArray: false,
            columns: []
        });
    });
    test("should return null for non-header lines", () => {
        const result = parseObjectHeader("1, Alice, admin");
        assert.strictEqual(result, null);
    });
    test("should return null for lines without trailing colon", () => {
        const result = parseObjectHeader("users[2]{id,name}");
        assert.strictEqual(result, null);
    });
    test("should handle quoted column names", () => {
        const result = parseObjectHeader('data{"name with spaces":str,"normal":name}:');
        assert.deepStrictEqual(result, {
            key: "data",
            isArray: false,
            columns: [
                { name: '"name with spaces"', type: "str" },
                { name: '"normal"', type: "name" }
            ]
        });
    });
});
describe("detectDelimiter", () => {
    test("should detect comma delimiter (default)", () => {
        const content = "#version 1.0\nusers[2]{id,name}:\n1, Alice\n2, Bob";
        const delimiter = detectDelimiter(content);
        assert.strictEqual(delimiter, ",");
    });
    test("should detect pipe delimiter", () => {
        const content = "#version 1.0\nusers[2]{id|name}:\n1| Alice\n2| Bob";
        const delimiter = detectDelimiter(content);
        assert.strictEqual(delimiter, "|");
    });
    test("should detect tab delimiter", () => {
        const content = "#version 1.0\nusers[2]{id\tname}:\n1\tAlice\n2\tBob";
        const delimiter = detectDelimiter(content);
        assert.strictEqual(delimiter, "\t");
    });
    test("should use explicit delimiter directive", () => {
        const content = "#delimiter ;\nusers[2]{id;name}:\n1; Alice\n2; Bob";
        const delimiter = detectDelimiter(content);
        assert.strictEqual(delimiter, ";");
    });
    test("should fall back to comma when unable to detect", () => {
        const content = "#version 1.0\nsimple text without delimiters";
        const delimiter = detectDelimiter(content);
        assert.strictEqual(delimiter, ",");
    });
});
//# sourceMappingURL=parser.test.js.map