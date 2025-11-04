/**
 * TONL Browser Build - Core Features Only
 * 
 * Includes: encode, decode, query, navigation (browser-safe)
 * Excludes: FileEditor, REPL, Stream (Node.js-specific)
 */

export type { EncodeOptions, DecodeOptions, TONLValue, TONLObject, TONLArray } from "./types.js";
export { encodeTONL, decodeTONL, encodeSmart } from "./index.js";
export { TONLDocumentBrowser as TONLDocument } from './document-browser.js';
export type { DocumentStats } from './document-browser.js';
