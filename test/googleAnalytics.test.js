// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createGoogleAdsVendor } from '../src/googleAds.js'
import { createGoogleAnalyticsVendor } from '../src/googleAnalytics.js'

const measurementIds = ['G-AAAAAAAAAA', 'G-BBBBBBBBBB']

// Each vendor keeps its own state, so each test builds a new vendor.
let googleAnalyticsVendor

const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${measurementIds[0]}`

const gtagScripts = () =>
  [...document.scripts].filter((s) => s.src.includes('/gtag/js'))

// The calls that wait in the dataLayer. In the tests, gtag.js never loads, so
// the dataLayer holds every call.
const queuedCalls = () => window.dataLayer.map((args) => Array.from(args))

const configParams = {
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
}

const loadCalls = [
  ['consent', 'default', { analytics_storage: 'denied' }],
  ['consent', 'update', { analytics_storage: 'granted' }],
  ['js', expect.any(Date)],
  ['config', measurementIds[0], configParams],
  ['config', measurementIds[1], configParams],
]

beforeEach(() => {
  for (const s of gtagScripts()) s.remove()
  delete window.gtag
  delete window.dataLayer

  googleAnalyticsVendor = createGoogleAnalyticsVendor({ measurementIds })
})

describe('vendor', () => {
  test('needs the analytics consent', () => {
    expect(googleAnalyticsVendor).toMatchObject({
      name: 'googleAnalytics',
      category: 'analytics',
      anonymous: false,
    })
  })

  // Google Analytics forbids personal data, and identify gets an email.
  test('the vendor has no identify and no convert', () => {
    expect(googleAnalyticsVendor.identify).toBeUndefined()
    expect(googleAnalyticsVendor.convert).toBeUndefined()
  })
})

describe('start', () => {
  test('loads nothing without consent', () => {
    googleAnalyticsVendor.start(false)

    expect(gtagScripts()).toHaveLength(0)
    expect(window.gtag).toBeUndefined()
    expect(window.dataLayer).toBeUndefined()
  })

  test('sets the consent before the config of each property', () => {
    googleAnalyticsVendor.start(true)

    expect(gtagScripts().map((s) => s.src)).toEqual([scriptUrl])
    expect(queuedCalls()).toEqual(loadCalls)
  })

  test('sets no ad consent', () => {
    googleAnalyticsVendor.start(true)

    for (const [command, , state] of queuedCalls()) {
      if (command === 'consent') {
        expect(Object.keys(state)).toEqual(['analytics_storage'])
      }
    }
  })

  test('loads gtag.js from the given script url', () => {
    googleAnalyticsVendor = createGoogleAnalyticsVendor({
      measurementIds,
      scriptUrl: 'https://nablaflow.io/metrics/gtag/js',
    })

    googleAnalyticsVendor.start(true)

    expect(gtagScripts().map((s) => s.src)).toEqual([
      `https://nablaflow.io/metrics/gtag/js?id=${measurementIds[0]}`,
    ])
  })

  test('keeps a window.gtag and a dataLayer that exist', () => {
    const existing = vi.fn()
    window.gtag = existing
    window.dataLayer = [{ event: 'gtm.js' }]

    googleAnalyticsVendor.start(true)

    expect(window.gtag).toBe(existing)
    expect(window.dataLayer).toEqual([{ event: 'gtm.js' }])
    expect(existing).toHaveBeenCalledWith(
      'config',
      measurementIds[1],
      configParams,
    )
  })

  // Each vendor sets only the consent types of its own category, so the
  // order of the vendors does not change the consent state.
  test('shares one gtag with the Google Ads vendor', () => {
    const googleAdsVendor = createGoogleAdsVendor({ accountId: 'AW-123' })

    googleAnalyticsVendor.start(true)
    googleAdsVendor.start(true)

    const updates = queuedCalls()
      .filter(
        ([command, action]) => command === 'consent' && action === 'update',
      )
      .map(([, , state]) => state)

    expect(updates).toEqual([
      { analytics_storage: 'granted' },
      {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      },
    ])
  })
})

describe('track', () => {
  test('sends the event to each property', () => {
    googleAnalyticsVendor.start(true)

    googleAnalyticsVendor.track('panel_opened', { panel: 'results' })

    expect(queuedCalls().at(-1)).toEqual([
      'event',
      'panel_opened',
      { panel: 'results', send_to: measurementIds },
    ])
  })

  // A send_to in the properties must not send the event to the Google Ads
  // account.
  test('keeps its own send_to', () => {
    googleAnalyticsVendor.start(true)

    googleAnalyticsVendor.track('panel_opened', { send_to: 'AW-123' })

    expect(queuedCalls().at(-1)[2].send_to).toEqual(measurementIds)
  })
})
