#!/usr/bin/env node

/**
 * Comprehensive benchmark for TONL vs JSON across diverse datasets
 */

import { readFileSync, existsSync } from "fs";
import { encodeTONL, encodeSmart } from "../src/index.js";
import { estimateTokens } from "../src/utils/metrics.js";

interface BenchmarkResult {
  filename: string;
  jsonBytes: number;
  jsonTokens: number;
  tonlBytes: number;
  tonlTokens: number;
  tonlSmartBytes: number;
  tonlSmartTokens: number;
  tonlByteCompression: number;
  tonlSmartByteCompression: number;
  tonlTokenCompression: number;
  tonlSmartTokenCompression: number;
}

function benchmarkFile(filepath: string, tokenizer: "gpt-4o" | "o200k" | "cl100k" = "cl100k"): BenchmarkResult {
  const content = readFileSync(filepath, 'utf8');
  const data = JSON.parse(content);
  const jsonBytes = Buffer.byteLength(content, 'utf8');
  const jsonTokens = estimateTokens(content, tokenizer);

  const tonlOutput = encodeTONL(data);
  const tonlSmartOutput = encodeSmart(data);

  const tonlBytes = Buffer.byteLength(tonlOutput, 'utf8');
  const tonlTokens = estimateTokens(tonlOutput, tokenizer);
  const tonlSmartBytes = Buffer.byteLength(tonlSmartOutput, 'utf8');
  const tonlSmartTokens = estimateTokens(tonlSmartOutput, tokenizer);

  return {
    filename: filepath.split('/').pop() || filepath,
    jsonBytes,
    jsonTokens,
    tonlBytes,
    tonlTokens,
    tonlSmartBytes,
    tonlSmartTokens,
    tonlByteCompression: jsonBytes / tonlBytes,
    tonlSmartByteCompression: jsonBytes / tonlSmartBytes,
    tonlTokenCompression: jsonTokens / tonlTokens,
    tonlSmartTokenCompression: jsonTokens / tonlSmartTokens
  };
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatCompression(num: number): string {
  return `${num.toFixed(2)}x`;
}

function displayResults(results: BenchmarkResult[], tokenizer: string) {
  console.log(`📊 Comprehensive TONL Benchmark Results (${tokenizer} tokenizer)`);
  console.log("=".repeat(120));
  console.log();

  // Table header
  const headers = [
    "File",
    "JSON Size",
    "JSON Tokens",
    "TONL Size",
    "TONL Tokens",
    "TONL Smart Size",
    "TONL Smart Tokens",
    "Byte Ratio",
    "Token Ratio"
  ];

  const colWidths = [25, 12, 12, 12, 12, 15, 17, 10, 11];

  let headerRow = "";
  headers.forEach((header, i) => {
    headerRow += header.padEnd(colWidths[i]);
  });
  console.log(headerRow);
  console.log("-".repeat(120));

  let totals = {
    jsonBytes: 0,
    jsonTokens: 0,
    tonlBytes: 0,
    tonlTokens: 0,
    tonlSmartBytes: 0,
    tonlSmartTokens: 0
  };

  for (const result of results) {
    totals.jsonBytes += result.jsonBytes;
    totals.jsonTokens += result.jsonTokens;
    totals.tonlBytes += result.tonlBytes;
    totals.tonlTokens += result.tonlTokens;
    totals.tonlSmartBytes += result.tonlSmartBytes;
    totals.tonlSmartTokens += result.tonlSmartTokens;

    const row = [
      result.filename,
      formatNumber(result.jsonBytes),
      formatNumber(result.jsonTokens),
      formatNumber(result.tonlBytes),
      formatNumber(result.tonlTokens),
      formatNumber(result.tonlSmartBytes),
      formatNumber(result.tonlSmartTokens),
      formatCompression(result.tonlByteCompression),
      formatCompression(result.tonlTokenCompression)
    ];

    let rowStr = "";
    row.forEach((cell, i) => {
      rowStr += cell.padEnd(colWidths[i]);
    });
    console.log(rowStr);
  }

  console.log("-".repeat(120));

  // Totals
  const avgTonlByteCompression = totals.jsonBytes / totals.tonlBytes;
  const avgTonlSmartByteCompression = totals.jsonBytes / totals.tonlSmartBytes;
  const avgTonlTokenCompression = totals.jsonTokens / totals.tonlTokens;
  const avgTonlSmartTokenCompression = totals.jsonTokens / totals.tonlSmartTokens;

  const totalsRow = [
    "TOTAL",
    formatNumber(totals.jsonBytes),
    formatNumber(totals.jsonTokens),
    formatNumber(totals.tonlBytes),
    formatNumber(totals.tonlTokens),
    formatNumber(totals.tonlSmartBytes),
    formatNumber(totals.tonlSmartTokens),
    formatCompression(avgTonlByteCompression),
    formatCompression(avgTonlTokenCompression)
  ];

  let totalsRowStr = "";
  totalsRow.forEach((cell, i) => {
    totalsRowStr += cell.padEnd(colWidths[i]);
  });
  console.log(totalsRowStr);

  console.log();
  console.log("🎯 Summary:");
  console.log(`• Average TONL byte compression: ${formatCompression(avgTonlByteCompression)} (${((1 - 1/avgTonlByteCompression) * 100).toFixed(1)}% savings)`);
  console.log(`• Average TONL Smart byte compression: ${formatCompression(avgTonlSmartByteCompression)} (${((1 - 1/avgTonlSmartByteCompression) * 100).toFixed(1)}% savings)`);
  console.log(`• Average TONL token compression: ${formatCompression(avgTonlTokenCompression)} (${((1 - 1/avgTonlTokenCompression) * 100).toFixed(1)}% savings)`);
  console.log(`• Average TONL Smart token compression: ${formatCompression(avgTonlSmartTokenCompression)} (${((1 - 1/avgTonlSmartTokenCompression) * 100).toFixed(1)}% savings)`);

  // Find best performers
  const bestByteCompression = Math.max(...results.map(r => Math.max(r.tonlByteCompression, r.tonlSmartByteCompression)));
  const bestTokenCompression = Math.max(...results.map(r => Math.max(r.tonlTokenCompression, r.tonlSmartTokenCompression)));

  console.log(`• Best byte compression: ${formatCompression(bestByteCompression)}`);
  console.log(`• Best token compression: ${formatCompression(bestTokenCompression)}`);

  // Cost estimation for GPT-4 (assuming $0.03 per 1K tokens)
  const jsonCost = (totals.jsonTokens / 1000) * 0.03;
  const tonlCost = (totals.tonlTokens / 1000) * 0.03;
  const tonlSmartCost = (totals.tonlSmartTokens / 1000) * 0.03;

  console.log();
  console.log("💰 Cost Estimation (GPT-4 @ $0.03/1K tokens):");
  console.log(`• JSON cost: $${jsonCost.toFixed(4)}`);
  console.log(`• TONL cost: $${tonlCost.toFixed(4)} (save $${(jsonCost - tonlCost).toFixed(4)})`);
  console.log(`• TONL Smart cost: $${tonlSmartCost.toFixed(4)} (save $${(jsonCost - tonlSmartCost).toFixed(4)})`);
  console.log(`• Total potential savings: $${(jsonCost - tonlSmartCost).toFixed(4)} (${((1 - tonlSmartCost/jsonCost) * 100).toFixed(1)}%)`);
}

function main() {
  const args = process.argv.slice(2);
  let tokenizer: "gpt-4o" | "o200k" | "cl100k" = "cl100k";

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--tokenizer" && args[i + 1]) {
      const nextArg = args[i + 1];
      if (nextArg === "gpt-4o" || nextArg === "o200k" || nextArg === "cl100k") {
        tokenizer = nextArg;
        i++;
      }
    }
  }

  console.log(`Running comprehensive benchmark with ${tokenizer} tokenizer...\n`);

  const testFiles = [
    "bench/fixtures/sample-users.json",
    "bench/fixtures/nested-project.json",
    "bench/fixtures/complex-nested.json",
    "bench/fixtures/ecommerce-products.json",
    "bench/fixtures/api-response.json",
    "bench/fixtures/configuration.json",
    "bench/fixtures/large-dataset.json"
  ];

  const results: BenchmarkResult[] = [];

  for (const file of testFiles) {
    if (existsSync(file)) {
      console.log(`Processing: ${file}...`);
      const result = benchmarkFile(file, tokenizer);
      results.push(result);
    } else {
      console.log(`Warning: File not found: ${file}`);
    }
  }

  if (results.length === 0) {
    console.log("No test files found. Please check the bench/fixtures directory.");
    process.exit(1);
  }

  console.log();
  displayResults(results, tokenizer);
}

main();