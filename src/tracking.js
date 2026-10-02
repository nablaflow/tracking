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
    // Save the old consent object
    const before = consent
    // Retrieve the new consent object after the user change
    consent = consentFromEvent(e.detail, categories)

    // Loop through the vendors and check which one has changed consent:
    // grant and revoke based on that.
    for (const v of vendors) {
      const grantedBefore = before[v.category] === true
      const grantedNow = consent[v.category] === true

      if (grantedNow && !grantedBefore) v.grant()
      if (grantedBefore && !grantedNow) v.revoke()
    }
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
    if (v.anonymous || consent[v.category] === true) {
      v.track(event, properties)
    }
  }
}
