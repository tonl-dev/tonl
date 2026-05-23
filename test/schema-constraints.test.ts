/**
 * Schema constraint validation tests
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseSchema, validateTONL, generateTypeScript } from '../dist/schema/index.js';

describe('Schema constraints - unique', () => {
  it('should detect duplicate values in array', () => {
    const schemaContent = `@schema v1

tags: list<str> unique:true
`;

    const schema = parseSchema(schemaContent);

    // Has duplicates
    const data1 = { tags: ['a', 'b', 'a'] };
    const result1 = validateTONL(data1, schema);
    assert.strictEqual(result1.valid, false);
    assert.ok(result1.errors[0].message.includes('duplicate'));

    // All unique
    const data2 = { tags: ['a', 'b', 'c'] };
    const result2 = validateTONL(data2, schema);
    assert.strictEqual(result2.valid, true);
  });
});

describe('Schema constraints - nonempty', () => {
  it('should reject empty arrays', () => {
    const schemaContent = `@schema v1

items: list<str> nonempty:true
`;

    const schema = parseSchema(schemaContent);

    // Empty array
    const data1 = { items: [] };
    const result1 = validateTONL(data1, schema);
    assert.strictEqual(result1.valid, false);

    // Non-empty
    const data2 = { items: ['item1'] };
    const result2 = validateTONL(data2, schema);
    assert.strictEqual(result2.valid, true);
  });
});

describe('Schema constraints - numeric', () => {
  it('should validate positive constraint', () => {
    const schemaContent = `@schema v1

count: i32 positive:true
`;

    const schema = parseSchema(schemaContent);

    // Negative
    const data1 = { count: -5 };
    const result1 = validateTONL(data1, schema);
    assert.strictEqual(result1.valid, false);

    // Positive
    const data2 = { count: 10 };
    const result2 = validateTONL(data2, schema);
    assert.strictEqual(result2.valid, true);
  });

  it('should validate integer constraint', () => {
    const schemaContent = `@schema v1

quantity: f64 integer:true
`;

    const schema = parseSchema(schemaContent);

    // Float
    const data1 = { quantity: 3.14 };
    const result1 = validateTONL(data1, schema);
    assert.strictEqual(result1.valid, false);

    // Integer
    const data2 = { quantity: 42 };
    const result2 = validateTONL(data2, schema);
    assert.strictEqual(result2.valid, true);
  });

  it('should validate multipleOf constraint', () => {
    const schemaContent = `@schema v1

price: f64 multipleOf:0.01
`;

    const schema = parseSchema(schemaContent);

    // Not multiple
    const data1 = { price: 10.123 };
    const result1 = validateTONL(data1, schema);
    assert.strictEqual(result1.valid, false);

    // Valid multiple
    const data2 = { price: 10.99 };
    const result2 = validateTONL(data2, schema);
    assert.strictEqual(result2.valid, true);
  });
});

describe('Schema constraints - length', () => {
  it('should validate exact string length', () => {
    const schemaContent = `@schema v1

code: str length:6
`;

    const schema = parseSchema(schemaContent);

    // Wrong length
    const data1 = { code: 'ABC' };
    const result1 = validateTONL(data1, schema);
    assert.strictEqual(result1.valid, false);

    // Correct length
    const data2 = { code: 'ABC123' };
    const result2 = validateTONL(data2, schema);
    assert.strictEqual(result2.valid, true);
  });
});

describe('Schema constraints - aliases and enum', () => {
  it('should parse comma-separated constraints and common aliases', () => {
    const schemaContent = `@schema v1

User: obj
  username: str, required, minLength:3, maxLength:20, pattern:^[a-zA-Z0-9_]+$
  email: str, required, email
  website: str, url
  role: str, enum:admin|user|moderator

user: User required
`;

    const schema = parseSchema(schemaContent);

    const validResult = validateTONL({
      user: {
        username: 'alice_smith',
        email: 'alice@example.com',
        website: 'https://alice.example.com',
        role: 'admin',
      },
    }, schema);
    assert.strictEqual(validResult.valid, true);

    const invalidResult = validateTONL({
      user: {
        username: 'ab',
        email: 'not-an-email',
        website: 'ftp://example.com',
        role: 'superadmin',
      },
    }, schema);
    assert.strictEqual(invalidResult.valid, false);
    assert.ok(invalidResult.errors.some(error => error.field === 'user.username'));
    assert.ok(invalidResult.errors.some(error => error.field === 'user.email'));
    assert.ok(invalidResult.errors.some(error => error.field === 'user.website'));
    assert.ok(invalidResult.errors.some(error => error.field === 'user.role'));
  });

  it('should generate literal union types for string enum constraints', () => {
    const schema = parseSchema(`@schema v1

User: obj
  role: str enum:admin|user|moderator
`);

    const generated = generateTypeScript(schema);
    assert.ok(generated.includes("role?: 'admin' | 'user' | 'moderator';"));
  });

  it('should preserve commas inside regex constraint values', () => {
    const schema = parseSchema(`@schema v1

code: str pattern:^[a,b]+$
`);

    const validResult = validateTONL({ code: 'a,b' }, schema);
    assert.strictEqual(validResult.valid, true);

    const invalidResult = validateTONL({ code: 'c' }, schema);
    assert.strictEqual(invalidResult.valid, false);
  });
});
