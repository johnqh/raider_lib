import { expect, test } from 'bun:test';
import {
  parseSourceMap,
  recoverSources,
  recoveryRatio,
  normalizeSourcePath,
} from '../../src/analysis/sourceMap';

const MAP = JSON.stringify({
  version: 3,
  file: 'app.js',
  sources: ['../../src/App.tsx', 'webpack://app/./src/main.tsx', 'src/util.ts'],
  sourcesContent: ['export const App = () => null;', 'import "./App";', null],
  mappings: 'AAAA',
});

test('parses a valid source map', () => {
  const map = parseSourceMap(MAP);
  expect(map).not.toBeNull();
  expect(map!.sources).toHaveLength(3);
});

test('returns null for non-JSON and for the wrong version', () => {
  expect(parseSourceMap('<!doctype html>')).toBeNull();
  expect(parseSourceMap(JSON.stringify({ version: 2, sources: [] }))).toBeNull();
});

test('recovers only sources that carry content', () => {
  const files = recoverSources(parseSourceMap(MAP)!);
  expect(files).toHaveLength(2);
  expect(files[0]!.content).toContain('export const App');
});

test('normalizes bundler-specific source paths', () => {
  expect(normalizeSourcePath('../../src/App.tsx')).toBe('src/App.tsx');
  expect(normalizeSourcePath('webpack://app/./src/main.tsx')).toBe('src/main.tsx');
  expect(normalizeSourcePath('/src/util.ts')).toBe('src/util.ts');
  expect(normalizeSourcePath('src/util.ts')).toBe('src/util.ts');
});

test('strips node_modules sources — they are dependencies, not app code', () => {
  const map = parseSourceMap(
    JSON.stringify({
      version: 3,
      sources: ['../node_modules/react/index.js', '../src/App.tsx'],
      sourcesContent: ['module.exports = {};', 'export const App = 1;'],
      mappings: 'AAAA',
    })
  )!;
  const files = recoverSources(map);
  expect(files).toHaveLength(1);
  expect(files[0]!.path).toBe('src/App.tsx');
});

test('recovery ratio drives the recovery-mode decision', () => {
  expect(recoveryRatio({ mappedBytes: 900, totalBytes: 1000 })).toBe(90);
  expect(recoveryRatio({ mappedBytes: 0, totalBytes: 1000 })).toBe(0);
  expect(recoveryRatio({ mappedBytes: 0, totalBytes: 0 })).toBe(0);
});
