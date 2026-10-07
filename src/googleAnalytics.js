import { addGtag, addScript, defaultScriptUrl } from './gtag.js'

// Only the analytics consent type. The Google Ads vendor sets the ad types.
const analyticsConsent = (state) => ({ analytics_storage: state })

// Google signals and ad personalization use the ad cookies. This vendor has
// only the analytics consent, so it turns both off.
const configParams = {
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
}

/**
 * Builds the Google Analytics 4 vendor for startTracking.
 *
 * gtag.js does not load without consent. With consent, the vendor sets the
 * consent state before the config, as Google requires. After a withdraw, the
 * page reloads, and start does not load gtag.js.
 *
 * measurementIds lists the GA4 properties. Each config sends a page_view, and
 * each track event goes to all the properties.
 *
 * scriptUrl lets the site load gtag.js from a first-party path, for example
 * through the Google tag gateway.
 */
export const createGoogleAnalyticsVendor = ({
  measurementIds,
  scriptUrl = defaultScriptUrl,
}) => {
  const loadGtag = () => {
    addGtag()
    window.gtag('consent', 'default', analyticsConsent('denied'))
    window.gtag('consent', 'update', analyticsConsent('granted'))
    addScript(`${scriptUrl}?id=${encodeURIComponent(measurementIds[0])}`)
    window.gtag('js', new Date())
    for (const id of measurementIds) window.gtag('config', id, configParams)
  }

  return {
    name: 'googleAnalytics',
    category: 'analytics',
    anonymous: false,

    start: (granted) => {
      if (granted) loadGtag()
    },

    // send_to limits the event to the GA4 properties, so that the Google Ads
    // account on the same gtag does not receive it.
    track: (event, properties) => {
      window.gtag('event', event, { ...properties, send_to: measurementIds })
    },
  }
}
