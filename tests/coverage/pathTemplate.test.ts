import { expect, test } from 'bun:test';
import { toPathTemplate, endpointKey } from '../../src/coverage/pathTemplate';

test('replaces numeric ids', () => {
  expect(toPathTemplate('/api/users/1138')).toBe('/api/users/{id}');
});

test('replaces uuids with a distinct marker', () => {
  expect(toPathTemplate('/api/users/550e8400-e29b-41d4-a716-446655440000')).toBe(
    '/api/users/{uuid}'
  );
});

test('replaces long hex and base64-ish segments', () => {
  expect(toPathTemplate('/files/a3f5c9e1b2d4a6f8c0e2b4d6a8f0c2e4')).toBe(
    '/files/{hash}'
  );
});

test('keeps ordinary words', () => {
  expect(toPathTemplate('/api/users/me')).toBe('/api/users/me');
  expect(toPathTemplate('/api/users/current-user')).toBe('/api/users/current-user');
});

test('keeps version segments that merely contain digits', () => {
  expect(toPathTemplate('/api/v2/orders/9/items')).toBe('/api/v2/orders/{id}/items');
});

test('handles root and trailing slashes', () => {
  expect(toPathTemplate('/')).toBe('/');
  expect(toPathTemplate('/api/users/')).toBe('/api/users/');
});

test('endpointKey combines method and templated path from a full URL', () => {
  expect(endpointKey('GET', 'https://example.com/api/users/1138?page=2')).toBe(
    'GET /api/users/{id}'
  );
});

test('endpointKey ignores query strings so pagination does not fragment counts', () => {
  expect(endpointKey('GET', 'https://example.com/api/users?page=1')).toBe(
    endpointKey('GET', 'https://example.com/api/users?page=99')
  );
});

test('endpointKey tolerates a malformed URL by returning it verbatim', () => {
  expect(endpointKey('GET', 'not a url')).toBe('GET not a url');
});
