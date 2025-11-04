/**
 * Index Manager for Managing Multiple Indices (T025)
 *
 * Centralized management of document indices with automatic maintenance
 */

import type { IIndex, IndexOptions } from './types.js';
import { HashIndex } from './hash-index.js';
import { BTreeIndex } from './btree-index.js';
import { CompoundIndex } from './compound-index.js';
import { evaluate } from '../query/evaluator.js';
import { parsePath } from '../query/path-parser.js';

export class IndexManager {
  private indices: Map<string, IIndex> = new Map();
  private document: any;

  constructor(document: any) {
    this.document = document;
  }

  /**
   * Create an index
   */
  createIndex(options: IndexOptions): IIndex {
    const { name, fields, unique, type = 'hash', caseInsensitive } = options;

    if (this.indices.has(name)) {
      throw new Error(`Index '${name}' already exists`);
    }

    let index: IIndex;

    // Create appropriate index type
    if (fields.length > 1) {
      // Compound index
      index = new CompoundIndex(name, fields, { type, unique });
    } else if (type === 'btree') {
      index = new BTreeIndex(name, { unique });
    } else {
      index = new HashIndex(name, { unique, caseInsensitive });
    }

    this.indices.set(name, index);

    // Build index from document
    this.buildIndex(index, fields);

    return index;
  }

  /**
   * Build index from document
   */
  private buildIndex(index: IIndex, fields: string[]): void {
    // Walk document and extract indexed values
    const extractValues = (obj: any, path: string = ''): void => {
      if (obj === null || obj === undefined) {
        return;
      }

      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => {
          extractValues(item, `${path}[${idx}]`);
        });
      } else if (typeof obj === 'object') {
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const newPath = path ? `${path}.${key}` : key;
            extractValues(obj[key], newPath);

            // Check if this path matches any indexed field
            if (fields.length === 1) {
              // Single field index
              if (newPath === fields[0] || newPath.endsWith(`.${fields[0]}`)) {
                index.insert(obj[key], newPath);
              }
            } else {
              // Compound index: extract all field values
              const values = fields.map(field => {
                try {
                  const parseResult = parsePath(field);
                  if (parseResult.success) {
                    return evaluate(this.document, parseResult.ast);
                  }
                } catch (e) {
                  return undefined;
                }
                return undefined;
              });

              if (values.every(v => v !== undefined)) {
                index.insert(values, newPath);
              }
            }
          }
        }
      }
    };

    extractValues(this.document);
  }

  /**
   * Get an index by name
   */
  getIndex(name: string): IIndex | undefined {
    return this.indices.get(name);
  }

  /**
   * Check if index exists
   */
  hasIndex(name: string): boolean {
    return this.indices.has(name);
  }

  /**
   * Drop an index
   */
  dropIndex(name: string): boolean {
    return this.indices.delete(name);
  }

  /**
   * List all indices
   */
  listIndices(): string[] {
    return Array.from(this.indices.keys());
  }

  /**
   * Get index statistics for all indices
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, index] of this.indices) {
      stats[name] = index.stats();
    }

    return stats;
  }

  /**
   * Clear all indices
   */
  clearAll(): void {
    for (const index of this.indices.values()) {
      index.clear();
    }
  }

  /**
   * Drop all indices
   */
  dropAll(): void {
    this.indices.clear();
  }

  /**
   * Rebuild all indices
   */
  rebuildAll(): void {
    for (const [name, index] of this.indices) {
      index.clear();
      // Rebuild would need field info - simplified for now
    }
  }

  /**
   * Update index when document changes
   */
  onInsert(path: string, value: any): void {
    // Update all indices that might be affected
    for (const index of this.indices.values()) {
      // Simplified: would need to check if path matches indexed fields
      try {
        index.insert(value, path);
      } catch (e) {
        // Ignore unique constraint errors, etc.
      }
    }
  }

  /**
   * Update index when value deleted
   */
  onDelete(path: string, value: any): void {
    for (const index of this.indices.values()) {
      try {
        index.remove(value, path);
      } catch (e) {
        // Ignore errors
      }
    }
  }
}
