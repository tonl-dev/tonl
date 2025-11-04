# Feature 002: Modification API

**Feature ID:** F002
**Feature Name:** Document Modification & Mutation API
**Priority:** P1 - HIGH
**Target Version:** v0.6.5
**Estimated Duration:** 5-6 weeks
**Status:** 🔴 Not Started

## Overview

Implement a comprehensive document modification system that allows programmatic updates, insertions, deletions, and transformations of TONL documents without full encode/decode cycles. Supports transactions, change tracking, and in-place file editing.

## Goals

- Enable path-based value modification (set, delete, update)
- Support array operations (push, pop, insert, splice)
- Provide transform and bulk update capabilities
- Implement transaction support with rollback
- Enable in-place file editing for large files
- Maintain data integrity and type safety
- Track changes and provide diff capabilities
- 100% test coverage

## Success Criteria

- [ ] All tasks completed (T011-T020)
- [ ] 100% test coverage maintained
- [ ] Modification operations: <1ms for simple operations
- [ ] Transaction overhead: <10% performance penalty
- [ ] In-place editing: Memory usage <100MB for multi-GB files
- [ ] API documentation complete
- [ ] Migration guide from read-only API

---

## Tasks

### T011: Core Setter Implementation

**Status:** 🔴 Not Started
**Priority:** P1 - CRITICAL (foundational)
**Estimated Effort:** 4 days
**Assignee:** TBD

#### Description
Implement the core set operation that can modify values at any path in a TONL document.

#### Technical Details

**Setter Interface:**
```typescript
class DocumentModifier {
  // Set value at path
  set(path: string, value: any): void;

  // Set multiple values atomically
  setMany(updates: Record<string, any>): void;

  // Set with type coercion
  setTyped(path: string, value: any, type: TONLTypeHint): void;

  // Conditional set (only if path exists/doesn't exist)
  setIf(path: string, value: any, condition: 'exists' | 'not-exists'): boolean;
}
```

**Operations:**
- Parse path to locate target node
- Create intermediate objects/arrays if needed
- Handle type mismatches gracefully
- Validate against schema (if present)
- Emit change events

**Special Cases:**
- Setting array indices beyond length
- Setting on null/undefined values
- Type conflicts (e.g., setting object property on array)
- Circular reference prevention

#### Files to Touch
- `src/modification/setter.ts` (new) - Core setter implementation
- `src/modification/types.ts` (new) - Modification types
- `src/modification/path-resolver.ts` (new) - Path resolution for write
- `src/modification/validators.ts` (new) - Modification validators

#### Dependencies
- F001/T001 (Path Parser)
- F001/T005 (TONLDocument class)

#### Blocks
- T012, T013, T014

#### Success Criteria
- [ ] All path types supported
- [ ] Intermediate node creation works
- [ ] Type validation working
- [ ] Schema validation integration
- [ ] Unit tests: 80+ test cases
- [ ] Performance: 1000 sets in <100ms
- [ ] Clear error messages

#### Next Tasks
- T012 (Delete operations)

---

### T012: Delete Operations

**Status:** 🔴 Not Started
**Priority:** P1 - HIGH
**Estimated Effort:** 2 days
**Assignee:** TBD

#### Description
Implement delete operations for removing values, properties, and array elements.

#### Technical Details

**Delete Interface:**
```typescript
class DocumentModifier {
  // Delete value at path
  delete(path: string): boolean;

  // Delete multiple paths
  deleteMany(paths: string[]): number; // returns count deleted

  // Delete all matching query
  deleteWhere(query: string): number;

  // Soft delete (set to null vs remove)
  softDelete(path: string): void;
}
```

**Delete Behaviors:**
- Object property: Remove key entirely
- Array element: Splice and re-index
- Root: Clear entire document
- Non-existent path: Return false, no error

**Array Handling:**
```typescript
// Before: [1, 2, 3, 4, 5]
delete('arr[2]')
// After:  [1, 2, 4, 5]  (indices shift)

// Before: {a: 1, b: 2, c: 3}
delete('obj.b')
// After:  {a: 1, c: 3}
```

#### Files to Touch
- `src/modification/deleter.ts` (new) - Delete implementation
- `src/modification/setter.ts` (update) - Integration with setter

#### Dependencies
- T011 (Core Setter)

#### Blocks
- T015 (Transaction support)

#### Success Criteria
- [ ] All delete scenarios work correctly
- [ ] Array re-indexing correct
- [ ] deleteWhere with queries works
- [ ] Unit tests: 50+ test cases
- [ ] Performance: 1000 deletes in <100ms
- [ ] No memory leaks

#### Next Tasks
- T013 (Array operations)

---

### T013: Array Operations

**Status:** 🔴 Not Started
**Priority:** P1 - HIGH
**Estimated Effort:** 3 days
**Assignee:** TBD

#### Description
Implement array-specific operations like push, pop, insert, splice, and sort.

#### Technical Details

**Array Operations Interface:**
```typescript
class ArrayOperations {
  // Add to end
  push(arrayPath: string, ...values: any[]): number;

  // Remove from end
  pop(arrayPath: string): any;

  // Add to beginning
  unshift(arrayPath: string, ...values: any[]): number;

  // Remove from beginning
  shift(arrayPath: string): any;

  // Insert at index
  insert(arrayPath: string, index: number, value: any): void;

  // Insert multiple at index
  insertMany(arrayPath: string, index: number, values: any[]): void;

  // Remove and optionally insert
  splice(arrayPath: string, start: number, deleteCount?: number, ...items: any[]): any[];

  // Reverse array
  reverse(arrayPath: string): void;

  // Sort array
  sort(arrayPath: string, compareFn?: (a: any, b: any) => number): void;

  // Filter array in-place
  filter(arrayPath: string, predicate: (value: any) => boolean): void;

  // Map array in-place
  map(arrayPath: string, transform: (value: any) => any): void;
}
```

**Validation:**
- Ensure target is an array
- Index bounds checking
- Type consistency for uniform arrays

#### Files to Touch
- `src/modification/array-ops.ts` (new) - Array operations
- `src/modification/setter.ts` (update) - Array integration

#### Dependencies
- T011 (Core Setter)

#### Blocks
- T015 (Transaction support)

#### Success Criteria
- [ ] All array operations working
- [ ] Index validation correct
- [ ] Type safety maintained
- [ ] Unit tests: 60+ test cases
- [ ] Performance: 1000 ops in <200ms
- [ ] Works with uniform object arrays

#### Next Tasks
- T014 (Transform operations)

---

### T014: Transform & Bulk Update Operations

**Status:** 🔴 Not Started
**Priority:** P2 - MEDIUM
**Estimated Effort:** 3 days
**Assignee:** TBD

#### Description
Implement transformation and bulk update capabilities for efficient mass modifications.

#### Technical Details

**Transform Interface:**
```typescript
class TransformOperations {
  // Transform single value
  transform(path: string, fn: (value: any) => any): void;

  // Transform multiple values matching query
  transformWhere(query: string, fn: (value: any) => any): number;

  // Bulk update (set same value for multiple paths)
  updateMany(paths: string[], value: any): number;

  // Update with query and value
  updateWhere(query: string, updates: Record<string, any>): number;

  // Merge object at path
  merge(path: string, updates: Record<string, any>, options?: MergeOptions): void;

  // Deep merge
  deepMerge(path: string, updates: any): void;
}
```

**Examples:**
```typescript
// Increase all prices by 10%
doc.transformWhere('products[*].price', (price) => price * 1.1);

// Activate all users
doc.updateWhere('users[*]', { active: true });

// Merge settings
doc.merge('config', { darkMode: true, language: 'en' });
```

**Optimization:**
- Batch updates for efficiency
- Minimize tree traversals
- Lazy evaluation where possible

#### Files to Touch
- `src/modification/transform.ts` (new) - Transform operations
- `src/modification/merge.ts` (new) - Merge operations
- `src/modification/batch.ts` (new) - Batch processing

#### Dependencies
- T011 (Core Setter)
- F001/T003 (Filter engine - for where clauses)

#### Blocks
- T015 (Transaction support)

#### Success Criteria
- [ ] All transform operations work
- [ ] Bulk updates efficient
- [ ] Merge strategies correct
- [ ] Unit tests: 50+ test cases
- [ ] Performance: 10,000 transformations in <500ms
- [ ] Memory efficient

#### Next Tasks
- T015 (Transaction support)

---

### T015: Transaction Support

**Status:** 🔴 Not Started
**Priority:** P1 - CRITICAL
**Estimated Effort:** 5 days
**Assignee:** TBD

#### Description
Implement transaction support with commit/rollback capabilities for atomic multi-operation changes.

#### Technical Details

**Transaction Interface:**
```typescript
class Transaction {
  // Begin transaction
  static begin(doc: TONLDocument): Transaction;

  // Execute operations within transaction
  set(path: string, value: any): this;
  delete(path: string): this;
  push(path: string, value: any): this;
  // ... all modification operations

  // Commit changes
  commit(): void;

  // Rollback all changes
  rollback(): void;

  // Check if can commit (validation)
  canCommit(): boolean;

  // Get list of changes
  getChanges(): Change[];
}
```

**Usage:**
```typescript
const tx = doc.beginTransaction();
try {
  tx.set('user.balance', 1000);
  tx.push('user.transactions', { id: 123, amount: -50 });
  tx.set('user.lastModified', Date.now());

  if (tx.canCommit()) {
    tx.commit();
  } else {
    tx.rollback();
  }
} catch (error) {
  tx.rollback();
  throw error;
}
```

**Implementation:**
- Copy-on-write for affected nodes
- Change log for rollback
- Validation before commit
- Nested transaction support (optional)

#### Files to Touch
- `src/modification/transaction.ts` (new) - Transaction implementation
- `src/modification/change-log.ts` (new) - Change tracking
- `src/modification/snapshot.ts` (new) - Document snapshots
- `src/document.ts` (update) - Transaction integration

#### Dependencies
- T011, T012, T013, T014 (All modification operations)

#### Blocks
- T017 (In-place file editing)

#### Success Criteria
- [ ] Transactions work correctly
- [ ] Rollback restores exact state
- [ ] Validation before commit works
- [ ] Nested transactions supported (optional)
- [ ] Unit tests: 70+ test cases
- [ ] Performance overhead <10%
- [ ] Memory efficient snapshots

#### Next Tasks
- T016 (Change tracking & diff)

---

### T016: Change Tracking & Diff

**Status:** 🔴 Not Started
**Priority:** P2 - MEDIUM
**Estimated Effort:** 3 days
**Assignee:** TBD

#### Description
Implement change tracking and diff generation for monitoring document modifications.

#### Technical Details

**Change Tracking Interface:**
```typescript
interface Change {
  type: 'set' | 'delete' | 'insert' | 'update';
  path: string;
  oldValue?: any;
  newValue?: any;
  timestamp: number;
}

class ChangeTracker {
  // Enable change tracking
  enable(): void;

  // Disable change tracking
  disable(): void;

  // Get all changes since last checkpoint
  getChanges(): Change[];

  // Create checkpoint
  checkpoint(): void;

  // Reset changes
  reset(): void;

  // Generate diff
  diff(other: TONLDocument): Change[];

  // Apply changes to another document
  applyChanges(changes: Change[], target: TONLDocument): void;

  // Export changes as patch
  exportPatch(): Patch;

  // Import and apply patch
  importPatch(patch: Patch): void;
}
```

**Diff Format:**
```json
{
  "version": "1.0",
  "changes": [
    { "op": "set", "path": "user.name", "value": "Alice" },
    { "op": "delete", "path": "user.temp" },
    { "op": "insert", "path": "users[2]", "value": {...} }
  ]
}
```

#### Files to Touch
- `src/modification/change-tracker.ts` (new) - Change tracking
- `src/modification/diff.ts` (new) - Diff generation
- `src/modification/patch.ts` (new) - Patch format and application

#### Dependencies
- T015 (Transaction support)

#### Blocks
- None

#### Success Criteria
- [ ] Change tracking accurate
- [ ] Diff generation correct
- [ ] Patch application works
- [ ] Patch format documented
- [ ] Unit tests: 60+ test cases
- [ ] Performance: Track 10,000 changes in <100ms

#### Next Tasks
- T017 (In-place file editing)

---

### T017: In-Place File Editing

**Status:** 🔴 Not Started
**Priority:** P1 - HIGH
**Estimated Effort:** 6 days
**Assignee:** TBD

#### Description
Implement in-place file editing for large TONL files without loading entire file into memory.

#### Technical Details

**File Editor Interface:**
```typescript
class FileEditor {
  // Open file for editing
  static open(path: string): Promise<FileEditor>;
  static openSync(path: string): FileEditor;

  // Make modifications
  set(path: string, value: any): Promise<void>;
  delete(path: string): Promise<void>;
  // ... other modification operations

  // Save changes
  save(): Promise<void>;
  saveSync(): void;

  // Close file
  close(): void;
}
```

**Usage:**
```typescript
const editor = await FileEditor.open('huge-data.tonl');
await editor.set('metadata.lastModified', Date.now());
await editor.delete('temp.cache');
await editor.save();
editor.close();
```

**Implementation Strategy:**
- Stream-based reading
- In-memory index of line positions
- Partial rewrites for small changes
- Full rewrite for large changes
- Temporary file for safety

**Memory Optimization:**
- Only load affected sections
- Buffer management
- Streaming output
- Garbage collection hints

#### Files to Touch
- `src/edit/file-editor.ts` (new) - File editor implementation
- `src/edit/line-index.ts` (new) - Line position index
- `src/edit/partial-writer.ts` (new) - Partial file writing
- `src/edit/buffer-manager.ts` (new) - Buffer management

#### Dependencies
- T015 (Transaction support)
- F001/T005 (TONLDocument)

#### Blocks
- T019 (Performance optimization)

#### Success Criteria
- [ ] In-place editing works correctly
- [ ] Memory usage <100MB for multi-GB files
- [ ] No data corruption
- [ ] Atomic saves (temp file + rename)
- [ ] Unit tests: 50+ test cases
- [ ] Integration tests with large files
- [ ] Works on all platforms

#### Next Tasks
- T018 (API integration)

---

### T018: API Integration & Documentation

**Status:** 🔴 Not Started
**Priority:** P1 - HIGH
**Estimated Effort:** 4 days
**Assignee:** TBD

#### Description
Integrate modification API into TONLDocument class and create comprehensive documentation.

#### Technical Details

**TONLDocument Extensions:**
```typescript
class TONLDocument {
  // Modification methods
  set(path: string, value: any): void;
  delete(path: string): boolean;
  push(arrayPath: string, ...values: any[]): number;
  insert(arrayPath: string, index: number, value: any): void;
  transform(path: string, fn: (value: any) => any): void;
  merge(path: string, updates: Record<string, any>): void;

  // Transaction methods
  beginTransaction(): Transaction;

  // Change tracking
  enableChangeTracking(): void;
  getChanges(): Change[];
  diff(other: TONLDocument): Change[];

  // File editing
  static openFile(path: string): Promise<FileEditor>;
}
```

**Documentation:**
- API reference
- Code examples
- Best practices
- Performance guide
- Migration guide

#### Files to Touch
- `src/document.ts` (update) - Integrate modification API
- `docs/MODIFICATION_API.md` (new) - API reference
- `docs/TRANSACTIONS.md` (new) - Transaction guide
- `docs/FILE_EDITING.md` (new) - File editing guide
- `examples/modification-basics.ts` (new)
- `examples/transactions.ts` (new)
- `examples/file-editing.ts` (new)

#### Dependencies
- T011-T017 (All modification features)

#### Blocks
- T020 (Release preparation)

#### Success Criteria
- [ ] All APIs integrated smoothly
- [ ] TypeScript types complete
- [ ] JSDoc for all methods
- [ ] 30+ code examples
- [ ] Documentation comprehensive
- [ ] Migration guide clear

#### Next Tasks
- T019 (Performance optimization)

---

### T019: Performance Optimization & Testing

**Status:** 🔴 Not Started
**Priority:** P1 - HIGH
**Estimated Effort:** 4 days
**Assignee:** TBD

#### Description
Optimize modification performance and create comprehensive test suite.

#### Technical Details

**Optimization Areas:**
- Path resolution caching
- Lazy evaluation
- Batch operation optimization
- Memory pooling
- Copy-on-write efficiency

**Performance Targets:**
- Simple set: <0.1ms
- Array push: <0.2ms
- Transform 1000 items: <50ms
- Transaction (10 ops): <2ms
- File edit (small change): <10ms

**Testing:**
- Unit tests for all operations
- Integration tests
- Performance benchmarks
- Memory leak tests
- Concurrency tests

#### Files to Touch
- `src/modification/*.ts` (update) - Add optimizations
- `test/modification/setter.test.ts` (new)
- `test/modification/array-ops.test.ts` (new)
- `test/modification/transaction.test.ts` (new)
- `test/modification/file-editor.test.ts` (new)
- `test/integration/modification.test.ts` (new)
- `bench/modification-perf.ts` (new)

#### Dependencies
- T011-T018 (All features implemented)

#### Blocks
- T020 (Release preparation)

#### Success Criteria
- [ ] All performance targets met
- [ ] 100% test coverage maintained
- [ ] 200+ test cases
- [ ] No memory leaks
- [ ] Benchmark suite established
- [ ] Performance regression tests

#### Next Tasks
- T020 (Release preparation)

---

### T020: Release Preparation (v0.6.5)

**Status:** 🔴 Not Started
**Priority:** P1 - CRITICAL
**Estimated Effort:** 2 days
**Assignee:** TBD

#### Description
Prepare for v0.6.5 release with Modification API feature.

#### Technical Details

**Release Checklist:**
- [ ] All tests passing
- [ ] Test coverage 100%
- [ ] Documentation complete
- [ ] CHANGELOG.md updated
- [ ] Migration guide written
- [ ] Examples tested
- [ ] Performance benchmarks pass
- [ ] No breaking changes (or documented)
- [ ] TypeScript errors: 0
- [ ] Package version bumped
- [ ] Git tags created
- [ ] npm publish ready

#### Files to Touch
- `CHANGELOG.md` (update)
- `package.json` (update version)
- `docs/MIGRATION_0.6.5.md` (new)
- `docs/RELEASE_NOTES_0.6.5.md` (new)

#### Dependencies
- T011-T019 (All tasks complete)

#### Blocks
- None (final task)

#### Success Criteria
- [ ] Release checklist complete
- [ ] All documentation reviewed
- [ ] npm package published
- [ ] GitHub release created
- [ ] Announcement ready

#### Next Tasks
- None (feature complete)

---

## Technical Architecture

### Module Structure
```
src/
  modification/
    types.ts              - Modification types
    setter.ts             - Core setter
    deleter.ts            - Delete operations
    array-ops.ts          - Array operations
    transform.ts          - Transform operations
    merge.ts              - Merge operations
    batch.ts              - Batch processing
    transaction.ts        - Transactions
    change-log.ts         - Change logging
    snapshot.ts           - Snapshots
    change-tracker.ts     - Change tracking
    diff.ts               - Diff generation
    patch.ts              - Patch format
    path-resolver.ts      - Path resolution
    validators.ts         - Validators
  edit/
    file-editor.ts        - File editing
    line-index.ts         - Line indexing
    partial-writer.ts     - Partial writes
    buffer-manager.ts     - Buffer management
```

### Dependencies Graph
```
T011 (Core Setter)
  ├─> T012 (Delete)
  ├─> T013 (Array Ops)
  └─> T014 (Transform)
        └─> T015 (Transaction)
              ├─> T016 (Change Tracking)
              └─> T017 (File Editing)
                    └─> T018 (API Integration)
                          └─> T019 (Performance)
                                └─> T020 (Release)
```

---

## Risk Assessment

### High Risk
- **In-place file editing**: Complex, error-prone
  - Mitigation: Extensive testing, atomic saves

- **Transaction rollback**: Must be 100% reliable
  - Mitigation: Comprehensive testing, snapshots

### Medium Risk
- **Performance overhead**: Modifications may be slow
  - Mitigation: Early profiling, optimization pass

- **Memory usage**: Snapshots may consume memory
  - Mitigation: Copy-on-write, lazy evaluation

### Low Risk
- **API complexity**: May confuse users
  - Mitigation: Great documentation, examples

---

## Future Enhancements (Post-v0.6.5)

- [ ] Undo/redo functionality
- [ ] Multi-user conflict resolution
- [ ] Optimistic locking
- [ ] Change streaming (watch mode)
- [ ] Async modification operations
- [ ] Validation hooks
- [ ] Custom modification operators

---

## Notes

- Maintain backward compatibility with v0.6.0
- All features must work in browser (except file editing)
- TypeScript strict mode compliance
- Zero runtime dependencies
- 100% test coverage
- Performance is critical
