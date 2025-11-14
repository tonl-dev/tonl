#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encodeTONL, decodeTONL, encodeSmart } from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple tokenizer for token estimation
function estimateTokens(text) {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const chars = text.length;
  return Math.ceil(words.length * 1.3 + chars / 4);
}

function analyzeFile(jsonFilePath) {
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
  const jsonSize = Buffer.byteLength(jsonContent, 'utf8');
  const jsonTokens = estimateTokens(jsonContent);

  const parsedData = JSON.parse(jsonContent);

  // Generate TONL versions
  const tonlContent = encodeTONL(parsedData);
  const tonlSize = Buffer.byteLength(tonlContent, 'utf8');
  const tonlTokens = estimateTokens(tonlContent);

  const tonlSmartContent = encodeSmart(parsedData);
  const tonlSmartSize = Buffer.byteLength(tonlSmartContent, 'utf8');
  const tonlSmartTokens = estimateTokens(tonlSmartContent);

  return {
    filename: path.basename(jsonFilePath),
    jsonSize,
    tonlSize,
    tonlSmartSize,
    jsonTokens,
    tonlTokens,
    tonlSmartTokens
  };
}

function printComparisonTable(analyses) {
  console.log('\n📊 Format Comparison Table\n');

  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ File                        │ JSON (Bytes) │ TONL (Bytes) │ Smart (Bytes) │ Savings (%)  │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

  analyses.forEach(analysis => {
    const jsonSize = analysis.jsonSize;
    const tonlSize = analysis.tonlSize;
    const smartSize = analysis.tonlSmartSize;
    const bestSize = Math.min(tonlSize, smartSize);
    const savings = ((jsonSize - bestSize) / jsonSize * 100).toFixed(1);

    console.log(`│ ${analysis.filename.padEnd(27)} │ ${jsonSize.toString().padStart(12)} │ ${tonlSize.toString().padStart(12)} │ ${smartSize.toString().padStart(12)} │ ${savings.padStart(12)} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');
}

function printTokenComparison(analyses) {
  console.log('\n🧠 Token Comparison (Estimated)\n');

  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ File                        │ JSON (Tokens)│ TONL (Tokens)│ Smart (Tokens)│ Savings (%)  │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

  analyses.forEach(analysis => {
    const jsonTokens = analysis.jsonTokens;
    const tonlTokens = analysis.tonlTokens;
    const smartTokens = analysis.tonlSmartTokens;
    const bestTokens = Math.min(tonlTokens, smartTokens);
    const savings = ((jsonTokens - bestTokens) / jsonTokens * 100).toFixed(1);

    console.log(`│ ${analysis.filename.padEnd(27)} │ ${jsonTokens.toString().padStart(12)} │ ${tonlTokens.toString().padStart(12)} │ ${smartTokens.toString().padStart(12)} │ ${savings.padStart(12)} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');
}

function printSummary(analyses) {
  console.log('\n📈 Summary Statistics:\n');

  const totalJsonSize = analyses.reduce((sum, a) => sum + a.jsonSize, 0);
  const totalTonlSize = analyses.reduce((sum, a) => sum + a.tonlSize, 0);
  const totalSmartSize = analyses.reduce((sum, a) => sum + a.tonlSmartSize, 0);
  const totalJsonTokens = analyses.reduce((sum, a) => sum + a.jsonTokens, 0);
  const totalTonlTokens = analyses.reduce((sum, a) => sum + a.tonlTokens, 0);
  const totalSmartTokens = analyses.reduce((sum, a) => sum + a.tonlSmartTokens, 0);

  const bestBytes = Math.min(totalTonlSize, totalSmartSize);
  const bestTokens = Math.min(totalTonlTokens, totalSmartTokens);

  console.log(`   📁 Total JSON Size: ${totalJsonSize.toLocaleString()} bytes`);
  console.log(`   📦 Total TONL Size: ${totalTonlSize.toLocaleString()} bytes`);
  console.log(`   ⚡ Total Smart TONL: ${totalSmartSize.toLocaleString()} bytes`);
  console.log(`   💾 Byte Savings: ${((totalJsonSize - bestBytes) / totalJsonSize * 100).toFixed(1)}%`);
  console.log(`   🧠 JSON Token Count: ${totalJsonTokens.toLocaleString()}`);
  console.log(`   🔤 TONL Token Count: ${totalTonlTokens.toLocaleString()}`);
  console.log(`   ⚡ Smart Token Count: ${totalSmartTokens.toLocaleString()}`);
  console.log(`   💰 Token Savings: ${((totalJsonTokens - bestTokens) / totalJsonTokens * 100).toFixed(1)}%`);

  console.log('\n💡 Recommendations:');

  const avgSizeSavings = ((totalJsonSize - bestBytes) / totalJsonSize * 100);
  const avgTokenSavings = ((totalJsonTokens - bestTokens) / totalJsonTokens * 100);

  if (avgSizeSavings > 20) {
    console.log('   ✅ TONL format provides significant size advantage');
  } else if (avgSizeSavings > 10) {
    console.log('   ⚠️  TONL format provides moderate size advantage');
  } else {
    console.log('   ❌ TONL format does not provide clear size advantage');
  }

  if (avgTokenSavings > 15) {
    console.log('   ✅ Significant token cost savings potential');
  } else if (avgTokenSavings > 5) {
    console.log('   ⚠️  Moderate token cost savings potential');
  } else {
    console.log('   ❌ Insufficient token cost savings potential');
  }

  const bestFormat = totalSmartSize < totalTonlSize ? 'Smart TONL' : 'Regular TONL';
  console.log(`   🏆 Best performance: ${bestFormat}`);
}

async function main() {
  console.log('🚀 TONL Format Benchmark Analysis Starting...\n');

  const examplesDir = path.join(__dirname, '..', 'examples', 'benchmark-data');
  const jsonFiles = [
    'small-user-data-en.json',
    'medium-ecommerce-en.json',
    'large-healthcare-en.json'
  ].filter(file => fs.existsSync(path.join(examplesDir, file)));

  const analyses = [];

  for (const jsonFile of jsonFiles) {
    console.log(`📁 Processing: ${jsonFile}`);
    const analysis = analyzeFile(path.join(examplesDir, jsonFile));
    analyses.push(analysis);
    console.log(`   ✅ Completed`);
  }

  if (analyses.length > 0) {
    printComparisonTable(analyses);
    printTokenComparison(analyses);
    printSummary(analyses);
  } else {
    console.log('❌ No test files found!');
  }

  console.log('\n✅ Benchmark completed!');
}

main().catch(console.error);