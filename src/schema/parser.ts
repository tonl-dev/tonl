/**
 * TONL Schema Language (TSL) parser
 */

import type {
  TONLSchema,
  SchemaDirectives,
  SchemaField,
  SchemaType,
  ValidationConstraint,
  CustomTypeDefinition,
  PrimitiveSchemaType,
  ComplexSchemaType,
  CustomSchemaType
} from './types.js';
import type { TONLTypeHint } from '../types.js';

/**
 * Parse a TONL schema file
 */
export function parseSchema(content: string): TONLSchema {
  const lines = content.split('\n').map(l => l.trimEnd());
  const directives: SchemaDirectives = { version: 'v1' };
  const customTypes = new Map<string, CustomTypeDefinition>();
  const rootFields: SchemaField[] = [];

  let i = 0;
  let currentCustomType: CustomTypeDefinition | null = null;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    // Parse directives
    if (trimmed.startsWith('@')) {
      parseDirective(trimmed, directives);
      i++;
      continue;
    }

    // Check for custom type definition (ends with : obj)
    const customTypeMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s*:\s*obj$/);
    if (customTypeMatch) {
      if (currentCustomType) {
        customTypes.set(currentCustomType.name, currentCustomType);
      }

      currentCustomType = {
        name: customTypeMatch[1],
        type: { kind: 'complex', baseType: 'obj' },
        fields: []
      };
      i++;
      continue;
    }

    // Parse field (indented or root-level)
    const isIndented = line.startsWith('  ');
    const fieldMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)$/);

    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const typeAndConstraints = fieldMatch[2].trim();
      const field = parseFieldDefinition(fieldName, typeAndConstraints);

      if (isIndented && currentCustomType) {
        currentCustomType.fields?.push(field);
      } else {
        if (currentCustomType) {
          customTypes.set(currentCustomType.name, currentCustomType);
          currentCustomType = null;
        }
        rootFields.push(field);
      }
    }

    i++;
  }

  // Save last custom type
  if (currentCustomType) {
    customTypes.set(currentCustomType.name, currentCustomType);
  }

  return {
    directives,
    customTypes,
    rootFields
  };
}

/**
 * Parse a directive line (@schema v1, @strict true, etc.)
 */
function parseDirective(line: string, directives: SchemaDirectives): void {
  const parts = line.slice(1).trim().split(/\s+/);
  const directive = parts[0];
  const value = parts.slice(1).join(' ');

  switch (directive) {
    case 'schema':
      directives.version = value;
      break;
    case 'strict':
      directives.strict = value === 'true';
      break;
    case 'description':
      directives.description = value.replace(/^["']|["']$/g, '');
      break;
    case 'version':
      directives.dataVersion = value.replace(/^["']|["']$/g, '');
      break;
  }
}

/**
 * Parse field definition: name: type [constraints...]
 */
function parseFieldDefinition(name: string, typeAndConstraints: string): SchemaField {
  const parts = typeAndConstraints.split(/\s+/);
  const typeStr = parts[0];
  const constraintStrs = parts.slice(1);

  const type = parseType(typeStr);
  const constraints = constraintStrs.map(parseConstraint).filter(c => c !== null) as ValidationConstraint[];

  return {
    name,
    type,
    constraints
  };
}

/**
 * Parse type specification
 */
function parseType(typeStr: string): SchemaType {
  // Check for nullable (ends with ?)
  const nullable = typeStr.endsWith('?');
  const baseTypeStr = nullable ? typeStr.slice(0, -1) : typeStr;

  // Check for list<T>
  const listMatch = baseTypeStr.match(/^list<(.+)>$/);
  if (listMatch) {
    const elementType = parseType(listMatch[1]);
    return {
      kind: 'complex',
      baseType: 'list',
      elementType
    } as ComplexSchemaType;
  }

  // Check for primitive types
  const primitiveTypes: TONLTypeHint[] = ['str', 'u32', 'i32', 'f64', 'bool', 'null'];
  if (primitiveTypes.includes(baseTypeStr as TONLTypeHint)) {
    return {
      kind: 'primitive',
      baseType: baseTypeStr as TONLTypeHint,
      nullable
    } as PrimitiveSchemaType;
  }

  // Check for obj
  if (baseTypeStr === 'obj') {
    return {
      kind: 'complex',
      baseType: 'obj'
    } as ComplexSchemaType;
  }

  // Custom type reference
  return {
    kind: 'custom',
    typeName: baseTypeStr
  } as CustomSchemaType;
}

/**
 * Parse a single constraint
 */
function parseConstraint(constraintStr: string): ValidationConstraint | null {
  // required, optional, etc.
  if (!constraintStr.includes(':')) {
    return {
      type: constraintStr as any,
      value: true
    };
  }

  // key:value format
  const colonIndex = constraintStr.indexOf(':');
  const key = constraintStr.slice(0, colonIndex);
  const value = constraintStr.slice(colonIndex + 1);

  // Try to parse as number
  // BUG-NEW-002 FIX: Use Number.isFinite instead of !isNaN to reject Infinity
  const numValue = parseFloat(value);
  if (Number.isFinite(numValue)) {
    return {
      type: key as any,
      value: numValue
    };
  }

  // String value
  return {
    type: key as any,
    value: value.replace(/^["']|["']$/g, '')
  };
}

/**
 * Load schema from file
 *
 * BUG-NEW-019 FIX: Added error handling with context for file operations
 */
export async function loadSchemaFromFile(filePath: string): Promise<TONLSchema> {
  const fs = await import('fs/promises');

  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    // Provide context-aware error messages for common file operation failures
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      throw new Error(`Schema file not found: ${filePath}`);
    } else if (nodeError.code === 'EACCES') {
      throw new Error(`Permission denied reading schema file: ${filePath}`);
    } else if (nodeError.code === 'EISDIR') {
      throw new Error(`Cannot read schema from directory: ${filePath}`);
    } else {
      throw new Error(`Failed to read schema file '${filePath}': ${nodeError.message}`);
    }
  }

  try {
    return parseSchema(content);
  } catch (error) {
    const parseError = error as Error;
    throw new Error(`Failed to parse schema file '${filePath}': ${parseError.message}`);
  }
}
