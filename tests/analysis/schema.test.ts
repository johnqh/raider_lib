import { expect, test } from 'bun:test';
import { inferSchema } from '../../src/analysis/schema';

test('infers primitive types', () => {
  expect(inferSchema(['a'])).toEqual({ type: 'string' });
  expect(inferSchema([1])).toEqual({ type: 'integer' });
  expect(inferSchema([1.5])).toEqual({ type: 'number' });
  expect(inferSchema([true])).toEqual({ type: 'boolean' });
  expect(inferSchema([null])).toEqual({ type: 'null' });
});

test('an integer sample followed by a float widens to number', () => {
  expect(inferSchema([1, 2.5])).toEqual({ type: 'number' });
});

test('infers object properties and marks all present fields required', () => {
  expect(inferSchema([{ id: 1, name: 'a' }])).toEqual({
    type: 'object',
    properties: { id: { type: 'integer' }, name: { type: 'string' } },
    required: ['id', 'name'],
  });
});

test('a field missing from any sample becomes optional', () => {
  const schema = inferSchema([{ id: 1, nickname: 'x' }, { id: 2 }]) as {
    required: string[];
    properties: Record<string, unknown>;
  };
  expect(schema.required).toEqual(['id']);
  expect(Object.keys(schema.properties).sort()).toEqual(['id', 'nickname']);
});

test('infers array element schemas by unifying elements', () => {
  expect(inferSchema([[{ id: 1 }, { id: 2 }]])).toEqual({
    type: 'array',
    items: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
  });
});

test('an empty array yields an unknown element type rather than guessing', () => {
  expect(inferSchema([[]])).toEqual({ type: 'array', items: { type: 'unknown' } });
});

test('a string field with few distinct values across many samples becomes an enum', () => {
  const samples = Array.from({ length: 10 }, (_, i) => ({
    role: i % 2 === 0 ? 'admin' : 'member',
  }));
  const schema = inferSchema(samples) as {
    properties: { role: { type: string; enum?: string[] } };
  };
  expect(schema.properties.role.enum?.sort()).toEqual(['admin', 'member']);
});

test('a string field with many distinct values stays a plain string', () => {
  const samples = Array.from({ length: 10 }, (_, i) => ({ name: `name-${i}` }));
  const schema = inferSchema(samples) as {
    properties: { name: { type: string; enum?: string[] } };
  };
  expect(schema.properties.name.enum).toBeUndefined();
});

test('null alongside a type becomes a nullable union', () => {
  const schema = inferSchema([{ deletedAt: null }, { deletedAt: '2026-01-01' }]) as {
    properties: { deletedAt: { anyOf?: Array<{ type: string }> } };
  };
  expect(schema.properties.deletedAt.anyOf?.map((s) => s.type).sort()).toEqual([
    'null',
    'string',
  ]);
});

test('genuinely different shapes become a union, not a merged mess', () => {
  const schema = inferSchema([
    { error: 'unauthorized', code: 401 },
    { id: 1, email: 'a@b.c' },
  ]) as { anyOf?: unknown[] };
  expect(schema.anyOf).toHaveLength(2);
});

test('unification is order-independent', () => {
  const a = inferSchema([{ id: 1 }, { id: 2, extra: true }]);
  const b = inferSchema([{ id: 2, extra: true }, { id: 1 }]);
  expect(a).toEqual(b);
});

test('no samples yields unknown rather than an empty object', () => {
  expect(inferSchema([])).toEqual({ type: 'unknown' });
});

test('deeply nested structures are inferred recursively', () => {
  const schema = inferSchema([{ user: { profile: { tags: ['a'] } } }]);
  expect(JSON.stringify(schema)).toContain('"tags"');
  expect(JSON.stringify(schema)).toContain('"array"');
});

test('objects sharing at least one key still merge with optional fields', () => {
  const schema = inferSchema([
    { id: 1, name: 'a' },
    { id: 2, email: 'b@c.d' },
  ]) as { type: string; required: string[] };
  expect(schema.type).toBe('object');
  expect(schema.required).toEqual(['id']);
});
