export const defaultScriptUrl = 'https://www.googletagmanager.com/gtag/js'

/**
 * Puts the gtag queue on window.dataLayer and window.gtag.
 * This is the official Google tag snippet in a readable form.
 * The Google Ads vendor and the Google Analytics vendor share this queue.
 */
export const addGtag = () => {
  window.dataLayer = window.dataLayer || []
  if (window.gtag) return

  window.gtag = function () {
    // biome-ignore lint/complexity/noArguments: gtag.js expects the arguments object.
    window.dataLayer.push(arguments)
  }
}

export const addScript = (src) => {
  if ([...document.scripts].some((s) => s.src === src)) return

  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}
