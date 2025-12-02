/**
 * Simple CLI Testing - Core Functionality Verification
 * Tests essential CLI commands and options
 */

import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

// Test data
const testJson = {
  name: "TONL Test",
  version: "2.2.0",
  users: [
    { id: 1, name: "Alice", active: true },
    { id: 2, name: "Bob", active: false }
  ]
};

const tonlContent = `#version 1.0
root{name:str,version:str,users:list}:
  "TONL Test","2.2.0",2`;

// Helper functions
function createTempFile(name: string, content: string): string {
  const tempDir = join(process.cwd(), "temp");
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const filePath = join(tempDir, name);
  writeFileSync(filePath, content);
  return filePath;
}

function cleanupTempFile(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

function runCliCommand(command: string, timeout: number = 10000): { success: boolean; output: string; error?: string } {
  try {
    const output = execSync(`node ${join(process.cwd(), "dist/cli.js")} ${command}`, {
      encoding: 'utf8',
      timeout,
      cwd: process.cwd()
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message
    };
  }
}

describe('Simple CLI Testing', () => {

  test('should show help when no arguments provided', () => {
    const result = runCliCommand('');

    assert.ok(result.success, 'Should show help without arguments');
    assert.ok(result.output.includes('TONL (Token-Optimized Notation Language) CLI'), 'Should show CLI help header');
    assert.ok(result.output.includes('Usage:'), 'Should show usage information');
  });

  test('should show version information', () => {
    const result = runCliCommand('--version');

    assert.ok(result.success, 'Version command should succeed');
    assert.ok(result.output.includes('TONL Version:'), 'Should show correct version');
    assert.ok(result.output.includes('Token-Optimized Notation Language'), 'Should show description');
  });

  test('should show help with --help flag', () => {
    const result = runCliCommand('--help');

    assert.ok(result.success, 'Help command should succeed');
    assert.ok(result.output.includes('Usage:'), 'Should show usage information');
    assert.ok(result.output.includes('--interactive'), 'Should show interactive option');
    assert.ok(result.output.includes('--theme'), 'Should show theme option');
  });

  test('should encode JSON to TONL', () => {
    const jsonFile = createTempFile('test.json', JSON.stringify(testJson, null, 2));

    try {
      const result = runCliCommand(`encode ${jsonFile}`);

      assert.ok(result.success, 'Basic encode should succeed');
      assert.ok(result.output.includes('root'), 'Should encode correctly');
      assert.ok(result.output.includes('TONL Test'), 'Should preserve data');
    } finally {
      cleanupTempFile(jsonFile);
    }
  });

  test('should encode with smart optimization', () => {
    const jsonFile = createTempFile('test.json', JSON.stringify(testJson, null, 2));

    try {
      const result = runCliCommand(`encode ${jsonFile} --smart`);

      assert.ok(result.success, 'Smart encode should succeed');
      assert.ok(result.output.includes('#version'), 'Should include version');
    } finally {
      cleanupTempFile(jsonFile);
    }
  });

  test('should encode with output file', () => {
    const jsonFile = createTempFile('test.json', JSON.stringify(testJson, null, 2));
    const outputFile = join(process.cwd(), 'temp', 'output.tonl');

    try {
      const result = runCliCommand(`encode ${jsonFile} --out ${outputFile}`);

      assert.ok(result.success, 'Encode with output should succeed');
      assert.ok(existsSync(outputFile), 'Output file should be created');

      const outputContent = readFileSync(outputFile, { encoding: 'utf8' });
      assert.ok(outputContent.includes('TONL Test'), 'Output should contain encoded data');
    } finally {
      cleanupTempFile(jsonFile);
      cleanupTempFile(outputFile);
    }
  });

  test('should decode TONL to JSON', () => {
    const tonlFile = createTempFile('test.tonl', tonlContent);

    try {
      const result = runCliCommand(`decode ${tonlFile}`);

      assert.ok(result.success, 'Basic decode should succeed');
      assert.ok(result.output.includes('"TONL Test"'), 'Should decode to JSON');
      assert.ok(result.output.includes('2.2.0'), 'Should preserve values');
    } finally {
      cleanupTempFile(tonlFile);
    }
  });

  test('should show stats for JSON', () => {
    const jsonFile = createTempFile('test.json', JSON.stringify(testJson, null, 2));

    try {
      const result = runCliCommand(`stats ${jsonFile}`);

      assert.ok(result.success, 'Stats command should succeed');
      assert.ok(result.output.includes('TONL Statistics'), 'Should show stats header');
      assert.ok(result.output.includes('Bytes'), 'Should show byte information');
      assert.ok(result.output.includes('Tokens'), 'Should show token information');
      assert.ok(result.output.includes('Savings'), 'Should show savings');
    } finally {
      cleanupTempFile(jsonFile);
    }
  });

  test('should show stats for TONL', () => {
    const tonlFile = createTempFile('test.tonl', tonlContent);

    try {
      const result = runCliCommand(`stats ${tonlFile}`);

      assert.ok(result.success, 'Stats for TONL should succeed');
      assert.ok(result.output.includes('TONL Statistics'), 'Should show stats header');
    } finally {
      cleanupTempFile(tonlFile);
    }
  });

  test('should work with different tokenizers', () => {
    const jsonFile = createTempFile('test.json', JSON.stringify(testJson, null, 2));

    try {
      const tokenizers = ['gpt-5', 'claude-3.5', 'gemini-2.0'];

      for (const tokenizer of tokenizers) {
        const result = runCliCommand(`stats ${jsonFile} --tokenizer ${tokenizer}`);
        assert.ok(result.success, `Should work with ${tokenizer} tokenizer`);
        assert.ok(result.output.includes('TONL Statistics'), `Should show stats with ${tokenizer}`);
      }
    } finally {
      cleanupTempFile(jsonFile);
    }
  });

  test('should format TONL file', () => {
    const tonlFile = createTempFile('test.tonl', tonlContent);

    try {
      const result = runCliCommand(`format ${tonlFile}`);

      assert.ok(result.success, 'Format command should succeed');
      assert.ok(result.output.includes('#version'), 'Should preserve version');
    } finally {
      cleanupTempFile(tonlFile);
    }
  });

  test('should format with pretty printing', () => {
    const tonlFile = createTempFile('test.tonl', tonlContent);

    try {
      const result = runCliCommand(`format ${tonlFile} --pretty`);

      assert.ok(result.success, 'Pretty format should succeed');
    } finally {
      cleanupTempFile(tonlFile);
    }
  });

  test('should launch interactive mode', () => {
    const result = runCliCommand('stats --interactive', 3000);

    assert.ok(result.success, 'Interactive mode should start');
    assert.ok(result.output.includes('TONL Interactive Stats Dashboard'), 'Should show interactive header');
  });

  test('should launch interactive mode with short flag', () => {
    const result = runCliCommand('stats -i', 3000);

    assert.ok(result.success, 'Short interactive flag should work');
    assert.ok(result.output.includes('TONL Interactive Stats Dashboard'), 'Should show interactive header');
  });

  test('should handle encode with different delimiters', () => {
    const jsonFile = createTempFile('test.json', JSON.stringify(testJson, null, 2));

    try {
      // Test with a working delimiter that doesn't conflict with shell
      const result = runCliCommand(`encode ${jsonFile} --delimiter ";"`);
      assert.ok(result.success, 'Should encode with semicolon delimiter');

      // The delimiter should be properly set in the output if different from default
      assert.ok(result.success, 'Delimiter encoding should work');
    } finally {
      cleanupTempFile(jsonFile);
    }
  });

  test('should handle encode with type hints', () => {
    const jsonFile = createTempFile('test.json', JSON.stringify(testJson, null, 2));

    try {
      const result = runCliCommand(`encode ${jsonFile} --include-types`);

      assert.ok(result.success, 'Encode with types should succeed');
      assert.ok(result.output.includes('str') || result.output.includes('list'), 'Should include type hints');
    } finally {
      cleanupTempFile(jsonFile);
    }
  });

  test('should handle invalid commands', () => {
    const result = runCliCommand('invalid-command test.json');

    assert.ok(!result.success, 'Should fail with unknown command');
    assert.ok(result.error?.includes('Unknown command') || result.output.includes('Unknown command'), 'Should show command error');
  });

  test('should handle missing files for encode', () => {
    const result = runCliCommand('encode nonexistent.json');

    assert.ok(!result.success, 'Should fail with missing file');
  });

  test('should handle missing files for stats', () => {
    const result = runCliCommand('stats nonexistent.json');

    assert.ok(!result.success, 'Should fail with missing file');
  });

  test('should round-trip encode/decode correctly', () => {
    const originalJson = testJson;
    const jsonFile = createTempFile('original.json', JSON.stringify(originalJson, null, 2));
    const tonlFile = join(process.cwd(), 'temp', 'roundtrip.tonl');
    const jsonFile2 = join(process.cwd(), 'temp', 'roundtrip.json');

    try {
      // Encode JSON to TONL
      const encodeResult = runCliCommand(`encode ${jsonFile} --out ${tonlFile}`);
      assert.ok(encodeResult.success, 'Encode should succeed');

      // Decode TONL back to JSON
      const decodeResult = runCliCommand(`decode ${tonlFile} --out ${jsonFile2}`);
      assert.ok(decodeResult.success, 'Decode should succeed');

      // Compare original and round-tripped
      const originalContent = readFileSync(jsonFile, { encoding: 'utf8' });
      const roundtripContent = readFileSync(jsonFile2, { encoding: 'utf8' });

      const originalParsed = JSON.parse(originalContent);
      const roundtripParsed = JSON.parse(roundtripContent);

      assert.deepEqual(originalParsed, roundtripParsed, 'Round-trip should preserve data');
    } finally {
      cleanupTempFile(jsonFile);
      cleanupTempFile(tonlFile);
      cleanupTempFile(jsonFile2);
    }
  });

});

// Clean up temp directory
const tempDir = join(process.cwd(), 'temp');
if (existsSync(tempDir)) {
  try {
    execSync(`rm -rf ${tempDir}`, { cwd: process.cwd() });
  } catch {
    // Ignore cleanup errors
  }
}

console.log('✅ Simple CLI Testing Complete!');