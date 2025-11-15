console.log('Debugging fast-check object creation...');

// Try to replicate how fast-check creates {__proto__:null}
const obj1 = { '__proto__': null };
console.log('Method 1 - Object literal:');
console.log('   Object:', obj1);
console.log('   Reflect.ownKeys:', Reflect.ownKeys(obj1));
console.log('   __proto__ in object:', '__proto__' in obj1);
console.log('   hasOwnProperty __proto__:', Object.prototype.hasOwnProperty.call(obj1, '__proto__'));

// Test TONL round-trip
import { encodeTONL, decodeTONL } from './dist/index.js';

const tonl = encodeTONL(obj1);
console.log('TONL:', tonl);

const decoded = decodeTONL(tonl);
console.log('Decoded:', decoded);
console.log('Decoded keys:', Reflect.ownKeys(decoded));

const roundtripSuccess = JSON.stringify(Reflect.ownKeys(obj1)) === JSON.stringify(Reflect.ownKeys(decoded));
console.log('Round-trip success:', roundtripSuccess);

// Check what __proto__ actually contains in the literal
console.log('obj1.__proto__ value:', obj1.__proto__);
console.log('obj1 prototype:', Object.getPrototypeOf(obj1));