/**
 * Index Manager for Managing Multiple Indices (T025)
 *
 * Centralized management of document indices with automatic maintenance
 */

import type { IIndex, IndexOptions } from './types.js';
import { HashIndex } from './hash-index.js';
import { BTreeIndex } from './btree-index.js';
import { CompoundIndex } from './compound-index.js';
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
        // BUG-002 FIX: For compound indices, check if current object has all required fields
        // before iterating through its properties
        if (fields.length > 1) {
          // Extract compound index values from current object
          const values = fields.map(field => {
            try {
              if (typeof obj === 'object' && obj !== null) {
                // Check if field exists directly on current object
                if (field in obj) {
                  return obj[field];
                }
                // Check if it's a nested path (e.g., "profile.firstName")
                const parts = field.split('.');
                let current: any = obj;
                for (const part of parts) {
                  if (current && typeof current === 'object' && part in current) {
                    current = current[part];
                  } else {
                    return undefined;
                  }
                }
                return current;
              }
              return undefined;
            } catch (e) {
              return undefined;
            }
          });

          // If all field values exist, insert compound key
          if (values.every(v => v !== undefined)) {
            index.insert(values, path || 'root');
          }
        }

        // Continue walking the object tree
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const newPath = path ? `${path}.${key}` : key;
            extractValues(obj[key], newPath);

            // Check if this path matches any indexed field (single field index only)
            if (fields.length === 1) {
              if (newPath === fields[0] || newPath.endsWith(`.${fields[0]}`)) {
                index.insert(obj[key], newPath);
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

}
