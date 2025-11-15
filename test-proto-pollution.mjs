import { encodeTONL, decodeTONL } from './dist/index.js';

console.log('Testing prototype pollution vulnerability...');

const maliciousInput = { '__proto__': null, 'safeKey': 'safeValue' };

console.log('Original object:', maliciousInput);
console.log('Original Object.prototype.toString:', Object.prototype.toString);

// Encode the malicious object
const tonl = encodeTONL(maliciousInput);
console.log('TONL output:');
console.log(tonl);

// Decode back
const decoded = decodeTONL(tonl);
console.log('Decoded object:', decoded);

// Check if prototype was polluted
console.log('Object.prototype.toString after decode:', Object.prototype.toString);

// Test with an empty object to see if prototype is corrupted
const emptyObj = {};
console.log('Empty object toString:', emptyObj.toString);

if (emptyObj.toString !== '[object Object]') {
  console.log('❌ PROTOTYPE POLLUTION DETECTED!');
} else {
  console.log('✅ No prototype pollution');
}