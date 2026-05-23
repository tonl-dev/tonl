#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 TONL Complete Benchmark Suite Starting...\n');

const benchmarks = [
  {
    name: 'Byte Size',
    command: 'npm run bench --silent',
    description: 'Byte comparison on fixture data'
  },
  {
    name: 'Token Analysis',
    command: 'npm run bench-tokens --silent',
    description: 'Token comparison on fixture data'
  },
  {
    name: 'Comprehensive Analysis',
    command: 'npm run bench-comprehensive --silent',
    description: 'Byte, token, and cost analysis across fixtures'
  },
  {
    name: 'Query Performance',
    command: 'npm run bench-query --silent',
    description: 'Query API speed benchmarks'
  }
];

console.log('📋 Tests to Run:\n');
benchmarks.forEach((benchmark, index) => {
  console.log(`${index + 1}. ${benchmark.name}`);
  console.log(`   📝 ${benchmark.description}`);
  console.log(`   🔧 Command: ${benchmark.command}\n`);
});

console.log('='.repeat(60));
console.log('Total test time: ~10-20 seconds.\n');

let totalStartTime = Date.now();
let failed = false;

for (let i = 0; i < benchmarks.length; i++) {
  const benchmark = benchmarks[i];
  const startTime = Date.now();

  console.log(`\n${i + 1}/${benchmarks.length} 🎯 ${benchmark.name}`);
  console.log('-'.repeat(50));

  try {
    execSync(benchmark.command, {
      stdio: 'inherit',
      cwd: path.dirname(__dirname)
    });

    const duration = Date.now() - startTime;
    console.log(`\n✅ ${benchmark.name} completed (${(duration / 1000).toFixed(1)}s)`);
  } catch (error) {
    failed = true;
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
console.log('   • Byte size comparison');
console.log('   • Token analysis');
console.log('   • Comprehensive fixture analysis');
console.log('   • Query performance metrics');
console.log('\n💡 See tables above for detailed results.');
console.log('\n📁 Test data: bench/fixtures/');

if (failed) {
  process.exit(1);
}
