/**
 * TONL Navigation & Iteration API
 *
 * @packageDocumentation
 */

// Export iterators
export {
  entries,
  keys,
  values,
  deepEntries,
  deepKeys,
  deepValues
} from './iterator.js';

// Export walker
export {
  walk,
  countNodes,
  find,
  findAll,
  some,
  every,
  type WalkCallback,
  type WalkOptions
} from './walker.js';
