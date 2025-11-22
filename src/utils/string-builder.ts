/**
 * String Builder Utility
 * Efficient string concatenation for large text operations
 * Backward compatible performance optimization
 */

/**
 * High-performance string builder for concatenation operations
 */
export class StringBuilder {
  private chunks: string[] = [];

  /**
   * Append text to the builder
   * @param text - Text to append
   * @returns This builder instance for chaining
   */
  append(text: string): this {
    this.chunks.push(text);
    return this;
  }

  /**
   * Append text with a newline
   * @param text - Text to append (optional)
   * @returns This builder instance for chaining
   */
  appendLine(text: string = ''): this {
    this.chunks.push(text + '\n');
    return this;
  }

  /**
   * Append multiple strings efficiently
   * @param texts - Array of strings to append
   * @returns This builder instance for chaining
   */
  appendMany(texts: string[]): this {
    this.chunks.push(...texts);
    return this;
  }

  /**
   * Insert text at a specific position
   * @param index - Position to insert at
   * @param text - Text to insert
   * @returns This builder instance for chaining
   */
  insert(index: number, text: string): this {
    this.chunks.splice(index, 0, text);
    return this;
  }

  /**
   * Remove characters from a range
   * @param start - Start position
   * @param length - Length to remove
   * @returns This builder instance for chaining
   */
  remove(start: number, length: number): this {
    const currentString = this.toString();
    this.chunks = [currentString.slice(0, start) + currentString.slice(start + length)];
    return this;
  }

  /**
   * Get the current length of the built string
   * @returns Current length
   */
  getLength(): number {
    return this.chunks.reduce((total, chunk) => total + chunk.length, 0);
  }

  /**
   * Check if the builder is empty
   * @returns True if no content has been added
   */
  isEmpty(): boolean {
    return this.chunks.length === 0 || this.getLength() === 0;
  }

  /**
   * Clear all content from the builder
   * @returns This builder instance for chaining
   */
  clear(): this {
    this.chunks.length = 0;
    return this;
  }

  /**
   * Build and return the final string
   * @returns The concatenated string
   */
  toString(): string {
    return this.chunks.join('');
  }

  /**
   * Build and return the final string, then clear the builder
   * @returns The concatenated string
   */
  buildAndClear(): string {
    const result = this.chunks.join('');
    this.chunks.length = 0;
    return result;
  }

  /**
   * Get the number of chunks
   * @returns Number of chunks
   */
  getChunkCount(): number {
    return this.chunks.length;
  }

  /**
   * Repeat a string multiple times efficiently
   * @param text - Text to repeat
   * @param count - Number of times to repeat
   * @returns This builder instance for chaining
   */
  repeat(text: string, count: number): this {
    if (count <= 0) return this;

    // For large counts, use exponential growth
    if (count > 100) {
      let current = text;
      let remaining = count;

      while (remaining > 0) {
        if (remaining % 2 === 1) {
          this.chunks.push(current);
        }
        current += current;
        remaining = Math.floor(remaining / 2);
      }
    } else {
      // For small counts, just push
      for (let i = 0; i < count; i++) {
        this.chunks.push(text);
      }
    }

    return this;
  }

  /**
   * Pad the string with characters
   * @param char - Character to pad with
   * @param length - Target length
   * @param align - Alignment ('left', 'right', 'center')
   * @returns This builder instance for chaining
   */
  pad(char: string, length: number, align: 'left' | 'right' | 'center' = 'right'): this {
    const currentLength = this.getLength();
    const paddingNeeded = Math.max(0, length - currentLength);

    if (paddingNeeded === 0) return this;

    const padding = char.repeat(paddingNeeded);

    switch (align) {
      case 'left':
        this.chunks.unshift(padding);
        break;
      case 'right':
        this.chunks.push(padding);
        break;
      case 'center':
        const leftPad = char.repeat(Math.floor(paddingNeeded / 2));
        const rightPad = char.repeat(Math.ceil(paddingNeeded / 2));
        this.chunks.unshift(leftPad);
        this.chunks.push(rightPad);
        break;
    }

    return this;
  }
}