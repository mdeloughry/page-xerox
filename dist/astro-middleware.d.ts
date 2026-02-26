import { C as ConvertOptions } from './types-D43B_LsG.js';

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
declare function createMarkdownMiddleware(options?: ConvertOptions): (context: any, next: any) => Promise<any>;

export { createMarkdownMiddleware };
