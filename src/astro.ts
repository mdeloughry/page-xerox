import { convertDir, convertHtml } from './core.js'
import type { AdapterOptions } from './types.js'

interface AstroIntegration {
  name: string
  hooks: Record<string, (...args: any[]) => any>
}

export default function pageXerox(options?: AdapterOptions): AstroIntegration {
  const resolveStrategy = options?.dev?.resolve ?? 'disk-first'

  return {
    name: 'page-xerox',
    hooks: {
      'astro:build:done': async ({ dir }: { dir: URL }) => {
        const dirPath = dir.pathname
        const written = await convertDir(dirPath, options)
        console.log(`[page-xerox] Generated ${written.length} .md files`)
      },
      'astro:server:setup': ({ server }: { server: any }) => {
        server.middlewares.use(async (req: any, res: any, next: any) => {
          if (!req.url?.endsWith('.md')) return next()

          const htmlUrl = req.url.replace(/\.md$/, '.html')
          const htmlUrlIndex = req.url.replace(/\.md$/, '/index.html')

          try {
            let html: string | null = null

            if (resolveStrategy === 'fetch-first' || resolveStrategy === 'fetch-only') {
              html = await fetchFromDev(server, req.url.replace(/\.md$/, ''))
              if (!html && resolveStrategy === 'fetch-first') {
                html = await resolveFromDisk(server, htmlUrl, htmlUrlIndex)
              }
            } else {
              html = await resolveFromDisk(server, htmlUrl, htmlUrlIndex)
              if (!html && resolveStrategy === 'disk-first') {
                html = await fetchFromDev(server, req.url.replace(/\.md$/, ''))
              }
            }

            if (!html) {
              return next()
            }

            const result = convertHtml(html, options)
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
            res.end(result.markdown)
          } catch {
            next()
          }
        })
      },
    },
  }
}

async function fetchFromDev(server: any, path: string): Promise<string | null> {
  try {
    const address = server.httpServer?.address()
    if (!address) return null
    const port = typeof address === 'string' ? address : address.port
    const res = await fetch(`http://localhost:${port}${path}`)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function resolveFromDisk(server: any, ...paths: string[]): Promise<string | null> {
  try {
    const { readFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const root = server.config?.root ?? process.cwd()

    for (const p of paths) {
      try {
        return await readFile(join(root, 'dist', p), 'utf-8')
      } catch {
        continue
      }
    }
    return null
  } catch {
    return null
  }
}
