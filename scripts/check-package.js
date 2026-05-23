#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { dirname, join, normalize } from 'path';
import { existsSync, readFileSync } from 'fs';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function normalizePackagePath(path) {
  return normalize(path.replace(/^\.\//, '')).replaceAll('\\', '/');
}

function collectExportTargets(value, targets = new Set()) {
  if (typeof value === 'string') {
    targets.add(normalizePackagePath(value));
    return targets;
  }

  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) {
      collectExportTargets(child, targets);
    }
  }

  return targets;
}

function fail(message) {
  console.error(`Package check failed: ${message}`);
  process.exit(1);
}

const packResult = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: root,
  encoding: 'utf8',
});

if (packResult.error) {
  fail(packResult.error.message);
}

if (packResult.status !== 0) {
  process.stderr.write(packResult.stderr);
  fail(`npm pack exited with status ${packResult.status}`);
}

let pack;
try {
  [pack] = JSON.parse(packResult.stdout);
} catch {
  fail('unable to parse npm pack --json output');
}

const packedFiles = new Set(pack.files.map(file => normalizePackagePath(file.path)));
const requiredFiles = collectExportTargets(packageJson.exports);

if (packageJson.main) {
  requiredFiles.add(normalizePackagePath(packageJson.main));
}

if (packageJson.types) {
  requiredFiles.add(normalizePackagePath(packageJson.types));
}

if (packageJson.bin && typeof packageJson.bin === 'object') {
  for (const binPath of Object.values(packageJson.bin)) {
    requiredFiles.add(normalizePackagePath(binPath));
  }
}

for (const requiredFile of requiredFiles) {
  if (!packedFiles.has(requiredFile)) {
    fail(`required package file is missing: ${requiredFile}`);
  }
}

for (const file of packedFiles) {
  if (!file.endsWith('.d.ts') && !file.endsWith('.js')) {
    continue;
  }

  const fullPath = join(root, file);
  if (!existsSync(fullPath)) {
    fail(`packed file does not exist locally: ${file}`);
  }

  const contents = readFileSync(fullPath, 'utf8');
  const matches = contents.matchAll(/sourceMappingURL=(\S+\.map)\s*$/gm);

  for (const match of matches) {
    const mapPath = normalizePackagePath(join(dirname(file), match[1]));
    if (!packedFiles.has(mapPath)) {
      fail(`source map referenced by ${file} is missing from package: ${mapPath}`);
    }
  }
}

const smokeImports = [
  ['tonl', ['encodeTONL', 'decodeTONL', 'TONLDocument']],
  ['tonl/browser', ['encodeTONL', 'decodeTONL', 'encodeSmart', 'preprocessJSON', 'TONLDocument']],
  ['tonl/query', ['fuzzySearch', 'aggregate', 'parseTemporalLiteral']],
  ['tonl/schema', ['parseSchema', 'validateTONL']],
];

for (const [specifier, expectedExports] of smokeImports) {
  const script = `
    const mod = await import(${JSON.stringify(specifier)});
    const missing = ${JSON.stringify(expectedExports)}.filter(name => !(name in mod));
    if (missing.length > 0) {
      throw new Error(${JSON.stringify(specifier)} + ' missing exports: ' + missing.join(', '));
    }
  `;

  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    fail(`smoke import failed for ${specifier}`);
  }
}

console.log(`Package check passed: ${pack.filename} (${pack.entryCount} files)`);
