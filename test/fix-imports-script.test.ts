import test from 'node:test';
import assert from 'node:assert/strict';
import { fixConfiguredFiles, fixImports } from '../fix-imports.js';

test('fixImports resolves dynamic file imports relative to the emitted file', () => {
  const source = "const mod = await import('../cli/path-validator');";

  assert.equal(
    fixImports(source, 'dist/repl/index.js'),
    "const mod = await import('../cli/path-validator.js');",
  );
});

test('fixImports resolves dynamic directory imports to index.js', () => {
  const source = "const mod = await import('./optimization');";

  assert.equal(
    fixImports(source, 'dist/cli.js'),
    "const mod = await import('./optimization/index.js');",
  );
});

test('fixConfiguredFiles fails when a configured build artifact is missing', () => {
  assert.throws(
    () => fixConfiguredFiles(['dist/does-not-exist.js']),
    /Import fixing failed/,
  );
});
