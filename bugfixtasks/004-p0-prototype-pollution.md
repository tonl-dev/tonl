# Bug Fix 004: Prototype Pollution in Query Evaluator

**Bug ID:** BF004
**Bug Name:** Prototype Pollution
**Priority:** P0 - CRITICAL
**Severity:** CRITICAL
**Estimated Effort:** 2 days
**Status:** 🔴 Not Started
**CWE:** CWE-1321 (Improperly Controlled Modification of Object Prototype Attributes)
**CVE:** Pending Assignment

---

## Overview

### Summary
The query evaluator accesses object properties without prototype chain protection, allowing attackers to pollute `Object.prototype` via special properties (`__proto__`, `constructor`, `prototype`), potentially leading to remote code execution, authentication bypass, or privilege escalation.

### Impact
**CRITICAL - Potential Remote Code Execution**
- Prototype pollution leading to RCE
- Authentication bypass
- Privilege escalation
- Data injection into all objects
- Application-wide corruption

### Affected Versions
All versions: v0.1.0 - v0.8.0

---

## Technical Details

### Vulnerable Code

**Location 1:** `src/query/evaluator.ts:216`
```typescript
// VULNERABLE CODE
return current[node.name];
// Allows: __proto__, constructor, prototype access
```

**Location 2:** `src/query/evaluator.ts:258`
```typescript
// VULNERABLE CODE
return Object.values(current);
// No protection against polluted prototypes
```

### Root Cause

1. **No Property Name Validation**: Direct property access without checks
2. **No Prototype Protection**: Can access `__proto__`, `constructor`
3. **No hasOwnProperty Check**: Inherited properties accessible

### Attack Vectors

**Attack 1: Prototype Pollution via Query**
```javascript
const doc = TONLDocument.fromJSON({
  user: { name: 'Alice' }
});

// Pollute prototype
doc.query('$.__proto__.isAdmin');
// or
doc.set('__proto__.isAdmin', true);

// Now ALL objects have isAdmin = true!
const newObj = {};
console.log(newObj.isAdmin); // true - polluted!
```

**Attack 2: Constructor Pollution**
```javascript
doc.query('$.constructor.prototype.polluted');
doc.set('constructor.prototype.hacked', 'yes');

// All new objects now have 'hacked' property
```

**Attack 3: Real-World Exploit Chain**
```javascript
// Step 1: Pollute prototype with malicious code
doc.set('__proto__.exec', 'malicious_code');

// Step 2: Trigger execution in vulnerable code path
// If application uses obj.exec anywhere without checking:
const obj = {};
if (obj.exec) {
  eval(obj.exec); // Executes malicious code!
}
```

---

## Security Fix

### Proposed Solution

**Multi-Layer Protection:**

1. **Blacklist Dangerous Properties**
2. **Use hasOwnProperty Checks**
3. **Object Freezing**
4. **Safe Property Access**

### Implementation

```typescript
// src/query/evaluator.ts

// Dangerous property names (blacklist)
const DANGEROUS_PROPERTIES = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

private evaluateProperty(current: any, node: PropertyNode): any {
  // 1. Validate current value
  if (current === null || current === undefined) {
    return undefined;
  }

  if (typeof current !== 'object' || Array.isArray(current)) {
    return undefined;
  }

  // 2. Check for dangerous property names
  if (DANGEROUS_PROPERTIES.has(node.name)) {
    throw new SecurityError(
      `Access to '${node.name}' is forbidden (prototype pollution protection)`
    );
  }

  // 3. Use hasOwnProperty check (prevent prototype access)
  if (!Object.prototype.hasOwnProperty.call(current, node.name)) {
    return undefined;
  }

  // 4. Safe property access
  return current[node.name];
}

// For setter operations
private setProperty(current: any, path: string, value: any): void {
  const parts = path.split('.');
  const propName = parts[parts.length - 1];

  // 1. Block dangerous properties
  if (DANGEROUS_PROPERTIES.has(propName)) {
    throw new SecurityError(
      `Cannot set '${propName}': prototype pollution protection`
    );
  }

  // 2. Use Object.defineProperty for safety
  Object.defineProperty(current, propName, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

// For Object.values/keys operations
private getSafeValues(obj: any): any[] {
  // Only get own properties, not inherited
  return Object.keys(obj)
    .filter(key => !DANGEROUS_PROPERTIES.has(key))
    .filter(key => Object.prototype.hasOwnProperty.call(obj, key))
    .map(key => obj[key]);
}
```

### Additional Protection: Object Freezing

```typescript
// Freeze Object.prototype to prevent pollution
Object.freeze(Object.prototype);
Object.freeze(Object);
Object.freeze(Array.prototype);
Object.freeze(Array);

// Note: This is aggressive and may break some libraries
// Use cautiously or in isolated environments
```

---

## Testing

### Exploit Tests

```typescript
// test/security/exploits/BF004-prototype-pollution.exploit.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TONLDocument } from '../../../src/document.js';
import { SecurityError } from '../../../src/errors/index.js';

describe('BF004: Prototype Pollution', () => {
  beforeEach(() => {
    // Clean up any pollution from previous tests
    delete Object.prototype.polluted;
    delete Object.prototype.isAdmin;
  });

  it('should block __proto__ access in queries', () => {
    const doc = TONLDocument.fromJSON({ user: { name: 'Alice' } });

    assert.throws(
      () => doc.query('$.__proto__'),
      SecurityError,
      "Should block __proto__ access"
    );
  });

  it('should block constructor access in queries', () => {
    const doc = TONLDocument.fromJSON({ user: { name: 'Alice' } });

    assert.throws(
      () => doc.query('$.constructor'),
      SecurityError,
      "Should block constructor access"
    );
  });

  it('should block prototype access in queries', () => {
    const doc = TONLDocument.fromJSON({ user: { name: 'Alice' } });

    assert.throws(
      () => doc.query('$.prototype'),
      SecurityError,
      "Should block prototype access"
    );
  });

  it('should block __proto__ in set operations', () => {
    const doc = TONLDocument.fromJSON({ user: {} });

    assert.throws(
      () => doc.set('__proto__.polluted', 'yes'),
      SecurityError,
      "Should block __proto__ set"
    );

    // Verify no pollution occurred
    const testObj = {};
    assert.strictEqual(testObj.polluted, undefined);
  });

  it('should block constructor.prototype pollution', () => {
    const doc = TONLDocument.fromJSON({ user: {} });

    assert.throws(
      () => doc.set('constructor.prototype.polluted', 'yes'),
      SecurityError
    );

    const testObj = {};
    assert.strictEqual(testObj.polluted, undefined);
  });

  it('should not return inherited properties', () => {
    // Manually pollute for testing
    Object.prototype.inherited = 'bad';

    const doc = TONLDocument.fromJSON({
      user: { name: 'Alice' }
    });

    // Should NOT return inherited property
    const result = doc.get('user.inherited');
    assert.strictEqual(result, undefined);

    // Clean up
    delete Object.prototype.inherited;
  });

  it('should allow legitimate property access', () => {
    const doc = TONLDocument.fromJSON({
      user: {
        name: 'Alice',
        proto_name: 'valid', // Contains 'proto' but not dangerous
        constructor_id: '123' // Contains 'constructor' but not dangerous
      }
    });

    // These should work
    assert.strictEqual(doc.get('user.name'), 'Alice');
    assert.strictEqual(doc.get('user.proto_name'), 'valid');
    assert.strictEqual(doc.get('user.constructor_id'), '123');
  });

  it('should prevent pollution via nested paths', () => {
    const doc = TONLDocument.fromJSON({
      nested: { deep: {} }
    });

    assert.throws(
      () => doc.set('nested.deep.__proto__.polluted', 'yes'),
      SecurityError
    );

    const testObj = {};
    assert.strictEqual(testObj.polluted, undefined);
  });

  it('should prevent pollution via array access', () => {
    const doc = TONLDocument.fromJSON({
      items: [{}]
    });

    assert.throws(
      () => doc.set('items[0].__proto__.polluted', 'yes'),
      SecurityError
    );
  });
});
```

### Regression Tests

```typescript
// test/regression/query-evaluator-regression.test.ts

describe('Query Evaluator - Regression Tests', () => {
  it('should still access normal properties', () => {
    const doc = TONLDocument.fromJSON({
      user: { name: 'Alice', age: 30 }
    });

    assert.strictEqual(doc.get('user.name'), 'Alice');
    assert.strictEqual(doc.get('user.age'), 30);
  });

  it('should handle properties with similar names', () => {
    const doc = TONLDocument.fromJSON({
      data: {
        my_proto: 'value1',
        my_constructor: 'value2',
        proto_field: 'value3',
      }
    });

    // Should work - these are not dangerous
    assert.strictEqual(doc.get('data.my_proto'), 'value1');
    assert.strictEqual(doc.get('data.my_constructor'), 'value2');
    assert.strictEqual(doc.get('data.proto_field'), 'value3');
  });

  it('should return undefined for non-existent properties', () => {
    const doc = TONLDocument.fromJSON({ user: { name: 'Alice' } });

    assert.strictEqual(doc.get('user.nonexistent'), undefined);
  });
});
```

---

## Deployment

### Files to Modify
- `src/query/evaluator.ts` (add prototype protection)
- `src/modification/setter.ts` (add set protection)
- `test/security/exploits/BF004-prototype-pollution.exploit.test.ts` (new)

### Security Advisory

```markdown
# Security Advisory SA-2025-004: Prototype Pollution

**Severity:** CRITICAL
**CVE:** CVE-2025-XXXX
**Affected:** v0.1.0 - v0.8.0
**Fixed In:** v1.0.2

## Summary
Query evaluator allows prototype pollution via __proto__ and constructor
access, potentially leading to remote code execution.

## Impact
Attackers can pollute Object.prototype, affecting all objects in the
application. This can lead to authentication bypass, privilege escalation,
or remote code execution depending on application code.

## Mitigation
Upgrade to v1.0.2 immediately. No workaround available.

## Credit
Internal security audit
```

### Success Criteria
- [ ] All dangerous properties blocked
- [ ] hasOwnProperty checks implemented
- [ ] No prototype pollution possible
- [ ] All exploit tests pass
- [ ] All regression tests pass
- [ ] Performance impact < 2%

---


**STATUS: 🟢 COMPLETED (2025-11-05)**
**COMMIT: 1469367 - All 22 security tests passing**
