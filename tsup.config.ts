import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    core: 'src/core.ts',
    astro: 'src/astro.ts',
    vite: 'src/vite.ts',
    next: 'src/next.ts',
    eleventy: 'src/eleventy.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  clean: true,
  target: 'node18',
  external: ['astro', 'vite'],
})
