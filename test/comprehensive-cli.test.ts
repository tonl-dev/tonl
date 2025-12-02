/**
 * Comprehensive CLI Testing - All Arguments and Features
 * Tests every CLI command and option combination systematically
 */

import { test, describe, after } from "node:test";
import { strict as assert } from "node:assert";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// Test data fixtures
const testFixtures = {
  simpleJson: {
    name: "test-app",
    version: "1.0.0",
    users: [
      { id: 1, name: "Alice", active: true },
      { id: 2, name: "Bob", active: false }
    ]
  },
  complexJson: {
    app: "TONL",
    version: "2.2.0",
    features: ["search", "export", "analytics"],
    config: {
      database: { host: "localhost", port: 5432 },
      cache: { enabled: true, size: "256MB" }
    },
    metrics: [
      { name: "users", value: 1000, active: true },
      { name: "sessions", value: 5000, active: false }
    ]
  },
  largeArray: {
    items: Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.random() * 100,
      category: i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C"
    }))
  }
};

// Helper functions
function createTempFile(name: string, content: any): string {
  const tempDir = join(process.cwd(), "temp");
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const filePath = join(tempDir, name);
  const fileContent = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  writeFileSync(filePath, fileContent);
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

function runCliCommand(command: string, timeout: number = 30000): { success: boolean; output: string; error?: string } {
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

// Test suite
describe('Comprehensive CLI Testing - All Commands and Options', () => {

  // Basic CLI functionality
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

  // ENCODE COMMAND TESTS
  describe('Encode Command', () => {
    test('should encode JSON to TONL with basic options', () => {
      const jsonFile = createTempFile('test.json', testFixtures.simpleJson);

      try {
        const result = runCliCommand(`encode ${jsonFile}`);

        assert.ok(result.success, 'Basic encode should succeed');
        assert.ok(result.output.includes('root{'), 'Should encode correctly');
        assert.ok(result.output.includes('test-app'), 'Should preserve data');
      } finally {
        cleanupTempFile(jsonFile);
      }
    });

    test('should encode with output file', () => {
      const jsonFile = createTempFile('test.json', testFixtures.simpleJson);
      const outputFile = join(process.cwd(), 'temp', 'output.tonl');

      try {
        const result = runCliCommand(`encode ${jsonFile} --out ${outputFile}`);

        assert.ok(result.success, 'Encode with output should succeed');
        assert.ok(existsSync(outputFile), 'Output file should be created');

        const outputContent = execSync(`cat ${outputFile}`, { encoding: 'utf8' });
        assert.ok(outputContent.includes('test-app'), 'Output should contain encoded data');
      } finally {
        cleanupTempFile(jsonFile);
        cleanupTempFile(outputFile);
      }
    });

    test('should encode with smart optimization', () => {
      const jsonFile = createTempFile('test.json', testFixtures.complexJson);

      try {
        const result = runCliCommand(`encode ${jsonFile} --smart`);

        assert.ok(result.success, 'Smart encode should succeed');
        assert.ok(result.output.includes('#version'), 'Should include version');
      } finally {
        cleanupTempFile(jsonFile);
      }
    });

    test('should encode with stats', () => {
      const jsonFile = createTempFile('test.json', testFixtures.simpleJson);

      try {
        const result = runCliCommand(`encode ${jsonFile} --stats`);

        assert.ok(result.success, 'Encode with stats should succeed');
        // Stats output goes to stderr, so we just check command succeeded
      } finally {
        cleanupTempFile(jsonFile);
      }
    });

    test('should encode with different delimiters', () => {
      const jsonFile = createTempFile('test.json', testFixtures.simpleJson);

      try {
        const delimiters = ['"\\t"', ';'];  // Pipe causes shell issues on Windows

        for (const delimiter of delimiters) {
          const result = runCliCommand(`encode ${jsonFile} --delimiter ${delimiter}`);
          assert.ok(result.success, `Should encode with delimiter: ${delimiter}`);
        }
      } finally {
        cleanupTempFile(jsonFile);
      }
    });

    test('should encode with type hints', () => {
      const jsonFile = createTempFile('test.json', testFixtures.simpleJson);

      try {
        const result = runCliCommand(`encode ${jsonFile} --include-types`);

        assert.ok(result.success, 'Encode with types should succeed');
        assert.ok(result.output.includes('str') || result.output.includes('list'), 'Should include type hints');
      } finally {
        cleanupTempFile(jsonFile);
      }
    });

    test('should encode with custom version', () => {
      const jsonFile = createTempFile('test.json', testFixtures.simpleJson);

      try {
        const result = runCliCommand(`encode ${jsonFile} --version 2.0`);

        assert.ok(result.success, 'Encode with custom version should succeed');
        assert.ok(result.output.includes('#version 2.0'), 'Should include custom version');
      } finally {
        cleanupTempFile(jsonFile);
      }
    });

    test('should encode with custom indentation', () => {
      const jsonFile = createTempFile('test.json', testFixtures.complexJson);

      try {
        const result = runCliCommand(`encode ${jsonFile} --indent 4`);

        assert.ok(result.success, 'Encode with custom indent should succeed');
      } finally {
        cleanupTempFile(jsonFile);
      }
    });
  });

  // DECODE COMMAND TESTS
  describe('Decode Command', () => {
    test('should decode TONL to JSON', () => {
      const tonlContent = `#version 1.0
root:
  name: test
  value: 42`;
      const tonlFile = createTempFile('test.tonl', tonlContent);

      try {
        const result = runCliCommand(`decode ${tonlFile}`);

        assert.ok(result.success, 'Basic decode should succeed');
        assert.ok(result.output.includes('"test"'), 'Should decode to JSON');
        assert.ok(result.output.includes('42'), 'Should preserve values');
      } finally {
        cleanupTempFile(tonlFile);
      }
    });

    test('should decode with output file', () => {
      const tonlContent = `#version 1.0
root:
  name: test
  value: 42`;
      const tonlFile = createTempFile('test.tonl', tonlContent);
      const outputFile = join(process.cwd(), 'temp', 'output.json');

      try {
        const result = runCliCommand(`decode ${tonlFile} --out ${outputFile}`);

        assert.ok(result.success, 'Decode with output should succeed');
        assert.ok(existsSync(outputFile), 'Output file should be created');

        const outputContent = execSync(`cat ${outputFile}`, { encoding: 'utf8' });
        assert.ok(outputContent.includes('"test"'), 'Output should contain decoded JSON');
      } finally {
        cleanupTempFile(tonlFile);
        cleanupTempFile(outputFile);
      }
    });

    test('should decode with strict mode', () => {
      const tonlContent = `#version 1.0
root:
  name: test`;
      const tonlFile = createTempFile('test.tonl', tonlContent);

      try {
        const result = runCliCommand(`decode ${tonlFile} --strict`);

        assert.ok(result.success, 'Strict decode should succeed');
      } finally {
        cleanupTempFile(tonlFile);
      }
    });
  });

  // STATS COMMAND TESTS
  describe('Stats Command', () => {
    test('should show compression statistics for JSON', () => {
      const jsonFile = createTempFile('test.json', testFixtures.simpleJson);

      try {
        const result = runCliCommand(`stats ${jsonFile}`);

        assert.ok(result.success, 'Stats command should succeed');
        assert.ok(result.output.includes('TONL Statistics'), 'Should show stats header');
        assert.ok(result.output.includes('Bytes'), 'Should show byte information');
        assert.ok(result.output.includes('Tokens'), 'Should show token information');
        assert.ok(result.output.includes('Savings'), 'Should show savings');
        assert.ok(result.output.includes('Try interactive mode!'), 'Should suggest interactive mode');
      } finally {
        cleanupTempFile(jsonFile);
      }
    });

    test('should show compression statistics for TONL', () => {
      const tonlContent = `#version 1.0
root{name:str,users:list}:
  test-app,2`;
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
      const jsonFile = createTempFile('test.json', testFixtures.complexJson);

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

    test('should handle different delimiters', () => {
      const jsonFile = createTempFile('test.json', { items: ["a,b", "c;d", "e\tf"] });

      try {
        const delimiters = [',', ';'];  // Pipe and tab cause shell issues on Windows

        for (const delimiter of delimiters) {
          const result = runCliCommand(`stats ${jsonFile} --delimiter ${delimiter}`);
          assert.ok(result.success, `Should work with delimiter: ${delimiter}`);
        }
      } finally {
        cleanupTempFile(jsonFile);
      }
    });

    test('should work with interactive mode', () => {
      const jsonFile = createTempFile('test.json', testFixtures.simpleJson);

      try {
        // Test interactive mode with file
        const result = runCliCommand(`stats ${jsonFile} --interactive`, 5000);

        assert.ok(result.success, 'Interactive mode should start');
        assert.ok(result.output.includes('TONL Interactive Stats Dashboard'), 'Should show interactive header');
      } finally {
        cleanupTempFile(jsonFile);
      }
    });

    test('should launch interactive mode without file', () => {
      const result = runCliCommand('stats --interactive', 5000);

      assert.ok(result.success, 'Interactive mode without file should work');
      assert.ok(result.output.includes('TONL Interactive Stats Dashboard'), 'Should show interactive header');
    });

    test('should work with short interactive flag', () => {
      const result = runCliCommand('stats -i', 5000);

      assert.ok(result.success, 'Short interactive flag should work');
      assert.ok(result.output.includes('TONL Interactive Stats Dashboard'), 'Should show interactive header');
    });
  });

  // FORMAT COMMAND TESTS
  describe('Format Command', () => {
    test('should format TONL file', () => {
      const tonlContent = `#version 1.0
root{name:str,value:i32}:
  test,42`;
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
      const tonlContent = `#version 1.0
root{name:str}:
  test`;
      const tonlFile = createTempFile('test.tonl', tonlContent);

      try {
        const result = runCliCommand(`format ${tonlFile} --pretty`);

        assert.ok(result.success, 'Pretty format should succeed');
      } finally {
        cleanupTempFile(tonlFile);
      }
    });

    test('should format with output file', () => {
      const tonlContent = `#version 1.0
root{name:str}:
  test`;
      const tonlFile = createTempFile('test.tonl', tonlContent);
      const outputFile = join(process.cwd(), 'temp', 'formatted.tonl');

      try {
        const result = runCliCommand(`format ${tonlFile} --out ${outputFile}`);

        assert.ok(result.success, 'Format with output should succeed');
        assert.ok(existsSync(outputFile), 'Output file should be created');
      } finally {
        cleanupTempFile(tonlFile);
        cleanupTempFile(outputFile);
      }
    });

    test('should format with custom indentation', () => {
      const tonlContent = `#version 1.0
root{obj:test}:
  value:test`;
      const tonlFile = createTempFile('test.tonl', tonlContent);

      try {
        const result = runCliCommand(`format ${tonlFile} --indent 4`);

        assert.ok(result.success, 'Format with custom indent should succeed');
      } finally {
        cleanupTempFile(tonlFile);
      }
    });

    test('should format with type hints', () => {
      const tonlContent = `#version 1.0
root{name}:
  test`;
      const tonlFile = createTempFile('test.tonl', tonlContent);

      try {
        const result = runCliCommand(`format ${tonlFile} --include-types`);

        assert.ok(result.success, 'Format with types should succeed');
      } finally {
        cleanupTempFile(tonlFile);
      }
    });

    test('should reject non-TONL files', () => {
      const jsonFile = createTempFile('test.json', testFixtures.simpleJson);

      try {
        const result = runCliCommand(`format ${jsonFile}`);

        assert.ok(!result.success, 'Should reject JSON files for format');
        assert.ok(result.error?.includes('.tonl file'), 'Should show appropriate error');
      } finally {
        cleanupTempFile(jsonFile);
      }
    });
  });

  // ERROR HANDLING TESTS
  describe('Error Handling', () => {
    test('should handle missing command', () => {
      const result = runCliCommand('nonexistent-command test.json');

      assert.ok(!result.success, 'Should fail with unknown command');
      assert.ok(result.error?.includes('Unknown command') || result.output.includes('Unknown command'), 'Should show command error');
    });

    test('should handle missing file for encode', () => {
      const result = runCliCommand('encode nonexistent.json');

      assert.ok(!result.success, 'Should fail with missing file');
    });

    test('should handle missing file for stats', () => {
      const result = runCliCommand('stats nonexistent.json');

      assert.ok(!result.success, 'Should fail with missing file');
    });

    test('should handle invalid delimiter', () => {
      const jsonFile = createTempFile('test.json', testFixtures.simpleJson);

      try {
        const result = runCliCommand(`encode ${jsonFile} --delimiter invalid`);

        // Should still succeed but ignore invalid delimiter
        assert.ok(result.success, 'Should handle invalid delimiter gracefully');
      } finally {
        cleanupTempFile(jsonFile);
      }
    });

    test('should handle invalid indent value', () => {
      const tonlFile = createTempFile('test.tonl', 'root{name}: test');

      try {
        const result = runCliCommand(`format ${tonlFile} --indent invalid`);

        assert.ok(!result.success, 'Should fail with invalid indent');
        assert.ok(result.error?.includes('Invalid indent value'), 'Should show indent error');
      } finally {
        cleanupTempFile(tonlFile);
      }
    });

    test('should handle missing arguments for commands that require files', () => {
      const commands = ['encode', 'decode', 'stats', 'format'];

      for (const command of commands) {
        const result = runCliCommand(command);

        assert.ok(!result.success, `Should fail when ${command} missing file argument`);
      }
    });

    test('should handle stats without file or interactive flag', () => {
      const result = runCliCommand('stats');

      assert.ok(!result.success, 'Should fail when stats missing file and not interactive');
      assert.ok(result.error?.includes('Usage:'), 'Should show usage in error');
    });
  });

  // ADVANCED FEATURE TESTS
  describe('Advanced Features', () => {
    test('should handle large files efficiently', () => {
      const jsonFile = createTempFile('large.json', testFixtures.largeArray);

      try {
        const startTime = Date.now();
        const result = runCliCommand(`stats ${jsonFile}`);
        const endTime = Date.now();

        assert.ok(result.success, 'Should handle large files');
        assert.ok(endTime - startTime < 10000, 'Should process within 10 seconds');
      } finally {
        cleanupTempFile(jsonFile);
      }
    });

    test('should round-trip encode/decode correctly', () => {
      const originalJson = testFixtures.complexJson;
      const jsonFile = createTempFile('original.json', originalJson);
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
        const originalContent = execSync(`cat ${jsonFile}`, { encoding: 'utf8' });
        const roundtripContent = execSync(`cat ${jsonFile2}`, { encoding: 'utf8' });

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

  // THEME TESTING
  describe('Theme System', () => {
    test('should support all theme options in help', () => {
      const result = runCliCommand('--help');

      assert.ok(result.success, 'Help should show themes');
      assert.ok(result.output.includes('default'), 'Should mention default theme');
      assert.ok(result.output.includes('neon'), 'Should mention neon theme');
      assert.ok(result.output.includes('matrix'), 'Should mention matrix theme');
      assert.ok(result.output.includes('cyberpunk'), 'Should mention cyberpunk theme');
    });

    // Clean up temp files and log completion after all tests
    after(() => {
      const tempDir = join(process.cwd(), 'temp');
      if (existsSync(tempDir)) {
        try {
          execSync(`rm -rf ${tempDir}`, { cwd: process.cwd() });
        } catch {
          // Ignore cleanup errors
        }
      }
      console.log('✅ Comprehensive CLI Testing Suite Complete - All Commands and Options Tested!');
    });
  });
});