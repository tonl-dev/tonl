/**
 * TONL Error classes with enhanced reporting
 */

// Task 014: Export centralized error messages
export { ErrorMessages, type ErrorMessageKey } from './messages.js';

/**
 * Base TONL error class with location tracking
 */
export class TONLError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number,
    public readonly source?: string
  ) {
    super(message);
    this.name = 'TONLError';
    Error.captureStackTrace(this, this.constructor);
  }

  toString(): string {
    let result = `${this.name}: ${this.message}`;

    // SECURITY FIX (BF014): Only show detailed info in development
    // BUG-NEW-020 FIX: Default to production-safe behavior when NODE_ENV is not set
    // Changed from `!== 'production'` to `=== 'development'` for secure-by-default
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (this.line !== undefined) {
      if (isDevelopment) {
        result += `\n  at line ${this.line}`;
        if (this.column !== undefined) {
          result += `:${this.column}`;
        }
      } else {
        // Production: minimal info
        result += ` (line ${this.line})`;
      }
    }

    // SECURITY FIX (BF014): Only show source code in development
    if (this.source && isDevelopment) {
      result += `\n\n  ${this.source}`;
      if (this.column !== undefined) {
        result += `\n  ${' '.repeat(this.column)}^`;
      }
    }

    return result;
  }
}

/**
 * Parse error - syntax errors in TONL format
 */
export class TONLParseError extends TONLError {
  constructor(
    message: string,
    line?: number,
    column?: number,
    source?: string,
    public readonly suggestion?: string
  ) {
    super(message, line, column, source);
    this.name = 'TONLParseError';
  }

  toString(): string {
    let result = super.toString();

    if (this.suggestion) {
      result += `\n\n💡 Suggestion: ${this.suggestion}`;
    }

    return result;
  }
}

/**
 * Validation error - schema validation failures
 */
export class TONLValidationError extends TONLError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly expected?: string,
    public readonly actual?: string,
    line?: number,
    column?: number
  ) {
    super(message, line, column);
    this.name = 'TONLValidationError';
  }

  toString(): string {
    let result = `${this.name}: ${this.message}\n`;
    result += `  Field: ${this.field}`;

    if (this.expected) {
      result += `\n  Expected: ${this.expected}`;
    }

    if (this.actual) {
      result += `\n  Actual: ${this.actual}`;
    }

    if (this.line !== undefined) {
      result += `\n  Location: line ${this.line}`;
      if (this.column !== undefined) {
        result += `:${this.column}`;
      }
    }

    return result;
  }
}

/**
 * Type error - type mismatch errors
 */
export class TONLTypeError extends TONLError {
  constructor(
    message: string,
    public readonly expected: string,
    public readonly actual: string,
    line?: number,
    column?: number,
    source?: string
  ) {
    super(message, line, column, source);
    this.name = 'TONLTypeError';
  }
}

/**
 * Security error - security-related issues
 * Used for ReDoS protection, path traversal, injection attacks, etc.
 */
export class SecurityError extends Error {
  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message);
    this.name = 'SecurityError';
    Error.captureStackTrace(this, this.constructor);
  }

  toString(): string {
    let result = `${this.name}: ${this.message}`;

    if (this.details) {
      result += '\n  Details:';
      for (const [key, value] of Object.entries(this.details)) {
        result += `\n    ${key}: ${JSON.stringify(value)}`;
      }
    }

    return result;
  }
}

/**
 * Helper to format error location
 */
export function formatErrorLocation(
  lines: string[],
  lineNum: number,
  column?: number,
  contextLines: number = 2
): string {
  const result: string[] = [];
  const start = Math.max(0, lineNum - contextLines);
  const end = Math.min(lines.length, lineNum + contextLines + 1);

  for (let i = start; i < end; i++) {
    const lineNumber = i + 1;
    const prefix = i === lineNum ? '>' : ' ';
    const paddedLineNum = String(lineNumber).padStart(4);
    result.push(`${prefix} ${paddedLineNum} | ${lines[i]}`);

    // Add caret indicator
    if (i === lineNum && column !== undefined) {
      const spaces = ' '.repeat(8 + column); // 8 = prefix + line num + " | "
      result.push(`${spaces}^`);
    }
  }

  return result.join('\n');
}
