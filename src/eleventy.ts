import { convertDir } from './core.js'
import type { ConvertOptions } from './types.js'

export default function pageXerox(eleventyConfig: any, options?: ConvertOptions) {
  eleventyConfig.on('eleventy.after', async ({ dir }: { dir: { output: string } }) => {
    const written = await convertDir(dir.output, options)
    console.log(`[page-xerox] Generated ${written.length} .md files`)
  })
}
