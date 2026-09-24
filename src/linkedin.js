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
 * Builds the LinkedIn Insight Tag vendor for the tracking runtime.
 *
 * The Insight Tag has no anonymous mode and no call that pauses it. Thus the
 * tag does not load at all without consent.
 */
export const createLinkedinVendor = ({ partnerId }) => {
  let loaded = false

  const loadInsightTag = () => {
    addInsightTag(partnerId)
    loaded = true
  }

  return {
    name: 'linkedin',
    category: 'advertisement',
    anonymous: false,

    start: (granted) => {
      if (granted) loadInsightTag()
    },

    // The visitor can grant again after a revoke in the same page view.
    // The tag then already runs, so there is nothing to do.
    grant: () => {
      if (!loaded) loadInsightTag()
    },

    // A script that loaded cannot be removed, and the tag has no call that
    // pauses it. After the reload, start does not load it.
    revoke: () => {},

    // LinkedIn conversions need a conversion id from Campaign Manager, not an
    // event name. Thus the tag ignores the events of the runtime.
    track: () => {},
  }
}
