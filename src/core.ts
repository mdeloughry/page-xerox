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
