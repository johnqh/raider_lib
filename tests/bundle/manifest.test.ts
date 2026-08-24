import { expect, test } from 'bun:test';
import { createManifest, validateManifest, parseJsonl, toJsonl } from '../../src/bundle/manifest';
import type { CapturedRequest } from '../../src/bundle/types';

test('creates a manifest with zeroed counts', () => {
  const m = createManifest({
    sessionId: 's1',
    origin: 'https://example.com',
    startedAt: '2026-08-24T10:00:00.000Z',
  });
  expect(m.formatVersion).toBe(1);
  expect(m.endedAt).toBeNull();
  expect(m.counts).toEqual({ requests: 0, frames: 0, bodies: 0, gaps: 0 });
  expect(m.stack).toBeNull();
});

test('validates a well-formed manifest', () => {
  const m = createManifest({
    sessionId: 's1',
    origin: 'https://example.com',
    startedAt: '2026-08-24T10:00:00.000Z',
  });
  const result = validateManifest(m);
  expect(result.ok).toBe(true);
});

test('rejects a manifest from a future format version', () => {
  const result = validateManifest({ formatVersion: 99, sessionId: 's1' });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors[0]).toContain('formatVersion');
  }
});

test('rejects a non-object', () => {
  const result = validateManifest(null);
  expect(result.ok).toBe(false);
});

test('round-trips JSONL', () => {
  const rows = [{ a: 1 }, { a: 2 }];
  expect(parseJsonl(toJsonl(rows))).toEqual(rows);
});

test('parseJsonl ignores blank trailing lines', () => {
  expect(parseJsonl('{"a":1}\n\n')).toEqual([{ a: 1 }]);
});

test('reads the committed minimal fixture bundle', async () => {
  const manifestText = await Bun.file('tests/fixtures/minimal/xray.json').text();
  const result = validateManifest(JSON.parse(manifestText));
  expect(result.ok).toBe(true);

  const requestsText = await Bun.file('tests/fixtures/minimal/network/requests.jsonl').text();
  const requests = parseJsonl<CapturedRequest>(requestsText);
  expect(requests).toHaveLength(2);
  expect(requests[0]!.url).toBe('https://example.com/');
  expect(requests[1]!.responseBodyHash).not.toBeNull();
});
