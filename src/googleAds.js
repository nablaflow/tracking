import { addGtag, addScript, defaultScriptUrl } from './gtag.js'

// Only the ad consent types. The Google Analytics vendor sets
// analytics_storage, and each vendor sets only the types of its own category.
const adConsent = (state) => ({
  ad_storage: state,
  ad_user_data: state,
  ad_personalization: state,
})

/**
 * Builds the Google Ads vendor for startTracking.
 *
 * gtag.js does not load without consent. With consent, the vendor sets the
 * consent state before the config, as Google requires. After a withdraw, the
 * page reloads, and start does not load gtag.js.
 *
 * conversions maps a conversion name to the label of a Google Ads conversion
 * action. The vendor has no track: Google Ads receives only conversions.
 *
 * scriptUrl lets the site load gtag.js from a first-party path, for example
 * through the Google tag gateway.
 */
export const createGoogleAdsVendor = ({
  accountId,
  conversions = {},
  scriptUrl = defaultScriptUrl,
}) => {
  const loadGtag = () => {
    addGtag()
    window.gtag('consent', 'default', adConsent('denied'))
    window.gtag('consent', 'update', adConsent('granted'))
    addScript(`${scriptUrl}?id=${encodeURIComponent(accountId)}`)
    window.gtag('js', new Date())
    window.gtag('config', accountId)
  }

  return {
    name: 'googleAds',
    category: 'advertisement',
    anonymous: false,

    start: (granted) => {
      if (granted) loadGtag()
    },

    // send_to limits the conversion to this account, so that no other Google
    // destination on the page receives it. The properties can give a value,
    // a currency or a transaction_id.
    convert: (name, properties) => {
      const label = conversions[name]
      if (!label) return

      window.gtag('event', 'conversion', {
        ...properties,
        send_to: `${accountId}/${label}`,
      })
    },
  }
}
