/**
 * TONL Modification API - Transactions & Change Tracking
 *
 * This example demonstrates snapshots, diff, and safe modifications
 */

import { TONLDocument } from '../../dist/index.js';

console.log('=== TONL Modification API - Transactions ===\n');

// Initial data
const doc = TONLDocument.fromJSON({
  config: {
    version: '1.0.0',
    features: {
      darkMode: false,
      analytics: true
    }
  },
  users: [
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Bob', active: true }
  ]
});

// ============================================
// SNAPSHOT - Create save point
// ============================================
console.log('1. Create Snapshot:');
const snapshot = doc.snapshot();
console.log('   Snapshot created at version:', snapshot.get('config.version'));
console.log('');

// ============================================
// MAKE CHANGES
// ============================================
console.log('2. Make Changes:');
doc.set('config.version', '2.0.1');
doc.set('config.features.darkMode', true);
doc.set('config.features.newFeature', 'enabled');
doc.push('users', { id: 3, name: 'Carol', active: true });

console.log('   Version updated to:', doc.get('config.version'));
console.log('   Dark mode:', doc.get('config.features.darkMode'));
console.log('   New feature:', doc.get('config.features.newFeature'));
console.log('   Users count:', doc.get('users').length);
console.log('');

// ============================================
// DIFF - Track changes
// ============================================
console.log('3. Track Changes (Diff):');
const diff = doc.diff(snapshot);

console.log('   Total changes:', diff.summary.total);
console.log('   Modified:', diff.summary.modified);
console.log('   Added:', diff.summary.added);
console.log('   Deleted:', diff.summary.deleted);
console.log('');

console.log('   Detailed changes:');
console.log(doc.diffString(snapshot));
console.log('');

// ============================================
// ROLLBACK Example
// ============================================
console.log('4. Rollback Example:');
console.log('   Current version:', doc.get('config.version'));

// Make risky change
doc.set('config.version', '3.0.0-beta');
console.log('   After risky change:', doc.get('config.version'));

// Rollback by restoring snapshot
const rolledBack = snapshot.snapshot();
console.log('   After rollback:', rolledBack.get('config.version'));
console.log('');

// ============================================
// SAFE MODIFICATION Pattern
// ============================================
console.log('5. Safe Modification Pattern:');

function safeUpdate(doc: TONLDocument, updates: () => void): boolean {
  const backup = doc.snapshot();

  try {
    updates();

    // Validate changes
    const diff = doc.diff(backup);
    console.log('   Changes made:', diff.summary.total);

    return true;
  } catch (error) {
    console.error('   Update failed, rolling back...', error);
    // In real scenario, restore from backup
    return false;
  }
}

const success = safeUpdate(doc, () => {
  doc.set('config.timeout', 5000);
  doc.set('config.retries', 3);
});

console.log('   Update successful:', success);
console.log('   New timeout:', doc.get('config.timeout'));
console.log('   New retries:', doc.get('config.retries'));
console.log('');

console.log('✅ All transaction operations completed successfully!');
