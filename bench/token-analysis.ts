#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { encodeTONL, decodeTONL, encodeSmart } from '../dist/index.js';

// Multiple tokenizer models for comparison
interface TokenEstimate {
  model: string;
  tokens: number;
  costPerMillion: number; // USD
}

interface FormatAnalysis {
  filename: string;
  jsonSize: number;
  tonlSize: number;
  tonlSmartSize: number;
  estimates: TokenEstimate[];
  jsonCosts: number[];
  tonlCosts: number[];
  tonlSmartCosts: number[];
  bestSavings: number;
}

// Different tokenizer models with their characteristics
const TOKENIZER_MODELS = [
  { name: 'GPT-4', ratio: 0.25, costPerMillion: 30.00 },      // ~4 chars per token
  { name: 'GPT-3.5-Turbo', ratio: 0.25, costPerMillion: 1.00 },
  { name: 'Claude-3.5-Sonnet', ratio: 0.22, costPerMillion: 3.00 }, // ~4.5 chars per token
  { name: 'Gemini-1.5-Pro', ratio: 0.24, costPerMillion: 3.50 },
  { name: 'Llama-3-8B', ratio: 0.23, costPerMillion: 0.50 }     // ~4.3 chars per token
];

function estimateTokens(text: string, ratio: number): number {
  return Math.ceil(text.length * ratio);
}

function analyzeFile(jsonFilePath: string): FormatAnalysis {
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
  const jsonSize = Buffer.byteLength(jsonContent, 'utf8');

  const parsedData = JSON.parse(jsonContent);

  // Generate TONL versions
  const tonlContent = encodeTONL(parsedData);
  const tonlSmartContent = encodeSmart(parsedData);

  const tonlSize = Buffer.byteLength(tonlContent, 'utf8');
  const tonlSmartSize = Buffer.byteLength(tonlSmartContent, 'utf8');

  const estimates: TokenEstimate[] = TOKENIZER_MODELS.map(model => ({
    model: model.name,
    tokens: estimateTokens(jsonContent, model.ratio),
    costPerMillion: model.costPerMillion
  }));

  const jsonCosts: number[] = [];
  const tonlCosts: number[] = [];
  const tonlSmartCosts: number[] = [];

  TOKENIZER_MODELS.forEach(model => {
    const jsonTokens = estimateTokens(jsonContent, model.ratio);
    const tonlTokens = estimateTokens(tonlContent, model.ratio);
    const tonlSmartTokens = estimateTokens(tonlSmartContent, model.ratio);

    jsonCosts.push((jsonTokens / 1000000) * model.costPerMillion);
    tonlCosts.push((tonlTokens / 1000000) * model.costPerMillion);
    tonlSmartCosts.push((tonlSmartTokens / 1000000) * model.costPerMillion);
  });

  // Calculate best savings percentage
  const totalJsonCost = jsonCosts.reduce((a, b) => a + b, 0);
  const totalTonlCost = tonlCosts.reduce((a, b) => a + b, 0);
  const totalTonlSmartCost = tonlSmartCosts.reduce((a, b) => a + b, 0);
  const bestCost = Math.min(totalTonlCost, totalTonlSmartCost);
  const bestSavings = ((totalJsonCost - bestCost) / totalJsonCost) * 100;

  return {
    filename: path.basename(jsonFilePath),
    jsonSize,
    tonlSize,
    tonlSmartSize,
    estimates,
    jsonCosts,
    tonlCosts,
    tonlSmartCosts,
    bestSavings
  };
}

function printTokenAnalysis(analyses: FormatAnalysis[]) {
  console.log('\n🧠 Token Analizi - Model Bazında Karşılaştırma\n');
  console.log('Not: Değerler tahmini olup, gerçek token sayıları modele göre değişebilir.\n');

  // Header
  let header = '┌─────────────────────────────┬──────────────┬──────────────┬──────────────┐\n';
  header += '│ Dosya                       │ Boyut (JSON) │ Boyut (TONL) │ Boyut (Smart) │\n';
  header += '├─────────────────────────────┼──────────────┼──────────────┼──────────────┤\n';
  console.log(header);

  analyses.forEach(analysis => {
    const filename = analysis.filename.padEnd(27);
    const jsonSize = analysis.jsonSize.toString().padStart(12);
    const tonlSize = analysis.tonlSize.toString().padStart(12);
    const smartSize = analysis.tonlSmartSize.toString().padStart(12);

    console.log(`│ ${filename} │ ${jsonSize} │ ${tonlSize} │ ${smartSize} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┘');
}

function printModelComparison(analyses: FormatAnalysis[]) {
  console.log('\n📊 Model Bazında Token ve Maliyet Karşılaştırması\n');

  TOKENIZER_MODELS.forEach((model, modelIndex) => {
    console.log(`\n${model.name} (Maliyet: $${model.costPerMillion}/M token):`);
    console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
    console.log('│ Dosya                       │ JSON Tokens  │ TONL Tokens  │ Smart Tokens │ Kazanç (%)   │');
    console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

    analyses.forEach(analysis => {
      const jsonTokens = estimateTokens(fs.readFileSync(path.join(process.cwd(), 'examples', 'benchmark-data', analysis.filename), 'utf8'), model.ratio);

      const parsedData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'examples', 'benchmark-data', analysis.filename), 'utf8'));
      const tonlContent = encodeSmart(parsedData);
      const tonlTokens = estimateTokens(tonlContent, model.ratio);

      const filename = analysis.filename.padEnd(27);
      const jsonTokensStr = jsonTokens.toString().padStart(12);
      const tonlTokensStr = tonlTokens.toString().padStart(12);
      const savings = ((jsonTokens - tonlTokens) / jsonTokens * 100).toFixed(1).padStart(12);

      console.log(`│ ${filename} │ ${jsonTokensStr} │ ${tonlTokensStr} │ ${savings} │`);
    });

    console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');
  });
}

function printCostAnalysis(analyses: FormatAnalysis[]) {
  console.log('\n💰 Maliyet Analizi (USD - 1M işlem varsayımı)\n');

  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Dosya                       │ JSON Maliyet │ TONL Maliyet │ Smart Maliyet│ Tasarruf (%) │');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

  analyses.forEach(analysis => {
    const totalJsonCost = analysis.jsonCosts.reduce((a, b) => a + b, 0);
    const totalTonlCost = analysis.tonlCosts.reduce((a, b) => a + b, 0);
    const totalTonlSmartCost = analysis.tonlSmartCosts.reduce((a, b) => a + b, 0);

    const bestCost = Math.min(totalTonlCost, totalTonlSmartCost);
    const savings = ((totalJsonCost - bestCost) / totalJsonCost * 100).toFixed(1);

    const filename = analysis.filename.padEnd(27);
    const jsonCost = `$${totalJsonCost.toFixed(4)}`.padStart(12);
    const tonlCost = `$${totalTonlCost.toFixed(4)}`.padStart(12);
    const smartCost = `$${totalTonlSmartCost.toFixed(4)}`.padStart(12);
    const savingsStr = savings.padStart(12);

    console.log(`│ ${filename} │ ${jsonCost} │ ${tonlCost} │ ${smartCost} │ ${savingsStr} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');

  // Cost summary by model
  console.log('\n📈 Model Bazında Toplam Maliyetler:');
  TOKENIZER_MODELS.forEach((model, modelIndex) => {
    const totalJsonCost = analyses.reduce((sum, analysis) => sum + analysis.jsonCosts[modelIndex], 0);
    const totalTonlCost = analyses.reduce((sum, analysis) => sum + analysis.tonlCosts[modelIndex], 0);
    const totalTonlSmartCost = analyses.reduce((sum, analysis) => sum + analysis.tonlSmartCosts[modelIndex], 0);
    const bestCost = Math.min(totalTonlCost, totalTonlSmartCost);
    const savings = ((totalJsonCost - bestCost) / totalJsonCost * 100).toFixed(1);

    console.log(`   ${model.name.padEnd(20)}: JSON: $${totalJsonCost.toFixed(4)}, Best TONL: $${bestCost.toFixed(4)} (Kazanç: ${savings}%)`);
  });
}

function printRecommendations(analyses: FormatAnalysis[]) {
  console.log('\n💡 Öneriler:\n');

  const avgSizeSavings = analyses.reduce((sum, analysis) => {
    const bestSize = Math.min(analysis.tonlSize, analysis.tonlSmartSize);
    return sum + ((analysis.jsonSize - bestSize) / analysis.jsonSize * 100);
  }, 0) / analyses.length;

  const avgCostSavings = analyses.reduce((sum, analysis) => sum + analysis.bestSavings, 0) / analyses.length;

  console.log(`   • Ortalama boyut tasarrufu: ${avgSizeSavings.toFixed(1)}%`);
  console.log(`   • Ortalama maliyet tasarrufu: ${avgCostSavings.toFixed(1)}%`);

  if (avgSizeSavings > 20) {
    console.log('   ✅ TONL formatı, boyut bakımından önemli avantaj sağlıyor');
  } else if (avgSizeSavings > 10) {
    console.log('   ⚠️  TONL formatı, orta düzeyde boyut avantajı sağlıyor');
  } else {
    console.log('   ❌ TONL formatı, boyut açısından belirgin avantaj sağlamıyor');
  }

  if (avgCostSavings > 15) {
    console.log('   ✅ Token maliyetlerinde önemli tasarruf potansiyeli var');
  } else if (avgCostSavings > 5) {
    console.log('   ⚠️  Token maliyetlerinde orta düzeyde tasarruf potansiyeli var');
  } else {
    console.log('   ❌ Token maliyetlerinde yeterli tasarruf potansiyeli yok');
  }

  console.log('\n   En çok tasarruf sağlayan modeller:');
  const modelSavings = TOKENIZER_MODELS.map(model => {
    const totalJsonCost = analyses.reduce((sum, analysis) => {
      const jsonContent = fs.readFileSync(path.join(process.cwd(), 'examples', 'benchmark-data', analysis.filename), 'utf8');
      return sum + ((estimateTokens(jsonContent, model.ratio) / 1000000) * model.costPerMillion);
    }, 0);

    const totalTonlSmartCost = analyses.reduce((sum, analysis) => {
      const jsonContent = fs.readFileSync(path.join(process.cwd(), 'examples', 'benchmark-data', analysis.filename), 'utf8');
      const parsedData = JSON.parse(jsonContent);
      const tonlContent = encodeSmart(parsedData);
      return sum + ((estimateTokens(tonlContent, model.ratio) / 1000000) * model.costPerMillion);
    }, 0);

    return {
      model: model.name,
      savings: ((totalJsonCost - totalTonlSmartCost) / totalJsonCost * 100)
    };
  }).sort((a, b) => b.savings - a.savings);

  modelSavings.slice(0, 3).forEach((model, index) => {
    console.log(`   ${index + 1}. ${model.model}: ${model.savings.toFixed(1)}%`);
  });
}

async function main() {
  console.log('🔍 TONL Token ve Maliyet Analizi Başlatılıyor...\n');

  const examplesDir = path.join(process.cwd(), 'examples', 'benchmark-data');
  const jsonFiles = [
    'small-user-data.json',
    'medium-ecommerce.json',
    'large-healthcare.json'
  ].filter(file => fs.existsSync(path.join(examplesDir, file)));

  const analyses: FormatAnalysis[] = [];

  for (const jsonFile of jsonFiles) {
    console.log(`📁 Analiz ediliyor: ${jsonFile}`);
    const analysis = analyzeFile(path.join(examplesDir, jsonFile));
    analyses.push(analysis);
  }

  if (analyses.length > 0) {
    printTokenAnalysis(analyses);
    printModelComparison(analyses);
    printCostAnalysis(analyses);
    printRecommendations(analyses);
  }

  console.log('\n✅ Token analizi tamamlandı!');
}

main().catch(console.error);