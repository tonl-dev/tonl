import { encodeTONL, decodeTONL } from './dist/index.js';

console.log('Testing JavaScript precision vs TONL precision...');

// The original failing test case
const testCases = [
  { name: 'Number.MAX_SAFE_INTEGER', value: Number.MAX_SAFE_INTEGER, shouldPreserveAsNumber: true },
  { name: 'Number.MAX_SAFE_INTEGER + 1', value: Number.MAX_SAFE_INTEGER + 1, shouldPreserveAsNumber: false }, // Should be string
  { name: 'Number.MAX_SAFE_INTEGER * 2', value: Number.MAX_SAFE_INTEGER * 2, shouldPreserveAsNumber: false }, // Should be string
  { name: '9.223372e+18', value: 9.223372e+18, shouldPreserveAsNumber: true }, // Should be number (within safe range)
  { name: '1e21', value: 1e21, shouldPreserveAsNumber: false } // Should be string (beyond safe range)
];

testCases.forEach(({ name, value, shouldPreserveAsNumber }, index) => {
  console.log(`\n=== Test Case ${index + 1}: ${name} ===`);
  console.log('Value:', value);
  console.log('typeof:', typeof value);
  console.log('Should preserve as number:', shouldPreserveAsNumber);

  const original = { testValue: value };
  const encoded = encodeTONL(original, { includeTypes: true });
  const decoded = decodeTONL(encoded);

  console.log('Encoded TONL:', encoded.trim());
  console.log('Decoded:', decoded);
  console.log('Decoded type:', typeof decoded.testValue);
  console.log('Value matches:', decoded.testValue === value);
  console.log('Type matches:', typeof decoded.testValue === (shouldPreserveAsNumber ? 'number' : 'string'));

  const correctHandling =
    decoded.testValue === value &&
    typeof decoded.testValue === (shouldPreserveAsNumber ? 'number' : 'string');

  if (correctHandling) {
    console.log('✅ CORRECT HANDLING');
  } else {
    console.log('❌ INCORRECT HANDLING');
    console.log('  Expected type:', shouldPreserveAsNumber ? 'number' : 'string');
    console.log('  Actual type:', typeof decoded.testValue);
    console.log('  Expected value:', value);
    console.log('  Actual value:', decoded.testValue);
  }
});