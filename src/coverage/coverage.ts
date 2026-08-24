import { endpointKey } from './pathTemplate';

export interface ChunkManifest {
  known: string[];
  loaded: string[];
}

export interface RouteRecord {
  path: string;
  visited: boolean;
}

export interface CoverageInput {
  chunks: ChunkManifest;
  routes: RouteRecord[];
  requests: Array<{ method: string; url: string; status: number | null }>;
}

export interface EndpointCoverage {
  key: string;
  calls: number;
  statuses: number[];
}

export interface CoverageReport {
  chunks: { known: number; loaded: number; pct: number; missing: string[] };
  routes: { total: number; visited: number; pct: number; unvisited: string[] };
  endpoints: EndpointCoverage[];
  complete: boolean;
}

/** An empty denominator means nothing is outstanding, so coverage is complete. */
function percent(part: number, total: number): number {
  return total === 0 ? 100 : Math.round((part / total) * 100);
}

export function computeCoverage(input: CoverageInput): CoverageReport {
  const loadedSet = new Set(input.chunks.loaded);
  const missing = input.chunks.known.filter((chunk) => !loadedSet.has(chunk));
  const loadedKnown = input.chunks.known.length - missing.length;

  const unvisited = input.routes
    .filter((route) => !route.visited)
    .map((route) => route.path);
  const visited = input.routes.length - unvisited.length;

  const endpoints = new Map<string, { calls: number; statuses: Set<number> }>();
  for (const request of input.requests) {
    const key = endpointKey(request.method, request.url);
    let entry = endpoints.get(key);
    if (!entry) {
      entry = { calls: 0, statuses: new Set<number>() };
      endpoints.set(key, entry);
    }
    entry.calls += 1;
    if (request.status !== null) entry.statuses.add(request.status);
  }

  return {
    chunks: {
      known: input.chunks.known.length,
      loaded: loadedKnown,
      pct: percent(loadedKnown, input.chunks.known.length),
      missing,
    },
    routes: {
      total: input.routes.length,
      visited,
      pct: percent(visited, input.routes.length),
      unvisited,
    },
    endpoints: Array.from(endpoints.entries())
      .map(([key, value]) => ({
        key,
        calls: value.calls,
        statuses: Array.from(value.statuses),
      }))
      .sort((a, b) => b.calls - a.calls),
    complete: missing.length === 0 && unvisited.length === 0,
  };
}
