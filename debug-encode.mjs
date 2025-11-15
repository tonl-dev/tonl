import { encodeTONL, decodeTONL } from './dist/index.js';

console.log('Testing encode/decode with detailed debug...');

const testObj = { '__proto__': null, 'safeKey': 'safeValue' };

console.log('1. Original object:');
console.log('   Object:', testObj);
console.log('   Reflect.ownKeys:', Reflect.ownKeys(testObj));

const tonl = encodeTONL(testObj);
console.log('2. TONL output:');
console.log('   ', tonl);

const decoded = decodeTONL(tonl);
console.log('3. Decoded object:');
console.log('   Object:', decoded);
console.log('   Reflect.ownKeys:', Reflect.ownKeys(decoded));

console.log('4. Comparison:');
console.log('   Original keys:', Reflect.ownKeys(testObj).sort());
console.log('   Decoded keys:', Reflect.ownKeys(decoded).sort());
console.log('   Keys match:', JSON.stringify(Reflect.ownKeys(testObj).sort()) === JSON.stringify(Reflect.ownKeys(decoded).sort()));

// Check for exact match
const keysMatch = JSON.stringify(Reflect.ownKeys(testObj).sort()) === JSON.stringify(Reflect.ownKeys(decoded).sort());
if (keysMatch) {
  console.log('✅ Round-trip successful - keys preserved');
} else {
  console.log('❌ Round-trip failed - keys lost');
}