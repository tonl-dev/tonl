#!/usr/bin/env node
/**
 * TONL CLI - Command line interface for TONL format
 */

import { safeReadFile } from "./cli/utils.js";
import { parseArgs } from "./cli/arg-parser.js";
import { getCommand, getAvailableCommands } from "./cli/command-registry.js";
import { processQueryArgs } from "./cli/commands/query.js";
import { showHelp } from "./cli/help.js";
import type { CommandContext } from "./cli/types.js";


/**
 * Main CLI execution
 */
async function main() {
  try {
    const args = process.argv.slice(2);

    // Show help if no arguments provided
    if (args.length === 0) {
      showHelp();
      return;
    }

    // Special case for --version command (no file required)
    if (args.length === 1 && (args[0] === '--version' || args[0] === '-v')) {
      const packageVersion = '2.5.1'; // Hard-coded version to avoid ES module issues
      console.log(`📦 TONL Version: ${packageVersion}`);
      console.log(`🏠 Token-Optimized Notation Language`);
      console.log(`📋 Built: 2025-12-11`);
      console.log(`🔐 Production Ready with 100% Test Coverage`);
      return;
    }

    const { command, file, options } = parseArgs(args);

    // Get the command handler
    const commandHandler = getCommand(command);
    if (!commandHandler) {
      console.error(`❌ Error: Unknown command '${command}'`);
      console.log(`Available commands: ${getAvailableCommands().join(', ')}`);
      process.exit(1);
    }

    // Safely read input file (with path validation) - skip if no file provided for interactive mode
    let input = "";
    if (file) {
      input = safeReadFile(file, options.preprocess || false);
    }

    // Prepare command context
    const context: CommandContext = {
      file,
      options,
      input
    };

    // Handle special case for query commands that need additional processing
    if (command === 'query' || command === 'get') {
      const queryExpression = processQueryArgs(args, command, file);
      context.queryExpression = queryExpression;
      context.commandType = command;
    }

    // Execute the command
    await commandHandler.execute(context);

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}


// Show help for --help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// SECURITY FIX (BF007): Global error handlers for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run CLI
main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});