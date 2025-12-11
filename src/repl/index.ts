/**
 * TONL REPL (Read-Eval-Print Loop) (T035-T037)
 * Interactive TONL exploration and querying
 */

import { createInterface } from 'readline';
import { TONLDocument } from '../document.js';
import { readFileSync } from 'fs';

export interface REPLOptions {
  /**
   * Enable history
   */
  history?: boolean;

  /**
   * History file path
   */
  historyFile?: string;

  /**
   * Prompt string
   */
  prompt?: string;
}

export class TONLREPL {
  private currentDoc: TONLDocument | null = null;
  private currentFile: string | null = null;
  private rl: any;
  private history: string[] = [];
  private options: REPLOptions;

  constructor(options: REPLOptions = {}) {
    this.options = {
      history: true,
      prompt: 'tonl> ',
      ...options
    };
  }

  /**
   * Load a TONL file
   *
   * SECURITY FIX (SEC-003): Added path validation to prevent path traversal
   */
  async load(filePath: string): Promise<void> {
    try {
      // SECURITY FIX (SEC-003): Validate file path before reading
      // Import PathValidator dynamically to avoid circular dependencies
      const { PathValidator } = await import('../cli/path-validator.js');
      const { SecurityError } = await import('../errors/index.js');

      try {
        const safePath = PathValidator.validateRead(filePath);
        const content = readFileSync(safePath, 'utf-8');

        if (filePath.endsWith('.json')) {
          this.currentDoc = TONLDocument.fromJSON(JSON.parse(content));
        } else {
          this.currentDoc = TONLDocument.parse(content);
        }

        this.currentFile = safePath;
        console.log(`✓ Loaded: ${safePath}`);
      } catch (error: any) {
        if (error.name === 'SecurityError' || error.message?.includes('Security')) {
          console.error(`✗ Security Error: ${error.message}`);
          console.error(`✗ Access denied to: ${filePath}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(`✗ Error loading file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a query
   */
  query(expression: string): any {
    if (!this.currentDoc) {
      console.error('✗ No document loaded. Use .load <file> first.');
      return null;
    }

    try {
      const result = this.currentDoc.query(expression);
      return result;
    } catch (error) {
      console.error(`✗ Query error: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Show help
   */
  private showHelp(): void {
    console.log(`
TONL REPL v0.8.0 - Interactive TONL Explorer

Commands:
  .load <file>     - Load a TONL or JSON file
  .quit / .exit    - Exit REPL
  .help            - Show this help
  .doc             - Show current document info
  .indices         - List indices
  .clear           - Clear screen

Query syntax:
  user.name        - Simple path
  users[0]         - Array index
  users[*].name    - Wildcard
  users[?(@.age > 18)] - Filter

Examples:
  > .load data.tonl
  > user.profile.email
  > users[?(@.active)].name
  > $..id
`);
  }

  /**
   * Show document info
   */
  private showDocInfo(): void {
    if (!this.currentDoc) {
      console.log('No document loaded');
      return;
    }

    const stats = this.currentDoc.stats();
    console.log(`
Document: ${this.currentFile || 'In-memory'}
Nodes: ${stats.nodeCount}
Max Depth: ${stats.maxDepth}
Size: ${(stats.sizeBytes / 1024).toFixed(2)} KB
Arrays: ${stats.arrayCount}
Objects: ${stats.objectCount}
Primitives: ${stats.primitiveCount}
Indices: ${this.currentDoc.listIndices().join(', ') || 'None'}
`);
  }

  /**
   * Start REPL
   */
  start(): void {
    console.log('TONL REPL v0.8.0');
    console.log('Type .help for commands, .quit to exit\n');

    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.options.prompt
    });

    this.rl.prompt();

    this.rl.on('line', (line: string) => {
      const input = line.trim();

      if (!input) {
        this.rl.prompt();
        return;
      }

      // Add to history
      if (this.options.history) {
        this.history.push(input);
      }

      // Handle commands
      if (input.startsWith('.')) {
        this.handleCommand(input);
      } else {
        // Execute query
        const result = this.query(input);
        if (result !== null && result !== undefined) {
          console.log(JSON.stringify(result, null, 2));
        }
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\nGoodbye!');
      process.exit(0);
    });
  }

  /**
   * Handle REPL commands
   */
  private handleCommand(input: string): void {
    const [cmd, ...args] = input.split(/\s+/);

    switch (cmd) {
      case '.load':
        if (args.length === 0) {
          console.error('Usage: .load <file>');
        } else {
          // BUG-NEW-017 FIX: Properly handle async load() function
          // The load() method is async but handleCommand() is sync, so we need
          // to handle the Promise to avoid silent failures
          this.load(args[0]).catch((error: Error) => {
            console.error(`✗ Failed to load file: ${error.message}`);
          });
        }
        break;

      case '.quit':
      case '.exit':
        this.rl.close();
        break;

      case '.help':
        this.showHelp();
        break;

      case '.doc':
        this.showDocInfo();
        break;

      case '.indices':
        if (!this.currentDoc) {
          console.log('No document loaded');
        } else {
          const indices = this.currentDoc.listIndices();
          if (indices.length === 0) {
            console.log('No indices');
          } else {
            console.log('Indices:', indices.join(', '));
          }
        }
        break;

      case '.clear':
        console.clear();
        break;

      default:
        console.error(`Unknown command: ${cmd}. Type .help for commands.`);
    }
  }

  /**
   * Get command history
   */
  getHistory(): string[] {
    return [...this.history];
  }
}
