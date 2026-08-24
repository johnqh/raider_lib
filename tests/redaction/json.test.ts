import { expect, test } from 'bun:test';
import { createPseudonymizer } from '../../src/redaction/pseudonym';
import {
  redactJsonValue,
  redactJsonText,
  redactHtmlHydration,
} from '../../src/redaction/json';

test('redacts by key name at any depth', () => {
  const { pseudonym } = createPseudonymizer('s');
  const out = redactJsonValue(
    { user: { name: 'Jane', password: 'hunter2' } },
    pseudonym
  ) as { user: { name: string; password: string } };

  expect(out.user.name).toBe('Jane');
  expect(out.user.password).toMatch(/^<PASSWORD:/);
});

test('redacts by value shape even under an innocent key', () => {
  const { pseudonym } = createPseudonymizer('s');
  const out = redactJsonValue(
    { data: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc' },
    pseudonym
  ) as { data: string };
  expect(out.data).toMatch(/^<JWT:/);
});

test('walks arrays', () => {
  const { pseudonym } = createPseudonymizer('s');
  const out = redactJsonValue(
    [{ email: 'a@b.com' }, { email: 'c@d.com' }],
    pseudonym
  ) as Array<{ email: string }>;
  expect(out[0]!.email).toBe('user1@example.com');
  expect(out[1]!.email).toBe('user2@example.com');
});

test('preserves UUIDs, numbers, booleans, and nulls', () => {
  const { pseudonym } = createPseudonymizer('s');
  const input = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    count: 42,
    active: true,
    deletedAt: null,
  };
  expect(redactJsonValue(input, pseudonym)).toEqual(input);
});

test('preserves object shape exactly — no keys added or dropped', () => {
  const { pseudonym } = createPseudonymizer('s');
  const input = { a: 'x', token: 'eyJa.b.c', nested: { b: 1 } };
  const out = redactJsonValue(input, pseudonym) as Record<string, unknown>;
  expect(Object.keys(out).sort()).toEqual(['a', 'nested', 'token']);
});

test('redactJsonText round-trips through JSON', () => {
  const { pseudonym } = createPseudonymizer('s');
  const out = redactJsonText('{"password":"hunter2"}', pseudonym);
  expect(JSON.parse(out).password).toMatch(/^<PASSWORD:/);
});

test('redactJsonText returns unparseable input unchanged', () => {
  const { pseudonym } = createPseudonymizer('s');
  expect(redactJsonText('not json at all', pseudonym)).toBe('not json at all');
});

test('redacts inline hydration state in HTML', () => {
  const { pseudonym } = createPseudonymizer('s');
  const html =
    '<html><body><script>window.__INITIAL_STATE__ = {"user":{"email":"jane@corp.com"}};</script></body></html>';
  const out = redactHtmlHydration(html, pseudonym);

  expect(out).toContain('user1@example.com');
  expect(out).not.toContain('jane@corp.com');
  expect(out).toContain('window.__INITIAL_STATE__ =');
  expect(out.startsWith('<html><body><script>')).toBe(true);
});

test('handles nested braces in hydration state', () => {
  const { pseudonym } = createPseudonymizer('s');
  const html =
    '<script>window.__INITIAL_STATE__ = {"a":{"b":{"password":"hunter2"}},"c":1};</script>';
  const out = redactHtmlHydration(html, pseudonym);
  expect(out).toContain('<PASSWORD:');
  expect(out).toContain('"c":1');
});

test('leaves HTML without hydration state untouched', () => {
  const { pseudonym } = createPseudonymizer('s');
  const html = '<html><body>hello</body></html>';
  expect(redactHtmlHydration(html, pseudonym)).toBe(html);
});
