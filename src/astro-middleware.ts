import { convertHtml } from './core.js'
import type { ConvertOptions } from './types.js'

/**
 * Creates Astro middleware that serves markdown versions of pages at .md URLs.
 *
 * For SSR sites (output: "server"), the Astro integration's build hook has no
 * static HTML to convert. This middleware handles .md requests at runtime by
 * fetching the HTML from the local server and converting it on the fly.
 *
 * Usage in src/middleware.ts:
 *
 * ```ts
 * import { sequence } from 'astro:middleware'
 * import { createMarkdownMiddleware } from 'page-xerox/astro-middleware'
 *
 * const pageXerox = createMarkdownMiddleware({ contentSelector: 'main' })
 *
 * export const onRequest = sequence(pageXerox)
 * ```
 *
 * Chain with other middleware using sequence():
 *
 * ```ts
 * export const onRequest = sequence(myAuthMiddleware, pageXerox)
 * ```
 */
export function createMarkdownMiddleware(options?: ConvertOptions) {
  const HEADER = 'x-page-xerox'

  return async function pageXeroxMiddleware(context: any, next: any) {
    // Skip internal requests (loop prevention)
    if (context.request.headers.get(HEADER)) {
      return next()
    }

    if (!context.url.pathname.endsWith('.md')) {
      return next()
    }

    const htmlUrl = new URL(context.url)
    htmlUrl.pathname = context.url.pathname.replace(/\.md$/, '') || '/'

    try {
      const response = await fetch(htmlUrl.toString(), {
        headers: {
          cookie: context.request.headers.get('cookie') || '',
          [HEADER]: '1',
        },
      })

      if (!response.ok) {
        return next()
      }

      const html = await response.text()
      const result = convertHtml(html, {
        ...options,
        path: htmlUrl.pathname,
      })

      return new Response(result.markdown, {
        status: 200,
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      })
    } catch {
      return next()
    }
  }
}
