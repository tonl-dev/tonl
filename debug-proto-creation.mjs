console.log('Testing different ways to create __proto__ property...');

// Method 1: Object literal (doesn't work as expected)
const obj1 = { '__proto__': null, 'safeKey': 'safeValue' };
console.log('Method 1 - Object literal:');
console.log('   Object:', obj1);
console.log('   Reflect.ownKeys:', Reflect.ownKeys(obj1));
console.log('   Object.getPrototypeOf(obj1):', Object.getPrototypeOf(obj1));

// Method 2: Using Object.defineProperty to force __proto__ as own property
const obj2 = Object.create(null);
Object.defineProperty(obj2, '__proto__', {
  value: null,
  enumerable: true,
  writable: true,
  configurable: true
});
obj2.safeKey = 'safeValue';
console.log('Method 2 - Object.defineProperty:');
console.log('   Object:', obj2);
console.log('   Reflect.ownKeys:', Reflect.ownKeys(obj2));

// Method 3: Using bracket notation after creation
const obj3 = {};
obj3['__proto__'] = null;
obj3.safeKey = 'safeValue';
console.log('Method 3 - Bracket assignment:');
console.log('   Object:', obj3);
console.log('   Reflect.ownKeys:', Reflect.ownKeys(obj3));
console.log('   Object.getPrototypeOf(obj3):', Object.getPrototypeOf(obj3));