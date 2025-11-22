/**
 * Enhanced Security Utilities for TONL
 * Backward compatible security validation and protection
 */

import { SecurityError } from '../errors/index.js';

/**
 * Security configuration interface
 */
export interface SecurityLimits {
  MAX_LINE_LENGTH: number;
  MAX_FIELDS_PER_LINE: number;
  MAX_NESTING_DEPTH: number;
  MAX_JSON_SIZE: number;
  MAX_REGEX_PATTERN_LENGTH: number;
  MAX_REGEX_NESTING_DEPTH: number;
}

/**
 * Default security limits
 */
export const DEFAULT_SECURITY_LIMITS: SecurityLimits = {
  MAX_LINE_LENGTH: 100_000,        // 100KB per line
  MAX_FIELDS_PER_LINE: 10_000,     // Maximum fields per line
  MAX_NESTING_DEPTH: 100,          // Maximum nesting levels
  MAX_JSON_SIZE: 10 * 1024 * 1024, // 10MB JSON limit
  MAX_REGEX_PATTERN_LENGTH: 100,   // Maximum regex pattern length
  MAX_REGEX_NESTING_DEPTH: 3,      // Maximum regex nesting depth
};

/**
 * Regex Security Validator
 * Provides enhanced protection against ReDoS attacks
 */
export class RegexValidator {
  private static readonly DANGEROUS_PATTERNS = [
    // Nested quantifiers that cause catastrophic backtracking
    /\(\?\:.*\)\+/g,
    /\(\?\=.*\)/g,
    /\(\?\!.*\)/g,
    /\(\?\:.*\)\*/g,
    /\(\?\:.*\)\?\:/g,

    // Dangerous lookarounds
    /\(\?\=.*\)\+/g,
    /\(\?\!.*\)\*/g,

    // Excessive repetition
    /\*{2,}/g,
    /\+{2,}/g,
    /\?\{2,}/g,
  ];

  private static readonly DANGEROUS_SEQUENCES = [
    '(a+)+',
    '(a*)*',
    '(a+)*',
    '(.+)+',
    '(.*)*',
    '(.+)*',
  ];

  /**
   * Validate regex pattern for security vulnerabilities
   * @param pattern - The regex pattern to validate
   * @param limits - Security limits to apply
   * @throws SecurityError if pattern is dangerous
   */
  static validateRegexPattern(
    pattern: string,
    limits: SecurityLimits = DEFAULT_SECURITY_LIMITS
  ): void {
    // Length validation
    if (pattern.length > limits.MAX_REGEX_PATTERN_LENGTH) {
      throw new SecurityError(
        `Regex pattern too long: ${pattern.length} > ${limits.MAX_REGEX_PATTERN_LENGTH}`
      );
    }

    // Check for dangerous patterns
    for (const dangerous of this.DANGEROUS_PATTERNS) {
      if (dangerous.test(pattern)) {
        throw new SecurityError('Dangerous regex pattern detected: nested quantifiers');
      }
    }

    // Check for dangerous sequences
    for (const sequence of this.DANGEROUS_SEQUENCES) {
      if (pattern.includes(sequence)) {
        throw new SecurityError(
          `Dangerous regex sequence detected: ${sequence}`
        );
      }
    }

    // Check nesting depth
    const nestingDepth = this.calculateNestingDepth(pattern);
    if (nestingDepth > limits.MAX_REGEX_NESTING_DEPTH) {
      throw new SecurityError(
        `Regex nesting depth too high: ${nestingDepth} > ${limits.MAX_REGEX_NESTING_DEPTH}`
      );
    }
  }

  /**
   * Calculate regex pattern nesting depth
   * @param pattern - The regex pattern to analyze
   * @returns The nesting depth
   */
  private static calculateNestingDepth(pattern: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of pattern) {
      if (char === '(') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === ')') {
        currentDepth--;
      }
    }

    return maxDepth;
  }
}

/**
 * Input Security Validator
 * Provides comprehensive input validation
 */
export class InputValidator {
  /**
   * Validate input size and complexity
   * @param input - The input to validate
   * @param limits - Security limits to apply
   * @throws SecurityError if input is too large or complex
   */
  static validateInput(
    input: string,
    limits: SecurityLimits = DEFAULT_SECURITY_LIMITS
  ): void {
    // Length validation
    if (input.length > limits.MAX_JSON_SIZE) {
      throw new SecurityError(
        `Input too large: ${input.length} > ${limits.MAX_JSON_SIZE}`
      );
    }

    // Check for excessively long lines
    const lines = input.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > limits.MAX_LINE_LENGTH) {
        throw new SecurityError(
          `Line ${i + 1} too long: ${line.length} > ${limits.MAX_LINE_LENGTH}`
        );
      }

      // Check field count (estimate by delimiter count)
      const fieldCount = line.split(/[\,\|\t\;]/).length;
      if (fieldCount > limits.MAX_FIELDS_PER_LINE) {
        throw new SecurityError(
          `Line ${i + 1} has too many fields: ${fieldCount} > ${limits.MAX_FIELDS_PER_LINE}`
        );
      }
    }
  }

  /**
   * Validate nesting depth in JSON-like structure
   * @param input - The input to validate
   * @param limits - Security limits to apply
   * @throws SecurityError if nesting is too deep
   */
  static validateNestingDepth(
    input: string,
    limits: SecurityLimits = DEFAULT_SECURITY_LIMITS
  ): void {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of input) {
      if (char === '{' || char === '[') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);

        if (currentDepth > limits.MAX_NESTING_DEPTH) {
          throw new SecurityError(
            `Nesting depth too high: ${currentDepth} > ${limits.MAX_NESTING_DEPTH}`
          );
        }
      } else if (char === '}' || char === ']') {
        currentDepth--;
      }
    }
  }
}

/**
 * Security utilities for safe operations
 */
export class SecurityUtils {
  /**
   * Safe JSON parsing with ReDoS protection
   * @param input - The JSON string to parse
   * @param limits - Security limits to apply
   * @returns Parsed JSON object
   * @throws SecurityError if input is malicious
   */
  static safeJsonParse(
    input: string,
    limits: SecurityLimits = DEFAULT_SECURITY_LIMITS
  ): any {
    // Validate input first
    InputValidator.validateInput(input, limits);
    InputValidator.validateNestingDepth(input, limits);

    try {
      return JSON.parse(input);
    } catch (error) {
      // Check if error might be due to malicious input
      if (error instanceof SyntaxError) {
        // Try to detect if this might be a ReDoS attempt
        const hasComplexRepetition = /(\*|\+|\?|\{)\{[\d,]+,\}/.test(input);
        if (hasComplexRepetition) {
          throw new SecurityError('Potential ReDoS attack detected in JSON input');
        }
      }
      throw error;
    }
  }

  /**
   * Validate file path for security
   * @param path - The file path to validate
   * @throws SecurityError if path is dangerous
   */
  static validateFilePath(path: string): void {
    // Check for path traversal
    if (path.includes('../') || path.includes('..\\')) {
      throw new SecurityError('Path traversal detected');
    }

    // Check for absolute paths (should be configurable)
    if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
      throw new SecurityError('Absolute paths not allowed');
    }

    // Check for null bytes
    if (path.includes('\0')) {
      throw new SecurityError('Null bytes in path');
    }

    // Check for dangerous Windows device names
    const dangerousNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];

    const baseName = path.split(/[\\\/]/).pop()?.toUpperCase() || '';
    if (dangerousNames.includes(baseName)) {
      throw new SecurityError(`Dangerous file name: ${baseName}`);
    }
  }

  /**
   * Sanitize user input for safe processing
   * @param input - The input to sanitize
   * @returns Sanitized input
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[\0]/g, '') // Remove null bytes
      .replace(/[\r\n]/g, ' ') // Replace newlines with spaces
      .trim();
  }
}