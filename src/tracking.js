import { consentFromEvent, hasConsent } from './cookieYes.js'

// Holds the consent for each category
// { analytics: true, advertisement: true }
let consent
let vendors = []

/**
 * Tracks following the vendors list at page load, then follows the
 * consent changes when it gets updated.
 */
export const startTracking = (list) => {
  // This function needs to run once: this is a protection for dev (vite hmr),
  // or when used with SPAs, or in case of a mistake with the setup.
  if (consent) {
    console.warn(
      '[@nablaflow/tracking] startTracking already ran. This call does nothing.',
    )
    return
  }

  vendors = list
  // Returns a uniq array of the available categories taken from the list
  // of vendors.
  const categories = [...new Set(list.map((v) => v.category))]
  // Returns the consent for each vendor read from the CookieYes cookie.
  // { analytics: true, advertisement: true }
  consent = Object.fromEntries(categories.map((c) => [c, hasConsent(c)]))

  // Execute the start function for each vendor that is in a category
  // with consent set to true.
  for (const v of vendors) v.start(consent[v.category] === true)

  // When consent is changed through the CookieYes interface
  // CookieYes sends this event.
  document.addEventListener('cookieyes_consent_update', (e) => {
    // Retrieve the new consent object after the user change
    const newConsent = consentFromEvent(e.detail, categories)
    // Check if the consent has changed for any category
    const hasChanges = categories.some((c) => newConsent[c] !== consent[c])
    // If the consent has changed force a page reload. Each vendor then
    // decides its mode in start. This can also be set in the CookieYes
    // dashboard, but doing it here prevents configuration mistakes.
    if (hasChanges) location.reload()
  })
}

/**
 * Track user actions based on consent settings.
 */
export const track = (event, properties) => {
  // tracking must not happen when the consent object is missing
  if (!consent) return

  // for each vendor, run the track function only if it has
  // consent or if the vendor supports anonymous tracking
  for (const v of vendors) {
    if (v.track && (v.anonymous || consent[v.category] === true)) {
      v.track(event, properties)
    }
  }
}

/**
 * Sends a conversion, for example a sign-up, to the vendors that measure
 * campaigns. Each vendor maps the name to its own conversion id, and ignores
 * a name that it does not map.
 *
 * Unlike track, it ignores anonymous: a vendor receives the conversion only
 * with consent for its category.
 */
export const convert = (name, properties) => {
  if (!consent) return

  for (const v of vendors) {
    if (v.convert && consent[v.category] === true) {
      v.convert(name, properties)
    }
  }
}

/**
 * Links the visitor to a known id, for example an email address, with the
 * given person properties.
 */
export const identify = (id, properties) => {
  if (!consent) return

  for (const v of vendors) {
    if (v.identify && consent[v.category] === true) {
      v.identify(id, properties)
    }
  }
}
