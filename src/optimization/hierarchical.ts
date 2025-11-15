/**
 * Hierarchical Grouping - Optimize nested data structures
 *
 * Groups related data hierarchically to reduce repetition and improve
 * compression for tree-like and nested data structures.
 *
 * Features:
 * - Automatic hierarchy detection
 * - Parent-child relationship optimization
 * - Nested structure flattening
 * - Common ancestor extraction
 *
 * Example:
 * Original nested structure:
 * ```
 * {
 *   "company": "Acme Corp",
 *   "departments": [
 *     {
 *       "name": "Engineering",
 *       "company": "Acme Corp",
 *       "employees": [...]
 *     },
 *     {
 *       "name": "Sales",
 *       "company": "Acme Corp",
 *       "employees": [...]
 *     }
 *   ]
 * }
 * ```
 *
 * Optimized with hierarchy:
 * ```
 * @hierarchy company
 * company: Acme Corp
 *
 * @group departments
 * name,employees
 * Engineering,[...]
 * Sales,[...]
 * ```
 *
 * Token Savings: 15-30% for deeply nested structures
 */

import type { HierarchicalOptions } from './types.js';

/**
 * Default hierarchical grouping options
 */
const DEFAULT_HIERARCHICAL_OPTIONS: HierarchicalOptions = {
  enabled: true,
  maxDepth: 3,              // Maximum nesting depth to process
  minGroupSize: 2,          // Minimum items in a group
  extractCommon: true,      // Extract common parent fields
  flattenArrays: true       // Flatten nested arrays when beneficial
};

/**
 * Hierarchy node representing a level in the data structure
 */
export interface HierarchyNode {
  name: string;
  level: number;
  parent?: string;
  commonFields: Map<string, any>;
  uniqueFields: string[];
  children: HierarchyNode[];
}

/**
 * Hierarchy analysis result
 */
export interface HierarchyAnalysis {
  depth: number;
  nodeCount: number;
  commonFieldCount: number;
  estimatedSavings: number;
  recommended: boolean;
  hierarchyTree: HierarchyNode | null;
}

/**
 * Hierarchical grouping manager
 */
export class HierarchicalGrouping {
  private options: HierarchicalOptions;

  constructor(options: Partial<HierarchicalOptions> = {}) {
    this.options = {
      ...DEFAULT_HIERARCHICAL_OPTIONS,
      ...options
    };
  }

  /**
   * Analyze data for hierarchical structure
   *
   * @param data - Data to analyze
   * @param maxDepth - Maximum depth to analyze
   * @returns Analysis result
   */
  analyzeHierarchy(data: any, maxDepth: number = this.options.maxDepth): HierarchyAnalysis {
    if (!data || typeof data !== 'object') {
      return {
        depth: 0,
        nodeCount: 0,
        commonFieldCount: 0,
        estimatedSavings: 0,
        recommended: false,
        hierarchyTree: null
      };
    }

    const tree = this.buildHierarchyTree(data, 0, maxDepth);
    const depth = this.calculateDepth(tree);
    const nodeCount = this.countNodes(tree);
    const commonFieldCount = this.countCommonFields(tree);

    // Estimate savings based on common field extraction
    const originalSize = JSON.stringify(data).length;
    const estimatedSize = originalSize * (1 - (commonFieldCount * 0.05)); // ~5% per common field
    const estimatedSavings = Math.max(0, Math.round(((originalSize - estimatedSize) / originalSize) * 100));

    const recommended = depth >= 2 && commonFieldCount >= 2;

    return {
      depth,
      nodeCount,
      commonFieldCount,
      estimatedSavings,
      recommended,
      hierarchyTree: tree
    };
  }

  /**
   * Build hierarchy tree from data
   *
   * @param data - Data object
   * @param currentDepth - Current depth
   * @param maxDepth - Maximum depth
   * @param parentName - Parent node name
   * @returns Hierarchy node
   */
  private buildHierarchyTree(
    data: any,
    currentDepth: number,
    maxDepth: number,
    parentName?: string
  ): HierarchyNode {
    const node: HierarchyNode = {
      name: parentName || 'root',
      level: currentDepth,
      parent: parentName,
      commonFields: new Map(),
      uniqueFields: [],
      children: []
    };

    if (currentDepth >= maxDepth || typeof data !== 'object' || data === null) {
      return node;
    }

    // Analyze object properties
    if (Array.isArray(data)) {
      // For arrays, analyze elements for common fields
      if (data.length > 0 && typeof data[0] === 'object') {
        const commonFields = this.findCommonFields(data);
        commonFields.forEach((value, key) => {
          node.commonFields.set(key, value);
        });

        // Process all elements to get complete structure
        // Collect all unique fields across all array elements
        const allKeys = new Set<string>();
        const nestedFieldsMap = new Map<string, any[]>();

        data.forEach((element: any) => {
          if (typeof element === 'object' && element !== null) {
            Object.keys(element).forEach(key => {
              allKeys.add(key);

              // Collect nested structures for later recursion
              if (typeof element[key] === 'object' && element[key] !== null) {
                if (!nestedFieldsMap.has(key)) {
                  nestedFieldsMap.set(key, []);
                }
                nestedFieldsMap.get(key)!.push(element[key]);
              }
            });
          }
        });

        // Add unique fields (non-common fields)
        allKeys.forEach(key => {
          if (!commonFields.has(key)) {
            node.uniqueFields.push(key);
          }
        });

        // Recurse into nested structures
        nestedFieldsMap.forEach((nestedValues, key) => {
          // Use the first non-null nested value for recursion
          const sampleValue = nestedValues.find(v => v !== null);
          if (sampleValue) {
            const childNode = this.buildHierarchyTree(
              sampleValue,
              currentDepth + 1,
              maxDepth,
              key
            );
            if (childNode.commonFields.size > 0 || childNode.children.length > 0) {
              node.children.push(childNode);
            }
          }
        });
      }
    } else {
      // For objects, process each property
      Object.keys(data).forEach(key => {
        const value = data[key];

        if (typeof value === 'object' && value !== null) {
          // Nested object or array
          const childNode = this.buildHierarchyTree(value, currentDepth + 1, maxDepth, key);
          if (childNode.commonFields.size > 0 || childNode.uniqueFields.length > 0 || childNode.children.length > 0) {
            node.children.push(childNode);
          }
        } else {
          // Primitive value
          node.uniqueFields.push(key);
        }
      });
    }

    return node;
  }

  /**
   * Find common fields across array elements
   *
   * @param array - Array of objects
   * @returns Map of common field names to values
   */
  private findCommonFields(array: any[]): Map<string, any> {
    const commonFields = new Map<string, any>();

    if (array.length === 0 || typeof array[0] !== 'object') {
      return commonFields;
    }

    const firstElement = array[0];
    Object.keys(firstElement).forEach(key => {
      const firstValue = firstElement[key];

      // Check if this field has the same value in all elements
      const allSame = array.every(element =>
        element && element[key] === firstValue
      );

      if (allSame) {
        commonFields.set(key, firstValue);
      }
    });

    return commonFields;
  }

  /**
   * Calculate depth of hierarchy tree
   *
   * @param node - Root node
   * @returns Maximum depth
   */
  private calculateDepth(node: HierarchyNode | null): number {
    if (!node || node.children.length === 0) {
      return node ? node.level : 0;
    }

    const childDepths = node.children.map(child => this.calculateDepth(child));
    return Math.max(...childDepths);
  }

  /**
   * Count total nodes in tree
   *
   * @param node - Root node
   * @returns Node count
   */
  private countNodes(node: HierarchyNode | null): number {
    if (!node) return 0;

    return 1 + node.children.reduce((sum, child) => sum + this.countNodes(child), 0);
  }

  /**
   * Count total common fields in tree
   *
   * @param node - Root node
   * @returns Common field count
   */
  private countCommonFields(node: HierarchyNode | null): number {
    if (!node) return 0;

    return node.commonFields.size +
           node.children.reduce((sum, child) => sum + this.countCommonFields(child), 0);
  }

  /**
   * Generate hierarchy directive
   *
   * Format: @hierarchy parentField
   *
   * @param fieldName - Parent field name
   * @returns TONL directive
   */
  generateHierarchyDirective(fieldName: string): string {
    return `@hierarchy ${fieldName}`;
  }

  /**
   * Generate group directive
   *
   * Format: @group groupName
   *
   * @param groupName - Group name
   * @returns TONL directive
   */
  generateGroupDirective(groupName: string): string {
    return `@group ${groupName}`;
  }

  /**
   * Parse hierarchy directive
   *
   * @param directive - Directive string
   * @returns Field name
   */
  parseHierarchyDirective(directive: string): string {
    const match = directive.match(/^@hierarchy\s+(\S+)$/);
    if (!match) {
      throw new Error(`Invalid hierarchy directive: ${directive}`);
    }
    return match[1];
  }

  /**
   * Parse group directive
   *
   * @param directive - Directive string
   * @returns Group name
   */
  parseGroupDirective(directive: string): string {
    const match = directive.match(/^@group\s+(\S+)$/);
    if (!match) {
      throw new Error(`Invalid group directive: ${directive}`);
    }
    return match[1];
  }

  /**
   * Extract common fields from nested structure
   *
   * @param data - Nested data
   * @returns Object with common fields extracted
   */
  extractCommonFields(data: any): {
    common: Record<string, any>;
    remaining: any;
  } {
    if (!this.options.extractCommon) {
      return { common: {}, remaining: data };
    }

    const common: Record<string, any> = {};
    let remaining = data;

    if (Array.isArray(data) && data.length > 0) {
      const commonFields = this.findCommonFields(data);

      if (commonFields.size > 0) {
        commonFields.forEach((value, key) => {
          common[key] = value;
        });

        // Remove common fields from array elements
        remaining = data.map(element => {
          const newElement = { ...element };
          commonFields.forEach((_, key) => {
            delete newElement[key];
          });
          return newElement;
        });
      }
    }

    return { common, remaining };
  }

  /**
   * Flatten nested arrays if beneficial
   *
   * @param data - Data with nested arrays
   * @returns Flattened structure
   */
  flattenArrays(data: any): any {
    if (!this.options.flattenArrays) {
      return data;
    }

    // Simple flattening logic
    if (Array.isArray(data)) {
      return data.map(item => this.flattenArrays(item));
    }

    if (typeof data === 'object' && data !== null) {
      const flattened: any = {};

      Object.keys(data).forEach(key => {
        const value = data[key];

        if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'object') {
          // Flatten single-element arrays
          flattened[key] = this.flattenArrays(value[0]);
        } else {
          flattened[key] = this.flattenArrays(value);
        }
      });

      return flattened;
    }

    return data;
  }

  /**
   * Estimate savings from hierarchical grouping
   *
   * @param data - Original data
   * @returns Estimated byte savings
   */
  estimateSavings(data: any): number {
    const analysis = this.analyzeHierarchy(data);
    const originalSize = JSON.stringify(data).length;
    const savings = Math.round(originalSize * (analysis.estimatedSavings / 100));
    return savings;
  }

  /**
   * Check if hierarchical grouping would be beneficial
   *
   * @param data - Data to check
   * @returns True if recommended
   */
  shouldGroup(data: any): boolean {
    if (!this.options.enabled) {
      return false;
    }

    const analysis = this.analyzeHierarchy(data);
    return analysis.recommended;
  }
}
