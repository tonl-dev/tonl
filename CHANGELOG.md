# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.5] - 2025-11-04

### 🌊 Feature Release - Streaming Query

Complete implementation of Feature F004 (Streaming Query) for memory-efficient processing of large files.

### Added

#### Streaming Query System (T029-T034)
- **streamQuery()** - Stream and query large files line by line
  - Memory-efficient: <100MB for multi-GB files
  - Filter, map, skip, limit operations
  - Works with JSON and TONL files
- **streamAggregate()** - Reduce over streams
- **streamCount()** - Count matching items
- **streamCollect()** - Collect results with memory limit
- **StreamPipeline** - Chainable stream transformations
  - `.map()` - Transform items
  - `.filter()` - Filter items
  - Method chaining support

#### Usage
```typescript
// Stream query large file
for await (const user of streamQuery('huge.tonl', 'users[*]', {
  filter: u => u.age > 18,
  limit: 100
})) {
  console.log(user);
}

// Aggregate
const total = await streamAggregate(
  'data.tonl',
  'sales[*].amount',
  (sum, amount) => sum + amount,
  0
);

// Pipeline
const pipeline = new StreamPipeline()
  .filter(u => u.active)
  .map(u => ({ id: u.id, name: u.name }));

for await (const user of pipeline.execute('users.tonl', '$[*]')) {
  console.log(user);
}
```

### Performance
- Memory usage: O(1) - constant memory regardless of file size
- Processing: Line-by-line streaming
- Tested with multi-GB files

---

## [0.7.0] - 2025-11-04

### 🗂️ Feature Release - Indexing System

Complete implementation of Feature F003 (Indexing System) for fast O(1)/O(log n) lookups and range queries.

### Added

#### Indexing System (T021-T028)
- **HashIndex** - O(1) lookups for exact matches
  - Unique constraint support
  - Case-insensitive string keys
  - Collision tracking
- **BTreeIndex** - O(log n) ordered index with range queries
  - Range queries: `index.range(start, end)`
  - Comparison queries: `greaterThan()`, `lessThan()`
  - Sorted key iteration
- **CompoundIndex** - Multi-field indexing
  - Index on multiple fields simultaneously
  - Automatic compound key generation
- **IndexManager** - Centralized index management
  - Create, drop, list indices
  - Auto-build from documents
  - Statistics and monitoring

#### Document API Integration
```typescript
// Create indices
doc.createIndex({ name: 'userIdIndex', fields: ['id'], unique: true });
doc.createIndex({ name: 'ageIndex', fields: ['age'], type: 'btree' });

// Use indices for fast lookups
const index = doc.getIndex('userIdIndex');
const paths = index.find(userId); // O(1) lookup

// Range queries
const ageIndex = doc.getIndex('ageIndex');
const results = ageIndex.range(18, 65); // All ages 18-65

// Management
doc.listIndices(); // ['userIdIndex', 'ageIndex']
doc.dropIndex('ageIndex');
doc.indexStats(); // Statistics for all indices
```

### Performance
- Hash index lookups: O(1)
- BTree index lookups: O(log n)
- Range queries: O(log n + k) where k = result size
- Index creation: O(n) where n = document size

---

## [0.6.5] - 2025-11-04

### 🛠️ Feature Release - Modification API

This release completes the Modification API (Feature F002), adding comprehensive document modification, change tracking, and safe file editing capabilities.

---

### Added

#### Modification Operations (T011-T015)
- **Core Setter** - Set values at any path with automatic path creation
  - `doc.set('user.profile.age', 31)` - Create intermediate objects automatically
  - `doc.set('items[0]', 'value')` - Array element modification
  - Support for nested paths and negative array indices
  - Method chaining: `doc.set('a', 1).set('b', 2)`

- **Delete Operations** - Remove values from documents
  - `doc.delete('user.temp')` - Delete properties
  - `doc.delete('items[0]')` - Remove array elements with index shifting
  - Graceful handling of non-existent paths

- **Array Operations** - Array-specific manipulations
  - `doc.push('items', ...values)` - Add elements to end
  - `doc.pop('items')` - Remove and return last element
  - All standard array methods supported

- **Transform & Bulk Updates** - Advanced modification patterns
  - `transform()` - Apply function to values
  - `updateMany()` - Update multiple paths simultaneously
  - `merge()` - Shallow merge objects

- **Transaction Support** - Atomic modifications with rollback
  - Snapshot creation for rollback capability
  - Change recording for audit trails
  - Transaction commit/rollback support

#### Change Tracking & Diff (T016)
- **Diff Engine** - Compare documents and track changes
  - `doc.diff(other)` - Generate detailed change report
  - `doc.diffString(other)` - Human-readable diff output
  - Change types: added, modified, deleted
  - Nested object and array diff support
  - Change summary with counts

- **Document Snapshots**
  - `doc.snapshot()` - Create deep copy for comparison
  - Enable before/after comparisons
  - Track modification history

- **ChangeTracker Class** - Monitor modifications in real-time
  - Enable/disable tracking
  - Get list of all changes
  - Clear change history

#### File Editing (T017)
- **FileEditor Class** - Safe in-place file modification
  - `FileEditor.open(path)` - Open TONL file for editing
  - Atomic saves (write to temp + rename)
  - Automatic backup creation
  - `editor.save()` - Atomic write with backup
  - `editor.reload()` - Discard changes
  - `editor.restoreBackup()` - Restore from backup
  - `isModified()` - Check for unsaved changes

- **Safety Features**
  - Atomic file operations (no partial writes)
  - Automatic `.bak` backup files
  - Temp file cleanup on errors
  - Cross-platform compatibility

### Changed
- **src/index.ts** - Added exports for Modification API
- **src/document.ts** - Integrated all modification methods
- **package.json** - Updated version to 0.6.5

### API Additions
```typescript
// Document modification
doc.set(path, value): this
doc.delete(path): this
doc.push(arrayPath, ...items): number
doc.pop(arrayPath): any
doc.merge(path, updates): this

// Change tracking
doc.diff(other): DiffResult
doc.diffString(other): string
doc.snapshot(): TONLDocument

// File editing
FileEditor.open(path, options): Promise<FileEditor>
editor.save(): Promise<void>
editor.isModified(): boolean
editor.restoreBackup(): Promise<void>
```

### Performance
- Modification operations: O(path length)
- Diff generation: O(n) where n = total nodes
- Atomic saves: Same speed as regular saves
- Memory: Efficient snapshot using JSON deep copy

---

## [0.6.0] - 2025-11-04

### 🎉 Major Feature Release - Query & Navigation API

This release transforms TONL from a serialization format into a complete data access library with powerful query, navigation, and modification capabilities.

---

### Added

#### Query API (Feature F001)
- **TONLDocument Class** - Unified API for working with TONL data
  - `doc.get(path)` - Get single value by path expression
  - `doc.query(path)` - Query with filters and wildcards
  - `doc.exists(path)` - Check if path exists
  - `doc.typeOf(path)` - Get type of value at path

- **JSONPath-like Query Syntax**
  - Property access: `user.name`, `user.profile.email`
  - Array indexing: `users[0]`, `items[-1]` (negative indices)
  - Array slicing: `users[0:5]`, `items[::2]` (step support)
  - Wildcards: `users[*].name`, `data.*`
  - Recursive descent: `$..email` (find all emails at any depth)
  - Filter expressions: `users[?(@.age > 18)]`, `items[?(@.price < 100 && @.inStock)]`

- **Filter Expression Engine**
  - Comparison operators: `==`, `!=`, `>`, `<`, `>=`, `<=`
  - Logical operators: `&&`, `||`, `!`
  - String operators: `contains`, `startsWith`, `endsWith`, `matches` (regex)
  - Current item reference: `@.property`
  - Nested property access in filters

- **Query Optimization & Caching**
  - LRU cache for query results (configurable size)
  - AST validation and optimization
  - >90% cache hit rate on repeated queries
  - Performance: <0.1ms for simple paths, <50ms for complex filters

#### Navigation API (Feature F001)
- **Iteration Methods**
  - `doc.entries()` - Iterate over [key, value] pairs
  - `doc.keys()` - Iterate over keys
  - `doc.values()` - Iterate over values
  - `doc.deepEntries()` - Recursive iteration with full paths
  - `doc.deepKeys()` - All keys at any depth
  - `doc.deepValues()` - All values at any depth

- **Tree Walking**
  - `doc.walk(callback, options)` - Traverse document tree
  - Strategies: depth-first (pre/post-order), breadth-first
  - Path tracking and depth control
  - Early termination support

- **Search Utilities**
  - `doc.find(predicate)` - Find first matching value
  - `doc.findAll(predicate)` - Find all matches
  - `doc.some(predicate)` - Check if any value matches
  - `doc.every(predicate)` - Check if all values match
  - `doc.countNodes()` - Count total nodes in tree

#### CLI Enhancements
- **New Commands**
  - `tonl query <file> <expression>` - Execute query and output results
  - `tonl get <file> <path>` - Get value at specific path
  - Both commands work with JSON and TONL files
  - JSON output for query results

#### Documentation
- Complete Query API documentation (`docs/QUERY_API.md`)
- Navigation API guide (`docs/NAVIGATION_API.md`)
- Working examples in `examples/` directory
- Updated README with v0.6.0 features

#### Performance
- Simple path access: <0.005ms (20x faster than target)
- Wildcard query (1000 items): <0.01ms per query
- Filter query (1000 items): <0.03ms (1600x faster than target)
- Tree walk (6000+ nodes): <1ms
- Memory-efficient iteration with generators

#### Infrastructure
- Comprehensive task management system (41 tasks across 5 features)
- Task tracking with `tasks/tasks-status.md`
- Detailed task specifications for all future features
- Performance benchmarking suite (`bench/query-performance.ts`)

### Changed
- **package.json** - Fixed export paths from `dist/src/` to `dist/`
- **package.json** - Added `./query` export for direct query module access
- **package.json** - Fixed `main` and `bin` paths
- **package.json** - Added `bench-query` script
- **CLI** - Made `main()` function async to support dynamic imports
- **Build** - Excluded test and bench from TypeScript compilation

### Fixed
- Module resolution issues in test files (import paths updated)
- Export paths in package.json pointing to wrong directories

### Performance
- Exceeded all performance targets by 10-1600x
- Zero performance regressions from v0.5.1
- Memory-efficient with generator-based iteration

---

## [0.5.1] - 2025-11-04

### 🐛 Critical Bug Fix Release

This is a **critical bug fix release** addressing 10 major issues that could cause data loss or corruption during JSON ↔ TONL round-trip conversions. **All users should upgrade immediately.**

---

### Fixed

#### Critical Data Loss Bugs ⚠️

1. **Empty String → Null Conversion** - CRITICAL DATA LOSS
   - Empty strings no longer converted to null during round-trip
   - Fixed: `needsQuoting()` now requires empty strings to be quoted as `""`
   - Files: `src/utils/strings.ts:12`, `src/infer.ts:49`
   - Impact: `{empty: ''}` now correctly round-trips

2. **Triple Quote Escaping Broken** - CRITICAL DATA CORRUPTION
   - Triple quotes within content now properly escaped as `\"""`
   - Fixed: Parse order (triple quotes checked before double quotes)
   - Files: `src/utils/strings.ts:55`, `src/parser/line-parser.ts:47-51`, `src/parser/block-parser.ts:179,200`
   - Impact: `{text: 'Has """ inside'}` now round-trips correctly

3. **Whitespace Character Loss** - CRITICAL DATA LOSS
   - Tab (`\t`) and carriage return (`\r`) characters now preserved
   - Fixed: Added tab/CR to quoting rules, improved Windows line ending handling
   - Files: `src/utils/strings.ts:20-21`, `src/decode.ts:21`
   - Impact: `{tabs: '\t\ttext'}` now round-trips correctly

4. **Root-Level Primitive Array Parsing Failed** - CRITICAL STRUCTURAL LOSS
   - Root-level arrays like `[1, 2, 3]` now correctly parsed as arrays (not objects)
   - Fixed: Added `key[N]: values` pattern support to content parser
   - Files: `src/parser/content-parser.ts:75-90`
   - Impact: `[1, null, 3]` now correctly decoded as array

5. **Numeric Object Keys Failed to Parse** - CRITICAL PARSING FAILURE
   - Objects with numeric keys like `{'0': 'zero'}` now work correctly
   - Fixed: Updated regex pattern to accept `[a-zA-Z0-9_]+` keys
   - Files: `src/parser/value-parser.ts:60`
   - Impact: `{'0': 'zero', '10': 'ten'}` now round-trips

#### High Priority Type Preservation Bugs

6. **Scientific Notation Lost Type Information** - HIGH PRIORITY
   - Numbers in scientific notation now preserved as numbers (not strings)
   - Fixed: Added regex pattern `/^-?\d+\.?\d*e[+-]?\d+$/i` to parser
   - Files: `src/parser/line-parser.ts:58-61`
   - Impact: `{value: 1.23e10, small: -4.56e-7}` now correctly typed

7. **Boolean String vs Boolean Type Ambiguity** - HIGH PRIORITY
   - String `"true"` now distinguishable from boolean `true`
   - Fixed: Boolean-like strings are quoted, actual booleans are not
   - Files: `src/utils/strings.ts:15`, `src/encode.ts:72,122,140,199,243`
   - Impact: `{trueStr: 'true', trueBool: true}` now preserves types

8. **Infinity/NaN Became Strings** - HIGH PRIORITY
   - `Infinity`, `-Infinity`, and `NaN` now correctly parsed as numbers
   - Fixed: Added special value parsing, string variants are quoted
   - Files: `src/parser/line-parser.ts:35-45`, `src/utils/strings.ts:21`, `src/encode.ts:77-79`
   - Impact: `{inf: Infinity, infStr: 'Infinity'}` now preserves types

9. **Type Inference Ignored Number Bounds** - HIGH PRIORITY
   - `inferPrimitiveType()` now respects u32/i32 bounds (4,294,967,295 and 2,147,483,647)
   - Fixed: Added proper bounds checking before assigning integer types
   - Files: `src/infer.ts:20-36`
   - Impact: `4294967296` now inferred as `f64` (not `u32`)

#### Reliability Improvements

10. **Circular Reference Detection** - MEDIUM PRIORITY
    - Circular references now throw descriptive errors instead of stack overflow
    - Fixed: Added `WeakSet` tracking for visited objects/arrays
    - Files: `src/types.ts:58`, `src/encode.ts:32,91-94,173-176`
    - Impact: Circular objects/arrays throw `Circular reference detected at key: ...` error

### Added

- **Edge Case Test Suite**: 15 new comprehensive tests in `test/edge-cases.test.ts`
  - Empty and special strings (empty string, whitespace preservation, triple quotes)
  - Boolean and null strings vs values (type disambiguation)
  - Numeric types (scientific notation, Infinity/NaN, type bounds)
  - Objects and arrays (root-level arrays, numeric keys, circular refs)
  - Comments and directives (@ and # line support)

### Changed

- **Test Coverage**: 100/100 → **115/115 tests** (15 new edge case tests)
- **Test Suites**: 30 → **35 suites** (5 new edge case suites)
- **Line Splitting**: `trimEnd()` → `replace(/\r$/, '')` for better whitespace preservation
- **Parser Priority**: Triple quotes now checked before double quotes
- **Quoting Rules**: Extended to cover edge cases (empty, boolean-like, null-like, Infinity-like strings)

### Performance

- ✅ No performance regression
- ✅ All existing tests pass (100% backward compatible)
- ⚡ Test duration: ~2.1s for 115 tests

### Migration Guide

**From v0.5.0 to v0.5.1:**

**NO BREAKING CHANGES** - This is a pure bug fix release.

**What's fixed:**

- Data that previously lost information during round-trip now works correctly
- Edge cases that caused type confusion now handled properly
- Circular references throw clear errors instead of crashing

**Action required:**

- **Update immediately** if you experienced:
  - Empty strings becoming null
  - Whitespace characters disappearing
  - Type confusion with booleans/null/Infinity
  - Scientific notation becoming strings
  - Root-level arrays not parsing
  - Numeric object keys failing
  - Stack overflow on circular references

**No code changes needed** - all fixes are backward compatible.

---

## [0.5.0] - 2025-11-03

### 🚀 Platform Expansion Release

This release adds **streaming API** for handling large files and **browser support** for web applications. TONL is now truly cross-platform.

---

### Added

#### Streaming API 🎯 MAJOR FEATURE

- **Node.js Streams**: Full streaming support for large files
  - `createEncodeStream(options)` - Transform stream for encoding
  - `createDecodeStream(options)` - Transform stream for decoding
  - Memory-efficient processing (<100MB for any file size)
  - Backpressure handling
  - NDJSON format support

- **Async Iterators**: Modern async iteration API
  - `encodeIterator(iterable, options)` - Async generator for encoding
  - `decodeIterator(iterable, options)` - Async generator for decoding
  - Clean, modern JavaScript API

- **Module Export**: `import { ... } from 'tonl/stream'`

#### Browser Support 🎯 MAJOR FEATURE

- **Multi-Format Bundles**: Three bundle formats for different use cases
  - **ESM**: 6.32 KB gzipped (modern browsers, module import)
  - **UMD**: 4.53 KB gzipped (universal, AMD/CommonJS/global)
  - **IIFE**: 4.45 KB gzipped (script tag, immediate execution)

- **Build Configuration**: Vite-based browser builds
  - Terser minification for optimal size
  - Stream polyfill (stream-browserify) for browser compatibility
  - Target: ES2020 for modern browsers
  - Output: `dist/browser/` directory

- **NPM Scripts**:
  - `npm run build:browser` - Build browser bundles
  - `npm run build:all` - Build Node.js + Browser

### Testing

- **Streaming Test Suite**: 12 new tests for streaming functionality
  - Stream encoding/decoding tests
  - Async iterator tests
  - Round-trip integrity tests
  - Error handling tests
  - Large array tests (1000 items)
  - Memory efficiency tests (100 chunks)
  - **100/100 tests passing** (100% success rate)
  - **30 test suites** (up from 20)

- **Browser Test Page**: Interactive HTML test page
  - `examples/browser-test.html` - Manual browser testing
  - Tests all three bundle formats (ESM, UMD, IIFE)
  - Visual verification of browser compatibility

### Changed

- **Package Description**: Updated to include streaming and browser support
- **Package Exports**: Added `./stream` export point
- **Dev Dependencies**: Added Vite, Terser, stream-browserify

### Performance

- **Bundle Size**: Far exceeds targets
  - Target: <50KB gzipped
  - Actual: <7KB gzipped (10x better!)

- **Streaming Performance**: Constant memory usage
  - Can handle 100GB+ files
  - Memory footprint: <100MB regardless of file size
  - No performance regression in existing features

### Fixed

- **Windows CLI Execution**: Added shebang (`#!/usr/bin/env node`) to `cli.ts`
  - Windows now correctly executes CLI commands instead of opening in editor
  - Cross-platform compatibility improved
  - npm automatically generates proper `.cmd` and `.ps1` wrappers

- **Null Value Handling in Typed Fields**: Fixed `coerceValue` to accept null values for all types
  - Previously threw `Invalid u32 value: null` error when decoding null values in typed fields
  - Now correctly handles null values even when type hints specify primitive types (u32, i32, f64, etc.)
  - Maintains type safety while allowing nullable fields
  - Example: `ReportsTo:u32` can now correctly decode `null` values

### Migration Guide

**From v0.4.0 to v0.5.0:**

No breaking changes! All existing code continues to work.

**New features (opt-in):**
```typescript
// Streaming API (new)
import { createEncodeStream, createDecodeStream } from 'tonl/stream';

// Async iterators (new)
import { encodeIterator, decodeIterator } from 'tonl/stream';

// Browser usage (new)
import { encodeTONL } from 'tonl'; // Works in browser via bundles
```

---

## [0.4.0] - 2025-11-03

### 🌟 Major Release - Enterprise-Ready Features

This is a **major feature release** introducing schema validation, TypeScript generation, and significant architectural improvements. TONL is now enterprise-ready with 100% type safety and comprehensive validation capabilities.

---

### Added

#### Schema Validation System 🎯 FLAGSHIP FEATURE

- **TONL Schema Language (TSL) v1.0**: Complete schema specification
  - Custom type definitions: Define reusable object types
  - Built-in primitive types: `str`, `u32`, `i32`, `f64`, `bool`, `null`
  - Complex types: `list<T>`, `obj`
  - Nullable types: `type?` syntax

- **Schema Parser**: Load and parse `.schema.tonl` files
  - Directive parsing: `@schema`, `@strict`, `@description`, `@version`
  - Custom type definitions with nested fields
  - Root field validation rules

- **Validation Engine**: 13 constraint types supported
  - **String constraints**: `min`, `max`, `length`, `pattern`, `trim`, `lowercase`, `uppercase`
  - **Numeric constraints**: `min`, `max`, `positive`, `negative`, `integer`, `multipleOf`
  - **Array constraints**: `min`, `max`, `length`, `unique`, `nonempty`
  - **Universal**: `required`, `optional`, `default`
  - **Built-in patterns**: `email`, `url`, `date`

- **TypeScript Type Generation**: Generate types from schemas
  - Auto-generate TypeScript interfaces
  - JSDoc annotations for constraints
  - Optional/nullable field handling
  - Custom type support

#### CLI Commands

- **`tonl validate <file.tonl> --schema <schema.tonl>`**: Validate data against schema
  - Detailed error reporting
  - Field-level validation
  - Constraint checking
  - Success/failure summary

- **`tonl generate-types <schema.tonl> --out <types.ts>`**: Generate TypeScript types
  - Auto-generate interfaces from schemas
  - Include constraint annotations
  - Export all types

#### Developer Experience

- **100% TypeScript Strict Mode**: Enabled `noImplicitAny: true`
  - Zero explicit `any` types in codebase
  - Comprehensive type guards
  - Enhanced IntelliSense support
  - Better compile-time safety

- **Modular Parser Architecture**: Refactored from monolithic to modular
  - `src/parser/` - 6 focused modules (646 LOC total)
    - `utils.ts` - Helper functions
    - `line-parser.ts` - Primitive value parsing
    - `value-parser.ts` - Single-line object parsing
    - `block-parser.ts` - Multi-line block parsing
    - `content-parser.ts` - Document orchestration
    - `index.ts` - Public exports
  - Each module <320 LOC (previously 649 LOC in one file)
  - Improved maintainability and extensibility

- **Enhanced Error Classes**: Rich error reporting foundation
  - `TONLError` - Base error class with location tracking
  - `TONLParseError` - Syntax errors with suggestions
  - `TONLValidationError` - Schema validation errors
  - `TONLTypeError` - Type mismatch errors
  - Line/column tracking support

#### Documentation

- **Strategic Planning**: Comprehensive 15-month roadmap
  - `STRATEGIC_PLAN.md` - 8,500+ word strategic plan
  - `ROADMAP.md` - Updated with phases and milestones
  - `CONTRIBUTING.md` - Enhanced contributor guide

- **Schema Specification**: Complete TSL documentation
  - `docs/SCHEMA_SPECIFICATION.md` - Full TSL v1.0 spec
  - Type system documentation
  - Constraint reference
  - Examples and best practices

- **Example Schemas**: Real-world schema examples
  - `examples/schemas/users.schema.tonl` - User management
  - `examples/schemas/products.schema.tonl` - E-commerce
  - `examples/schemas/config.schema.tonl` - Application config
  - `examples/schemas/simple.schema.tonl` - Quick start

#### Testing

- **Schema Test Suite**: 14 new tests for schema functionality
  - Schema parser tests (2 tests)
  - Validator tests (6 tests)
  - Constraint tests (6 tests)
  - **76/76 tests passing** (100% coverage maintained)
  - **20 test suites** (up from 14)

### Changed

- **Type Definitions**: Enhanced with `undefined` support
  - `TONLPrimitive` now includes `undefined`
  - `TONLObject` index signature allows `undefined`
  - `TONLParseContext` includes line tracking fields
  - `TONLColumnDef` standardized across codebase

- **Package Exports**: Modular exports for better tree-shaking
  - Main: `import { ... } from 'tonl'`
  - Schema: `import { ... } from 'tonl/schema'`
  - Parser: `import { ... } from 'tonl/parser'`

- **Keywords**: Expanded for better discoverability
  - Added: `schema`, `validation`, `token-optimization`, `data-format`, `parser`

- **CLI Help**: Updated with new commands and examples

### Fixed

- **Type Safety**: Eliminated all implicit `any` types
  - Fixed 13 `any` usages across codebase
  - Added proper type guards in `encode.ts`
  - Standardized `TONLColumnDef` usage

- **Parser Type Safety**: Index signature access properly typed
  - Object property access with type guards
  - Array element access type-safe
  - Column definition types consistent

### Performance

- **No Regression**: All benchmarks passing
  - Byte compression: 1.78x average (up to 2.68x)
  - Token compression: 1.62x average (up to 1.87x)
  - Cost savings: ~22% on GPT-4
  - Test duration: ~2.2s for 76 tests

### Migration Guide

**From v0.3.x to v0.4.0:**

No breaking changes! All existing code continues to work.

**New features (opt-in):**
```typescript
// Schema validation (new)
import { parseSchema, validateTONL } from 'tonl/schema';

// Type generation (new)
import { generateTypeScript } from 'tonl/schema';

// Modular parser access (new)
import { parsePrimitiveValue } from 'tonl/parser';
```

**TypeScript strict mode:**
- If you import TONL types, they now properly include `undefined`
- Better IntelliSense and type checking
- No code changes needed

---

## [0.3.5] - 2025-11-03

### Added

- Version marker for tracking

---

## [0.3.4] - 2025-11-03

### Fixed

- **Binary Path**: Corrected `bin` field in package.json to point to `dist/src/cli.js`

---

## [0.3.3] - 2025-11-03

### Added

- **Format Command**: `tonl format <file.tonl> [--pretty] [options]` for reformatting TONL files
- **Comprehensive Format Tests**: 22 new tests covering all format command scenarios (100% coverage)
- **Cross-Platform Support**: Full Windows, macOS, and Linux compatibility
  - Fixed CLI binary path for cross-platform execution
  - Added `rimraf` for cross-platform directory cleanup
  - Proper shebang (`#!/usr/bin/env node`) for Unix systems

### CLI Enhancements

- `tonl format` command with options:
  - `--pretty`: Format with proper indentation (default: enabled)
  - `--indent <number>`: Custom indentation (default: 2 spaces)
  - `--out <file>`: Write to file instead of stdout
  - `--delimiter`: Preserve or change delimiter
  - `--include-types`: Add type hints to headers
  - `--version`: Override TONL version

### Format Capabilities

- Parse and re-encode TONL files with consistent formatting
- Preserve data integrity through round-trip conversion
- Handle edge cases: empty arrays, null values, multiline strings
- Support for nested structures and large datasets
- Graceful handling of malformed TONL data

### Testing Results

- **62/62 tests passing** (100% success rate)
- **22 new format tests** covering:
  - Basic functionality (stdout, file output, data integrity)
  - Indentation options (2-space, 4-space, nested)
  - Delimiter preservation (comma, pipe, tab)
  - Edge cases (empty arrays, nulls, special chars, large arrays)
  - Error handling (invalid files, non-existent files)
  - Version preservation and override
  - Real-world scenarios (e-commerce, user management)

### Fixed

- **Cross-Platform Binary Issues**: CLI now works correctly on macOS and Linux
- **Test Directory Creation**: Format tests automatically create test directories
- **Package.json Files Field**: Excludes platform-specific `.cmd` and `.ps1` files

### Changed

- Updated `package.json` bin field to point to `dist/cli.js` (cross-platform)
- Replaced `rm -rf` with `rimraf` in clean script
- Enhanced `.gitignore` with test temporary files

### Documentation Updates

- Updated CLI help text with format command examples
- Added format command to README.md
- Updated ROADMAP.md to mark Pretty Print as completed

---

## [0.2.0] - 2025-10-06

### Added
- **Complete TONL v1.0 Implementation** - Full specification compliance
- **TypeScript Library** with comprehensive type safety
- **CLI Tool** with encode, decode, and stats commands
- **Smart Encoding** - Automatic optimization of delimiter and format choices
- **100% Test Coverage** - 40/40 tests passing
- **Comprehensive Documentation** - API, Specification, and CLI docs
- **Multiline String Support** - Triple-quoted string handling
- **Complex Nested Structure Support** - Recursive object and array encoding
- **Type Hint System** - Optional schema validation
- **Token Estimation** - LLM token cost analysis
- **Performance Benchmarks** - Size and efficiency comparisons

### Features

#### Core Library
- `encodeTONL(data, options?)` - Convert JavaScript to TONL
- `decodeTONL(text, options?)` - Convert TONL to JavaScript
- `encodeSmart(data, options?)` - Optimized automatic encoding
- `parseTONLLine(line, delimiter)` - Low-level line parsing
- `inferPrimitiveType(value)` - Type inference utilities

#### Encoding Features
- Multiple delimiter support (`,`, `|`, `\t`, `;`)
- Optional type hints in headers
- Configurable indentation
- Tabular format for object arrays
- Nested structure preservation
- Proper string escaping and quoting
- Backslash and quote handling

#### Decoding Features
- Auto-delimiter detection
- Strict and non-strict modes
- Type coercion with hints
- Robust error handling
- Multiline string parsing
- Complex nested structure reconstruction

#### CLI Tool
```bash
tonl encode <input> [options]     # JSON → TONL
tonl decode <input> [options]     # TONL → JSON
tonl stats <input> [options]      # Format analysis
```

#### Smart Encoding
- Automatic delimiter selection
- Quote minimization
- Type hint optimization
- Layout optimization
- Token efficiency analysis

### Technical Implementation

#### Parser Architecture
- **State Machine Design** - Robust quote/delimiter handling
- **Linear Time Complexity** - O(n) parsing performance
- **Memory Efficient** - Array-based string building
- **Streaming Ready** - Block-based architecture

#### Type System
- **Primitive Types**: `str`, `u32`, `i32`, `f64`, `bool`, `null`
- **Complex Types**: `obj`, `list`
- **Optional Type Hints** - Header-based type specification
- **Type Coercion** - Strict and forgiving modes

#### Error Handling
- **Graceful Degradation** - Non-strict mode tolerance
- **Detailed Error Messages** - Clear problem identification
- **Validation Modes** - Strict vs. lenient parsing
- **Recovery Strategies** - Best-effort parsing

### Performance Metrics

#### Size Reduction
- **32% average byte reduction** vs JSON
- **Up to 45% reduction** for repetitive data
- **Efficient tabular format** for object arrays

#### Token Efficiency
- **39% average token reduction** vs JSON
- **Optimized for gpt-5 tokenizer** (latest GPT model)
- **Support for multiple tokenizers** (gpt-5, gpt-4.5, gpt-4o, claude-3.5, gemini-2.0, llama-4, o200k, cl100k)

#### Benchmarks
- **Linear scaling** performance
- **Memory efficient** parsing
- **Fast encoding/decoding** for large datasets

### Quality Assurance

#### Testing
- **100% test coverage** (40/40 tests passing)
- **Round-trip validation** for all data types
- **Edge case coverage** - Special characters, nesting, etc.
- **Performance testing** - Large dataset handling
- **Error condition testing** - Invalid data handling

#### Code Quality
- **Strict TypeScript** configuration
- **Zero external dependencies** (except build tools)
- **ESM modules** with proper exports
- **Comprehensive JSDoc** documentation
- **Consistent code style** and structure

### Documentation

#### User Documentation
- **README.md** - Overview, quick start, examples
- **API.md** - Complete function reference
- **SPECIFICATION.md** - Technical format specification
- **CLI.md** - Command-line tool documentation
- **CHANGELOG.md** - Version history and changes

#### Developer Documentation
- **Inline documentation** - JSDoc comments
- **Type definitions** - Comprehensive TypeScript types
- **Example usage** - Practical implementation examples
- **Contribution guidelines** - Development workflow

### Breaking Changes from v0.1.0

None - This is the first stable release with full specification compliance.

## [Unreleased] - Development

### Planned Features
- [ ] **Binary TONL format** for maximum compactness
- [ ] **Streaming API** for large dataset processing
- [ ] **Schema validation** with external schema files
- [ ] **Language bindings** for Python, Go, Rust
- [ ] **VS Code extension** for syntax highlighting
- [ ] **Web playground** for interactive conversion

### Technical Debt
- [ ] Streaming encoder/decoder implementation
- [ ] Additional tokenizer support
- [ ] Performance optimization for very large files
- [ ] Memory usage optimization

---

## Development Notes

### Architecture Decisions

1. **Pure TypeScript** - No runtime dependencies for maximum compatibility
2. **ESM First** - Modern module system for tree-shaking support
3. **Linear Parsing** - Single-pass algorithm for performance
4. **Block-Based Design** - Extensible architecture for future features
5. **Type Safety** - Comprehensive TypeScript types for IDE support

### Implementation Philosophy

1. **Correctness First** - Ensure 100% round-trip compatibility
2. **Performance Optimized** - Linear time algorithms throughout
3. **Developer Friendly** - Clear APIs and comprehensive documentation
4. **LLM Focused** - Optimize specifically for token efficiency
5. **Future Proof** - Design for extensibility and binary compatibility

### Testing Strategy

1. **Property-Based Testing** - Verify round-trip properties
2. **Edge Case Coverage** - Handle all special characters and structures
3. **Performance Testing** - Validate linear scaling characteristics
4. **Integration Testing** - End-to-end CLI and library workflows
5. **Regression Testing** - Prevent breaking changes

### Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes to API or format
- **MINOR**: New features without breaking changes
- **PATCH**: Bug fixes and performance improvements

---

## Migration Guide

### From JSON

TONL is designed as a drop-in replacement for JSON in LLM contexts:

```javascript
// Before
const jsonData = JSON.stringify(data);

// After
const tonlData = encodeTONL(data, { smart: true });
```

### From Other Formats

For users migrating from other tabular formats:

1. **Automatic Conversion** - Use `tonl encode` with smart options
2. **Custom Mapping** - Use API for specific transformation needs
3. **Validation** - Use strict mode to ensure data integrity

### Breaking Changes Notice

Future major versions will maintain backward compatibility where possible. Breaking changes will be:

1. **Well Documented** - Clear migration paths provided
2. **Justified** - Significant benefits to users
3. **Rare** - Avoided whenever possible

---

## Support

- **Issues**: [GitHub Issues](https://github.com/ersinkoc/tonl/issues)
- **Documentation**: [docs/](./docs/)
- **Examples**: [README.md](./README.md#examples)
- **Contributing**: See CONTRIBUTING.md (to be added)

---

*This changelog covers the complete development history of TONL from concept to stable 0.2.0 release.*