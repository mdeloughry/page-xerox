# page-xerox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a universal static site utility that generates AI-ready Markdown from HTML pages, with framework adapters for Astro, Vite, Next.js, and Eleventy plus a standalone CLI.

**Architecture:** Monolithic core engine (`convertHtml` / `convertFile` / `convertDir`) with thin framework adapters that hook into each framework's lifecycle events. Single npm package with multiple export paths.

**Tech Stack:** TypeScript, Bun, tsup, cheerio, node-html-markdown, glob, yaml, vitest

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `src/core.ts` (empty placeholder)

**Step 1: Initialize the project with Bun**

```bash
cd /Users/matt/projects/personal/page-xerox
bun init -y
```

**Step 2: Replace package.json with full config**

Replace the generated `package.json` with:

```json
{
  "name": "page-xerox",
  "version": "0.1.0",
  "description": "Universal static site utility that generates AI-ready Markdown from HTML pages",
  "type": "module",
  "main": "./dist/core.cjs",
  "module": "./dist/core.js",
  "types": "./dist/core.d.ts",
  "bin": {
    "page-xerox": "./dist/cli.js"
  },
  "exports": {
    ".": {
      "import": "./dist/core.js",
      "require": "./dist/core.cjs",
      "types": "./dist/core.d.ts"
    },
    "./astro": {
      "import": "./dist/astro.js",
      "require": "./dist/astro.cjs",
      "types": "./dist/astro.d.ts"
    },
    "./vite": {
      "import": "./dist/vite.js",
      "require": "./dist/vite.cjs",
      "types": "./dist/vite.d.ts"
    },
    "./next": {
      "import": "./dist/next.js",
      "require": "./dist/next.cjs",
      "types": "./dist/next.d.ts"
    },
    "./eleventy": {
      "import": "./dist/eleventy.js",
      "require": "./dist/eleventy.cjs",
      "types": "./dist/eleventy.d.ts"
    }
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "astro": ">=4.0.0",
    "vite": ">=5.0.0"
  },
  "peerDependenciesMeta": {
    "astro": { "optional": true },
    "vite": { "optional": true }
  },
  "keywords": ["markdown", "html", "static-site", "ai", "astro", "vite", "nextjs", "eleventy"],
  "license": "MIT"
}
```

**Step 3: Install dependencies**

```bash
bun add cheerio node-html-markdown glob yaml
bun add -d tsup typescript @types/node vitest
```

**Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 5: Create tsup.config.ts**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    core: 'src/core.ts',
    astro: 'src/astro.ts',
    vite: 'src/vite.ts',
    next: 'src/next.ts',
    eleventy: 'src/eleventy.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  clean: true,
  target: 'node18',
  external: ['astro', 'vite'],
})
```

**Step 6: Create placeholder source files so build doesn't fail**

Create empty exports in each src file:

- `src/core.ts`: `export {}`
- `src/astro.ts`: `export {}`
- `src/vite.ts`: `export {}`
- `src/next.ts`: `export {}`
- `src/eleventy.ts`: `export {}`
- `src/cli.ts`: (empty file)

**Step 7: Verify build works**

```bash
bun run build
```

Expected: Clean build, `dist/` directory created with `.js`, `.cjs`, and `.d.ts` files for each entry point.

**Step 8: Commit**

```bash
git init
echo "node_modules/\ndist/\n.DS_Store" > .gitignore
git add .
git commit -m "chore: scaffold page-xerox project with tsup build"
```

---

### Task 2: Core Types

**Files:**
- Create: `src/types.ts`

**Step 1: Create the shared types file**

```ts
export interface ConvertOptions {
  /** CSS selector for content extraction. Default: "main" */
  contentSelector?: string
  /** Paths to skip. Strings match as prefixes, RegExp tested against path. */
  exclude?: (string | RegExp)[]
  /** Include YAML frontmatter in output. Default: true */
  metadata?: boolean
  /** Base URL for resolving relative canonical/og_image URLs */
  baseUrl?: string
}

export interface ConvertResult {
  /** Full markdown output including frontmatter if enabled */
  markdown: string
  /** Extracted page metadata */
  metadata: Metadata
}

export interface Metadata {
  path: string
  title: string
  description: string
  canonical: string
  og_image: string
  generated: string
}

export type ResolveStrategy = 'disk-first' | 'fetch-first' | 'disk-only' | 'fetch-only'

export interface DevOptions {
  /** How to resolve HTML for dev middleware. Default: "disk-first" */
  resolve?: ResolveStrategy
}

export interface AdapterOptions extends ConvertOptions {
  dev?: DevOptions
}
```

**Step 2: Update core.ts to re-export types**

```ts
export type { ConvertOptions, ConvertResult, Metadata } from './types.js'
```

**Step 3: Verify build**

```bash
bun run build
```

Expected: Clean build, types exported in `.d.ts` files.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add core TypeScript types"
```

---

### Task 3: extractMetadata - Tests

**Files:**
- Create: `tests/fixtures/basic.html`
- Create: `tests/extract-metadata.test.ts`

**Step 1: Create the HTML fixture**

Create `tests/fixtures/basic.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Test Page Title</title>
  <meta name="description" content="A test page for metadata extraction">
  <link rel="canonical" href="https://example.com/test-page/">
  <meta property="og:image" content="https://example.com/og.jpg">
</head>
<body>
  <nav><a href="/">Home</a></nav>
  <main>
    <h1>Hello World</h1>
    <p>This is the main content.</p>
    <div data-md-ignore>This should be stripped</div>
    <script>console.log('noise')</script>
  </main>
  <footer>Footer content</footer>
</body>
</html>
```

**Step 2: Write the failing test**

Create `tests/extract-metadata.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractMetadata } from '../src/core.js'

const fixture = readFileSync(join(__dirname, 'fixtures/basic.html'), 'utf-8')

describe('extractMetadata', () => {
  it('extracts title from <title> tag', () => {
    const meta = extractMetadata(fixture)
    expect(meta.title).toBe('Test Page Title')
  })

  it('extracts meta description', () => {
    const meta = extractMetadata(fixture)
    expect(meta.description).toBe('A test page for metadata extraction')
  })

  it('extracts canonical URL', () => {
    const meta = extractMetadata(fixture)
    expect(meta.canonical).toBe('https://example.com/test-page/')
  })

  it('extracts og:image', () => {
    const meta = extractMetadata(fixture)
    expect(meta.og_image).toBe('https://example.com/og.jpg')
  })

  it('sets generated as ISO timestamp', () => {
    const meta = extractMetadata(fixture)
    expect(meta.generated).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('returns empty strings for missing metadata', () => {
    const meta = extractMetadata('<html><head></head><body></body></html>')
    expect(meta.title).toBe('')
    expect(meta.description).toBe('')
    expect(meta.canonical).toBe('')
    expect(meta.og_image).toBe('')
  })
})
```

**Step 3: Run tests to verify they fail**

```bash
bun run test
```

Expected: FAIL - `extractMetadata` is not exported from core.

---

### Task 4: extractMetadata - Implementation

**Files:**
- Modify: `src/core.ts`

**Step 1: Implement extractMetadata**

In `src/core.ts`, add:

```ts
import * as cheerio from 'cheerio'
import type { Metadata } from './types.js'

export type { ConvertOptions, ConvertResult, Metadata } from './types.js'

export function extractMetadata(html: string): Metadata {
  const $ = cheerio.load(html)

  return {
    path: '',
    title: $('title').first().text().trim(),
    description: $('meta[name="description"]').attr('content')?.trim() ?? '',
    canonical: $('link[rel="canonical"]').attr('href')?.trim() ?? '',
    og_image: $('meta[property="og:image"]').attr('content')?.trim() ?? '',
    generated: new Date().toISOString(),
  }
}
```

**Step 2: Run tests to verify they pass**

```bash
bun run test
```

Expected: All 6 tests PASS.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: implement extractMetadata with tests"
```

---

### Task 5: cleanHtml - Tests

**Files:**
- Create: `tests/clean-html.test.ts`

**Step 1: Write the failing tests**

Create `tests/clean-html.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanHtml } from '../src/core.js'

const fixture = readFileSync(join(__dirname, 'fixtures/basic.html'), 'utf-8')

describe('cleanHtml', () => {
  it('extracts content from default selector (main)', () => {
    const result = cleanHtml(fixture)
    expect(result).toContain('Hello World')
    expect(result).toContain('main content')
  })

  it('strips nav and footer outside selector', () => {
    const result = cleanHtml(fixture)
    expect(result).not.toContain('Home')
    expect(result).not.toContain('Footer content')
  })

  it('strips data-md-ignore elements', () => {
    const result = cleanHtml(fixture)
    expect(result).not.toContain('should be stripped')
  })

  it('strips script tags', () => {
    const result = cleanHtml(fixture)
    expect(result).not.toContain('console.log')
    expect(result).not.toContain('<script')
  })

  it('strips style, noscript, iframe tags', () => {
    const html = '<main><style>.x{}</style><noscript>No JS</noscript><iframe src="x"></iframe><p>Keep</p></main>'
    const result = cleanHtml(html)
    expect(result).not.toContain('.x{}')
    expect(result).not.toContain('No JS')
    expect(result).not.toContain('iframe')
    expect(result).toContain('Keep')
  })

  it('accepts custom selector', () => {
    const html = '<main><p>Main</p></main><article><p>Article</p></article>'
    const result = cleanHtml(html, 'article')
    expect(result).toContain('Article')
    expect(result).not.toContain('Main')
  })

  it('falls back to body when selector matches nothing', () => {
    const html = '<html><body><p>Body content</p></body></html>'
    const result = cleanHtml(html, 'main')
    expect(result).toContain('Body content')
  })

  it('returns empty string when body is empty', () => {
    const html = '<html><head></head><body></body></html>'
    const result = cleanHtml(html)
    expect(result.trim()).toBe('')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
bun run test
```

Expected: FAIL - `cleanHtml` is not exported from core.

---

### Task 6: cleanHtml - Implementation

**Files:**
- Modify: `src/core.ts`

**Step 1: Implement cleanHtml**

Add to `src/core.ts`:

```ts
const NOISE_TAGS = ['script', 'style', 'noscript', 'iframe']

export function cleanHtml(html: string, selector?: string): string {
  const $ = cheerio.load(html)
  const contentSelector = selector ?? 'main'

  let $content = $(contentSelector)

  if ($content.length === 0) {
    console.warn(`[page-xerox] Selector "${contentSelector}" matched nothing, falling back to <body>`)
    $content = $('body')
  }

  if ($content.length === 0) {
    return ''
  }

  // Clone so we don't mutate the original
  const $clone = $content.clone()

  // Strip data-md-ignore elements
  $clone.find('[data-md-ignore]').remove()

  // Strip noise tags
  for (const tag of NOISE_TAGS) {
    $clone.find(tag).remove()
  }

  return $clone.html()?.trim() ?? ''
}
```

**Step 2: Run tests to verify they pass**

```bash
bun run test
```

Expected: All cleanHtml tests PASS.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: implement cleanHtml with content extraction and noise stripping"
```

---

### Task 7: convertHtml - Tests

**Files:**
- Create: `tests/convert-html.test.ts`

**Step 1: Write the failing tests**

Create `tests/convert-html.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { convertHtml } from '../src/core.js'

const fixture = readFileSync(join(__dirname, 'fixtures/basic.html'), 'utf-8')

describe('convertHtml', () => {
  it('converts HTML to markdown with frontmatter by default', () => {
    const result = convertHtml(fixture)
    expect(result.markdown).toMatch(/^---\n/)
    expect(result.markdown).toContain('title: "Test Page Title"')
    expect(result.markdown).toContain('# Hello World')
    expect(result.markdown).toContain('main content')
  })

  it('populates metadata in result', () => {
    const result = convertHtml(fixture)
    expect(result.metadata.title).toBe('Test Page Title')
    expect(result.metadata.description).toBe('A test page for metadata extraction')
    expect(result.metadata.canonical).toBe('https://example.com/test-page/')
  })

  it('omits frontmatter when metadata: false', () => {
    const result = convertHtml(fixture, { metadata: false })
    expect(result.markdown).not.toMatch(/^---/)
    expect(result.markdown).toContain('# Hello World')
  })

  it('uses custom contentSelector', () => {
    const html = '<html><head><title>T</title></head><body><main><p>Main</p></main><article><p>Art</p></article></body></html>'
    const result = convertHtml(html, { contentSelector: 'article' })
    expect(result.markdown).toContain('Art')
    expect(result.markdown).not.toContain('Main')
  })

  it('strips data-md-ignore content from markdown', () => {
    const result = convertHtml(fixture)
    expect(result.markdown).not.toContain('should be stripped')
  })

  it('resolves relative canonical with baseUrl', () => {
    const html = '<html><head><link rel="canonical" href="/about/"></head><body><main><p>Hi</p></main></body></html>'
    const result = convertHtml(html, { baseUrl: 'https://example.com' })
    expect(result.metadata.canonical).toBe('https://example.com/about/')
  })

  it('handles path in metadata', () => {
    const result = convertHtml(fixture, { baseUrl: 'https://example.com' })
    // path derived from canonical
    expect(result.metadata.path).toBe('/test-page/')
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
bun run test
```

Expected: FAIL - `convertHtml` not exported.

---

### Task 8: convertHtml - Implementation

**Files:**
- Modify: `src/core.ts`

**Step 1: Implement convertHtml**

Add to `src/core.ts`:

```ts
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { stringify as yamlStringify } from 'yaml'
import type { ConvertOptions, ConvertResult, Metadata } from './types.js'

const nhm = new NodeHtmlMarkdown()

export function convertHtml(html: string, options?: ConvertOptions): ConvertResult {
  const metadata = extractMetadata(html)
  const baseUrl = options?.baseUrl

  // Resolve relative URLs
  if (baseUrl) {
    if (metadata.canonical && !metadata.canonical.startsWith('http')) {
      metadata.canonical = new URL(metadata.canonical, baseUrl).href
    }
    if (metadata.og_image && !metadata.og_image.startsWith('http')) {
      metadata.og_image = new URL(metadata.og_image, baseUrl).href
    }
  }

  // Derive path from canonical
  if (metadata.canonical) {
    try {
      metadata.path = new URL(metadata.canonical).pathname
    } catch {
      metadata.path = metadata.canonical
    }
  }

  // Clean and convert
  const cleaned = cleanHtml(html, options?.contentSelector)

  if (!cleaned) {
    return { markdown: '', metadata }
  }

  const markdown = nhm.translate(cleaned)
  const includeMetadata = options?.metadata !== false

  let output = ''
  if (includeMetadata) {
    const frontmatter: Record<string, string> = {
      path: metadata.path,
      title: metadata.title,
      description: metadata.description,
      canonical: metadata.canonical,
      og_image: metadata.og_image,
      generated: metadata.generated,
    }
    output = `---\n${yamlStringify(frontmatter).trim()}\n---\n\n`
  }

  output += markdown

  return { markdown: output, metadata }
}
```

**Step 2: Run tests to verify they pass**

```bash
bun run test
```

Expected: All convertHtml tests PASS.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: implement convertHtml with markdown conversion and frontmatter"
```

---

### Task 9: convertFile and convertDir - Tests

**Files:**
- Create: `tests/convert-file.test.ts`

**Step 1: Write the failing tests**

Create `tests/convert-file.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { convertFile, convertDir } from '../src/core.js'

let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'page-xerox-test-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('convertFile', () => {
  it('writes .md alongside .html file', async () => {
    const htmlPath = join(tempDir, 'index.html')
    writeFileSync(htmlPath, '<html><head><title>Test</title></head><body><main><p>Hello</p></main></body></html>')

    await convertFile(htmlPath)

    const mdPath = join(tempDir, 'index.md')
    expect(existsSync(mdPath)).toBe(true)
    const content = readFileSync(mdPath, 'utf-8')
    expect(content).toContain('Hello')
  })

  it('skips writing when content is empty', async () => {
    const htmlPath = join(tempDir, 'empty.html')
    writeFileSync(htmlPath, '<html><head></head><body></body></html>')

    await convertFile(htmlPath)

    const mdPath = join(tempDir, 'empty.md')
    expect(existsSync(mdPath)).toBe(false)
  })
})

describe('convertDir', () => {
  it('converts all HTML files in directory', async () => {
    const sub = join(tempDir, 'blog')
    mkdirSync(sub, { recursive: true })
    writeFileSync(join(tempDir, 'index.html'), '<html><head><title>Home</title></head><body><main><p>Home</p></main></body></html>')
    writeFileSync(join(sub, 'index.html'), '<html><head><title>Blog</title></head><body><main><p>Blog</p></main></body></html>')

    const written = await convertDir(tempDir)

    expect(written).toHaveLength(2)
    expect(existsSync(join(tempDir, 'index.md'))).toBe(true)
    expect(existsSync(join(sub, 'index.md'))).toBe(true)
  })

  it('respects string exclude patterns', async () => {
    const admin = join(tempDir, 'admin')
    mkdirSync(admin, { recursive: true })
    writeFileSync(join(tempDir, 'index.html'), '<html><head><title>Home</title></head><body><main><p>Home</p></main></body></html>')
    writeFileSync(join(admin, 'index.html'), '<html><head><title>Admin</title></head><body><main><p>Admin</p></main></body></html>')

    const written = await convertDir(tempDir, { exclude: ['/admin'] })

    expect(written).toHaveLength(1)
    expect(existsSync(join(admin, 'index.md'))).toBe(false)
  })

  it('respects RegExp exclude patterns', async () => {
    const api = join(tempDir, 'api', 'v1')
    mkdirSync(api, { recursive: true })
    writeFileSync(join(tempDir, 'index.html'), '<html><head><title>Home</title></head><body><main><p>Home</p></main></body></html>')
    writeFileSync(join(api, 'index.html'), '<html><head><title>API</title></head><body><main><p>API</p></main></body></html>')

    const written = await convertDir(tempDir, { exclude: [/\/api\//] })

    expect(written).toHaveLength(1)
    expect(existsSync(join(api, 'index.md'))).toBe(false)
  })

  it('returns empty array for directory with no HTML files', async () => {
    const written = await convertDir(tempDir)
    expect(written).toEqual([])
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
bun run test
```

Expected: FAIL - `convertFile` and `convertDir` not exported.

---

### Task 10: convertFile and convertDir - Implementation

**Files:**
- Modify: `src/core.ts`

**Step 1: Implement convertFile and convertDir**

Add to `src/core.ts`:

```ts
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { glob } from 'glob'

export async function convertFile(htmlPath: string, options?: ConvertOptions): Promise<void> {
  const html = await readFile(htmlPath, 'utf-8')
  const result = convertHtml(html, options)

  if (!result.markdown) {
    console.warn(`[page-xerox] Skipping ${htmlPath} - no content extracted`)
    return
  }

  const mdPath = htmlPath.replace(/\.html$/, '.md')
  await writeFile(mdPath, result.markdown, 'utf-8')
}

export async function convertDir(dirPath: string, options?: ConvertOptions): Promise<string[]> {
  const htmlFiles = await glob('**/*.html', { cwd: dirPath })
  const written: string[] = []

  for (const relPath of htmlFiles) {
    const urlPath = '/' + relPath.replace(/index\.html$/, '').replace(/\.html$/, '')

    if (isExcluded(urlPath, options?.exclude)) {
      continue
    }

    const fullPath = join(dirPath, relPath)
    const html = await readFile(fullPath, 'utf-8')
    const result = convertHtml(html, options)

    if (!result.markdown) {
      console.warn(`[page-xerox] Skipping ${relPath} - no content extracted`)
      continue
    }

    // Override path metadata to use URL path derived from file location if not set from canonical
    if (result.metadata.path === '' || !result.metadata.canonical) {
      result.metadata.path = urlPath
    }

    const mdPath = fullPath.replace(/\.html$/, '.md')
    await writeFile(mdPath, result.markdown, 'utf-8')
    written.push(mdPath)
  }

  return written
}

function isExcluded(urlPath: string, exclude?: (string | RegExp)[]): boolean {
  if (!exclude) return false

  return exclude.some((pattern) => {
    if (typeof pattern === 'string') {
      return urlPath.startsWith(pattern)
    }
    return pattern.test(urlPath)
  })
}
```

**Step 2: Run tests to verify they pass**

```bash
bun run test
```

Expected: All tests PASS.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: implement convertFile and convertDir with exclude support"
```

---

### Task 11: CLI - Tests

**Files:**
- Create: `tests/cli.test.ts`

**Step 1: Write the failing tests**

Create `tests/cli.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'page-xerox-cli-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

const cliDir = join(__dirname, '..')

function runCli(args: string[]): string {
  return execFileSync('bun', ['run', 'src/cli.ts', ...args], {
    cwd: cliDir,
    encoding: 'utf-8',
    timeout: 10000,
  })
}

describe('CLI', () => {
  it('converts HTML files in a directory', () => {
    writeFileSync(join(tempDir, 'index.html'), '<html><head><title>Home</title></head><body><main><p>Home</p></main></body></html>')

    const output = runCli(['--dir', tempDir])

    expect(existsSync(join(tempDir, 'index.md'))).toBe(true)
    expect(output).toContain('Generated')
  })

  it('accepts --selector flag', () => {
    writeFileSync(join(tempDir, 'index.html'), '<html><head><title>T</title></head><body><main><p>Main</p></main><article><p>Article</p></article></body></html>')

    runCli(['--dir', tempDir, '--selector', 'article'])

    expect(existsSync(join(tempDir, 'index.md'))).toBe(true)
  })

  it('shows help with --help', () => {
    const output = runCli(['--help'])
    expect(output).toContain('page-xerox')
    expect(output).toContain('--dir')
  })

  it('exits with error when --dir is missing', () => {
    expect(() => runCli([])).toThrow()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
bun run test
```

Expected: FAIL - cli.ts is empty.

---

### Task 12: CLI - Implementation

**Files:**
- Modify: `src/cli.ts`

**Step 1: Implement the CLI**

```ts
#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { convertDir } from './core.js'

const { values } = parseArgs({
  options: {
    dir: { type: 'string', short: 'd' },
    selector: { type: 'string', short: 's' },
    exclude: { type: 'string', multiple: true, short: 'e' },
    'no-metadata': { type: 'boolean', default: false },
    'base-url': { type: 'string', short: 'b' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
  },
  strict: true,
  allowPositionals: false,
})

if (values.help) {
  console.log(`page-xerox - Generate AI-ready Markdown from HTML pages

Usage:
  page-xerox --dir <path> [options]

Options:
  -d, --dir <path>        Directory containing HTML files (required)
  -s, --selector <css>    CSS selector for content extraction (default: "main")
  -e, --exclude <path>    Paths to exclude (repeatable)
      --no-metadata       Disable YAML frontmatter
  -b, --base-url <url>    Base URL for resolving relative URLs
  -h, --help              Show this help message
  -v, --version           Show version number`)
  process.exit(0)
}

if (values.version) {
  // Read version from package.json at runtime
  const { readFileSync } = await import('node:fs')
  const { join, dirname } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  console.log(pkg.version)
  process.exit(0)
}

if (!values.dir) {
  console.error('[page-xerox] Error: --dir is required. Run with --help for usage.')
  process.exit(1)
}

const dirPath = resolve(values.dir)

const written = await convertDir(dirPath, {
  contentSelector: values.selector,
  exclude: values.exclude,
  metadata: !values['no-metadata'],
  baseUrl: values['base-url'],
})

console.log(`[page-xerox] Generated ${written.length} .md file${written.length === 1 ? '' : 's'} in ${values.dir}`)
```

**Step 2: Run tests to verify they pass**

```bash
bun run test
```

Expected: CLI tests PASS.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: implement CLI with parseArgs"
```

---

### Task 13: Astro Integration

**Files:**
- Modify: `src/astro.ts`
- Create: `tests/astro.test.ts`

**Step 1: Write the test**

Create `tests/astro.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import pageXerox from '../src/astro.js'

describe('Astro integration', () => {
  it('returns an AstroIntegration object', () => {
    const integration = pageXerox()
    expect(integration.name).toBe('page-xerox')
    expect(integration.hooks).toBeDefined()
    expect(integration.hooks['astro:build:done']).toBeTypeOf('function')
    expect(integration.hooks['astro:server:setup']).toBeTypeOf('function')
  })

  it('accepts options', () => {
    const integration = pageXerox({ contentSelector: 'article' })
    expect(integration.name).toBe('page-xerox')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test
```

**Step 3: Implement the Astro integration**

Replace `src/astro.ts`:

```ts
import { convertDir, convertHtml } from './core.js'
import type { AdapterOptions } from './types.js'

interface AstroIntegration {
  name: string
  hooks: Record<string, (...args: any[]) => any>
}

export default function pageXerox(options?: AdapterOptions): AstroIntegration {
  const resolveStrategy = options?.dev?.resolve ?? 'disk-first'

  return {
    name: 'page-xerox',
    hooks: {
      'astro:build:done': async ({ dir }: { dir: URL }) => {
        const dirPath = dir.pathname
        const written = await convertDir(dirPath, options)
        console.log(`[page-xerox] Generated ${written.length} .md files`)
      },
      'astro:server:setup': ({ server }: { server: any }) => {
        server.middlewares.use(async (req: any, res: any, next: any) => {
          if (!req.url?.endsWith('.md')) return next()

          const htmlUrl = req.url.replace(/\.md$/, '.html')
          const htmlUrlIndex = req.url.replace(/\.md$/, '/index.html')

          try {
            let html: string | null = null

            if (resolveStrategy === 'fetch-first' || resolveStrategy === 'fetch-only') {
              html = await fetchFromDev(server, req.url.replace(/\.md$/, ''))
              if (!html && resolveStrategy === 'fetch-first') {
                html = await resolveFromDisk(server, htmlUrl, htmlUrlIndex)
              }
            } else {
              html = await resolveFromDisk(server, htmlUrl, htmlUrlIndex)
              if (!html && resolveStrategy === 'disk-first') {
                html = await fetchFromDev(server, req.url.replace(/\.md$/, ''))
              }
            }

            if (!html) {
              return next()
            }

            const result = convertHtml(html, options)
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
            res.end(result.markdown)
          } catch {
            next()
          }
        })
      },
    },
  }
}

async function fetchFromDev(server: any, path: string): Promise<string | null> {
  try {
    const address = server.httpServer?.address()
    if (!address) return null
    const port = typeof address === 'string' ? address : address.port
    const res = await fetch(`http://localhost:${port}${path}`)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function resolveFromDisk(server: any, ...paths: string[]): Promise<string | null> {
  try {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const root = server.config?.root ?? process.cwd()

    for (const p of paths) {
      try {
        return await readFile(join(root, 'dist', p), 'utf-8')
      } catch {
        continue
      }
    }
    return null
  } catch {
    return null
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
bun run test
```

Expected: Astro tests PASS.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Astro integration with dev middleware"
```

---

### Task 14: Vite Plugin

**Files:**
- Modify: `src/vite.ts`
- Create: `tests/vite.test.ts`

**Step 1: Write the test**

Create `tests/vite.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import pageXerox from '../src/vite.js'

describe('Vite plugin', () => {
  it('returns a Vite plugin object', () => {
    const plugin = pageXerox()
    expect(plugin.name).toBe('page-xerox')
    expect(plugin.closeBundle).toBeTypeOf('function')
    expect(plugin.configureServer).toBeTypeOf('function')
  })

  it('accepts options', () => {
    const plugin = pageXerox({ contentSelector: 'article' })
    expect(plugin.name).toBe('page-xerox')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test
```

**Step 3: Implement the Vite plugin**

Replace `src/vite.ts`:

```ts
import { convertDir, convertHtml } from './core.js'
import type { AdapterOptions } from './types.js'

interface VitePlugin {
  name: string
  closeBundle?: () => Promise<void>
  configureServer?: (server: any) => void
  configResolved?: (config: any) => void
}

export default function pageXerox(options?: AdapterOptions): VitePlugin {
  const resolveStrategy = options?.dev?.resolve ?? 'disk-first'
  let outDir = 'dist'

  return {
    name: 'page-xerox',

    configResolved(config: any) {
      if (config.build?.outDir) {
        outDir = config.build.outDir
      }
    },

    async closeBundle() {
      const { resolve } = await import('node:path')
      const dirPath = resolve(outDir)
      const written = await convertDir(dirPath, options)
      console.log(`[page-xerox] Generated ${written.length} .md files`)
    },

    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.endsWith('.md')) return next()

        const basePath = req.url.replace(/\.md$/, '')

        try {
          let html: string | null = null

          if (resolveStrategy === 'fetch-first' || resolveStrategy === 'fetch-only') {
            html = await fetchTransformed(server, basePath)
            if (!html && resolveStrategy === 'fetch-first') {
              html = await readFromDisk(outDir, basePath)
            }
          } else {
            html = await readFromDisk(outDir, basePath)
            if (!html && resolveStrategy === 'disk-first') {
              html = await fetchTransformed(server, basePath)
            }
          }

          if (!html) return next()

          const result = convertHtml(html, options)
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
          res.end(result.markdown)
        } catch {
          next()
        }
      })
    },
  }
}

async function fetchTransformed(server: any, path: string): Promise<string | null> {
  try {
    const url = path.endsWith('/') ? `${path}index.html` : `${path}.html`
    const result = await server.transformIndexHtml?.(url, '')
    return result ?? null
  } catch {
    return null
  }
}

async function readFromDisk(outDir: string, path: string): Promise<string | null> {
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const candidates = [
    join(outDir, `${path}.html`),
    join(outDir, path, 'index.html'),
  ]
  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf-8')
    } catch {
      continue
    }
  }
  return null
}
```

**Step 4: Run tests to verify they pass**

```bash
bun run test
```

Expected: Vite tests PASS.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Vite plugin with dev middleware"
```

---

### Task 15: Next.js Adapter

**Files:**
- Modify: `src/next.ts`
- Create: `tests/next.test.ts`

**Step 1: Write the test**

Create `tests/next.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { withPageXerox } from '../src/next.js'

describe('Next.js adapter', () => {
  it('exports withPageXerox function', () => {
    expect(withPageXerox).toBeTypeOf('function')
  })

  it('returns a function that accepts a directory', () => {
    const runner = withPageXerox({ contentSelector: 'main' })
    expect(runner).toBeTypeOf('function')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test
```

**Step 3: Implement the Next.js adapter**

Replace `src/next.ts`:

```ts
import { convertDir } from './core.js'
import type { ConvertOptions } from './types.js'

/**
 * Creates a post-build function for Next.js projects.
 *
 * Usage in package.json scripts:
 *   "build": "next build && page-xerox --dir out"
 *
 * Or programmatic:
 *   const run = withPageXerox({ contentSelector: 'main' })
 *   await run()  // auto-detects output directory
 */
export function withPageXerox(options?: ConvertOptions) {
  return async function run(dir?: string) {
    const { existsSync } = await import('node:fs')
    const { resolve } = await import('node:path')

    // Auto-detect Next.js output directory
    const outputDir = dir
      ?? (existsSync(resolve('out')) ? resolve('out') : null)
      ?? resolve('.next/server/pages')

    const written = await convertDir(outputDir, options)
    console.log(`[page-xerox] Generated ${written.length} .md files in ${outputDir}`)
    return written
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
bun run test
```

Expected: Next.js tests PASS.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Next.js adapter with output directory auto-detection"
```

---

### Task 16: Eleventy Plugin

**Files:**
- Modify: `src/eleventy.ts`
- Create: `tests/eleventy.test.ts`

**Step 1: Write the test**

Create `tests/eleventy.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import pageXerox from '../src/eleventy.js'

describe('Eleventy plugin', () => {
  it('exports a function that registers on eleventy config', () => {
    const events: Record<string, any> = {}
    const fakeConfig = {
      on: (event: string, handler: any) => {
        events[event] = handler
      },
    }

    pageXerox(fakeConfig)

    expect(events['eleventy.after']).toBeTypeOf('function')
  })

  it('accepts options as second argument', () => {
    const events: Record<string, any> = {}
    const fakeConfig = {
      on: (event: string, handler: any) => {
        events[event] = handler
      },
    }

    pageXerox(fakeConfig, { contentSelector: 'article' })

    expect(events['eleventy.after']).toBeTypeOf('function')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
bun run test
```

**Step 3: Implement the Eleventy plugin**

Replace `src/eleventy.ts`:

```ts
import { convertDir } from './core.js'
import type { ConvertOptions } from './types.js'

/**
 * Eleventy plugin for page-xerox.
 *
 * Usage in .eleventy.js:
 *   const pageXerox = require('page-xerox/eleventy')
 *   module.exports = function(eleventyConfig) {
 *     eleventyConfig.addPlugin(pageXerox)
 *   }
 */
export default function pageXerox(eleventyConfig: any, options?: ConvertOptions) {
  eleventyConfig.on('eleventy.after', async ({ dir }: { dir: { output: string } }) => {
    const written = await convertDir(dir.output, options)
    console.log(`[page-xerox] Generated ${written.length} .md files`)
  })
}
```

**Step 4: Run tests to verify they pass**

```bash
bun run test
```

Expected: Eleventy tests PASS.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Eleventy plugin"
```

---

### Task 17: README

**Files:**
- Create: `README.md`

**Step 1: Write the README**

Create a comprehensive README covering:

1. One-line description and what it does
2. Installation (`bun add page-xerox` / `npm install page-xerox`)
3. Quick start for each framework (Astro, Vite, Next.js, Eleventy, CLI)
4. Configuration options table
5. Output format example
6. `data-md-ignore` usage
7. Dev middleware explanation with `resolve` option
8. License (MIT)

Keep it concise. Code examples for each framework. No fluff.

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage examples for all frameworks"
```

---

### Task 18: Final Build Verification

**Files:**
- All source files

**Step 1: Run full test suite**

```bash
bun run test
```

Expected: All tests pass.

**Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: No type errors.

**Step 3: Run production build**

```bash
bun run build
```

Expected: Clean build. `dist/` contains `.js`, `.cjs`, `.d.ts` for all entry points.

**Step 4: Verify CLI works end-to-end**

Create a temp directory with an HTML file and run the built CLI against it. Verify the output contains frontmatter and converted markdown.

**Step 5: Commit any fixes**

```bash
git add .
git commit -m "chore: final build verification and fixes"
```
