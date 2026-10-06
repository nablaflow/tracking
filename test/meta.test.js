// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createMetaVendor } from '../src/meta.js'

const pixelId = '1234567890'
const conversions = {
  sign_up: 'CompleteRegistration',
  aerocloud_sign_up: { custom: 'StartTrialAeroCloud' },
}

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

  metaVendor = createMetaVendor({ pixelId, conversions })
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

describe('track', () => {
  test('the vendor has no track', () => {
    expect(metaVendor.track).toBeUndefined()
  })
})

describe('convert', () => {
  test('sends the standard event for a name in the map', () => {
    metaVendor.start(true)

    metaVendor.convert('sign_up', { value: 10, currency: 'EUR' })

    expect(queuedCalls().at(-1)).toEqual([
      'track',
      'CompleteRegistration',
      { value: 10, currency: 'EUR' },
    ])
  })

  test('sends the custom event for a name with custom in the map', () => {
    metaVendor.start(true)

    metaVendor.convert('aerocloud_sign_up', { value: 10 })

    expect(queuedCalls().at(-1)).toEqual([
      'trackCustom',
      'StartTrialAeroCloud',
      { value: 10 },
    ])
  })

  test('sends nothing for a name that is not in the map', () => {
    metaVendor.start(true)

    metaVendor.convert('trial_click')

    expect(queuedCalls()).toEqual([
      ['init', pixelId],
      ['track', 'PageView'],
    ])
  })
})
