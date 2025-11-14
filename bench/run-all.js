#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 TONL Complete Benchmark Suite Starting...\n');

const benchmarks = [
  {
    name: 'Format Comparison',
    script: 'run-benchmarks.js',
    description: 'Byte and token comparison'
  },
  {
    name: 'Token Analysis',
    script: 'token-analysis.js',
    description: 'Model-based cost analysis'
  },
  {
    name: 'Performance Analysis',
    script: 'performance-analysis.js',
    description: 'Speed and memory performance'
  }
];

console.log('📋 Tests to Run:\n');
benchmarks.forEach((benchmark, index) => {
  console.log(`${index + 1}. ${benchmark.name}`);
  console.log(`   📝 ${benchmark.description}`);
  console.log(`   🔧 Script: ${benchmark.script}\n`);
});

console.log('='.repeat(60));
console.log('Total test time: ~2-3 minutes.\n');

let totalStartTime = Date.now();

for (let i = 0; i < benchmarks.length; i++) {
  const benchmark = benchmarks[i];
  const startTime = Date.now();

  console.log(`\n${i + 1}/${benchmarks.length} 🎯 ${benchmark.name}`);
  console.log('-'.repeat(50));

  try {
    execSync(`node ${path.join(__dirname, benchmark.script)}`, {
      stdio: 'inherit',
      cwd: path.dirname(__dirname)
    });

    const duration = Date.now() - startTime;
    console.log(`\n✅ ${benchmark.name} completed (${(duration / 1000).toFixed(1)}s)`);
  } catch (error) {
    console.log(`\n❌ ${benchmark.name} failed: ${error.message}`);
  }

  if (i < benchmarks.length - 1) {
    console.log('\n⏳ Waiting 2 seconds for next test...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

const totalDuration = Date.now() - totalStartTime;

console.log('\n' + '='.repeat(60));
console.log('🎉 All Benchmark Suite Completed!');
console.log(`⏱️  Total time: ${(totalDuration / 1000).toFixed(1)} seconds`);
console.log('\n📊 Summary Report:');
console.log('   • Format comparison: Byte and token savings');
console.log('   • Token analysis: Model-based cost optimization');
console.log('   • Performance analysis: Speed and memory metrics');
console.log('\n💡 See tables above for detailed results.');
console.log('\n📁 Test data: examples/benchmark-data/');
console.log('📋 Full report: examples/benchmark-data/README.md');