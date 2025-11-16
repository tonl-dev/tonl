/**
 * Bit Packing - Efficient bit-level compression for boolean and small integers
 *
 * Packs boolean values and small integers (0-255) into compact bit representations
 * to minimize token usage. Particularly effective for flags, status codes, and
 * categorical data with limited value ranges.
 *
 * Features:
 * - Boolean packing: 8 booleans per byte (87.5% savings)
 * - Small integer packing: Multiple values per token
 * - Automatic bit width detection
 * - Run-length encoding integration
 * - Efficient encoding/decoding
 *
 * Example:
 * Original:  [true, false, true, true, false, false, true, false]
 * Packed:    [0b10110010] = "178"
 * Savings:   ~85% token reduction
 */

import type { BitPackOptions } from './types.js';

/**
 * Default bit packing options
 */
const DEFAULT_BITPACK_OPTIONS: BitPackOptions = {
  enabled: true,
  packBooleans: true,
  packSmallIntegers: true,
  maxIntValue: 255,        // Pack integers 0-255 (8 bits)
  minPackSize: 4           // Minimum values to pack
};

/**
 * Bit packing analysis result
 */
export interface BitPackAnalysis {
  valueCount: number;
  dataType: 'boolean' | 'small-int' | 'mixed' | 'unsupported';
  bitWidth: number;           // Bits needed per value
  packedSize: number;         // Bytes after packing
  originalSize: number;       // Bytes before packing
  compressionRatio: number;   // Savings ratio (0-1)
  recommended: boolean;
  minValue?: number;
  maxValue?: number;
}

/**
 * Bit packer for boolean and small integer values
 */
export class BitPacker {
  private options: BitPackOptions;

  constructor(options: Partial<BitPackOptions> = {}) {
    this.options = {
      ...DEFAULT_BITPACK_OPTIONS,
      ...options
    };
  }

  /**
   * Analyze values for bit packing suitability
   *
   * @param values - Array of values
   * @returns Analysis with recommendations
   */
  analyzeValues(values: any[]): BitPackAnalysis {
    if (values.length === 0) {
      return {
        valueCount: 0,
        dataType: 'unsupported',
        bitWidth: 0,
        packedSize: 0,
        originalSize: 0,
        compressionRatio: 0,
        recommended: false
      };
    }

    // Detect data type
    const allBooleans = values.every(v => typeof v === 'boolean');
    const allNumbers = values.every(v => typeof v === 'number' && Number.isInteger(v));

    let dataType: 'boolean' | 'small-int' | 'mixed' | 'unsupported';
    let bitWidth = 0;
    let minValue = 0;
    let maxValue = 0;

    if (allBooleans) {
      dataType = 'boolean';
      bitWidth = 1;
    } else if (allNumbers) {
      const numValues = values as number[];
      minValue = Math.min(...numValues);
      maxValue = Math.max(...numValues);

      // Check if values fit in small integer range
      if (minValue >= 0 && maxValue <= this.options.maxIntValue) {
        dataType = 'small-int';
        // Calculate minimum bit width needed
        bitWidth = Math.ceil(Math.log2(maxValue + 1));
      } else {
        dataType = 'unsupported';
      }
    } else {
      dataType = 'mixed';
    }

    // Calculate sizes
    const originalSize = values.reduce((sum, v) => sum + String(v).length, 0);
    const packedSize = Math.ceil((values.length * bitWidth) / 8);

    const compressionRatio = originalSize > 0 ? (originalSize - packedSize) / originalSize : 0;

    // Recommend if:
    // 1. Data type is supported
    // 2. Has enough values to pack
    // 3. Provides meaningful compression
    const recommended =
      (dataType === 'boolean' || dataType === 'small-int') &&
      values.length >= this.options.minPackSize &&
      compressionRatio > 0.3; // At least 30% savings

    return {
      valueCount: values.length,
      dataType,
      bitWidth,
      packedSize,
      originalSize,
      compressionRatio,
      recommended,
      minValue: allNumbers ? minValue : undefined,
      maxValue: allNumbers ? maxValue : undefined
    };
  }

  /**
   * Pack boolean values into compact bit representation
   *
   * @param values - Array of boolean values
   * @returns Packed values as byte array
   */
  packBooleans(values: boolean[]): number[] {
    if (!this.options.enabled || !this.options.packBooleans) {
      throw new Error('Boolean packing is disabled');
    }

    const packed: number[] = [];
    let currentByte = 0;
    let bitPosition = 0;

    for (const value of values) {
      if (value) {
        currentByte |= (1 << bitPosition);
      }

      bitPosition++;

      if (bitPosition === 8) {
        packed.push(currentByte);
        currentByte = 0;
        bitPosition = 0;
      }
    }

    // Add remaining bits if any
    if (bitPosition > 0) {
      packed.push(currentByte);
    }

    return packed;
  }

  /**
   * Unpack boolean values from bit representation
   *
   * @param packed - Packed byte array
   * @param count - Number of boolean values
   * @returns Unpacked boolean array
   */
  unpackBooleans(packed: number[], count: number): boolean[] {
    const result: boolean[] = [];
    let valueIndex = 0;

    for (const byte of packed) {
      for (let bitPosition = 0; bitPosition < 8 && valueIndex < count; bitPosition++) {
        result.push((byte & (1 << bitPosition)) !== 0);
        valueIndex++;
      }
    }

    return result;
  }

  /**
   * Pack small integers into compact bit representation
   *
   * @param values - Array of integers (0 to maxIntValue)
   * @param bitWidth - Bits per value (optional, auto-detected if not provided)
   * @returns Packed values as byte array
   */
  packIntegers(values: number[], bitWidth?: number): number[] {
    if (!this.options.enabled || !this.options.packSmallIntegers) {
      throw new Error('Integer packing is disabled');
    }

    // BUG-NEW-012 FIX: Guard against empty values array
    // Math.max(...[]) returns -Infinity and Math.min(...[]) returns Infinity
    if (values.length === 0) {
      throw new Error('Cannot pack empty array');
    }

    // Validate values
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    if (minValue < 0 || maxValue > this.options.maxIntValue) {
      throw new Error(`Values out of range (0-${this.options.maxIntValue}): ${minValue}-${maxValue}`);
    }

    // Auto-detect bit width if not provided
    if (!bitWidth) {
      bitWidth = Math.ceil(Math.log2(maxValue + 1));
    }

    const packed: number[] = [];
    let buffer = 0;
    let bitsInBuffer = 0;

    for (const value of values) {
      buffer = (buffer << bitWidth) | value;
      bitsInBuffer += bitWidth;

      while (bitsInBuffer >= 8) {
        bitsInBuffer -= 8;
        const byte = (buffer >> bitsInBuffer) & 0xFF;
        packed.push(byte);
        buffer &= (1 << bitsInBuffer) - 1;
      }
    }

    // Flush remaining bits
    if (bitsInBuffer > 0) {
      packed.push((buffer << (8 - bitsInBuffer)) & 0xFF);
    }

    return packed;
  }

  /**
   * Unpack small integers from bit representation
   *
   * @param packed - Packed byte array
   * @param count - Number of integer values
   * @param bitWidth - Bits per value
   * @returns Unpacked integer array
   */
  unpackIntegers(packed: number[], count: number, bitWidth: number): number[] {
    // Guard against infinite loop when bitWidth is 0
    if (bitWidth === 0) {
      return Array(count).fill(0);
    }

    const result: number[] = [];
    let buffer = 0;
    let bitsInBuffer = 0;
    let packedIndex = 0;

    while (result.length < count) {
      // Fill buffer if needed
      while (bitsInBuffer < bitWidth && packedIndex < packed.length) {
        buffer = (buffer << 8) | packed[packedIndex++];
        bitsInBuffer += 8;
      }

      // Extract value if we have enough bits
      if (bitsInBuffer >= bitWidth) {
        bitsInBuffer -= bitWidth;
        const value = (buffer >> bitsInBuffer) & ((1 << bitWidth) - 1);
        result.push(value);
        buffer &= (1 << bitsInBuffer) - 1;
      } else {
        // Not enough bits and no more packed bytes
        break;
      }
    }

    return result;
  }

  /**
   * Encode packed values to TONL-compatible string format
   *
   * Formats:
   * - Boolean: "b:178,255,..." (b: prefix + comma-separated bytes)
   * - Integer: "i4:178,255,..." (i{bitWidth}: prefix + comma-separated bytes)
   *
   * @param packed - Packed byte array
   * @param bitWidth - Bits per value (1 for boolean, n for integers)
   * @returns TONL-compatible string
   */
  encodeToString(packed: number[], bitWidth: number): string {
    const prefix = bitWidth === 1 ? 'b' : `i${bitWidth}`;
    const bytes = packed.join(',');
    return `${prefix}:${bytes}`;
  }

  /**
   * Decode TONL-compatible string to packed values
   *
   * @param encoded - Encoded string (e.g., "b:178,255" or "i4:178,255")
   * @returns Packed byte array and bit width
   */
  decodeFromString(encoded: string): { packed: number[]; bitWidth: number } {
    const match = encoded.match(/^([bi])(\d*):(.+)$/);

    if (!match) {
      throw new Error(`Invalid bit-packed format: ${encoded}`);
    }

    const [, type, widthStr, bytesStr] = match;
    const bitWidth = type === 'b' ? 1 : parseInt(widthStr, 10);

    // Validate bit width for integer types
    if (type === 'i' && isNaN(bitWidth)) {
      throw new Error(`Invalid bit-packed format: missing or invalid bit width for integer type: ${encoded}`);
    }

    const packed = bytesStr.split(',').map(s => parseInt(s.trim(), 10));

    // Validate byte values
    if (packed.some(n => !Number.isFinite(n) || n < 0 || n > 255)) {
      throw new Error(`Invalid byte values in: ${encoded}`);
    }

    return { packed, bitWidth };
  }

  /**
   * Generate bit packing directive
   *
   * Format: @bitpack columnName {bitWidth} {count}
   *
   * @param columnName - Column name
   * @param bitWidth - Bits per value
   * @param count - Number of values
   * @returns TONL directive string
   */
  generateDirective(columnName: string, bitWidth: number, count: number): string {
    return `@bitpack ${columnName} ${bitWidth} ${count}`;
  }

  /**
   * Parse bit packing directive
   *
   * @param directive - TONL directive like "@bitpack flags 1 100"
   * @returns Parsed directive info
   */
  parseDirective(directive: string): { columnName: string; bitWidth: number; count: number } {
    const match = directive.match(/^@bitpack\s+(\S+)\s+(\d+)\s+(\d+)$/);

    if (!match) {
      throw new Error(`Invalid bitpack directive: ${directive}`);
    }

    const [, columnName, bitWidthStr, countStr] = match;
    const bitWidth = parseInt(bitWidthStr, 10);
    const count = parseInt(countStr, 10);

    if (bitWidth < 1 || bitWidth > 32) {
      throw new Error(`Invalid bit width: ${bitWidth} (must be 1-32)`);
    }

    if (count < 1) {
      throw new Error(`Invalid count: ${count}`);
    }

    return { columnName, bitWidth, count };
  }

  /**
   * Check if bit packing would be beneficial
   *
   * @param values - Values to analyze
   * @param minCompressionRatio - Minimum compression ratio (default: 0.3 = 30%)
   * @returns True if packing is recommended
   */
  shouldPack(values: any[], minCompressionRatio: number = 0.3): boolean {
    if (!this.options.enabled) {
      return false;
    }

    const analysis = this.analyzeValues(values);
    return analysis.recommended && analysis.compressionRatio >= minCompressionRatio;
  }

  /**
   * Smart pack - automatically analyze and pack if beneficial
   *
   * @param values - Array of values
   * @returns Encoded string or null if packing not beneficial
   */
  smartPack(values: any[]): string | null {
    const analysis = this.analyzeValues(values);

    if (!analysis.recommended) {
      return null;
    }

    if (analysis.dataType === 'boolean') {
      const packed = this.packBooleans(values as boolean[]);
      return this.encodeToString(packed, 1);
    }

    if (analysis.dataType === 'small-int') {
      const packed = this.packIntegers(values as number[], analysis.bitWidth);
      return this.encodeToString(packed, analysis.bitWidth);
    }

    return null;
  }

  /**
   * Smart unpack - decode from string format
   *
   * @param encoded - Encoded string
   * @param count - Expected number of values
   * @returns Unpacked values
   */
  smartUnpack(encoded: string, count: number): (boolean | number)[] {
    const { packed, bitWidth } = this.decodeFromString(encoded);

    if (bitWidth === 1) {
      return this.unpackBooleans(packed, count);
    }

    return this.unpackIntegers(packed, count, bitWidth);
  }

  /**
   * Estimate byte savings from bit packing
   *
   * @param values - Original values
   * @returns Estimated bytes saved
   */
  estimateSavings(values: any[]): number {
    const analysis = this.analyzeValues(values);
    return Math.max(0, analysis.originalSize - analysis.packedSize);
  }
}

/**
 * Bit pack decoder for restoring original values
 */
export class BitPackDecoder {
  private bitpackColumns: Map<string, { bitWidth: number; count: number }> = new Map();

  /**
   * Parse and register bit pack directive
   *
   * @param directive - TONL directive like "@bitpack flags 1 100"
   */
  parseDirective(directive: string): void {
    const match = directive.match(/^@bitpack\s+(\S+)\s+(\d+)\s+(\d+)$/);

    if (!match) {
      throw new Error(`Invalid bitpack directive: ${directive}`);
    }

    const [, columnName, bitWidthStr, countStr] = match;
    const bitWidth = parseInt(bitWidthStr, 10);
    const count = parseInt(countStr, 10);

    this.bitpackColumns.set(columnName, { bitWidth, count });
  }

  /**
   * Check if a column is bit-packed
   *
   * @param columnName - Column name
   * @returns True if column is bit-packed
   */
  isBitPacked(columnName: string): boolean {
    return this.bitpackColumns.has(columnName);
  }

  /**
   * Decode bit-packed column
   *
   * @param columnName - Column name
   * @param encoded - Encoded string
   * @returns Decoded values
   */
  decode(columnName: string, encoded: string): (boolean | number)[] {
    const info = this.bitpackColumns.get(columnName);

    if (!info) {
      throw new Error(`Column not bit-packed: ${columnName}`);
    }

    const packer = new BitPacker();
    return packer.smartUnpack(encoded, info.count);
  }

  /**
   * Get all bit-packed column names
   *
   * @returns Array of column names
   */
  getBitPackedColumns(): string[] {
    return Array.from(this.bitpackColumns.keys());
  }

  /**
   * Clear all directives
   */
  clear(): void {
    this.bitpackColumns.clear();
  }
}
