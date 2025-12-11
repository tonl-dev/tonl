/**
 * TypeScript type generation from TONL schemas
 */

import type { TONLSchema, SchemaType, SchemaField, CustomTypeDefinition } from './types.js';

/**
 * Generate TypeScript type definitions from a TONL schema
 */
export function generateTypeScript(schema: TONLSchema, options?: {
  exportAll?: boolean;
  readonly?: boolean;
  strict?: boolean;
}): string {
  const opts = {
    exportAll: true,
    readonly: false,
    strict: false,
    ...options
  };

  const lines: string[] = [];

  // Header
  lines.push('/**');
  lines.push(' * Auto-generated TypeScript types from TONL schema');
  lines.push(' * Do not edit manually - regenerate with: tonl generate-types');
  if (schema.directives.description) {
    lines.push(` * ${schema.directives.description}`);
  }
  lines.push(' */');
  lines.push('');

  // Generate custom type definitions
  for (const [typeName, typeDef] of schema.customTypes.entries()) {
    lines.push(...generateTypeDefinition(typeName, typeDef, opts));
    lines.push('');
  }

  // Generate root interface
  if (schema.rootFields.length > 0) {
    const exportKeyword = opts.exportAll ? 'export ' : '';
    lines.push(`${exportKeyword}interface Root {`);
    for (const field of schema.rootFields) {
      lines.push(...generateFieldDeclaration(field, opts, '  '));
    }
    lines.push('}');
    lines.push('');
  }

  // Generate validation functions (optional)
  if (opts.strict) {
    lines.push('// Validation helper functions');
    lines.push('');
    for (const [typeName] of schema.customTypes.entries()) {
      lines.push(...generateValidationFunction(typeName, opts));
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Generate a type definition
 */
function generateTypeDefinition(
  name: string,
  typeDef: CustomTypeDefinition,
  opts: any
): string[] {
  const lines: string[] = [];
  const exportKeyword = opts.exportAll ? 'export ' : '';
  const readonlyKeyword = opts.readonly ? 'readonly ' : '';

  if (typeDef.description) {
    lines.push(`/** ${typeDef.description} */`);
  }

  if (typeDef.type.kind === 'complex' && typeDef.type.baseType === 'obj' && typeDef.fields) {
    lines.push(`${exportKeyword}interface ${name} {`);
    for (const field of typeDef.fields) {
      lines.push(...generateFieldDeclaration(field, opts, '  '));
    }
    lines.push('}');
  }

  return lines;
}

/**
 * Generate a field declaration
 */
function generateFieldDeclaration(field: SchemaField, opts: any, indent: string): string[] {
  const lines: string[] = [];
  const readonlyKeyword = opts.readonly ? 'readonly ' : '';

  // Add JSDoc comments for constraints
  const jsdocLines: string[] = [];
  for (const constraint of field.constraints) {
    if (constraint.type === 'min' && typeof constraint.value === 'number') {
      jsdocLines.push(`@minimum ${constraint.value}`);
    } else if (constraint.type === 'max' && typeof constraint.value === 'number') {
      jsdocLines.push(`@maximum ${constraint.value}`);
    } else if (constraint.type === 'pattern') {
      jsdocLines.push(`@pattern ${constraint.value}`);
    }
  }

  if (field.description) {
    jsdocLines.unshift(field.description);
  }

  if (jsdocLines.length > 0) {
    if (jsdocLines.length === 1) {
      lines.push(`${indent}/** ${jsdocLines[0]} */`);
    } else {
      lines.push(`${indent}/**`);
      jsdocLines.forEach(line => lines.push(`${indent} * ${line}`));
      lines.push(`${indent} */`);
    }
  }

  // Generate type string
  const tsType = schemaTypeToTypeScript(field.type);
  const optional = isOptionalField(field);
  const questionMark = optional ? '?' : '';

  lines.push(`${indent}${readonlyKeyword}${field.name}${questionMark}: ${tsType};`);

  return lines;
}

/**
 * Convert schema type to TypeScript type string
 */
function schemaTypeToTypeScript(schemaType: SchemaType): string {
  if (schemaType.kind === 'primitive') {
    const baseType = schemaType.baseType;
    let tsType: string;

    switch (baseType) {
      case 'str':
        tsType = 'string';
        break;
      case 'u32':
      case 'i32':
      case 'f64':
        tsType = 'number';
        break;
      case 'bool':
        tsType = 'boolean';
        break;
      case 'null':
        tsType = 'null';
        break;
      default:
        tsType = 'unknown';
    }

    if (schemaType.nullable) {
      return `${tsType} | null`;
    }

    return tsType;
  } else if (schemaType.kind === 'complex') {
    if (schemaType.baseType === 'list' && schemaType.elementType) {
      const elementType = schemaTypeToTypeScript(schemaType.elementType);
      return `${elementType}[]`;
    } else if (schemaType.baseType === 'obj') {
      return 'object';
    }
  } else if (schemaType.kind === 'custom') {
    return schemaType.typeName;
  }

  return 'unknown';
}

/**
 * Check if field is optional
 */
function isOptionalField(field: SchemaField): boolean {
  const hasRequired = field.constraints.some(c => c.type === 'required');
  const hasOptional = field.constraints.some(c => c.type === 'optional');

  // If primitive type is nullable, it's optional
  if (field.type.kind === 'primitive' && field.type.nullable) {
    return true;
  }

  return !hasRequired || hasOptional;
}

/**
 * Generate validation function
 */
function generateValidationFunction(typeName: string, opts: any): string[] {
  const lines: string[] = [];
  const exportKeyword = opts.exportAll ? 'export ' : '';

  lines.push(`${exportKeyword}function validate${typeName}(data: unknown): data is ${typeName} {`);
  lines.push(`  // Basic type guard - validates object structure at runtime`);
  lines.push(`  return typeof data === 'object' && data !== null;`);
  lines.push(`}`);

  return lines;
}
