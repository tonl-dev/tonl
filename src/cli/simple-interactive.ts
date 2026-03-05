/**
 * Simple Interactive Stats
 */

import * as readline from 'readline';
import { EnhancedStats, type AnalyzeOptions } from './simple-enhanced-stats.js';

export class SimpleInteractiveStats {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start(filePath?: string, options: AnalyzeOptions = {}): Promise<void> {
    console.clear();
    console.log('TONL Interactive Stats Dashboard');
    console.log('=====================================\n');

    const enhancedStats = new EnhancedStats();

    if (filePath) {
      // SECURITY FIX (CRITICAL-002): Path validation happens inside EnhancedStats.analyzeFile
      await this.analyzeAndShow(enhancedStats, filePath, options);
    }

    await this.showMainMenu(enhancedStats, options);
  }

  private async analyzeAndShow(enhancedStats: EnhancedStats, filePath: string, options: AnalyzeOptions): Promise<void> {
    try {
      // Path validation is handled by EnhancedStats.analyzeFile (CRITICAL-001 fix)
      const stats = await enhancedStats.analyzeFile(filePath, options);

      console.log('\nResults:');
      console.log(`File: ${stats.filename}`);
      console.log(`Original: ${stats.originalBytes} bytes, ${stats.originalTokens} tokens`);
      console.log(`TONL: ${stats.tonlBytes} bytes, ${stats.tonlTokens} tokens`);
      console.log(`Savings: ${stats.byteSavings}% bytes, ${stats.tokenSavings}% tokens`);
      console.log(`Processing time: ${stats.processingTime}ms\n`);
    } catch (error) {
      console.error(`Error analyzing file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async showMainMenu(enhancedStats: EnhancedStats, options: AnalyzeOptions): Promise<void> {
    while (true) {
      console.log('Options:');
      console.log('1. Analyze another file');
      console.log('2. Compare two files');
      console.log('3. Exit');

      const choice = await this.askQuestion('\nChoose an option (1-3): ');

      switch (choice.trim()) {
        case '1':
          await this.handleAnalyzeFile(enhancedStats, options);
          break;
        case '2':
          await this.handleCompareFiles(enhancedStats, options);
          break;
        case '3':
          console.log('Goodbye!');
          this.close();
          return;
        default:
          console.log('Invalid option. Please try again.\n');
      }
    }
  }

  private async handleAnalyzeFile(enhancedStats: EnhancedStats, options: AnalyzeOptions): Promise<void> {
    const filePath = await this.askQuestion('Enter file path to analyze: ');
    if (filePath.trim()) {
      // SECURITY FIX (CRITICAL-002): Path validation happens inside analyzeAndShow -> EnhancedStats.analyzeFile
      await this.analyzeAndShow(enhancedStats, filePath.trim(), options);
    }
  }

  private async handleCompareFiles(enhancedStats: EnhancedStats, options: AnalyzeOptions): Promise<void> {
    const file1 = await this.askQuestion('Enter first file path: ');
    const file2 = await this.askQuestion('Enter second file path: ');

    if (file1.trim() && file2.trim()) {
      try {
        console.log('\nComparing files...');
        // SECURITY FIX (CRITICAL-002): Path validation happens inside EnhancedStats.analyzeFile
        const stats1 = await enhancedStats.analyzeFile(file1.trim(), options);
        const stats2 = await enhancedStats.analyzeFile(file2.trim(), options);

        console.log('\nComparison Results:');
        console.log('File 1:', stats1.filename, `- ${stats1.byteSavings}% savings`);
        console.log('File 2:', stats2.filename, `- ${stats2.byteSavings}% savings`);

        const winner = stats1.compressionRatio < stats2.compressionRatio ? stats1.filename : stats2.filename;
        console.log(`Winner: ${winner} has better compression!\n`);
      } catch (error) {
        console.error(`Error comparing files: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    }
  }

  private askQuestion(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  }

  close(): void {
    this.rl.close();
  }
}
