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
