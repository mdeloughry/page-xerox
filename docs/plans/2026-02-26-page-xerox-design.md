# page-xerox Design Document

Universal static site utility that generates AI-ready Markdown versions of HTML pages.

## Context

- Open-source community tool for diverse real-world sites
- Single npm package (`page-xerox`) with multiple entry points
- Framework adapters as peer dependencies, core deps bundled
- Built with Bun, TypeScript, tsup (ESM + CJS)

## Architecture: Monolithic Core + Thin Adapters

Single `convertHtml(html, options)` function does all conversion. Each framework adapter is a thin wrapper (30-80 lines) that hooks into lifecycle events and delegates to the core. Power users get exposed `cleanHtml` and `extractMetadata` utilities for composition.

```
Framework Adapter (thin) --> core.convertHtml(html, opts) --> .md string
                         --> core.convertFile(htmlPath)    --> writes .md
                         --> core.convertDir(dirPath)      --> walks & writes all
```

## Core Engine

### Public API

```ts
convertHtml(html: string, options?: ConvertOptions): ConvertResult
convertFile(htmlPath: string, options?: ConvertOptions): Promise<void>
convertDir(dirPath: string, options?: ConvertOptions): Promise<string[]>

// Power user utilities
cleanHtml(html: string, selector?: string): string
extractMetadata(html: string): Metadata
```

### Types

```ts
interface ConvertOptions {
  contentSelector?: string          // default: "main"
  exclude?: (string | RegExp)[]    // paths to skip
  metadata?: boolean               // YAML frontmatter, default: true
  baseUrl?: string                 // for resolving relative URLs
}

interface ConvertResult {
  markdown: string
  metadata: Metadata
}

interface Metadata {
  path: string
  title: string
  description: string
  canonical: string
  og_image: string
  generated: string
}
```

### Processing Pipeline

1. Load HTML into cheerio
2. Extract metadata from `<head>` (title, meta description, og:image, canonical)
3. Select content via `contentSelector` (default `main`)
4. Strip `[data-md-ignore]` elements within selected content
5. Strip residual noise (`script`, `style`, `noscript`, `iframe` tags)
6. Convert cleaned HTML to markdown via `node-html-markdown`
7. Prepend YAML frontmatter if `metadata: true`

Fallback: if `contentSelector` matches nothing, fall back to `body` with a console warning. If `body` is also empty, skip the file and warn.

## Framework Adapters

### Astro (`page-xerox/astro`)

- `astro:build:done` - walks output directory, calls `convertDir()`
- `astro:server:setup` - registers dev middleware for `.md` requests

### Vite (`page-xerox/vite`)

- `closeBundle` - post-build, walks output dir, calls `convertDir()`
- `configureServer` - registers dev middleware for `.md` requests

### Next.js (`page-xerox/next`)

- Convenience wrapper around `convertDir()` that knows Next output locations
- `.next/server` for app router, `out/` for static export
- Build-only (no dev middleware - Next has no plugin-extensible dev server)

### Eleventy (`page-xerox/eleventy`)

- `eleventy.after` event - receives output dir, calls `convertDir()`
- Build-only (no plugin-extensible dev server)

### Dev Middleware Resolution (Astro + Vite)

```ts
interface DevOptions {
  resolve?: 'disk-first' | 'fetch-first' | 'disk-only' | 'fetch-only'
}
```

- **disk-first** (default): Look for pre-built HTML on disk, convert. If not found, fetch from local dev server.
- **fetch-first**: Always fetch from dev server. Fall back to disk if fetch fails.
- **disk-only / fetch-only**: No fallback.

Configurable by the developer in adapter options.

## CLI

```bash
page-xerox --dir ./dist
page-xerox --dir ./dist --selector "article"
page-xerox --dir ./dist --exclude "/admin" --exclude "/api/*"
page-xerox --dir ./dist --no-metadata
page-xerox --dir ./dist --base-url "https://example.com"
```

- Uses `parseArgs` from `node:util` (zero CLI dependencies)
- Delegates to `convertDir()` from core
- Prints summary: `"Generated 42 .md files in ./dist (3 skipped)"`
- Non-zero exit code on errors
- `--help` and `--version` flags

## Build & Distribution

### Package Structure

```
page-xerox/
  src/
    core.ts        - framework-agnostic engine
    astro.ts       - astro integration
    vite.ts        - vite plugin
    next.ts        - next.js adapter
    eleventy.ts    - eleventy plugin
    cli.ts         - standalone CLI
  package.json
  tsup.config.ts
```

### tsup Config

- Formats: ESM + CJS
- Entry points: core, astro, vite, next, eleventy, cli
- DTS generation for all entry points
- External: all peer deps
- Target: Node 18+

### Exports Map

```json
{
  ".": "./dist/core.js",
  "./astro": "./dist/astro.js",
  "./vite": "./dist/vite.js",
  "./next": "./dist/next.js",
  "./eleventy": "./dist/eleventy.js"
}
```

### Dependencies

Runtime: cheerio, node-html-markdown, glob, yaml
Peer (optional): astro, vite
Dev: tsup, typescript, bun-types, vitest

## Output Format

```yaml
---
path: "/blog/my-post/"
title: "Page Title"
description: "Meta description"
canonical: "https://example.com/blog/my-post/"
og_image: "https://example.com/og.jpg"
generated: "2026-02-26T08:00:00.000Z"
---

# Clean Markdown Content
```

## Error Handling

- Missing `contentSelector` match: warn, fall back to `body`
- Empty `body`: skip file, warn, continue directory processing
- Malformed HTML: cheerio handles gracefully, convert what's available
- Permission errors on write: throw with clear message including file path
- All warnings prefixed with `[page-xerox]`

## Testing

- Unit tests for core functions with fixture HTML files
- Integration tests for `convertDir` against temp directories
- Adapter tests are minimal (verify they call core correctly)
- vitest with Bun runtime

## Decisions

- **v1 CLI is directory-only.** URL crawling deferred to v2 (architecture supports it - core accepts HTML strings from any source).
- **`data-md-ignore` scoped to content area.** Select via `contentSelector` first, then strip `[data-md-ignore]` within. Page-level exclusion uses the `exclude` option.
- **Single package, multiple exports.** No monorepo. `page-xerox/astro`, `page-xerox/vite` etc. Framework deps are optional peer deps.
- **Approach A (Monolithic Core)** with exposed `cleanHtml` and `extractMetadata` utilities for power users.
