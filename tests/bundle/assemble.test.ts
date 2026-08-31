import { expect, test } from 'bun:test';
import { unzipSync, strFromU8 } from 'fflate';
import {
  MemoryContentStore,
  buildBundleFiles,
  zipBundle,
  bundleFilename,
} from '../../src/index';

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

test('memory store round-trips and deduplicates', async () => {
  const store = new MemoryContentStore(sha256Hex);
  const a = await store.put(new TextEncoder().encode('same'));
  const b = await store.put(new TextEncoder().encode('same'));
  expect(a).toBe(b);
  expect(await store.count()).toBe(1);
  expect(strFromU8((await store.get(a))!)).toBe('same');
});

const encoder = new TextEncoder();

async function fixtureInput() {
  const store = new MemoryContentStore(sha256Hex);
  const htmlHash = await store.put(encoder.encode('<html></html>'));
  return {
    store,
    input: {
      store,
      manifest: {
        formatVersion: 1 as const,
        sessionId: 's1',
        origin: 'https://example.com',
        startedAt: '2026-08-24T10:00:00.000Z',
        endedAt: '2026-08-24T10:05:00.000Z',
        counts: { requests: 1, frames: 0, bodies: 1, gaps: 1 },
        stack: null,
      },
      requests: [
        {
          id: 'r1',
          ts: 1756029600000,
          method: 'GET',
          url: 'https://example.com/',
          resourceType: 'Document',
          requestHeaders: {},
          requestBodyHash: null,
          status: 200,
          responseHeaders: {},
          responseBodyHash: htmlHash,
          mimeType: 'text/html',
          fromCache: false,
          navigationId: 'nav1',
        },
      ],
      frames: [],
      gaps: [
        {
          requestId: 'r2',
          url: 'https://cdn.example.com/chunk-47.js',
          reason: 'body-evicted' as const,
          ts: 1756029601000,
          detail: 'No resource with given identifier found',
        },
      ],
      redaction: [
        { placeholder: '<JWT:a1b2>', kind: 'jwt' as const, occurrences: 4 },
      ],
      sourceMaps: {} as Record<string, string>,
      snapshots: {} as Record<string, string>,
      runtime: {
        framework: { framework: 'react' },
        routes: [],
        stores: [],
        chunks: { known: [], loaded: [] },
        coverage: {},
        navigations: [],
      },
      htmlHash,
    },
  };
}

test('lays out every required bundle path', async () => {
  const { input } = await fixtureInput();
  const files = await buildBundleFiles(input);
  const paths = Object.keys(files).sort();

  expect(paths).toContain('raidr.json');
  expect(paths).toContain('network/requests.jsonl');
  expect(paths).toContain('network/websockets.jsonl');
  expect(paths).toContain('gaps.json');
  expect(paths).toContain('redaction.json');
  expect(paths).toContain('runtime/framework.json');
  expect(paths).toContain('runtime/routes.json');
  expect(paths).toContain('runtime/stores.json');
  expect(paths).toContain('runtime/chunks.json');
  expect(paths).toContain('runtime/coverage.json');
  expect(paths).toContain(`content/${input.htmlHash}.html`);
});

test('writes referenced bodies with the extension implied by mime type', async () => {
  const { input } = await fixtureInput();
  const files = await buildBundleFiles(input);
  const body = files[`content/${input.htmlHash}.html`];
  expect(strFromU8(body!)).toBe('<html></html>');
});

test('records gaps verbatim so reconstruction can see what is missing', async () => {
  const { input } = await fixtureInput();
  const files = await buildBundleFiles(input);
  const gaps = JSON.parse(strFromU8(files['gaps.json']!));
  expect(gaps).toHaveLength(1);
  expect(gaps[0].reason).toBe('body-evicted');
});

test('never writes the pseudonym salt into redaction.json', async () => {
  const { input } = await fixtureInput();
  const files = await buildBundleFiles(input);
  const text = strFromU8(files['redaction.json']!);
  expect(text).toContain('<JWT:a1b2>');
  expect(text.toLowerCase()).not.toContain('salt');
});

test('zips into an archive that unzips back to the same files', async () => {
  const { input } = await fixtureInput();
  const files = await buildBundleFiles(input);
  const zipped = await zipBundle(files);
  const unzipped = unzipSync(zipped);
  expect(strFromU8(unzipped['raidr.json']!)).toBe(strFromU8(files['raidr.json']!));
});

test('filename encodes host and start time', () => {
  expect(bundleFilename('https://app.example.com', '2026-08-24T10:05:00.000Z')).toBe(
    'raidr-app.example.com-20260824-1005.zip'
  );
});

test('writes discovered source maps and an index mapping scripts to them', async () => {
  const { store, input } = await fixtureInput();
  const mapText = JSON.stringify({
    version: 3,
    sources: ['src/App.tsx'],
    sourcesContent: ['export const App = () => null;'],
    mappings: 'AAAA',
  });
  const mapHash = await store.put(encoder.encode(mapText));
  input.sourceMaps = { 'https://example.com/assets/app.js': mapHash };

  const files = await buildBundleFiles(input);
  expect(Object.keys(files)).toContain(`sourcemaps/${mapHash}.map`);
  expect(strFromU8(files[`sourcemaps/${mapHash}.map`]!)).toBe(mapText);

  const index = JSON.parse(strFromU8(files['sourcemaps/index.json']!));
  expect(index['https://example.com/assets/app.js']).toBe(mapHash);
});

test('writes an empty source map index when none were discovered', async () => {
  const { input } = await fixtureInput();
  const files = await buildBundleFiles(input);
  expect(JSON.parse(strFromU8(files['sourcemaps/index.json']!))).toEqual({});
});

test('zips entries large enough to cross fflate’s worker threshold', async () => {
  // Regression: fflate's async zip() hands large entries to a Web Worker that
  // receives undefined data under Bun. Every real capture exceeds this size.
  const files = {
    'content/big.js': new Uint8Array(500_000).fill(65),
    'raidr.json': new TextEncoder().encode('{}'),
  };
  const zipped = await zipBundle(files);
  const unzipped = unzipSync(zipped);
  expect(unzipped['content/big.js']!.byteLength).toBe(500_000);
});

test('writes rendered-DOM snapshots separately from served content', async () => {
  const { store, input } = await fixtureInput();
  const html = '<html><body>client-rendered /league</body></html>';
  const hash = await store.put(encoder.encode(html));
  input.snapshots = { '/league': hash };

  const files = await buildBundleFiles(input);
  expect(strFromU8(files[`snapshots/${hash}.html`]!)).toBe(html);
  // The index maps route → hash, so a consumer knows which page it belongs to.
  expect(JSON.parse(strFromU8(files['snapshots/index.json']!))['/league']).toBe(hash);
  // And it must not leak into the byte-exact served content.
  expect(Object.keys(files)).not.toContain(`content/${hash}.html`);
});

test('an empty snapshot index is still written', async () => {
  const { input } = await fixtureInput();
  const files = await buildBundleFiles(input);
  expect(JSON.parse(strFromU8(files['snapshots/index.json']!))).toEqual({});
});
