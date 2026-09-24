// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://nablaflow.io/" }
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// runtime.js keeps its state in the module, so each test loads a new copy.
//
// jsdom keeps one document for the whole file, so the listener of each
// earlier copy stays on it. Those listeners call only the fake vendors of
// their own test, so they do not change the results of a later test.
let startTracking
let track

const cookieAttributes = '; path=/; domain=.nablaflow.io; SameSite=Strict'

// Writes the consent cookie the same way that CookieYes does.
const setConsentCookie = (value) => {
  document.cookie = `cookieyes-consent=${value}${cookieAttributes}`
}

const clearConsentCookie = () => {
  document.cookie = `cookieyes-consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT${cookieAttributes}`
}

const withConsent = 'consentid:abc123,consent:yes,action:yes,analytics:yes'
const withoutConsent = 'consentid:abc123,consent:yes,action:yes,analytics:no'

const fakeVendor = () => ({
  name: 'fake',
  category: 'analytics',
  anonymous: true,
  start: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
  track: vi.fn(),
})

const sendConsent = (accepted) =>
  document.dispatchEvent(
    new CustomEvent('cookieyes_consent_update', {
      detail: { accepted, rejected: [] },
    }),
  )

beforeEach(async () => {
  vi.resetModules()
  const runtime = await import('../src/runtime.js')
  startTracking = runtime.startTracking
  track = runtime.track
})

afterEach(() => {
  clearConsentCookie()
})

describe('page load', () => {
  test('starts the vendor with consent when the cookie has it', () => {
    setConsentCookie(withConsent)
    const vendor = fakeVendor()

    startTracking([vendor])

    expect(vendor.start).toHaveBeenCalledExactlyOnceWith(true)
  })

  test('with no cookie starts the vendor without consent', () => {
    const vendor = fakeVendor()

    startTracking([vendor])

    expect(vendor.start).toHaveBeenCalledExactlyOnceWith(false)
  })

  test('reads the consent cookie between other cookies', () => {
    document.cookie = '_ga=GA1.1.123; path=/'
    setConsentCookie(withConsent)
    document.cookie = 'ph_session=xyz; path=/'
    const vendor = fakeVendor()

    startTracking([vendor])

    expect(vendor.start).toHaveBeenCalledExactlyOnceWith(true)
  })
})

describe('consent events', () => {
  test('grants when the visitor accepts', () => {
    setConsentCookie(withoutConsent)
    const vendor = fakeVendor()
    startTracking([vendor])

    sendConsent(['necessary', 'analytics'])

    expect(vendor.grant).toHaveBeenCalledOnce()
  })

  // CookieYes sends consent updates when it starts, before any click.
  test('ignores an event that does not change the consent', () => {
    setConsentCookie(withoutConsent)
    const vendor = fakeVendor()
    startTracking([vendor])

    sendConsent(['necessary'])

    expect(vendor.grant).not.toHaveBeenCalled()
    expect(vendor.revoke).not.toHaveBeenCalled()
  })

  test('revokes when the visitor rejects after accepting', () => {
    setConsentCookie(withoutConsent)
    const vendor = fakeVendor()
    startTracking([vendor])

    sendConsent(['necessary', 'analytics'])
    sendConsent(['necessary'])

    expect(vendor.grant).toHaveBeenCalledOnce()
    expect(vendor.revoke).toHaveBeenCalledOnce()
  })

  test('does nothing for a returning visitor with the same consent', () => {
    setConsentCookie(withConsent)
    const vendor = fakeVendor()
    startTracking([vendor])

    sendConsent(['necessary', 'analytics'])

    expect(vendor.grant).not.toHaveBeenCalled()
    expect(vendor.revoke).not.toHaveBeenCalled()
  })
})

describe('track', () => {
  test('sends nothing before startTracking', () => {
    const vendor = fakeVendor()

    track('lead_submitted', { form: 'book_demo' })
    startTracking([vendor])

    expect(vendor.track).not.toHaveBeenCalled()
  })

  test('sends the event and its properties after startTracking', () => {
    const vendor = fakeVendor()
    startTracking([vendor])

    track('lead_submitted', { form: 'book_demo' })

    expect(vendor.track).toHaveBeenCalledExactlyOnceWith('lead_submitted', {
      form: 'book_demo',
    })
  })
})

describe('startTracking', () => {
  test('a second call adds no second listener', () => {
    setConsentCookie(withoutConsent)
    const vendor = fakeVendor()
    startTracking([vendor])
    startTracking([vendor])

    sendConsent(['necessary', 'analytics'])

    expect(vendor.start).toHaveBeenCalledOnce()
    expect(vendor.grant).toHaveBeenCalledOnce()
  })
})
