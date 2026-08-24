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

export {
  redactJsonValue,
  redactJsonText,
  redactHtmlHydration,
} from './redaction/json';
export { redactRequest } from './redaction/index';
export type { RedactableRequest, RedactedRequest } from './redaction/index';

export { toPathTemplate, endpointKey } from './coverage/pathTemplate';

export { computeCoverage } from './coverage/coverage';
export type {
  ChunkManifest,
  RouteRecord,
  CoverageInput,
  CoverageReport,
  EndpointCoverage,
} from './coverage/coverage';
