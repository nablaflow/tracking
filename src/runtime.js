import { consentFromEvent, hasConsent } from './cookieYes.js'
import { init, update } from './update.js'

/**
 * The side-effect part of the tracking loop. It holds the model, sends each
 * message to update, and runs the effects that update returns.
 */

let model
let vendorsByName = {}
let categories = []

const run = (effect) => {
  const vendor = vendorsByName[effect.vendor]

  switch (effect.type) {
    case 'start':
      vendor.start(effect.granted)
      break
    case 'grant':
      vendor.grant()
      break
    case 'revoke':
      vendor.revoke()
      break
    case 'send':
      vendor.track(effect.event, effect.properties)
      break
  }
}

const runAll = (effects) => {
  for (const effect of effects) run(effect)
}

const dispatch = (msg) => {
  const [next, effects] = update(model, msg)
  model = next
  runAll(effects)
}

const consentFromCookie = () =>
  Object.fromEntries(categories.map((c) => [c, hasConsent(c)]))

/**
 * Starts the given vendors with the consent at page load, then follows the
 * consent changes. A visitor can reopen the banner with revisitCkyConsent
 * and withdraw consent in the same page view.
 */
export const startTracking = (vendors) => {
  if (model) return

  vendorsByName = Object.fromEntries(vendors.map((v) => [v.name, v]))
  categories = [...new Set(vendors.map((v) => v.category))]

  const [first, effects] = init(consentFromCookie(), vendors)
  model = first
  runAll(effects)

  document.addEventListener('cookieyes_consent_update', (e) =>
    dispatch({
      type: 'consent_changed',
      consent: consentFromEvent(e.detail, categories),
    }),
  )
}

/**
 * Sends one event to every vendor that may receive it.
 * Does nothing when startTracking did not run, for example off production.
 */
export const track = (event, properties) => {
  if (model) dispatch({ type: 'track', event, properties })
}
