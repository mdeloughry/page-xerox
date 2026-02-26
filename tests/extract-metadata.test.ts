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
