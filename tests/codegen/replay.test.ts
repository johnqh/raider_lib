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

test('converts raider templates to hono path params', () => {
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
  expect(out).toContain('RAIDER-GAP');
});

test('serves the built app with SPA fallback so deep links resolve', () => {
  expect(generateReplayServer(MODEL)).toContain('index.html');
});

test('uncaptured paths under an observed API prefix return 501, not the SPA shell', () => {
  const out = generateReplayServer(MODEL);
  const staticAt = out.indexOf("app.use('/*', serveStatic");
  const guardAt = out.indexOf("app.all('/api/*'");
  const fallbackAt = out.indexOf("app.get('*'");

  expect(staticAt).toBeGreaterThan(-1);
  expect(guardAt).toBeGreaterThan(-1);
  expect(fallbackAt).toBeGreaterThan(-1);

  // Static must win first: an endpoint prefix can also be a real content
  // directory — /hologram/artifacts/*.json makes /hologram an "API prefix",
  // but /hologram/web/index.html is a page that must still be served.
  expect(staticAt).toBeLessThan(guardAt);
  // The guard must still precede the SPA fallback, or the gap disappears
  // behind a 200 and the app shell.
  expect(guardAt).toBeLessThan(fallbackAt);
});

test('derives the API prefix from the observed endpoints', () => {
  const out = generateReplayServer({
    baseUrl: null,
    endpoints: [
      {
        key: 'GET /v2/things',
        method: 'GET',
        template: '/v2/things',
        calls: 1,
        auth: 'none',
        requestSchema: null,
        responses: [{ status: 200, count: 1, schema: { type: 'unknown' } }],
      },
    ],
  });
  expect(out).toContain("app.all('/v2/*'");
});
