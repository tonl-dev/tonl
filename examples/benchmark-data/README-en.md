# TONL Benchmark Data

This folder contains example data files for testing the performance of the TONL format.

## File Structure

### JSON Files (Different Sizes)

#### 📄 Small Size - User Data
- **File**: `small-user-data-en.json` (417 bytes)
- **Content**: Single user profile with preferences and statistics
- **Use Case**: User profiles, configuration files

#### 📄 Medium Size - E-commerce Catalog
- **File**: `medium-ecommerce-en.json` (6.9 KB)
- **Content**: Product catalog, customer information, orders, and analytics data
- **Use Case**: E-commerce platforms, product management

#### 📄 Large Size - Healthcare Data
- **File**: `large-healthcare-en.json` (12.6 KB)
- **Content**: Hospital management system data (patient records, staff, appointments)
- **Use Case**: Hospital information systems, medical records

### YAML Files

#### ⚙️ Small - Application Configuration
- **File**: `small-config-en.yaml`
- **Content**: Web application configuration settings
- **Use Case**: Config files, deployment settings

### CSV Files

#### 👥 Small - Employee List
- **File**: `small-employees-en.csv`
- **Content**: Employee information and department assignments
- **Use Case**: HR systems, personnel management

### TONL Formats

Automatically generated TONL versions for each JSON file:
- `small-user-data-en.tonl`
- `medium-ecommerce-en.tonl`
- `large-healthcare-en.tonl`
- `*-smart.tonl` (Smart encoding optimized versions)

## Benchmark Results

### Format Comparison

| File | JSON (Bytes) | TONL (Bytes) | Smart (Bytes) | Savings (%) |
|-------|--------------|--------------|---------------|------------|
| small-user-data-en.json | 417 | 438 | 451 | -5.0% |
| medium-ecommerce-en.json | 6,863 | 5,493 | 5,506 | 20.0% |
| large-healthcare-en.json | 12,912 | 8,942 | 8,949 | 30.7% |

**Summary**:
- 📁 **Total JSON Size**: 20,192 bytes
- 📦 **Total TONL Size**: 14,873 bytes
- 💾 **Byte Savings**: **26.3%**
- 🧠 **Token Savings**: **30.4%**

### Token Analysis (Estimated)

| Model | JSON Cost | TONL Cost | Savings |
|-------|------------|------------|----------|
| GPT-4 | $0.1505 | $0.1106 | **15.1%** |
| GPT-3.5-Turbo | $0.0050 | $0.0037 | **15.1%** |
| Claude-3.5-Sonnet | $0.0132 | $0.0097 | **15.2%** |
| Gemini-1.5-Pro | $0.0169 | $0.0124 | **15.3%** |
| Llama-3-8B | $0.0023 | $0.0017 | **15.3%** |

### Performance Metrics

- 📊 **Average Encode time**: 1.28ms
- ⚡ **Average Decode time**: 1.11ms
- 🧠 **Average Query time**: 0.16ms
- 📈 **Encode throughput**: 4.8 MB/s
- 🚀 **Smart encode**: 50.9% faster than regular

## How to Use

### CLI Benchmark Execution

```bash
# Format comparison
node bench/run-benchmarks.js

# Token analysis
node bench/token-analysis.js

# Performance analysis
node bench/performance-analysis.js

# Run all benchmarks
node bench/run-all.js
```

### Manual Conversion

```bash
# JSON to TONL
tonl encode examples/benchmark-data/medium-ecommerce-en.json --out ecommerce.tonl --stats

# Smart encoding
tonl encode examples/benchmark-data/medium-ecommerce-en.json --out ecommerce-smart.tonl --smart --stats

# TONL to JSON
tonl decode examples/benchmark-data/medium-ecommerce-en.tonl --out ecommerce-decoded.json
```

### Programmatic Usage

```javascript
import { encodeTONL, decodeTONL, encodeSmart } from 'tonl';

// Load data
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// TONL encoding
const tonl = encodeTONL(data);
const tonlSmart = encodeSmart(data);

// TONL decoding
const decoded = decodeTONL(tonl);
```

## Recommendations

### ✅ Use TONL Format If:
- **Size savings** is important (>20% gain)
- **Token costs** are high (%15+ savings)
- **Readability** and **LLM compatibility** are needed
- **Large datasets** are being processed

### ⚠️ Considerations:
- **Small files** (<1KB) may have performance overhead
- **Memory usage** may increase with large files
- **Query performance** can be optimized further

### 🏆 Best Results:
- **large-healthcare-en.json**: 30.7% byte savings
- **Llama-3-8B model**: 15.3% cost savings
- **Smart encoding**: 50.9% faster

## Technical Details

### Token Estimation
- **GPT models**: ~4 characters = 1 token
- **Claude models**: ~4.5 characters = 1 token
- **English text**: Similar character/token ratios across models

### Performance Tests
- **Iteration count**: Dynamic based on file size (20-100)
- **Memory measurement**: Heap usage based
- **Throughput**: Calculated in MB/s

### Calibration
These benchmark results are specific to this data set. Different data types and structures may yield different results. Testing with your own data is recommended.