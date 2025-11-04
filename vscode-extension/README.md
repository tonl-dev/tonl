# TONL VS Code Extension

Syntax highlighting and language support for TONL (Token-Optimized Notation Language) files.

## Features (T038-T041)

### ✅ Syntax Highlighting (T038)
- TONL file recognition (`.tonl` extension)
- Color highlighting for:
  - Directives (`@version`, `@delimiter`, `@type`, `@schema`)
  - Comments (`# comment`)
  - Headers (`key:`, `array[0]:`)
  - Strings (double quotes, triple quotes)
  - Numbers, booleans, null
  - Delimiters

### 🚧 Document Explorer (T039) - Foundation
- Tree view for TONL documents
- Navigate document structure
- View node types and values

### 🚧 IntelliSense (T040) - Foundation
- Auto-completion for field names
- Hover information
- Signature help

### 🚧 Commands (T041) - Foundation
- Validate Document
- Format Document
- Show Document Tree

## Installation

### From VSIX (Development)
```bash
cd vscode-extension
npm install
npm run compile
vsce package
code --install-extension tonl-vscode-0.1.0.vsix
```

### From VS Code Marketplace (Future)
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "TONL"
4. Click Install

## Usage

1. Open any `.tonl` file
2. Syntax highlighting activates automatically
3. Use commands from Command Palette (Ctrl+Shift+P):
   - `TONL: Validate Document`
   - `TONL: Format Document`
   - `TONL: Show Document Tree`

## Example

```tonl
@version 1.0
@delimiter ,

user:
  name, Alice
  age, 30
  email, alice@example.com

users[0]:
  id, 1
  name, Bob
  active, true
```

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Package
npm run package
```

## Requirements

- VS Code 1.80.0 or higher
- TONL library installed (`npm install tonl`)

## Extension Settings

This extension contributes the following settings:

- `tonl.validateOnSave`: Enable validation on save
- `tonl.formatOnSave`: Enable formatting on save
- `tonl.maxFileSize`: Maximum file size for tree view (MB)

## Known Issues

- Document tree view not yet implemented (foundation in place)
- IntelliSense not yet implemented (foundation in place)
- Large file performance needs optimization

## Release Notes

### 0.1.0 (Foundation)

Initial release with:
- ✅ Syntax highlighting
- 🚧 Document explorer (foundation)
- 🚧 IntelliSense (foundation)
- 🚧 Commands (foundation)

## Contributing

See the main TONL repository: https://github.com/ersinkoc/tonl

## License

MIT
