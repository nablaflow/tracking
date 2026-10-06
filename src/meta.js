const scriptUrl = 'https://connect.facebook.net/en_US/fbevents.js'

/**
 * Puts the Meta Pixel queue on window.fbq and adds the fbevents.js script.
 * This is the official Meta snippet in a readable form.
 */
const addPixel = () => {
  if (window.fbq) return

  // A function and not an arrow: fbevents.js reads the arguments object
  // from the queue, as the official snippet stores it.
  const fbq = function () {
    if (fbq.callMethod) {
      // biome-ignore lint/complexity/noArguments: fbevents.js expects the arguments object.
      fbq.callMethod.apply(fbq, arguments)
    } else {
      // biome-ignore lint/complexity/noArguments: fbevents.js expects the arguments object.
      fbq.queue.push(arguments)
    }
  }
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []

  window.fbq = fbq
  if (!window._fbq) window._fbq = fbq

  const script = document.createElement('script')
  script.async = true
  script.src = scriptUrl
  document.head.appendChild(script)
}

/**
 * Builds the Meta Pixel vendor for startTracking.
 *
 * The pixel has no anonymous mode:
 * fbq('consent', 'revoke') only pauses the events, and the browser still
 * downloads fbevents.js from Meta. Thus the pixel does not load at all
 * without consent. After a withdraw, the page reloads, and start does not
 * load it.
 *
 * conversions maps a conversion name to a Meta event. A string is a standard
 * event, for example { sign_up: 'CompleteRegistration' }. An object with
 * custom is a custom event, for example
 * { aerocloud_sign_up: { custom: 'StartTrialAeroCloud' } }.
 *
 * The vendor has no track: Meta receives only conversions.
 */
export const createMetaVendor = ({ pixelId, conversions = {} }) => {
  // Loads the pixel and sends the PageView of this page.
  const loadPixel = () => {
    addPixel()
    window.fbq('init', pixelId)
    window.fbq('track', 'PageView')
  }

  return {
    name: 'meta',
    category: 'advertisement',
    anonymous: false,

    start: (granted) => {
      if (granted) loadPixel()
    },

    convert: (name, properties) => {
      const event = conversions[name]
      if (!event) return

      if (event.custom) {
        window.fbq('trackCustom', event.custom, properties)
      } else {
        window.fbq('track', event, properties)
      }
    },
  }
}
