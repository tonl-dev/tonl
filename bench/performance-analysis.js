#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import { encodeTONL, decodeTONL, encodeSmart, TONLDocument } from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }
  return 0;
}

function runBenchmark(filePath, iterations = 100) {
  const jsonContent = fs.readFileSync(filePath, 'utf8');
  const fileSize = Buffer.byteLength(jsonContent, 'utf8') / 1024 / 1024; // MB

  const parsedData = JSON.parse(jsonContent);

  // Memory measurement
  const memoryBefore = getMemoryUsage();

  // Encode benchmark
  const encodeStart = performance.now();
  let tonlContent = '';
  for (let i = 0; i < iterations; i++) {
    tonlContent = encodeTONL(parsedData);
  }
  const encodeEnd = performance.now();
  const encodeTime = (encodeEnd - encodeStart) / iterations;

  // Smart encode benchmark
  const smartEncodeStart = performance.now();
  let smartTonlContent = '';
  for (let i = 0; i < iterations; i++) {
    smartTonlContent = encodeSmart(parsedData);
  }
  const smartEncodeEnd = performance.now();
  const smartEncodeTime = (smartEncodeEnd - smartEncodeStart) / iterations;

  // Decode benchmark
  const decodeStart = performance.now();
  let decodedData = null;
  for (let i = 0; i < iterations; i++) {
    decodedData = decodeTONL(tonlContent);
  }
  const decodeEnd = performance.now();
  const decodeTime = (decodeEnd - decodeStart) / iterations;

  // Query benchmark
  const doc = new TONLDocument(tonlContent);
  const queryStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    // Sample queries that would work with most data
    try {
      doc.query('$.users[*]') || doc.query('$.data[*]') || doc.query('$[*]');
    } catch (e) {
      // Skip query if structure doesn't support it
      try {
        doc.query('$[0]') || doc.query('$.*');
      } catch (e2) {
        // Skip all queries if structure is incompatible
      }
    }
  }
  const queryEnd = performance.now();
  const queryTime = (queryEnd - queryStart) / iterations;

  const memoryAfter = getMemoryUsage();

  return {
    filename: path.basename(filePath),
    fileSize,
    encodeTime,
    decodeTime,
    smartEncodeTime,
    queryTime,
    memoryBefore,
    memoryAfter,
    throughput: {
      encodeMBps: fileSize / (encodeTime / 1000),
      decodeMBps: fileSize / (decodeTime / 1000),
      smartEncodeMBps: fileSize / (smartEncodeTime / 1000)
    }
  };
}

function printPerformanceTable(results) {
  console.log('\n⚡ Performance Comparison\n');
  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ File                        │ Size (MB)    │ Encode (ms)  │ Decode (ms)  │ Query (ms)   │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

  results.forEach(result => {
    const filename = result.filename.padEnd(27);
    const fileSize = result.fileSize.toFixed(2).padStart(12);
    const encodeTime = result.encodeTime.toFixed(2).padStart(12);
    const decodeTime = result.decodeTime.toFixed(2).padStart(12);
    const queryTime = result.queryTime.toFixed(2).padStart(12);

    console.log(`│ ${filename} │ ${fileSize} │ ${encodeTime} │ ${decodeTime} │ ${queryTime} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');
}

function printThroughputTable(results) {
  console.log('\n📊 Throughput Analysis (MB/s)\n');
  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ File                        │ Encode MB/s  │ Decode MB/s  │ Smart MB/s   │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┤');

  results.forEach(result => {
    const filename = result.filename.padEnd(27);
    const encodeMBps = result.throughput.encodeMBps.toFixed(1).padStart(12);
    const decodeMBps = result.throughput.decodeMBps.toFixed(1).padStart(12);
    const smartMBps = result.throughput.smartEncodeMBps.toFixed(1).padStart(12);

    console.log(`│ ${filename} │ ${encodeMBps} │ ${decodeMBps} │ ${smartMBps} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┘');
}

function printMemoryAnalysis(results) {
  console.log('\n💾 Memory Usage Analysis (MB)\n');
  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ File                        │ Before       │ After        │ Increase     │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┤');

  results.forEach(result => {
    const filename = result.filename.padEnd(27);
    const before = result.memoryBefore.toFixed(1).padStart(12);
    const after = result.memoryAfter.toFixed(1).padStart(12);
    const increase = (result.memoryAfter - result.memoryBefore).toFixed(1).padStart(12);

    console.log(`│ ${filename} │ ${before} │ ${after} │ ${increase} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┘');
}

function generateReport(results) {
  console.log('\n📋 Performance Report\n');

  const avgEncodeTime = results.reduce((sum, r) => sum + r.encodeTime, 0) / results.length;
  const avgDecodeTime = results.reduce((sum, r) => sum + r.decodeTime, 0) / results.length;
  const avgSmartEncodeTime = results.reduce((sum, r) => sum + r.smartEncodeTime, 0) / results.length;
  const avgQueryTime = results.reduce((sum, r) => sum + r.queryTime, 0) / results.length;

  const avgEncodeThroughput = results.reduce((sum, r) => sum + r.throughput.encodeMBps, 0) / results.length;
  const avgDecodeThroughput = results.reduce((sum, r) => sum + r.throughput.decodeMBps, 0) / results.length;
  const avgSmartThroughput = results.reduce((sum, r) => sum + r.throughput.smartEncodeMBps, 0) / results.length;

  console.log('📊 Average Performance Metrics:');
  console.log(`   Encode time: ${avgEncodeTime.toFixed(2)}ms`);
  console.log(`   Decode time: ${avgDecodeTime.toFixed(2)}ms`);
  console.log(`   Smart encode time: ${avgSmartEncodeTime.toFixed(2)}ms`);
  console.log(`   Query time: ${avgQueryTime.toFixed(2)}ms`);
  console.log(`   Encode throughput: ${avgEncodeThroughput.toFixed(1)} MB/s`);
  console.log(`   Decode throughput: ${avgDecodeThroughput.toFixed(1)} MB/s`);
  console.log(`   Smart encode throughput: ${avgSmartThroughput.toFixed(1)} MB/s`);

  // Performance classification
  console.log('\n🎯 Performance Classification:');
  if (avgEncodeThroughput > 50) {
    console.log('   ✅ Encode performance: Very High');
  } else if (avgEncodeThroughput > 20) {
    console.log('   ✅ Encode performance: High');
  } else if (avgEncodeThroughput > 10) {
    console.log('   ⚠️  Encode performance: Medium');
  } else {
    console.log('   ❌ Encode performance: Low');
  }

  if (avgDecodeThroughput > 100) {
    console.log('   ✅ Decode performance: Very High');
  } else if (avgDecodeThroughput > 50) {
    console.log('   ✅ Decode performance: High');
  } else if (avgDecodeThroughput > 25) {
    console.log('   ⚠️  Decode performance: Medium');
  } else {
    console.log('   ❌ Decode performance: Low');
  }

  // Smart vs Regular comparison
  const smartVsRegular = ((avgSmartEncodeTime - avgEncodeTime) / avgEncodeTime) * 100;
  console.log(`\n🔧 Smart vs Regular Encode Comparison:`);
  if (Math.abs(smartVsRegular) < 5) {
    console.log(`   • Smart encoding performs similarly to regular (${smartVsRegular.toFixed(1)}% difference)`);
  } else if (smartVsRegular > 0) {
    console.log(`   • Smart encoding is ${smartVsRegular.toFixed(1)}% slower than regular`);
  } else {
    console.log(`   • Smart encoding is ${Math.abs(smartVsRegular).toFixed(1)}% faster than regular`);
  }

  // Recommendations
  console.log('\n💡 Performance Recommendations:');
  if (avgEncodeTime > 10) {
    console.log('   • Encoding time for large files can be optimized');
  }
  if (avgDecodeTime > 5) {
    console.log('   • Decoding time can be improved (caching/streaming recommended)');
  }
  if (avgQueryTime > 1) {
    console.log('   • Query performance can benefit from indexing');
  }

  const memoryIncrease = results.reduce((sum, r) =>
    sum + (r.memoryAfter - r.memoryBefore), 0) / results.length;
  if (memoryIncrease > 50) {
    console.log('   • High memory usage, consider streaming API');
  }

  // Best performing file
  const bestPerformer = results.sort((a, b) => a.encodeTime - b.encodeTime)[0];
  console.log(`\n🏆 Fastest encode performance: ${bestPerformer.filename} (${bestPerformer.encodeTime.toFixed(2)}ms)`);

  // Scalability analysis
  console.log('\n📈 Scalability Analysis:');
  const resultsBySize = results.sort((a, b) => a.fileSize - b.fileSize);
  if (resultsBySize.length >= 2) {
    const smallest = resultsBySize[0];
    const largest = resultsBySize[resultsBySize.length - 1];
    const sizeRatio = largest.fileSize / smallest.fileSize;
    const timeRatio = largest.encodeTime / smallest.encodeTime;
    const scalability = timeRatio / sizeRatio;

    console.log(`   • File size increase: ${sizeRatio.toFixed(1)}x`);
    console.log(`   • Encode time increase: ${timeRatio.toFixed(1)}x`);
    if (scalability < 1.5) {
      console.log('   ✅ Good scalability performance');
    } else if (scalability < 2.0) {
      console.log('   ⚠️  Medium scalability performance');
    } else {
      console.log('   ❌ Poor scalability performance');
    }
  }
}

async function main() {
  console.log('🚀 TONL Performance Analysis Starting...\n');

  const examplesDir = path.join(__dirname, '..', 'examples', 'benchmark-data');
  const jsonFiles = [
    'small-user-data-en.json',
    'medium-ecommerce-en.json',
    'large-healthcare-en.json'
  ].filter(file => fs.existsSync(path.join(examplesDir, file)));

  if (jsonFiles.length === 0) {
    console.log('❌ No test files found!');
    return;
  }

  const results = [];

  for (const jsonFile of jsonFiles) {
    console.log(`📁 Testing: ${jsonFile}`);

    // Adjust iterations based on file size
    const filePath = path.join(examplesDir, jsonFile);
    const fileSize = fs.statSync(filePath).size;

    let iterations = 100;
    if (fileSize > 10000) iterations = 50;  // Large files
    if (fileSize > 50000) iterations = 20;  // Very large files

    console.log(`   Iterations: ${iterations}`);

    try {
      const result = runBenchmark(filePath, iterations);
      results.push(result);
      console.log(`   ✅ Completed`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  if (results.length > 0) {
    printPerformanceTable(results);
    printThroughputTable(results);
    printMemoryAnalysis(results);
    generateReport(results);
  }

  console.log('\n✅ Performance analysis completed!');
}

main().catch(console.error);