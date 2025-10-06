#!/usr/bin/env node

/**
 * Token estimation benchmark for TONL vs JSON
 */

import { readFileSync, existsSync } from "fs";
import { encodeTONL, encodeSmart } from "../src/index.js";
import { estimateTokens, calculateCompressionMetrics, formatMetrics } from "../src/utils/metrics.js";

interface TokenBenchmarkResult {
  filename: string;
  jsonTokens: number;
  tonlTokens: number;
  tonlSmartTokens: number;
  tonlTokenCompression: number;
  tonlSmartTokenCompression: number;
}

function benchmarkTokens(filepath: string, tokenizer: "gpt-5" | "gpt-4.5" | "gpt-4o" | "claude-3.5" | "gemini-2.0" | "llama-4" | "o200k" | "cl100k" = "gpt-5"): TokenBenchmarkResult {
  const content = readFileSync(filepath, 'utf8');
  const data = JSON.parse(content);
  const jsonTokens = estimateTokens(content, tokenizer);

  const tonlOutput = encodeTONL(data);
  const tonlSmartOutput = encodeSmart(data);

  const tonlTokens = estimateTokens(tonlOutput, tokenizer);
  const tonlSmartTokens = estimateTokens(tonlSmartOutput, tokenizer);

  return {
    filename: filepath.split('/').pop() || filepath,
    jsonTokens,
    tonlTokens,
    tonlSmartTokens,
    tonlTokenCompression: jsonTokens / tonlTokens,
    tonlSmartTokenCompression: jsonTokens / tonlSmartTokens
  };
}

function main() {
  const args = process.argv.slice(2);
  let targetFile = "";
  let tokenizer: "gpt-5" | "gpt-4.5" | "gpt-4o" | "claude-3.5" | "gemini-2.0" | "llama-4" | "o200k" | "cl100k" = "gpt-5";

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--tokenizer" && args[i + 1]) {
      const nextArg = args[i + 1];
      if (["gpt-5", "gpt-4.5", "gpt-4o", "claude-3.5", "gemini-2.0", "llama-4", "o200k", "cl100k"].includes(nextArg)) {
        tokenizer = nextArg as any;
        i++;
      }
    } else if (!arg.startsWith("-") && !targetFile) {
      targetFile = arg;
    }
  }

  if (!targetFile) {
    console.log("Usage: bench-tokens.ts <file.json> [--tokenizer gpt-5|gpt-4.5|gpt-4o|claude-3.5|gemini-2.0|llama-4|o200k|cl100k]\n");
    console.log(`Running token benchmark with ${tokenizer} tokenizer on sample files...\n`);

    // Run on sample fixtures
    const sampleFiles = [
      "bench/fixtures/sample-users.json",
      "bench/fixtures/nested-project.json",
      "bench/fixtures/sample.json",
      "bench/fixtures/northwind.json"
    ];

    const results: TokenBenchmarkResult[] = [];

    for (const file of sampleFiles) {
      if (existsSync(file)) {
        const result = benchmarkTokens(file, tokenizer);
        results.push(result);
      }
    }

    if (results.length === 0) {
      console.log("No sample files found. Please specify a JSON file.");
      process.exit(1);
    }

    displayResults(results, tokenizer);
  } else {
    if (!existsSync(targetFile)) {
      console.error(`File not found: ${targetFile}`);
      process.exit(1);
    }

    const result = benchmarkTokens(targetFile, tokenizer);
    displayResults([result], tokenizer);
  }
}

function displayResults(results: TokenBenchmarkResult[], tokenizer: string) {
  console.log(`🧠 TONL Token Benchmark Results (${tokenizer} tokenizer)`);
  console.log("=".repeat(85));
  console.log();

  // Table header
  console.log("File".padEnd(25) +
    "JSON".padEnd(12) +
    "TONL".padEnd(12) +
    "TONL Smart".padEnd(12) +
    "TONL Ratio".padEnd(12) +
    "Smart Ratio".padEnd(12));
  console.log("-".repeat(85));

  let totalJsonTokens = 0;
  let totalTonlTokens = 0;
  let totalTonlSmartTokens = 0;

  for (const result of results) {
    totalJsonTokens += result.jsonTokens;
    totalTonlTokens += result.tonlTokens;
    totalTonlSmartTokens += result.tonlSmartTokens;

    console.log(
      result.filename.padEnd(25) +
      result.jsonTokens.toString().padEnd(12) +
      result.tonlTokens.toString().padEnd(12) +
      result.tonlSmartTokens.toString().padEnd(12) +
      result.tonlTokenCompression.toFixed(2) + "x".padEnd(12) +
      result.tonlSmartTokenCompression.toFixed(2) + "x"
    );
  }

  console.log("-".repeat(85));

  if (results.length > 1) {
    const avgTonlCompression = totalJsonTokens / totalTonlTokens;
    const avgTonlSmartCompression = totalJsonTokens / totalTonlSmartTokens;

    console.log(
      "TOTAL".padEnd(25) +
      totalJsonTokens.toString().padEnd(12) +
      totalTonlTokens.toString().padEnd(12) +
      totalTonlSmartTokens.toString().padEnd(12) +
      avgTonlCompression.toFixed(2) + "x".padEnd(12) +
      avgTonlSmartCompression.toFixed(2) + "x"
    );
  }

  console.log();
  console.log("🎯 Token Summary:");
  console.log(`• Average TONL token compression: ${(totalJsonTokens / totalTonlTokens).toFixed(2)}x`);
  console.log(`• Average TONL Smart token compression: ${(totalJsonTokens / totalTonlSmartTokens).toFixed(2)}x`);
  console.log(`• Best token savings: ${Math.max(...results.map(r => Math.max(r.tonlTokenCompression, r.tonlSmartTokenCompression))).toFixed(2)}x`);
  console.log();

  // Cost estimation for GPT-4 (assuming $0.03 per 1K tokens)
  const jsonCost = (totalJsonTokens / 1000) * 0.03;
  const tonlCost = (totalTonlTokens / 1000) * 0.03;
  const tonlSmartCost = (totalTonlSmartTokens / 1000) * 0.03;

  console.log("💰 Cost Estimation (GPT-4 @ $0.03/1K tokens):");
  console.log(`• JSON cost: $${jsonCost.toFixed(4)}`);
  console.log(`• TONL cost: $${tonlCost.toFixed(4)} (save $${(jsonCost - tonlCost).toFixed(4)})`);
  console.log(`• TONL Smart cost: $${tonlSmartCost.toFixed(4)} (save $${(jsonCost - tonlSmartCost).toFixed(4)})`);
}

main();