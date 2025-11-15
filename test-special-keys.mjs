import { encodeTONL, decodeTONL } from './dist/index.js';

console.log('Testing special characters in keys...');

const testCases = [
  // Problematic key cases
  { 'key:with:colons': 'value1' },
  { 'key#with#hash': 'value2' },
  { 'key.with.dots': 'value3' },
  { 'key-with-dashes': 'value4' },
  { 'key with spaces': 'value5' },
  { 'key.with.everything:together#$%^&*()': 'value6' },

  // Edge cases
  { '': 'empty_key_value' }, // empty key
  { '   ': 'whitespace_key' }, // whitespace only key
  { 'null': 'null_as_key' }, // reserved word as key
  { 'undefined': 'undefined_as_key' }, // reserved word as key
  { '123': 'numeric_key' }, // numeric key
  { '@special': 'at_symbol' }, // at symbol
  { '!exclamation': 'exclamation' }, // exclamation mark

  // Mixed cases
  {
    'normal_key': 'normal_value',
    'special:character#key': 'special_value',
    'another@weird$key': 'another_value'
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\n=== Test Case ${index + 1} ===`);
  console.log('Input:', testCase);

  try {
    // Test encode
    const tonl = encodeTONL(testCase);
    console.log('TONL encoded successfully:');
    console.log(tonl);

    // Test decode
    const decoded = decodeTONL(tonl);
    console.log('Decoded:', decoded);

    // Check round-trip success
    const inputKeys = Object.keys(testCase).sort();
    const decodedKeys = Object.keys(decoded).sort();
    const keysMatch = JSON.stringify(inputKeys) === JSON.stringify(decodedKeys);

    // Check values
    const valuesMatch = JSON.stringify(testCase) === JSON.stringify(decoded);

    console.log('Input keys:', inputKeys);
    console.log('Decoded keys:', decodedKeys);
    console.log('Keys match:', keysMatch);
    console.log('Values match:', valuesMatch);

    if (keysMatch && valuesMatch) {
      console.log('✅ Round-trip SUCCESS');
    } else {
      console.log('❌ Round-trip FAILED');
      if (!keysMatch) {
        console.log('  → Keys lost or altered');
      }
      if (!valuesMatch) {
        console.log('  → Values lost or altered');
      }
    }

  } catch (error) {
    console.log('❌ ERROR during processing:');
    console.log('  Error:', error.message);
    console.log('  Stack:', error.stack);
  }
});

console.log('\n=== Summary ===');
console.log('All special character key tests completed.');