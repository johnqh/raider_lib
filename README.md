# xray_lib

The pure core of **xray** — a bundle format, redaction engine, and analysis
pipeline for capturing a running web app and reconstructing a working
approximation of it.

```bash
npm install @sudobility/xray_lib
```

## What it does

`xray_lib` holds everything about xray that is a pure function. Given the raw
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

Callers supply bytes; `xray_lib` returns values. The two consumers below sit on
opposite sides of that line and never see each other:

```
xray_lib              pure: bundle format, redaction, coverage, inference, codegen
   ├── xray_extension   browser: CDP capture, offscreen buffer, side panel
   └── xray_cli         node:    unzip, filesystem, project emit, replay server
```

## Development

```bash
bun install
bun run typecheck
bun test
bun run build     # → dist/
```

Design spec and implementation plans live in `docs/superpowers/`.

## The xray project

| Repository | Role |
|---|---|
| [`xray_lib`](https://github.com/johnqh/xray_lib) | Bundle format and pure analysis — this repo |
| [`xray_extension`](https://github.com/johnqh/xray_extension) | Chrome MV3 extension that performs the capture |
| [`xray_cli`](https://github.com/johnqh/xray_cli) | Reconstruction CLI and the agent skill |
| [`xray_web`](https://github.com/johnqh/xray_web) | Landing site |

## License

BUSL-1.1 — see [LICENSE.md](LICENSE.md).
