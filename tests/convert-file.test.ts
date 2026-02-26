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

  it('derives path in frontmatter from file location when no canonical', async () => {
    const blog = join(tempDir, 'blog')
    mkdirSync(blog, { recursive: true })
    writeFileSync(join(blog, 'index.html'), '<html><head><title>Blog</title></head><body><main><p>Blog post</p></main></body></html>')

    await convertDir(tempDir)

    const md = readFileSync(join(blog, 'index.md'), 'utf-8')
    expect(md).toContain('path: /blog/')
  })
})
