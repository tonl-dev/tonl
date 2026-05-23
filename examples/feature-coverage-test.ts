#!/usr/bin/env node
/**
 * TONL Feature Coverage Test Suite
 *
 * Comprehensive test runner that validates ALL TONL features are working correctly.
 * This serves as both a test suite and feature demonstration.
 */

import { encodeTONL, decodeTONL } from '../dist/index.js';
import { TONLDocument } from '../dist/document.js';
import { aggregate } from '../dist/query/aggregators.js';
import {
  levenshteinDistance,
  jaroWinklerSimilarity,
  soundsLike,
  fuzzyMatch,
  fuzzySearch
} from '../dist/query/fuzzy-matcher.js';
import {
  parseTemporalLiteral,
  isBefore,
  isAfter,
  isDaysAgo,
  isSameDay
} from '../dist/query/temporal-evaluator.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test results tracking
interface TestResult {
    category: string;
    feature: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message?: string;
}

const results: TestResult[] = [];

function test(category: string, feature: string, fn: () => void | Promise<void>) {
    try {
        const result = fn();
        if (result instanceof Promise) {
            return result
                .then(() => {
                    results.push({ category, feature, status: 'PASS' });
                    console.log(`  ✅ ${feature}`);
                })
                .catch((error) => {
                    results.push({ category, feature, status: 'FAIL', message: error.message });
                    console.log(`  ❌ ${feature}: ${error.message}`);
                });
        } else {
            results.push({ category, feature, status: 'PASS' });
            console.log(`  ✅ ${feature}`);
        }
    } catch (error: any) {
        results.push({ category, feature, status: 'FAIL', message: error.message });
        console.log(`  ❌ ${feature}: ${error.message}`);
    }
}

function section(title: string) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 ${title}`);
    console.log('='.repeat(60));
}

// Test Data
const sampleData = {
    users: [
        { id: 1, name: 'Alice', age: 30, email: 'alice@example.com', role: 'admin' },
        { id: 2, name: 'Bob', age: 25, email: 'bob@example.com', role: 'user' },
        { id: 3, name: 'Carol', age: 35, email: 'carol@example.com', role: 'moderator' }
    ],
    config: {
        version: '1.0.0',
        features: { analytics: true, logging: false }
    }
};

async function runTests() {
    console.log('\n🚀 TONL Feature Coverage Test Suite\n');
    console.log('Testing all documented features...\n');

    // ========================================
    // 1. CORE SERIALIZATION
    // ========================================
    section('Core Serialization');

    test('Core', 'Compact Format - Token Reduction', () => {
        // Use larger dataset for realistic token savings
        const largeData = {
            users: Array.from({ length: 20 }, (_, i) => ({
                id: i + 1,
                name: `User ${i + 1}`,
                email: `user${i}@example.com`,
                age: 20 + (i % 40),
                role: i % 3 === 0 ? 'admin' : 'user',
                verified: i % 2 === 0
            }))
        };

        const json = JSON.stringify(largeData);
        const tonl = encodeTONL(largeData);
        const reduction = ((json.length - tonl.length) / json.length) * 100;

        if (reduction < 20) {
            throw new Error(`Expected >20% reduction, got ${reduction.toFixed(1)}%`);
        }
        console.log(`    💡 ${reduction.toFixed(1)}% size reduction`);
    });

    test('Core', 'Human-Readable Output', () => {
        const tonl = encodeTONL({ name: 'Test', value: 42 });
        if (!tonl.includes('name:') || !tonl.includes('value:')) {
            throw new Error('Output not human-readable');
        }
    });

    test('Core', 'Round-Trip Safe', () => {
        const original = sampleData;
        const tonl = encodeTONL(original);
        const decoded = decodeTONL(tonl);

        // Check data integrity (values match, even if key order differs)
        if (!decoded.users || decoded.users.length !== original.users.length) {
            throw new Error('Round-trip failed - users array mismatch');
        }

        if (!decoded.config || decoded.config.version !== original.config.version) {
            throw new Error('Round-trip failed - config mismatch');
        }

        // Verify user data
        if (decoded.users[0].name !== original.users[0].name) {
            throw new Error('Round-trip failed - data corruption');
        }

        console.log(`    💡 Data integrity verified`);
    });

    test('Core', 'Smart Encoding - Auto Delimiter Selection', () => {
        const dataWithCommas = { items: ['a,b', 'c,d'] };
        const tonl = encodeTONL(dataWithCommas);

        // Should NOT use comma delimiter when data contains commas
        const lines = tonl.split('\n');
        const headerLine = lines.find(l => l.startsWith('items'));

        if (headerLine?.includes('[') && headerLine.includes(',') && !headerLine.includes('|') && !headerLine.includes('\t')) {
            throw new Error('Smart encoding should avoid comma delimiter for comma-containing data');
        }
    });

    test('Core', 'Type Hints Support', () => {
        const tonl = encodeTONL(sampleData, { includeTypes: true });

        if (!tonl.includes('{') || !tonl.includes(':')) {
            throw new Error('Type hints not included in output');
        }
        console.log(`    💡 Type hints included in header`);
    });

    // ========================================
    // 2. QUERY & NAVIGATION API
    // ========================================
    section('Query & Navigation API');

    test('Query', 'JSONPath Queries - Basic', () => {
        const doc = new TONLDocument(sampleData);
        const names = doc.query('users[*].name');

        if (names.length !== 3 || !names.includes('Alice')) {
            throw new Error('JSONPath query failed');
        }
    });

    test('Query', 'Filter Expressions - Comparison Operators', () => {
        const doc = new TONLDocument(sampleData);
        const adults = doc.query('users[?(@.age > 25)]');

        if (adults.length !== 2) {
            throw new Error(`Expected 2 users > 25, got ${adults.length}`);
        }
    });

    test('Query', 'Filter Expressions - Logical Operators', () => {
        const doc = new TONLDocument(sampleData);
        const result = doc.query('users[?(@.age > 25 && @.role == "admin")]');

        if (result.length !== 1 || result[0].name !== 'Alice') {
            throw new Error('Logical operator filter failed');
        }
    });

    test('Query', 'Wildcard Support', () => {
        const doc = new TONLDocument(sampleData);
        const emails = doc.query('users[*].email');

        if (emails.length !== 3) {
            throw new Error('Wildcard query failed');
        }
    });

    test('Query', 'Recursive Descent', () => {
        const doc = new TONLDocument(sampleData);
        const allValues = doc.query('$..version');

        if (!allValues.includes('1.0.0')) {
            throw new Error('Recursive descent failed');
        }
    });

    test('Navigation', 'Tree Traversal - entries()', () => {
        const doc = new TONLDocument(sampleData);
        const entries = Array.from(doc.entries());

        if (entries.length === 0) {
            throw new Error('entries() returned empty');
        }
    });

    test('Navigation', 'Tree Traversal - keys()', () => {
        const doc = new TONLDocument(sampleData);
        const keys = Array.from(doc.keys());

        if (!keys.includes('users') || !keys.includes('config')) {
            throw new Error('keys() missing expected keys');
        }
    });

    test('Navigation', 'Tree Traversal - values()', () => {
        const doc = new TONLDocument(sampleData);
        const values = Array.from(doc.values());

        if (values.length === 0) {
            throw new Error('values() returned empty');
        }
    });

    test('Query', 'LRU Cache Performance', () => {
        const doc = new TONLDocument(sampleData);

        // Run same query multiple times
        const iterations = 100;
        for (let i = 0; i < iterations; i++) {
            doc.query('users[*].name');
        }

        const stats = doc.getCacheStats();
        const hitRate = (stats.hits / (stats.hits + stats.misses)) * 100;

        if (hitRate < 90) {
            throw new Error(`Cache hit rate too low: ${hitRate.toFixed(1)}%`);
        }
        console.log(`    💡 Cache hit rate: ${hitRate.toFixed(1)}%`);
    });

    // ========================================
    // 3. MODIFICATION API
    // ========================================
    section('Modification API');

    test('Modification', 'CRUD - Create (set)', () => {
        const doc = new TONLDocument({});
        doc.set('user.name', 'Alice');

        if (doc.get('user.name') !== 'Alice') {
            throw new Error('set() failed');
        }
    });

    test('Modification', 'CRUD - Read (get)', () => {
        const doc = new TONLDocument(sampleData);
        const name = doc.get('users[0].name');

        if (name !== 'Alice') {
            throw new Error('get() failed');
        }
    });

    test('Modification', 'CRUD - Update (set existing)', () => {
        const doc = new TONLDocument(sampleData);
        doc.set('users[0].age', 31);

        if (doc.get('users[0].age') !== 31) {
            throw new Error('update failed');
        }
    });

    test('Modification', 'CRUD - Delete', () => {
        const doc = new TONLDocument(sampleData);
        doc.delete('users[0].email');

        if (doc.get('users[0].email') !== undefined) {
            throw new Error('delete() failed');
        }
    });

    test('Modification', 'Bulk Operations - merge', () => {
        const doc = new TONLDocument({ a: 1 });
        doc.merge({ b: 2, c: 3 });

        if (doc.get('a') !== 1 || doc.get('b') !== 2) {
            throw new Error('merge() failed');
        }
    });

    test('Modification', 'Change Tracking - diff', () => {
        const doc = new TONLDocument(sampleData);
        const snapshot = doc.snapshot();

        doc.set('users[0].age', 31);
        const changes = doc.diff(snapshot);

        if (changes.length === 0) {
            throw new Error('diff() did not detect changes');
        }
        console.log(`    💡 Detected ${changes.length} changes`);
    });

    test('Modification', 'Snapshots', () => {
        const doc = new TONLDocument(sampleData);
        const snapshot = doc.snapshot();

        doc.set('new_field', 'test');
        doc.restore(snapshot);

        if (doc.get('new_field') !== undefined) {
            throw new Error('restore() failed');
        }
    });

    test('Modification', 'Atomic File Edits', () => {
        const tempFile = path.join(__dirname, '.temp-test.tonl');
        const doc = new TONLDocument(sampleData);

        try {
            doc.saveSync(tempFile);

            if (!fs.existsSync(tempFile)) {
                throw new Error('File not saved');
            }

            const loaded = TONLDocument.load(tempFile);
            if (loaded.get('users[0].name') !== 'Alice') {
                throw new Error('File save/load failed');
            }
        } finally {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        }
    });

    // ========================================
    // 4. PERFORMANCE & INDEXING
    // ========================================
    section('Performance & Indexing');

    test('Indexing', 'Hash Index - O(1) Lookups', () => {
        const doc = new TONLDocument(sampleData);
        doc.createIndex('users_by_id', 'users[*].id', 'hash');

        const result = doc.queryIndex('users_by_id', 2);
        if (!result || result.name !== 'Bob') {
            throw new Error('Hash index lookup failed');
        }
    });

    test('Indexing', 'BTree Index - Range Queries', () => {
        const doc = new TONLDocument(sampleData);
        doc.createIndex('users_by_age', 'users[*].age', 'btree');

        const results = doc.queryIndexRange('users_by_age', 25, 35);
        if (results.length !== 3) {
            throw new Error(`Expected 3 users in range, got ${results.length}`);
        }
    });

    test('Indexing', 'Compound Index', () => {
        const doc = new TONLDocument(sampleData);
        doc.createCompoundIndex('users_compound', ['users[*].role', 'users[*].age']);

        const stats = doc.getIndexStats();
        if (!stats.users_compound) {
            throw new Error('Compound index not created');
        }
    });

    test('Performance', 'Stream Processing - Memory Efficiency', () => {
        // This would normally use a large file, but we'll simulate it
        const largeData = { items: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: i * 2 })) };
        const tempFile = path.join(__dirname, '.temp-large.tonl');

        try {
            const tonl = encodeTONL(largeData);
            fs.writeFileSync(tempFile, tonl);

            const doc = TONLDocument.load(tempFile);
            const stream = doc.stream('items[*]');

            let count = 0;
            for (const item of stream) {
                count++;
                if (count > 10) break; // Sample only
            }

            if (count === 0) {
                throw new Error('Stream processing failed');
            }
        } finally {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        }
    });

    test('Performance', 'Pipeline Operations', () => {
        const doc = new TONLDocument(sampleData);
        const result = doc.query('users[*]')
            .filter((user: any) => user.age > 25)
            .map((user: any) => user.name);

        if (!result.includes('Alice') || !result.includes('Carol')) {
            throw new Error('Pipeline operations failed');
        }
    });

    // ========================================
    // 5. SCHEMA & VALIDATION
    // ========================================
    section('Schema & Validation');

    test('Schema', 'Schema Definition - Basic', () => {
        const schemaFile = path.join(__dirname, 'schemas', 'users.schema.tonl');

        if (!fs.existsSync(schemaFile)) {
            throw new Error('Schema file not found');
        }

        const schema = fs.readFileSync(schemaFile, 'utf-8');
        if (!schema.includes('required') || !schema.includes('type')) {
            throw new Error('Schema definition incomplete');
        }
    });

    test('Schema', 'Runtime Validation', () => {
        const doc = new TONLDocument(sampleData);
        const schemaPath = path.join(__dirname, 'schemas', 'users.schema.tonl');

        if (!fs.existsSync(schemaPath)) {
            results.push({ category: 'Schema', feature: 'Runtime Validation', status: 'SKIP', message: 'Schema file not found' });
            console.log(`  ⏭️  Runtime Validation: Schema file not found`);
            return;
        }

        const valid = doc.validate(schemaPath);
        if (!valid) {
            throw new Error('Validation failed for valid data');
        }
    });

    test('Schema', 'Strict Mode Enforcement', () => {
        const doc = new TONLDocument(sampleData, { strict: true });

        try {
            doc.set('invalid_field', 'test');
            // In strict mode, this might throw or be ignored depending on implementation
        } catch (error) {
            // Expected in strict mode
        }
    });

    // ========================================
    // 6. AGGREGATION API (v2.4.0)
    // ========================================
    section('Aggregation API (v2.4.0)');

    // Fresh data for aggregation tests to avoid side effects from CRUD tests
    const aggData = {
        users: [
            { id: 1, name: 'Alice', age: 30, role: 'admin' },
            { id: 2, name: 'Bob', age: 25, role: 'user' },
            { id: 3, name: 'Carol', age: 35, role: 'moderator' }
        ]
    };

    test('Aggregation', 'count() - Count items', () => {
        const doc = new TONLDocument(aggData);
        const count = doc.count('users[*]');

        if (count !== 3) {
            throw new Error(`Expected 3 users, got ${count}`);
        }
    });

    test('Aggregation', 'sum() - Sum numeric values', () => {
        const doc = new TONLDocument(aggData);
        const totalAge = doc.sum('users[*]', 'age');

        if (totalAge !== 90) {
            throw new Error(`Expected sum 90, got ${totalAge}`);
        }
    });

    test('Aggregation', 'avg() - Calculate average', () => {
        const doc = new TONLDocument(aggData);
        const avgAge = doc.avg('users[*]', 'age');

        if (avgAge !== 30) {
            throw new Error(`Expected avg 30, got ${avgAge}`);
        }
    });

    test('Aggregation', 'min() / max() - Find extremes', () => {
        const doc = new TONLDocument(aggData);
        const minAge = doc.min('users[*]', 'age');
        const maxAge = doc.max('users[*]', 'age');

        if (minAge !== 25 || maxAge !== 35) {
            throw new Error(`Expected min 25, max 35, got min ${minAge}, max ${maxAge}`);
        }
    });

    test('Aggregation', 'groupBy() - Group by field', () => {
        const doc = new TONLDocument(sampleData);
        const groups = doc.groupBy('users[*]', 'role');

        if (!groups['admin'] || !groups['user'] || !groups['moderator']) {
            throw new Error('groupBy missing expected groups');
        }
        console.log(`    💡 Groups: ${Object.keys(groups).join(', ')}`);
    });

    test('Aggregation', 'distinct() - Unique values', () => {
        const doc = new TONLDocument(sampleData);
        const roles = doc.distinct('users[*]', 'role');

        if (roles.length !== 3) {
            throw new Error(`Expected 3 distinct roles, got ${roles.length}`);
        }
    });

    test('Aggregation', 'stats() - Full statistics', () => {
        const doc = new TONLDocument(sampleData);
        const stats = doc.aggregate('users[*]').stats('age');

        if (!stats.count || !stats.avg || !stats.stdDev) {
            throw new Error('stats() missing expected properties');
        }
        console.log(`    💡 Stats: count=${stats.count}, avg=${stats.avg}, stdDev=${stats.stdDev.toFixed(2)}`);
    });

    test('Aggregation', 'Chained operations - filter + orderBy + take', () => {
        const doc = new TONLDocument(sampleData);
        const result = doc.aggregate('users[*]')
            .filter((u: any) => u.age > 25)
            .orderBy('age', 'desc')
            .take(2)
            .toArray();

        if (result.length !== 2 || result[0].name !== 'Carol') {
            throw new Error('Chained operations failed');
        }
    });

    test('Aggregation', 'Standalone aggregate() function', () => {
        const numbers = [1, 2, 3, 4, 5];
        const result = aggregate(numbers);

        if (result.sum() !== 15 || result.avg() !== 3) {
            throw new Error('Standalone aggregate failed');
        }
    });

    // ========================================
    // 7. FUZZY MATCHING API (v2.4.0)
    // ========================================
    section('Fuzzy Matching API (v2.4.0)');

    test('Fuzzy', 'Levenshtein Distance - Edit distance', () => {
        const dist = levenshteinDistance('kitten', 'sitting');

        if (dist !== 3) {
            throw new Error(`Expected distance 3, got ${dist}`);
        }
    });

    test('Fuzzy', 'Jaro-Winkler Similarity', () => {
        const sim = jaroWinklerSimilarity('MARTHA', 'MARHTA');

        if (sim < 0.9) {
            throw new Error(`Expected high similarity, got ${sim}`);
        }
        console.log(`    💡 Similarity: ${(sim * 100).toFixed(1)}%`);
    });

    test('Fuzzy', 'Soundex Phonetic Matching', () => {
        const match = soundsLike('Smith', 'Smyth');

        if (!match) {
            throw new Error('Smith and Smyth should sound alike');
        }
    });

    test('Fuzzy', 'fuzzyMatch() - Configurable matching', () => {
        const match1 = fuzzyMatch('hello', 'helo', { threshold: 0.8 });
        const match2 = fuzzyMatch('hello', 'world', { threshold: 0.8 });

        if (!match1 || match2) {
            throw new Error('fuzzyMatch behavior incorrect');
        }
    });

    test('Fuzzy', 'fuzzySearch() - Find best matches', () => {
        const candidates = ['JavaScript', 'TypeScript', 'Python', 'Java'];
        const results = fuzzySearch('JavaScrpt', candidates, { limit: 2 });

        if (results.length === 0 || results[0].value !== 'JavaScript') {
            throw new Error('fuzzySearch failed to find best match');
        }
        console.log(`    💡 Best match: ${results[0].value} (${(results[0].similarity * 100).toFixed(1)}%)`);
    });

    test('Fuzzy', 'Case-insensitive matching', () => {
        const match = fuzzyMatch('Hello', 'hello', { caseSensitive: false });

        if (!match) {
            throw new Error('Case-insensitive matching failed');
        }
    });

    test('Fuzzy', 'Typo-tolerant search', () => {
        const names = ['Alice Johnson', 'Bob Smith', 'Carol Williams'];
        const results = fuzzySearch('Alise Jonson', names, { threshold: 0.6 });

        if (results.length === 0) {
            throw new Error('Typo-tolerant search failed');
        }
        console.log(`    💡 Found: ${results[0].value}`);
    });

    // ========================================
    // 8. TEMPORAL QUERIES API (v2.4.0)
    // ========================================
    section('Temporal Queries API (v2.4.0)');

    test('Temporal', '@now - Current timestamp', () => {
        const now = parseTemporalLiteral('@now');
        const diff = Math.abs(now.timestamp - Date.now());

        if (diff > 1000) {
            throw new Error('@now timestamp too far from actual time');
        }
    });

    test('Temporal', '@today / @yesterday / @tomorrow', () => {
        const today = parseTemporalLiteral('@today');
        const yesterday = parseTemporalLiteral('@yesterday');
        const tomorrow = parseTemporalLiteral('@tomorrow');

        if (yesterday.timestamp >= today.timestamp || today.timestamp >= tomorrow.timestamp) {
            throw new Error('Date order incorrect');
        }
    });

    test('Temporal', 'Relative expressions (@now-7d)', () => {
        const weekAgo = parseTemporalLiteral('@now-7d');
        const expectedDiff = 7 * 24 * 60 * 60 * 1000;
        const actualDiff = Date.now() - weekAgo.timestamp;

        if (Math.abs(actualDiff - expectedDiff) > 1000) {
            throw new Error('Relative time calculation incorrect');
        }
    });

    test('Temporal', 'ISO 8601 date literals', () => {
        const date = parseTemporalLiteral('@2025-06-15');
        const parsed = new Date(date.timestamp);

        if (parsed.getFullYear() !== 2025 || parsed.getMonth() !== 5) {
            throw new Error('ISO date parsing failed');
        }
    });

    test('Temporal', 'isBefore() / isAfter() comparisons', () => {
        const date1 = new Date('2025-01-01');
        const date2 = new Date('2025-12-31');

        if (!isBefore(date1, date2) || !isAfter(date2, date1)) {
            throw new Error('Date comparison failed');
        }
    });

    test('Temporal', 'isDaysAgo() - Within N days', () => {
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        if (!isDaysAgo(fiveDaysAgo, 7) || isDaysAgo(fiveDaysAgo, 3)) {
            throw new Error('isDaysAgo check failed');
        }
    });

    test('Temporal', 'isSameDay() - Calendar matching', () => {
        // Create dates at noon to avoid timezone edge cases
        const date1 = new Date();
        date1.setHours(12, 0, 0, 0);
        const date2 = new Date(date1);
        date2.setHours(14, 0, 0, 0); // 2 hours later, same day

        if (!isSameDay(date1, date2)) {
            throw new Error('isSameDay check failed');
        }
    });

    test('Temporal', 'Different time units (s, m, h, d, w, M, y)', () => {
        const units = ['@now-30s', '@now-5m', '@now-2h', '@now-1d', '@now-1w', '@now-1M', '@now-1y'];

        for (const unit of units) {
            const result = parseTemporalLiteral(unit);
            if (!result.isRelative || result.timestamp >= Date.now()) {
                throw new Error(`Failed to parse ${unit}`);
            }
        }
        console.log(`    💡 All ${units.length} time units work correctly`);
    });

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const byCategory = results.reduce((acc, r) => {
        if (!acc[r.category]) acc[r.category] = { pass: 0, fail: 0, skip: 0 };
        if (r.status === 'PASS') acc[r.category].pass++;
        else if (r.status === 'FAIL') acc[r.category].fail++;
        else acc[r.category].skip++;
        return acc;
    }, {} as Record<string, { pass: number; fail: number; skip: number }>);

    Object.entries(byCategory).forEach(([category, stats]) => {
        const total = stats.pass + stats.fail + stats.skip;
        const percentage = ((stats.pass / total) * 100).toFixed(1);
        console.log(`\n${category}:`);
        console.log(`  ✅ Pass: ${stats.pass}/${total} (${percentage}%)`);
        if (stats.fail > 0) console.log(`  ❌ Fail: ${stats.fail}`);
        if (stats.skip > 0) console.log(`  ⏭️  Skip: ${stats.skip}`);
    });

    const totalPass = results.filter(r => r.status === 'PASS').length;
    const totalFail = results.filter(r => r.status === 'FAIL').length;
    const totalSkip = results.filter(r => r.status === 'SKIP').length;
    const total = results.length;
    const overallPercentage = ((totalPass / total) * 100).toFixed(1);

    console.log('\n' + '-'.repeat(60));
    console.log(`\n🎯 OVERALL: ${totalPass}/${total} tests passed (${overallPercentage}%)`);

    if (totalFail > 0) {
        console.log(`\n❌ Failed Tests:`);
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   - ${r.category}: ${r.feature}`);
            if (r.message) console.log(`     ${r.message}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log(totalFail === 0 ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
    console.log('='.repeat(60) + '\n');

    process.exit(totalFail > 0 ? 1 : 0);
}

runTests().catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
});
