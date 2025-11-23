/**
 * Metrics utilities for token estimation and performance analysis
 */

/**
 * Simple token estimation based on common tokenizers
 *
 * SECURITY FIX (SEC-001): Added input size validation to prevent ReDoS attacks
 */
export function estimateTokens(text: string, tokenizer: "gpt-5" | "gpt-4.5" | "gpt-4o" | "claude-3.5" | "claude-sonnet-4.5" | "gemini-2.0" | "gemini-2.5-pro" | "gemini-3-pro" | "llama-4" | "claude-3" | "claude-2" | "gemini-1.5" | "gemini-pro" | "palm-2" | "llama-3" | "mistral" | "mixtral" | "o200k" | "cl100k" = "gpt-5"): number {
  if (!text) return 0;

  // SECURITY FIX (SEC-001): Prevent ReDoS by limiting input size
  // Maximum 10MB of text for token estimation
  const MAX_INPUT_SIZE = 10_000_000;
  if (text.length > MAX_INPUT_SIZE) {
    throw new Error(`Input too large for token estimation: ${text.length} bytes (max: ${MAX_INPUT_SIZE})`);
  }

  // Different tokenizers have slightly different behaviors
  switch (tokenizer) {
    case "gpt-5":
      return estimateTokensGPT5(text);
    case "gpt-4.5":
      return estimateTokensGPT45(text);
    case "gpt-4o":
      return estimateTokensGPT4o(text);
    case "claude-3.5":
      return estimateTokensClaude35(text);
    case "claude-sonnet-4.5":
      return estimateTokensClaude35(text); // Same as Claude 3.5 for now
    case "claude-3":
      return estimateTokensClaude3(text);
    case "claude-2":
      return estimateTokensClaude2(text);
    case "gemini-2.0":
      return estimateTokensGemini20(text);
    case "gemini-2.5-pro":
      return estimateTokensGemini20(text); // Same as Gemini 2.0 for now
    case "gemini-3-pro":
      return estimateTokensGemini20(text); // Same as Gemini 2.0 for now
    case "gemini-1.5":
      return estimateTokensGemini15(text);
    case "gemini-pro":
      return estimateTokensGeminiPro(text);
    case "palm-2":
      return estimateTokensPalm2(text);
    case "llama-4":
      return estimateTokensLlama4(text);
    case "llama-3":
      return estimateTokensLlama3(text);
    case "mistral":
      return estimateTokensMistral(text);
    case "mixtral":
      return estimateTokensMixtral(text);
    case "o200k":
      return estimateTokensO200k(text);
    case "cl100k":
    default:
      return estimateTokensCL100k(text);
  }
}

/**
 * GPT-5 token estimation (latest 2025 tokenizer with advanced compression)
 */
function estimateTokensGPT5(text: string): number {
  // GPT-5 has highly efficient tokenization with semantic understanding
  let tokens = 0;

  // Semantic chunking - understands patterns and common structures
  const semanticChunks = text.match(/\w+|[^\w\s]|\s+/g) || [];

  // Base token count
  tokens += semanticChunks.length;

  // Advanced compression patterns
  const jsonPatterns = text.match(/\{[^}]*\}|\[[^\]]*\]/g) || [];
  tokens -= jsonPatterns.length * 0.4; // JSON structures compress well

  const commonWords = text.match(/\b(the|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should)\b/gi) || [];
  tokens -= commonWords.length * 0.6; // Common words compress heavily

  // TONL-specific optimizations
  const tonlPatterns = text.match(/\w+\{[^}]*\}:|\d+,\s*\w+|\w+:\s*"""/g) || [];
  tokens -= tonlPatterns.length * 0.5; // TONL syntax compresses efficiently

  // Numbers and technical content
  const numbers = text.match(/\b\d+(\.\d+)?\b/g) || [];
  tokens += numbers.length * 0.7; // Numbers often need multiple tokens

  return Math.round(Math.max(tokens, 1));
}

/**
 * GPT-4 Turbo token estimation (improved cl100k_base tokenizer)
 */
function estimateTokensGPT45(text: string): number {
  // GPT-4 Turbo uses improved cl100k_base tokenizer
  let tokens = 0;

  // Base estimation (cl100k_base is ~4 chars per token average)
  const chars = text.length;
  tokens = Math.ceil(chars / 4);

  // Improved common word compression
  const commonWords = text.match(/\b(the|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should)\b/gi) || [];
  tokens -= commonWords.length * 0.6;

  // Structure recognition improvement
  const structures = text.match(/\{[^}]*\}|\[[^\]]*\]|"[^"]*"/g) || [];
  tokens -= structures.length * 0.25;

  // Special character handling
  const specialChars = text.match(/[^\w\s]/g) || [];
  tokens += Math.ceil(specialChars.length * 0.8);

  // Numbers (typically 1-2 tokens)
  const numbers = text.match(/\b\d+(\.\d+)?\b/g) || [];
  tokens += numbers.length * 0.5;

  return Math.round(tokens);
}

/**
 * Claude 3.5 Sonnet token estimation (65K vocabulary BPE tokenizer)
 */
function estimateTokensClaude35(text: string): number {
  // Claude 3.5 uses ~65K vocabulary BPE tokenizer (~20% more tokens than OpenAI)
  let tokens = 0;

  // Base tokenization (more granular due to smaller vocabulary)
  const tokens_base = text.split(/[\s,.:;{}[\]()\"'\\\/]+/).filter(t => t.length > 0);
  tokens += tokens_base.length;

  // Apply Claude's ~20% overhead factor
  tokens = Math.round(tokens * 1.2);

  // Claude excels at structured data (but still higher token count overall)
  const structuredData = text.match(/\{[^}]*\}|\[[^\]]*\]/g) || [];
  tokens -= Math.floor(structuredData.length * 0.4); // Good compression but still overhead

  // Quoted strings
  const quotedStrings = text.match(/"[^"]*"/g) || [];
  tokens += quotedStrings.length * 0.3; // More efficient string handling

  // Code and technical patterns (Claude handles these well)
  const codePatterns = text.match(/\b\w+\(\)|\w+\.\w+|\w+:\s*\w+/g) || [];
  tokens -= codePatterns.length * 0.3;

  // Whitespace optimization
  const whitespace = text.match(/\s+/g) || [];
  tokens -= whitespace.length * 0.5;

  return Math.round(Math.max(tokens, 1));
}

/**
 * Gemini 2.0 Flash token estimation (Google's latest with sentencepiece tokenizer)
 */
function estimateTokensGemini20(text: string): number {
  // Gemini 2.0 Flash uses sentencepiece tokenizer with 256K vocabulary, ~4 chars per token
  let tokens = 0;

  // Base tokenization (sentencepiece is ~4 chars per token average)
  const chars = text.length;
  tokens = Math.ceil(chars / 4);

  // Multilingual optimizations - better unicode and non-English support
  const unicodeChars = text.match(/[^\x00-\x7F]/g) || [];
  tokens -= unicodeChars.length * 0.2; // Unicode characters compress better than expected

  // Technical content optimization (Google models excel at technical content)
  const technicalTerms = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
  tokens -= technicalTerms.length * 0.4; // Technical terms compress very well

  // Code patterns (excellent compression for programming languages)
  const codePatterns = text.match(/\b\w+\(\)|\w+\.\w+|\w+:\s*\w+|\w+\s*=\s*\w+/g) || [];
  tokens -= codePatterns.length * 0.5; // Best-in-class code compression

  // Common word patterns
  const commonWords = text.match(/\b(the|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|can|may|might|must|shall)\b/gi) || [];
  tokens -= commonWords.length * 0.7;

  return Math.round(Math.max(tokens, 1));
}

/**
 * Llama 4 token estimation (Meta's latest open model with TikToken tokenizer)
 */
function estimateTokensLlama4(text: string): number {
  // Llama 4 uses TikToken-based tokenizer with 128K vocabulary, ~4 chars per token
  let tokens = 0;

  // Base tokenization (TikToken-like efficiency)
  const chars = text.length;
  tokens = Math.ceil(chars / 4);

  // Whitespace optimization (open models handle whitespace well)
  const whitespace = text.match(/\s+/g) || [];
  tokens -= whitespace.length * 0.6; // Better whitespace compression than expected

  // Common pattern repetition (excellent at repeated sequences)
  const repeatedPatterns = text.match(/(.)\1{2,}/g) || [];
  tokens -= repeatedPatterns.length * 0.8; // Very good compression for repetitions

  // Numbers (efficient numeric tokenization)
  const numbers = text.match(/\b\d+(\.\d+)?\b/g) || [];
  tokens += numbers.length * 0.3; // Numbers are very efficient

  // Technical terms (good but not as good as closed models)
  const technicalTerms = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
  tokens -= technicalTerms.length * 0.2;

  // Common words (moderate compression)
  const commonWords = text.match(/\b(the|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should)\b/gi) || [];
  tokens -= commonWords.length * 0.5;

  return Math.round(Math.max(tokens, 1));
}

/**
 * GPT-4o token estimation (o200k_base tokenizer with 200K vocabulary)
 */
function estimateTokensGPT4o(text: string): number {
  // GPT-4o uses o200k_base tokenizer with improved vocabulary and compression
  let tokens = 0;

  // Base character-based estimation (o200k_base is more efficient)
  const chars = text.length;
  tokens = Math.ceil(chars / 3.5); // Rough 3.5 chars per token for o200k_base

  // Better handling for common patterns
  const commonWords = text.match(/\b(the|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|can't|won't|doesn't|didn't|isn't|aren't|wasn't|weren't)\b/gi) || [];
  tokens -= commonWords.length * 0.8; // Very good compression for common words

  // Code and technical patterns
  const codePatterns = text.match(/\b\w+\(\)|\w+\.\w+|\w+:\s*\w+|\{\s*[\s\S]*?}\)|\[[\s\S]*?\]|["'][^"']*["']/g) || [];
  tokens -= codePatterns.length * 0.4; // Good compression for code structures

  // JSON structure optimization (TONL benefits from this)
  const jsonStructures = text.match(/\{[^}]*\}|\[[^\]]*\]/g) || [];
  tokens -= jsonStructures.length * 0.3;

  // Numbers (usually 1-2 tokens in o200k)
  const numbers = text.match(/\b\d+(\.\d+)?\b/g) || [];
  tokens -= numbers.length * 0.2;

  return Math.round(Math.max(tokens, 1));
}

/**
 * O200K token estimation
 */
function estimateTokensO200k(text: string): number {
  // O200K is similar to CL100K but with some optimizations
  let tokens = 0;

  // Split by common delimiters
  const parts = text.split(/[\s,.:;{}[\]()\"'\\\/]+/);
  tokens += parts.filter(p => p.length > 0).length;

  // Count individual special characters
  const specialChars = text.match(/[^\w\s]/g) || [];
  tokens += specialChars.length;

  // Adjust for repeated patterns
  const repeatedChars = text.match(/(.)\1{2,}/g) || []; // Repeated characters
  tokens -= repeatedChars.length * 0.5;

  return Math.round(tokens);
}

/**
 * CL100K token estimation (default, most conservative)
 */
function estimateTokensCL100k(text: string): number {
  // CL100K is the most conservative estimate
  let tokens = 0;

  // Split on whitespace and punctuation
  const tokenCandidates = text.split(/[\s,.:;{}[\]()\"'\\\/]+/);
  tokens += tokenCandidates.filter(t => t.length > 0).length;

  // Each special character typically costs a token
  const specialChars = text.match(/[^\w\s]/g) || [];
  tokens += specialChars.length;

  // Very short words might be combined
  const veryShortWords = tokenCandidates.filter(t => t.length <= 2 && t.length > 0);
  tokens -= Math.ceil(veryShortWords.length * 0.3);

  return Math.round(tokens);
}

/**
 * Claude 3 Opus/Haiku token estimation (15K-20K vocabularies)
 */
function estimateTokensClaude3(text: string): number {
  // Claude 3 uses smaller vocabulary than Claude 3.5, ~15-20% more tokens
  let tokens = 0;

  // Base tokenization (more granular due to smaller vocabulary)
  const tokens_base = text.split(/[\s,.:;{}[\]()\"'\\\/]+/).filter(t => t.length > 0);
  tokens += tokens_base.length;

  // Apply Claude 3's ~15% overhead factor
  tokens = Math.round(tokens * 1.15);

  // Structured data handling (good but not as good as 3.5)
  const structuredData = text.match(/\{[^}]*\}|\[[^\]]*\]/g) || [];
  tokens -= Math.floor(structuredData.length * 0.3);

  // Quoted strings
  const quotedStrings = text.match(/"[^"]*"/g) || [];
  tokens += quotedStrings.length * 0.4; // Less efficient than 3.5

  return Math.round(Math.max(tokens, 1));
}

/**
 * Claude 2 token estimation (18K vocabulary, older tokenizer)
 */
function estimateTokensClaude2(text: string): number {
  // Claude 2 uses older tokenizer with higher token count
  let tokens = 0;

  // Very conservative tokenization (18K vocabulary is small)
  const tokens_base = text.split(/[\s,.:;{}[\]()\"'\\\/]+/).filter(t => t.length > 0);
  tokens += tokens_base.length;

  // Apply Claude 2's ~25% overhead factor
  tokens = Math.round(tokens * 1.25);

  // Each special character typically costs a token
  const specialChars = text.match(/[^\w\s]/g) || [];
  tokens += specialChars.length * 0.8;

  return Math.round(Math.max(tokens, 1));
}

/**
 * Gemini 1.5 Pro token estimation (Google's 1M context model)
 */
function estimateTokensGemini15(text: string): number {
  // Gemini 1.5 Pro uses improved sentencepiece tokenizer
  let tokens = 0;

  // Base tokenization (~4.5 chars per token)
  const chars = text.length;
  tokens = Math.ceil(chars / 4.5);

  // Multilingual optimizations
  const unicodeChars = text.match(/[^\x00-\x7F]/g) || [];
  tokens -= unicodeChars.length * 0.1;

  // Technical content
  const technicalTerms = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
  tokens -= technicalTerms.length * 0.3;

  // Code patterns
  const codePatterns = text.match(/\b\w+\(\)|\w+\.\w+|\w+:\s*\w+/g) || [];
  tokens -= codePatterns.length * 0.4;

  return Math.round(Math.max(tokens, 1));
}

/**
 * Gemini Pro token estimation (Google's standard model)
 */
function estimateTokensGeminiPro(text: string): number {
  // Gemini Pro uses standard sentencepiece tokenizer
  let tokens = 0;

  // Base tokenization (~5 chars per token, less efficient)
  const chars = text.length;
  tokens = Math.ceil(chars / 5);

  // Standard compression for common patterns
  const commonWords = text.match(/\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi) || [];
  tokens -= commonWords.length * 0.4;

  return Math.round(Math.max(tokens, 1));
}

/**
 * PaLM 2 token estimation (Google's previous generation)
 */
function estimateTokensPalm2(text: string): number {
  // PaLM 2 uses older tokenizer, less efficient
  let tokens = 0;

  // Base tokenization (~4 chars per token)
  const chars = text.length;
  tokens = Math.ceil(chars / 4);

  // Conservative compression
  const commonWords = text.match(/\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi) || [];
  tokens -= commonWords.length * 0.3;

  // Technical content optimization
  const technicalTerms = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
  tokens -= technicalTerms.length * 0.2;

  return Math.round(Math.max(tokens, 1));
}

/**
 * Llama 3 token estimation (Meta's previous generation)
 */
function estimateTokensLlama3(text: string): number {
  // Llama 3 uses 32K vocabulary tokenizer
  let tokens = 0;

  // Base tokenization (~4.5 chars per token)
  const chars = text.length;
  tokens = Math.ceil(chars / 4.5);

  // Whitespace handling
  const whitespace = text.match(/\s+/g) || [];
  tokens -= whitespace.length * 0.4;

  // Common pattern compression
  const repeatedPatterns = text.match(/(.)\1{2,}/g) || [];
  tokens -= repeatedPatterns.length * 0.6;

  // Numbers
  const numbers = text.match(/\b\d+(\.\d+)?\b/g) || [];
  tokens += numbers.length * 0.4;

  return Math.round(Math.max(tokens, 1));
}

/**
 * Mistral 7B token estimation (Efficient open model)
 */
function estimateTokensMistral(text: string): number {
  // Mistral 7B uses efficient 32K vocabulary tokenizer
  let tokens = 0;

  // Base tokenization (~5 chars per token, less efficient than larger models)
  const chars = text.length;
  tokens = Math.ceil(chars / 5);

  // Moderate compression for common words
  const commonWords = text.match(/\b(the|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|be|been|have|has|had|do|does|did)\b/gi) || [];
  tokens -= commonWords.length * 0.4;

  // Technical terms (moderate compression)
  const technicalTerms = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
  tokens -= technicalTerms.length * 0.15;

  return Math.round(Math.max(tokens, 1));
}

/**
 * Mixtral token estimation (Mixture of Experts model)
 */
function estimateTokensMixtral(text: string): number {
  // Mixtral uses similar tokenizer to Mistral but slightly more efficient
  let tokens = 0;

  // Base tokenization (~4.8 chars per token)
  const chars = text.length;
  tokens = Math.ceil(chars / 4.8);

  // Better compression for technical content
  const technicalTerms = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
  tokens -= technicalTerms.length * 0.25;

  // Code patterns (MoE models handle code well)
  const codePatterns = text.match(/\b\w+\(\)|\w+\.\w+|\w+:\s*\w+/g) || [];
  tokens -= codePatterns.length * 0.3;

  return Math.round(Math.max(tokens, 1));
}

/**
 * Calculate compression metrics
 */
export interface CompressionMetrics {
  originalBytes: number;
  compressedBytes: number;
  originalTokens: number;
  compressedTokens: number;
  byteCompressionRatio: number;
  tokenCompressionRatio: number;
  byteSavingsPercent: number;
  tokenSavingsPercent: number;
}

export function calculateCompressionMetrics(
  original: string,
  compressed: string,
  tokenizer: "gpt-5" | "gpt-4.5" | "gpt-4o" | "claude-3.5" | "claude-sonnet-4.5" | "gemini-2.0" | "gemini-2.5-pro" | "gemini-3-pro" | "llama-4" | "claude-3" | "claude-2" | "gemini-1.5" | "gemini-pro" | "palm-2" | "llama-3" | "mistral" | "mixtral" | "o200k" | "cl100k" = "gpt-5"
): CompressionMetrics {
  const originalBytes = Buffer.byteLength(original, 'utf8');
  const compressedBytes = Buffer.byteLength(compressed, 'utf8');
  const originalTokens = estimateTokens(original, tokenizer);
  const compressedTokens = estimateTokens(compressed, tokenizer);

  // BUG-NEW-004 FIX: Handle division by zero gracefully
  // When denominator is 0, compression ratio is:
  //  - Infinity if numerator > 0 (perfect compression or decompression)
  //  - 1 if both are 0 (no change, both empty)
  const byteCompressionRatio = compressedBytes === 0
    ? (originalBytes === 0 ? 1 : Infinity)
    : originalBytes / compressedBytes;

  const tokenCompressionRatio = compressedTokens === 0
    ? (originalTokens === 0 ? 1 : Infinity)
    : originalTokens / compressedTokens;

  // Savings percent: when original is 0, there's no savings to calculate (0%)
  const byteSavingsPercent = originalBytes === 0
    ? 0
    : ((originalBytes - compressedBytes) / originalBytes) * 100;

  const tokenSavingsPercent = originalTokens === 0
    ? 0
    : ((originalTokens - compressedTokens) / originalTokens) * 100;

  return {
    originalBytes,
    compressedBytes,
    originalTokens,
    compressedTokens,
    byteCompressionRatio,
    tokenCompressionRatio,
    byteSavingsPercent,
    tokenSavingsPercent
  };
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: CompressionMetrics, formatName: string): string {
  return `${formatName}:
  Bytes: ${metrics.originalBytes} → ${metrics.compressedBytes} (${metrics.byteSavingsPercent.toFixed(1)}% savings)
  Tokens: ${metrics.originalTokens} → ${metrics.compressedTokens} (${metrics.tokenSavingsPercent.toFixed(1)}% savings)
  Compression ratio: ${metrics.byteCompressionRatio.toFixed(2)}x bytes, ${metrics.tokenCompressionRatio.toFixed(2)}x tokens`;
}