/**
 * Simple Enhanced Stats Module
 */

import { encodeTONL, decodeTONL } from "../index.js";
import { safeJsonParse } from "../utils/strings.js";
import { estimateTokens } from "../utils/metrics.js";
import { byteSize } from "./utils.js";
import * as fs from "fs";
import type { TONLValue } from "../types.js";

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
  // 📊 Simple file analysis
  async analyzeFile(filePath: string, options: any = {}): Promise<FileStats> {
    const startTime = Date.now();
    const filename = filePath.split('/').pop() || filePath;

    console.log(`📖 Reading ${filename}...`);

    const content = fs.readFileSync(filePath, 'utf8');
    const originalBytes = byteSize(content);

    let data: any;
    let fileType: 'json' | 'tonl';

    if (filePath.endsWith('.json')) {
      data = safeJsonParse(content);
      fileType = 'json';
    } else {
      data = decodeTONL(content, { delimiter: undefined });
      fileType = 'tonl';
    }

    console.log(`⚙️  Processing data...`);

    // Calculate original tokens
    const originalTokens = estimateTokens(
      fileType === 'json' ? content : JSON.stringify(data),
      options.tokenizer
    );

    // Encode to TONL and calculate compression
    const tonlOutput = encodeTONL(data, { delimiter: undefined });
    const tonlBytes = byteSize(tonlOutput);
    const tonlTokens = estimateTokens(tonlOutput, options.tokenizer);

    console.log(`✅ Analysis complete!`);

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