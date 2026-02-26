import { describe, it, expect } from 'vitest'
import pageXerox from '../src/vite.js'

describe('Vite plugin', () => {
  it('returns a Vite plugin object', () => {
    const plugin = pageXerox()
    expect(plugin.name).toBe('page-xerox')
    expect(plugin.closeBundle).toBeTypeOf('function')
    expect(plugin.configureServer).toBeTypeOf('function')
  })

  it('accepts options', () => {
    const plugin = pageXerox({ contentSelector: 'article' })
    expect(plugin.name).toBe('page-xerox')
  })
})
