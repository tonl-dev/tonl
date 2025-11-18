/**
 * Enhanced Stats Command
 */

import { encodeTONL, decodeTONL } from "../../index.js";
import { safeJsonParse } from "../../utils/strings.js";
import { estimateTokens } from "../../utils/metrics.js";
import { byteSize, displayStats } from "../utils.js";
import { SimpleInteractiveStats } from "../simple-interactive.js";
import type { Command, CommandContext } from "../types.js";
import type { TONLValue } from "../../types.js";

export const StatsCommand: Command = {
  name: "stats",
  description: "Display compression statistics for JSON or TONL files (supports interactive mode)",

  async execute(context: CommandContext): Promise<void> {
    const { file, options, input } = context;

    // 🚀 Check if interactive mode is enabled
    if (options.interactive || process.argv.includes('--interactive') || process.argv.includes('-i')) {
      const interactiveStats = new SimpleInteractiveStats();
      await interactiveStats.start(file, {
        tokenizer: options.tokenizer,
        compareMode: options.compare,
        verbose: options.verbose
      });
      interactiveStats.close();
      return;
    }

    // 📊 Traditional stats mode
    if (file.endsWith('.json')) {
      // JSON file - encode and compare
      const jsonData = safeJsonParse(input) as TONLValue;
      const originalBytes = byteSize(input);
      const originalTokens = estimateTokens(input, options.tokenizer);

      const tonlOutput = encodeTONL(jsonData, { delimiter: options.delimiter });
      const tonlBytes = byteSize(tonlOutput);
      const tonlTokens = estimateTokens(tonlOutput, options.tokenizer);

      displayStats(originalBytes, originalTokens, tonlBytes, tonlTokens, file);
    } else if (file.endsWith('.tonl')) {
      // TONL file - decode and compare
      const jsonData = decodeTONL(input, { delimiter: options.delimiter });
      const jsonOutput = JSON.stringify(jsonData);

      const tonlBytes = byteSize(input);
      const tonlTokens = estimateTokens(input, options.tokenizer);
      const originalBytes = byteSize(jsonOutput);
      const originalTokens = estimateTokens(jsonOutput, options.tokenizer);

      displayStats(originalBytes, originalTokens, tonlBytes, tonlTokens, file);
    } else {
      console.error("❌ Error: File must be .json or .tonl");
      process.exit(1);
    }

    // 💡 Suggest interactive mode
    console.log(`\n💡 Try interactive mode!`);
    console.log(`   Run: tonl stats ${file} --interactive`);
    console.log(`   Or: tonl stats ${file} -i`);
  }
};