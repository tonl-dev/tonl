#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const testRoot = join(root, 'test');

function collectTestFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      collectTestFiles(fullPath, files);
    } else if (entry.endsWith('.test.ts')) {
      files.push(relative(root, fullPath));
    }
  }

  return files;
}

function collectRequestedTestFiles(args) {
  if (args.length === 0) {
    return collectTestFiles(testRoot);
  }

  const files = [];

  for (const arg of args) {
    const fullPath = resolve(root, arg);

    if (!existsSync(fullPath)) {
      console.error(`Test target not found: ${arg}`);
      process.exit(1);
    }

    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectTestFiles(fullPath, files);
    } else if (stats.isFile() && fullPath.endsWith('.test.ts')) {
      files.push(relative(root, fullPath));
    } else {
      console.error(`Test target must be a .test.ts file or directory: ${arg}`);
      process.exit(1);
    }
  }

  return Array.from(new Set(files));
}

const testFiles = collectRequestedTestFiles(process.argv.slice(2)).sort();

if (testFiles.length === 0) {
  console.error('No test files found.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...testFiles], {
  cwd: root,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
