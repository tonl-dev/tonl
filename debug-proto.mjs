const obj = { '__proto__': null, 'safeKey': 'safeValue' };

console.log('Object keys:', Object.keys(obj));
console.log('Object entries:', Object.entries(obj));
console.log('Has own property __proto__:', obj.hasOwnProperty('__proto__'));
console.log('Direct access:', obj['__proto__']);

// Check if it's inherited or own
console.log('Object.getPrototypeOf(obj):', Object.getPrototypeOf(obj));
console.log('obj.constructor.prototype:', obj.constructor.prototype);