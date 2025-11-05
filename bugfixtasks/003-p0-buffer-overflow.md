# Bug Fix 003: Buffer Overflow in Stream Decoder

**Bug ID:** BF003
**Bug Name:** Buffer Overflow / Memory Exhaustion
**Priority:** P0 - CRITICAL
**Severity:** CRITICAL
**Estimated Effort:** 1 day
**Status:** 🔴 Not Started
**CWE:** CWE-120 (Buffer Copy without Checking Size of Input)
**CVE:** Pending Assignment

---

## Overview

### Summary
The stream decoder in `src/stream/decode-stream.ts` checks buffer size AFTER appending chunks, allowing attackers to bypass the 10MB limit by sending many small chunks that collectively exceed limits, causing memory exhaustion and application crash.

### Impact
**CRITICAL - Denial of Service**
- Memory exhaustion (OOM crash)
- Application unavailability
- Server resource depletion
- Affects streaming operations

### Affected Versions
All versions: v0.1.0 - v0.8.0

---

## Technical Details

### Vulnerable Code

**Location:** `src/stream/decode-stream.ts:35-40`

```typescript
// VULNERABLE CODE
if (buffer.length > MAX_BUFFER_SIZE) {
  return callback(new Error(
    `Buffer overflow: TONL block exceeds ${MAX_BUFFER_SIZE} bytes.`
  ));
}
```

### Root Cause

The check happens AFTER `buffer += chunk`, so:
1. Buffer accumulates data first
2. Then size is checked
3. Attacker can send chunks that bypass check

### Attack Vector

```javascript
// Send 100 chunks of 100KB each = 10MB
// Each chunk passes individually but total exceeds limit
for (let i = 0; i < 100; i++) {
  stream.write(Buffer.alloc(100 * 1024, 'A'));
}
// Total: 10MB accumulated before check!
```

---

## Security Fix

### Proposed Solution

Check size BEFORE appending:

```typescript
// BEFORE - VULNERABLE
buffer += chunk;
if (buffer.length > MAX_BUFFER_SIZE) {
  return callback(new Error('Buffer overflow'));
}

// AFTER - SECURE
// Check BEFORE appending
if (buffer.length + chunk.length > MAX_BUFFER_SIZE) {
  return callback(new SecurityError(
    `Buffer overflow prevented: would exceed ${MAX_BUFFER_SIZE} bytes`
  ));
}
buffer += chunk;
```

### Additional Protections

1. **Per-Chunk Limit**: Max 1MB per chunk
2. **Rate Limiting**: Max chunks per second
3. **Total Size Tracking**: Track cumulative size
4. **Early Termination**: Stop on first violation

### Implementation

```typescript
// src/stream/decode-stream.ts

const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CHUNK_SIZE = 1 * 1024 * 1024;   // 1MB
const MAX_CHUNKS_PER_SEC = 100;

class SecureDecodeStream extends Transform {
  private buffer = '';
  private chunkCount = 0;
  private lastReset = Date.now();

  _transform(chunk: Buffer, encoding: string, callback: Function) {
    // 1. Check chunk size
    if (chunk.length > MAX_CHUNK_SIZE) {
      return callback(new SecurityError(
        `Chunk too large: ${chunk.length} bytes (max: ${MAX_CHUNK_SIZE})`
      ));
    }

    // 2. Rate limiting
    const now = Date.now();
    if (now - this.lastReset > 1000) {
      this.chunkCount = 0;
      this.lastReset = now;
    }

    this.chunkCount++;
    if (this.chunkCount > MAX_CHUNKS_PER_SEC) {
      return callback(new SecurityError(
        'Rate limit exceeded: too many chunks per second'
      ));
    }

    // 3. Check buffer size BEFORE appending
    const chunkStr = chunk.toString('utf8');
    if (this.buffer.length + chunkStr.length > MAX_BUFFER_SIZE) {
      return callback(new SecurityError(
        `Buffer overflow prevented: ${this.buffer.length + chunkStr.length} bytes exceeds limit of ${MAX_BUFFER_SIZE}`
      ));
    }

    // 4. Safe to append
    this.buffer += chunkStr;

    // ... rest of processing
    callback();
  }
}
```

---

## Testing

### Exploit Test

```typescript
// test/security/exploits/BF003-buffer-overflow.exploit.test.ts

describe('BF003: Buffer Overflow', () => {
  it('should block cumulative buffer overflow', () => {
    const stream = new DecodeStream();
    const chunks = 100;
    const chunkSize = 100 * 1024; // 100KB

    let errorCaught = false;
    stream.on('error', (err) => {
      assert.ok(err instanceof SecurityError);
      assert.match(err.message, /Buffer overflow/);
      errorCaught = true;
    });

    // Send chunks that collectively exceed limit
    for (let i = 0; i < chunks; i++) {
      stream.write(Buffer.alloc(chunkSize, 'A'));
    }

    assert.ok(errorCaught, 'Should have caught buffer overflow');
  });

  it('should block oversized single chunk', () => {
    const stream = new DecodeStream();

    let errorCaught = false;
    stream.on('error', (err) => {
      assert.ok(err instanceof SecurityError);
      assert.match(err.message, /Chunk too large/);
      errorCaught = true;
    });

    // Send 2MB chunk (exceeds 1MB limit)
    stream.write(Buffer.alloc(2 * 1024 * 1024, 'A'));

    assert.ok(errorCaught);
  });

  it('should enforce rate limiting', async () => {
    const stream = new DecodeStream();

    let errorCaught = false;
    stream.on('error', (err) => {
      if (err.message.includes('Rate limit')) {
        errorCaught = true;
      }
    });

    // Send 150 chunks in quick succession (exceeds 100/sec limit)
    for (let i = 0; i < 150; i++) {
      stream.write(Buffer.alloc(1024, 'A'));
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    assert.ok(errorCaught, 'Should enforce rate limit');
  });

  it('should allow legitimate streaming', () => {
    const stream = new DecodeStream();
    const data = 'name,age\\nAlice,30\\nBob,25\\n';

    let result = '';
    stream.on('data', (chunk) => {
      result += chunk;
    });

    // Should NOT throw
    stream.write(Buffer.from(data));
    stream.end();

    assert.ok(result.length > 0);
  });
});
```

---

## Deployment

### Files to Modify
- `src/stream/decode-stream.ts` (fix buffer check logic)
- `test/security/exploits/BF003-buffer-overflow.exploit.test.ts` (new)

### Success Criteria
- [ ] Buffer size checked BEFORE appending
- [ ] Per-chunk size limit enforced
- [ ] Rate limiting implemented
- [ ] All exploit tests pass
- [ ] Legitimate streaming unaffected
- [ ] Performance impact < 5%

---


**STATUS: 🟢 COMPLETED (2025-11-05)**
**COMMIT: d0ce771 - All 7 security tests passing**
