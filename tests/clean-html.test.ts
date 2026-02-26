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
