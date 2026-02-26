export interface ConvertOptions {
  /** CSS selector for content extraction. Default: "main" */
  contentSelector?: string
  /** Paths to skip. Strings match as prefixes, RegExp tested against path. */
  exclude?: (string | RegExp)[]
  /** Include YAML frontmatter in output. Default: true */
  metadata?: boolean
  /** Base URL for resolving relative canonical/og_image URLs */
  baseUrl?: string
  /** Override the path field in frontmatter metadata */
  path?: string
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
