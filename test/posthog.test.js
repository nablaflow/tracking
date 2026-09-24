import posthog from 'posthog-js'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  anonymizeEvent,
  anonymousOptions,
  createPosthogVendor,
  fullOptions,
} from '../src/posthog.js'

const config = {
  token: 'phc_test',
  apiHost: 'https://posthog.example.com',
  defaults: '2025-05-24',
}

const posthogVendor = createPosthogVendor(config)

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn().mockName('posthog.init'),
    capture: vi.fn().mockName('posthog.capture'),
    reset: vi.fn().mockName('posthog.reset'),
    set_config: vi.fn().mockName('posthog.set_config'),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('options', () => {
  // A key that only one object sets keeps its old value after a mode change.
  test('the anonymous and full options set the same keys', () => {
    expect(Object.keys(fullOptions).sort()).toEqual(
      Object.keys(anonymousOptions).sort(),
    )
  })

  test('anonymous mode removes the IP address before PostHog sends', () => {
    expect(anonymousOptions.before_send).toBe(anonymizeEvent)
  })

  test('full mode removes the anonymous filters', () => {
    expect(fullOptions.property_denylist).toEqual([])
    expect(fullOptions.before_send).toBeNull()
  })
})

describe('anonymizeEvent', () => {
  test('replaces the IP address and keeps the other properties', () => {
    const event = anonymizeEvent({
      event: 'lead_submitted',
      properties: { $ip: '203.0.113.7', form: 'book_demo' },
    })

    expect(event).toEqual({
      event: 'lead_submitted',
      properties: { $ip: '0.0.0.0', form: 'book_demo' },
    })
  })

  test('does not change the event that it receives', () => {
    const original = { event: 'lead_submitted', properties: { $ip: '1.2.3.4' } }

    anonymizeEvent(original)

    expect(original.properties.$ip).toBe('1.2.3.4')
  })

  test('returns null for a null event', () => {
    expect(anonymizeEvent(null)).toBeNull()
  })
})

describe('start', () => {
  test('starts with the full options when there is consent', () => {
    posthogVendor.start(true)

    expect(posthog.init).toHaveBeenCalledExactlyOnceWith(
      expect.any(String),
      expect.objectContaining(fullOptions),
    )
  })

  test('starts with the anonymous options when there is no consent', () => {
    posthogVendor.start(false)

    expect(posthog.init).toHaveBeenCalledExactlyOnceWith(
      expect.any(String),
      expect.objectContaining(anonymousOptions),
    )
  })

  test('passes the token, host and defaults in both modes', () => {
    posthogVendor.start(true)
    posthogVendor.start(false)

    for (const [token, options] of posthog.init.mock.calls) {
      expect(token).toBe(config.token)
      expect(options.api_host).toBe(config.apiHost)
      expect(options.defaults).toBe(config.defaults)
    }
  })
})

describe('grant', () => {
  test('changes to the full options, then records opt_in', () => {
    posthogVendor.grant()

    expect(posthog.set_config).toHaveBeenCalledExactlyOnceWith(fullOptions)
    expect(posthog.capture).toHaveBeenCalledExactlyOnceWith('opt_in')
    expect(posthog.set_config).toHaveBeenCalledBefore(posthog.capture)
  })
})

describe('revoke', () => {
  // reset() clears the id, so PostHog must record opt_out before it.
  test('records opt_out before the reset', () => {
    posthogVendor.revoke()

    expect(posthog.capture).toHaveBeenCalledExactlyOnceWith('opt_out')
    expect(posthog.capture).toHaveBeenCalledBefore(posthog.reset)
  })

  test('returns to the anonymous options after the reset', () => {
    posthogVendor.revoke()

    expect(posthog.reset).toHaveBeenCalledOnce()
    expect(posthog.set_config).toHaveBeenCalledExactlyOnceWith(anonymousOptions)
    expect(posthog.reset).toHaveBeenCalledBefore(posthog.set_config)
  })
})

describe('track', () => {
  test('sends the event and its properties to PostHog', () => {
    posthogVendor.track('lead_submitted', { form: 'book_demo' })

    expect(posthog.capture).toHaveBeenCalledExactlyOnceWith('lead_submitted', {
      form: 'book_demo',
    })
  })
})
