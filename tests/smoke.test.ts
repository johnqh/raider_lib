import { expect, test } from 'bun:test';
import { RAIDR_FORMAT_VERSION } from '../src/index';

test('exports the bundle format version', () => {
  expect(RAIDR_FORMAT_VERSION).toBe(1);
});
