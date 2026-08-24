import { expect, test } from 'bun:test';
import { computeCoverage } from '../../src/coverage/coverage';

const base = {
  chunks: { known: [] as string[], loaded: [] as string[] },
  routes: [] as Array<{ path: string; visited: boolean }>,
  requests: [] as Array<{ method: string; url: string; status: number | null }>,
};

test('reports chunk coverage and names what is missing', () => {
  const report = computeCoverage({
    ...base,
    chunks: { known: ['a.js', 'b.js', 'c.js', 'd.js'], loaded: ['a.js', 'b.js'] },
  });

  expect(report.chunks.known).toBe(4);
  expect(report.chunks.loaded).toBe(2);
  expect(report.chunks.pct).toBe(50);
  expect(report.chunks.missing).toEqual(['c.js', 'd.js']);
});

test('ignores loaded chunks absent from the manifest', () => {
  const report = computeCoverage({
    ...base,
    chunks: { known: ['a.js'], loaded: ['a.js', 'runtime.js'] },
  });
  expect(report.chunks.loaded).toBe(1);
  expect(report.chunks.pct).toBe(100);
});

test('reports route coverage and lists unvisited paths', () => {
  const report = computeCoverage({
    ...base,
    routes: [
      { path: '/', visited: true },
      { path: '/settings', visited: false },
      { path: '/admin', visited: false },
    ],
  });

  expect(report.routes.total).toBe(3);
  expect(report.routes.visited).toBe(1);
  expect(report.routes.pct).toBe(33);
  expect(report.routes.unvisited).toEqual(['/settings', '/admin']);
});

test('clusters requests into endpoints with call counts', () => {
  const report = computeCoverage({
    ...base,
    requests: [
      { method: 'GET', url: 'https://x.com/api/users/1', status: 200 },
      { method: 'GET', url: 'https://x.com/api/users/2', status: 200 },
      { method: 'POST', url: 'https://x.com/api/users', status: 201 },
    ],
  });

  expect(report.endpoints).toHaveLength(2);
  const byId = report.endpoints.find((e) => e.key === 'GET /api/users/{id}');
  expect(byId!.calls).toBe(2);
});

test('tracks distinct status codes per endpoint', () => {
  const report = computeCoverage({
    ...base,
    requests: [
      { method: 'GET', url: 'https://x.com/api/me', status: 200 },
      { method: 'GET', url: 'https://x.com/api/me', status: 401 },
    ],
  });
  expect(report.endpoints[0]!.statuses.sort()).toEqual([200, 401]);
});

test('endpoints are ordered by call count, descending', () => {
  const report = computeCoverage({
    ...base,
    requests: [
      { method: 'GET', url: 'https://x.com/api/a', status: 200 },
      { method: 'GET', url: 'https://x.com/api/b', status: 200 },
      { method: 'GET', url: 'https://x.com/api/b', status: 200 },
    ],
  });
  expect(report.endpoints[0]!.key).toBe('GET /api/b');
});

test('empty input yields 100 percent rather than a division by zero', () => {
  const report = computeCoverage(base);
  expect(report.chunks.pct).toBe(100);
  expect(report.routes.pct).toBe(100);
  expect(report.endpoints).toEqual([]);
});

test('complete is true only when chunks and routes are both fully covered', () => {
  expect(
    computeCoverage({
      ...base,
      chunks: { known: ['a.js'], loaded: ['a.js'] },
      routes: [{ path: '/', visited: true }],
    }).complete
  ).toBe(true);

  expect(
    computeCoverage({
      ...base,
      chunks: { known: ['a.js', 'b.js'], loaded: ['a.js'] },
      routes: [{ path: '/', visited: true }],
    }).complete
  ).toBe(false);
});
