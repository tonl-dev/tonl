import { encodeTONL, decodeTONL } from './dist/index.js';

const testValue = 9223372036854775807; // Number.MAX_SAFE_INTEGER

console.log('Testing bigNumber overflow...');
console.log('Original value:', testValue);
console.log('typeof original:', typeof testValue);
console.log('Number.MAX_SAFE_INTEGER:', Number.MAX_SAFE_INTEGER);
console.log('Value > MAX_SAFE_INTEGER:', testValue > Number.MAX_SAFE_INTEGER);

// Check what my fix does
if (Math.abs(testValue) > Number.MAX_SAFE_INTEGER) {
  console.log('Should be converted to string due to overflow detection');
  const bigintValue = BigInt(testValue);
  const numValue = parseInt(testValue, 10);
  console.log('BigInt(testValue):', bigintValue);
  console.log('parseInt(testValue):', numValue);
  console.log('BigInt(numValue) === BigInt(testValue):', BigInt(numValue) === bigintValue);
}

// Test TONL round-trip
const tonl = encodeTONL({
  bigNumber: testValue
});
console.log('TONL encoded:', tonl);

const decoded = decodeTONL(tonl);
console.log('Decoded:', decoded);
console.log('typeof decoded.bigNumber:', typeof decoded.bigNumber);
console.log('Value matches:', decoded.bigNumber === testValue);