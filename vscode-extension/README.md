# TONL VS Code Extension

[![Version](https://img.shields.io/vscode/marketplace/v/tonl-dev.tonl-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=tonl-dev.tonl-vscode)
[![Installs](https://img.shields.io/vscode/marketplace/i/tonl-dev.tonl-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=tonl-dev.tonl-vscode)
[![Rating](https://img.shields.io/vscode/marketplace/r/tonl-dev.tonl-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=tonl-dev.tonl-vscode)

Complete language support for **TONL** (Token-Optimized Notation Language) files with syntax highlighting, intelligent code completion, validation, and interactive document exploration.

## 📋 Table of Contents
- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [Commands](#-commands)
- [Settings](#-settings)
- [Examples](#-examples)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Features

### 🎨 Syntax Highlighting (T038) - Complete
- **TONL file recognition** - Automatic language mode for `.tonl` files
- **Comprehensive syntax coloring**:
  - Directives: `@version`, `@delimiter`, `@types`, `@schema`
  - Comments: `# comment lines`
  - Field headers: `key:`, `array[0]:`
  - Strings: double quotes `"..."` and triple quotes `"""..."""`
  - Numbers: integers, decimals, scientific notation
  - Booleans: `true`, `false`
  - Null values: `null`
  - Inline objects: `{key: value, ...}`
  - Inline arrays: `[item1, item2, ...]`
  - Delimiters: `,`, `|`, `;`, `\t`
  - Escape sequences in strings

### 🌳 Document Explorer (T039) - Complete
- **Interactive tree view** in sidebar
- **Real-time parsing** of TONL documents
- **Visual structure navigation**:
  - Collapsible objects and arrays
  - Type icons for all value types
  - Value previews for primitives
  - Array length and object property counts
- **Intelligent tooltips** showing paths and types
- **Auto-refresh** on document changes (debounced)
- **Error display** for invalid TONL syntax

### 🧠 IntelliSense (T040) - Complete
- **Auto-completion**:
  - Directive suggestions (`@version`, `@delimiter`, etc.)
  - Value completions (`true`, `false`, `null`)
  - Snippet support for strings, objects, and arrays
  - Context-aware suggestions
- **Hover information**:
  - Type detection for all values
  - Directive documentation
  - Field name hints
  - Value type indicators
- **Real-time diagnostics**:
  - Parse error detection with line numbers
  - Duplicate key warnings
  - Inconsistent delimiter detection
  - Schema validation messages

### ⚡ Commands
- **TONL: Validate Document** - Parse and validate TONL syntax
- **TONL: Format Document** - Round-trip format via encode/decode
- **TONL: Show Document Tree** - Open tree explorer sidebar

## 📦 Installation

### 🛍️ From VS Code Marketplace (Recommended)
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for **"TONL"** or **"TONL Language Support"**
4. Click **Install**

### 🔧 From VSIX (Development)
```bash
cd vscode-extension
npm install
npm run compile
npm run package
code --install-extension tonl-vscode-1.0.0.vsix
```

### 🎯 Quick Start
1. Install the extension
2. Create or open a `.tonl` file
3. Start editing with syntax highlighting and IntelliSense!

## 💡 Usage

### 📝 Basic Editing
1. Open any `.tonl` file
2. Syntax highlighting activates automatically
3. IntelliSense provides suggestions as you type
4. Hover over elements for type information

### 🌳 Document Explorer
1. Open a `.tonl` file
2. View the "TONL Explorer" in the sidebar
3. Navigate through the document structure
4. Click on elements to see tooltips with paths and values

### ⚡ Commands
Access commands via Command Palette (**Ctrl+Shift+P** / **Cmd+Shift+P**):
- **TONL: Validate Document** - Check for syntax errors
- **TONL: Format Document** - Reformat the document
- **TONL: Show Document Tree** - Open explorer view

### 🧠 IntelliSense Features
- Type `@` to see directive completions
- Type `:` after a field name for value suggestions
- Hover over any element to see type and documentation
- Real-time error highlighting in the editor

## 📚 Example

```tonl
# TONL Document Example
@version 1.0
@delimiter ,
@types {name: string, age: number, active: boolean}

# User profile
user:
  name: Alice Johnson
  age: 30
  email: alice@example.com
  active: true

# Inline object notation
settings: {theme: dark, notifications: true}

# Array of users
users[0]:
  id: 1
  name: Bob Smith
  role: admin

users[1]:
  id: 2
  name: Carol Davis
  role: user

# Nested structure
config:
  database:
    host: localhost
    port: 5432
    credentials: {username: admin, password: secret}
  features: [auth, logging, caching]
```

## ⚙️ Extension Settings

Configure these settings in VS Code **Settings** or in `.vscode/settings.json`:

```json
{
  "tonl.validateOnSave": {
    "type": "boolean",
    "default": true,
    "description": "Validate TONL documents when saving"
  },
  "tonl.formatOnSave": {
    "type": "boolean",
    "default": false,
    "description": "Format TONL documents when saving"
  },
  "tonl.maxFileSize": {
    "type": "number",
    "default": 10,
    "description": "Maximum file size for tree view (MB)"
  },
  "tonl.enableDiagnostics": {
    "type": "boolean",
    "default": true,
    "description": "Enable real-time error diagnostics"
  }
}
```

## 🛠️ Development

### Prerequisites
- **Node.js** 18.0.0 or higher
- **VS Code** 1.85.0 or higher
- **TypeScript** 5.0 or higher

### Setup
```bash
# Clone the repository
git clone https://github.com/tonl-dev/tonl.git
cd tonl/vscode-extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run in watch mode
npm run watch

# Package extension
npm run package
```

### Debugging
1. Open the extension folder in VS Code
2. Press **F5** to launch a new Extension Development Host window
3. Test the extension with `.tonl` files
4. Use **Help > Toggle Developer Tools** for debugging

### Testing
```bash
# Run tests (when available)
npm test

# Check TypeScript compilation
npm run compile
```

## 📋 Requirements

- **VS Code**: 1.85.0 or higher
- **TONL Library**: Automatically included as dependency

## ⚠️ Known Issues

- Tree view performance may degrade with very large files (>10K lines)
- Format command does a full encode/decode cycle (may change formatting slightly)
- Diagnostics update on every keystroke (500ms debounced)

## 📅 Release Notes

### 1.0.0 - Production Release

**Complete implementation of T038, T039, and T040:**

🎨 **T038 - Syntax Highlighting**
- ✅ Full TextMate grammar for TONL syntax
- ✅ Support for all TONL features including inline objects/arrays
- ✅ Proper escape sequence highlighting
- ✅ Directive and delimiter recognition

🌳 **T039 - Document Explorer**
- ✅ Interactive tree view with real-time parsing
- ✅ Type-aware icons and tooltips
- ✅ Collapsible structure navigation
- ✅ Error handling for invalid documents

🧠 **T040 - IntelliSense**
- ✅ Auto-completion for directives and values
- ✅ Hover information with type detection
- ✅ Real-time diagnostics (parse errors, duplicate keys, delimiter warnings)
- ✅ Context-aware suggestions

### 0.1.0 - Beta Release
- Initial implementation with basic features
- Syntax highlighting and basic validation

## 🤝 Contributing

We welcome contributions! See the main TONL repository:
- **Main Repository**: [github.com/tonl-dev/tonl](https://github.com/tonl-dev/tonl)
- **Extension Development**: [CONTRIBUTING.md](../CONTRIBUTING.md)

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

**MIT License** - see [LICENSE](../LICENSE) file for details.

---

## 🌟 Support

- **Issues**: [GitHub Issues](https://github.com/tonl-dev/tonl/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tonl-dev/tonl/discussions)
- **Documentation**: [tonl.dev](https://tonl.dev)

---

<div align="center">

**Made with ❤️ by the TONL Team**

[![TONL](https://img.shields.io/badge/TONL-Token--Optimized%20Notation-blue.svg)](https://tonl.dev)

</div>
