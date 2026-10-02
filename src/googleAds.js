const defaultScriptUrl = 'https://www.googletagmanager.com/gtag/js'

// Only the ad consent types. GTM can still load GA4 on the same page and read
// the same dataLayer, so an analytics_storage value would change GA4 data.
const adConsent = (state) => ({
  ad_storage: state,
  ad_user_data: state,
  ad_personalization: state,
})

/**
 * Puts the gtag queue on window.dataLayer and window.gtag.
 * This is the official Google tag snippet in a readable form.
 */
const addGtag = () => {
  window.dataLayer = window.dataLayer || []
  if (window.gtag) return

  window.gtag = function () {
    // biome-ignore lint/complexity/noArguments: gtag.js expects the arguments object.
    window.dataLayer.push(arguments)
  }
}

const addScript = (src) => {
  if ([...document.scripts].some((s) => s.src === src)) return

  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

/**
 * Builds the Google Ads vendor for startTracking.
 *
 * gtag.js does not load without consent. With consent, the vendor sets the
 * consent state before the config, as Google requires. Unlike the Meta Pixel
 * and the LinkedIn Insight Tag, gtag.js stops the ad storage after a revoke
 * in the same page view.
 *
 * conversions maps a tracked event to the label of a Google Ads conversion
 * action. The tracked events that the map does not contain send nothing.
 *
 * scriptUrl lets the site load gtag.js from a first-party path, for example
 * through the Google tag gateway.
 */
export const createGoogleAdsVendor = ({
  accountId,
  conversions,
  scriptUrl = defaultScriptUrl,
}) => {
  let loaded = false

  const loadGtag = () => {
    addGtag()
    window.gtag('consent', 'default', adConsent('denied'))
    window.gtag('consent', 'update', adConsent('granted'))
    addScript(`${scriptUrl}?id=${encodeURIComponent(accountId)}`)
    window.gtag('js', new Date())
    window.gtag('config', accountId)
    loaded = true
  }

  return {
    name: 'googleAds',
    category: 'advertisement',
    anonymous: false,

    start: (granted) => {
      if (granted) loadGtag()
    },

    // The visitor can grant again after a revoke in the same page view.
    // gtag.js then already runs, so only the consent changes.
    grant: () => {
      if (loaded) {
        window.gtag('consent', 'update', adConsent('granted'))
      } else {
        loadGtag()
      }
    },

    revoke: () => {
      if (loaded) window.gtag('consent', 'update', adConsent('denied'))
    },

    // send_to limits the conversion to this account, so that no other Google
    // destination on the page receives it.
    track: (event) => {
      const label = conversions[event]
      if (!label) return

      window.gtag('event', 'conversion', { send_to: `${accountId}/${label}` })
    },
  }
}
