# @nablaflow/tracking

Consent-aware tracking for PostHog, Google Analytics 4 (GA4), Google Ads, the Meta Pixel and the LinkedIn Insight Tag. CookieYes gives the consent.

The library does not bundle its code. The bundler of the project, for example Vite, compiles the ES modules. The project must install `posthog-js`.

## Usage

```js
import {
  convert,
  createGoogleAdsVendor,
  createGoogleAnalyticsVendor,
  createLinkedinVendor,
  createMetaVendor,
  createPosthogVendor,
  identify,
  startTracking,
  track,
} from '@nablaflow/tracking'

startTracking([
  createPosthogVendor({
    token: 'phc_...',
    apiHost: 'https://eu.i.posthog.com',
    defaults: '2025-05-24',
  }),
  createGoogleAnalyticsVendor({
    measurementIds: ['G-ZLKH89F9ZF', 'G-CQN2TTM8V4', 'G-J4GL3ETY5J'],
  }),
  createGoogleAdsVendor({
    accountId: 'AW-...',
    conversions: { sign_up: '<conversion label>' },
  }),
  createMetaVendor({
    pixelId: '...',
    conversions: { sign_up: 'CompleteRegistration' },
  }),
  createLinkedinVendor({
    partnerId: '...',
    conversions: { sign_up: 1234567 },
  }),
])

track('panel_opened', { panel: 'results' })
convert('sign_up')
identify('ada@example.com', { email: 'ada@example.com' })
```

The library has 2 functions that send events:

- `track(event, properties)` records an interaction for analytics.
- `convert(name, properties)` tells the advertising platforms that a campaign worked, for example after a sign-up.

`track` never sends a conversion, and `convert` never sends an analytics event. To have both, call both functions.

Each vendor has a `name`, a consent `category` and an `anonymous` flag:

| Vendor     | Category        | Anonymous | Without consent                  |
| ---------- | --------------- | --------- | -------------------------------- |
| PostHog    | `analytics`     | yes       | Tracks with no cookies and no IP |
| GA4        | `analytics`     | no        | Does not load                    |
| Google Ads | `advertisement` | no        | Does not load                    |
| Meta       | `advertisement` | no        | Does not load                    |
| LinkedIn   | `advertisement` | no        | Does not load                    |

Each advertising vendor maps a conversion name to its own id in `conversions`, and ignores the names that the map does not contain:

| Vendor     | Value in `conversions`                        | Call                                                  |
| ---------- | --------------------------------------------- | ----------------------------------------------------- |
| Google Ads | The label of a conversion action              | `gtag('event', 'conversion', { send_to, ...properties })` |
| Meta       | A standard event, e.g. `CompleteRegistration` | `fbq('track', standardEvent, properties)`             |
| Meta       | `{ custom: 'StartTrialAeroCloud' }`           | `fbq('trackCustom', customEvent, properties)`         |
| LinkedIn   | The conversion id from Campaign Manager       | `lintrk('track', { conversion_id })`                  |

The advertising vendors have no `track`: they receive only conversions. An analytics event never goes to an advertising platform.

A Meta custom event needs the object form. A plain string is always a standard event, so a typo in a string does not become a custom event.

The GA4 vendor sends each `track` event to all the properties in `measurementIds`. Each property also gets a `page_view` when gtag.js loads. The GA4 vendor has no `convert` and no `identify`: mark the key events in the GA4 admin. Google Analytics forbids personal data, for example an email address.

The GA4 vendor and the Google Ads vendor share one `window.gtag`. Each vendor sets only the consent types of its category:

- GA4 sets `analytics_storage`. It also turns off Google signals and ad personalization, because these use the ad cookies.
- Google Ads sets `ad_storage`, `ad_user_data` and `ad_personalization`.

Both vendors have the option `scriptUrl`. It loads gtag.js from another URL, for example a first-party path of the Google tag gateway.

Do not also load GA4 from Google Tag Manager (GTM). If GTM keeps a Google tag for the same property, GA4 counts each page view 2 times.

With a reverse proxy, `apiHost` is the address of the proxy. Then also give `uiHost`, the address of the PostHog app, for example `https://eu.posthog.com`. Without it, the PostHog toolbar and the links to PostHog do not work.

A custom vendor is an object with the same three fields and the function `start(granted)`. It can also have `track(event, properties)`, `convert(name, properties)` and `identify(id, properties)`.

`convert(name, properties)` ignores `anonymous`, as `identify` does: a vendor receives the conversion only with consent for its category.

`identify(id, properties)` links the visitor to a known id, for example an email address. Unlike `track`, it ignores `anonymous`: a vendor receives the identity only with consent for its category. Only the PostHog vendor has `identify`, so the call needs the `analytics` consent.

The library reloads the page when the visitor changes the consent. Each vendor therefore decides its mode one time, in `start`, at page load. After a withdraw, CookieYes removes the cookies of the rejected categories, if its cookie scan lists them.

### Load CookieYes

`loadCookieYes` adds the CookieYes banner script. Call it from a small script in the `<head>`, with `async`, so that the banner shows soon. Do not call it from the main bundle of the site if that bundle loads with `defer`.

```js
import { loadCookieYes } from '@nablaflow/tracking/cookieYes'

loadCookieYes({
  clientId: '<CookieYes client id>',
  // Optional. Runs after CookieYes starts, so that CookieYes can block the
  // scripts that it adds, for example GTM.
  onLoad: () => {},
})
```

Import it from `@nablaflow/tracking/cookieYes`, not from `@nablaflow/tracking`. The main entry also imports `posthog-js`, and the bundler keeps it in the head script: approximately 290 kB in place of approximately 300 bytes.

A second call adds no second script, and its `onLoad` does not run.

## Development

[devenv](https://devenv.sh) gives Node.js, npm and the formatters. To load the shell with direnv:

1. Copy `.envrc.example` to `.envrc`.
2. Ask a developer for the value of `CACHIX_AUTH_TOKEN`, and put it in `.envrc`.
3. Run `direnv allow`.

Without direnv, run `devenv shell`.

### Tests

Run the formatter check and the tests, as the CI does:

```sh
devenv test
```

`devenv test` shows the output only when a step fails.

To run only the tests, install the dependencies first:

```sh
npm ci
npm test
```

### Format

Format all files:

```sh
treefmt
```

treefmt runs Biome on the JavaScript and JSON files. Biome also applies safe lint fixes. treefmt runs nixfmt, statix and deadnix on the Nix files. `devenv test` fails when a file is not formatted.

VS Code formats a file when you save it. Install the recommended extensions from `.vscode/extensions.json`.
