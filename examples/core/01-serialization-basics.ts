#!/usr/bin/env node
/**
 * Core Serialization Features
 *
 * Demonstrates:
 * - Compact format and token savings
 * - Human-readable output
 * - Round-trip safety
 * - Smart encoding with auto-delimiter selection
 * - Type hints
 */

import { isDeepStrictEqual } from 'node:util';
import { encodeTONL, decodeTONL, encodeSmart } from '../../dist/index.js';

console.log('📦 Core Serialization Features\n');
console.log('='.repeat(60));

// Sample data
const userData = {
    users: [
        { id: 1, name: 'Alice Smith', age: 30, email: 'alice@example.com', verified: true },
        { id: 2, name: 'Bob Johnson', age: 25, email: 'bob@example.com', verified: false },
        { id: 3, name: 'Carol White', age: 35, email: 'carol@example.com', verified: true }
    ],
    metadata: {
        version: '1.0.0',
        timestamp: '2025-01-01T00:00:00Z'
    }
};

// ========================================
// 1. Compact Format - Token Savings
// ========================================
console.log('\n1️⃣  COMPACT FORMAT - TOKEN SAVINGS');
console.log('-'.repeat(60));

const jsonString = JSON.stringify(userData, null, 2);
const tonlString = encodeTONL(userData);

const jsonBytes = Buffer.from(jsonString).length;
const tonlBytes = Buffer.from(tonlString).length;
const bytesSaved = jsonBytes - tonlBytes;
const percentSaved = ((bytesSaved / jsonBytes) * 100).toFixed(1);

// Approximate token count (1 token ≈ 4 chars for English text)
const jsonTokens = Math.ceil(jsonString.length / 4);
const tonlTokens = Math.ceil(tonlString.length / 4);
const tokensSaved = jsonTokens - tonlTokens;

console.log(`JSON:  ${jsonBytes} bytes, ~${jsonTokens} tokens`);
console.log(`TONL:  ${tonlBytes} bytes, ~${tonlTokens} tokens`);
console.log(`\n💰 Saved: ${bytesSaved} bytes (${percentSaved}%), ~${tokensSaved} tokens\n`);

// ========================================
// 2. Human-Readable Output
// ========================================
console.log('2️⃣  HUMAN-READABLE OUTPUT');
console.log('-'.repeat(60));

const simpleData = { name: 'Alice', age: 30, active: true };
const tonl = encodeTONL(simpleData);

console.log('TONL Output:');
console.log(tonl);
console.log('\n✅ Clear, readable format with minimal syntax\n');

// ========================================
// 3. Round-Trip Safety
// ========================================
console.log('3️⃣  ROUND-TRIP SAFETY');
console.log('-'.repeat(60));

const original = userData;
const encoded = encodeTONL(original);
const decoded = decodeTONL(encoded);

const isIdentical = isDeepStrictEqual(decoded, original);

console.log('Original → TONL → Decoded → JSON');
console.log(`Identical: ${isIdentical ? '✅ YES' : '❌ NO'}`);

if (isIdentical) {
    console.log('Perfect bidirectional conversion guaranteed!\n');
} else {
    console.log('❌ Round-trip data changed unexpectedly.\n');
    console.log('Data integrity check:');
    console.log(`  Users count: ${decoded.users?.length === original.users?.length ? '✅' : '❌'}`);
    console.log(`  Metadata present: ${decoded.metadata ? '✅' : '❌'}\n`);
    process.exitCode = 1;
}

// ========================================
// 4. Smart Encoding - Auto Delimiter Selection
// ========================================
console.log('4️⃣  SMART ENCODING - AUTO DELIMITER SELECTION');
console.log('-'.repeat(60));

// Data with commas
const dataWithCommas = {
    items: ['apple,orange', 'banana,grape', 'kiwi,mango']
};

const tonlWithCommas = encodeSmart(dataWithCommas);
console.log('Data with commas:');
console.log(tonlWithCommas);
console.log('→ Automatically avoids comma delimiter\n');

// Data with pipes
const dataWithPipes = {
    paths: ['/usr/bin|/usr/local/bin', '/opt/bin|/home/bin']
};

const tonlWithPipes = encodeSmart(dataWithPipes);
console.log('Data with pipes:');
console.log(tonlWithPipes);
console.log('→ Automatically avoids pipe delimiter\n');

// Clean data - still chooses the delimiter with the lowest quoting overhead
const cleanData = {
    items: ['apple', 'banana', 'orange']
};

const tonlClean = encodeSmart(cleanData);
console.log('Clean data:');
console.log(tonlClean);
console.log('→ Chooses the lowest-overhead delimiter automatically\n');

// ========================================
// 5. Type Hints
// ========================================
console.log('5️⃣  TYPE HINTS');
console.log('-'.repeat(60));

console.log('Without type hints:');
const tonlWithoutTypes = encodeTONL(userData, { includeTypes: false });
console.log(tonlWithoutTypes.split('\n').slice(0, 5).join('\n'));
console.log('...\n');

console.log('With type hints:');
const tonlWithTypes = encodeTONL(userData, { includeTypes: true });
console.log(tonlWithTypes.split('\n').slice(0, 5).join('\n'));
console.log('...\n');

const withoutSize = Buffer.from(tonlWithoutTypes).length;
const withSize = Buffer.from(tonlWithTypes).length;
const overhead = withSize - withoutSize;

console.log(`Without types: ${withoutSize} bytes`);
console.log(`With types:    ${withSize} bytes (+${overhead} bytes overhead)`);
console.log('\n✅ Type hints add metadata for validation with minimal overhead\n');

// ========================================
// Summary
// ========================================
console.log('='.repeat(60));
console.log('✅ SUMMARY');
console.log('='.repeat(60));
console.log(`
✓ ${percentSaved}% smaller than JSON
✓ Human-readable format
✓ Perfect round-trip conversion
✓ Smart delimiter selection
✓ Optional type hints for validation
`);

console.log('🎯 TONL is optimized for LLM applications where token cost matters!\n');
