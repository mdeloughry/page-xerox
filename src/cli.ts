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
