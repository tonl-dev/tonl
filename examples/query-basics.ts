/**
 * TONL Query API - Basic Examples
 */

import { TONLDocument } from 'tonl';

// Sample data
const sampleData = {
  user: {
    id: 1,
    name: 'Alice Smith',
    email: 'alice@company.com',
    profile: {
      age: 30,
      city: 'New York',
      verified: true
    }
  },
  users: [
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'user', active: true },
    { id: 3, name: 'Carol', role: 'editor', active: false }
  ],
  products: [
    { id: 101, name: 'Widget', price: 29.99 },
    { id: 102, name: 'Gadget', price: 49.99 }
  ]
};

// Create document
const doc = TONLDocument.fromJSON(sampleData);

// === Simple Property Access ===
console.log('User name:', doc.get('user.name'));                    // 'Alice Smith'
console.log('User age:', doc.get('user.profile.age'));              // 30
console.log('First user:', doc.get('users[0]'));                    // { id: 1, ... }

// === Array Access ===
console.log('First user name:', doc.get('users[0].name'));          // 'Alice'
console.log('Last user:', doc.get('users[-1]'));                    // { id: 3, ... }

// === Wildcards ===
console.log('All user names:', doc.query('users[*].name'));         // ['Alice', 'Bob', 'Carol']
console.log('All product prices:', doc.query('products[*].price')); // [29.99, 49.99]

// === Filters ===
const admins = doc.query('users[?(@.role == "admin")]');
console.log('Admins:', admins);                                     // [{ id: 1, ... }]

const activeUsers = doc.query('users[?(@.active == true)]');
console.log('Active users:', activeUsers.length);                   // 2

const expensive = doc.query('products[?(@.price > 30)]');
console.log('Expensive products:', expensive);                      // [{ id: 102, ... }]

// === Recursive Descent ===
const allIds = doc.query('$..id');
console.log('All IDs:', allIds);                                    // [1, 1, 2, 3, 101, 102]

const allNames = doc.query('$..name');
console.log('All names:', allNames);                                // ['Alice Smith', 'Alice', 'Bob', 'Carol', 'Widget', 'Gadget']

// === Helpers ===
console.log('User exists:', doc.exists('user'));                    // true
console.log('Admin exists:', doc.exists('admin'));                  // false
console.log('Name type:', doc.typeOf('user.name'));                 // 'string'
console.log('Users type:', doc.typeOf('users'));                    // 'array'
```
