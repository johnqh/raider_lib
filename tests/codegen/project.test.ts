import { expect, test } from 'bun:test';
import { generateProject } from '../../src/codegen/project';
import type { StackFingerprint } from '../../src/bundle/types';

const REACT: StackFingerprint = {
  framework: 'react',
  frameworkVersion: '18.3.1',
  router: 'react-router',
  routerVersion: '6.28.0',
  stateLibraries: [],
  bundler: 'vite',
};

const BASE = {
  name: 'rebuilt',
  stack: REACT,
  routes: [
    { path: '/', params: [], visited: true, endpoints: ['GET /api/me'], lazy: false },
    {
      path: '/users/:id',
      params: ['id'],
      visited: true,
      endpoints: ['GET /api/users/{id}'],
      lazy: true,
    },
  ],
  api: { baseUrl: 'https://api.example.com', endpoints: [] },
  gaps: [],
};

test('emits the files a Vite project needs', () => {
  const files = generateProject(BASE);
  for (const path of [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'src/main.tsx',
    'src/router.tsx',
  ]) {
    expect(Object.keys(files)).toContain(path);
  }
});

test('pins the framework version the original app actually shipped', () => {
  const pkg = JSON.parse(generateProject(BASE)['package.json']!);
  expect(pkg.dependencies.react).toBe('18.3.1');
  expect(pkg.dependencies['react-router-dom']).toBe('6.28.0');
});

test('falls back to latest when the runtime did not report a version', () => {
  const pkg = JSON.parse(
    generateProject({
      ...BASE,
      stack: { ...REACT, frameworkVersion: null, routerVersion: null },
    })['package.json']!
  );
  expect(pkg.dependencies.react).toBe('latest');
});

test('emits a page component per route', () => {
  const files = generateProject(BASE);
  expect(Object.keys(files)).toContain('src/pages/Home.tsx');
  expect(Object.keys(files)).toContain('src/pages/UsersById.tsx');
});

test('the router references every route path', () => {
  const router = generateProject(BASE)['src/router.tsx']!;
  expect(router).toContain("path: '/'");
  expect(router).toContain("path: '/users/:id'");
});

test('lazy routes are emitted as dynamic imports', () => {
  expect(generateProject(BASE)['src/router.tsx']!).toContain('lazy(');
});

test('a page whose route was never visited carries an RAIDR-GAP marker', () => {
  const files = generateProject({
    ...BASE,
    routes: [{ path: '/admin', params: [], visited: false, endpoints: [], lazy: true }],
  });
  expect(files['src/pages/Admin.tsx']).toContain('RAIDR-GAP');
  expect(files['src/pages/Admin.tsx']).toContain('never visited');
});

test('a page lists the endpoints observed for its route', () => {
  expect(generateProject(BASE)['src/pages/UsersById.tsx']).toContain(
    'GET /api/users/{id}'
  );
});

test('vue projects emit vue files and vue dependencies', () => {
  const files = generateProject({
    ...BASE,
    stack: {
      framework: 'vue',
      frameworkVersion: '3.4.21',
      router: 'vue-router',
      routerVersion: '4.4.0',
      stateLibraries: [],
      bundler: 'vite',
    },
  });
  const pkg = JSON.parse(files['package.json']!);
  expect(pkg.dependencies.vue).toBe('3.4.21');
  expect(Object.keys(files)).toContain('src/main.ts');
  expect(Object.keys(files)).toContain('src/pages/Home.vue');
});

test('gaps from the capture are recorded in the project README', () => {
  const files = generateProject({
    ...BASE,
    gaps: [
      {
        requestId: '1',
        url: 'https://x.com/chunk-47.js',
        reason: 'body-evicted' as const,
        ts: 0,
        detail: null,
      },
    ],
  });
  expect(files['RAIDR-GAPS.md']).toContain('chunk-47.js');
  expect(files['RAIDR-GAPS.md']).toContain('body-evicted');
});

test('no gaps means no gaps file', () => {
  expect(generateProject(BASE)['RAIDR-GAPS.md']).toBeUndefined();
});
