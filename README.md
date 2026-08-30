# raider_lib

The pure core of **raider** — a bundle format, redaction engine, and analysis
pipeline for capturing a running web app and reconstructing a working
approximation of it.

```bash
npm install @sudobility/raider_lib
```

## What it does

`raider_lib` holds everything about raider that is a pure function. Given the raw
material of a capture — requests, responses, chunks, source maps, DOM
snapshots — it produces the derived artifacts that reconstruction needs:

| Area | Exports |
|---|---|
| **Bundle format** | `createManifest`, `validateManifest`, `buildBundleFiles`, `zipBundle`, `contentPath` |
| **Redaction** | `redactRequest`, `redactHeaders`, `redactJsonValue`, `redactHtmlHydration`, `createPseudonymizer` |
| **Coverage** | `computeCoverage`, `toPathTemplate`, `endpointKey` |
| **Analysis** | `parseSourceMap`, `recoverSources`, `inferSchema`, `buildApiModel`, `buildRouteModel`, `auditLinks`, `deriveTimeline` |
| **Codegen** | `generateTypes`, `generateClient`, `generateReplayServer`, `generateProject` |

## The no-I/O constraint

This package performs **no I/O**. No `fs`, no `path`, no `process`, and no
`DOM` in its tsconfig `lib`. That is not a style preference — it is what makes
the package safe to bundle into a Chrome MV3 extension, and what keeps every
one of these stages testable without fixtures on disk.

Callers supply bytes; `raider_lib` returns values. The two consumers below sit on
opposite sides of that line and never see each other:

```
raider_lib              pure: bundle format, redaction, coverage, inference, codegen
   ├── raider_extension   browser: CDP capture, offscreen buffer, side panel
   └── raider_cli         node:    unzip, filesystem, project emit, replay server
```

## Development

```bash
bun install
bun run typecheck
bun test
bun run build     # → dist/
```

Design spec and implementation plans live in `docs/superpowers/`.

## The raider project

| Repository | Role |
|---|---|
| [`raider_lib`](https://github.com/johnqh/raider_lib) | Bundle format and pure analysis — this repo |
| [`raider_extension`](https://github.com/johnqh/raider_extension) | Chrome MV3 extension that performs the capture |
| [`raider_cli`](https://github.com/johnqh/raider_cli) | Reconstruction CLI and the agent skill |
| [`raider_web`](https://github.com/johnqh/raider_web) | Landing site |

## License

BUSL-1.1 — see [LICENSE.md](LICENSE.md).
