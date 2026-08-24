import { expect, test } from 'bun:test';
import { createPseudonymizer } from '../../src/redaction/pseudonym';
import { redactHeaders } from '../../src/redaction/headers';
import { isSensitiveKey, classifyValue } from '../../src/redaction/patterns';

test('recognises sensitive key names', () => {
  expect(isSensitiveKey('password')).toBe('password');
  expect(isSensitiveKey('access_token')).toBe('jwt');
  expect(isSensitiveKey('apiKey')).toBe('api-key');
  expect(isSensitiveKey('api_key')).toBe('api-key');
  expect(isSensitiveKey('X-Session-Id')).toBe('api-key');
});

test('leaves ordinary key names alone', () => {
  expect(isSensitiveKey('username')).toBeNull();
  expect(isSensitiveKey('id')).toBeNull();
  expect(isSensitiveKey('createdAt')).toBeNull();
});

test('classifies values by shape', () => {
  expect(classifyValue('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc')).toBe('jwt');
  expect(classifyValue('Bearer abc123def456')).toBe('bearer');
  expect(classifyValue('jane@corp.com')).toBe('email');
  expect(classifyValue('a'.repeat(40))).toBe('high-entropy');
});

test('preserves UUIDs — they are structural, not secret', () => {
  expect(classifyValue('550e8400-e29b-41d4-a716-446655440000')).toBeNull();
});

test('leaves short ordinary strings alone', () => {
  expect(classifyValue('active')).toBeNull();
  expect(classifyValue('1138')).toBeNull();
});

test('redacts denylisted headers but keeps the header itself', () => {
  const { pseudonym } = createPseudonymizer('s');
  const out = redactHeaders(
    {
      authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc',
      cookie: 'session=abc123',
      'content-type': 'application/json',
    },
    pseudonym
  );

  expect(out['content-type']).toBe('application/json');
  expect(out.authorization).toMatch(/^<(JWT|BEARER):[0-9a-f]{4}>$/);
  expect(out.cookie).toMatch(/^<COOKIE:[0-9a-f]{4}>$/);
});

test('the same token in two requests keeps the same placeholder', () => {
  const { pseudonym } = createPseudonymizer('s');
  const token = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc';
  const first = redactHeaders({ authorization: token }, pseudonym);
  const second = redactHeaders({ authorization: token }, pseudonym);
  expect(first.authorization).toBe(second.authorization);
});

test('matches header names case-insensitively', () => {
  const { pseudonym } = createPseudonymizer('s');
  const out = redactHeaders({ Authorization: 'Bearer abcdef123456' }, pseudonym);
  expect(out.Authorization).toMatch(/^<BEARER:/);
});
