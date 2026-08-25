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

export { MemoryContentStore } from './bundle/store';
export type { ContentStore, HashFn } from './bundle/store';
export {
  buildBundleFiles,
  zipBundle,
  bundleFilename,
} from './bundle/assemble';
export type { BundleInput, RuntimeArtifacts } from './bundle/assemble';

export {
  parseSourceMap,
  recoverSources,
  recoveryRatio,
  normalizeSourcePath,
} from './analysis/sourceMap';
export type { SourceMap, RecoveredFile } from './analysis/sourceMap';

export { inferSchema, unifySchemas } from './analysis/schema';
export type { JsonSchema } from './analysis/schema';

export { buildApiModel } from './analysis/apiModel';
export type { ApiModel, EndpointModel, EndpointSample } from './analysis/apiModel';
export { buildRouteModel } from './analysis/routeModel';
export type { RouteModel, RouteModelInput } from './analysis/routeModel';

export { schemaToType, declareType, typeNameFor } from './codegen/types';
export { generateTypes, generateClient, methodNameFor } from './codegen/client';
export { generateReplayServer, templateToHonoPath } from './codegen/replay';

export { generateProject, pageNameFor } from './codegen/project';
export type { ProjectInput } from './codegen/project';

export { deriveTimeline } from './analysis/navigations';
export type { DerivedNavigation, DerivedTimeline } from './analysis/navigations';
