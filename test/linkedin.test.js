// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createLinkedinVendor } from '../src/linkedin.js'

const partnerId = '1234567'

// Each vendor keeps its own state, so each test builds a new vendor.
let linkedinVendor

const scriptUrl = 'https://snap.licdn.com/li.lms-analytics/insight.min.js'

const insightScripts = () =>
  [...document.scripts].filter((s) => s.src === scriptUrl)

beforeEach(() => {
  for (const s of insightScripts()) s.remove()
  delete window.lintrk
  delete window._linkedin_data_partner_ids

  linkedinVendor = createLinkedinVendor({ partnerId })
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

describe('grant', () => {
  test('loads the tag when it did not load at page load', () => {
    linkedinVendor.start(false)

    linkedinVendor.grant()

    expect(insightScripts()).toHaveLength(1)
    expect(window._linkedin_data_partner_ids).toEqual([partnerId])
  })

  test('does not load the tag again after a revoke', () => {
    linkedinVendor.start(true)
    linkedinVendor.revoke()

    linkedinVendor.grant()

    expect(insightScripts()).toHaveLength(1)
    expect(window._linkedin_data_partner_ids).toEqual([partnerId])
  })
})

describe('track', () => {
  test('sends nothing', () => {
    linkedinVendor.start(true)

    linkedinVendor.track('lead_submitted', { form: 'book_demo' })

    expect(window.lintrk.q).toEqual([])
  })
})
