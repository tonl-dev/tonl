/**
 * Dictionary encoding for repetitive values
 *
 * Analyzes columns for repetitive values and creates compact dictionaries
 * to reduce token count and byte size.
 */

import type { Dictionary, DictionaryEntry, DictionaryOptions } from './types.js';

/**
 * Default dictionary options
 */
const DEFAULT_DICT_OPTIONS: DictionaryOptions = {
  enabled: true,
  minFrequency: 3,
  minSavings: 10, // Lowered from 100 to handle small datasets
  maxDictSize: 1000,
  encodingStrategy: 'auto'
};

/**
 * Builder for creating value dictionaries
 */
export class DictionaryBuilder {
  private options: DictionaryOptions;

  constructor(options: Partial<DictionaryOptions> = {}) {
    this.options = { ...DEFAULT_DICT_OPTIONS, ...options };
  }

  /**
   * Analyze array column for dictionary candidates
   * Returns null if dictionary wouldn't provide sufficient savings
   */
  analyzeDictionaryCandidates(
    values: any[],
    columnName: string
  ): Dictionary | null {
    if (!this.options.enabled || values.length === 0) {
      return null;
    }

    // Count value frequencies
    const frequencyMap = new Map<string, number>();
    for (const value of values) {
      if (value === null || value === undefined) continue;
      const key = String(value);
      frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
    }

    // Filter values that appear less than minFrequency times
    const candidates = Array.from(frequencyMap.entries())
      .filter(([_, freq]) => freq >= this.options.minFrequency)
      .sort((a, b) => b[1] - a[1]); // Sort by frequency (descending)

    if (candidates.length === 0 || candidates.length > this.options.maxDictSize) {
      return null;
    }

    // Select encoding strategy
    const encoding = this.selectEncodingStrategy(candidates.length);

    // Build dictionary entries
    const entries = new Map<string, DictionaryEntry>();
    let totalSavings = 0;

    // BUG-NEW-006 FIX: Validate candidate structure before destructuring
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (!candidate || candidate.length < 2) {
        continue; // Skip invalid candidates
      }
      const [original, frequency] = candidate;
      const encoded = encoding === 'alpha'
        ? this.numToAlpha(i)
        : String(i + 1);

      const originalBytes = original.length;
      const encodedBytes = encoded.length;
      const savings = (originalBytes - encodedBytes) * frequency;

      entries.set(original, {
        original,
        encoded,
        frequency,
        savings
      });

      totalSavings += savings;
    }

    // Check if total savings meet threshold
    if (totalSavings < this.options.minSavings) {
      return null;
    }

    // Determine dictionary type
    const type = this.determineDictionaryType(candidates.map(c => c[0]));

    return {
      name: columnName,
      entries,
      type,
      encoding,
      totalSavings
    };
  }

  /**
   * Select optimal encoding strategy based on unique value count
   */
  private selectEncodingStrategy(uniqueCount: number): 'numeric' | 'alpha' {
    if (this.options.encodingStrategy === 'numeric') return 'numeric';
    if (this.options.encodingStrategy === 'alpha') return 'alpha';

    // Auto strategy: use alpha for small sets (up to 26), numeric for larger
    return uniqueCount <= 26 ? 'alpha' : 'numeric';
  }

  /**
   * Convert number to alphabetic encoding (0 → A, 1 → B, ..., 25 → Z, 26 → AA, ...)
   * Robust implementation that handles any number of entries up to maxDictSize
   */
  private numToAlpha(num: number): string {
    let s = '';
    let t;

    while (num >= 0) {
      t = num % 26;
      s = String.fromCharCode(65 + t) + s;
      num = Math.floor(num / 26) - 1;
    }
    return s;
  }

  /**
   * Determine dictionary type based on original values
   */
  private determineDictionaryType(values: string[]): 'string' | 'number' | 'mixed' {
    let hasString = false;
    let hasNumber = false;

    for (const value of values) {
      if (/^\d+(\.\d+)?$/.test(value)) {
        hasNumber = true;
      } else {
        hasString = true;
      }

      if (hasString && hasNumber) {
        return 'mixed';
      }
    }

    return hasNumber ? 'number' : 'string';
  }

  /**
   * Build dictionary from column values
   */
  buildDictionary(
    values: any[],
    columnName: string
  ): Dictionary | null {
    return this.analyzeDictionaryCandidates(values, columnName);
  }

  /**
   * Encode values using dictionary
   */
  encodeWithDictionary(
    values: any[],
    dictionary: Dictionary
  ): (string | number)[] {
    return values.map(value => {
      if (value === null || value === undefined) {
        return value;
      }

      const key = String(value);
      const entry = dictionary.entries.get(key);

      return entry ? entry.encoded : value;
    });
  }

  /**
   * Generate TONL dictionary directive
   *
   * Format: @dict columnName: {encoded:original, ...}
   * Example: @dict role: {1:admin,2:user,3:editor}
   */
  generateDictionaryDirective(dictionary: Dictionary): string {
    const mappings: string[] = [];

    // Sort entries by encoded value for consistent output
    const sortedEntries = Array.from(dictionary.entries.values())
      .sort((a, b) => {
        const aVal = String(a.encoded);
        const bVal = String(b.encoded);
        return aVal.localeCompare(bVal);
      });

    for (const entry of sortedEntries) {
      const encoded = entry.encoded;
      const original = entry.original;

      // Quote original value if it contains special characters
      const needsQuoting = original.includes(',') ||
                          original.includes(':') ||
                          original.includes('{') ||
                          original.includes('}');

      const quotedOriginal = needsQuoting ? `"${original.replace(/"/g, '""')}"` : original;

      mappings.push(`${encoded}:${quotedOriginal}`);
    }

    return `@dict ${dictionary.name}: {${mappings.join(',')}}`;
  }

  /**
   * Analyze multiple columns and build dictionaries for all eligible columns
   */
  analyzeAllColumns(
    data: any[],
    columns: string[]
  ): Map<string, Dictionary> {
    const dictionaries = new Map<string, Dictionary>();

    for (const column of columns) {
      const values = data.map(item => item[column]);
      const dictionary = this.buildDictionary(values, column);

      if (dictionary) {
        dictionaries.set(column, dictionary);
      }
    }

    return dictionaries;
  }
}

/**
 * Decoder for dictionary-encoded values
 */
export class DictionaryDecoder {
  private dictionaries: Map<string, Map<string | number, string>>;

  constructor() {
    this.dictionaries = new Map();
  }

  /**
   * Parse dictionary directive and store mapping
   *
   * Format: @dict columnName: {encoded:original, ...}
   */
  parseDictionaryDirective(directive: string): void {
    // Remove @dict prefix and trim
    const content = directive.replace(/^@dict\s+/, '').trim();

    // Extract column name and mapping
    const colonIndex = content.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid dictionary directive: ${directive}`);
    }

    const columnName = content.substring(0, colonIndex).trim();
    const mappingContent = content.substring(colonIndex + 1).trim();

    // Extract content between braces
    const braceMatch = mappingContent.match(/^\{(.+)\}$/);
    if (!braceMatch) {
      throw new Error(`Invalid dictionary mapping format: ${mappingContent}`);
    }

    const mappings = this.parseDictionaryMappings(braceMatch[1]);
    this.dictionaries.set(columnName, mappings);
  }

  /**
   * Parse dictionary mappings (key:value pairs)
   */
  private parseDictionaryMappings(content: string): Map<string | number, string> {
    const mappings = new Map<string | number, string>();
    let current = '';
    let inQuote = false;
    let key = '';
    let parsingKey = true;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuote = !inQuote;
        }
      } else if (char === ':' && !inQuote && parsingKey) {
        key = current.trim();
        current = '';
        parsingKey = false;
      } else if (char === ',' && !inQuote) {
        const value = current.trim();
        // Remove quotes if present
        const cleanValue = value.startsWith('"') && value.endsWith('"')
          ? value.slice(1, -1).replace(/""/g, '"')
          : value;

        mappings.set(key, cleanValue);
        current = '';
        key = '';
        parsingKey = true;
      } else {
        current += char;
      }
    }

    // Add last mapping
    if (key && current) {
      const value = current.trim();
      const cleanValue = value.startsWith('"') && value.endsWith('"')
        ? value.slice(1, -1).replace(/""/g, '"')
        : value;

      mappings.set(key, cleanValue);
    }

    return mappings;
  }

  /**
   * Decode a value using the column's dictionary
   */
  decode(columnName: string, encodedValue: string | number): any {
    const dictionary = this.dictionaries.get(columnName);
    if (!dictionary) {
      return encodedValue; // No dictionary for this column
    }

    // Try both as-is and as string (handles numeric keys)
    let decodedValue = dictionary.get(encodedValue);
    if (decodedValue === undefined && typeof encodedValue === 'number') {
      decodedValue = dictionary.get(String(encodedValue));
    }

    return decodedValue !== undefined ? decodedValue : encodedValue;
  }

  /**
   * Check if a column has a dictionary
   */
  hasDictionary(columnName: string): boolean {
    return this.dictionaries.has(columnName);
  }

  /**
   * Get all dictionary column names
   */
  getDictionaryColumns(): string[] {
    return Array.from(this.dictionaries.keys());
  }

  /**
   * Clear all dictionaries
   */
  clear(): void {
    this.dictionaries.clear();
  }
}
