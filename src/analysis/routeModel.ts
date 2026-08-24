import { endpointKey } from '../coverage/pathTemplate';

export interface RouteModelInput {
  routes: string[];
  navigations: Array<{ navigationId: string; path: string }>;
  requests: Array<{ method: string; url: string; navigationId: string | null }>;
}

export interface RouteModel {
  routes: Array<{
    path: string;
    params: string[];
    visited: boolean;
    endpoints: string[];
    lazy: boolean;
  }>;
  unattributed: string[];
}

const ASSET_RE = /\.(js|mjs|css|map|png|jpe?g|gif|svg|webp|woff2?|ico|txt)$/i;

function paramsOf(pattern: string): string[] {
  return Array.from(pattern.matchAll(/:([A-Za-z0-9_]+)/g)).map((m) => m[1]!);
}

/** Does a concrete path match a route pattern with `:param` segments? */
function matches(pattern: string, path: string): boolean {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, i) => part.startsWith(':') || part === pathParts[i]);
}

function isApiCall(url: string): boolean {
  try {
    return !ASSET_RE.test(new URL(url).pathname);
  } catch {
    return !ASSET_RE.test(url);
  }
}

export function buildRouteModel(input: RouteModelInput): RouteModel {
  const byNavigation = new Map<string, string[]>();
  const unattributed: string[] = [];

  for (const request of input.requests) {
    if (!isApiCall(request.url)) continue;
    const key = endpointKey(request.method, request.url);
    if (request.navigationId === null) {
      if (!unattributed.includes(key)) unattributed.push(key);
      continue;
    }
    const bucket = byNavigation.get(request.navigationId) ?? [];
    if (!bucket.includes(key)) bucket.push(key);
    byNavigation.set(request.navigationId, bucket);
  }

  const routes = input.routes.map((path) => {
    const navigations = input.navigations.filter((nav) => matches(path, nav.path));
    const endpoints: string[] = [];
    for (const nav of navigations) {
      for (const key of byNavigation.get(nav.navigationId) ?? []) {
        if (!endpoints.includes(key)) endpoints.push(key);
      }
    }
    return {
      path,
      params: paramsOf(path),
      visited: navigations.length > 0,
      endpoints,
      // Any route below the root is a lazy-chunk candidate; the chunk
      // manifest confirms it during codegen.
      lazy: path !== '/' && path.length > 1,
    };
  });

  return { routes, unattributed };
}
