// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createMetaVendor } from '../src/meta.js'

const pixelId = '1234567890'

// Each vendor keeps its own state, so each test builds a new vendor.
let metaVendor

const scriptUrl = 'https://connect.facebook.net/en_US/fbevents.js'

const pixelScripts = () =>
  [...document.scripts].filter((s) => s.src === scriptUrl)

// The calls that wait in the queue until fbevents.js loads. In the tests,
// fbevents.js never loads, so the queue holds every call.
const queuedCalls = () => window.fbq.queue.map((args) => Array.from(args))

beforeEach(() => {
  for (const s of pixelScripts()) s.remove()
  delete window.fbq
  delete window._fbq

  metaVendor = createMetaVendor({ pixelId })
})

describe('start', () => {
  test('loads nothing without consent', () => {
    metaVendor.start(false)

    expect(pixelScripts()).toHaveLength(0)
    expect(window.fbq).toBeUndefined()
  })

  test('loads the pixel and sends the PageView with consent', () => {
    metaVendor.start(true)

    expect(pixelScripts()).toHaveLength(1)
    expect(queuedCalls()).toEqual([
      ['init', pixelId],
      ['track', 'PageView'],
    ])
  })

  // If GTM loaded the pixel first, the queue of GTM must stay.
  test('keeps a window.fbq that exists', () => {
    const existing = vi.fn()
    window.fbq = existing

    metaVendor.start(true)

    expect(window.fbq).toBe(existing)
    expect(pixelScripts()).toHaveLength(0)
    expect(existing).toHaveBeenCalledWith('init', pixelId)
    expect(existing).toHaveBeenCalledWith('track', 'PageView')
  })
})

describe('grant', () => {
  test('loads the pixel when it did not load at page load', () => {
    metaVendor.start(false)

    metaVendor.grant()

    expect(pixelScripts()).toHaveLength(1)
    expect(queuedCalls()).toEqual([
      ['init', pixelId],
      ['track', 'PageView'],
    ])
  })

  test('only grants the consent again after a revoke', () => {
    metaVendor.start(true)
    metaVendor.revoke()

    metaVendor.grant()

    expect(pixelScripts()).toHaveLength(1)
    expect(queuedCalls()).toEqual([
      ['init', pixelId],
      ['track', 'PageView'],
      ['consent', 'revoke'],
      ['consent', 'grant'],
    ])
  })
})

describe('revoke', () => {
  test('pauses the pixel', () => {
    metaVendor.start(true)

    metaVendor.revoke()

    expect(queuedCalls().at(-1)).toEqual(['consent', 'revoke'])
  })
})

describe('track', () => {
  test('sends the event as a custom event', () => {
    metaVendor.start(true)

    metaVendor.track('lead_submitted', { form: 'book_demo' })

    expect(queuedCalls().at(-1)).toEqual([
      'trackCustom',
      'lead_submitted',
      { form: 'book_demo' },
    ])
  })
})
