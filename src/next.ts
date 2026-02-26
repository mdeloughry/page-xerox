import { convertDir } from './core.js'
import type { ConvertOptions } from './types.js'

export function withPageXerox(options?: ConvertOptions) {
  return async function run(dir?: string) {
    const { existsSync } = await import('node:fs')
    const { resolve } = await import('node:path')

    const outputDir = dir
      ?? (existsSync(resolve('out')) ? resolve('out') : null)
      ?? resolve('.next/server/pages')

    const written = await convertDir(outputDir, options)
    console.log(`[page-xerox] Generated ${written.length} .md files in ${outputDir}`)
    return written
  }
}
