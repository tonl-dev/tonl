/**
 * Change Tracking & Diff (T016)
 *
 * Tracks all modifications to a document and provides diff capabilities
 */

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
 * Apply a diff to a document, mutating it in place
 *
 * Processes changes in reverse order for deletions to avoid index shifting issues,
 * and in forward order for additions and modifications.
 *
 * @param document - The document to modify (will be mutated)
 * @param diffResult - Diff result from diff()
 */
export function applyDiff(document: Record<string, unknown>, diffResult: DiffResult): void {
  if (!diffResult.hasChanges) return;

  // Apply deletions first (in reverse to avoid index shift issues)
  const deletions = diffResult.changes.filter(c => c.type === 'deleted');
  for (let i = deletions.length - 1; i >= 0; i--) {
    applyChange(document, deletions[i]);
  }

  // Apply modifications and additions
  for (const change of diffResult.changes) {
    if (change.type !== 'deleted') {
      applyChange(document, change);
    }
  }
}

/**
 * Apply a single change to a document
 */
function applyChange(document: Record<string, unknown>, change: DiffEntry): void {
  const path = change.path;
  if (path === '$') {
    // Root-level change - can't handle in-place
    return;
  }

  // Parse path segments (e.g., "a.b[0].c" -> ["a", "b", "[0]", "c"])
  const segments = parsePathSegments(path);
  if (segments.length === 0) return;

  // Navigate to parent
  let current: unknown = document;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (current === null || current === undefined || typeof current !== 'object') return;

    if (seg.type === 'index') {
      if (!Array.isArray(current)) return;
      current = (current as unknown[])[seg.value as number];
    } else {
      current = (current as Record<string, unknown>)[seg.value as string];
    }
  }

  if (current === null || current === undefined || typeof current !== 'object') return;

  const lastSeg = segments[segments.length - 1];

  switch (change.type) {
    case 'added':
    case 'modified':
      if (lastSeg.type === 'index' && Array.isArray(current)) {
        (current as unknown[])[lastSeg.value as number] = change.newValue;
      } else if (lastSeg.type === 'property' && !Array.isArray(current)) {
        (current as Record<string, unknown>)[lastSeg.value as string] = change.newValue;
      }
      break;
    case 'deleted':
      if (lastSeg.type === 'index' && Array.isArray(current)) {
        (current as unknown[]).splice(lastSeg.value as number, 1);
      } else if (lastSeg.type === 'property' && !Array.isArray(current)) {
        delete (current as Record<string, unknown>)[lastSeg.value as string];
      }
      break;
  }
}

interface PathSegment {
  type: 'property' | 'index';
  value: string | number;
}

function parsePathSegments(path: string): PathSegment[] {
  const segments: PathSegment[] = [];
  const parts = path.split(/\.|\[|\]/g).filter(Boolean);

  for (const part of parts) {
    const idx = parseInt(part, 10);
    if (!isNaN(idx) && String(idx) === part) {
      segments.push({ type: 'index', value: idx });
    } else {
      segments.push({ type: 'property', value: part });
    }
  }

  return segments;
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
