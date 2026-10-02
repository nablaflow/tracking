// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'
import { loadCookieYes } from '../src/cookieYes.js'

const clientId = '09adf915bf2dc8ba9374b2e59823ecfc'

const cookieYesScripts = () =>
  [...document.scripts].filter((s) => s.src.includes('cdn-cookieyes.com'))

afterEach(() => {
  document.head.innerHTML = ''
})

describe('loadCookieYes', () => {
  test('adds the CookieYes script of the client id', () => {
    loadCookieYes({ clientId })

    const [script] = cookieYesScripts()
    expect(script.id).toBe('cookieyes')
    expect(script.src).toBe(
      `https://cdn-cookieyes.com/client_data/${clientId}/script.js`,
    )
  })

  // jsdom does not download the script, so the test sends the load event.
  test('runs onLoad after the script loads, and not before', () => {
    const onLoad = vi.fn()
    loadCookieYes({ clientId, onLoad })

    expect(onLoad).not.toHaveBeenCalled()

    cookieYesScripts()[0].dispatchEvent(new Event('load'))

    expect(onLoad).toHaveBeenCalledOnce()
  })

  test('a second call adds no second script and does not run its onLoad', () => {
    const second = vi.fn()
    loadCookieYes({ clientId })
    loadCookieYes({ clientId, onLoad: second })

    const scripts = cookieYesScripts()
    expect(scripts).toHaveLength(1)

    scripts[0].dispatchEvent(new Event('load'))

    expect(second).not.toHaveBeenCalled()
  })
})
