#!/usr/bin/env node
/**
 * Byte size benchmark for TONL vs JSON
 */
import { readFileSync, existsSync } from "fs";
import { encodeTONL, encodeSmart } from "../dist/index.js";
function benchmarkFile(filepath) {
    const content = readFileSync(filepath, 'utf8');
    const data = JSON.parse(content);
    const jsonBytes = Buffer.byteLength(content, 'utf8');
    const tonlOutput = encodeTONL(data);
    const tonlSmartOutput = encodeSmart(data);
    const tonlBytes = Buffer.byteLength(tonlOutput, 'utf8');
    const tonlSmartBytes = Buffer.byteLength(tonlSmartOutput, 'utf8');
    return {
        filename: filepath.split('/').pop() || filepath,
        jsonBytes,
        tonlBytes,
        tonlSmartBytes,
        tonlCompression: jsonBytes / tonlBytes,
        tonlSmartCompression: jsonBytes / tonlSmartBytes
    };
}
function main() {
    const args = process.argv.slice(2);
    const targetFile = args[0];
    if (!targetFile) {
        console.log("Usage: bench-bytes.ts <file.json>\n");
        console.log("Running benchmark on sample files...\n");
        // Run on sample fixtures
        const sampleFiles = [
            "bench/fixtures/sample-users.json",
            "bench/fixtures/nested-project.json"
        ];
        const results = [];
        for (const file of sampleFiles) {
            if (existsSync(file)) {
                const result = benchmarkFile(file);
                results.push(result);
            }
        }
        if (results.length === 0) {
            console.log("No sample files found. Please specify a JSON file.");
            process.exit(1);
        }
        displayResults(results);
    }
    else {
        if (!existsSync(targetFile)) {
            console.error(`File not found: ${targetFile}`);
            process.exit(1);
        }
        const result = benchmarkFile(targetFile);
        displayResults([result]);
    }
}
function displayResults(results) {
    console.log("📊 TONL Byte Size Benchmark Results");
    console.log("=".repeat(80));
    console.log();
    // Table header
    console.log("File".padEnd(25) +
        "JSON".padEnd(12) +
        "TONL".padEnd(12) +
        "TONL Smart".padEnd(12) +
        "TONL Ratio".padEnd(12) +
        "Smart Ratio".padEnd(12));
    console.log("-".repeat(80));
    let totalJsonBytes = 0;
    let totalTonlBytes = 0;
    let totalTonlSmartBytes = 0;
    for (const result of results) {
        totalJsonBytes += result.jsonBytes;
        totalTonlBytes += result.tonlBytes;
        totalTonlSmartBytes += result.tonlSmartBytes;
        console.log(result.filename.padEnd(25) +
            result.jsonBytes.toString().padEnd(12) +
            result.tonlBytes.toString().padEnd(12) +
            result.tonlSmartBytes.toString().padEnd(12) +
            result.tonlCompression.toFixed(2) + "x".padEnd(12) +
            result.tonlSmartCompression.toFixed(2) + "x");
    }
    console.log("-".repeat(80));
    if (results.length > 1) {
        const avgTonlCompression = totalJsonBytes / totalTonlBytes;
        const avgTonlSmartCompression = totalJsonBytes / totalTonlSmartBytes;
        console.log("TOTAL".padEnd(25) +
            totalJsonBytes.toString().padEnd(12) +
            totalTonlBytes.toString().padEnd(12) +
            totalTonlSmartBytes.toString().padEnd(12) +
            avgTonlCompression.toFixed(2) + "x".padEnd(12) +
            avgTonlSmartCompression.toFixed(2) + "x");
    }
    console.log();
    console.log("🎯 Summary:");
    console.log(`• Average TONL compression: ${(totalJsonBytes / totalTonlBytes).toFixed(2)}x`);
    console.log(`• Average TONL Smart compression: ${(totalJsonBytes / totalTonlSmartBytes).toFixed(2)}x`);
    console.log(`• Best overall savings: ${Math.max(...results.map(r => Math.max(r.tonlCompression, r.tonlSmartCompression))).toFixed(2)}x`);
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=bench-bytes.js.map