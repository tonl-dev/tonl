console.log('Number.MAX_SAFE_INTEGER:', Number.MAX_SAFE_INTEGER);
console.log('Number.MAX_SAFE_INTEGER + 1:', Number.MAX_SAFE_INTEGER + 1);
console.log('String(Number.MAX_SAFE_INTEGER + 1):', String(Number.MAX_SAFE_INTEGER + 1));

// Test the specific case
import { encodeTONL, decodeTONL } from './dist/index.js';

const original = {
  bigNumber: Number.MAX_SAFE_INTEGER + 1
};

console.log('Original object:', original);
console.log('Original bigNumber type:', typeof original.bigNumber);
console.log('Original bigNumber value:', original.bigNumber);

const encoded = encodeTONL(original, { includeTypes: true });
console.log('TONL:', encoded);

const decoded = decodeTONL(encoded);
console.log('Decoded:', decoded);
console.log('Decoded bigNumber type:', typeof decoded.bigNumber);
console.log('Decoded bigNumber value:', decoded.bigNumber);

// Check if our line parser fix is working
const testValue = String(Number.MAX_SAFE_INTEGER + 1);
console.log('Test value:', testValue);
console.log('Test value length:', testValue.length);