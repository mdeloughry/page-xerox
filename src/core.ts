import * as cheerio from 'cheerio'
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { stringify as yamlStringify } from 'yaml'
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
