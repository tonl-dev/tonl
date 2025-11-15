import { encodeTONL, decodeTONL } from './dist/index.js';

console.log('Testing BUG-013 fix with proper __proto__ property...');

// Create object with __proto__ as actual own property
const obj = Object.create(null);
Object.defineProperty(obj, '__proto__', {
  value: null,
  enumerable: true,
  writable: true,
  configurable: true
});
obj.safeKey = 'safeValue';

console.log('Original object:');
console.log('   Object:', obj);
console.log('   Reflect.ownKeys:', Reflect.ownKeys(obj));

const tonl = encodeTONL(obj);
console.log('TONL output:');
console.log(tonl);

const decoded = decodeTONL(tonl);
console.log('Decoded object:');
console.log('   Object:', decoded);
console.log('   Reflect.ownKeys:', Reflect.ownKeys(decoded));

// Check round-trip
const originalKeys = Reflect.ownKeys(obj).sort();
const decodedKeys = Reflect.ownKeys(decoded).sort();
const keysMatch = JSON.stringify(originalKeys) === JSON.stringify(decodedKeys);

console.log('Round-trip test:');
console.log('   Original keys:', originalKeys);
console.log('   Decoded keys:', decodedKeys);
console.log('   Keys match:', keysMatch);

if (keysMatch) {
  console.log('✅ BUG-013 FIX SUCCESSFUL - __proto__ key preserved in round-trip');
} else {
  console.log('❌ BUG-013 FIX FAILED - __proto__ key still lost');
}

// Test with property-based test scenario
console.log('\nTesting property-based test scenario...');
const testObj = Object.create(null);
Object.defineProperty(testObj, '__proto__', {
  value: null,
  enumerable: true,
  writable: true,
  configurable: true
});

const testTonl = encodeTONL(testObj);
const testDecoded = decodeTONL(testTonl);

console.log('Input:', { '__proto__': null });
console.log('Encoded TONL:', testTonl.trim());
console.log('Decoded:', testDecoded);
console.log('Decoded keys:', Reflect.ownKeys(testDecoded));

const testKeysMatch = JSON.stringify(['__proto__']) === JSON.stringify(Reflect.ownKeys(testDecoded));
console.log('Property-based test fix:', testKeysMatch ? '✅ SUCCESS' : '❌ FAILED');