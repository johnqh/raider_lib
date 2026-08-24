const NUMERIC_RE = /^\d+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_RE = /^[0-9a-f]{16,}$/i;
const OPAQUE_RE = /^[A-Za-z0-9_-]{24,}$/;

function templateSegment(segment: string): string {
  if (segment === '') return segment;
  if (NUMERIC_RE.test(segment)) return '{id}';
  if (UUID_RE.test(segment)) return '{uuid}';
  if (HASH_RE.test(segment)) return '{hash}';
  if (OPAQUE_RE.test(segment)) return '{token}';
  return segment;
}

export function toPathTemplate(pathname: string): string {
  return pathname.split('/').map(templateSegment).join('/');
}

export function endpointKey(method: string, url: string): string {
  try {
    return `${method} ${toPathTemplate(new URL(url).pathname)}`;
  } catch {
    return `${method} ${url}`;
  }
}
