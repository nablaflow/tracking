// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createLinkedinVendor } from '../src/linkedin.js'

const partnerId = '1234567'
const conversions = { sign_up: 7654321 }

// Each vendor keeps its own state, so each test builds a new vendor.
let linkedinVendor

const scriptUrl = 'https://snap.licdn.com/li.lms-analytics/insight.min.js'

const insightScripts = () =>
  [...document.scripts].filter((s) => s.src === scriptUrl)

beforeEach(() => {
  for (const s of insightScripts()) s.remove()
  delete window.lintrk
  delete window._linkedin_data_partner_ids

  linkedinVendor = createLinkedinVendor({ partnerId, conversions })
})

describe('start', () => {
  test('loads nothing without consent', () => {
    linkedinVendor.start(false)

    expect(insightScripts()).toHaveLength(0)
    expect(window.lintrk).toBeUndefined()
    expect(window._linkedin_data_partner_ids).toBeUndefined()
  })

  test('loads the tag with the partner id with consent', () => {
    linkedinVendor.start(true)

    expect(insightScripts()).toHaveLength(1)
    expect(window._linkedin_data_partner_ids).toEqual([partnerId])
    expect(window.lintrk.q).toEqual([])
  })

  // If GTM loaded the tag first, the queue of GTM must stay.
  test('keeps a window.lintrk that exists', () => {
    const existing = vi.fn()
    window.lintrk = existing

    linkedinVendor.start(true)

    expect(window.lintrk).toBe(existing)
    expect(insightScripts()).toHaveLength(0)
    expect(window._linkedin_data_partner_ids).toEqual([partnerId])
  })
})

describe('convert', () => {
  test('sends the conversion id for a name in the map', () => {
    linkedinVendor.start(true)

    linkedinVendor.convert('sign_up', { value: 10 })

    expect(window.lintrk.q).toEqual([['track', { conversion_id: 7654321 }]])
  })

  test('sends nothing for a name that is not in the map', () => {
    linkedinVendor.start(true)

    linkedinVendor.convert('trial_click')

    expect(window.lintrk.q).toEqual([])
  })
})

describe('track', () => {
  test('the vendor has no track', () => {
    expect(linkedinVendor.track).toBeUndefined()
  })
})
