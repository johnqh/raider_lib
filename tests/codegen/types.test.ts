import { expect, test } from 'bun:test';
import { schemaToType, declareType, typeNameFor } from '../../src/codegen/types';

test('maps primitives', () => {
  expect(schemaToType({ type: 'string' })).toBe('string');
  expect(schemaToType({ type: 'integer' })).toBe('number');
  expect(schemaToType({ type: 'number' })).toBe('number');
  expect(schemaToType({ type: 'boolean' })).toBe('boolean');
  expect(schemaToType({ type: 'null' })).toBe('null');
  expect(schemaToType({ type: 'unknown' })).toBe('unknown');
});

test('emits string enums as literal unions', () => {
  expect(schemaToType({ type: 'string', enum: ['admin', 'member'] })).toBe(
    "'admin' | 'member'"
  );
});

test('emits arrays', () => {
  expect(schemaToType({ type: 'array', items: { type: 'string' } })).toBe('string[]');
});

test('parenthesises union element types inside arrays', () => {
  expect(
    schemaToType({ type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] } })
  ).toBe('(string | null)[]');
});

test('emits objects with optional markers on non-required fields', () => {
  const out = schemaToType({
    type: 'object',
    properties: { id: { type: 'integer' }, nickname: { type: 'string' } },
    required: ['id'],
  });
  expect(out).toContain('id: number');
  expect(out).toContain('nickname?: string');
});

test('quotes keys that are not valid identifiers', () => {
  const out = schemaToType({
    type: 'object',
    properties: { 'content-type': { type: 'string' } },
    required: ['content-type'],
  });
  expect(out).toContain("'content-type': string");
});

test('emits unions', () => {
  expect(schemaToType({ anyOf: [{ type: 'string' }, { type: 'null' }] })).toBe(
    'string | null'
  );
});

test('declareType emits an exported interface for objects', () => {
  const out = declareType('User', {
    type: 'object',
    properties: { id: { type: 'integer' } },
    required: ['id'],
  });
  expect(out.startsWith('export interface User {')).toBe(true);
});

test('declareType emits a type alias for non-objects', () => {
  expect(declareType('Ids', { type: 'array', items: { type: 'integer' } })).toBe(
    'export type Ids = number[];'
  );
});

test('derives PascalCase names from method and template', () => {
  expect(typeNameFor('GET', '/api/users/{id}', 'Response')).toBe('GetApiUsersByIdResponse');
  expect(typeNameFor('POST', '/api/login', 'Request')).toBe('PostApiLoginRequest');
});
