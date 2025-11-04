# Feature 001: Query API

**Feature ID:** F001
**Feature Name:** Query & Navigation API
**Priority:** P1 - CRITICAL
**Target Version:** v0.6.0
**Estimated Duration:** 6-8 weeks
**Status:** 🔴 Not Started

## Overview

Implement a comprehensive query and navigation system for TONL documents, enabling path-based access, JSONPath-like queries, tree traversal, and iteration capabilities. This transforms TONL from a simple converter into a full-featured data access library.

## Goals

- Enable path-based value access (e.g., `user.name`, `users[0].id`)
- Support JSONPath-like query expressions with filters
- Provide tree traversal and iteration APIs
- Maintain high performance (O(1) for direct access, O(n) for queries)
- Zero dependencies policy
- 100% test coverage
- Full TypeScript type safety

## Success Criteria

- [ ] All tasks completed (T001-T010)
- [ ] 100% test coverage maintained
- [ ] Query performance: <1ms for simple paths, <10ms for complex queries on 1000-node trees
- [ ] API documentation complete
- [ ] Example code and tutorials written
- [ ] No breaking changes to existing API

---

## Tasks

### T001: Path Parser Implementation

**Status:** 🔴 Not Started
**Priority:** P1 - CRITICAL (blocks all other tasks)
**Estimated Effort:** 3 days
**Assignee:** TBD

#### Description
Implement a robust path expression parser that can parse JSONPath-like syntax into an abstract syntax tree (AST) for query execution.

#### Technical Details

**Supported Path Syntax:**
```
- Simple property access: user.name
- Array indexing: users[0]
- Negative indexing: users[-1] (last item)
- Wildcard: users[*].name
- Recursive descent: $..email
- Array slicing: users[0:5] or users[:3] or users[2:]
- Filter expressions: users[?(@.role == "admin")]
- Multiple filters: users[?(@.age > 18 && @.active == true)]
```

**Parser Architecture:**
- Tokenizer: Convert string to tokens
- Parser: Convert tokens to AST
- Validator: Validate AST structure

**AST Node Types:**
```typescript
type PathNode =
  | { type: 'root', symbol: '$' }
  | { type: 'property', name: string }
  | { type: 'index', index: number }
  | { type: 'wildcard' }
  | { type: 'recursive', name?: string }
  | { type: 'slice', start?: number, end?: number, step?: number }
  | { type: 'filter', expression: FilterExpression };

interface FilterExpression {
  type: 'binary' | 'unary' | 'literal' | 'property';
  operator?: string; // ==, !=, >, <, >=, <=, &&, ||, !
  left?: FilterExpression;
  right?: FilterExpression;
  value?: any;
  path?: string;
}
```

#### Files to Touch
- `src/query/types.ts` (new) - Type definitions for AST
- `src/query/tokenizer.ts` (new) - Path tokenizer
- `src/query/path-parser.ts` (new) - Path parser
- `src/query/validator.ts` (new) - AST validator

#### Dependencies
- None (foundational task)

#### Blocks
- T002, T003, T004, T005

#### Success Criteria
- [ ] Parser handles all supported path syntax
- [ ] Comprehensive error messages for invalid paths
- [ ] Unit tests: 50+ test cases covering all syntax variations
- [ ] Performance: Parse 1000 paths in <100ms
- [ ] TypeScript types for all AST nodes
- [ ] JSDoc documentation for all public APIs

#### Next Tasks
- T002 (Query Evaluator Core)

---

### T002: Query Evaluator Core

**Status:** 🔴 Not Started
**Priority:** P1 - CRITICAL
**Estimated Effort:** 4 days
**Assignee:** TBD

#### Description
Implement the query evaluation engine that executes parsed path expressions against TONL document trees.

#### Technical Details

**Evaluator Interface:**
```typescript
class QueryEvaluator {
  constructor(document: TONLObject);

  // Execute query and return results
  evaluate(ast: PathNode[]): any | any[];

  // Check if path exists
  exists(ast: PathNode[]): boolean;

  // Get value type at path
  typeOf(ast: PathNode[]): string;
}
```

**Evaluation Strategy:**
- Recursive descent through AST
- Lazy evaluation where possible
- Result caching for repeated queries
- Context tracking for filter expressions (@.property)

**Performance Optimizations:**
- Short-circuit evaluation for filters
- Early termination on first match (for exists())
- Memoization for repeated sub-queries

#### Files to Touch
- `src/query/evaluator.ts` (new) - Query evaluator implementation
- `src/query/context.ts` (new) - Evaluation context
- `src/query/cache.ts` (new) - Query result cache

#### Dependencies
- T001 (Path Parser)

#### Blocks
- T005 (TONLDocument class integration)

#### Success Criteria
- [ ] All path types correctly evaluated
- [ ] Filter expressions work correctly
- [ ] Context (@) properly resolved in filters
- [ ] Unit tests: 100+ test cases
- [ ] Performance: Evaluate simple path in <0.1ms
- [ ] Performance: Complex query on 1000 nodes in <10ms
- [ ] Memory efficient (no unnecessary copies)

#### Next Tasks
- T003 (Filter Expression Engine)

---

### T003: Filter Expression Engine

**Status:** 🔴 Not Started
**Priority:** P1 - HIGH
**Estimated Effort:** 3 days
**Assignee:** TBD

#### Description
Implement the filter expression evaluator for complex query conditions.

#### Technical Details

**Supported Operators:**
```typescript
// Comparison
==, !=, >, <, >=, <=

// Logical
&&, ||, !

// String operations
contains, startsWith, endsWith, matches (regex)

// Type checking
typeof, instanceof

// Existence
exists, empty

// Array operations
in, size
```

**Filter Execution:**
```typescript
interface FilterEvaluator {
  evaluate(expression: FilterExpression, context: any): boolean;
}

// Example usage:
// users[?(@.age >= 18 && @.role == "admin")]
// users[?(@.email contains "@company.com")]
// users[?(@.tags.size > 0)]
```

#### Files to Touch
- `src/query/filter-evaluator.ts` (new) - Filter evaluator
- `src/query/operators.ts` (new) - Operator implementations
- `src/query/type-checker.ts` (new) - Type checking utilities

#### Dependencies
- T001 (Path Parser)
- T002 (Query Evaluator)

#### Blocks
- T005 (TONLDocument integration)

#### Success Criteria
- [ ] All operators correctly implemented
- [ ] Short-circuit evaluation for && and ||
- [ ] Type coercion handled correctly
- [ ] Unit tests: 80+ test cases
- [ ] Performance: 10,000 filter evaluations in <100ms
- [ ] Clear error messages for invalid expressions

#### Next Tasks
- T004 (Navigation API)

---

### T004: Navigation & Iteration API

**Status:** 🔴 Not Started
**Priority:** P1 - HIGH
**Estimated Effort:** 3 days
**Assignee:** TBD

#### Description
Implement tree traversal and iteration capabilities for TONL documents.

#### Technical Details

**Iterator Types:**
```typescript
// Entry iterator (key-value pairs)
*entries(): Iterator<[string, any]>

// Key iterator
*keys(): Iterator<string>

// Value iterator
*values(): Iterator<any>

// Tree walker (recursive)
walk(callback: (path: string, value: any, depth: number) => void | boolean): void

// Filtered walker
walk(filter: (value: any) => boolean, callback: ...): void
```

**Traversal Strategies:**
- Depth-first (default)
- Breadth-first (optional)
- Pre-order, in-order, post-order

**Features:**
- Early termination (return false from callback)
- Path tracking
- Depth limiting
- Type filtering

#### Files to Touch
- `src/navigation/iterator.ts` (new) - Iterator implementations
- `src/navigation/walker.ts` (new) - Tree walker
- `src/navigation/traversal.ts` (new) - Traversal strategies

#### Dependencies
- T002 (Query Evaluator - for type checking)

#### Blocks
- T005 (TONLDocument integration)

#### Success Criteria
- [ ] All iterator types implemented
- [ ] Traversal strategies work correctly
- [ ] Early termination works
- [ ] Path tracking accurate
- [ ] Unit tests: 60+ test cases
- [ ] Performance: Iterate 10,000 nodes in <50ms
- [ ] Memory efficient (no full tree copy)

#### Next Tasks
- T005 (TONLDocument class)

---

### T005: TONLDocument Class

**Status:** 🔴 Not Started
**Priority:** P1 - CRITICAL
**Estimated Effort:** 5 days
**Assignee:** TBD

#### Description
Implement the main TONLDocument class that serves as the primary interface for all query and navigation operations.

#### Technical Details

**Class Interface:**
```typescript
class TONLDocument {
  // Constructors
  static parse(tonlText: string, options?: ParseOptions): TONLDocument;
  static fromJSON(data: any): TONLDocument;
  static fromFile(path: string): Promise<TONLDocument>;
  static fromFileSync(path: string): TONLDocument;

  // Query methods
  get(path: string): any;
  query(pathExpression: string): any[];
  exists(path: string): boolean;
  typeOf(path: string): string;

  // Navigation methods
  entries(): Iterator<[string, any]>;
  keys(): Iterator<string>;
  values(): Iterator<any>;
  walk(callback: WalkCallback, options?: WalkOptions): void;

  // Export methods
  toJSON(): any;
  toTONL(options?: EncodeOptions): string;
  save(path: string, options?: EncodeOptions): Promise<void>;
  saveSync(path: string, options?: EncodeOptions): void;

  // Metadata
  size(): number;
  stats(): DocumentStats;
  getSchema(): TONLSchema | null;
  validate(): ValidationResult;
}
```

**Internal State:**
- Parsed AST cache
- Query result cache
- Schema reference
- Metadata

#### Files to Touch
- `src/document.ts` (new) - TONLDocument class
- `src/document/types.ts` (new) - Document types
- `src/document/stats.ts` (new) - Statistics
- `src/index.ts` (update) - Export TONLDocument

#### Dependencies
- T001, T002, T003, T004 (All query/navigation components)

#### Blocks
- T006 (Documentation)
- T007 (Integration tests)

#### Success Criteria
- [ ] All methods implemented and working
- [ ] Proper error handling
- [ ] Memory efficient (lazy evaluation where possible)
- [ ] Unit tests: 100+ test cases
- [ ] TypeScript types complete
- [ ] JSDoc for all public methods
- [ ] Example usage code

#### Next Tasks
- T006 (API Documentation)

---

### T006: API Documentation & Examples

**Status:** 🔴 Not Started
**Priority:** P2 - HIGH
**Estimated Effort:** 3 days
**Assignee:** TBD

#### Description
Create comprehensive API documentation and example code for the Query API feature.

#### Technical Details

**Documentation Structure:**
```
docs/
  QUERY_API.md         - Complete API reference
  NAVIGATION_API.md    - Navigation guide
  EXAMPLES.md          - Code examples
  PERFORMANCE.md       - Performance guide
  MIGRATION.md         - Migration from v0.5.x
```

**Example Categories:**
- Basic queries
- Advanced filters
- Tree traversal
- Performance optimization
- Common patterns
- Error handling

#### Files to Touch
- `docs/QUERY_API.md` (new)
- `docs/NAVIGATION_API.md` (new)
- `docs/EXAMPLES.md` (update)
- `docs/PERFORMANCE.md` (new)
- `README.md` (update)
- `examples/query-basics.ts` (new)
- `examples/query-advanced.ts` (new)
- `examples/navigation.ts` (new)

#### Dependencies
- T005 (TONLDocument class)

#### Blocks
- None

#### Success Criteria
- [ ] Complete API reference written
- [ ] 20+ code examples
- [ ] Migration guide for existing users
- [ ] Performance guidelines documented
- [ ] All examples tested and working
- [ ] Clear, beginner-friendly explanations

#### Next Tasks
- T008 (CLI integration)

---

### T007: Integration Tests

**Status:** 🔴 Not Started
**Priority:** P1 - HIGH
**Estimated Effort:** 4 days
**Assignee:** TBD

#### Description
Create comprehensive integration tests that verify the entire Query API working together in realistic scenarios.

#### Technical Details

**Test Categories:**
```typescript
// End-to-end query tests
- Real-world data structures
- Complex nested queries
- Performance benchmarks
- Edge cases
- Error scenarios

// Integration with existing features
- Schema validation
- Streaming API
- CLI tools
```

**Test Fixtures:**
- User management system
- E-commerce catalog
- Nested project structure
- Large dataset (10k+ items)

#### Files to Touch
- `test/integration/query-api.test.ts` (new)
- `test/integration/navigation.test.ts` (new)
- `test/integration/performance.test.ts` (new)
- `test/fixtures/query/` (new directory)
- `test/fixtures/query/users.tonl` (new)
- `test/fixtures/query/products.tonl` (new)

#### Dependencies
- T005 (TONLDocument class)

#### Blocks
- T010 (Release preparation)

#### Success Criteria
- [ ] 100+ integration test cases
- [ ] All test fixtures realistic
- [ ] Performance benchmarks pass
- [ ] Edge cases covered
- [ ] 100% code coverage maintained
- [ ] Tests run in <30 seconds

#### Next Tasks
- T008 (CLI integration)

---

### T008: CLI Integration

**Status:** 🔴 Not Started
**Priority:** P2 - MEDIUM
**Estimated Effort:** 2 days
**Assignee:** TBD

#### Description
Add query capabilities to the TONL CLI tool.

#### Technical Details

**New CLI Commands:**
```bash
# Query command
tonl query data.tonl "users[?(@.role == 'admin')].name"

# Get command (simple path)
tonl get data.tonl "user.email"

# Exists check
tonl exists data.tonl "settings.database"

# Walk/iterate
tonl walk data.tonl --filter "*.email"

# Stats with query
tonl stats data.tonl --query "users[*]" --count
```

**Output Formats:**
- JSON (default)
- TONL
- Table (for arrays)
- Plain text (for primitives)

#### Files to Touch
- `src/cli.ts` (update) - Add query commands
- `src/cli/query-command.ts` (new) - Query command handler
- `src/cli/formatters.ts` (new) - Output formatters

#### Dependencies
- T005 (TONLDocument class)

#### Blocks
- T010 (Release preparation)

#### Success Criteria
- [ ] All query commands working
- [ ] Output formats work correctly
- [ ] Error messages clear and helpful
- [ ] CLI help updated
- [ ] Examples in help text
- [ ] Integration tests for CLI

#### Next Tasks
- T009 (Performance optimization)

---

### T009: Performance Optimization

**Status:** 🔴 Not Started
**Priority:** P2 - MEDIUM
**Estimated Effort:** 3 days
**Assignee:** TBD

#### Description
Optimize query and navigation performance for production use.

#### Technical Details

**Optimization Areas:**
- Path parser caching
- Query result caching
- AST compilation
- Filter expression optimization
- Memory pooling
- Lazy evaluation

**Performance Targets:**
- Simple path access: <0.1ms
- Complex query (1000 nodes): <10ms
- Wildcard query (1000 nodes): <20ms
- Filter query (1000 nodes): <50ms
- Walk all nodes (10000): <100ms

**Profiling:**
- CPU profiling
- Memory profiling
- Benchmark suite

#### Files to Touch
- `src/query/cache.ts` (update) - Enhanced caching
- `src/query/optimizer.ts` (new) - Query optimizer
- `src/query/pool.ts` (new) - Object pooling
- `bench/query-performance.ts` (new) - Benchmarks

#### Dependencies
- T007 (Integration tests - for benchmarking)

#### Blocks
- T010 (Release preparation)

#### Success Criteria
- [ ] All performance targets met
- [ ] Memory usage acceptable (<100MB for 10k nodes)
- [ ] No memory leaks
- [ ] Benchmark suite established
- [ ] Performance regression tests
- [ ] Profiling data documented

#### Next Tasks
- T010 (Release preparation)

---

### T010: Release Preparation

**Status:** 🔴 Not Started
**Priority:** P1 - CRITICAL
**Estimated Effort:** 2 days
**Assignee:** TBD

#### Description
Prepare for v0.6.0 release with Query API feature.

#### Technical Details

**Release Checklist:**
- [ ] All tests passing (unit + integration)
- [ ] Test coverage 100%
- [ ] Documentation complete
- [ ] CHANGELOG.md updated
- [ ] Migration guide written
- [ ] Examples tested
- [ ] Performance benchmarks pass
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Package.json version bumped
- [ ] Git tags created
- [ ] npm publish dry-run successful

**Migration Notes:**
- Breaking changes (if any)
- Deprecation warnings
- Upgrade path from v0.5.x

#### Files to Touch
- `CHANGELOG.md` (update)
- `package.json` (update version)
- `docs/MIGRATION.md` (new)
- `docs/RELEASE_NOTES_0.6.0.md` (new)

#### Dependencies
- T001-T009 (All previous tasks)

#### Blocks
- None (final task)

#### Success Criteria
- [ ] Release checklist 100% complete
- [ ] Documentation reviewed
- [ ] Examples all working
- [ ] npm package published
- [ ] GitHub release created
- [ ] Announcement prepared

#### Next Tasks
- None (feature complete)

---

## Technical Architecture

### Module Structure
```
src/
  query/
    types.ts              - Type definitions
    tokenizer.ts          - Path tokenizer
    path-parser.ts        - Path parser
    validator.ts          - AST validator
    evaluator.ts          - Query evaluator
    context.ts            - Evaluation context
    cache.ts              - Query cache
    filter-evaluator.ts   - Filter engine
    operators.ts          - Operator implementations
    optimizer.ts          - Query optimizer
  navigation/
    iterator.ts           - Iterator implementations
    walker.ts             - Tree walker
    traversal.ts          - Traversal strategies
  document.ts             - TONLDocument class
  document/
    types.ts              - Document types
    stats.ts              - Statistics
```

### Dependencies Graph
```
T001 (Path Parser)
  └─> T002 (Query Evaluator)
        ├─> T003 (Filter Engine)
        └─> T004 (Navigation API)
              └─> T005 (TONLDocument)
                    ├─> T006 (Documentation)
                    ├─> T007 (Integration Tests)
                    │     └─> T009 (Performance)
                    │           └─> T010 (Release)
                    └─> T008 (CLI Integration)
                          └─> T010 (Release)
```

### Testing Strategy
- **Unit Tests**: Each module independently
- **Integration Tests**: Full query scenarios
- **Performance Tests**: Benchmark suite
- **Edge Cases**: Error handling, limits
- **Regression Tests**: Prevent future breakage

---

## Risk Assessment

### High Risk
- **Complex filter expressions**: May be difficult to implement correctly
  - Mitigation: Start with simple operators, iterate

- **Performance on large documents**: Query speed critical
  - Mitigation: Early performance testing, optimization pass

### Medium Risk
- **API surface too large**: May be hard to maintain
  - Mitigation: Keep API minimal, extensible

- **Breaking changes**: May affect existing users
  - Mitigation: Maintain backward compatibility

### Low Risk
- **Documentation incomplete**: Can be fixed post-release
  - Mitigation: Dedicate full task to documentation

---

## Future Enhancements (Post-v0.6.0)

- [ ] Query builder UI (for VS Code extension)
- [ ] Query optimization hints
- [ ] Query explain/debug mode
- [ ] Custom operator registration
- [ ] Async query evaluation
- [ ] Parallel query execution
- [ ] Query result streaming
- [ ] JSONPath full compliance

---

## Notes

- Maintain zero runtime dependencies
- All features must work in browser
- TypeScript strict mode compliance
- Follow existing code style
- 100% test coverage non-negotiable
- Performance is a feature
