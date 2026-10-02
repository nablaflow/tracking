// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://nablaflow.io/" }
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// tracking.js keeps its state in the module, so each test loads a new copy.
//
// jsdom keeps one document for the whole file. Each copy adds a listener to
// it, and the listener calls location.reload. Thus each test records its
// listeners and removes them after the test, so that the listener of an
// earlier test does not add a reload to a later test.
let startTracking
let track
let reload
let listeners

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

const fakeVendor = (fields = {}) => ({
  name: 'fake',
  category: 'analytics',
  anonymous: true,
  start: vi.fn(),
  track: vi.fn(),
  ...fields,
})

const adsVendor = () =>
  fakeVendor({ name: 'ads', category: 'advertisement', anonymous: false })

const sendConsent = (accepted) =>
  document.dispatchEvent(
    new CustomEvent('cookieyes_consent_update', {
      detail: { accepted, rejected: [] },
    }),
  )

beforeEach(async () => {
  // jsdom does not allow a spy on location.reload, so the test replaces
  // the global location.
  reload = vi.fn()
  vi.stubGlobal('location', { reload })

  listeners = []
  const addEventListener = document.addEventListener.bind(document)
  vi.spyOn(document, 'addEventListener').mockImplementation((type, fn) => {
    listeners.push([type, fn])
    addEventListener(type, fn)
  })

  vi.resetModules()
  const tracking = await import('../src/tracking.js')
  startTracking = tracking.startTracking
  track = tracking.track
})

afterEach(() => {
  for (const [type, fn] of listeners) document.removeEventListener(type, fn)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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

  test('starts each vendor with the consent of its own category', () => {
    setConsentCookie(`${withConsent},advertisement:no`)
    const analytics = fakeVendor()
    const ads = adsVendor()

    startTracking([analytics, ads])

    expect(analytics.start).toHaveBeenCalledExactlyOnceWith(true)
    expect(ads.start).toHaveBeenCalledExactlyOnceWith(false)
  })
})

describe('consent events', () => {
  test('reloads when the visitor accepts', () => {
    setConsentCookie(withoutConsent)
    startTracking([fakeVendor()])

    sendConsent(['necessary', 'analytics'])

    expect(reload).toHaveBeenCalledOnce()
  })

  test('reloads when the visitor rejects after accepting', () => {
    setConsentCookie(withConsent)
    startTracking([fakeVendor()])

    sendConsent(['necessary'])

    expect(reload).toHaveBeenCalledOnce()
  })

  // CookieYes sends a consent update when it starts, before any click.
  test('does not reload for an event that does not change the consent', () => {
    setConsentCookie(withoutConsent)
    startTracking([fakeVendor()])

    sendConsent(['necessary'])

    expect(reload).not.toHaveBeenCalled()
  })

  test('does not reload for a returning visitor with the same consent', () => {
    setConsentCookie(withConsent)
    startTracking([fakeVendor()])

    sendConsent(['necessary', 'analytics'])

    expect(reload).not.toHaveBeenCalled()
  })

  test('reloads when only one of the categories changes', () => {
    setConsentCookie(withConsent)
    startTracking([fakeVendor(), adsVendor()])

    sendConsent(['analytics', 'advertisement'])

    expect(reload).toHaveBeenCalledOnce()
  })

  test('ignores a category that no vendor uses', () => {
    setConsentCookie(withoutConsent)
    startTracking([fakeVendor()])

    sendConsent(['necessary', 'functional'])

    expect(reload).not.toHaveBeenCalled()
  })

  test('does not start the vendors again', () => {
    setConsentCookie(withoutConsent)
    const vendor = fakeVendor()
    startTracking([vendor])

    sendConsent(['analytics'])

    expect(vendor.start).toHaveBeenCalledOnce()
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

  test('sends to an anonymous vendor without consent, and not to the others', () => {
    setConsentCookie(withoutConsent)
    const analytics = fakeVendor()
    const ads = adsVendor()
    startTracking([analytics, ads])

    track('lead_submitted')

    expect(analytics.track).toHaveBeenCalledOnce()
    expect(ads.track).not.toHaveBeenCalled()
  })

  test('sends to a vendor with consent for its category', () => {
    setConsentCookie(`${withoutConsent},advertisement:yes`)
    const ads = adsVendor()
    startTracking([ads])

    track('lead_submitted')

    expect(ads.track).toHaveBeenCalledOnce()
  })

  // The page reloads after a change, so the consent of the page load stays
  // in force until then.
  test('keeps the consent of the page load after a change', () => {
    setConsentCookie(withoutConsent)
    const ads = adsVendor()
    startTracking([ads])

    sendConsent(['advertisement'])
    track('lead_submitted')

    expect(ads.track).not.toHaveBeenCalled()
  })
})

describe('startTracking', () => {
  test('a second call warns, and adds no second start or listener', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setConsentCookie(withoutConsent)
    const vendor = fakeVendor()
    startTracking([vendor])
    startTracking([vendor])

    sendConsent(['necessary', 'analytics'])

    expect(warn).toHaveBeenCalledOnce()
    expect(vendor.start).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledOnce()
  })
})
