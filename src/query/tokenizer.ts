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

    // Check if it's a keyword operator
    const keywordMap: Record<string, TokenType> = {
      // String operators
      'contains': TokenType.CONTAINS,
      'startsWith': TokenType.STARTS_WITH,
      'endsWith': TokenType.ENDS_WITH,
      'matches': TokenType.MATCHES,
      // Fuzzy operators
      'fuzzyMatch': TokenType.FUZZY_MATCH,
      'soundsLike': TokenType.SOUNDS_LIKE,
      'similar': TokenType.SIMILAR,
      // Temporal operators
      'before': TokenType.BEFORE,
      'after': TokenType.AFTER,
      'between': TokenType.BETWEEN,
      'daysAgo': TokenType.DAYS_AGO,
      'weeksAgo': TokenType.WEEKS_AGO,
      'monthsAgo': TokenType.MONTHS_AGO,
      'yearsAgo': TokenType.YEARS_AGO,
      'sameDay': TokenType.SAME_DAY,
      'sameWeek': TokenType.SAME_WEEK,
      'sameMonth': TokenType.SAME_MONTH,
      'sameYear': TokenType.SAME_YEAR
    };

    const tokenType = keywordMap[value] || TokenType.IDENTIFIER;

    return {
      type: tokenType,
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

    // Handle sign
    if (peek() === '-' || peek() === '+') {
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

    // Handle scientific notation (e/E followed by sign and digits)
    if (peek() === 'e' || peek() === 'E') {
      value += consume(); // consume 'e' or 'E'

      // Optional sign in exponent
      if (peek() === '+' || peek() === '-') {
        value += consume();
      }

      // At least one digit required in exponent
      if (!/\d/.test(peek() || '')) {
        throw new ParseError(
          `Expected digit in exponent at position ${position}`,
          context,
          position
        );
      }

      while (position < input.length && /\d/.test(input[position])) {
        value += input[position++];
      }
    }

    // BUGFIX BUG-F003: Validate parseFloat result to prevent NaN/Infinity
    const numValue = parseFloat(value);
    if (!Number.isFinite(numValue)) {
      throw new ParseError(
        `Invalid number value: ${value}`,
        context,
        start
      );
    }

    return {
      type: TokenType.NUMBER,
      value: numValue,
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
   * Read a two-character operator (==, !=, >=, <=, &&, ||, .., ~=)
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
      '..': TokenType.DOUBLE_DOT,
      '~=': TokenType.FUZZY_EQ
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
   * Read a fuzzy keyword operator (~contains, ~startsWith, ~endsWith)
   */
  function readFuzzyKeyword(): Token | null {
    if (peek() !== '~') return null;

    const start = position;

    // Check for ~keyword patterns
    const fuzzyPatterns: Record<string, TokenType> = {
      '~contains': TokenType.FUZZY_CONTAINS,
      '~startsWith': TokenType.FUZZY_STARTS,
      '~endsWith': TokenType.FUZZY_ENDS
    };

    for (const [pattern, tokenType] of Object.entries(fuzzyPatterns)) {
      if (input.slice(position, position + pattern.length) === pattern) {
        // Make sure it's not followed by alphanumeric (not part of longer identifier)
        const nextChar = input[position + pattern.length];
        if (!nextChar || !/[a-zA-Z0-9_]/.test(nextChar)) {
          position += pattern.length;
          return {
            type: tokenType,
            value: pattern,
            position: start,
            length: pattern.length
          };
        }
      }
    }

    return null;
  }

  /**
   * Read a temporal literal (@now, @2025-01-15, @now-7d, etc.)
   */
  function readTemporalLiteral(): Token | null {
    if (peek() !== '@') return null;

    const start = position;
    const nextChar = peek(1);

    // Check if this looks like a temporal literal
    // (not just @ for current item in filter)
    if (nextChar && /[a-zA-Z0-9]/.test(nextChar)) {
      consume(); // consume @
      let value = '@';

      // Read until we hit a non-temporal character
      // Allow: letters, digits, -, +, :, .
      while (position < input.length) {
        const char = input[position];
        if (/[a-zA-Z0-9\-+:.]/.test(char)) {
          value += char;
          position++;
        } else {
          break;
        }
      }

      // Validate it looks like a temporal literal
      const content = value.substring(1).toLowerCase();
      const isTemporalPattern =
        // Named dates
        ['now', 'today', 'yesterday', 'tomorrow'].some(n => content.startsWith(n)) ||
        // ISO date pattern
        /^\d{4}(-\d{2})?(-\d{2})?(t\d{2}:\d{2})?/i.test(content) ||
        // Duration pattern
        /^p\d/i.test(content);

      if (isTemporalPattern) {
        return {
          type: TokenType.TEMPORAL,
          value,
          position: start,
          length: value.length
        };
      } else {
        // Not a temporal literal, reset and return null
        position = start;
        return null;
      }
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

    // Try fuzzy keyword operators first (~contains, ~startsWith, ~endsWith)
    const fuzzyToken = readFuzzyKeyword();
    if (fuzzyToken) {
      tokens.push(fuzzyToken);
      continue;
    }

    // Try two-character operators (==, !=, >=, <=, &&, ||, .., ~=)
    const twoCharToken = readTwoCharOperator();
    if (twoCharToken) {
      tokens.push(twoCharToken);
      continue;
    }

    // Try temporal literals (@now, @2025-01-15, etc.)
    const temporalToken = readTemporalLiteral();
    if (temporalToken) {
      tokens.push(temporalToken);
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

      case '{':
        tokens.push({
          type: TokenType.LBRACE,
          value: '{',
          position: start,
          length: 1
        });
        consume();
        break;

      case '}':
        tokens.push({
          type: TokenType.RBRACE,
          value: '}',
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
    [TokenType.CONTAINS]: 4,
    [TokenType.STARTS_WITH]: 4,
    [TokenType.ENDS_WITH]: 4,
    [TokenType.MATCHES]: 4,
    // Fuzzy operators
    [TokenType.FUZZY_EQ]: 4,
    [TokenType.FUZZY_CONTAINS]: 4,
    [TokenType.FUZZY_STARTS]: 4,
    [TokenType.FUZZY_ENDS]: 4,
    [TokenType.FUZZY_MATCH]: 4,
    [TokenType.SOUNDS_LIKE]: 4,
    [TokenType.SIMILAR]: 4,
    // Temporal operators
    [TokenType.BEFORE]: 4,
    [TokenType.AFTER]: 4,
    [TokenType.BETWEEN]: 4,
    [TokenType.DAYS_AGO]: 4,
    [TokenType.WEEKS_AGO]: 4,
    [TokenType.MONTHS_AGO]: 4,
    [TokenType.YEARS_AGO]: 4,
    [TokenType.SAME_DAY]: 4,
    [TokenType.SAME_WEEK]: 4,
    [TokenType.SAME_MONTH]: 4,
    [TokenType.SAME_YEAR]: 4,
    [TokenType.NOT]: 5
  };

  return precedence[token.type] || 0;
}
