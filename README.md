# page-xerox

Generate AI-ready Markdown copies of your HTML pages at build time.

page-xerox hooks into your static site's build pipeline and produces `.md` files alongside your `.html` output - complete with YAML frontmatter. Feed them to LLMs, RAG pipelines, or search indexes.

## Install

```bash
npm install page-xerox
```

```bash
bun add page-xerox
```

## Quick Start

### Astro

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import pageXerox from 'page-xerox/astro'

export default defineConfig({
  integrations: [
    pageXerox({
      contentSelector: 'article',
      exclude: ['/404'],
    }),
  ],
})
```

### Vite (SvelteKit, SolidStart)

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import pageXerox from 'page-xerox/vite'

export default defineConfig({
  plugins: [
    pageXerox({
      contentSelector: 'main',
      baseUrl: 'https://example.com',
    }),
  ],
})
```

### Next.js

Use the CLI after `next build` with static export:

```bash
page-xerox --dir out
```

Or use the programmatic adapter in a post-build script:

```js
// scripts/post-build.mjs
import { withPageXerox } from 'page-xerox/next'

const run = withPageXerox({ contentSelector: 'article' })
await run()
```

`withPageXerox` auto-detects the output directory, checking `out` first, then `.next/server/pages`. You can also pass a directory explicitly:

```js
await run('./custom-out')
```

### Eleventy

```js
// .eleventy.js
const pageXerox = require('page-xerox/eleventy')

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(pageXerox, {
    contentSelector: 'main',
    exclude: ['/admin'],
  })
}
```

### CLI

```bash
page-xerox --dir ./dist
```

All flags:

```
-d, --dir <path>        Directory containing HTML files (required)
-s, --selector <css>    CSS selector for content extraction (default: "main")
-e, --exclude <path>    Paths to exclude (repeatable)
    --no-metadata       Disable YAML frontmatter
-b, --base-url <url>    Base URL for resolving relative URLs
-h, --help              Show this help message
-v, --version           Show version number
```

Example with multiple excludes:

```bash
page-xerox --dir ./dist --selector article --exclude /404 --exclude /admin --base-url https://example.com
```

## Configuration

All framework adapters and the CLI accept the same core options:

| Option            | Type                     | Default  | Description                                        |
| ----------------- | ------------------------ | -------- | -------------------------------------------------- |
| `contentSelector` | `string`                 | `"main"` | CSS selector for content extraction                |
| `exclude`         | `(string \| RegExp)[]`   | `[]`     | Paths to skip - strings match as prefixes, RegExp tested against path |
| `metadata`        | `boolean`                | `true`   | Include YAML frontmatter in output                 |
| `baseUrl`         | `string`                 | -        | Base URL for resolving relative canonical and og:image URLs |

## Output Format

For each `.html` file, page-xerox writes a `.md` file in the same directory. The output includes YAML frontmatter extracted from the HTML `<head>`:

```markdown
---
path: /blog/my-post
title: My Blog Post
description: A short summary of the post
canonical: https://example.com/blog/my-post
og_image: https://example.com/images/my-post.png
generated: "2026-02-26T12:00:00.000Z"
---

# My Blog Post

The converted markdown content appears here...
```

Metadata fields are pulled from:

- `path` - derived from `<link rel="canonical">` or the file path
- `title` - from `<title>`
- `description` - from `<meta name="description">`
- `canonical` - from `<link rel="canonical">`
- `og_image` - from `<meta property="og:image">`
- `generated` - ISO timestamp of when the file was generated

Set `metadata: false` (or `--no-metadata` in the CLI) to omit the frontmatter block.

## Opting Out

Add the `data-md-ignore` attribute to any HTML element to exclude it from the markdown output:

```html
<main>
  <article>
    <h1>Page Title</h1>
    <p>This content will be converted to markdown.</p>
  </article>

  <nav data-md-ignore>
    <a href="/prev">Previous</a>
    <a href="/next">Next</a>
  </nav>

  <aside data-md-ignore>
    <p>This sidebar will not appear in the markdown output.</p>
  </aside>
</main>
```

Elements with `data-md-ignore` and all their children are stripped before conversion. Script, style, noscript, and iframe tags are always removed.

## Dev Middleware

The Astro and Vite adapters include dev server middleware that serves `.md` files on the fly. Request any path with a `.md` extension and the middleware will convert the corresponding HTML and return markdown.

```
GET /blog/my-post.md  ->  converts /blog/my-post and returns markdown
```

Control how the middleware resolves HTML source with the `dev.resolve` option:

| Strategy       | Behavior                                               |
| -------------- | ------------------------------------------------------ |
| `disk-first`   | Try reading from the build output directory first, fall back to fetching from the dev server (default) |
| `fetch-first`  | Try fetching from the dev server first, fall back to disk |
| `disk-only`    | Only read from the build output directory               |
| `fetch-only`   | Only fetch from the dev server                          |

```js
pageXerox({
  dev: {
    resolve: 'fetch-first',
  },
})
```

## Programmatic API

Import the core functions directly for custom workflows:

```ts
import {
  convertHtml,
  convertFile,
  convertDir,
  cleanHtml,
  extractMetadata,
} from 'page-xerox'
```

### `convertHtml(html, options?)`

Convert an HTML string to markdown with metadata. Returns `{ markdown, metadata }`.

```ts
const { markdown, metadata } = convertHtml('<html>...</html>', {
  contentSelector: 'article',
  baseUrl: 'https://example.com',
})
```

### `convertFile(htmlPath, options?)`

Read an HTML file from disk, convert it, and write the `.md` file alongside it.

```ts
await convertFile('./dist/blog/post.html')
```

### `convertDir(dirPath, options?)`

Convert all `.html` files in a directory (recursively). Returns an array of written `.md` file paths.

```ts
const written = await convertDir('./dist', {
  exclude: ['/404', /^\/admin/],
})
console.log(`Generated ${written.length} files`)
```

### `cleanHtml(html, selector?)`

Extract content from an HTML string using a CSS selector, strip noise tags and `data-md-ignore` elements. Returns a cleaned HTML string ready for markdown conversion.

```ts
const cleaned = cleanHtml('<html>...</html>', 'article')
```

### `extractMetadata(html)`

Parse an HTML string and return metadata extracted from the `<head>`.

```ts
const meta = extractMetadata('<html>...</html>')
// { path, title, description, canonical, og_image, generated }
```

## License

MIT
