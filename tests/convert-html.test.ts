import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { convertHtml } from '../src/core.js'

const fixture = readFileSync(join(__dirname, 'fixtures/basic.html'), 'utf-8')

describe('convertHtml', () => {
  it('converts HTML to markdown with frontmatter by default', () => {
    const result = convertHtml(fixture)
    expect(result.markdown).toMatch(/^---\n/)
    expect(result.markdown).toContain('title: Test Page Title')
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
