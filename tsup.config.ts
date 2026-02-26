import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      core: 'src/core.ts',
      astro: 'src/astro.ts',
      'astro-middleware': 'src/astro-middleware.ts',
      vite: 'src/vite.ts',
      next: 'src/next.ts',
      eleventy: 'src/eleventy.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    target: 'node18',
    external: ['astro', 'vite'],
  },
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    dts: true,
    splitting: false,
    target: 'node18',
    external: ['astro', 'vite'],
  },
])
