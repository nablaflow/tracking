/**
 * Tracking logic in the Elm Architecture style.
 *
 * The model holds the consent for each category and the data of each vendor.
 * A vendor with anonymous: true receives the tracked events without consent.
 */

/**
 * Given a consent object and a category, returns if consent is given.
 */
const isGranted = (consent, category) => consent[category] === true

/**
 * Builds the first state at page load, as [state, effects].
 *
 * It keeps only the data fields of each vendor, so the state holds no
 * functions.
 */
export const init = (consent, vendorList) => {
  const vendors = vendorList.map(({ name, category, anonymous }) => ({
    name,
    category,
    anonymous: anonymous === true,
  }))

  const effects = vendors.map((v) => ({
    type: 'start',
    vendor: v.name,
    granted: isGranted(consent, v.category),
  }))

  return [{ consent, vendors }, effects]
}

export const update = (model, msg) => {
  switch (msg.type) {
    // CookieYes sends a consent update when it starts, and again on each
    // banner action.
    case 'consent_changed': {
      const effects = []

      // For each vendor compare the consent in the state with the new
      // consent from the msg. Push an effect when there are changes.
      for (const v of model.vendors) {
        const grantedBefore = isGranted(model.consent, v.category)
        const grantedNow = isGranted(msg.consent, v.category)

        if (grantedBefore !== grantedNow) {
          effects.push({
            type: grantedNow ? 'grant' : 'revoke',
            vendor: v.name,
          })
        }
      }

      return [{ ...model, consent: msg.consent }, effects]
    }

    case 'track': {
      // Send the event to each vendor that is anonymous or has consent
      // for its category.
      const effects = model.vendors
        .filter((v) => v.anonymous || isGranted(model.consent, v.category))
        .map((v) => ({
          type: 'send',
          vendor: v.name,
          event: msg.event,
          properties: msg.properties,
        }))

      return [model, effects]
    }

    default:
      return [model, []]
  }
}
