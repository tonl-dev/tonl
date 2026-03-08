/**
 * Types for TONL Modification API
 */

import type { TONLValue } from '../types.js';

/**
 * Modification result
 */
export interface ModificationResult {
  success: boolean;
  path: string;
  oldValue?: any;
  newValue?: any;
  error?: string;
}

/**
 * Set operation options
 */
export interface SetOptions {
  /**
   * Create intermediate objects/arrays if they don't exist
   * @default true
   */
  createPath?: boolean;

  /**
   * Validate against schema if available
   * @default true
   */
  validate?: boolean;

  /**
   * Coerce types if needed
   * @default false
   */
  coerce?: boolean;
}
