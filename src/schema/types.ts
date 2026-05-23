/**
 * Schema type definitions for TONL Schema Language (TSL)
 */

import type { TONLTypeHint } from '../types.js';

/**
 * Schema directive metadata
 */
export interface SchemaDirectives {
  version: string;           // Schema format version (e.g., "v1")
  strict?: boolean;          // Strict validation mode
  description?: string;      // Schema description
  dataVersion?: string;      // Data schema version
}

/**
 * Validation constraint types
 */
export type ConstraintType =
  // Universal
  | 'required' | 'optional' | 'default'
  // String
  | 'min' | 'max' | 'length' | 'pattern' | 'trim' | 'lowercase' | 'uppercase'
  | 'enum'
  // Numeric
  | 'range' | 'multipleOf' | 'integer' | 'positive' | 'negative'
  // Array
  | 'unique' | 'nonempty'
  // Object
  | 'sealed' | 'requiredKeys';

/**
 * Single validation constraint
 */
export interface ValidationConstraint {
  type: ConstraintType;
  value?: string | number | boolean;
}

/**
 * Field definition in schema
 */
export interface SchemaField {
  name: string;
  type: SchemaType;
  constraints: ValidationConstraint[];
  description?: string;
}

/**
 * Schema type definition
 */
export type SchemaType =
  | PrimitiveSchemaType
  | ComplexSchemaType
  | CustomSchemaType;

/**
 * Primitive schema types
 */
export interface PrimitiveSchemaType {
  kind: 'primitive';
  baseType: TONLTypeHint;
  nullable?: boolean;
}

/**
 * Complex schema types (list, obj)
 */
export interface ComplexSchemaType {
  kind: 'complex';
  baseType: 'list' | 'obj';
  elementType?: SchemaType;    // For list<T>
  fields?: SchemaField[];      // For obj
}

/**
 * Custom type reference
 */
export interface CustomSchemaType {
  kind: 'custom';
  typeName: string;
}

/**
 * Custom type definition
 */
export interface CustomTypeDefinition {
  name: string;
  type: SchemaType;
  fields?: SchemaField[];
  description?: string;
}

/**
 * Complete schema definition
 */
export interface TONLSchema {
  directives: SchemaDirectives;
  customTypes: Map<string, CustomTypeDefinition>;
  rootFields: SchemaField[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  expected?: string;
  actual?: string;
  line?: number;
  column?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}
