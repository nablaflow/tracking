# @nablaflow/tracking

Consent-aware tracking for PostHog, Google Ads, the Meta Pixel and the LinkedIn Insight Tag. CookieYes gives the consent.

The library does not bundle its code. The bundler of the project, for example Vite, compiles the ES modules. The project must install `posthog-js`.

## Usage

```js
import {
  createGoogleAdsVendor,
  createLinkedinVendor,
  createMetaVendor,
  createPosthogVendor,
  startTracking,
  track,
} from '@nablaflow/tracking'

startTracking([
  createPosthogVendor({
    token: 'phc_...',
    apiHost: 'https://eu.i.posthog.com',
    defaults: '2025-05-24',
  }),
  createGoogleAdsVendor({
    accountId: 'AW-...',
    conversions: { lead_submitted: '<conversion label>' },
  }),
  createMetaVendor({ pixelId: '...' }),
  createLinkedinVendor({ partnerId: '...' }),
])

track('lead_submitted', { form: 'book_demo' })
```

Each vendor has a `name`, a consent `category` and an `anonymous` flag:

| Vendor     | Category        | Anonymous | Without consent                  |
| ---------- | --------------- | --------- | -------------------------------- |
| PostHog    | `analytics`     | yes       | Tracks with no cookies and no IP |
| Google Ads | `advertisement` | no        | Does not load                    |
| Meta       | `advertisement` | no        | Does not load                    |
| LinkedIn   | `advertisement` | no        | Does not load                    |

The Google Ads vendor sends a conversion only for the events in `conversions`. It maps each event to the label of a conversion action, and it ignores the other events. It sets only the ad consent types (`ad_storage`, `ad_user_data` and `ad_personalization`). The option `scriptUrl` loads gtag.js from another URL, for example a first-party path of the Google tag gateway.

The LinkedIn vendor ignores `track`. A LinkedIn conversion needs a conversion id from Campaign Manager, not an event name.

A custom vendor is an object with the same three fields and the functions `start(granted)` and `track(event, properties)`.

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
