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
 * Builds the Meta Pixel vendor for the tracking runtime.
 *
 * The pixel has no anonymous mode:
 * fbq('consent', 'revoke') only pauses the events, and the browser still
 * downloads fbevents.js from Meta. Thus the pixel does not load at all
 * without consent.
 */
export const createMetaVendor = ({ pixelId }) => {
  let loaded = false

  // Loads the pixel and sends the PageView of this page.
  const loadPixel = () => {
    addPixel()
    window.fbq('init', pixelId)
    window.fbq('track', 'PageView')
    loaded = true
  }

  return {
    name: 'meta',
    category: 'advertisement',
    anonymous: false,

    start: (granted) => {
      if (granted) loadPixel()
    },

    // The visitor can grant again after a revoke in the same page view.
    // The pixel then already runs, so only the consent changes.
    grant: () => {
      if (loaded) {
        window.fbq('consent', 'grant')
      } else {
        loadPixel()
      }
    },

    // A script that loaded cannot be removed. The revoke pauses the pixel
    // until the page reloads. After the reload, start does not load it.
    revoke: () => {
      window.fbq('consent', 'revoke')
    },

    track: (event, properties) => window.fbq('trackCustom', event, properties),
  }
}
