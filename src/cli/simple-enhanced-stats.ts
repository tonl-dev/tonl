/**
 * Simple Enhanced Stats Module
 */

import { encodeTONL, decodeTONL } from "../index.js";
import { safeJsonParse } from "../utils/strings.js";
import { estimateTokens } from "../utils/metrics.js";
import { byteSize } from "./utils.js";
import * as fs from "fs";
import type { TONLValue } from "../types.js";
import { PathValidator } from "./path-validator.js";

/** Supported tokenizer model names */
export type TokenizerModel = "gpt-5" | "gpt-4.5" | "gpt-4o" | "claude-3.5" | "claude-sonnet-4.5" | "gemini-2.0" | "gemini-2.5-pro" | "gemini-3-pro" | "llama-4" | "claude-3" | "claude-2" | "gemini-1.5" | "gemini-pro" | "palm-2" | "llama-3" | "mistral" | "mixtral" | "o200k" | "cl100k";

export interface AnalyzeOptions {
  tokenizer?: TokenizerModel;
}

export interface FileStats {
  filename: string;
  originalBytes: number;
  originalTokens: number;
  tonlBytes: number;
  tonlTokens: number;
  byteSavings: string;
  tokenSavings: string;
  compressionRatio: number;
  fileType: 'json' | 'tonl';
  processingTime: number;
}

export class EnhancedStats {
  // Simple file analysis
  // SECURITY FIX (CRITICAL-001): Validate path before reading to prevent path traversal
  async analyzeFile(filePath: string, options: AnalyzeOptions = {}): Promise<FileStats> {
    const startTime = Date.now();
    const filename = filePath.split('/').pop() || filePath;

    // SECURITY FIX (CRITICAL-001): Validate path before reading
    const validatedPath = PathValidator.validate(filePath, {
      allowAbsolutePaths: true,
      requireExists: true,
    });

    const content = fs.readFileSync(validatedPath, 'utf8');
    const originalBytes = byteSize(content);

    let data: TONLValue;
    let fileType: 'json' | 'tonl';

    if (filePath.endsWith('.json')) {
      data = safeJsonParse(content) as TONLValue;
      fileType = 'json';
    } else {
      data = decodeTONL(content, { delimiter: undefined });
      fileType = 'tonl';
    }

    // Calculate original tokens
    const originalTokens = estimateTokens(
      fileType === 'json' ? content : JSON.stringify(data),
      options.tokenizer
    );

    // Encode to TONL and calculate compression
    const tonlOutput = encodeTONL(data, { delimiter: undefined });
    const tonlBytes = byteSize(tonlOutput);
    const tonlTokens = estimateTokens(tonlOutput, options.tokenizer);

    const processingTime = Date.now() - startTime;
    const byteSavings = originalBytes > 0
      ? ((originalBytes - tonlBytes) / originalBytes * 100).toFixed(1)
      : '0.0';
    const tokenSavings = originalTokens > 0
      ? ((originalTokens - tonlTokens) / originalTokens * 100).toFixed(1)
      : '0.0';
    const compressionRatio = originalBytes > 0 ? tonlBytes / originalBytes : 0;

    return {
      filename,
      originalBytes,
      originalTokens,
      tonlBytes,
      tonlTokens,
      byteSavings,
      tokenSavings,
      compressionRatio,
      fileType,
      processingTime
    };
  }
}
