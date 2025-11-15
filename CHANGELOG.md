# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.2] - 2025-11-15

### 🔧 **Critical Bug Fixes & Security Enhancements**
- **Fixed**: All data integrity issues in encode/decode round-trip operations (100% test success)
- **Fixed**: Numeric precision loss for large integers (preserve > MAX_SAFE_INTEGER as strings)
- **Fixed**: Special character handling (__proto__, @symbol keys)
- **Enhanced**: Type coercion validation with specific error messages
- **Improved**: Parser error handling with clear context information
- **Hardened**: Stream buffer memory management
- **Enhanced**: CLI resource cleanup and error handling

### 📊 **Quality Metrics**
- **Test Coverage**: 496/496 tests passing (100%)
- **Security**: 96 security tests passing
- **Performance**: No regressions, improved stability
- **Compatibility**: 100% backward compatible

### 🔒 **Security**
- Comprehensive input validation
- Memory leak prevention
- Prototype pollution protection
- Resource exhaustion protection

## [2.0.0] - 2025-11-15

### 🚀 **Major Release - Advanced Optimization System**

**NEW: Advanced optimization module** providing up to 60% additional compression beyond standard TONL.

#### **Core Features:**
- **Dictionary Encoding** - Compress repetitive values (30-50% savings)
- **Delta Encoding** - Sequential data compression (40-60% savings)
- **Run-Length Encoding** - Repetitive value compression (50-80% savings)
- **Bit Packing** - Boolean/small integer optimization (87.5% savings)
- **Adaptive Optimizer** - Automatic strategy selection
- **Tokenizer Awareness** - LLM-specific optimization (5-15% savings)

#### **New APIs:**
```typescript
import { AdaptiveOptimizer, DictionaryBuilder, DeltaEncoder } from 'tonl';

// Automatic optimization
const optimizer = new AdaptiveOptimizer();
const result = optimizer.optimize(data);
```

#### **New CLI Commands:**
```bash
tonl encode data.json --optimize --stats
tonl query users.tonl "users[?(@.age > 25)]"
tonl get data.json "user.profile.email"
```

#### **Performance:**
- **Total Compression**: Up to 70% reduction vs JSON
- **Token Savings**: Up to 50% reduction for LLM prompts
- **Bundle Size**: 8.84 KB gzipped core (+2 KB optimization)

#### **Breaking Changes:**
- ✅ **100% backward compatible** - All existing APIs work unchanged
- **New Features**: 10+ optimization classes, new CLI commands
- **Enhanced Format**: Support for optimization directives

---

## [1.0.13] - 2025-11-15

### 🐛 **Critical Data Integrity Fixes**

Fixed critical round-trip encoding/decoding issues, achieving **100% test success rate** (496/496 tests passing).

**Key Fixes:**
- ✅ **Parser State Machine** - Enhanced quote/escape sequence handling
- ✅ **Special Character Preservation** - Whitespace, Unicode, complex keys
- ✅ **Array Parsing** - Mixed format arrays with nested objects
- ✅ **Numeric Values** - Proper Infinity/NaN handling
- ✅ **Edge Cases** - All 7 failing comprehensive tests now pass

**Impact:**
- **Test Success**: 98.6% → 100% (496/496 tests)
- **Data Integrity**: Perfect round-trip fidelity for all types
- **Backward Compatible**: Zero breaking changes

---

## Previous Versions

### [1.0.12] - 2025-11-14
**📊 Benchmark Suite & Documentation Enhancement**
- Added comprehensive benchmark suite with multi-LLM token analysis
- Enhanced documentation and website structure
- Performance: 26.5% byte reduction, 30.4% token reduction vs JSON
- Cost savings: 15%+ average reduction in LLM API costs

### [1.0.11] - 2025-11-13
**🛡️ Security Hardening (Critical)**
- Fixed 6 security vulnerabilities (ReDoS, injection, overflow)
- Added 96 security tests
- Comprehensive input validation and resource limits

### [1.0.10] - 2025-11-12
**⚡ Performance & Feature Complete**
- Complete feature set shipped (query, modification, indexing, streaming, schema)
- 100% test coverage achieved
- Browser support with 8.84 KB gzipped bundles

---

*For detailed historical changes, see git commit history*