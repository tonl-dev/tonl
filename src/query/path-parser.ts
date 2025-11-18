/**
 * Path expression parser for TONL query API
 *
 * Converts tokenized path expressions into Abstract Syntax Trees (AST)
 */

import {
  PathNode,
  Token,
  TokenType,
  ParseError,
  ParseContext,
  ParseOptions,
  ParseResult,
  RootNode,
  PropertyNode,
  IndexNode,
  WildcardNode,
  RecursiveNode,
  SliceNode,
  FilterNode,
  FilterExpression,
  BinaryExpression,
  UnaryExpression,
  LiteralExpression,
  PropertyExpression,
  FunctionExpression,
  BinaryOperator,
  UnaryOperator
} from './types.js';
import { tokenize, getOperatorPrecedence } from './tokenizer.js';

/**
 * Parse a path expression string into an AST
 *
 * @param input - The path expression string (e.g., "users[0].name" or "$..email")
 * @param options - Parse options
 * @returns Parse result with AST or error
 *
 * @example
 * ```typescript
 * const result = parsePath('users[?(@.age > 18)].name');
 * if (result.success) {
 *   console.log(result.ast);
 * } else {
 *   console.error(result.error?.getFormattedMessage());
 * }
 * ```
 */
export function parsePath(input: string, options: ParseOptions = {}): ParseResult {
  const {
    validate = true,
    allowPartial = false,
    maxRecursionDepth = 100
  } = options;

  try {
    const tokens = tokenize(input);
    const context: ParseContext = {
      input,
      position: 0,
      tokens,
      currentToken: 0
    };

    const parser = new PathParser(context, { allowPartial, maxRecursionDepth });
    const ast = parser.parse();

    // Validate AST if requested
    if (validate && ast.length > 0) {
      validateAST(ast, maxRecursionDepth);
    }

    return {
      ast,
      success: true,
      input
    };
  } catch (error) {
    if (error instanceof ParseError) {
      return {
        ast: [],
        success: false,
        error,
        input
      };
    }
    throw error;
  }
}

/**
 * Path parser class - handles the parsing logic
 */
class PathParser {
  private currentIndex: number = 0;

  constructor(
    private context: ParseContext,
    private options: { allowPartial: boolean; maxRecursionDepth: number }
  ) {}

  /**
   * Get the current token
   * BUG-NEW-003 FIX: Add explicit empty array check
   */
  private current(): Token {
    if (this.context.tokens.length === 0) {
      throw new Error('Cannot get current token: token array is empty');
    }
    return this.context.tokens[this.currentIndex] || this.context.tokens[this.context.tokens.length - 1];
  }

  /**
   * Peek at the next token without consuming
   */
  private peek(offset: number = 1): Token | null {
    const index = this.currentIndex + offset;
    return index < this.context.tokens.length ? this.context.tokens[index] : null;
  }

  /**
   * Consume and return the current token
   */
  private consume(): Token {
    const token = this.current();
    this.currentIndex++;
    return token;
  }

  /**
   * Check if current token is of specific type
   */
  private match(...types: TokenType[]): boolean {
    const current = this.current();
    return types.includes(current.type);
  }

  /**
   * Expect a specific token type and consume it
   */
  private expect(type: TokenType, message?: string): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new ParseError(
        message || `Expected ${type} but got ${token.type}`,
        this.context,
        token.position
      );
    }
    return this.consume();
  }

  /**
   * Main parse method - parses the entire path
   */
  parse(): PathNode[] {
    const nodes: PathNode[] = [];

    // Handle optional root ($)
    if (this.match(TokenType.ROOT)) {
      const rootToken = this.consume();
      nodes.push({
        type: 'root',
        symbol: '$'
      } as RootNode);
    }

    // Parse path segments
    while (!this.match(TokenType.EOF)) {
      // Check for double dot (recursive descent)
      if (this.match(TokenType.DOUBLE_DOT)) {
        nodes.push(this.parseRecursive());
        continue;
      }

      // Check for dot (property access)
      if (this.match(TokenType.DOT)) {
        this.consume(); // consume dot

        if (this.match(TokenType.IDENTIFIER)) {
          nodes.push(this.parseProperty());
        } else if (this.match(TokenType.WILDCARD)) {
          this.consume();
          nodes.push({ type: 'wildcard' } as WildcardNode);
        } else if (!this.match(TokenType.EOF)) {
          throw new ParseError(
            'Expected property name or wildcard after dot',
            this.context,
            this.current().position
          );
        }
        continue;
      }

      // Check for bracket notation [...]
      if (this.match(TokenType.LBRACKET)) {
        nodes.push(this.parseBracketNotation());
        continue;
      }

      // If no root and first token is identifier, treat as property
      if (nodes.length === 0 && this.match(TokenType.IDENTIFIER)) {
        nodes.push(this.parseProperty());
        continue;
      }

      // If no root and first token is wildcard, allow it
      if (nodes.length === 0 && this.match(TokenType.WILDCARD)) {
        this.consume();
        nodes.push({ type: 'wildcard' } as WildcardNode);
        continue;
      }

      // If we reach here and not EOF, unexpected token
      if (!this.match(TokenType.EOF)) {
        const token = this.current();
        throw new ParseError(
          `Unexpected token: ${token.type}`,
          this.context,
          token.position
        );
      }

      break;
    }

    return nodes;
  }

  /**
   * Parse a property access
   */
  private parseProperty(): PropertyNode {
    const token = this.expect(TokenType.IDENTIFIER);
    return {
      type: 'property',
      name: token.value
    };
  }

  /**
   * Parse recursive descent (..)
   */
  private parseRecursive(): RecursiveNode {
    this.expect(TokenType.DOUBLE_DOT);

    // Check if there's a specific property name
    if (this.match(TokenType.IDENTIFIER)) {
      const token = this.consume();
      return {
        type: 'recursive',
        name: token.value
      };
    }

    // Check for wildcard (..*)
    if (this.match(TokenType.WILDCARD)) {
      this.consume();
      // For wildcard recursive, we return recursive with no name
      // and let the evaluator handle the wildcard matching
    }

    return {
      type: 'recursive'
    };
  }

  /**
   * Parse bracket notation [...]
   * Can be: index, slice, wildcard, or filter
   */
  private parseBracketNotation(): PathNode {
    this.expect(TokenType.LBRACKET);

    // Check for wildcard
    if (this.match(TokenType.WILDCARD)) {
      this.consume();
      this.expect(TokenType.RBRACKET);
      return { type: 'wildcard' } as WildcardNode;
    }

    // Check for filter [?(...)]
    if (this.match(TokenType.QUESTION)) {
      return this.parseFilter();
    }

    // Check for slice or index
    const firstToken = this.current();

    if (this.match(TokenType.NUMBER)) {
      const num = this.consume();
      const index = num.value as number;

      // Check if this is a slice [start:end:step]
      if (this.match(TokenType.COLON)) {
        return this.parseSlice(index);
      }

      // Simple index
      this.expect(TokenType.RBRACKET);
      return {
        type: 'index',
        index
      } as IndexNode;
    }

    // Slice starting with colon [:end] or [::step]
    if (this.match(TokenType.COLON)) {
      return this.parseSlice(undefined);
    }

    throw new ParseError(
      'Expected number, wildcard, or filter in bracket notation',
      this.context,
      firstToken.position
    );
  }

  /**
   * Parse array slice [start:end:step]
   */
  private parseSlice(start?: number): SliceNode {
    let end: number | undefined = undefined;
    let step: number | undefined = undefined;

    // First colon (between start and end)
    this.expect(TokenType.COLON);

    // Check for end value
    if (this.match(TokenType.NUMBER)) {
      end = this.consume().value as number;
    }

    // Check for step (second colon)
    if (this.match(TokenType.COLON)) {
      this.consume();
      if (this.match(TokenType.NUMBER)) {
        step = this.consume().value as number;
      }
    }

    this.expect(TokenType.RBRACKET);

    return {
      type: 'slice',
      start,
      end,
      step
    };
  }

  /**
   * Parse filter expression [?(...)]
   */
  private parseFilter(): FilterNode {
    this.expect(TokenType.QUESTION);
    this.expect(TokenType.LPAREN);

    const expression = this.parseFilterExpression();

    this.expect(TokenType.RPAREN);
    this.expect(TokenType.RBRACKET);

    return {
      type: 'filter',
      expression
    };
  }

  /**
   * Parse filter expression with operator precedence
   */
  private parseFilterExpression(minPrecedence: number = 0): FilterExpression {
    let left = this.parseFilterPrimary();

    while (true) {
      const token = this.current();

      // Check if it's a binary operator
      if (!this.isFilterBinaryOperator(token.type)) {
        break;
      }

      const precedence = getOperatorPrecedence(token);
      if (precedence < minPrecedence) {
        break;
      }

      const operator = this.consume();
      const right = this.parseFilterExpression(precedence + 1);

      left = {
        type: 'binary',
        operator: this.tokenTypeToBinaryOperator(operator.type),
        left,
        right
      } as BinaryExpression;
    }

    return left;
  }

  /**
   * Parse primary filter expression (literals, properties, unary operations)
   */
  private parseFilterPrimary(): FilterExpression {
    // Handle parentheses
    if (this.match(TokenType.LPAREN)) {
      this.consume();
      const expr = this.parseFilterExpression();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    // Handle unary operators (! for NOT)
    if (this.match(TokenType.NOT)) {
      const operator = this.consume();
      const argument = this.parseFilterPrimary();
      return {
        type: 'unary',
        operator: '!' as UnaryOperator,
        argument
      } as UnaryExpression;
    }

    // Handle @ (current item property access)
    if (this.match(TokenType.AT)) {
      return this.parsePropertyExpression();
    }

    // Handle literals
    if (this.match(TokenType.NUMBER, TokenType.STRING)) {
      const token = this.consume();
      return {
        type: 'literal',
        value: token.value
      } as LiteralExpression;
    }

    // Handle identifiers (could be function names or keywords)
    if (this.match(TokenType.IDENTIFIER)) {
      const token = this.peek();
      if (token && token.type === TokenType.LPAREN) {
        return this.parseFunctionExpression();
      }

      // Keywords: true, false, null
      const identifier = this.consume();
      if (identifier.value === 'true') {
        return { type: 'literal', value: true } as LiteralExpression;
      }
      if (identifier.value === 'false') {
        return { type: 'literal', value: false } as LiteralExpression;
      }
      if (identifier.value === 'null') {
        return { type: 'literal', value: null } as LiteralExpression;
      }

      throw new ParseError(
        `Unexpected identifier in filter: ${identifier.value}`,
        this.context,
        identifier.position
      );
    }

    throw new ParseError(
      `Expected filter expression but got ${this.current().type}`,
      this.context,
      this.current().position
    );
  }

  /**
   * Parse property expression (@.property.path)
   */
  private parsePropertyExpression(): PropertyExpression {
    this.expect(TokenType.AT);
    const pathParts: string[] = [];

    while (this.match(TokenType.DOT)) {
      this.consume();
      if (this.match(TokenType.IDENTIFIER)) {
        pathParts.push(this.consume().value);
      } else {
        throw new ParseError(
          'Expected property name after dot',
          this.context,
          this.current().position
        );
      }
    }

    return {
      type: 'property',
      path: pathParts.join('.')
    };
  }

  /**
   * Parse function expression (funcName(arg1, arg2, ...))
   */
  private parseFunctionExpression(): FunctionExpression {
    const nameToken = this.expect(TokenType.IDENTIFIER);
    this.expect(TokenType.LPAREN);

    const args: FilterExpression[] = [];

    if (!this.match(TokenType.RPAREN)) {
      args.push(this.parseFilterExpression());

      while (this.match(TokenType.COMMA)) {
        this.consume();
        args.push(this.parseFilterExpression());
      }
    }

    this.expect(TokenType.RPAREN);

    return {
      type: 'function',
      name: nameToken.value,
      arguments: args
    };
  }

  /**
   * Check if token type is a binary operator in filter expressions
   */
  private isFilterBinaryOperator(type: TokenType): boolean {
    return [
      TokenType.EQ, TokenType.NEQ,
      TokenType.GT, TokenType.LT,
      TokenType.GTE, TokenType.LTE,
      TokenType.AND, TokenType.OR,
      TokenType.CONTAINS, TokenType.STARTS_WITH,
      TokenType.ENDS_WITH, TokenType.MATCHES
    ].includes(type);
  }

  /**
   * Convert token type to binary operator
   */
  private tokenTypeToBinaryOperator(type: TokenType): BinaryOperator {
    const map: Partial<Record<TokenType, BinaryOperator>> = {
      [TokenType.EQ]: '==',
      [TokenType.NEQ]: '!=',
      [TokenType.GT]: '>',
      [TokenType.LT]: '<',
      [TokenType.GTE]: '>=',
      [TokenType.LTE]: '<=',
      [TokenType.AND]: '&&',
      [TokenType.OR]: '||',
      [TokenType.CONTAINS]: 'contains',
      [TokenType.STARTS_WITH]: 'startsWith',
      [TokenType.ENDS_WITH]: 'endsWith',
      [TokenType.MATCHES]: 'matches'
    };

    return map[type] || '==';
  }
}

/**
 * Validate the generated AST
 */
function validateAST(ast: PathNode[], maxDepth: number): void {
  // Check for excessive recursion
  const recursiveCount = ast.filter(node => node.type === 'recursive').length;
  if (recursiveCount > 10) {
    throw new Error('Too many recursive descent operators in path');
  }

  // Validate each node
  for (const node of ast) {
    validateNode(node);
  }
}

/**
 * Validate a single AST node
 */
function validateNode(node: PathNode): void {
  switch (node.type) {
    case 'property':
      if (!node.name || node.name.length === 0) {
        throw new Error('Property node must have a non-empty name');
      }
      break;

    case 'index':
      if (!Number.isInteger(node.index)) {
        throw new Error('Index must be an integer');
      }
      break;

    case 'slice':
      if (node.start !== undefined && !Number.isInteger(node.start)) {
        throw new Error('Slice start must be an integer');
      }
      if (node.end !== undefined && !Number.isInteger(node.end)) {
        throw new Error('Slice end must be an integer');
      }
      if (node.step !== undefined && !Number.isInteger(node.step)) {
        throw new Error('Slice step must be an integer');
      }
      if (node.step === 0) {
        throw new Error('Slice step cannot be zero');
      }
      break;

    case 'filter':
      validateFilterExpression(node.expression);
      break;

    case 'root':
    case 'wildcard':
    case 'recursive':
      // These nodes don't need special validation
      break;

    default:
      throw new Error(`Unknown node type: ${(node as any).type}`);
  }
}

/**
 * Validate a filter expression
 */
function validateFilterExpression(expr: FilterExpression): void {
  switch (expr.type) {
    case 'binary':
      validateFilterExpression(expr.left);
      validateFilterExpression(expr.right);
      break;

    case 'unary':
      validateFilterExpression(expr.argument);
      break;

    case 'function':
      for (const arg of expr.arguments) {
        validateFilterExpression(arg);
      }
      break;

    case 'literal':
    case 'property':
      // These are valid as-is
      break;

    default:
      throw new Error(`Unknown filter expression type: ${(expr as any).type}`);
  }
}
