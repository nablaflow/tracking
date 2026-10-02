const consentCookieName = 'cookieyes-consent'
const scriptId = 'cookieyes'

/**
 * Adds the CookieYes banner script for the given CookieYes client id.
 *
 * Call it as early as possible in the page, for example from a small script
 * with async in the <head>, so that the banner shows soon.
 *
 * onLoad runs after the CookieYes script runs. CookieYes then blocks scripts
 * through its patch of document.createElement, so a script that onLoad adds,
 * for example GTM, goes through the CookieYes block.
 *
 * A second call adds no second script, and its onLoad does not run.
 */
export const loadCookieYes = ({ clientId, onLoad }) => {
  if (document.getElementById(scriptId)) return

  const script = document.createElement('script')
  script.id = scriptId
  script.src = `https://cdn-cookieyes.com/client_data/${encodeURIComponent(clientId)}/script.js`
  if (onLoad) script.addEventListener('load', onLoad)
  document.head.appendChild(script)
}

/**
 * Reads one key from the CookieYes consent cookie.
 *
 * The cookie holds comma separated pairs, for example
 * "consent:yes,action:yes,necessary:yes,analytics:yes,advertisement:no".
 * The cookie is absent when CookieYes does not load, for example when a
 * content blocker blocks cdn-cookieyes.com. Return undefined in that case.
 */
export const getConsentFromCookie = (key) => {
  const entry = document.cookie
    .split(';')
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(`${consentCookieName}=`))

  if (!entry) return undefined

  return entry
    .slice(consentCookieName.length + 1)
    .split(',')
    .map((pair) => pair.split(':'))
    .find(([name]) => name === key)?.[1]
}

/**
 * Returns true when the visitor gave consent for the category.
 */
export const hasConsent = (category) =>
  getConsentFromCookie('consent') === 'yes' &&
  getConsentFromCookie(category) === 'yes'

/**
 * Builds the consent for the given categories from the detail of a
 * cookieyes_consent_update event. Each category gets true or false.
 *
 * NOTE:
 * CookieYes puts each category in detail.accepted or detail.rejected.
 * If CookieYes renames or removes a category, it is in neither list,
 * this function sets it to false, and the vendor stops tracking
 * with no error.
 */
export const consentFromEvent = (detail, categories) =>
  Object.fromEntries(categories.map((c) => [c, detail.accepted.includes(c)]))
