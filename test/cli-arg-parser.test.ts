/**
 * CLI Argument Parser Tests - Complete Coverage
 */

import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { parseArgs } from "../src/cli/arg-parser.js";

describe('CLI Argument Parser - Complete Coverage Tests', () => {

  test('should parse basic command and file', () => {
    const args = ['stats', 'test.json'];
    const result = parseArgs(args);

    assert.equal(result.command, 'stats', 'Should parse command correctly');
    assert.equal(result.file, 'test.json', 'Should parse file correctly');
    assert.deepEqual(result.options, {}, 'Should have empty options');
  });

  test('should parse encode command', () => {
    const args = ['encode', 'data.json', '--out', 'output.tonl'];
    const result = parseArgs(args);

    assert.equal(result.command, 'encode', 'Should parse encode command');
    assert.equal(result.file, 'data.json', 'Should parse input file');
    assert.equal(result.options.out, 'output.tonl', 'Should parse out option');
  });

  test('should parse decode command', () => {
    const args = ['decode', 'data.tonl', '--strict'];
    const result = parseArgs(args);

    assert.equal(result.command, 'decode', 'Should parse decode command');
    assert.equal(result.file, 'data.tonl', 'Should parse input file');
    assert.equal(result.options.strict, true, 'Should parse strict option');
  });

  test('should parse format command', () => {
    const args = ['format', 'data.tonl', '--pretty', '--indent', '4'];
    const result = parseArgs(args);

    assert.equal(result.command, 'format', 'Should parse format command');
    assert.equal(result.file, 'data.tonl', 'Should parse input file');
    assert.equal(result.options.pretty, true, 'Should parse pretty option');
    assert.equal(result.options.indent, 4, 'Should parse indent option');
  });

  test('should parse stats command', () => {
    const args = ['stats', 'data.json', '--tokenizer', 'gpt-4o', '--interactive'];
    const result = parseArgs(args);

    assert.equal(result.command, 'stats', 'Should parse stats command');
    assert.equal(result.file, 'data.json', 'Should parse input file');
    assert.equal(result.options.tokenizer, 'gpt-4o', 'Should parse tokenizer option');
    assert.equal(result.options.interactive, true, 'Should parse interactive option');
  });

  test('should parse validate command', () => {
    const args = ['validate', 'data.tonl', '--schema', 'schema.tonl', '--strict'];
    const result = parseArgs(args);

    assert.equal(result.command, 'validate', 'Should parse validate command');
    assert.equal(result.file, 'data.tonl', 'Should parse input file');
    assert.equal(result.options.schema, 'schema.tonl', 'Should parse schema option');
    assert.equal(result.options.strict, true, 'Should parse strict option');
  });

  test('should parse generate-types command', () => {
    const args = ['generate-types', 'schema.tonl', '--out', 'types.ts'];
    const result = parseArgs(args);

    assert.equal(result.command, 'generate-types', 'Should parse generate-types command');
    assert.equal(result.file, 'schema.tonl', 'Should parse input file');
    assert.equal(result.options.out, 'types.ts', 'Should parse out option');
  });

  test('should parse query command', () => {
    const args = ['query', 'data.tonl', 'users[?(@.age > 25)]'];
    const result = parseArgs(args);

    assert.equal(result.command, 'query', 'Should parse query command');
    assert.equal(result.file, 'data.tonl', 'Should parse input file');
  });

  test('should parse get command', () => {
    const args = ['get', 'data.tonl', 'user.profile.email'];
    const result = parseArgs(args);

    assert.equal(result.command, 'get', 'Should parse get command');
    assert.equal(result.file, 'data.tonl', 'Should parse input file');
  });

  test('should parse delimiter options correctly', () => {
    const testCases = [
      { args: ['encode', 'data.json', '--delimiter', ','], expected: ',' },
      { args: ['encode', 'data.json', '--delimiter', '|'], expected: '|' },
      { args: ['encode', 'data.json', '--delimiter', '\\t'], expected: '\t' },
      { args: ['encode', 'data.json', '--delimiter', ';'], expected: ';' }
    ];

    for (const testCase of testCases) {
      const result = parseArgs(testCase.args);
      assert.equal(result.options.delimiter, testCase.expected,
        `Should parse delimiter: ${testCase.expected}`);
    }
  });

  test('should parse boolean flags correctly', () => {
    const booleanFlags = [
      'smart', 'stats', 'optimize', 'verbose', 'strict', 'pretty',
      'preprocess', 'compact-tables', 'schema-first', 'interactive', 'compare'
    ];

    for (const flag of booleanFlags) {
      const args = ['stats', 'test.json', `--${flag}`];
      const result = parseArgs(args);

      const optionName = flag.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      assert.equal((result.options as any)[optionName], true,
        `Should parse boolean flag: ${flag}`);
    }
  });

  test('should parse short interactive flag', () => {
    const args = ['stats', 'test.json', '-i'];
    const result = parseArgs(args);

    assert.equal(result.options.interactive, true, 'Should parse short interactive flag');
  });

  test('should parse theme option', () => {
    const themes = ['default', 'neon', 'matrix', 'cyberpunk'];

    for (const theme of themes) {
      const args = ['stats', 'test.json', '--theme', theme];
      const result = parseArgs(args);

      assert.equal((result.options as any).theme, theme, `Should parse theme: ${theme}`);
    }
  });

  test('should parse version option', () => {
    const args = ['encode', 'data.json', '--version', '2.0'];
    const result = parseArgs(args);

    assert.equal(result.options.version, '2.0', 'Should parse version option');
  });

  test('should parse indent option with validation', () => {
    const validArgs = ['format', 'data.tonl', '--indent', '4'];
    const validResult = parseArgs(validArgs);
    assert.equal(validResult.options.indent, 4, 'Should parse valid indent');

    // Test invalid indent (this should throw)
    try {
      const invalidArgs = ['format', 'data.tonl', '--indent', 'invalid'];
      parseArgs(invalidArgs);
      assert.fail('Should throw error for invalid indent');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw Error for invalid indent');
      assert.ok(error.message.includes('Invalid indent value'), 'Should have descriptive error message');
    }
  });

  test('should parse tokenizer option', () => {
    const tokenizers = ['gpt-5', 'gpt-4.5', 'gpt-4o', 'claude-3.5', 'gemini-2.0', 'llama-4', 'o200k', 'cl100k'];

    for (const tokenizer of tokenizers) {
      const args = ['stats', 'test.json', '--tokenizer', tokenizer];
      const result = parseArgs(args);

      assert.equal(result.options.tokenizer, tokenizer, `Should parse tokenizer: ${tokenizer}`);
    }
  });

  test('should ignore invalid tokenizer', () => {
    const args = ['stats', 'test.json', '--tokenizer', 'invalid-tokenizer'];
    const result = parseArgs(args);

    assert.equal(result.options.tokenizer, undefined, 'Should ignore invalid tokenizer');
  });

  test('should parse multiple options together', () => {
    const args = [
      'encode', 'data.json',
      '--out', 'output.tonl',
      '--smart',
      '--stats',
      '--delimiter', '|',
      '--include-types',
      '--version', '1.0'
    ];

    const result = parseArgs(args);

    assert.equal(result.command, 'encode');
    assert.equal(result.file, 'data.json');
    assert.equal(result.options.out, 'output.tonl');
    assert.equal(result.options.smart, true);
    assert.equal(result.options.stats, true);
    assert.equal(result.options.delimiter, '|');
    assert.equal(result.options.includeTypes, true);
    assert.equal(result.options.version, '1.0');
  });

  test('should handle command without options', () => {
    const commands = ['encode', 'decode', 'stats', 'format', 'validate'];

    for (const command of commands) {
      const args = [command, 'test.json'];
      const result = parseArgs(args);

      assert.equal(result.command, command, `Should parse ${command} command`);
      assert.equal(result.file, 'test.json', `Should parse file for ${command}`);
      assert.deepEqual(result.options, {}, `Should have no options for ${command}`);
    }
  });

  test('should throw error when missing command', () => {
    const args = ['test.json'];

    try {
      parseArgs(args);
      assert.fail('Should throw error when missing command');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw Error');
      assert.ok(error.message.includes('Usage:'), 'Should show usage in error message');
    }
  });

  test('should throw error when missing file', () => {
    const args = ['stats'];

    try {
      parseArgs(args);
      assert.fail('Should throw error when missing file');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw Error');
      assert.ok(error.message.includes('Usage:'), 'Should show usage in error message');
    }
  });

  test('should handle complex argument order', () => {
    const args = [
      'stats',
      '--interactive',
      '--tokenizer', 'gpt-4o',
      'test.json',
      '--verbose'
    ];

    const result = parseArgs(args);

    assert.equal(result.command, 'stats');
    assert.equal(result.file, 'test.json');
    assert.equal(result.options.interactive, true);
    assert.equal(result.options.tokenizer, 'gpt-4o');
    assert.equal(result.options.verbose, true);
  });

  test('should handle all supported commands', () => {
    const commands = [
      'encode', 'decode', 'stats', 'format', 'validate',
      'generate-types', 'query', 'get'
    ];

    for (const command of commands) {
      const args = [command, 'test.json'];
      const result = parseArgs(args);

      assert.equal(result.command, command, `Should support command: ${command}`);
      assert.equal(result.file, 'test.json', `Should parse file for: ${command}`);
    }
  });

  test('should handle options with values correctly', () => {
    const optionTests = [
      { args: ['encode', 'test.json', '--out', 'output.tonl'], option: 'out', expected: 'output.tonl' },
      { args: ['format', 'test.tonl', '--indent', '4'], option: 'indent', expected: 4 },
      { args: ['stats', 'test.json', '--tokenizer', 'claude-3.5'], option: 'tokenizer', expected: 'claude-3.5' },
      { args: ['validate', 'test.tonl', '--schema', 'schema.tonl'], option: 'schema', expected: 'schema.tonl' }
    ];

    for (const test of optionTests) {
      const result = parseArgs(test.args);
      assert.equal((result.options as any)[test.option], test.expected,
        `Should parse option ${test.option} with value ${test.expected}`);
    }
  });
});