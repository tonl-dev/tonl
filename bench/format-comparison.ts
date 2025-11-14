#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { encodeTONL, decodeTONL, encodeSmart } from '../dist/index.js';

interface FormatBenchmark {
  filename: string;
  size: number;
  encodeTime: number;
  decodeTime: number;
  tokens: number;
  compressionRatio: number;
}

interface FormatComparison {
  json: FormatBenchmark;
  tonl: FormatBenchmark;
  tonlSmart: FormatBenchmark;
  yaml?: FormatBenchmark;
}

// Simple tokenizer for token estimation
function estimateTokens(text: string): number {
  // Simple token estimation (approximately 1 token per 4 characters for English)
  // For Turkish, we'll use a slightly different ratio
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const chars = text.length;

  // Mix of word count and character-based estimation
  return Math.ceil(words.length * 1.3 + chars / 4);
}

async function benchmarkFile(filePath: string): Promise<FormatBenchmark> {
  const content = fs.readFileSync(filePath, 'utf8');
  const size = Buffer.byteLength(content, 'utf8');
  const tokens = estimateTokens(content);

  // Benchmark encoding/decoding (for TONL)
  let encodeTime = 0;
  let decodeTime = 0;

  if (filePath.endsWith('.tonl')) {
    const jsonContent = fs.readFileSync(filePath.replace('.tonl', '.json'), 'utf8');
    const parsedData = JSON.parse(jsonContent);

    // Encode benchmark
    const encodeStart = performance.now();
    const tonlContent = encodeTONL(parsedData);
    const encodeEnd = performance.now();
    encodeTime = encodeEnd - encodeStart;

    // Decode benchmark
    const decodeStart = performance.now();
    const decoded = decodeTONL(content);
    const decodeEnd = performance.now();
    decodeTime = decodeEnd - decodeStart;
  } else {
    encodeTime = 0;
    decodeTime = 0;
  }

  // Calculate compression ratio (original vs current)
  const originalSize = size;
  const compressionRatio = (originalSize / size - 1) * 100;

  return {
    filename: path.basename(filePath),
    size,
    encodeTime,
    decodeTime,
    tokens,
    compressionRatio
  };
}

async function compareFormats(jsonFilePath: string): Promise<FormatComparison> {
  const jsonBenchmark = await benchmarkFile(jsonFilePath);

  // Generate TONL versions if they don't exist
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
  const parsedData = JSON.parse(jsonContent);

  // Regular TONL
  const tonlPath = jsonFilePath.replace('.json', '.tonl');
  if (!fs.existsSync(tonlPath)) {
    const tonlContent = encodeTONL(parsedData);
    fs.writeFileSync(tonlPath, tonlContent);
  }
  const tonlBenchmark = await benchmarkFile(tonlPath);

  // Smart TONL
  const tonlSmartPath = jsonFilePath.replace('.json', '-smart.tonl');
  if (!fs.existsSync(tonlSmartPath)) {
    const tonlSmartContent = encodeSmart(parsedData);
    fs.writeFileSync(tonlSmartPath, tonlSmartContent);
  }
  const tonlSmartBenchmark = await benchmarkFile(tonlSmartPath);

  const comparison: FormatComparison = {
    json: jsonBenchmark,
    tonl: tonlBenchmark,
    tonlSmart: tonlSmartBenchmark
  };

  // YAML comparison if available
  const yamlPath = jsonFilePath.replace('.json', '.yaml');
  if (fs.existsSync(yamlPath)) {
    comparison.yaml = await benchmarkFile(yamlPath);
  }

  return comparison;
}

function printComparisonTable(comparisons: FormatComparison[]) {
  console.log('\n📊 Format Karşılaştırma Tablosu\n');

  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Dosya                       │ JSON (Bytes) │ TONL (Bytes) │ Smart (Bytes) │ Kazanç (%)   │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

  comparisons.forEach(comp => {
    const jsonSize = comp.json.size;
    const tonlSize = comp.tonl.size;
    const smartSize = comp.tonlSmart.size;
    const bestSize = Math.min(tonlSize, smartSize);
    const savings = ((jsonSize - bestSize) / jsonSize * 100).toFixed(1);

    console.log(`│ ${comp.json.filename.padEnd(27)} │ ${jsonSize.toString().padStart(12)} │ ${tonlSize.toString().padStart(12)} │ ${smartSize.toString().padStart(12)} │ ${savings.padStart(12)} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');
}

function printTokenComparison(comparisons: FormatComparison[]) {
  console.log('\n🧠 Token Karşılaştırması (GPT-4 Benzeri Model)\n');

  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Dosya                       │ JSON (Tokens)│ TONL (Tokens)│ Smart (Tokens)│ Kazanç (%)   │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

  comparisons.forEach(comp => {
    const jsonTokens = comp.json.tokens;
    const tonlTokens = comp.tonl.tokens;
    const smartTokens = comp.tonlSmart.tokens;
    const bestTokens = Math.min(tonlTokens, smartTokens);
    const savings = ((jsonTokens - bestTokens) / jsonTokens * 100).toFixed(1);

    console.log(`│ ${comp.json.filename.padEnd(27)} │ ${jsonTokens.toString().padStart(12)} │ ${tonlTokens.toString().padStart(12)} │ ${smartTokens.toString().padStart(12)} │ ${savings.padStart(12)} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');
}

function printPerformanceComparison(comparisons: FormatComparison[]) {
  console.log('\n⚡ Performans Karşılaştırması (milisaniye)\n');

  console.log('┌─────────────────────────────┬──────────────┬──────────────┐');
  console.log('│ Dosya                       │ Encode (ms)  │ Decode (ms)  │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┤');

  comparisons.forEach(comp => {
    const encodeTime = comp.tonl.encodeTime.toFixed(1);
    const decodeTime = comp.tonl.decodeTime.toFixed(1);

    console.log(`│ ${comp.json.filename.padEnd(27)} │ ${encodeTime.padStart(12)} │ ${decodeTime.padStart(12)} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┘');
}

async function main() {
  console.log('🚀 TONL Format Benchmark Analizi Başlatılıyor...\n');

  const examplesDir = path.join(process.cwd(), 'examples', 'benchmark-data');
  const jsonFiles = [
    'small-user-data.json',
    'medium-ecommerce.json',
    'large-healthcare.json'
  ].map(file => path.join(examplesDir, file));

  const comparisons: FormatComparison[] = [];

  for (const jsonFile of jsonFiles) {
    if (fs.existsSync(jsonFile)) {
      console.log(`📁 İşleniyor: ${path.basename(jsonFile)}`);
      const comparison = await compareFormats(jsonFile);
      comparisons.push(comparison);
    }
  }

  if (comparisons.length > 0) {
    printComparisonTable(comparisons);
    printTokenComparison(comparisons);
    printPerformanceComparison(comparisons);

    // Summary statistics
    const totalJsonSize = comparisons.reduce((sum, c) => sum + c.json.size, 0);
    const totalTonlSize = comparisons.reduce((sum, c) => sum + c.tonl.size, 0);
    const totalSmartSize = comparisons.reduce((sum, c) => sum + c.tonlSmart.size, 0);
    const totalJsonTokens = comparisons.reduce((sum, c) => sum + c.json.tokens, 0);
    const totalTonlTokens = comparisons.reduce((sum, c) => sum + c.tonl.tokens, 0);
    const totalSmartTokens = comparisons.reduce((sum, c) => sum + c.tonlSmart.tokens, 0);

    const bestBytes = Math.min(totalTonlSize, totalSmartSize);
    const bestTokens = Math.min(totalTonlTokens, totalSmartTokens);

    console.log('\n📈 Özet İstatistikler:');
    console.log(`   Toplam JSON Boyutu: ${totalJsonSize.toLocaleString()} bytes`);
    console.log(`   Toplam TONL Boyutu: ${totalTonlSize.toLocaleString()} bytes`);
    console.log(`   Toplam Smart TONL: ${totalSmartSize.toLocaleString()} bytes`);
    console.log(`   Byte Tasarrufu: ${((totalJsonSize - bestBytes) / totalJsonSize * 100).toFixed(1)}%`);
    console.log(`   JSON Token Sayısı: ${totalJsonTokens.toLocaleString()}`);
    console.log(`   TONL Token Sayısı: ${totalTonlTokens.toLocaleString()}`);
    console.log(`   Smart Token Sayısı: ${totalSmartTokens.toLocaleString()}`);
    console.log(`   Token Tasarrufu: ${((totalJsonTokens - bestTokens) / totalJsonTokens * 100).toFixed(1)}%`);
  }

  console.log('\n✅ Benchmark tamamlandı!');
}

main().catch(console.error);