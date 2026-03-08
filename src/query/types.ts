/**
 * Type definitions for TONL Query API
 *
 * Defines the Abstract Syntax Tree (AST) node types for path expressions
 * and filter conditions in JSONPath-like query syntax.
 */

/**
 * Base interface for all path nodes
 */
export interface BasePathNode {
  type: string;
}

/**
 * Root node ($)
 * Represents the root of the document
 */
export interface RootNode extends BasePathNode {
  type: 'root';
  symbol: '$';
}

/**
 * Property access node
 * Example: user.name → { type: 'property', name: 'name' }
 */
export interface PropertyNode extends BasePathNode {
  type: 'property';
  name: string;
}

/**
 * Array index access node
 * Examples:
 * - users[0] → { type: 'index', index: 0 }
 * - users[-1] → { type: 'index', index: -1 } (last element)
 */
export interface IndexNode extends BasePathNode {
  type: 'index';
  index: number;
}

/**
 * Wildcard node (*)
 * Matches all elements in an array or all properties in an object
 * Example: users[*].name
 */
export interface WildcardNode extends BasePathNode {
  type: 'wildcard';
}

/**
 * Recursive descent node (..)
 * Searches for a property at any depth
 * Examples:
 * - $..email → find all 'email' properties at any level
 * - $.. → find all nodes at any level
 */
export interface RecursiveNode extends BasePathNode {
  type: 'recursive';
  name?: string; // Optional property name to search for
}

/**
 * Array slice node
 * Examples:
 * - users[0:5] → { type: 'slice', start: 0, end: 5, step: 1 }
 * - users[:3] → { type: 'slice', start: undefined, end: 3, step: 1 }
 * - users[2:] → { type: 'slice', start: 2, end: undefined, step: 1 }
 * - users[::2] → { type: 'slice', start: undefined, end: undefined, step: 2 }
 */
export interface SliceNode extends BasePathNode {
  type: 'slice';
  start?: number;
  end?: number;
  step?: number;
}

/**
 * Filter expression node
 * Example: users[?(@.role == "admin")]
 */
export interface FilterNode extends BasePathNode {
  type: 'filter';
  expression: FilterExpression;
}

/**
 * Union of all path node types
 */
export type PathNode =
  | RootNode
  | PropertyNode
  | IndexNode
  | WildcardNode
  | RecursiveNode
  | SliceNode
  | FilterNode;

/**
 * Filter expression types
 */
export type FilterExpression =
  | BinaryExpression
  | UnaryExpression
  | LiteralExpression
  | PropertyExpression
  | FunctionExpression;

/**
 * Binary expression (comparison or logical operators)
 * Examples:
 * - @.age > 18
 * - @.role == "admin"
 * - @.active && @.verified
 */
export interface BinaryExpression {
  type: 'binary';
  operator: BinaryOperator;
  left: FilterExpression;
  right: FilterExpression;
}

/**
 * Unary expression (negation)
 * Example: !@.deleted
 */
export interface UnaryExpression {
  type: 'unary';
  operator: UnaryOperator;
  argument: FilterExpression;
}

/**
 * Literal value expression
 * Examples: 18, "admin", true, null
 */
export interface LiteralExpression {
  type: 'literal';
  value: any;
}

/**
 * Property access in filter (relative to current item)
 * Examples:
 * - @.role → current item's role property
 * - @.user.email → nested property access
 */
export interface PropertyExpression {
  type: 'property';
  path: string; // Dot-separated path from @ (current item)
}

/**
 * Function call expression
 * Examples:
 * - contains(@.email, "@company.com")
 * - size(@.tags) > 0
 */
export interface FunctionExpression {
  type: 'function';
  name: string;
  arguments: FilterExpression[];
}

/**
 * Binary operators for filter expressions
 */
export type BinaryOperator =
  // Comparison operators
  | '=='  // Equal
  | '!='  // Not equal
  | '>'   // Greater than
  | '<'   // Less than
  | '>='  // Greater than or equal
  | '<='  // Less than or equal
  // Logical operators
  | '&&'  // Logical AND
  | '||'  // Logical OR
  // String operators
  | 'contains'    // String contains
  | 'startsWith'  // String starts with
  | 'endsWith'    // String ends with
  | 'matches'     // Regex match
  // Fuzzy string operators
  | '~='              // Fuzzy match (Levenshtein)
  | '~contains'       // Fuzzy contains
  | '~startsWith'     // Fuzzy starts with
  | '~endsWith'       // Fuzzy ends with
  | 'fuzzyMatch'      // Explicit fuzzy match
  | 'soundsLike'      // Phonetic match (Soundex)
  | 'similar'         // Similarity with threshold
  // Temporal operators
  | 'before'      // Date before
  | 'after'       // Date after
  | 'between'     // Date between (ternary, uses extra arg)
  | 'daysAgo'     // Within N days
  | 'weeksAgo'    // Within N weeks
  | 'monthsAgo'   // Within N months
  | 'yearsAgo'    // Within N years
  | 'sameDay'     // Same calendar day
  | 'sameWeek'    // Same calendar week
  | 'sameMonth'   // Same calendar month
  | 'sameYear'    // Same calendar year
  // Array operators
  | 'in'          // Element in array
  // Type operators
  | 'typeof'      // Type check
  | 'instanceof'; // Instance check

/**
 * Unary operators for filter expressions
 */
export type UnaryOperator =
  | '!'      // Logical NOT
  | 'exists' // Property exists check
  | 'empty'; // Empty check (array/object/string)

/**
 * Token types for path tokenization
 */
export enum TokenType {
  // Structural tokens
  ROOT = 'ROOT',              // $
  DOT = 'DOT',                // .
  DOUBLE_DOT = 'DOUBLE_DOT',  // ..
  LBRACKET = 'LBRACKET',      // [
  RBRACKET = 'RBRACKET',      // ]

  // Value tokens
  IDENTIFIER = 'IDENTIFIER',  // property names
  NUMBER = 'NUMBER',          // numeric values
  STRING = 'STRING',          // string literals

  // Special tokens
  WILDCARD = 'WILDCARD',      // *
  COLON = 'COLON',            // : (for slices)
  COMMA = 'COMMA',            // , (for unions)
  QUESTION = 'QUESTION',      // ? (filter prefix)
  AT = 'AT',                  // @ (current item in filter)

  // Operators
  LPAREN = 'LPAREN',          // (
  RPAREN = 'RPAREN',          // )
  LBRACE = 'LBRACE',          // {
  RBRACE = 'RBRACE',          // }
  EQ = 'EQ',                  // ==
  NEQ = 'NEQ',                // !=
  GT = 'GT',                  // >
  LT = 'LT',                  // <
  GTE = 'GTE',                // >=
  LTE = 'LTE',                // <=
  AND = 'AND',                // &&
  OR = 'OR',                  // ||
  NOT = 'NOT',                // !

  // String operators
  CONTAINS = 'CONTAINS',      // contains
  STARTS_WITH = 'STARTS_WITH', // startsWith
  ENDS_WITH = 'ENDS_WITH',    // endsWith
  MATCHES = 'MATCHES',        // matches

  // Fuzzy operators
  FUZZY_EQ = 'FUZZY_EQ',              // ~=
  FUZZY_CONTAINS = 'FUZZY_CONTAINS',  // ~contains
  FUZZY_STARTS = 'FUZZY_STARTS',      // ~startsWith
  FUZZY_ENDS = 'FUZZY_ENDS',          // ~endsWith
  FUZZY_MATCH = 'FUZZY_MATCH',        // fuzzyMatch
  SOUNDS_LIKE = 'SOUNDS_LIKE',        // soundsLike
  SIMILAR = 'SIMILAR',                // similar

  // Temporal operators
  BEFORE = 'BEFORE',          // before
  AFTER = 'AFTER',            // after
  BETWEEN = 'BETWEEN',        // between
  DAYS_AGO = 'DAYS_AGO',      // daysAgo
  WEEKS_AGO = 'WEEKS_AGO',    // weeksAgo
  MONTHS_AGO = 'MONTHS_AGO',  // monthsAgo
  YEARS_AGO = 'YEARS_AGO',    // yearsAgo
  SAME_DAY = 'SAME_DAY',      // sameDay
  SAME_WEEK = 'SAME_WEEK',    // sameWeek
  SAME_MONTH = 'SAME_MONTH',  // sameMonth
  SAME_YEAR = 'SAME_YEAR',    // sameYear

  // Temporal literal
  TEMPORAL = 'TEMPORAL',      // @now, @2025-01-15, etc.

  // End of input
  EOF = 'EOF'
}

/**
 * Token representation
 */
export interface Token {
  type: TokenType;
  value: any;
  position: number;
  length: number;
}

/**
 * Parse context for error reporting
 */
export interface ParseContext {
  input: string;
  position: number;
  tokens: Token[];
  currentToken: number;
}

/**
 * Parse error with detailed context
 */
export class ParseError extends Error {
  public input: string;

  constructor(
    message: string,
    public context: ParseContext,
    public position: number
  ) {
    super(message);
    this.name = 'ParseError';
    this.input = context.input;
  }

  /**
   * Get a formatted error message with context
   */
  getFormattedMessage(): string {
    const { input, position } = this;
    const lineStart = Math.max(0, position - 20);
    const lineEnd = Math.min(input.length, position + 20);
    const snippet = input.slice(lineStart, lineEnd);
    const pointer = ' '.repeat(position - lineStart) + '^';

    return `${this.message}\n\n  ${snippet}\n  ${pointer}\n  at position ${position}`;
  }
}

/**
 * Options for path parsing
 */
export interface ParseOptions {
  /**
   * Whether to validate the AST after parsing
   * @default true
   */
  validate?: boolean;

  /**
   * Whether to allow partial paths (for auto-completion)
   * @default false
   */
  allowPartial?: boolean;

  /**
   * Maximum depth for recursive descent to prevent infinite loops
   * @default 100
   */
  maxRecursionDepth?: number;
}

/**
 * Result of path parsing
 */
export interface ParseResult {
  /**
   * The parsed AST nodes
   */
  ast: PathNode[];

  /**
   * Whether the parse was successful
   */
  success: boolean;

  /**
   * Error if parsing failed
   */
  error?: ParseError;

  /**
   * Original input string
   */
  input: string;
}
