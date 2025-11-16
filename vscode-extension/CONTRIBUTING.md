# Contributing to TONL VS Code Extension

Thank you for your interest in contributing to the TONL VS Code extension! This document provides guidelines for contributing to the extension development.

## 🏗️ Project Structure

```
vscode-extension/
├── src/                          # TypeScript source code
│   ├── extension.ts              # Main extension entry point
│   ├── tree-provider.ts          # Document explorer tree view (T039)
│   ├── completion-provider.ts    # IntelliSense completion (T040)
│   ├── hover-provider.ts         # Hover information (T040)
│   └── diagnostics-provider.ts   # Real-time validation (T040)
├── syntaxes/                     # TextMate grammar
│   └── tonl.tmLanguage.json      # Syntax highlighting rules (T038)
├── resources/                    # Extension assets
│   └── tonl-icon.svg            # Extension icon
├── out/                          # Compiled JavaScript output
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # Extension documentation
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18.0.0 or higher
- **VS Code** 1.85.0 or higher
- **TypeScript** 5.0 or higher
- **Git** and a GitHub account

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/tonl-dev/tonl.git
   cd tonl/vscode-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run compile
   ```

4. **Run in development mode**
   ```bash
   # Open in VS Code
   code .

   # Press F5 to launch Extension Development Host
   ```

5. **Test the extension**
   - Create a new file with `.tonl` extension
   - Test syntax highlighting, IntelliSense, and tree view
   - Use Developer Tools for debugging (Help > Toggle Developer Tools)

## 🧪 Testing

### Manual Testing
- Create test files with various TONL features
- Test syntax highlighting for all language constructs
- Verify IntelliSense completions and hover information
- Check tree view navigation and tooltips
- Test validation with malformed TONL documents

### Test Areas

#### T038 - Syntax Highlighting
- ✅ Directives (`@version`, `@delimiter`, etc.)
- ✅ Comments (`# line comments`)
- ✅ Field names and colons
- ✅ String values (single and multiline)
- ✅ Number, boolean, and null values
- ✅ Inline objects and arrays
- ✅ Delimiters and escape sequences

#### T039 - Document Explorer
- ✅ Tree view parsing and display
- ✅ Collapsible objects and arrays
- ✅ Type-aware icons
- ✅ Tooltips with paths and values
- ✅ Error handling for invalid documents
- ✅ Performance with large files

#### T040 - IntelliSense
- ✅ Directive completions (`@`)
- ✅ Value completions after `:`
- ✅ String, object, and array snippets
- ✅ Hover information for directives and values
- ✅ Real-time diagnostics and error reporting

## 🔧 Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit TypeScript files in `src/`
   - Update grammar rules in `syntaxes/`
   - Test thoroughly

3. **Compile and test**
   ```bash
   npm run compile
   # Test in VS Code (F5)
   ```

4. **Package for testing**
   ```bash
   npm run package
   # Install the generated .vsix file
   code --install-extension tonl-vscode-1.0.0.vsix
   ```

### Code Style Guidelines

- **TypeScript**: Use strict mode and proper typing
- **Naming**: Use camelCase for variables, PascalCase for classes
- **Comments**: Document all public APIs and complex logic
- **Error Handling**: Provide clear error messages and proper fallbacks

### Extension Guidelines

- **Performance**: Avoid expensive operations in main thread
- **Memory**: Dispose resources properly and prevent memory leaks
- **User Experience**: Provide helpful error messages and tooltips
- **APIs**: Use VS Code APIs correctly and follow best practices

## 🐛 Reporting Issues

When reporting bugs, please include:

- **VS Code version** and operating system
- **TONL extension version**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Sample TONL content** that causes the issue
- **Console errors** or screenshots (if applicable)

Use the [GitHub Issues](https://github.com/tonl-dev/tonl/issues) with the `extension` label.

## 💡 Feature Requests

For new features:

1. **Check existing issues** to avoid duplicates
2. **Provide clear use cases** and requirements
3. **Consider user experience** and implementation complexity
4. **Discuss the feature** in issues before implementation

## 📝 Extension Features

### Core Tasks

- **T038 - Syntax Highlighting**: Maintain and enhance TextMate grammar
- **T039 - Document Explorer**: Improve tree view performance and UX
- **T040 - IntelliSense**: Enhance completion, hover, and diagnostics

### Enhancement Opportunities

- **Schema Validation**: Integrate with TONL schema files
- **Formatting Options**: Add customizable formatting settings
- **Code Folding**: Implement folding for large TONL documents
- **Go to Definition**: Support navigation within TONL files
- **Live Preview**: Add a preview panel for TONL content

### Performance Improvements

- **Large File Support**: Optimize parsing and tree view for big files
- **Memory Usage**: Reduce memory footprint of extension
- **Startup Time**: Minimize extension loading time

## 🔄 Release Process

### Version Bumping
- **Patch (0.0.x)**: Bug fixes, documentation updates
- **Minor (0.x.0)**: New features, breaking changes in extension APIs
- **Major (x.0.0)**: Major architectural changes

### Release Checklist

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with changes
3. **Test thoroughly** across different scenarios
4. **Update documentation** if needed
5. **Build and package** the extension:
   ```bash
   npm run compile
   npm run package
   ```
6. **Test the .vsix package** in a clean VS Code instance
7. **Create a release** on GitHub
8. **Publish to marketplace** (if authorized)

## 📚 Resources

### VS Code Extension Development
- [Extension API](https://code.visualstudio.com/api)
- [Extension Manifest](https://code.visualstudio.com/api/references/extension-manifest)
- [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

### TONL Documentation
- [Main README](../README.md)
- [TONL Specification](../docs/SPECIFICATION.md)
- [API Documentation](../docs/API.md)

### TextMate Grammars
- [TextMate Grammar Guide](https://macromates.com/manual/en/language_grammars)
- [VS Code Grammar Documentation](https://code.visualstudio.com/api/language-extensions/language-configuration-guide)

## 🤝 Community

- **Issues**: [GitHub Issues](https://github.com/tonl-dev/tonl/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tonl-dev/tonl/discussions)
- **Main Repository**: [tonl-dev/tonl](https://github.com/tonl-dev/tonl)

## 📜 Code of Conduct

Please be respectful and constructive in all interactions. Follow the main TONL project's [Code of Conduct](../CONTRIBUTING.md#code-of-conduct).

---

Thank you for contributing to the TONL VS Code extension! 🚀

*For questions about extension development, please tag issues with `extension` and `question` labels.*