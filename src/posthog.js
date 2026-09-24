import posthog from 'posthog-js'

/**
 * Replaces the IP address of an event before PostHog sends it.
 * Returns null for a null event, so PostHog drops it.
 */
export const anonymizeEvent = (event) => {
  if (!event) return null

  return { ...event, properties: { ...event.properties, $ip: '0.0.0.0' } }
}

/**
 * Options that keep the visitor anonymous.
 *
 * The anonymous init and the consent downgrade both use this object: a visitor who
 * withdraws consent then gets the same options as a visitor who never gave it.
 */
export const anonymousOptions = {
  disable_session_recording: true,
  persistence: 'memory',
  property_denylist: [
    '$browser',
    '$device_id',
    '$raw_user_agent',
    '$timezone',
    '$timezone_offset',
    '$browser_language',
    '$browser_language_prefix',
    '$screen_height',
    '$screen_width',
    '$viewport_height',
    '$viewport_width',
    '$os',
    '$os_version',
    '$browser_version',
    '$device_type',
  ],
  before_send: anonymizeEvent,
}

/**
 * Options that identify the visitor.
 *
 * The full init and the upgrade both use this object. It sets every key that
 * anonymousOptions sets, so the two objects stay exact opposites.
 */
export const fullOptions = {
  disable_session_recording: false,
  persistence: 'localStorage+cookie',
  property_denylist: [],
  before_send: null,
}

/**
 * Builds the PostHog vendor for the tracking runtime.
 *
 * The token, apiHost and defaults go to posthog.init in both modes.
 * PostHog runs in anonymous mode without consent, so it is anonymous: true.
 */
export const createPosthogVendor = ({ token, apiHost, defaults }) => {
  // Options that both init paths share.
  const baseOptions = { api_host: apiHost, defaults }

  return {
    name: 'posthog',
    category: 'analytics',
    anonymous: true,

    // With consent, PostHog sets cookies and tracks the visitor with a
    // persistent id. Without consent, it sets no cookies.
    start: (granted) => {
      const modeOptions = granted ? fullOptions : anonymousOptions
      posthog.init(token, { ...baseOptions, ...modeOptions })
    },

    // Changes to full tracking without a restart of PostHog.
    grant: () => {
      posthog.set_config(fullOptions)
      posthog.capture('opt_in')
    },

    // Returns to anonymous tracking without a restart of PostHog.
    revoke: () => {
      // Capture before the downgrade, because the downgrade clears the id.
      posthog.capture('opt_out')
      posthog.reset()
      posthog.set_config(anonymousOptions)
    },

    track: (event, properties) => posthog.capture(event, properties),
  }
}
