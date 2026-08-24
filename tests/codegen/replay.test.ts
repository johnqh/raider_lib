import { expect, test } from 'bun:test';
import { generateReplayServer, templateToHonoPath } from '../../src/codegen/replay';
import type { ApiModel } from '../../src/analysis/apiModel';

const MODEL: ApiModel = {
  baseUrl: 'https://api.example.com',
  endpoints: [
    {
      key: 'GET /api/users/{id}',
      method: 'GET',
      template: '/api/users/{id}',
      calls: 1,
      auth: 'none',
      requestSchema: null,
      responses: [{ status: 200, count: 1, schema: { type: 'unknown' } }],
    },
  ],
};

test('converts xray templates to hono path params', () => {
  expect(templateToHonoPath('/api/users/{id}')).toBe('/api/users/:id');
  expect(templateToHonoPath('/api/a/{x}/b/{y}')).toBe('/api/a/:x/b/:y');
  expect(templateToHonoPath('/api/users')).toBe('/api/users');
});

test('registers a route per endpoint using the right verb', () => {
  expect(generateReplayServer(MODEL)).toContain("app.get('/api/users/:id'");
});

test('serves recorded bodies rather than fabricated ones', () => {
  const out = generateReplayServer(MODEL);
  expect(out).toContain('recordings');
  expect(out).toContain('GET /api/users/{id}');
});

test('returns 501 with an explicit marker when no recording exists', () => {
  const out = generateReplayServer(MODEL);
  expect(out).toContain('501');
  expect(out).toContain('XRAY-GAP');
});

test('serves the built app with SPA fallback so deep links resolve', () => {
  expect(generateReplayServer(MODEL)).toContain('index.html');
});
