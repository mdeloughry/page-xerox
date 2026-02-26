import * as cheerio from 'cheerio'
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { stringify as yamlStringify } from 'yaml'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { glob } from 'glob'
import type { ConvertOptions, ConvertResult, Metadata } from './types.js'

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

  // Derive path from canonical, or use explicit path option as fallback
  if (metadata.canonical) {
    try {
      metadata.path = new URL(metadata.canonical).pathname
    } catch {
      metadata.path = metadata.canonical
    }
  } else if (options?.path) {
    metadata.path = options.path
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
    const result = convertHtml(html, { ...options, path: urlPath })

    if (!result.markdown) {
      console.warn(`[page-xerox] Skipping ${relPath} - no content extracted`)
      continue
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
