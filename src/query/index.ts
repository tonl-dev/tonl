/**
 * TONL Query API - Path expression parsing and evaluation
 *
 * @packageDocumentation
 */

// Export all types
export * from './types.js';

// Export tokenizer
export { tokenize, isTokenType, isOperator, getOperatorPrecedence } from './tokenizer.js';

// Export parser
export { parsePath } from './path-parser.js';

// Export validator
export {
  validate,
  analyzeAST,
  optimizeAST,
  astToString,
  ValidationResult,
  ASTAnalysis
} from './validator.js';

// Export evaluator
export {
  QueryEvaluator,
  evaluate,
  exists,
  typeOf
} from './evaluator.js';

// Export context
export {
  createContext,
  createChildContext,
  isMaxDepthReached,
  type EvaluationContext
} from './context.js';

// Export cache
export {
  QueryCache,
  getGlobalCache,
  resetGlobalCache,
  type CacheStats
} from './cache.js';
