import { RAIDER_FORMAT_VERSION } from '../index';
import type { RaiderManifest } from './types';

export interface CreateManifestInput {
  sessionId: string;
  origin: string;
  startedAt: string;
}

export function createManifest(input: CreateManifestInput): RaiderManifest {
  return {
    formatVersion: RAIDER_FORMAT_VERSION,
    sessionId: input.sessionId,
    origin: input.origin,
    startedAt: input.startedAt,
    endedAt: null,
    counts: { requests: 0, frames: 0, bodies: 0, gaps: 0 },
    stack: null,
  };
}

export type ValidateResult =
  | { ok: true; manifest: RaiderManifest }
  | { ok: false; errors: string[] };

export function validateManifest(value: unknown): ValidateResult {
  const errors: string[] = [];
  if (typeof value !== 'object' || value === null) {
    return { ok: false, errors: ['manifest must be an object'] };
  }
  const v = value as Record<string, unknown>;

  if (v.formatVersion !== RAIDER_FORMAT_VERSION) {
    errors.push(
      `formatVersion must be ${RAIDER_FORMAT_VERSION}, got ${String(v.formatVersion)}`
    );
  }
  for (const key of ['sessionId', 'origin', 'startedAt'] as const) {
    if (typeof v[key] !== 'string') errors.push(`${key} must be a string`);
  }
  if (typeof v.counts !== 'object' || v.counts === null) {
    errors.push('counts must be an object');
  }

  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, manifest: value as RaiderManifest };
}

export function toJsonl(rows: unknown[]): string {
  return rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
}

export function parseJsonl<T>(text: string): T[] {
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}
