// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createGoogleAdsVendor } from '../src/googleAds.js'

const accountId = 'AW-123456789'
const conversions = { 'aerocloud:demo_request': 'AbCdEfGh' }

// Each vendor keeps its own state, so each test builds a new vendor.
let googleAdsVendor

const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${accountId}`

const gtagScripts = () =>
  [...document.scripts].filter((s) => s.src.includes('/gtag/js'))

// The calls that wait in the dataLayer. In the tests, gtag.js never loads, so
// the dataLayer holds every call.
const queuedCalls = () => window.dataLayer.map((args) => Array.from(args))

const granted = {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
}

const denied = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
}

const loadCalls = [
  ['consent', 'default', denied],
  ['consent', 'update', granted],
  ['js', expect.any(Date)],
  ['config', accountId],
]

beforeEach(() => {
  for (const s of gtagScripts()) s.remove()
  delete window.gtag
  delete window.dataLayer

  googleAdsVendor = createGoogleAdsVendor({ accountId, conversions })
})

describe('start', () => {
  test('loads nothing without consent', () => {
    googleAdsVendor.start(false)

    expect(gtagScripts()).toHaveLength(0)
    expect(window.gtag).toBeUndefined()
    expect(window.dataLayer).toBeUndefined()
  })

  test('sets the consent before the config, and loads gtag.js', () => {
    googleAdsVendor.start(true)

    expect(gtagScripts().map((s) => s.src)).toEqual([scriptUrl])
    expect(queuedCalls()).toEqual(loadCalls)
  })

  // GTM can still load GA4 on the same page.
  test('sets no analytics consent', () => {
    googleAdsVendor.start(true)

    for (const [command, , state] of queuedCalls()) {
      if (command === 'consent') {
        expect(state).not.toHaveProperty('analytics_storage')
      }
    }
  })

  test('loads gtag.js from the given script url', () => {
    googleAdsVendor = createGoogleAdsVendor({
      accountId,
      conversions,
      scriptUrl: 'https://nablaflow.io/metrics/gtag/js',
    })

    googleAdsVendor.start(true)

    expect(gtagScripts().map((s) => s.src)).toEqual([
      `https://nablaflow.io/metrics/gtag/js?id=${accountId}`,
    ])
  })

  // If another script defined gtag first, its dataLayer must stay.
  test('keeps a window.gtag and a dataLayer that exist', () => {
    const existing = vi.fn()
    window.gtag = existing
    window.dataLayer = [{ event: 'gtm.js' }]

    googleAdsVendor.start(true)

    expect(window.gtag).toBe(existing)
    expect(window.dataLayer).toEqual([{ event: 'gtm.js' }])
    expect(existing).toHaveBeenCalledWith('config', accountId)
  })

  test('does not add a second gtag.js with the same url', () => {
    const script = document.createElement('script')
    script.src = scriptUrl
    document.head.appendChild(script)

    googleAdsVendor.start(true)

    expect(gtagScripts()).toHaveLength(1)
  })
})

describe('track', () => {
  test('sends a conversion for an event in the map', () => {
    googleAdsVendor.start(true)

    googleAdsVendor.track('aerocloud:demo_request', { form: 'book_demo' })

    expect(queuedCalls().at(-1)).toEqual([
      'event',
      'conversion',
      { send_to: `${accountId}/AbCdEfGh` },
    ])
  })

  test('sends nothing for an event that is not in the map', () => {
    googleAdsVendor.start(true)

    googleAdsVendor.track('aerocloud:trial_click')

    expect(queuedCalls()).toEqual(loadCalls)
  })
})
