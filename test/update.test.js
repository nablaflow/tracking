import { describe, expect, test } from 'vitest'
import { init, update } from '../src/update.js'

const posthog = {
  name: 'posthog',
  category: 'analytics',
  anonymous: true,
  track: () => {},
}

const meta = { name: 'meta', category: 'advertisement' }

const consentChanged = (consent) => ({ type: 'consent_changed', consent })

const types = (effects) => effects.map((e) => e.type)

describe('init', () => {
  test('starts each vendor with the consent at page load', () => {
    const [, effects] = init({ analytics: false }, [posthog])

    expect(effects).toEqual([
      { type: 'start', vendor: 'posthog', granted: false },
    ])
  })

  test('keeps only the data fields of each vendor', () => {
    const [model] = init({ analytics: false }, [posthog, meta])

    expect(model.vendors).toEqual([
      { name: 'posthog', category: 'analytics', anonymous: true },
      { name: 'meta', category: 'advertisement', anonymous: false },
    ])
  })
})

describe('consent_changed', () => {
  test('ignores an update that does not change the consent', () => {
    const [model] = init({ analytics: true }, [posthog])
    const [, effects] = update(model, consentChanged({ analytics: true }))

    expect(effects).toEqual([])
  })

  test('grants and revokes multiple times in the same page view', () => {
    let [model] = init({ analytics: false }, [posthog])
    const seen = []

    for (const analytics of [false, true, true, false, true]) {
      const [next, effects] = update(model, consentChanged({ analytics }))
      model = next
      seen.push(...types(effects))
    }

    expect(seen).toEqual(['grant', 'revoke', 'grant'])
  })

  test('revokes every vendor on reject all, in the order of the vendor list', () => {
    const [model] = init({ analytics: true, advertisement: true }, [
      posthog,
      meta,
    ])
    const [, effects] = update(
      model,
      consentChanged({ analytics: false, advertisement: false }),
    )

    expect(effects).toEqual([
      { type: 'revoke', vendor: 'posthog' },
      { type: 'revoke', vendor: 'meta' },
    ])
  })

  test('changes only the vendor whose category changed', () => {
    const [model] = init({ analytics: false, advertisement: false }, [
      posthog,
      meta,
    ])
    const [, effects] = update(
      model,
      consentChanged({ analytics: false, advertisement: true }),
    )

    expect(effects).toEqual([{ type: 'grant', vendor: 'meta' }])
  })

  // This case should not happen as the category is always in the
  // CookieYes cookie. For extra safety remove the consent when
  // the category is missing.
  test('treats a missing category as not granted', () => {
    const [model] = init({ advertisement: true }, [meta])
    const [, effects] = update(model, consentChanged({}))

    expect(effects).toEqual([{ type: 'revoke', vendor: 'meta' }])
  })

  // The message replaces the consent in the state.
  // We're assuming CookieYes won't change categories here.
  test('replaces the consent in the state', () => {
    const [start] = init({ analytics: true, advertisement: true }, [
      posthog,
      meta,
    ])
    const [model, effects] = update(start, consentChanged({ analytics: true }))

    expect(model.consent).toEqual({ analytics: true })
    expect(effects).toEqual([{ type: 'revoke', vendor: 'meta' }])
  })
})

describe('track', () => {
  const track = { type: 'track', event: 'lead_submitted', properties: {} }

  test('sends to an anonymous vendor without consent', () => {
    const [model] = init({ analytics: false, advertisement: false }, [
      posthog,
      meta,
    ])
    const [, effects] = update(model, track)

    expect(effects.map((e) => e.vendor)).toEqual(['posthog'])
  })

  test('sends to a vendor after consent for its category', () => {
    const [start] = init({ analytics: false, advertisement: false }, [
      posthog,
      meta,
    ])
    const [model] = update(
      start,
      consentChanged({ analytics: false, advertisement: true }),
    )
    const [, effects] = update(model, track)

    expect(effects.map((e) => e.vendor)).toEqual(['posthog', 'meta'])
  })
})

describe('unknown type msg', () => {
  test('returns the same model with no effects', () => {
    const [start] = init({ analytics: false }, [posthog])
    const [updatedModel, effects] = update(start, { type: 'unknown' })
    expect(updatedModel).toBe(start)
    expect(effects).toEqual([])
  })
})
