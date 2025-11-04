/**
 * Iterators for TONL documents
 *
 * Provides entry, key, and value iterators for traversing document trees
 */

/**
 * Iterate over [key, value] pairs in an object or array
 *
 * @param value - The value to iterate over
 * @yields [key, value] pairs
 *
 * @example
 * ```typescript
 * const doc = { user: { name: 'Alice', age: 30 } };
 * for (const [key, value] of entries(doc)) {
 *   console.log(`${key}: ${value}`);
 * }
 * // Output:
 * // user: { name: 'Alice', age: 30 }
 * ```
 */
export function* entries(value: any): Generator<[string, any], void, undefined> {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      yield [String(i), value[i]];
    }
  } else if (typeof value === 'object') {
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        yield [key, value[key]];
      }
    }
  }
}

/**
 * Iterate over keys in an object or array
 *
 * @param value - The value to iterate over
 * @yields Keys (property names or array indices as strings)
 */
export function* keys(value: any): Generator<string, void, undefined> {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      yield String(i);
    }
  } else if (typeof value === 'object') {
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        yield key;
      }
    }
  }
}

/**
 * Iterate over values in an object or array
 *
 * @param value - The value to iterate over
 * @yields Values
 */
export function* values(value: any): Generator<any, void, undefined> {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      yield item;
    }
  } else if (typeof value === 'object') {
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        yield value[key];
      }
    }
  }
}

/**
 * Recursively iterate over all [path, value] pairs in a tree
 *
 * @param value - The value to iterate over
 * @param parentPath - Parent path prefix
 * @param maxDepth - Maximum recursion depth
 * @yields [path, value] pairs for all nodes in the tree
 *
 * @example
 * ```typescript
 * const doc = { user: { name: 'Alice', profile: { age: 30 } } };
 * for (const [path, value] of deepEntries(doc)) {
 *   console.log(`${path}: ${value}`);
 * }
 * // Output:
 * // user: { name: 'Alice', profile: { age: 30 } }
 * // user.name: Alice
 * // user.profile: { age: 30 }
 * // user.profile.age: 30
 * ```
 */
export function* deepEntries(
  value: any,
  parentPath: string = '',
  maxDepth: number = 100
): Generator<[string, any], void, undefined> {
  if (maxDepth <= 0) {
    return;
  }

  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const path = parentPath ? `${parentPath}[${i}]` : `[${i}]`;
      yield [path, value[i]];

      // Recurse into nested structures
      if (typeof value[i] === 'object' && value[i] !== null) {
        yield* deepEntries(value[i], path, maxDepth - 1);
      }
    }
  } else if (typeof value === 'object') {
    for (const key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        continue;
      }

      const path = parentPath ? `${parentPath}.${key}` : key;
      yield [path, value[key]];

      // Recurse into nested structures
      if (typeof value[key] === 'object' && value[key] !== null) {
        yield* deepEntries(value[key], path, maxDepth - 1);
      }
    }
  }
}

/**
 * Recursively iterate over all paths in a tree
 *
 * @param value - The value to iterate over
 * @param parentPath - Parent path prefix
 * @param maxDepth - Maximum recursion depth
 * @yields All paths in the tree
 */
export function* deepKeys(
  value: any,
  parentPath: string = '',
  maxDepth: number = 100
): Generator<string, void, undefined> {
  for (const [path] of deepEntries(value, parentPath, maxDepth)) {
    yield path;
  }
}

/**
 * Recursively iterate over all values in a tree
 *
 * @param value - The value to iterate over
 * @param maxDepth - Maximum recursion depth
 * @yields All values in the tree
 */
export function* deepValues(
  value: any,
  maxDepth: number = 100
): Generator<any, void, undefined> {
  for (const [, val] of deepEntries(value, '', maxDepth)) {
    yield val;
  }
}
