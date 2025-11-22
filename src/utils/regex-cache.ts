/**
 * Regex Cache Utility
 * Provides caching for compiled regex patterns to improve performance
 * Backward compatible optimization
 */

/**
 * Thread-safe regex pattern cache
 */
export class RegexCache {
  private static cache = new Map<string, RegExp>();

  /**
   * Get or create a compiled regex pattern
   * @param pattern - The regex pattern string
   * @param flags - Optional regex flags
   * @returns Compiled RegExp instance
   */
  static getPattern(pattern: string, flags?: string): RegExp {
    const key = `${pattern}:${flags || ''}`;

    if (!this.cache.has(key)) {
      this.cache.set(key, new RegExp(pattern, flags));
    }

    return this.cache.get(key)!;
  }

  /**
   * Clear the entire cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns Cache size and statistics
   */
  static getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Check if a pattern is cached
   * @param pattern - The regex pattern string
   * @param flags - Optional regex flags
   * @returns True if pattern is cached
   */
  static hasPattern(pattern: string, flags?: string): boolean {
    const key = `${pattern}:${flags || ''}`;
    return this.cache.has(key);
  }

  /**
   * Pre-cache common patterns for better performance
   */
  static precacheCommonPatterns(): void {
    const commonPatterns = [
      { pattern: /\s+/g, flags: 'g' },
      { pattern: /^\s+|\s+$/g, flags: 'g' },
      { pattern: /\r\n/g, flags: 'g' },
      { pattern: /[,:]/g, flags: 'g' },
      { pattern: /\t/g, flags: 'g' },
      { pattern: /^\s*[\[\{]/, flags: '' },
      { pattern: /^".*"$/, flags: '' },
      { pattern: /^'.*'$/, flags: '' },
      { pattern: /^\d+$/, flags: '' },
      { pattern: /^[+-]?\d*\.?\d+$/, flags: '' },
    ];

    commonPatterns.forEach(({ pattern, flags }) => {
      this.getPattern(pattern.source, flags);
    });
  }
}