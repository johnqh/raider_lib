import { expect, test } from 'bun:test';
import { buildRouteModel } from '../../src/analysis/routeModel';

test('extracts params from route patterns', () => {
  const model = buildRouteModel({
    routes: ['/users/:id', '/posts/:postId/comments/:commentId'],
    navigations: [],
    requests: [],
  });
  expect(model.routes[0]!.params).toEqual(['id']);
  expect(model.routes[1]!.params).toEqual(['postId', 'commentId']);
});

test('attributes endpoints to the route mounted when they fired', () => {
  const model = buildRouteModel({
    routes: ['/', '/users'],
    navigations: [
      { navigationId: 'nav1', path: '/' },
      { navigationId: 'nav2', path: '/users' },
    ],
    requests: [
      { method: 'GET', url: 'https://x.com/api/me', navigationId: 'nav1' },
      { method: 'GET', url: 'https://x.com/api/users', navigationId: 'nav2' },
    ],
  });
  const users = model.routes.find((r) => r.path === '/users')!;
  expect(users.endpoints).toEqual(['GET /api/users']);
  expect(users.visited).toBe(true);
});

test('a route never navigated to is unvisited with no endpoints', () => {
  const model = buildRouteModel({
    routes: ['/', '/admin'],
    navigations: [{ navigationId: 'nav1', path: '/' }],
    requests: [],
  });
  expect(model.routes.find((r) => r.path === '/admin')!.visited).toBe(false);
});

test('matches a concrete navigation path against a parameterised route', () => {
  const model = buildRouteModel({
    routes: ['/users/:id'],
    navigations: [{ navigationId: 'nav1', path: '/users/1138' }],
    requests: [
      { method: 'GET', url: 'https://x.com/api/users/1138', navigationId: 'nav1' },
    ],
  });
  expect(model.routes[0]!.visited).toBe(true);
  expect(model.routes[0]!.endpoints).toEqual(['GET /api/users/{id}']);
});

test('requests with no navigation land in unattributed rather than being dropped', () => {
  const model = buildRouteModel({
    routes: ['/'],
    navigations: [],
    requests: [{ method: 'GET', url: 'https://x.com/api/boot', navigationId: null }],
  });
  expect(model.unattributed).toEqual(['GET /api/boot']);
});

test('static asset requests are not treated as endpoints', () => {
  const model = buildRouteModel({
    routes: ['/'],
    navigations: [{ navigationId: 'nav1', path: '/' }],
    requests: [
      { method: 'GET', url: 'https://x.com/assets/app.js', navigationId: 'nav1' },
      { method: 'GET', url: 'https://x.com/api/me', navigationId: 'nav1' },
    ],
  });
  expect(model.routes[0]!.endpoints).toEqual(['GET /api/me']);
});

test('HTML document navigations are not endpoints, even without a file extension', () => {
  const model = buildRouteModel({
    routes: ['/users'],
    navigations: [{ navigationId: 'nav1', path: '/users' }],
    requests: [
      { method: 'GET', url: 'https://x.com/users', navigationId: 'nav1', resourceType: 'Document' },
      { method: 'GET', url: 'https://x.com/api/users', navigationId: 'nav1', resourceType: 'XHR' },
    ],
  });
  expect(model.routes[0]!.endpoints).toEqual(['GET /api/users']);
});

test('CORS preflights are transport, not API surface', () => {
  const model = buildRouteModel({
    routes: ['/'],
    navigations: [{ navigationId: 'nav1', path: '/' }],
    requests: [
      { method: 'OPTIONS', url: 'https://x.com/api/me', navigationId: 'nav1', resourceType: 'Preflight' },
      { method: 'GET', url: 'https://x.com/api/me', navigationId: 'nav1', resourceType: 'XHR' },
    ],
  });
  expect(model.routes[0]!.endpoints).toEqual(['GET /api/me']);
});
