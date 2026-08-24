import { expect, test } from 'bun:test';
import { XRAY_FORMAT_VERSION } from '../src/index';

test('exports the bundle format version', () => {
  expect(XRAY_FORMAT_VERSION).toBe(1);
});
