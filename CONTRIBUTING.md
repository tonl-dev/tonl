# Contributing to TONL

Thank you for your interest in contributing to TONL (Token-Optimized Notation Language)! This document provides guidelines and information for contributors.

## 🏠 Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- TypeScript 5.0 or higher
- Git and a GitHub account
- Familiarity with JSON and data serialization concepts

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
- Use the [GitHub Issues](https://github.com/ersinkoc/tonl/issues) page
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
- Use Node.js built-in test runner
- Test both happy path and error cases
- Include edge cases and boundary conditions
- Test performance-critical code paths
- Add golden tests for format stability

### Test Coverage
- Aim for high test coverage on core functionality
- Focus on parser, encoder, and decoder
- Test CLI commands and options
- Include integration tests

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

### High Priority
- Performance optimizations
- Bug fixes and stability improvements
- Additional parser format support
- CLI enhancements and new commands
- Test coverage improvements

### Medium Priority
- Language bindings (Python, Go, Rust)
- Web playground and tools
- VS Code extension
- Additional delimiter support
- Schema validation features

### Low Priority
- Experimental features
- Minor documentation improvements
- Tooling and build improvements
- Example applications

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

Thank you for contributing to TONL! 🚀

---

## 📞 Contact

- **Project Maintainer**: Ersin KOÇ
- **Email**: ersin@tonl.dev
- **GitHub**: @ersinkoc
- **Website**: [tonl.dev](https://tonl.dev)