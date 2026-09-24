import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  consentFromEvent,
  getConsentFromCookie,
  hasConsent,
} from '../src/cookieYes.js'

// Vitest runs in Node, which has no document. Each test gives
// cookieYes.js a fake document with only the cookie string.
const setCookies = (cookie) => vi.stubGlobal('document', { cookie })

const consentCookie =
  'cookieyes-consent=consentid:abc123,consent:yes,action:yes,' +
  'necessary:yes,functional:no,analytics:yes,performance:no,' +
  'advertisement:no,other:no'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getConsentFromCookie', () => {
  test('reads the value of a key', () => {
    setCookies(consentCookie)

    expect(getConsentFromCookie('analytics')).toBe('yes')
    expect(getConsentFromCookie('advertisement')).toBe('no')
    expect(getConsentFromCookie('consent')).toBe('yes')
  })

  test('returns undefined when the cookie does not exist', () => {
    setCookies('_ga=GA1.1.123; ph_session=xyz')

    expect(getConsentFromCookie('analytics')).toBeUndefined()
  })

  test('returns undefined when there are no cookies', () => {
    setCookies('')

    expect(getConsentFromCookie('analytics')).toBeUndefined()
  })

  test('finds the cookie between other cookies', () => {
    setCookies(`_ga=GA1.1.123; ${consentCookie}; ph_session=xyz`)

    expect(getConsentFromCookie('analytics')).toBe('yes')
  })

  test('ignores a cookie whose name only starts with the same text', () => {
    setCookies(
      'cookieyes-consent-old=consent:yes,analytics:yes; ' +
        'cookieyes-consent=consent:yes,analytics:no',
    )

    expect(getConsentFromCookie('analytics')).toBe('no')
  })

  test('returns undefined for a key that the cookie does not have', () => {
    setCookies(consentCookie)

    expect(getConsentFromCookie('marketing')).toBeUndefined()
  })

  // Before the visitor chooses, CookieYes can write a key with no value.
  test('returns an empty string for a key with no value', () => {
    setCookies('cookieyes-consent=consentid:abc123,consent:,analytics:')

    expect(getConsentFromCookie('analytics')).toBe('')
  })
})

describe('hasConsent', () => {
  test('returns true when consent and the category are yes', () => {
    setCookies(consentCookie)

    expect(hasConsent('analytics')).toBe(true)
  })

  test('returns false when the category is no', () => {
    setCookies(consentCookie)

    expect(hasConsent('advertisement')).toBe(false)
  })

  // The consent key must also be yes, not only the category.
  test('returns false when consent is no, even if the category is yes', () => {
    setCookies('cookieyes-consent=consentid:abc123,consent:no,analytics:yes')

    expect(hasConsent('analytics')).toBe(false)
  })

  test('returns false when the values are empty', () => {
    setCookies('cookieyes-consent=consentid:abc123,consent:,analytics:')

    expect(hasConsent('analytics')).toBe(false)
  })

  test('returns false when the cookie does not exist', () => {
    setCookies('_ga=GA1.1.123')

    expect(hasConsent('analytics')).toBe(false)
  })

  test('returns false for a category that the cookie does not have', () => {
    setCookies(consentCookie)

    expect(hasConsent('marketing')).toBe(false)
  })
})

describe('consentFromEvent', () => {
  const categories = ['analytics', 'advertisement']

  // CookieYes sends the full lists on every banner action, so a change of
  // one category must not reset the others.
  test('keeps every category when the visitor changes only one', () => {
    const detail = {
      accepted: ['necessary', 'analytics'],
      rejected: ['functional', 'performance', 'advertisement', 'other'],
    }

    expect(consentFromEvent(detail, categories)).toEqual({
      analytics: true,
      advertisement: false,
    })
  })

  test('grants every category on accept all', () => {
    const detail = {
      accepted: ['necessary', 'functional', 'analytics', 'advertisement'],
      rejected: [],
    }

    expect(consentFromEvent(detail, categories)).toEqual({
      analytics: true,
      advertisement: true,
    })
  })

  test('refuses every category on reject all', () => {
    const detail = {
      accepted: ['necessary'],
      rejected: ['functional', 'analytics', 'advertisement'],
    }

    expect(consentFromEvent(detail, categories)).toEqual({
      analytics: false,
      advertisement: false,
    })
  })

  test('leaves out the categories that no vendor uses', () => {
    const detail = {
      accepted: ['necessary', 'functional', 'analytics'],
      rejected: [],
    }

    expect(Object.keys(consentFromEvent(detail, categories))).toEqual(
      categories,
    )
  })

  // CookieYes renames analytics to analytics_renamed. The visitor accepts
  // it, but the vendor category is in neither list, so it becomes false.
  test('sets a category that is in neither list to false', () => {
    const detail = {
      accepted: ['necessary', 'analytics_renamed'],
      rejected: ['advertisement'],
    }

    expect(consentFromEvent(detail, categories)).toEqual({
      analytics: false,
      advertisement: false,
    })
  })
})
