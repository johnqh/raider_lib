export const XRAY_FORMAT_VERSION = 1 as const;

export type {
  CapturedRequest,
  CapturedFrame,
  Gap,
  GapReason,
  RedactionEntry,
  RedactionKind,
  StackFingerprint,
  XrayManifest,
} from './bundle/types';

export { contentPath, sourcemapPath, extensionForMime } from './bundle/paths';

export {
  createManifest,
  validateManifest,
  toJsonl,
  parseJsonl,
} from './bundle/manifest';
export type { CreateManifestInput, ValidateResult } from './bundle/manifest';

export { createPseudonymizer } from './redaction/pseudonym';
export type { Pseudonymizer } from './redaction/pseudonym';

export { isSensitiveKey, classifyValue } from './redaction/patterns';
export { redactHeaders } from './redaction/headers';
