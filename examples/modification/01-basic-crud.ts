/**
 * TONL Modification API - Basic CRUD Operations
 *
 * This example demonstrates create, read, update, delete operations
 */

import { TONLDocument } from '../../dist/index.js';

console.log('=== TONL Modification API - Basic CRUD ===\n');

// Start with empty document
const doc = TONLDocument.fromJSON({});

// ============================================
// CREATE - Adding new data
// ============================================
console.log('1. CREATE Operations:');

// Simple property
doc.set('app.name', 'My Application');
console.log('   Created app.name:', doc.get('app.name'));

// Nested structure (auto path creation)
doc.set('app.config.database.host', 'localhost');
doc.set('app.config.database.port', 5432);
console.log('   Created nested config:', JSON.stringify(doc.get('app.config'), null, 2));

// Array creation
doc.set('users', []);
doc.push('users', { id: 1, name: 'Alice', role: 'admin' });
doc.push('users', { id: 2, name: 'Bob', role: 'user' });
console.log('   Created users array:', doc.get('users').length, 'users');
console.log('');

// ============================================
// READ - Querying data
// ============================================
console.log('2. READ Operations:');
console.log('   Get app name:', doc.get('app.name'));
console.log('   Get database config:', JSON.stringify(doc.get('app.config.database')));
console.log('   Get first user:', JSON.stringify(doc.get('users[0]')));
console.log('   Get all user names:', doc.query('users[*].name'));
console.log('');

// ============================================
// UPDATE - Modifying existing data
// ============================================
console.log('3. UPDATE Operations:');

// Update simple property
doc.set('app.name', 'My Awesome Application');
console.log('   Updated app name:', doc.get('app.name'));

// Update nested property
doc.set('app.config.database.port', 3306);
console.log('   Updated database port:', doc.get('app.config.database.port'));

// Update array element
doc.set('users[0].role', 'super-admin');
console.log('   Updated user role:', doc.get('users[0].role'));

// Merge object
doc.merge('users[1]', { email: 'bob@example.com', verified: true });
console.log('   Merged user data:', JSON.stringify(doc.get('users[1]')));
console.log('');

// ============================================
// DELETE - Removing data
// ============================================
console.log('4. DELETE Operations:');

// Delete property
doc.set('temp.data', 'temporary');
console.log('   Before delete:', doc.exists('temp.data'));
doc.delete('temp.data');
console.log('   After delete:', doc.exists('temp.data'));

// Delete from nested object
doc.set('app.config.debug', true);
console.log('   Before delete debug:', doc.exists('app.config.debug'));
doc.delete('app.config.debug');
console.log('   After delete debug:', doc.exists('app.config.debug'));
console.log('');

// ============================================
// METHOD CHAINING
// ============================================
console.log('5. Method Chaining:');

doc
  .set('app.version', '2.0.1')
  .set('app.environment', 'production')
  .set('app.config.cache', true);

console.log('   Version:', doc.get('app.version'));
console.log('   Environment:', doc.get('app.environment'));
console.log('   Cache enabled:', doc.get('app.config.cache'));
console.log('');

// ============================================
// FINAL STATE
// ============================================
console.log('6. Final Document State:');
console.log(JSON.stringify(doc.toJSON(), null, 2));

console.log('\n✅ All CRUD operations completed successfully!');
