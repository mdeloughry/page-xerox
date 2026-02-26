import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'page-xerox-cli-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

const cliDir = join(__dirname, '..')

function runCli(args: string[]): string {
  return execFileSync('bun', ['run', 'src/cli.ts', ...args], {
    cwd: cliDir,
    encoding: 'utf-8',
    timeout: 10000,
  })
}

describe('CLI', () => {
  it('converts HTML files in a directory', () => {
    writeFileSync(join(tempDir, 'index.html'), '<html><head><title>Home</title></head><body><main><p>Home</p></main></body></html>')

    const output = runCli(['--dir', tempDir])

    expect(existsSync(join(tempDir, 'index.md'))).toBe(true)
    expect(output).toContain('Generated')
  })

  it('accepts --selector flag', () => {
    writeFileSync(join(tempDir, 'index.html'), '<html><head><title>T</title></head><body><main><p>Main</p></main><article><p>Article</p></article></body></html>')

    runCli(['--dir', tempDir, '--selector', 'article'])

    expect(existsSync(join(tempDir, 'index.md'))).toBe(true)
  })

  it('shows help with --help', () => {
    const output = runCli(['--help'])
    expect(output).toContain('page-xerox')
    expect(output).toContain('--dir')
  })

  it('exits with error when --dir is missing', () => {
    expect(() => runCli([])).toThrow()
  })
})
