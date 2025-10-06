# TONL Roadmap

This document outlines the future development plans for TONL (Token-Optimized Notation Language).

## Current Status (v0.2.0) - ✅ Released

**October 6, 2025**

### ✅ Completed Features
- [x] Core encode/decode functionality
- [x] CLI with encode/decode/stats commands
- [x] Smart encoding with delimiter optimization
- [x] Type inference and schema hints
- [x] Complete test suite
- [x] Performance benchmarks
- [x] Full documentation
- [x] Round-trip JSON compatibility
- [x] Multiple delimiter support
- [x] Nested object/array handling

---

## Short Term (v0.3.0) - Next 2-3 Months

### 🎯 Priority Features

#### Enhanced CLI & Tooling
- [ ] **Batch Processing**: `tonl batch *.json --output-dir ./tonl/`
- [ ] **Pretty Print**: `tonl format --pretty data.tonl`
- [ ] **Format Detection**: Automatic format detection for unknown files

#### Performance & Optimization
- [ ] **Memory Optimization**: Reduce memory usage for large files
- [ ] **Caching**: Schema and format pattern caching

#### Developer Experience
- [ ] **VS Code Extension**: Basic syntax highlighting and language support
- [ ] **Prettier Plugin**: Auto-formatting for TONL files

#### Schema & Validation
- [ ] **JSON Schema Support**: External schema validation
- [ ] **TypeScript Generation**: Generate TS types from TONL schemas

---

## Medium Term (v0.4.0) - 3-6 Months

### 🚀 Major Features

#### Streaming API
- [ ] **Stream Encoding**: `encodeTONLStream(readable, writable)`
- [ ] **Stream Decoding**: `decodeTONLStream(readable, writable)`
- [ ] **Node.js Streams**: Full Node.js stream compatibility

#### Advanced Features
- [ ] **Schema Evolution**: Basic version-aware schema migration
- [ ] **Custom Validators**: Pluggable validation system

---

## Long Term (v0.5.0) - 6-12 Months

### 🌟 Platform Features

#### Multi-Language Support
- [ ] **Python Library**: `pip install tonl`
- [ ] **Go Library**: `go get github.com/ersinkoc/tonl-go`
- [ ] **Rust Library**: `cargo add tonl`

#### Web Integration
- [ ] **Web Playground**: Interactive TONL converter
- [ ] **Docker Images**: Official Docker containers

---

## Research & Experimental

### 🔬 Future Research Areas

#### Advanced Algorithms
- [ ] **Delta Encoding**: Efficient difference encoding
- [ ] **Dictionary Compression**: Custom dictionary support
- [ ] **Adaptive Encoding**: Context-aware compression

---

## Community & Ecosystem

### 🤝 Contributing
- [ ] **Contributor Guidelines**: Clear contribution process
- [ ] **Code of Conduct**: Community behavior standards
- [ ] **Issue Templates**: Standardized issue reporting
- [ ] **PR Templates**: Consistent pull request format

### 📚 Documentation
- [ ] **Tutorial Series**: Step-by-step learning paths
- [ ] **Integration Guides**: Platform-specific guides
- [ ] **Best Practices**: Recommended usage patterns

---

## Release Timeline

| Version | Target Date | Focus |
|---------|-------------|-------|
| v0.2.0 | Oct 6, 2025 | ✅ Initial Release |
| v0.3.0 | Feb 2025 | CLI & Developer Experience |
| v0.4.0 | May 2025 | Streaming API |
| v0.5.0 | Aug 2025 | Multi-Language Support |

---

## 📝 Notes

- **Priorities may shift** based on community feedback and market demands
- **Version numbers** follow semantic versioning (MAJOR.MINOR.PATCH)
- **Release dates** are estimates and subject to change
- **Community input** is highly valued for feature prioritization

---

## 🚀 Getting Involved

Interested in contributing? Check out our:
- [GitHub Repository](https://github.com/ersinkoc/tonl)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Documentation](docs/)

**Let's build the future of data serialization together!** 🚀