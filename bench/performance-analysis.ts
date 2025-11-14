#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { encodeTONL, decodeTONL, encodeSmart, TONLDocument } from '../dist/index.js';

interface PerformanceMetrics {
  fileSize: number;
  encodeTime: number;
  decodeTime: number;
  smartEncodeTime: number;
  queryTime: number;
  memoryBefore: number;
  memoryAfter: number;
  iterations: number;
}

interface BenchmarkResult {
  filename: string;
  metrics: PerformanceMetrics;
  throughput: {
    encodeMBps: number;
    decodeMBps: number;
    smartEncodeMBps: number;
  };
}

function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }
  return 0;
}

function runBenchmark(filePath: string, iterations: number = 100): BenchmarkResult {
  const jsonContent = fs.readFileSync(filePath, 'utf8');
  const fileSize = Buffer.byteLength(jsonContent, 'utf8') / 1024 / 1024; // MB

  const parsedData = JSON.parse(jsonContent);

  // Memory measurement
  const memoryBefore = getMemoryUsage();

  // Encode benchmark
  const encodeStart = performance.now();
  let tonlContent: string = '';
  for (let i = 0; i < iterations; i++) {
    tonlContent = encodeTONL(parsedData);
  }
  const encodeEnd = performance.now();
  const encodeTime = (encodeEnd - encodeStart) / iterations;

  // Smart encode benchmark
  const smartEncodeStart = performance.now();
  let smartTonlContent: string = '';
  for (let i = 0; i < iterations; i++) {
    smartTonlContent = encodeSmart(parsedData);
  }
  const smartEncodeEnd = performance.now();
  const smartEncodeTime = (smartEncodeEnd - smartEncodeStart) / iterations;

  // Decode benchmark
  const decodeStart = performance.now();
  let decodedData: any = null;
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
    }
  }
  const queryEnd = performance.now();
  const queryTime = (queryEnd - queryStart) / iterations;

  const memoryAfter = getMemoryUsage();

  const metrics: PerformanceMetrics = {
    fileSize,
    encodeTime,
    decodeTime,
    smartEncodeTime,
    queryTime,
    memoryBefore,
    memoryAfter,
    iterations
  };

  const throughput = {
    encodeMBps: fileSize / (encodeTime / 1000),
    decodeMBps: fileSize / (decodeTime / 1000),
    smartEncodeMBps: fileSize / (smartEncodeTime / 1000)
  };

  return {
    filename: path.basename(filePath),
    metrics,
    throughput
  };
}

function printPerformanceTable(results: BenchmarkResult[]) {
  console.log('\n⚡ Performans Karşılaştırması\n');
  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Dosya                       │ Boyut (MB)   │ Encode (ms)  │ Decode (ms)  │ Query (ms)   │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

  results.forEach(result => {
    const filename = result.filename.padEnd(27);
    const fileSize = result.metrics.fileSize.toFixed(2).padStart(12);
    const encodeTime = result.metrics.encodeTime.toFixed(2).padStart(12);
    const decodeTime = result.metrics.decodeTime.toFixed(2).padStart(12);
    const queryTime = result.metrics.queryTime.toFixed(2).padStart(12);

    console.log(`│ ${filename} │ ${fileSize} │ ${encodeTime} │ ${decodeTime} │ ${queryTime} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');
}

function printThroughputTable(results: BenchmarkResult[]) {
  console.log('\n📊 Throughput Analizi (MB/s)\n');
  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Dosya                       │ Encode MB/s  │ Decode MB/s  │ Smart MB/s   │');
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

function printMemoryAnalysis(results: BenchmarkResult[]) {
  console.log('\n💾 Bellek Kullanım Analizi (MB)\n');
  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Dosya                       │ Önce         │ Sonra        │ Artış        │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┤');

  results.forEach(result => {
    const filename = result.filename.padEnd(27);
    const before = result.metrics.memoryBefore.toFixed(1).padStart(12);
    const after = result.metrics.memoryAfter.toFixed(1).padStart(12);
    const increase = (result.metrics.memoryAfter - result.metrics.memoryBefore).toFixed(1).padStart(12);

    console.log(`│ ${filename} │ ${before} │ ${after} │ ${increase} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┘');
}

function printScalabilityAnalysis(results: BenchmarkResult[]) {
  console.log('\n📈 Ölçeklenebilirlik Analizi\n');

  results.sort((a, b) => a.metrics.fileSize - b.metrics.fileSize);

  console.log('Dosya boyutuna göre performans değişimi:');
  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Boyut (MB)                  │ Encode (ms)  │ Decode (ms)  │ Verimlilik   │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┤');

  results.forEach(result => {
    const fileSize = result.metrics.fileSize.toFixed(2).padEnd(27);
    const encodeTime = result.metrics.encodeTime.toFixed(2).padStart(12);
    const decodeTime = result.metrics.decodeTime.toFixed(2).padStart(12);

    // Calculate efficiency (time per MB)
    const efficiency = (result.metrics.encodeTime / result.metrics.fileSize).toFixed(1).padStart(12);

    console.log(`│ ${fileSize} │ ${encodeTime} │ ${decodeTime} │ ${efficiency} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┘');
}

function generateReport(results: BenchmarkResult[]) {
  console.log('\n📋 Performans Raporu\n');

  const avgEncodeTime = results.reduce((sum, r) => sum + r.metrics.encodeTime, 0) / results.length;
  const avgDecodeTime = results.reduce((sum, r) => sum + r.metrics.decodeTime, 0) / results.length;
  const avgSmartEncodeTime = results.reduce((sum, r) => sum + r.metrics.smartEncodeTime, 0) / results.length;
  const avgQueryTime = results.reduce((sum, r) => sum + r.metrics.queryTime, 0) / results.length;

  const avgEncodeThroughput = results.reduce((sum, r) => sum + r.throughput.encodeMBps, 0) / results.length;
  const avgDecodeThroughput = results.reduce((sum, r) => sum + r.throughput.decodeMBps, 0) / results.length;
  const avgSmartThroughput = results.reduce((sum, r) => sum + r.throughput.smartEncodeMBps, 0) / results.length;

  console.log('📊 Ortalama Performans Metrikleri:');
  console.log(`   Encode süresi: ${avgEncodeTime.toFixed(2)}ms`);
  console.log(`   Decode süresi: ${avgDecodeTime.toFixed(2)}ms`);
  console.log(`   Smart encode süresi: ${avgSmartEncodeTime.toFixed(2)}ms`);
  console.log(`   Query süresi: ${avgQueryTime.toFixed(2)}ms`);
  console.log(`   Encode throughput: ${avgEncodeThroughput.toFixed(1)} MB/s`);
  console.log(`   Decode throughput: ${avgDecodeThroughput.toFixed(1)} MB/s`);
  console.log(`   Smart encode throughput: ${avgSmartThroughput.toFixed(1)} MB/s`);

  // Performance classification
  console.log('\n🎯 Performans Sınıflandırması:');
  if (avgEncodeThroughput > 50) {
    console.log('   ✅ Encode performansı: Çok Yüksek');
  } else if (avgEncodeThroughput > 20) {
    console.log('   ✅ Encode performansı: Yüksek');
  } else if (avgEncodeThroughput > 10) {
    console.log('   ⚠️  Encode performansı: Orta');
  } else {
    console.log('   ❌ Encode performansı: Düşük');
  }

  if (avgDecodeThroughput > 100) {
    console.log('   ✅ Decode performansı: Çok Yüksek');
  } else if (avgDecodeThroughput > 50) {
    console.log('   ✅ Decode performansı: Yüksek');
  } else if (avgDecodeThroughput > 25) {
    console.log('   ⚠️  Decode performansı: Orta');
  } else {
    console.log('   ❌ Decode performansı: Düşük');
  }

  // Smart vs Regular comparison
  const smartVsRegular = ((avgSmartEncodeTime - avgEncodeTime) / avgEncodeTime) * 100;
  console.log(`\n🔧 Smart vs Regular Encode Karşılaştırması:`);
  if (Math.abs(smartVsRegular) < 5) {
    console.log(`   • Smart encode, regular encode ile benzer performans gösteriyor (${smartVsRegular.toFixed(1)}% fark)`);
  } else if (smartVsRegular > 0) {
    console.log(`   • Smart encode, regular encode'den ${smartVsRegular.toFixed(1)}% daha yavaş`);
  } else {
    console.log(`   • Smart encode, regular encode'den ${Math.abs(smartVsRegular).toFixed(1)}% daha hızlı`);
  }

  // Recommendations
  console.log('\n💡 Performans Önerileri:');
  if (avgEncodeTime > 10) {
    console.log('   • Büyük dosyalar için encode süresi optimize edilebilir');
  }
  if (avgDecodeTime > 5) {
    console.log('   • Decode süresi iyileştirilebilir (caching/streaming önerilir)');
  }
  if (avgQueryTime > 1) {
    console.log('   • Sorgu performansı için indeksleme önerilir');
  }

  const memoryIncrease = results.reduce((sum, r) =>
    sum + (r.metrics.memoryAfter - r.metrics.memoryBefore), 0) / results.length;
  if (memoryIncrease > 50) {
    console.log('   • Bellek kullanımı yüksek, streaming API kullanılmalı');
  }
}

async function main() {
  console.log('🚀 TONL Performans Analizi Başlatılıyor...\n');

  const examplesDir = path.join(process.cwd(), 'examples', 'benchmark-data');
  const jsonFiles = [
    'small-user-data.json',
    'medium-ecommerce.json',
    'large-healthcare.json'
  ].filter(file => fs.existsSync(path.join(examplesDir, file)));

  if (jsonFiles.length === 0) {
    console.log('❌ Test dosyaları bulunamadı!');
    return;
  }

  const results: BenchmarkResult[] = [];

  for (const jsonFile of jsonFiles) {
    console.log(`📁 Test ediliyor: ${jsonFile}`);

    // Adjust iterations based on file size
    const filePath = path.join(examplesDir, jsonFile);
    const fileSize = fs.statSync(filePath).size;

    let iterations = 100;
    if (fileSize > 10000) iterations = 50;  // Large files
    if (fileSize > 50000) iterations = 20;  // Very large files

    console.log(`   İterasyon sayısı: ${iterations}`);

    try {
      const result = runBenchmark(filePath, iterations);
      results.push(result);
      console.log(`   ✅ Tamamlandı`);
    } catch (error) {
      console.log(`   ❌ Hata: ${error.message}`);
    }
  }

  if (results.length > 0) {
    printPerformanceTable(results);
    printThroughputTable(results);
    printMemoryAnalysis(results);
    printScalabilityAnalysis(results);
    generateReport(results);
  }

  console.log('\n✅ Performans analizi tamamlandı!');
}

main().catch(console.error);