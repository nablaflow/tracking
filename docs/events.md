# Tracking events: rules for developers

This document gives the rules for tracking events on the website (`nablaflow.io`) and in the apps (`aerocloud.nablaflow.io` and `archiwind.nablaflow.io`, the `nabla_core` repository). Both use this library.

## The 3 types of event

| Type | Origin | Call | Receivers |
| --- | --- | --- | --- |
| Product event | The server of `nabla_core` | `NablaCore.UserTracking` | PostHog |
| Interaction event | The browser | `track(event, properties)` | PostHog, and GA4 if `events` maps the event |
| Conversion | The browser | `convert(name, properties)` | Google Ads, Meta, LinkedIn and GA4, if their `conversions` map contains the name |

## Rule 1: one origin for each event

Send each event from 1 origin only. Never send the same event from the server and from the browser, also not under a different name. Else PostHog counts it 2 times.

A business result, for example a sign-up, is a product event on the server. The browser sends the same result only as a conversion, for the tools that measure campaigns.

## Rule 2: `convert` never goes to PostHog

The PostHog vendor has no `convert`. PostHog receives the business results from the server, so a browser copy would count each result 2 times. A test in `test/posthog.test.js` fails if someone adds `convert` to the PostHog vendor.

## Product events

The server sends them with `NablaCore.UserTracking` in `nabla_core`. Ad blockers and the cookie choice do not stop them, so PostHog has the complete count. The module is the list of the product events. Do not copy the list into a document.

The server also sends a `pageview` to PostHog for each LiveView navigation of an identified user.

## Interaction events

The browser sends them with `track`. They show what a user does in the page, for example a form submission.

- PostHog receives each `track` call, also without consent, in anonymous mode.
- GA4 receives a `track` call only if its `events` map contains the event (see below where the maps live). The map gives the GA4 name of the event, or a list of names.

The map is required because GA4 event name can contain only letters, digits and underscores. PostHog uses, for example `aerocloud:demo_request`, therefore it needs to be translated when used on GA4.

## Conversions

The browser sends them with `convert`. Those are sent only client-side. 

Each vendor maps the name of the conversion to its own id in `conversions`, and ignores a name that the map does not contain. See the table of values in the [README](../README.md#usage).

## Where the maps live

| Project | File | Contents |
| --- | --- | --- |
| Website | `data/forms.json` | For each form: `event` (the `track` name), `google_ads_label`, `meta_event` and `ga4_events` |
| Website | `themes/nablaflow/assets/js/forms.js` | Builds the map of each vendor from `data/forms.json` |
| Apps | `assets/js/tracking.js` in `nabla_core` | The `conversions` map of each vendor |

## Consent

CookieYes gives the consent. Each vendor decides its mode one time, at page load. A change of consent reloads the page.

| Vendor | Category | Without consent |
| --- | --- | --- |
| PostHog | `analytics` | Tracks with no cookies and no IP address |
| GA4 | `analytics` | Does not load |
| Google Ads | `advertisement` | Does not load |
| Meta | `advertisement` | Does not load |
| LinkedIn | `advertisement` | Does not load |

**Caution:** CookieYes also blocks scripts through the "Script URL Pattern" of each cookie in its cookie list. This library also does not load a script if it's in a category that doesn't have consent, reading the CookieYes cookie.

## How to add an event

1. Choose the type:
   - Something real happens in the product, for example a new account → a product event on the server.
   - A campaign worked → a conversion with `convert`.
   - Something happens only in the page → an interaction event with `track`.
2. For a product event, add a function to `NablaCore.UserTracking`. Use the form `<product>:<object>_<action>`, for example `aerocloud:simulation_create`.
3. For an interaction event, call `track` where the action succeeds. For example, send a form event after the server accepts the form. On the website, add the event to `data/forms.json`.
4. For GA4, add the event to the `events` or `conversions` map with a valid GA4 name. Then mark the event as a key event in the GA4 admin, if it is a business result.
5. For Google Ads, Meta or LinkedIn, get the id of the conversion from marketing. Add it to the `conversions` map of the vendor.
6. Test in the browser. See the next section.

## How to test

Use a private window with no extensions. An ad blocker stops the requests with no error.

1. Accept the cookie category of the vendor in the banner.
2. Check the scripts on the page:
   ```js
   [...document.scripts].map((s) => s.src).filter((s) => /googletagmanager|cookieyes/.test(s))
   ```
3. Check the gtag queue. It shows what the library sent to Google, also when the network request is missing:
   ```js
   window.dataLayer.map((a) => Array.from(a)).filter((a) => a[0] === 'event')
   ```
4. Check the requests to GA4. On the **Network** tab, filter by `collect`. Read `tid` (the property) and `en` (the event) on the **Payload** tab. gtag.js can put several events in the body of 1 request, so a check of the URL alone can miss an event.
5. Check that GA4 received the event in **Reports → Realtime overview**. A new event name shows in **Admin → Events** only after 24–48 hours.
