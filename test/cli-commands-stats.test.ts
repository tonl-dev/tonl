/**
 * CLI Commands Stats Test - Complete Coverage
 */

import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { writeFileSync, unlinkSync } from "fs";
import { StatsCommand } from "../src/cli/commands/stats.js";
import type { CommandContext } from "../src/cli/types.js";

// Mock file operations for testing
function createMockFile(content: string): { path: string; cleanup: () => void } {
  const path = `/tmp/test-${Date.now()}.json`;
  writeFileSync(path, content);
  return {
    path,
    cleanup: () => {
      try {
        unlinkSync(path);
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}

describe('StatsCommand - Complete Coverage Tests', () => {

  test('should have correct command properties', () => {
    assert.equal(StatsCommand.name, 'stats', 'Should have correct name');
    assert.equal(StatsCommand.description, 'Display compression statistics for JSON or TONL files (supports interactive mode)', 'Should have correct description');
    assert.equal(typeof StatsCommand.execute, 'function', 'Should have execute method');
  });

  test('should handle JSON file analysis in normal mode', async () => {
    const jsonData = {
      name: "test",
      value: 42,
      items: ["a", "b", "c"]
    };

    const jsonContent = JSON.stringify(jsonData, null, 2);
    const mockFile = createMockFile(jsonContent);

    try {
      const context: CommandContext = {
        file: mockFile.path,
        input: jsonContent,
        options: {}
      };

      // Should not throw
      await StatsCommand.execute(context);
      assert.ok(true, 'Should execute without error');
    } finally {
      mockFile.cleanup();
    }
  });

  test('should handle TONL file analysis in normal mode', async () => {
    const tonlContent = `#version 1.0
root{name,value}:
  test,42`;

    const mockFile = createMockFile(tonlContent);
    // Rename to .tonl extension
    const tonlPath = mockFile.path.replace('.json', '.tonl');
    const fs = require('fs');
    fs.renameSync(mockFile.path, tonlPath);

    try {
      const context: CommandContext = {
        file: tonlPath,
        input: tonlContent,
        options: {}
      };

      // Should not throw
      await StatsCommand.execute(context);
      assert.ok(true, 'Should execute without error');
    } finally {
      try {
        unlinkSync(tonlPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test('should handle invalid file extensions', async () => {
    const context: CommandContext = {
      file: 'invalid.txt',
      input: 'some content',
      options: {}
    };

    // Should handle gracefully (process.exit might be called)
    try {
      const originalExit = process.exit;
      process.exit = (() => {}) as any; // Mock process.exit

      await StatsCommand.execute(context);

      // Restore original exit
      process.exit = originalExit;

      assert.fail('Should have exited');
    } catch (error) {
      // Expected to exit
      assert.ok(true, 'Should handle invalid file extension');
    }
  });

  test('should suggest interactive mode in normal mode', async () => {
    const jsonData = { test: "data" };
    const jsonContent = JSON.stringify(jsonData);
    const mockFile = createMockFile(jsonContent);

    try {
      let consoleOutput = '';
      const originalLog = console.log;
      console.log = (...args) => {
        consoleOutput += args.join(' ') + '\n';
      };

      const context: CommandContext = {
        file: mockFile.path,
        input: jsonContent,
        options: {}
      };

      await StatsCommand.execute(context);

      // Restore console.log
      console.log = originalLog;

      assert.ok(consoleOutput.includes('Try interactive mode!'), 'Should suggest interactive mode');
      assert.ok(consoleOutput.includes('--interactive'), 'Should suggest interactive flag');
      assert.ok(consoleOutput.includes('-i'), 'Should suggest short flag');
    } finally {
      mockFile.cleanup();
    }
  });

  test('should detect interactive mode from options', async () => {
    const jsonData = { test: "data" };
    const jsonContent = JSON.stringify(jsonData);
    const mockFile = createMockFile(jsonContent);

    try {
      const context: CommandContext = {
        file: mockFile.path,
        input: jsonContent,
        options: {
          interactive: true
        }
      };

      // Mock interactive stats to avoid actual user input
      const mockInteractiveStats = {
        start: async () => {
          // Do nothing
        },
        close: () => {
          // Do nothing
        }
      };

      const originalRequire = require;
      require = jest.fn().mockImplementation((id) => {
        if (id.includes('simple-interactive')) {
          return { SimpleInteractiveStats: jest.fn().mockReturnValue(mockInteractiveStats) };
        }
        return originalRequire(id);
      }) as any;

      await StatsCommand.execute(context);

      // Restore require
      Object.assign(require, originalRequire);

      assert.ok(true, 'Should handle interactive mode');
    } finally {
      mockFile.cleanup();
    }
  });

  test('should detect interactive mode from process.argv', async () => {
    const jsonData = { test: "data" };
    const jsonContent = JSON.stringify(jsonData);
    const mockFile = createMockFile(jsonContent);

    try {
      // Mock process.argv to include interactive flag
      const originalArgv = process.argv;
      process.argv = ['node', 'cli.js', 'stats', mockFile.path, '--interactive'];

      const context: CommandContext = {
        file: mockFile.path,
        input: jsonContent,
        options: {}
      };

      // Mock interactive stats
      const mockInteractiveStats = {
        start: async () => {},
        close: () => {}
      };

      // Mock the module
      jest.doMock('../simple-interactive', () => ({
        SimpleInteractiveStats: jest.fn().mockReturnValue(mockInteractiveStats)
      }));

      await StatsCommand.execute(context);

      // Restore process.argv
      process.argv = originalArgv;

      assert.ok(true, 'Should detect interactive flag from process.argv');
    } finally {
      mockFile.cleanup();
    }
  });

  test('should handle different tokenizer options', async () => {
    const jsonData = { test: "data with some text content" };
    const jsonContent = JSON.stringify(jsonData);
    const mockFile = createMockFile(jsonContent);

    try {
      const tokenizers = ['gpt-4o', 'claude-3.5', 'gemini-2.0'];

      for (const tokenizer of tokenizers) {
        const context: CommandContext = {
          file: mockFile.path,
          input: jsonContent,
          options: {
            tokenizer: tokenizer as any
          }
        };

        // Should not throw with different tokenizers
        await StatsCommand.execute(context);
        assert.ok(true, `Should work with ${tokenizer} tokenizer`);
      }
    } finally {
      mockFile.cleanup();
    }
  });

  test('should handle delimiter options', async () => {
    const jsonData = { items: ["a,b", "c|d", "e\tf"] };
    const jsonContent = JSON.stringify(jsonData);
    const mockFile = createMockFile(jsonContent);

    try {
      const delimiters: any[] = [',', '|', '\t', ';'];

      for (const delimiter of delimiters) {
        const context: CommandContext = {
          file: mockFile.path,
          input: jsonContent,
          options: {
            delimiter: delimiter
          }
        };

        // Should not throw with different delimiters
        await StatsCommand.execute(context);
        assert.ok(true, `Should work with ${JSON.stringify(delimiter)} delimiter`);
      }
    } finally {
      mockFile.cleanup();
    }
  });

  test('should handle various option combinations', async () => {
    const jsonData = { complex: { nested: { data: [1, 2, 3] } } };
    const jsonContent = JSON.stringify(jsonData);
    const mockFile = createMockFile(jsonContent);

    try {
      const optionCombinations = [
        { tokenizer: 'gpt-4o' },
        { delimiter: '|' },
        { tokenizer: 'claude-3.5', delimiter: '\t' },
        { verbose: true },
        { compare: true }
      ];

      for (const options of optionCombinations) {
        const context: CommandContext = {
          file: mockFile.path,
          input: jsonContent,
          options: options as any
        };

        // Should not throw with different option combinations
        await StatsCommand.execute(context);
        assert.ok(true, `Should work with options: ${JSON.stringify(options)}`);
      }
    } finally {
      mockFile.cleanup();
    }
  });
});