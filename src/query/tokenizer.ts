/**
 * Tokenizer for TONL query path expressions
 *
 * Converts a path string into a stream of tokens for parsing.
 */

import { Token, TokenType, ParseError, ParseContext } from './types.js';

/**
 * Tokenize a path expression into tokens
 *
 * @param input - The path expression string
 * @returns Array of tokens
 * @throws ParseError if the input contains invalid syntax
 *
 * @example
 * ```typescript
 * const tokens = tokenize('user.name');
 * // Returns: [
 * //   { type: 'IDENTIFIER', value: 'user', position: 0, length: 4 },
 * //   { type: 'DOT', value: '.', position: 4, length: 1 },
 * //   { type: 'IDENTIFIER', value: 'name', position: 5, length: 4 },
 * //   { type: 'EOF', value: null, position: 9, length: 0 }
 * // ]
 * ```
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;

  const context: ParseContext = {
    input,
    position: 0,
    tokens: [],
    currentToken: 0
  };

  /**
   * Peek at the character at current position without consuming
   */
  function peek(offset: number = 0): string | null {
    const pos = position + offset;
    return pos < input.length ? input[pos] : null;
  }

  /**
   * Consume and return the character at current position
   */
  function consume(): string | null {
    if (position >= input.length) return null;
    return input[position++];
  }

  /**
   * Skip whitespace characters
   */
  function skipWhitespace(): void {
    while (position < input.length && /\s/.test(input[position])) {
      position++;
    }
  }

  /**
   * Read an identifier (property name or function name)
   */
  function readIdentifier(): Token {
    const start = position;
    let value = '';

    // First character must be letter, underscore, or $
    if (!/[a-zA-Z_$]/.test(input[position])) {
      throw new ParseError(
        `Expected identifier at position ${position}`,
        context,
        position
      );
    }

    // Subsequent characters can be letters, digits, underscores, or $
    while (position < input.length && /[a-zA-Z0-9_$]/.test(input[position])) {
      value += input[position++];
    }

    return {
      type: TokenType.IDENTIFIER,
      value,
      position: start,
      length: value.length
    };
  }

  /**
   * Read a number (for array indices or literal values)
   */
  function readNumber(): Token {
    const start = position;
    let value = '';

    // Handle negative sign
    if (peek() === '-') {
      value += consume();
    }

    // Read digits
    if (!/\d/.test(peek() || '')) {
      throw new ParseError(
        `Expected digit at position ${position}`,
        context,
        position
      );
    }

    while (position < input.length && /\d/.test(input[position])) {
      value += input[position++];
    }

    // Handle decimal numbers
    if (peek() === '.' && peek(1) && /\d/.test(peek(1)!)) {
      value += consume(); // consume '.'
      while (position < input.length && /\d/.test(input[position])) {
        value += input[position++];
      }
    }

    return {
      type: TokenType.NUMBER,
      value: parseFloat(value),
      position: start,
      length: value.length
    };
  }

  /**
   * Read a string literal (single or double quoted)
   */
  function readString(): Token {
    const start = position;
    const quote = consume(); // ' or "
    let value = '';
    let escaped = false;

    while (position < input.length) {
      const char = input[position];

      if (escaped) {
        // Handle escape sequences
        switch (char) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case quote: value += quote; break;
          default: value += '\\' + char;
        }
        escaped = false;
        position++;
      } else if (char === '\\') {
        escaped = true;
        position++;
      } else if (char === quote) {
        position++; // consume closing quote
        return {
          type: TokenType.STRING,
          value,
          position: start,
          length: position - start
        };
      } else {
        value += char;
        position++;
      }
    }

    throw new ParseError(
      `Unterminated string literal starting at position ${start}`,
      context,
      start
    );
  }

  /**
   * Read a two-character operator (==, !=, >=, <=, &&, ||, ..)
   */
  function readTwoCharOperator(): Token | null {
    const start = position;
    const twoChar = input.slice(position, position + 2);

    const tokenMap: Record<string, TokenType> = {
      '==': TokenType.EQ,
      '!=': TokenType.NEQ,
      '>=': TokenType.GTE,
      '<=': TokenType.LTE,
      '&&': TokenType.AND,
      '||': TokenType.OR,
      '..': TokenType.DOUBLE_DOT
    };

    if (tokenMap[twoChar]) {
      position += 2;
      return {
        type: tokenMap[twoChar],
        value: twoChar,
        position: start,
        length: 2
      };
    }

    return null;
  }

  /**
   * Main tokenization loop
   */
  while (position < input.length) {
    skipWhitespace();

    if (position >= input.length) break;

    const start = position;
    const char = peek();

    if (!char) break;

    // Try two-character operators first
    const twoCharToken = readTwoCharOperator();
    if (twoCharToken) {
      tokens.push(twoCharToken);
      continue;
    }

    // Single-character tokens
    switch (char) {
      case '$':
        // Check if this is ROOT ($) or start of identifier ($price)
        // If next char is identifier char, treat as identifier
        if (peek(1) && /[a-zA-Z_$]/.test(peek(1)!)) {
          tokens.push(readIdentifier());
        } else {
          // Standalone $, treat as ROOT
          tokens.push({
            type: TokenType.ROOT,
            value: '$',
            position: start,
            length: 1
          });
          consume();
        }
        break;

      case '.':
        tokens.push({
          type: TokenType.DOT,
          value: '.',
          position: start,
          length: 1
        });
        consume();
        break;

      case '[':
        tokens.push({
          type: TokenType.LBRACKET,
          value: '[',
          position: start,
          length: 1
        });
        consume();
        break;

      case ']':
        tokens.push({
          type: TokenType.RBRACKET,
          value: ']',
          position: start,
          length: 1
        });
        consume();
        break;

      case '*':
        tokens.push({
          type: TokenType.WILDCARD,
          value: '*',
          position: start,
          length: 1
        });
        consume();
        break;

      case ':':
        tokens.push({
          type: TokenType.COLON,
          value: ':',
          position: start,
          length: 1
        });
        consume();
        break;

      case ',':
        tokens.push({
          type: TokenType.COMMA,
          value: ',',
          position: start,
          length: 1
        });
        consume();
        break;

      case '?':
        tokens.push({
          type: TokenType.QUESTION,
          value: '?',
          position: start,
          length: 1
        });
        consume();
        break;

      case '@':
        tokens.push({
          type: TokenType.AT,
          value: '@',
          position: start,
          length: 1
        });
        consume();
        break;

      case '(':
        tokens.push({
          type: TokenType.LPAREN,
          value: '(',
          position: start,
          length: 1
        });
        consume();
        break;

      case ')':
        tokens.push({
          type: TokenType.RPAREN,
          value: ')',
          position: start,
          length: 1
        });
        consume();
        break;

      case '>':
        tokens.push({
          type: TokenType.GT,
          value: '>',
          position: start,
          length: 1
        });
        consume();
        break;

      case '<':
        tokens.push({
          type: TokenType.LT,
          value: '<',
          position: start,
          length: 1
        });
        consume();
        break;

      case '!':
        tokens.push({
          type: TokenType.NOT,
          value: '!',
          position: start,
          length: 1
        });
        consume();
        break;

      case '"':
      case "'":
        tokens.push(readString());
        break;

      default:
        // Check for number
        if (/\d/.test(char) || (char === '-' && peek(1) && /\d/.test(peek(1)!))) {
          tokens.push(readNumber());
        }
        // Check for identifier
        else if (/[a-zA-Z_$]/.test(char)) {
          tokens.push(readIdentifier());
        }
        // Unknown character
        else {
          throw new ParseError(
            `Unexpected character '${char}' at position ${position}`,
            context,
            position
          );
        }
    }
  }

  // Add EOF token
  tokens.push({
    type: TokenType.EOF,
    value: null,
    position,
    length: 0
  });

  context.tokens = tokens;
  return tokens;
}

/**
 * Check if a token is of a specific type
 */
export function isTokenType(token: Token, type: TokenType): boolean {
  return token.type === type;
}

/**
 * Check if a token is an operator
 */
export function isOperator(token: Token): boolean {
  const operatorTypes = [
    TokenType.EQ, TokenType.NEQ,
    TokenType.GT, TokenType.LT,
    TokenType.GTE, TokenType.LTE,
    TokenType.AND, TokenType.OR,
    TokenType.NOT
  ];

  return operatorTypes.includes(token.type);
}

/**
 * Get the precedence of an operator token
 * Higher number = higher precedence
 */
export function getOperatorPrecedence(token: Token): number {
  const precedence: Partial<Record<TokenType, number>> = {
    [TokenType.OR]: 1,
    [TokenType.AND]: 2,
    [TokenType.EQ]: 3,
    [TokenType.NEQ]: 3,
    [TokenType.GT]: 4,
    [TokenType.LT]: 4,
    [TokenType.GTE]: 4,
    [TokenType.LTE]: 4,
    [TokenType.NOT]: 5
  };

  return precedence[token.type] || 0;
}
