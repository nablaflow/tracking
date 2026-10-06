const scriptUrl = 'https://snap.licdn.com/li.lms-analytics/insight.min.js'

/**
 * Puts the partner id on window._linkedin_data_partner_ids, puts the queue on
 * window.lintrk and adds the insight.min.js script.
 * This is the official LinkedIn snippet in a readable form.
 *
 * insight.min.js reads the partner ids when it loads, and then sends the
 * page view of this page.
 */
const addInsightTag = (partnerId) => {
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || []
  window._linkedin_data_partner_ids.push(partnerId)

  if (window.lintrk) return

  const lintrk = (a, b) => {
    lintrk.q.push([a, b])
  }
  lintrk.q = []
  window.lintrk = lintrk

  const script = document.createElement('script')
  script.async = true
  script.src = scriptUrl
  document.head.appendChild(script)
}

/**
 * Builds the LinkedIn Insight Tag vendor for startTracking.
 *
 * The Insight Tag has no anonymous mode and no call that pauses it. Thus the
 * tag does not load at all without consent. After a withdraw, the page
 * reloads, and start does not load it.
 *
 * conversions maps a conversion name to the id of a conversion in Campaign
 * Manager. The vendor has no track: LinkedIn needs a conversion id, not an
 * event name.
 */
export const createLinkedinVendor = ({ partnerId, conversions = {} }) => {
  return {
    name: 'linkedin',
    category: 'advertisement',
    anonymous: false,

    start: (granted) => {
      if (granted) addInsightTag(partnerId)
    },

    convert: (name) => {
      const conversionId = conversions[name]
      if (!conversionId) return

      window.lintrk('track', { conversion_id: conversionId })
    },
  }
}
