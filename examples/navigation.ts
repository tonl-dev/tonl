/**
 * TONL Navigation API - Examples
 */

import { TONLDocument } from 'tonl';

const data = {
  user: { name: 'Alice', age: 30 },
  users: [
    { id: 1, name: 'Bob' },
    { id: 2, name: 'Carol' }
  ]
};

const doc = TONLDocument.fromJSON(data);

// === Basic Iteration ===
console.log('=== Entries ===');
for (const [key, value] of doc.entries()) {
  console.log(`${key}:`, value);
}

console.log('\n=== Keys ===');
for (const key of doc.keys()) {
  console.log(key);
}

console.log('\n=== Values ===');
for (const value of doc.values()) {
  console.log(value);
}

// === Deep Iteration ===
console.log('\n=== Deep Keys ===');
for (const path of doc.deepKeys()) {
  console.log(path);
}

// === Tree Walking ===
console.log('\n=== Walk Tree ===');
doc.walk((path, value, depth) => {
  console.log(`[${'  '.repeat(depth)}] ${path}: ${JSON.stringify(value)}`);
});

// === Search ===
const alice = doc.find((v) => v.name === 'Alice');
console.log('\nFound Alice:', alice);

const allNumbers = doc.findAll((v) => typeof v === 'number');
console.log('\nAll numbers:', allNumbers);

// === Statistics ===
console.log('\nNode count:', doc.countNodes());
console.log('Has admin?', doc.some((v) => v.role === 'admin'));

const stats = doc.stats();
console.log('\nDocument Stats:', stats);
```
