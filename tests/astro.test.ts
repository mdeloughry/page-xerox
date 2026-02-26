import { describe, it, expect } from 'vitest'
import pageXerox from '../src/astro.js'

describe('Astro integration', () => {
  it('returns an AstroIntegration object', () => {
    const integration = pageXerox()
    expect(integration.name).toBe('page-xerox')
    expect(integration.hooks).toBeDefined()
    expect(integration.hooks['astro:build:done']).toBeTypeOf('function')
    expect(integration.hooks['astro:server:setup']).toBeTypeOf('function')
  })

  it('accepts options', () => {
    const integration = pageXerox({ contentSelector: 'article' })
    expect(integration.name).toBe('page-xerox')
  })
})
