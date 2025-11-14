#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encodeTONL, encodeSmart } from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Different tokenizer models with their characteristics
const TOKENIZER_MODELS = [
  { name: 'GPT-4', ratio: 0.25, costPerMillion: 30.00 },
  { name: 'GPT-3.5-Turbo', ratio: 0.25, costPerMillion: 1.00 },
  { name: 'Claude-3.5-Sonnet', ratio: 0.22, costPerMillion: 3.00 },
  { name: 'Gemini-1.5-Pro', ratio: 0.24, costPerMillion: 3.50 },
  { name: 'Llama-3-8B', ratio: 0.23, costPerMillion: 0.50 }
];

function estimateTokens(text, ratio) {
  return Math.ceil(text.length * ratio);
}

function analyzeFile(jsonFilePath) {
  const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
  const jsonSize = Buffer.byteLength(jsonContent, 'utf8');

  const parsedData = JSON.parse(jsonContent);

  // Generate TONL versions
  const tonlContent = encodeTONL(parsedData);
  const tonlSmartContent = encodeSmart(parsedData);

  const tonlSize = Buffer.byteLength(tonlContent, 'utf8');
  const tonlSmartSize = Buffer.byteLength(tonlSmartContent, 'utf8');

  const results = {
    filename: path.basename(jsonFilePath),
    jsonSize,
    tonlSize,
    tonlSmartSize,
    models: []
  };

  TOKENIZER_MODELS.forEach(model => {
    const jsonTokens = estimateTokens(jsonContent, model.ratio);
    const tonlTokens = estimateTokens(tonlContent, model.ratio);
    const tonlSmartTokens = estimateTokens(tonlSmartContent, model.ratio);

    const jsonCost = (jsonTokens / 1000000) * model.costPerMillion;
    const tonlCost = (tonlTokens / 1000000) * model.costPerMillion;
    const tonlSmartCost = (tonlSmartTokens / 1000000) * model.costPerMillion;

    const bestCost = Math.min(tonlCost, tonlSmartCost);
    const savings = ((jsonCost - bestCost) / jsonCost) * 100;

    results.models.push({
      name: model.name,
      jsonTokens,
      tonlTokens,
      tonlSmartTokens,
      jsonCost,
      tonlCost,
      tonlSmartCost,
      savings
    });
  });

  return results;
}

function printTokenAnalysis(analyses) {
  console.log('\n🧠 Token Analysis - Model Comparison\n');

  TOKENIZER_MODELS.forEach(model => {
    console.log(`\n${model.name} (Cost: $${model.costPerMillion}/M tokens):`);
    console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
    console.log('│ File                        │ JSON Tokens  │ TONL Tokens  │ Smart Tokens │ Savings (%)  │');
    console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

    let totalJsonTokens = 0;
    let totalTonlTokens = 0;
    let totalSmartTokens = 0;

    analyses.forEach(analysis => {
      const modelData = analysis.models.find(m => m.name === model.name);
      const filename = analysis.filename.padEnd(27);
      const jsonTokensStr = modelData.jsonTokens.toString().padStart(12);
      const tonlTokensStr = modelData.tonlTokens.toString().padStart(12);
      const smartTokensStr = modelData.tonlSmartTokens.toString().padStart(12);
      const savings = modelData.savings.toFixed(1).padStart(12);

      console.log(`│ ${filename} │ ${jsonTokensStr} │ ${tonlTokensStr} │ ${smartTokensStr} │ ${savings} │`);

      totalJsonTokens += modelData.jsonTokens;
      totalTonlTokens += modelData.tonlTokens;
      totalSmartTokens += modelData.tonlSmartTokens;
    });

    const totalSavings = ((totalJsonTokens - Math.min(totalTonlTokens, totalSmartTokens)) / totalJsonTokens * 100).toFixed(1);
    console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');
    console.log(`│ ${('TOTAL').padEnd(27)} │ ${totalJsonTokens.toString().padStart(12)} │ ${totalTonlTokens.toString().padStart(12)} │ ${totalSmartTokens.toString().padStart(12)} │ ${totalSavings.padStart(12)} │`);
    console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');
  });
}

function printCostAnalysis(analyses) {
  console.log('\n💰 Cost Analysis (USD)\n');

  console.log('┌─────────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Model                       │ JSON Cost    │ TONL Cost    │ Smart Cost   │ Avg Savings %│');
  console.log('├─────────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

  TOKENIZER_MODELS.forEach(model => {
    const totalJsonCost = analyses.reduce((sum, analysis) => {
      const modelData = analysis.models.find(m => m.name === model.name);
      return sum + modelData.jsonCost;
    }, 0);

    const totalTonlCost = analyses.reduce((sum, analysis) => {
      const modelData = analysis.models.find(m => m.name === model.name);
      return sum + modelData.tonlCost;
    }, 0);

    const totalTonlSmartCost = analyses.reduce((sum, analysis) => {
      const modelData = analysis.models.find(m => m.name === model.name);
      return sum + modelData.tonlSmartCost;
    }, 0);

    const bestCost = Math.min(totalTonlCost, totalTonlSmartCost);
    const avgSavings = analyses.reduce((sum, analysis) => {
      const modelData = analysis.models.find(m => m.name === model.name);
      return sum + modelData.savings;
    }, 0) / analyses.length;

    const modelName = model.name.padEnd(27);
    const jsonCost = `$${totalJsonCost.toFixed(4)}`.padStart(12);
    const tonlCost = `$${totalTonlCost.toFixed(4)}`.padStart(12);
    const smartCost = `$${totalTonlSmartCost.toFixed(4)}`.padStart(12);
    const savingsStr = avgSavings.toFixed(1).padStart(12);

    console.log(`│ ${modelName} │ ${jsonCost} │ ${tonlCost} │ ${smartCost} │ ${savingsStr} │`);
  });

  console.log('└─────────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘');
}

function printRecommendations(analyses) {
  console.log('\n💡 Recommendations:\n');

  // Calculate overall averages
  let totalJsonSize = 0;
  let totalTonlSize = 0;
  let totalSmartSize = 0;
  let totalAvgSavings = 0;

  analyses.forEach(analysis => {
    totalJsonSize += analysis.jsonSize;
    totalTonlSize += analysis.tonlSize;
    totalSmartSize += analysis.tonlSmartSize;

    const avgSavings = analysis.models.reduce((sum, model) => sum + model.savings, 0) / analysis.models.length;
    totalAvgSavings += avgSavings;
  });

  const avgSizeSavings = ((totalJsonSize - Math.min(totalTonlSize, totalSmartSize)) / totalJsonSize * 100);
  const avgCostSavings = totalAvgSavings / analyses.length;

  console.log(`   📊 Average size savings: ${avgSizeSavings.toFixed(1)}%`);
  console.log(`   💰 Average cost savings: ${avgCostSavings.toFixed(1)}%`);

  // Performance recommendations
  if (avgSizeSavings > 20) {
    console.log('   ✅ TONL format provides significant size advantage');
  } else if (avgSizeSavings > 10) {
    console.log('   ⚠️  TONL format provides moderate size advantage');
  } else {
    console.log('   ❌ TONL format does not provide clear size advantage');
  }

  if (avgCostSavings > 15) {
    console.log('   ✅ Significant token cost savings potential');
  } else if (avgCostSavings > 5) {
    console.log('   ⚠️  Moderate token cost savings potential');
  } else {
    console.log('   ❌ Insufficient token cost savings potential');
  }

  // Best models
  console.log('\n🏆 Best performing models for savings:');
  const modelSavings = TOKENIZER_MODELS.map(model => {
    const totalAvgSavings = analyses.reduce((sum, analysis) => {
      const modelData = analysis.models.find(m => m.name === model.name);
      return sum + modelData.savings;
    }, 0) / analyses.length;

    return {
      model: model.name,
      savings: totalAvgSavings,
      costPerMillion: model.costPerMillion
    };
  }).sort((a, b) => b.savings - a.savings);

  modelSavings.slice(0, 3).forEach((model, index) => {
    const savingsIcon = model.savings > 20 ? '🥇' : model.savings > 10 ? '🥈' : '🥉';
    console.log(`   ${index + 1}. ${savingsIcon} ${model.model}: ${model.savings.toFixed(1)}% savings ($${model.costPerMillion}/M tokens)`);
  });

  // File-specific recommendations
  console.log('\n📁 File-specific recommendations:');
  analyses.forEach(analysis => {
    const bestModel = analysis.models.sort((a, b) => b.savings - a.savings)[0];
    const maxSavings = bestModel.savings;

    if (maxSavings > 25) {
      console.log(`   🔥 ${analysis.filename}: ${maxSavings.toFixed(1)}% savings with ${bestModel.name}`);
    }
  });
}

async function main() {
  console.log('🔍 TONL Token and Cost Analysis Starting...\n');

  const examplesDir = path.join(__dirname, '..', 'examples', 'benchmark-data');
  const jsonFiles = [
    'small-user-data-en.json',
    'medium-ecommerce-en.json',
    'large-healthcare-en.json'
  ].filter(file => fs.existsSync(path.join(examplesDir, file)));

  const analyses = [];

  for (const jsonFile of jsonFiles) {
    console.log(`📁 Analyzing: ${jsonFile}`);
    const analysis = analyzeFile(path.join(examplesDir, jsonFile));
    analyses.push(analysis);
    console.log(`   ✅ Completed`);
  }

  if (analyses.length > 0) {
    printTokenAnalysis(analyses);
    printCostAnalysis(analyses);
    printRecommendations(analyses);
  } else {
    console.log('❌ No test files found!');
  }

  console.log('\n✅ Token analysis completed!');
}

main().catch(console.error);