import { describe, it, expect } from 'vitest'
import { withPageXerox } from '../src/next.js'

describe('Next.js adapter', () => {
  it('exports withPageXerox function', () => {
    expect(withPageXerox).toBeTypeOf('function')
  })

  it('returns a function that accepts a directory', () => {
    const runner = withPageXerox({ contentSelector: 'main' })
    expect(runner).toBeTypeOf('function')
  })
})
