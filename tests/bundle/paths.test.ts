import { expect, test } from 'bun:test';
import { contentPath, sourcemapPath, extensionForMime } from '../../src/bundle/paths';

test('content path is content-addressed with extension', () => {
  expect(contentPath('abc123', 'js')).toBe('content/abc123.js');
});

test('sourcemap path lives in its own directory', () => {
  expect(sourcemapPath('abc123')).toBe('sourcemaps/abc123.map');
});

test('maps common mime types to extensions', () => {
  expect(extensionForMime('application/javascript')).toBe('js');
  expect(extensionForMime('text/javascript')).toBe('js');
  expect(extensionForMime('application/json')).toBe('json');
  expect(extensionForMime('text/html')).toBe('html');
  expect(extensionForMime('text/css')).toBe('css');
  expect(extensionForMime('image/png')).toBe('png');
});

test('falls back to bin for unknown or missing mime', () => {
  expect(extensionForMime('application/x-weird')).toBe('bin');
  expect(extensionForMime(null)).toBe('bin');
});

test('strips mime parameters before matching', () => {
  expect(extensionForMime('application/json; charset=utf-8')).toBe('json');
});
