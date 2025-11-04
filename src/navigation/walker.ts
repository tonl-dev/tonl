/**
 * Tree walker for TONL documents
 *
 * Provides callback-based tree traversal with filtering and early termination
 */

/**
 * Walk callback function
 *
 * @param path - Current path
 * @param value - Current value
 * @param depth - Current depth in the tree
 * @returns false to stop traversal, true or void to continue
 */
export type WalkCallback = (path: string, value: any, depth: number) => void | boolean;

/**
 * Walk options
 */
export interface WalkOptions {
  /**
   * Maximum depth to traverse
   * @default 100
   */
  maxDepth?: number;

  /**
   * Filter function to determine which values to visit
   * @default undefined (visit all)
   */
  filter?: (value: any) => boolean;

  /**
   * Traversal strategy
   * @default 'depth-first'
   */
  strategy?: 'depth-first' | 'breadth-first';

  /**
   * Visit order for depth-first traversal
   * @default 'pre-order'
   */
  order?: 'pre-order' | 'post-order';

  /**
   * Whether to include the root node in traversal
   * @default false
   */
  includeRoot?: boolean;
}

/**
 * Walk a tree structure with a callback
 *
 * @param value - The root value to walk
 * @param callback - Function called for each node
 * @param options - Walk options
 *
 * @example
 * ```typescript
 * const doc = { user: { name: 'Alice', age: 30 } };
 * walk(doc, (path, value, depth) => {
 *   console.log(`[${depth}] ${path}: ${JSON.stringify(value)}`);
 * });
 * ```
 */
export function walk(
  value: any,
  callback: WalkCallback,
  options: WalkOptions = {}
): void {
  const {
    maxDepth = 100,
    filter,
    strategy = 'depth-first',
    order = 'pre-order',
    includeRoot = false
  } = options;

  if (strategy === 'depth-first') {
    walkDepthFirst(value, '', callback, {
      maxDepth,
      currentDepth: 0,
      filter,
      order,
      includeRoot
    });
  } else {
    walkBreadthFirst(value, callback, { maxDepth, filter, includeRoot });
  }
}

/**
 * Internal state for depth-first traversal
 */
interface DepthFirstState {
  maxDepth: number;
  currentDepth: number;
  filter?: (value: any) => boolean;
  order: 'pre-order' | 'post-order';
  includeRoot: boolean;
}

/**
 * Depth-first tree traversal
 */
function walkDepthFirst(
  value: any,
  path: string,
  callback: WalkCallback,
  state: DepthFirstState
): boolean {
  // Check depth limit
  if (state.currentDepth > state.maxDepth) {
    return true; // Continue
  }

  // Apply filter if provided
  if (state.filter && !state.filter(value)) {
    return true; // Skip this node
  }

  // Pre-order: visit node before children
  if (state.order === 'pre-order') {
    if (state.currentDepth > 0 || state.includeRoot) {
      const shouldContinue = callback(path, value, state.currentDepth);
      if (shouldContinue === false) {
        return false; // Stop traversal
      }
    }
  }

  // Recurse into children
  if (value !== null && typeof value === 'object') {
    const childState: DepthFirstState = {
      ...state,
      currentDepth: state.currentDepth + 1
    };

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const childPath = path ? `${path}[${i}]` : `[${i}]`;
        const shouldContinue = walkDepthFirst(value[i], childPath, callback, childState);
        if (!shouldContinue) {
          return false;
        }
      }
    } else {
      for (const key in value) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          continue;
        }

        const childPath = path ? `${path}.${key}` : key;
        const shouldContinue = walkDepthFirst(value[key], childPath, callback, childState);
        if (!shouldContinue) {
          return false;
        }
      }
    }
  }

  // Post-order: visit node after children
  if (state.order === 'post-order') {
    if (state.currentDepth > 0 || state.includeRoot) {
      const shouldContinue = callback(path, value, state.currentDepth);
      if (shouldContinue === false) {
        return false;
      }
    }
  }

  return true; // Continue
}

/**
 * Internal state for breadth-first traversal
 */
interface BreadthFirstState {
  maxDepth: number;
  filter?: (value: any) => boolean;
  includeRoot: boolean;
}

/**
 * Breadth-first tree traversal
 */
function walkBreadthFirst(
  root: any,
  callback: WalkCallback,
  state: BreadthFirstState
): void {
  interface QueueItem {
    value: any;
    path: string;
    depth: number;
  }

  const queue: QueueItem[] = [];

  // Initialize queue
  if (state.includeRoot) {
    queue.push({ value: root, path: '', depth: 0 });
  } else {
    // Add root's children
    if (root !== null && typeof root === 'object') {
      if (Array.isArray(root)) {
        for (let i = 0; i < root.length; i++) {
          queue.push({ value: root[i], path: `[${i}]`, depth: 1 });
        }
      } else {
        for (const key in root) {
          if (Object.prototype.hasOwnProperty.call(root, key)) {
            queue.push({ value: root[key], path: key, depth: 1 });
          }
        }
      }
    }
  }

  // Process queue
  while (queue.length > 0) {
    const item = queue.shift()!;

    // Check depth limit
    if (item.depth > state.maxDepth) {
      continue;
    }

    // Apply filter
    if (state.filter && !state.filter(item.value)) {
      continue;
    }

    // Visit node
    const shouldContinue = callback(item.path, item.value, item.depth);
    if (shouldContinue === false) {
      return; // Stop traversal
    }

    // Add children to queue
    if (item.value !== null && typeof item.value === 'object') {
      if (Array.isArray(item.value)) {
        for (let i = 0; i < item.value.length; i++) {
          const childPath = item.path ? `${item.path}[${i}]` : `[${i}]`;
          queue.push({
            value: item.value[i],
            path: childPath,
            depth: item.depth + 1
          });
        }
      } else {
        for (const key in item.value) {
          if (Object.prototype.hasOwnProperty.call(item.value, key)) {
            const childPath = item.path ? `${item.path}.${key}` : key;
            queue.push({
              value: item.value[key],
              path: childPath,
              depth: item.depth + 1
            });
          }
        }
      }
    }
  }
}

/**
 * Count total nodes in a tree
 *
 * @param value - The tree to count
 * @param maxDepth - Maximum depth
 * @returns Total number of nodes
 */
export function countNodes(value: any, maxDepth: number = 100): number {
  let count = 0;
  walk(value, () => { count++; return true; }, { maxDepth });
  return count;
}

/**
 * Find a value by predicate
 *
 * @param value - The tree to search
 * @param predicate - Function to test each value
 * @returns First matching value or undefined
 */
export function find(
  value: any,
  predicate: (value: any, path: string) => boolean
): any {
  let found: any = undefined;

  walk(value, (path, val) => {
    if (predicate(val, path)) {
      found = val;
      return false; // Stop search
    }
  });

  return found;
}

/**
 * Find all values matching a predicate
 *
 * @param value - The tree to search
 * @param predicate - Function to test each value
 * @returns Array of matching values
 */
export function findAll(
  value: any,
  predicate: (value: any, path: string) => boolean
): any[] {
  const results: any[] = [];

  walk(value, (path, val) => {
    if (predicate(val, path)) {
      results.push(val);
    }
  });

  return results;
}

/**
 * Check if any value matches a predicate
 *
 * @param value - The tree to search
 * @param predicate - Function to test each value
 * @returns True if any value matches
 */
export function some(
  value: any,
  predicate: (value: any, path: string) => boolean
): boolean {
  return find(value, predicate) !== undefined;
}

/**
 * Check if all values match a predicate
 *
 * @param value - The tree to search
 * @param predicate - Function to test each value
 * @returns True if all values match
 */
export function every(
  value: any,
  predicate: (value: any, path: string) => boolean
): boolean {
  let allMatch = true;

  walk(value, (path, val) => {
    if (!predicate(val, path)) {
      allMatch = false;
      return false; // Stop search
    }
  });

  return allMatch;
}
