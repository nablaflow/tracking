# @nablaflow/tracking

Consent-aware tracking for PostHog and the Meta Pixel. CookieYes gives the consent.

The library does not bundle its code. The bundler of the project, for example Vite, compiles the ES modules. The project must install `posthog-js`.

## Usage

```js
import {
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
  createMetaVendor({ pixelId: '...' }),
])

track('lead_submitted', { form: 'book_demo' })
```

Each vendor has a `name`, a consent `category` and an `anonymous` flag:

| Vendor  | Category        | Anonymous | Without consent                  |
| ------- | --------------- | --------- | -------------------------------- |
| PostHog | `analytics`     | yes       | Tracks with no cookies and no IP |
| Meta    | `advertisement` | no        | Does not load                    |

A custom vendor is an object with the same three fields and the functions `start(granted)`, `grant()`, `revoke()` and `track(event, properties)`.
