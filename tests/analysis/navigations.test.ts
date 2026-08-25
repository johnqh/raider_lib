import { expect, test } from 'bun:test';
import { deriveTimeline } from '../../src/analysis/navigations';

function req(id: string, ts: number, url: string, resourceType: string) {
  return { id, ts, url, resourceType };
}

test('each document request starts a navigation', () => {
  const { navigations } = deriveTimeline([
    req('1', 1, 'https://x.com/', 'Document'),
    req('2', 2, 'https://x.com/about', 'Document'),
  ]);
  expect(navigations.map((n) => n.path)).toEqual(['/', '/about']);
});

test('subsequent requests are attributed to the page that was open', () => {
  const { assignments } = deriveTimeline([
    req('1', 1, 'https://x.com/', 'Document'),
    req('2', 2, 'https://x.com/api/me', 'Fetch'),
    req('3', 3, 'https://x.com/about', 'Document'),
    req('4', 4, 'https://x.com/api/about', 'Fetch'),
  ]);
  expect(assignments['2']).toBe(assignments['1']);
  expect(assignments['4']).toBe(assignments['3']);
  expect(assignments['2']).not.toBe(assignments['4']);
});

test('revisiting a page reuses its navigation rather than inventing a route', () => {
  const { navigations, assignments } = deriveTimeline([
    req('1', 1, 'https://x.com/', 'Document'),
    req('2', 2, 'https://x.com/about', 'Document'),
    req('3', 3, 'https://x.com/', 'Document'),
    req('4', 4, 'https://x.com/api/me', 'Fetch'),
  ]);
  expect(navigations).toHaveLength(2);
  expect(assignments['4']).toBe(assignments['1']);
});

test('orders by timestamp, not array order', () => {
  const { navigations } = deriveTimeline([
    req('2', 20, 'https://x.com/second', 'Document'),
    req('1', 10, 'https://x.com/first', 'Document'),
  ]);
  expect(navigations.map((n) => n.path)).toEqual(['/first', '/second']);
});

test('requests before any document are left unassigned', () => {
  const { assignments } = deriveTimeline([
    req('1', 1, 'https://x.com/api/early', 'Fetch'),
    req('2', 2, 'https://x.com/', 'Document'),
  ]);
  expect(assignments['1']).toBeUndefined();
  expect(assignments['2']).toBeDefined();
});

test('no documents yields no navigations rather than a fabricated one', () => {
  const { navigations, assignments } = deriveTimeline([
    req('1', 1, 'https://x.com/api/me', 'Fetch'),
  ]);
  expect(navigations).toEqual([]);
  expect(assignments).toEqual({});
});
