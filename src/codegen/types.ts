import type { JsonSchema } from '../analysis/schema';

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Parenthesise union members before `[]` so `(a | b)[]` is not `a | b[]`. */
function wrap(type: string): string {
  return type.includes(' | ') ? `(${type})` : type;
}

export function schemaToType(schema: JsonSchema): string {
  if ('anyOf' in schema) return schema.anyOf.map(schemaToType).join(' | ');

  switch (schema.type) {
    case 'string':
      return schema.enum && schema.enum.length > 0
        ? schema.enum.map((value) => `'${value.replace(/'/g, "\\'")}'`).join(' | ')
        : 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'array':
      return `${wrap(schemaToType(schema.items))}[]`;
    case 'object': {
      const fields = Object.entries(schema.properties).map(([key, child]) => {
        const name = IDENTIFIER_RE.test(key) ? key : `'${key}'`;
        const optional = schema.required.includes(key) ? '' : '?';
        return `  ${name}${optional}: ${schemaToType(child)};`;
      });
      return fields.length === 0 ? 'Record<string, never>' : `{\n${fields.join('\n')}\n}`;
    }
    default:
      return 'unknown';
  }
}

export function declareType(name: string, schema: JsonSchema): string {
  if ('type' in schema && schema.type === 'object') {
    return `export interface ${name} ${schemaToType(schema)}`;
  }
  return `export type ${name} = ${schemaToType(schema)};`;
}

function pascal(input: string): string {
  return input
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');
}

export function typeNameFor(method: string, template: string, suffix: string): string {
  const segments = template
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      const param = /^\{(.+)\}$/.exec(segment);
      return param ? `By${pascal(param[1]!)}` : pascal(segment);
    });
  return `${pascal(method.toLowerCase())}${segments.join('')}${suffix}`;
}

export { pascal };
