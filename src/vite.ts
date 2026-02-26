import { convertDir, convertHtml } from './core.js'
import type { AdapterOptions } from './types.js'

interface VitePlugin {
  name: string
  closeBundle?: () => Promise<void>
  configureServer?: (server: any) => void
  configResolved?: (config: any) => void
}

export default function pageXerox(options?: AdapterOptions): VitePlugin {
  const resolveStrategy = options?.dev?.resolve ?? 'disk-first'
  let outDir = 'dist'

  return {
    name: 'page-xerox',

    configResolved(config: any) {
      if (config.build?.outDir) {
        outDir = config.build.outDir
      }
    },

    async closeBundle() {
      const { resolve } = await import('node:path')
      const dirPath = resolve(outDir)
      const written = await convertDir(dirPath, options)
      console.log(`[page-xerox] Generated ${written.length} .md files`)
    },

    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.endsWith('.md')) return next()

        const basePath = req.url.replace(/\.md$/, '')

        try {
          let html: string | null = null

          if (resolveStrategy === 'fetch-first' || resolveStrategy === 'fetch-only') {
            html = await fetchTransformed(server, basePath)
            if (!html && resolveStrategy === 'fetch-first') {
              html = await readFromDisk(outDir, basePath)
            }
          } else {
            html = await readFromDisk(outDir, basePath)
            if (!html && resolveStrategy === 'disk-first') {
              html = await fetchTransformed(server, basePath)
            }
          }

          if (!html) return next()

          const result = convertHtml(html, options)
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
          res.end(result.markdown)
        } catch {
          next()
        }
      })
    },
  }
}

async function fetchTransformed(server: any, path: string): Promise<string | null> {
  try {
    const url = path.endsWith('/') ? `${path}index.html` : `${path}.html`
    const result = await server.transformIndexHtml?.(url, '')
    return result ?? null
  } catch {
    return null
  }
}

async function readFromDisk(outDir: string, path: string): Promise<string | null> {
  const { readFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const candidates = [
    join(outDir, `${path}.html`),
    join(outDir, path, 'index.html'),
  ]
  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf-8')
    } catch {
      continue
    }
  }
  return null
}
