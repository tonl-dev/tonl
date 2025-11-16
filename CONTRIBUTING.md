# Contributing to TONL

Thank you for your interest in contributing to TONL (Token-Optimized Notation Language)! We're excited to have you join our mission to build the best LLM-optimized data serialization format.

> 📘 **New to TONL?** Check out the [README](README.md) and [How It Works](HOW_IT_WORKS.md) first!

## 📋 Table of Contents
- [Getting Started](#-getting-started)
- [How to Contribute](#-how-to-contribute)
- [Development Workflow](#-development-workflow)
- [Testing](#-testing)
- [Code Style](#-code-style)
- [Documentation](#-documentation)
- [Code Review Process](#-code-review-process)
- [Areas for Contribution](#-areas-for-contribution)
- [Learning Resources](#-learning-resources)
- [Getting Help](#-getting-help)
- [Code of Conduct](#-code-of-conduct)

---

## 🏠 Getting Started

### Prerequisites
- **Node.js** 18.0.0 or higher
- **TypeScript** 5.0 or higher
- **Git** and a GitHub account
- Familiarity with JSON and data serialization concepts
- (Optional) Experience with LLMs and tokenization

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/tonl.git`
3. Navigate to the project: `cd tonl`
4. Install dependencies: `npm install`
5. Build the project: `npm run build`
6. Run tests: `npm test`
7. Install locally for CLI testing: `npm run link`

## 🚀 How to Contribute

### Reporting Issues
- Use the [GitHub Issues](https://github.com/tonl-dev/tonl/issues) page
- Search existing issues before creating a new one
- Use the provided issue templates
- Provide clear, reproducible bug reports
- Include environment details (OS, Node.js version, etc.)

### Submitting Pull Requests
1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes following the code style guidelines
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Update documentation if needed
6. Commit your changes with clear messages
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a pull request to the main repository

### Code Style Guidelines
- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Write tests for all new functionality

## 📁 Project Structure

```
tonl/
├── src/                    # Source code
│   ├── index.ts           # Main entry point
│   ├── encode.ts          # Encoding logic
│   ├── decode.ts          # Decoding logic
│   ├── parser.ts          # Parsing utilities
│   ├── infer.ts           # Type inference
│   ├── cli.ts             # CLI implementation
│   └── utils/             # Utility functions
├── test/                  # Test files
├── bench/                 # Benchmark scripts
├── docs/                  # Documentation
└── examples/              # Usage examples
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run dev

# Run specific test file
node --test test/parser.test.ts
```

### Writing Tests
- ✅ Use Node.js built-in test runner
- ✅ Test both happy path and error cases
- ✅ Include edge cases and boundary conditions
- ✅ Test performance-critical code paths
- ✅ Add golden tests for format stability
- ✅ Include security tests for any new features

### Test Coverage
- 🎯 Aim for 100% test coverage on core functionality
- 🔍 Focus on parser, encoder, and decoder
- 🖥️ Test CLI commands and options
- 🔗 Include integration tests
- 🛡️ Add security tests for any user-input processing

## 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment information
- Sample data if applicable

Use the bug report template on GitHub Issues.

## 💡 Feature Requests

For new features:
- Check the roadmap first to see if it's planned
- Open an issue with the feature request template
- Provide clear use cases and requirements
- Consider potential implementation approaches
- Discuss the feature in issues before implementation

## 📖 Documentation

### Types of Documentation
- **API Documentation**: Code comments and JSDoc
- **User Guides**: Tutorials and how-to guides
- **Examples**: Practical usage examples
- **Reference**: Format specification and CLI reference

### Updating Documentation
- Keep documentation in sync with code changes
- Use clear, concise language
- Include code examples
- Update README.md for user-facing changes
- Update CHANGELOG.md for version changes

## 🏗️ Development Workflow

### Before You Start
- Check existing issues and pull requests
- Discuss large changes in an issue first
- Create a feature branch from `main`
- Ensure your local environment is up to date

### During Development
- Write tests as you develop
- Commit frequently with clear messages
- Keep PRs focused and reasonably sized
- Update documentation as needed

### Before Submitting
- Ensure all tests pass
- Run benchmarks if performance-related
- Check code style and formatting
- Update documentation
- Review your own changes

## 🤝 Code Review Process

### Reviewers Focus On
- Correctness and functionality
- Performance implications
- Code style and readability
- Test coverage and quality
- Documentation completeness
- Breaking changes and compatibility

### Author Responsibilities
- Address reviewer feedback promptly
- Explain complex design decisions
- Update tests and documentation
- Consider alternative approaches

## 📋 Release Process

### Version Bumping
- **Patch (0.0.x)**: Bug fixes, documentation
- **Minor (0.x.0)**: New features, breaking changes in APIs
- **Major (x.0.0)**: Major architectural changes

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Tags created and pushed
- [ ] GitHub release created
- [ ] npm package published

## 🎯 Areas for Contribution

> 💡 **Looking for your first contribution?** Check issues labeled [`good first issue`](https://github.com/tonl-dev/tonl/labels/good%20first%20issue) or [`help wanted`](https://github.com/tonl-dev/tonl/labels/help%20wanted)

### 🔴 Critical Priority

**We need help with:**

1. **Type Safety Improvements** 🛡️
   - Eliminating `any` types from codebase
   - Adding comprehensive type guards
   - Improving TypeScript strict mode compliance
   - **Impact**: Foundation for all future development
   - **Skills**: TypeScript, type systems

2. **Schema Validation System** 🌟 **FLAGSHIP**
   - Designing TONL Schema Language (TSL)
   - Implementing schema parser
   - Building validation engine
   - TypeScript type generation
   - **Impact**: Critical for enterprise adoption
   - **Skills**: Parser design, validation logic, code generation

3. **Parser Refactoring** 🔧
   - Splitting large files into modules
   - Reducing cyclomatic complexity
   - Improving maintainability
   - **Impact**: Code health and extensibility
   - **Skills**: Refactoring, architecture, testing

4. **Enhanced Error Reporting** 📝
   - Line/column tracking
   - Rich error messages with suggestions
   - Error recovery strategies
   - **Impact**: Developer experience
   - **Skills**: Parser implementation, UX design

### 🟡 High Priority (v0.5.0-0.6.0 - 3-9 Months)

5. **Streaming API Implementation**
   - Node.js streams support
   - Async iterators
   - Web Streams API
   - **Impact**: Large file support
   - **Skills**: Node.js streams, async programming

6. **Python Binding** 🌟
   - Pure Python implementation
   - PyPI package
   - Pandas/Jupyter integration
   - **Impact**: ML/AI community access
   - **Skills**: Python, packaging, data science

7. **Browser Support**
   - Multi-format bundling (ESM, UMD, IIFE)
   - CDN distribution
   - Web Worker support
   - **Impact**: Platform expansion
   - **Skills**: Build tools, browser APIs

8. **VS Code Extension**
   - Syntax highlighting
   - IntelliSense
   - Schema validation
   - **Impact**: Developer experience
   - **Skills**: VS Code API, Language Server Protocol

### 🟢 Medium Priority (v0.7.0+ - 9+ Months)

9. **Binary Format Specification**
   - Binary encoding design
   - Performance optimization
   - **Skills**: Binary protocols, compression

10. **Additional Language Bindings**
    - Go implementation
    - Rust implementation
    - **Skills**: Go, Rust, FFI

11. **Framework Integrations**
    - Express/Fastify middleware
    - Database adapters
    - **Skills**: Framework knowledge, API design

### 🔬 Research & Experimental

12. **Advanced Algorithms**
    - Delta encoding
    - Dictionary compression
    - AI-powered adaptive encoding
    - **Skills**: Algorithms, compression, ML

---

## 🎁 Contribution Ideas by Skill Level

### Beginner-Friendly
- 📝 Fix typos in documentation
- 🧪 Add test cases for edge scenarios
- 📚 Write usage examples
- 🐛 Report bugs with detailed reproduction steps
- 💬 Answer questions in Discussions

### Intermediate
- 🔧 Fix reported bugs
- ✨ Implement CLI enhancements
- 📖 Write tutorials and guides
- 🧪 Improve test coverage
- 🎨 Improve error messages

### Advanced
- 🏗️ Design and implement schema system
- ⚡ Performance optimizations
- 🔬 Parser improvements
- 🌐 Language bindings
- 📊 Streaming API

---

## 🎓 Learning Resources

### Understanding TONL
- [README.md](README.md) - Project overview
- [SPECIFICATION.md](docs/SPECIFICATION.md) - Format specification
- [API.md](docs/API.md) - API reference
- [STRATEGIC_PLAN.md](STRATEGIC_PLAN.md) - Vision and roadmap

### Technical Background
- **Parsing**: [Crafting Interpreters](https://craftinginterpreters.com/)
- **Tokenization**: [OpenAI Tokenizer](https://platform.openai.com/tokenizer)
- **TypeScript**: [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- **Testing**: [Node.js Test Runner](https://nodejs.org/api/test.html)

### Similar Projects (for inspiration)
- CSV/TSV - Tabular simplicity
- JSON - Developer ergonomics
- Protocol Buffers - Schema systems
- MessagePack - Binary efficiency

## 📞 Getting Help

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat (coming soon)

### Resources
- [Project README](./README.md)
- [API Documentation](https://tonl.dev/docs)
- [Format Specification](./SPEC.md)
- [Examples](./examples/)

## 📜 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for everyone.

### Expected Behavior
- Be respectful and considerate
- Use welcoming and inclusive language
- Focus on constructive feedback
- Help others learn and grow
- Accept feedback gracefully

### Unacceptable Behavior
- Harassment or discrimination
- Personal attacks or insults
- Spam or off-topic content
- Disruptive behavior
- Publishing private information

### Reporting
If you experience or witness unacceptable behavior, please contact the maintainers directly.

## 🎉 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special thanks in major releases
- Community highlights and showcases

---

## 📞 Questions?

- **Issues**: [GitHub Issues](https://github.com/tonl-dev/tonl/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tonl-dev/tonl/discussions)
- **Repository**: [github.com/tonl-dev/tonl](https://github.com/tonl-dev/tonl)

Thank you for contributing to TONL! 🚀
