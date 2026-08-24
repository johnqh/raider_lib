import { expect, test } from 'bun:test';
import { createPseudonymizer } from '../../src/redaction/pseudonym';
import { redactRequest } from '../../src/redaction/index';

test('never mutates JavaScript bodies', () => {
  const { pseudonym } = createPseudonymizer('s');
  const source = 'const API_KEY="abcdefghijklmnopqrstuvwxyz0123456789abcd";';
  const out = redactRequest(
    {
      requestHeaders: {},
      responseHeaders: {},
      mimeType: 'application/javascript',
      requestBody: null,
      responseBody: source,
    },
    pseudonym
  );
  expect(out.responseBody).toBe(source);
});

test('never mutates CSS bodies', () => {
  const { pseudonym } = createPseudonymizer('s');
  const css = '.a{content:"abcdefghijklmnopqrstuvwxyz0123456789abcd"}';
  const out = redactRequest(
    {
      requestHeaders: {},
      responseHeaders: {},
      mimeType: 'text/css',
      requestBody: null,
      responseBody: css,
    },
    pseudonym
  );
  expect(out.responseBody).toBe(css);
});

test('redacts JSON response bodies', () => {
  const { pseudonym } = createPseudonymizer('s');
  const out = redactRequest(
    {
      requestHeaders: {},
      responseHeaders: {},
      mimeType: 'application/json',
      requestBody: null,
      responseBody: '{"access_token":"eyJa.b.c"}',
    },
    pseudonym
  );
  expect(JSON.parse(out.responseBody!).access_token).toMatch(/^<JWT:/);
});

test('redacts request bodies regardless of response mime type', () => {
  const { pseudonym } = createPseudonymizer('s');
  const out = redactRequest(
    {
      requestHeaders: {},
      responseHeaders: {},
      mimeType: 'text/html',
      requestBody: '{"password":"hunter2"}',
      responseBody: null,
    },
    pseudonym
  );
  expect(JSON.parse(out.requestBody!).password).toMatch(/^<PASSWORD:/);
});

test('redacts hydration state inside HTML responses', () => {
  const { pseudonym } = createPseudonymizer('s');
  const out = redactRequest(
    {
      requestHeaders: {},
      responseHeaders: {},
      mimeType: 'text/html',
      requestBody: null,
      responseBody:
        '<script>window.__INITIAL_STATE__ = {"email":"jane@corp.com"};</script>',
    },
    pseudonym
  );
  expect(out.responseBody).toContain('user1@example.com');
});

test('the login response token matches the token in later request headers', () => {
  const { pseudonym } = createPseudonymizer('s');
  const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc';

  const login = redactRequest(
    {
      requestHeaders: {},
      responseHeaders: {},
      mimeType: 'application/json',
      requestBody: null,
      responseBody: JSON.stringify({ access_token: token }),
    },
    pseudonym
  );
  const later = redactRequest(
    {
      requestHeaders: { authorization: token },
      responseHeaders: {},
      mimeType: 'application/json',
      requestBody: null,
      responseBody: '{}',
    },
    pseudonym
  );

  expect(JSON.parse(login.responseBody!).access_token).toBe(
    later.requestHeaders.authorization
  );
});
