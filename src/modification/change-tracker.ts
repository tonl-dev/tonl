/**
 * Change Tracking & Diff (T016)
 *
 * Tracks all modifications to a document and provides diff capabilities
 */

import type { Change } from './transaction.js';

export interface DiffEntry {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  oldValue?: any;
  newValue?: any;
}

export interface DiffResult {
  changes: DiffEntry[];
  hasChanges: boolean;
  summary: {
    added: number;
    modified: number;
    deleted: number;
    total: number;
  };
}

export class ChangeTracker {
  private changes: Change[] = [];
  private enabled = true;

  /**
   * Record a change
   */
  record(change: Change): void {
    if (this.enabled) {
      this.changes.push({
        ...change,
      });
    }
  }

  /**
   * Get all recorded changes
   */
  getChanges(): Change[] {
    return [...this.changes];
  }

  /**
   * Clear all changes
   */
  clear(): void {
    this.changes = [];
  }

  /**
   * Get number of changes
   */
  count(): number {
    return this.changes.length;
  }

  /**
   * Check if there are any changes
   */
  hasChanges(): boolean {
    return this.changes.length > 0;
  }

  /**
   * Enable change tracking
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable change tracking
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Check if tracking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Compare two documents and generate a diff
 */
export function diff(original: any, modified: any, path = ''): DiffResult {
  const changes: DiffEntry[] = [];

  // Helper to add change
  const addChange = (p: string, type: DiffEntry['type'], oldVal?: any, newVal?: any) => {
    changes.push({
      path: p || '$',
      type,
      oldValue: oldVal,
      newValue: newVal
    });
  };

  // Compare two values recursively
  function compare(orig: any, mod: any, currentPath: string): void {
    // Type mismatch or primitive change
    if (typeof orig !== typeof mod || Array.isArray(orig) !== Array.isArray(mod)) {
      if (orig !== undefined && mod === undefined) {
        addChange(currentPath, 'deleted', orig);
      } else if (orig === undefined && mod !== undefined) {
        addChange(currentPath, 'added', undefined, mod);
      } else {
        addChange(currentPath, 'modified', orig, mod);
      }
      return;
    }

    // Both null or undefined
    if (orig === null || orig === undefined) {
      if (orig !== mod) {
        addChange(currentPath, 'modified', orig, mod);
      }
      return;
    }

    // Primitive values
    if (typeof orig !== 'object') {
      if (orig !== mod) {
        addChange(currentPath, 'modified', orig, mod);
      }
      return;
    }

    // Arrays
    if (Array.isArray(orig) && Array.isArray(mod)) {
      const maxLen = Math.max(orig.length, mod.length);
      for (let i = 0; i < maxLen; i++) {
        const elemPath = `${currentPath}[${i}]`;
        if (i >= orig.length) {
          addChange(elemPath, 'added', undefined, mod[i]);
        } else if (i >= mod.length) {
          addChange(elemPath, 'deleted', orig[i]);
        } else {
          compare(orig[i], mod[i], elemPath);
        }
      }
      return;
    }

    // Objects
    const origKeys = new Set(Object.keys(orig));
    const modKeys = new Set(Object.keys(mod));
    const allKeys = new Set([...origKeys, ...modKeys]);

    for (const key of allKeys) {
      const propPath = currentPath ? `${currentPath}.${key}` : key;

      if (!origKeys.has(key)) {
        // Added property
        addChange(propPath, 'added', undefined, mod[key]);
      } else if (!modKeys.has(key)) {
        // Deleted property
        addChange(propPath, 'deleted', orig[key]);
      } else {
        // Compare values
        compare(orig[key], mod[key], propPath);
      }
    }
  }

  // Start comparison
  compare(original, modified, path);

  // Generate summary
  const summary = {
    added: changes.filter(c => c.type === 'added').length,
    modified: changes.filter(c => c.type === 'modified').length,
    deleted: changes.filter(c => c.type === 'deleted').length,
    total: changes.length
  };

  return {
    changes,
    hasChanges: changes.length > 0,
    summary
  };
}

/**
 * Apply a diff to a document
 */
export function applyDiff(document: any, diffResult: DiffResult): void {
  // This is a simplified implementation
  // A full implementation would need to parse paths and apply changes
  throw new Error('applyDiff not yet implemented');
}

/**
 * Format diff as a human-readable string
 */
export function formatDiff(diffResult: DiffResult): string {
  const lines: string[] = [];

  lines.push(`Changes: ${diffResult.summary.total}`);
  lines.push(`  Added: ${diffResult.summary.added}`);
  lines.push(`  Modified: ${diffResult.summary.modified}`);
  lines.push(`  Deleted: ${diffResult.summary.deleted}`);
  lines.push('');

  for (const change of diffResult.changes) {
    switch (change.type) {
      case 'added':
        lines.push(`+ ${change.path} = ${JSON.stringify(change.newValue)}`);
        break;
      case 'modified':
        lines.push(`~ ${change.path}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`);
        break;
      case 'deleted':
        lines.push(`- ${change.path} (was: ${JSON.stringify(change.oldValue)})`);
        break;
    }
  }

  return lines.join('\n');
}
