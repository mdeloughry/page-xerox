import { describe, it, expect } from 'vitest'
import pageXerox from '../src/eleventy.js'

describe('Eleventy plugin', () => {
  it('exports a function that registers on eleventy config', () => {
    const events: Record<string, any> = {}
    const fakeConfig = {
      on: (event: string, handler: any) => {
        events[event] = handler
      },
    }

    pageXerox(fakeConfig)

    expect(events['eleventy.after']).toBeTypeOf('function')
  })

  it('accepts options as second argument', () => {
    const events: Record<string, any> = {}
    const fakeConfig = {
      on: (event: string, handler: any) => {
        events[event] = handler
      },
    }

    pageXerox(fakeConfig, { contentSelector: 'article' })

    expect(events['eleventy.after']).toBeTypeOf('function')
  })
})
