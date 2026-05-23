/**
 * TONL Query API - Fuzzy String Matching Examples
 *
 * This example demonstrates fuzzy matching capabilities added in v2.4.0:
 * - Levenshtein distance (edit distance)
 * - Jaro-Winkler similarity (optimized for short strings)
 * - Dice coefficient (bigram-based similarity)
 * - Soundex/Metaphone phonetic matching
 * - fuzzyMatch(), fuzzySearch(), fuzzyContains()
 * - ~= operator for fuzzy equality
 */

import { TONLDocument } from '../../dist/index.js';
import {
  levenshteinDistance,
  levenshteinSimilarity,
  jaroSimilarity,
  jaroWinklerSimilarity,
  diceSimilarity,
  soundex,
  metaphone,
  soundsLike,
  soundsLikeMetaphone,
  fuzzyMatch,
  similarity,
  fuzzyContains,
  fuzzyStartsWith,
  fuzzyEndsWith,
  fuzzySearch
} from '../../dist/query/fuzzy-matcher.js';

console.log('=== TONL Query API - Fuzzy Matching (v2.4.0) ===\n');

// ============================================
// 1. LEVENSHTEIN DISTANCE
// ============================================
console.log('1. LEVENSHTEIN DISTANCE (Edit Distance)');
console.log('─'.repeat(50));
console.log('   Measures minimum single-character edits needed.\n');

const levenshteinExamples = [
  ['kitten', 'sitting'],
  ['hello', 'hallo'],
  ['world', 'word'],
  ['test', 'testing'],
  ['JavaScript', 'JavaScrpt'],
  ['algorithm', 'altruistic']
];

console.log('   String A          String B          Distance  Similarity');
console.log('   ─────────────────────────────────────────────────────────');
for (const [a, b] of levenshteinExamples) {
  const dist = levenshteinDistance(a, b);
  const sim = levenshteinSimilarity(a, b);
  console.log(`   ${a.padEnd(16)} ${b.padEnd(16)} ${String(dist).padStart(4)}      ${(sim * 100).toFixed(1)}%`);
}

// ============================================
// 2. JARO-WINKLER SIMILARITY
// ============================================
console.log('\n\n2. JARO-WINKLER SIMILARITY');
console.log('─'.repeat(50));
console.log('   Optimized for short strings (names, typos).\n');

const jaroExamples = [
  ['MARTHA', 'MARHTA'],
  ['JONES', 'JOHNSON'],
  ['DWAYNE', 'DUANE'],
  ['John', 'Jon'],
  ['Michael', 'Micheal'],
  ['Robert', 'Rubert']
];

console.log('   String A      String B      Jaro      Jaro-Winkler');
console.log('   ─────────────────────────────────────────────────');
for (const [a, b] of jaroExamples) {
  const jaro = jaroSimilarity(a, b);
  const jaroWinkler = jaroWinklerSimilarity(a, b);
  console.log(`   ${a.padEnd(12)} ${b.padEnd(12)} ${(jaro * 100).toFixed(1).padStart(5)}%    ${(jaroWinkler * 100).toFixed(1).padStart(5)}%`);
}

// ============================================
// 3. DICE COEFFICIENT
// ============================================
console.log('\n\n3. DICE COEFFICIENT (Bigram Similarity)');
console.log('─'.repeat(50));
console.log('   Based on shared character pairs (bigrams).\n');

const diceExamples = [
  ['night', 'nacht'],
  ['hello', 'hallo'],
  ['context', 'contact'],
  ['programming', 'programmer']
];

console.log('   String A          String B          Dice Coefficient');
console.log('   ─────────────────────────────────────────────────────');
for (const [a, b] of diceExamples) {
  const dice = diceSimilarity(a, b);
  console.log(`   ${a.padEnd(16)} ${b.padEnd(16)} ${(dice * 100).toFixed(1)}%`);
}

// ============================================
// 4. PHONETIC MATCHING
// ============================================
console.log('\n\n4. PHONETIC MATCHING (Soundex & Metaphone)');
console.log('─'.repeat(50));
console.log('   Matches words that sound alike.\n');

const phoneticExamples = [
  ['Smith', 'Smyth'],
  ['Robert', 'Rupert'],
  ['Meyer', 'Meier'],
  ['Johnson', 'Jonson'],
  ['Wright', 'Rite'],
  ['Catherine', 'Katherine']
];

console.log('   Name A          Name B          Soundex A   Soundex B   Match');
console.log('   ───────────────────────────────────────────────────────────────');
for (const [a, b] of phoneticExamples) {
  const sndxA = soundex(a);
  const sndxB = soundex(b);
  const match = soundsLike(a, b) ? '✓' : '✗';
  console.log(`   ${a.padEnd(14)} ${b.padEnd(14)} ${sndxA.padEnd(10)} ${sndxB.padEnd(10)} ${match}`);
}

console.log('\n   Metaphone Examples:');
console.log('   ───────────────────');
const metaphoneExamples = [
  ['phone', 'fone'],
  ['knife', 'nife'],
  ['psychology', 'sycology']
];

for (const [a, b] of metaphoneExamples) {
  const metaA = metaphone(a);
  const metaB = metaphone(b);
  const match = soundsLikeMetaphone(a, b) ? '✓' : '✗';
  console.log(`   ${a.padEnd(12)} ${b.padEnd(12)} => ${metaA.primary.padEnd(6)} ${metaB.primary.padEnd(6)} ${match}`);
}

// ============================================
// 5. FUZZY MATCH FUNCTION
// ============================================
console.log('\n\n5. FUZZY MATCH FUNCTION');
console.log('─'.repeat(50));
console.log('   Comprehensive matching with configurable threshold.\n');

console.log('   Default threshold (0.8):');
const fuzzyPairs = [
  ['hello', 'helo'],
  ['world', 'wrold'],
  ['JavaScript', 'javascript'],
  ['algorithm', 'algoritm'],
  ['TypeScript', 'TipeScript']
];

for (const [a, b] of fuzzyPairs) {
  const match = fuzzyMatch(a, b);
  const sim = similarity(a, b);
  console.log(`   "${a}" ~ "${b}" => ${match ? '✓ Match' : '✗ No match'} (${(sim * 100).toFixed(1)}%)`);
}

console.log('\n   Custom threshold (0.6):');
for (const [a, b] of fuzzyPairs) {
  const match = fuzzyMatch(a, b, { threshold: 0.6 });
  console.log(`   "${a}" ~ "${b}" => ${match ? '✓ Match' : '✗ No match'}`);
}

console.log('\n   Case-sensitive mode:');
console.log(`   "Hello" ~ "hello" (default):      ${fuzzyMatch('Hello', 'hello') ? '✓' : '✗'}`);
console.log(`   "Hello" ~ "hello" (case-sens):    ${fuzzyMatch('Hello', 'hello', { caseSensitive: true }) ? '✓' : '✗'}`);

// ============================================
// 6. FUZZY SEARCH
// ============================================
console.log('\n\n6. FUZZY SEARCH');
console.log('─'.repeat(50));
console.log('   Find best matches from a list of candidates.\n');

const languages = [
  'JavaScript', 'TypeScript', 'Python', 'Ruby', 'Rust',
  'Go', 'Java', 'C++', 'C#', 'PHP', 'Swift', 'Kotlin'
];

console.log('   Searching for "JavaScrpt":');
const jsResults = fuzzySearch('JavaScrpt', languages, { limit: 3 });
jsResults.forEach((r, i) => {
  console.log(`     ${i + 1}. ${r.value} (score: ${(r.similarity * 100).toFixed(1)}%)`);
});

console.log('\n   Searching for "Pyton":');
const pyResults = fuzzySearch('Pyton', languages, { limit: 3 });
pyResults.forEach((r, i) => {
  console.log(`     ${i + 1}. ${r.value} (score: ${(r.similarity * 100).toFixed(1)}%)`);
});

console.log('\n   Searching for "Typscript":');
const tsResults = fuzzySearch('Typscript', languages, { limit: 3 });
tsResults.forEach((r, i) => {
  console.log(`     ${i + 1}. ${r.value} (score: ${(r.similarity * 100).toFixed(1)}%)`);
});

// ============================================
// 7. FUZZY STRING OPERATIONS
// ============================================
console.log('\n\n7. FUZZY STRING OPERATIONS');
console.log('─'.repeat(50));

console.log('\n   fuzzyContains:');
console.log(`   "hello world" contains "world":  ${fuzzyContains('hello world', 'world') ? '✓' : '✗'}`);
console.log(`   "hello world" contains "wrold":  ${fuzzyContains('hello world', 'wrold', { threshold: 0.7 }) ? '✓' : '✗'}`);
console.log(`   "programming" contains "gram":   ${fuzzyContains('programming', 'gram') ? '✓' : '✗'}`);

console.log('\n   fuzzyStartsWith:');
console.log(`   "JavaScript" starts with "Java":    ${fuzzyStartsWith('JavaScript', 'Java') ? '✓' : '✗'}`);
console.log(`   "JavaScript" starts with "Jva":     ${fuzzyStartsWith('JavaScript', 'Jva', { threshold: 0.6 }) ? '✓' : '✗'}`);
console.log(`   "TypeScript" starts with "Type":    ${fuzzyStartsWith('TypeScript', 'Type') ? '✓' : '✗'}`);

console.log('\n   fuzzyEndsWith:');
console.log(`   "JavaScript" ends with "Script":   ${fuzzyEndsWith('JavaScript', 'Script') ? '✓' : '✗'}`);
console.log(`   "TypeScript" ends with "Script":   ${fuzzyEndsWith('TypeScript', 'Script') ? '✓' : '✗'}`);
console.log(`   "JavaScript" ends with "Scrit":    ${fuzzyEndsWith('JavaScript', 'Scrit', { threshold: 0.7 }) ? '✓' : '✗'}`);

// ============================================
// 8. REAL-WORLD USE CASES
// ============================================
console.log('\n\n8. REAL-WORLD USE CASES');
console.log('─'.repeat(50));

// User database
const users = {
  users: [
    { id: 1, name: 'John Smith', email: 'john@example.com' },
    { id: 2, name: 'Jon Smyth', email: 'jon@example.com' },
    { id: 3, name: 'Jane Doe', email: 'jane@example.com' },
    { id: 4, name: 'Michael Johnson', email: 'michael@example.com' },
    { id: 5, name: 'Micheal Jonson', email: 'micheal@example.com' },
    { id: 6, name: 'Robert Wilson', email: 'robert@example.com' },
    { id: 7, name: 'Rupert Wilson', email: 'rupert@example.com' }
  ]
};

const doc = TONLDocument.fromJSON(users);

// Scenario 1: Find duplicate users
console.log('\n   🔍 Finding potential duplicate users:');
const allUsers = doc.query('users[*]') as any[];
const names = allUsers.map(u => u.name);

for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    if (fuzzyMatch(names[i], names[j], { threshold: 0.7 })) {
      const sim = similarity(names[i], names[j]);
      console.log(`     Potential duplicate: "${names[i]}" ↔ "${names[j]}" (${(sim * 100).toFixed(0)}%)`);
    }
  }
}

// Scenario 2: Typo-tolerant search
console.log('\n   🔎 Typo-tolerant user search:');
const searchTerms = ['Jon Smit', 'Michal', 'Robert'];
for (const term of searchTerms) {
  const matches = fuzzySearch(term, names, { threshold: 0.6, limit: 2 });
  console.log(`     Search "${term}": ${matches.map(m => m.value).join(', ') || 'No matches'}`);
}

// Scenario 3: Phonetic name matching
console.log('\n   🔊 Phonetic name matching:');
const soundAlikeGroups: string[][] = [];
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    const firstName1 = names[i].split(' ')[0];
    const firstName2 = names[j].split(' ')[0];
    if (soundsLike(firstName1, firstName2)) {
      console.log(`     Sounds alike: "${firstName1}" ~ "${firstName2}"`);
    }
  }
}

// ============================================
// 9. PRODUCT SEARCH EXAMPLE
// ============================================
console.log('\n\n9. PRODUCT SEARCH EXAMPLE');
console.log('─'.repeat(50));

const products = [
  'MacBook Pro 16"',
  'MacBook Air M2',
  'iPhone 15 Pro',
  'iPad Pro 12.9"',
  'Apple Watch Ultra',
  'AirPods Pro',
  'Samsung Galaxy S24',
  'Google Pixel 8',
  'Microsoft Surface Pro'
];

const typoSearches = [
  'macbok pro',
  'iphone',
  'airpods',
  'samsng galaxy',
  'gogle pixel'
];

console.log('\n   Handling common typos in product search:');
for (const query of typoSearches) {
  const results = fuzzySearch(query, products, { limit: 2, threshold: 0.5 });
  console.log(`\n   Query: "${query}"`);
  results.forEach((r, i) => {
    console.log(`     ${i + 1}. ${r.value} (${(r.similarity * 100).toFixed(0)}% match)`);
  });
}

// ============================================
// 10. ALGORITHM COMPARISON
// ============================================
console.log('\n\n10. ALGORITHM COMPARISON');
console.log('─'.repeat(50));
console.log('   Comparing different similarity algorithms:\n');

const testPairs = [
  ['hello', 'hallo'],
  ['John', 'Jon'],
  ['JavaScript', 'TypeScript'],
  ['algorithm', 'logarithm']
];

console.log('   Pair                          Levenshtein  Jaro-Winkler  Dice');
console.log('   ───────────────────────────────────────────────────────────────');
for (const [a, b] of testPairs) {
  const lev = levenshteinSimilarity(a, b);
  const jw = jaroWinklerSimilarity(a, b);
  const dice = diceSimilarity(a, b);
  console.log(`   ${(a + ' vs ' + b).padEnd(28)} ${(lev * 100).toFixed(1).padStart(6)}%     ${(jw * 100).toFixed(1).padStart(6)}%      ${(dice * 100).toFixed(1).padStart(5)}%`);
}

console.log('\n   💡 Tips:');
console.log('      - Levenshtein: Best for detecting typos/edits');
console.log('      - Jaro-Winkler: Best for short strings (names)');
console.log('      - Dice: Best for longer text comparison');
console.log('      - Soundex/Metaphone: Best for phonetic matching');

console.log('\n✅ All fuzzy matching examples work perfectly!');
