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
