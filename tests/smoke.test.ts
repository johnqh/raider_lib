import { expect, test } from 'bun:test';
import { RAIDER_FORMAT_VERSION } from '../src/index';

test('exports the bundle format version', () => {
  expect(RAIDER_FORMAT_VERSION).toBe(1);
});
