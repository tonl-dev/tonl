# Feature 005: REPL & Interactive Tools

**Feature ID:** F005
**Feature Name:** Interactive REPL and Developer Tools
**Priority:** P3 - LOW
**Target Version:** v0.8.0
**Estimated Duration:** 3-4 weeks
**Status:** 🔴 Not Started

## Overview

Implement an interactive REPL (Read-Eval-Print Loop) and enhanced developer tools for exploring and manipulating TONL documents interactively.

## Goals

- Interactive command-line REPL
- Query and modification in real-time
- Tab completion and syntax highlighting
- History and session persistence
- VS Code extension enhancements
- Developer experience focused

## Success Criteria

- [ ] All tasks completed (T035-T041)
- [ ] REPL fully functional
- [ ] Tab completion working
- [ ] VS Code extension published
- [ ] Documentation complete

---

## Tasks

### T035: REPL Core Implementation

**Status:** 🔴 Not Started
**Priority:** P1 - HIGH
**Estimated Effort:** 4 days

#### Description
Implement core REPL functionality with command parsing and execution.

#### Technical Details
```typescript
class TONLREPL {
  // Start REPL
  start(options?: REPLOptions): void;

  // Load document
  load(path: string): void;

  // Execute query
  query(expression: string): any;

  // Execute modification
  set(path: string, value: any): void;

  // Save document
  save(path?: string): void;
}
```

**Commands:**
```bash
.load <file>          # Load TONL file
.save [file]          # Save changes
.stats                # Show statistics
.schema               # Show schema
.exit                 # Exit REPL
get <path>            # Get value at path
query <expr>          # Query expression
set <path> <value>    # Set value
delete <path>         # Delete value
walk [filter]         # Walk tree
```

#### Files to Touch
- `src/repl/index.ts` (new)
- `src/repl/core.ts` (new)
- `src/repl/commands.ts` (new)
- `src/repl/parser.ts` (new)

#### Dependencies
- F001/T005 (TONLDocument)
- F002/T018 (Modification API)

#### Success Criteria
- [ ] All commands working
- [ ] Error handling robust
- [ ] Session state managed
- [ ] Unit tests: 60+ cases

---

### T036: Auto-completion & Syntax Highlighting

**Status:** 🔴 Not Started
**Priority:** P2 - MEDIUM
**Estimated Effort:** 3 days

#### Description
Implement tab completion for paths and commands, plus syntax highlighting.

#### Files to Touch
- `src/repl/autocomplete.ts` (new)
- `src/repl/highlighter.ts` (new)

#### Dependencies
- T035

#### Success Criteria
- [ ] Tab completion working
- [ ] Path suggestions accurate
- [ ] Syntax highlighting functional
- [ ] Unit tests: 40+ cases

---

### T037: History & Session Persistence

**Status:** 🔴 Not Started
**Priority:** P2 - MEDIUM
**Estimated Effort:** 2 days

#### Description
Implement command history and session persistence.

#### Files to Touch
- `src/repl/history.ts` (new)
- `src/repl/session.ts` (new)

#### Dependencies
- T035

#### Success Criteria
- [ ] History navigation works
- [ ] Session saves/restores
- [ ] Unit tests: 30+ cases

---

### T038: VS Code Extension - Syntax Highlighting

**Status:** 🔴 Not Started
**Priority:** P2 - MEDIUM
**Estimated Effort:** 3 days

#### Description
Create VS Code extension with syntax highlighting for .tonl files.

#### Files to Touch
- `vscode-extension/package.json` (new)
- `vscode-extension/syntaxes/tonl.tmLanguage.json` (new)
- `vscode-extension/language-configuration.json` (new)

#### Dependencies
- None

#### Success Criteria
- [ ] Syntax highlighting working
- [ ] File association correct
- [ ] Published to marketplace

---

### T039: VS Code Extension - Document Explorer

**Status:** 🔴 Not Started
**Priority:** P2 - MEDIUM
**Estimated Effort:** 4 days

#### Description
Add tree view explorer for TONL documents in VS Code.

#### Files to Touch
- `vscode-extension/src/explorer.ts` (new)
- `vscode-extension/src/tree-provider.ts` (new)

#### Dependencies
- T038

#### Success Criteria
- [ ] Tree view working
- [ ] Click navigation
- [ ] Inline editing
- [ ] Query builder UI

---

### T040: VS Code Extension - IntelliSense

**Status:** 🔴 Not Started
**Priority:** P3 - LOW
**Estimated Effort:** 3 days

#### Description
Add IntelliSense support for TONL files with schema validation.

#### Files to Touch
- `vscode-extension/src/completion.ts` (new)
- `vscode-extension/src/hover.ts` (new)
- `vscode-extension/src/diagnostics.ts` (new)

#### Dependencies
- T038

#### Success Criteria
- [ ] Auto-completion working
- [ ] Hover info shown
- [ ] Schema validation errors

---

### T041: Documentation & Release

**Status:** 🔴 Not Started
**Priority:** P1 - HIGH
**Estimated Effort:** 2 days

#### Files to Touch
- `docs/REPL.md` (new)
- `docs/VSCODE_EXTENSION.md` (new)
- `examples/repl-session.md` (new)
- `CHANGELOG.md` (update)

#### Dependencies
- T035-T040

#### Success Criteria
- [ ] Complete documentation
- [ ] 10+ examples
- [ ] Release ready

---

## Features

### REPL Commands
- Document management (.load, .save, .close)
- Query operations (get, query, exists)
- Modification operations (set, delete, push)
- Navigation (walk, keys, values)
- Utilities (.stats, .schema, .validate)
- Help system (.help, .docs)

### VS Code Extension
- Syntax highlighting
- Document outline
- Tree view explorer
- IntelliSense
- Schema validation
- Format on save
- Query builder UI

---

## Notes

- Focus on developer experience
- Rich error messages
- Helpful suggestions
- Beautiful output formatting
