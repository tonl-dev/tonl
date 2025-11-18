/**
 * Schema Inheritance - Reduce repetition by defining schemas once
 *
 * Allows defining column schemas once and referencing them in subsequent blocks.
 * Particularly effective for datasets with consistent structure across multiple
 * sections or time periods.
 *
 * Features:
 * - Schema definition and reuse
 * - Automatic schema detection from data
 * - Schema versioning for evolution
 * - Partial schema inheritance
 * - Schema composition and extension
 *
 * Example:
 * ```
 * @schema user_v1: id:number, name:string, email:string, active:boolean
 * @use user_v1
 *
 * # Users Block 1
 * id,name,email,active
 * 1,Alice,alice@example.com,true
 *
 * @use user_v1
 * # Users Block 2 (inherits schema, no need to repeat column names)
 * 2,Bob,bob@example.com,false
 * ```
 *
 * Token Savings: 20-40% for datasets with multiple similar blocks
 */

import type { SchemaInheritOptions } from './types.js';

/**
 * Default schema inheritance options
 */
const DEFAULT_SCHEMA_INHERIT_OPTIONS: SchemaInheritOptions = {
  enabled: true,
  autoDetect: true,          // Automatically detect reusable schemas
  minBlockCount: 2,          // Minimum blocks to justify schema creation
  allowPartial: true,        // Allow partial schema inheritance
  versionSchemas: true       // Enable schema versioning
};

/**
 * Column schema definition
 */
export interface ColumnSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object' | 'mixed';
  nullable?: boolean;
  defaultValue?: any;
  format?: string;           // e.g., "date", "email", "url"
}

/**
 * Complete schema definition
 */
export interface Schema {
  name: string;              // Schema identifier (e.g., "user_v1")
  version: number;           // Schema version
  columns: ColumnSchema[];
  description?: string;
  createdAt?: Date;
  inheritsFrom?: string;     // Parent schema name
}

/**
 * Schema analysis result
 */
export interface SchemaAnalysis {
  schemaName: string;
  similarity: number;        // 0-1, how similar structures are
  commonColumns: string[];
  uniqueColumns: string[];
  recommended: boolean;
  estimatedSavings: number;  // Percentage
}

/**
 * Schema inheritance manager
 */
export class SchemaInheritance {
  private options: SchemaInheritOptions;
  private schemas: Map<string, Schema> = new Map();
  private schemaUsageCount: Map<string, number> = new Map();

  constructor(options: Partial<SchemaInheritOptions> = {}) {
    this.options = {
      ...DEFAULT_SCHEMA_INHERIT_OPTIONS,
      ...options
    };
  }

  /**
   * Infer schema from data
   *
   * @param data - Array of row objects
   * @param schemaName - Name for the schema
   * @returns Inferred schema
   */
  inferSchema(data: any[], schemaName: string): Schema {
    if (data.length === 0) {
      return {
        name: schemaName,
        version: 1,
        columns: []
      };
    }

    // Get all column names from first row
    const firstRow = data[0];
    const columnNames = Object.keys(firstRow);

    // Infer type for each column by sampling values
    const columns: ColumnSchema[] = columnNames.map(name => {
      const values = data.map(row => row[name]).filter(v => v !== null && v !== undefined);
      const type = this.inferColumnType(values);
      const nullable = data.some(row => row[name] === null || row[name] === undefined);

      return {
        name,
        type,
        nullable
      };
    });

    return {
      name: schemaName,
      version: 1,
      columns
    };
  }

  /**
   * Infer column type from values
   *
   * @param values - Sample values
   * @returns Inferred type
   */
  private inferColumnType(values: any[]): ColumnSchema['type'] {
    if (values.length === 0) return 'null';

    const types = new Set(values.map(v => {
      if (v === null || v === undefined) return 'null';
      if (typeof v === 'boolean') return 'boolean';
      if (typeof v === 'number') return 'number';
      if (typeof v === 'string') return 'string';
      if (Array.isArray(v)) return 'array';
      if (typeof v === 'object') return 'object';
      return 'mixed';
    }));

    if (types.size === 1) {
      return Array.from(types)[0] as ColumnSchema['type'];
    }

    // Mixed types - check if it's nullable single type
    types.delete('null');
    if (types.size === 1) {
      return Array.from(types)[0] as ColumnSchema['type'];
    }

    return 'mixed';
  }

  /**
   * Register a schema
   *
   * @param schema - Schema to register
   */
  registerSchema(schema: Schema): void {
    this.schemas.set(schema.name, schema);
    this.schemaUsageCount.set(schema.name, 0);
  }

  /**
   * Get schema by name
   *
   * @param schemaName - Schema name
   * @returns Schema or undefined
   */
  getSchema(schemaName: string): Schema | undefined {
    return this.schemas.get(schemaName);
  }

  /**
   * Analyze similarity between two datasets
   *
   * @param data1 - First dataset
   * @param data2 - Second dataset
   * @returns Analysis result
   */
  analyzeSimilarity(data1: any[], data2: any[]): SchemaAnalysis {
    if (data1.length === 0 || data2.length === 0) {
      return {
        schemaName: 'unknown',
        similarity: 0,
        commonColumns: [],
        uniqueColumns: [],
        recommended: false,
        estimatedSavings: 0
      };
    }

    const cols1 = new Set(Object.keys(data1[0]));
    const cols2 = new Set(Object.keys(data2[0]));

    const commonColumns = Array.from(cols1).filter(c => cols2.has(c));
    const uniqueColumns = [
      ...Array.from(cols1).filter(c => !cols2.has(c)),
      ...Array.from(cols2).filter(c => !cols1.has(c))
    ];

    const totalColumns = cols1.size + cols2.size - commonColumns.length;

    // BUG-NEW-010 FIX: Guard against division by zero when totalColumns = 0
    // This can happen when both data1[0] and data2[0] are empty objects: {}
    const similarity = totalColumns === 0 ? 0 : commonColumns.length / totalColumns;

    // Guard against division by zero when no common columns
    if (commonColumns.length === 0) {
      return {
        schemaName: `schema_${Date.now()}`,
        similarity: 0,
        commonColumns: [],
        uniqueColumns,
        recommended: false,
        estimatedSavings: 0
      };
    }

    // Estimate savings: if we define schema once, we save column definitions
    // For each subsequent block: save ~(column_count * avg_column_name_length) bytes
    // BUG-NEW-007 FIX: Add try-catch and validation for JSON.stringify
    const avgColumnNameLength = commonColumns.reduce((sum, name) => sum + name.length, 0) / commonColumns.length;

    let data1Size: number;
    try {
      const jsonStr = JSON.stringify(data1[0]);
      data1Size = jsonStr.length;
    } catch {
      data1Size = 100; // Fallback estimate if stringify fails
    }

    const savingsPerBlock = data1Size > 0
      ? (commonColumns.length * avgColumnNameLength) / data1Size
      : 0;
    const estimatedSavings = Math.round(savingsPerBlock * 100);

    return {
      schemaName: `schema_${Date.now()}`,
      similarity,
      commonColumns,
      uniqueColumns,
      recommended: similarity > 0.7 && commonColumns.length >= 3,
      estimatedSavings
    };
  }

  /**
   * Create schema from dataset and auto-name
   *
   * @param data - Dataset
   * @param baseName - Base name for schema
   * @returns Created schema
   */
  createSchemaFromData(data: any[], baseName: string = 'schema'): Schema {
    const schemaName = `${baseName}_v1`;
    const schema = this.inferSchema(data, schemaName);
    this.registerSchema(schema);
    return schema;
  }

  /**
   * Extend existing schema
   *
   * @param baseSchemaName - Base schema to extend
   * @param additionalColumns - Additional columns
   * @param newSchemaName - Name for new schema
   * @returns Extended schema
   */
  extendSchema(
    baseSchemaName: string,
    additionalColumns: ColumnSchema[],
    newSchemaName: string
  ): Schema {
    const baseSchema = this.schemas.get(baseSchemaName);
    if (!baseSchema) {
      throw new Error(`Schema not found: ${baseSchemaName}`);
    }

    const extendedSchema: Schema = {
      name: newSchemaName,
      version: 1,
      columns: [...baseSchema.columns, ...additionalColumns],
      inheritsFrom: baseSchemaName
    };

    this.registerSchema(extendedSchema);
    return extendedSchema;
  }

  /**
   * Generate TONL schema directive
   *
   * Format: @schema schemaName: col1:type1, col2:type2, ...
   *
   * @param schema - Schema to encode
   * @returns TONL directive string
   */
  generateSchemaDirective(schema: Schema): string {
    const columnDefs = schema.columns.map(col => {
      let def = `${col.name}:${col.type}`;
      if (col.nullable) {
        def += '?';
      }
      return def;
    }).join(', ');

    return `@schema ${schema.name}: ${columnDefs}`;
  }

  /**
   * Generate schema usage directive
   *
   * Format: @use schemaName
   *
   * @param schemaName - Schema to use
   * @returns TONL directive string
   */
  generateUseDirective(schemaName: string): string {
    // Track usage
    const currentCount = this.schemaUsageCount.get(schemaName) || 0;
    this.schemaUsageCount.set(schemaName, currentCount + 1);

    return `@use ${schemaName}`;
  }

  /**
   * Parse schema directive
   *
   * @param directive - Schema directive like "@schema user_v1: id:number, name:string"
   * @returns Parsed schema
   */
  parseSchemaDirective(directive: string): Schema {
    const match = directive.match(/^@schema\s+(\S+):\s*(.+)$/);
    if (!match) {
      throw new Error(`Invalid schema directive: ${directive}`);
    }

    const [, schemaName, columnDefs] = match;
    const columnParts = columnDefs.split(',').map(s => s.trim());

    const columns: ColumnSchema[] = columnParts.map(part => {
      // Allow more flexible column names (hyphens, dots, etc.) not just \w+
      const colMatch = part.match(/^([^:]+):(\w+)(\?)?$/);
      if (!colMatch) {
        throw new Error(`Invalid column definition: ${part}`);
      }

      const [, rawName, type, nullable] = colMatch;
      const name = rawName.trim(); // Trim the column name

      // Validate type
      const validTypes = ['string', 'number', 'boolean', 'null', 'array', 'object', 'mixed'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid column type: ${type}`);
      }

      return {
        name,
        type: type as ColumnSchema['type'],
        nullable: nullable === '?'
      };
    });

    const schema: Schema = {
      name: schemaName,
      version: 1,
      columns
    };

    this.registerSchema(schema);
    return schema;
  }

  /**
   * Parse use directive
   *
   * @param directive - Use directive like "@use user_v1"
   * @returns Schema name
   */
  parseUseDirective(directive: string): string {
    const match = directive.match(/^@use\s+(\S+)$/);
    if (!match) {
      throw new Error(`Invalid use directive: ${directive}`);
    }

    const schemaName = match[1];
    if (!this.schemas.has(schemaName)) {
      throw new Error(`Schema not found: ${schemaName}`);
    }

    return schemaName;
  }

  /**
   * Apply schema to data (validate and fill defaults)
   *
   * @param data - Data rows
   * @param schemaName - Schema to apply
   * @returns Validated data
   */
  applySchema(data: any[], schemaName: string): any[] {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaName}`);
    }

    return data.map((row, index) => {
      const validatedRow: any = {};

      for (const col of schema.columns) {
        const value = row[col.name];

        // Check nullable
        if ((value === null || value === undefined) && !col.nullable) {
          if (col.defaultValue !== undefined) {
            validatedRow[col.name] = col.defaultValue;
          } else {
            throw new Error(`Null value for non-nullable column "${col.name}" at row ${index}`);
          }
        } else {
          validatedRow[col.name] = value;
        }
      }

      return validatedRow;
    });
  }

  /**
   * Find best matching schema for data
   *
   * @param data - Dataset
   * @returns Best matching schema name or null
   */
  findMatchingSchema(data: any[]): string | null {
    if (data.length === 0) return null;

    const dataColumns = new Set(Object.keys(data[0]));
    let bestMatch: { name: string; score: number } | null = null;

    for (const [name, schema] of this.schemas) {
      const schemaColumns = new Set(schema.columns.map(c => c.name));

      // Calculate match score (Jaccard similarity)
      const intersection = new Set([...dataColumns].filter(c => schemaColumns.has(c)));
      const union = new Set([...dataColumns, ...schemaColumns]);

      // BUG-NEW-011 FIX: Guard against division by zero when union.size = 0
      // This can happen when both data[0] and schema have no columns (empty objects)
      const score = union.size === 0 ? 0 : intersection.size / union.size;

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { name, score };
      }
    }

    // Only return match if similarity is high enough
    return (bestMatch && bestMatch.score >= 0.8) ? bestMatch.name : null;
  }

  /**
   * Estimate savings from using schema inheritance
   *
   * @param blocks - Array of data blocks
   * @returns Estimated byte savings
   */
  estimateSavings(blocks: any[][]): number {
    if (blocks.length < this.options.minBlockCount) {
      return 0;
    }

    // Check if blocks are empty
    const nonEmptyBlocks = blocks.filter(b => b.length > 0);
    if (nonEmptyBlocks.length === 0) return 0;

    // Calculate size without schema inheritance
    // Each block needs full column headers
    let originalSize = 0;
    for (const block of nonEmptyBlocks) {
      const columnNames = Object.keys(block[0]);
      originalSize += columnNames.join(',').length + columnNames.length; // Headers + commas
    }

    // Calculate size with schema inheritance
    // Schema definition once + @use directives for subsequent blocks
    const firstBlock = nonEmptyBlocks[0];
    const columnNames = Object.keys(firstBlock[0]);

    // Schema directive: "@schema name: col1:type, col2:type"
    const schemaName = 'schema_v1'; // ~10 bytes
    const schemaDefSize = 8 + schemaName.length + 2 + // "@schema " + name + ": "
                         columnNames.map(c => c.length + 7).reduce((a, b) => a + b, 0); // col:string

    // Use directive for each subsequent block: "@use schema_v1"
    const useDirectiveSize = 6 + schemaName.length; // "@use " + name

    const withSchemaSize = schemaDefSize + (nonEmptyBlocks.length - 1) * useDirectiveSize;

    return Math.max(0, originalSize - withSchemaSize);
  }

  /**
   * Get all registered schemas
   *
   * @returns Array of schema names
   */
  getSchemaNames(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get schema usage statistics
   *
   * @returns Map of schema name to usage count
   */
  getUsageStats(): Map<string, number> {
    return new Map(this.schemaUsageCount);
  }

  /**
   * Clear all schemas
   */
  clear(): void {
    this.schemas.clear();
    this.schemaUsageCount.clear();
  }

  /**
   * Check if schema inheritance would be beneficial
   *
   * @param blocks - Data blocks to analyze
   * @returns True if recommended
   */
  shouldUseInheritance(blocks: any[][]): boolean {
    if (!this.options.enabled) return false;
    if (blocks.length < this.options.minBlockCount) return false;

    // Check if blocks have similar structure
    if (blocks.length >= 2) {
      const analysis = this.analyzeSimilarity(blocks[0], blocks[1]);
      return analysis.recommended;
    }

    return false;
  }
}
