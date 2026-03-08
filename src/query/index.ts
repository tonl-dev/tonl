/**
 * TONL Query API - Path expression parsing and evaluation
 *
 * @packageDocumentation
 */

// Export all types
export * from './types.js';

// Export tokenizer
export { tokenize, isOperator, getOperatorPrecedence } from './tokenizer.js';

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
  evaluate
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

// Export filter evaluator
export { evaluateFilterExpression } from './filter-evaluator.js';

// Export aggregators
export {
  aggregate,
  agg,
  AggregationResult,
  type AggregationOptions,
  type StatisticsResult
} from './aggregators.js';

// Export fuzzy matcher
export {
  levenshteinDistance,
  levenshteinSimilarity,
  jaroSimilarity,
  jaroWinklerSimilarity,
  diceSimilarity,
  soundex,
  metaphone,
  soundsLike,
  soundsLikeMetaphone,
  fuzzyMatch,
  similarity,
  fuzzyContains,
  fuzzyStartsWith,
  fuzzyEndsWith,
  fuzzySearch,
  evaluateFuzzyOperator,
  isFuzzyOperator,
  type FuzzyOptions
} from './fuzzy-matcher.js';

// Export temporal evaluator
export {
  parseTemporalLiteral,
  parseDuration,
  durationToMilliseconds,
  addDuration,
  subtractDuration,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  toTemporalValue,
  compareTemporalValues,
  isBefore,
  isAfter,
  isBetween,
  isDaysAgo,
  isWeeksAgo,
  isMonthsAgo,
  isYearsAgo,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  evaluateTemporalOperator,
  isTemporalOperator,
  isTemporalLiteral,
  type TemporalValue,
  type DurationValue,
  type TemporalOptions
} from './temporal-evaluator.js';
