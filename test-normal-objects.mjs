import { encodeTONL, decodeTONL } from './dist/index.js';

console.log('Testing normal objects with BUG-013 targeted fix...');

const normalObj = {
  name: 'Alice',
  age: 30,
  email: 'alice@example.com',
  active: true
};

console.log('Normal object:');
console.log('   Object:', normalObj);
console.log('   Reflect.ownKeys:', Reflect.ownKeys(normalObj));
console.log('   Object.prototype:', Object.getPrototypeOf(normalObj) === Object.prototype);

const tonl = encodeTONL(normalObj);
console.log('TONL output:');
console.log(tonl);

const decoded = decodeTONL(tonl);
console.log('Decoded object:');
console.log('   Object:', decoded);
console.log('   Reflect.ownKeys:', Reflect.ownKeys(decoded));
console.log('   Object.prototype:', Object.getPrototypeOf(decoded) === Object.prototype);

// Check round-trip
const keysMatch = JSON.stringify(Reflect.ownKeys(normalObj).sort()) ===
                  JSON.stringify(Reflect.ownKeys(decoded).sort());
const protoMatch = Object.getPrototypeOf(normalObj) === Object.getPrototypeOf(decoded);
const valuesMatch = JSON.stringify(normalObj) === JSON.stringify(decoded);

console.log('Round-trip test:');
console.log('   Keys match:', keysMatch);
console.log('   Prototype match:', protoMatch);
console.log('   Values match:', valuesMatch);

if (keysMatch && protoMatch && valuesMatch) {
  console.log('✅ Normal objects work correctly - no regression');
} else {
  console.log('❌ Normal objects have regression');
}