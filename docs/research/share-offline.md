# Share, offline downloads, background refresh: platform research (PULSE, cycle 0)

Accessed 2026-11-23. Summaries are in my own words. Items marked "unverified" were not tested on a device.

## 1. Web Share API (`navigator.share`, `navigator.canShare`)

- Needs a secure context and transient activation (a click/tap), so it can only run from a button handler. It throws `AbortError` when the user closes the sheet and `NotAllowedError` without activation or when the `web-share` permissions policy blocks it. Source: [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API), [MDN share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).
- Not Baseline: Chrome Android, Safari (macOS and iOS) and Chrome on Windows/ChromeOS support it; desktop Firefox and Android WebView do not. Feature detect, never UA-sniff. Source: [MDN canShare()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare), [W3C Web Share](https://www.w3.org/TR/web-share/), [web.dev Web Share](https://web.dev/articles/web-share).
- File sharing (our 1080x1350 PNG card): call `navigator.canShare({ files: [file] })` first; only some types are permitted (PNG is). `canShare` does not need activation, so the UI can decide up front whether to show "Share image". Source: [web.dev share files](https://web.dev/articles/files/share-files).
- Fallback when unsupported: copy link (Clipboard API) plus "Save image" (an `<a download>` of the blob URL).

## 2. Capacitor plugins (already installed: `@capacitor/share` 8, `@capacitor/filesystem` 8, `@capacitor/network` 8)

- Share: `Share.share({ title, text, url, dialogTitle, files })`; `files` takes `file://` paths and works only on Android/iOS. `canShare()` reports support. By default Android only allows sharing files from the cache folder (FileProvider paths). Source: [Capacitor Share](https://capacitorjs.com/docs/apis/share).
  - Plan: to share the card image on Android, write the PNG to `Directory.Cache` with Filesystem (base64), then pass its `uri` in `files`. No manifest change is needed for the cache folder.
- Network: `Network.getStatus()` returns `{ connected, connectionType: "wifi" | "cellular" | "none" | "unknown" }` plus a `networkStatusChange` listener. `src/lib/platform/index.ts` already wires it on native. On the web, `navigator.connection.type` exists only on Chromium Android and is often missing, so "Wi-Fi only" on the web must treat `unknown` as "ask first" (Spec G). (Capacitor Network docs: https://capacitorjs.com/docs/apis/network, accessed 2026-11-23, API surface unverified on device.)
- Filesystem: not needed for downloads. Pages stay in IndexedDB inside the app on every platform (Spec G: no file export). Only used for the temporary share image on Android.

## 3. Background sync limits on the PWA

- One-shot Background Sync (`registration.sync`) is Chromium-only (Chrome 49+, Edge, Samsung); not in Firefox or Safari. The worker can be killed when idle about 30 s, and `waitUntil` work is capped around 5 minutes in Chrome. Meant for small uploads, not chapter downloads. Source: [MDN offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation), [OpenPWA Background Sync](https://openpwa.net/reference/service-worker/background-sync/).
- Periodic Background Sync is Chromium-only, requires an installed app launched standalone, a non-zero engagement score and a known network, and the browser picks the timing (the spec suggests at least 12 h across origins). Source: [Chrome Periodic Background Sync](https://developer.chrome.com/docs/capabilities/periodic-background-sync), [WICG spec](https://wicg.github.io/background-sync/spec/PeriodicBackgroundSync-index.html), [OpenPWA Periodic Sync](https://openpwa.net/reference/service-worker/periodic-background-sync/).
- Decision: do not depend on either. Downloads run in the page (foreground) and resume on next open or on the `online` event. Library refresh (Spec M) runs on app foreground (`visibilitychange`/Capacitor `resume`) and on `online`, throttled to once per 15 minutes, one batched call. Periodic sync can be an optional enhancement later, feature-detected.

## 4. `navigator.storage.persist()` / `estimate()`

- Storage is best-effort by default and can be evicted under pressure; `persist()` asks to exempt the origin. Chrome/Edge decide silently from engagement (installed, bookmarked, notifications granted); Firefox shows a prompt; Safari decides from interaction history. It resolves to a boolean; `persisted()` checks without asking. Source: [MDN quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [web.dev persistent storage](https://web.dev/articles/persistent-storage), [OpenPWA persistence](https://openpwa.net/reference/storage/persistence.md).
- Safari deletes script-written storage of non-installed sites after 7 days without user interaction; installed home-screen apps are exempt. Source: MDN page above.
- Quotas: Chromium allows an origin up to about 60% of disk; Firefox best-effort is the smaller of 10% of disk or 10 GiB. `estimate()` is supported in all current engines. Source: MDN page above.
- Decision: call `persisted()` first, and `persist()` only after a user action (first download or the "Keep downloads safe" button in the storage manager), never on first paint. Show the result honestly ("Protected" / "May be cleared by the browser when space is low"). Check `estimate()` before every chapter (refuse under 50 MB free, Spec G) and catch `QuotaExceededError` on writes.

## 5. Link previews: Open Graph and X cards

- X reads `twitter:*` and falls back to `og:*`; only `twitter:card` has no fallback, so set `twitter:card=summary_large_image`. Large-image cards want about 2:1, at least 300x157, at most 4096x4096, under 5 MB, JPG/PNG/WebP/GIF, no SVG; the URL must be absolute https and reachable without cookies or JS. Twitterbot respects robots.txt and caches cards for about 7 days. Source: [X summary_large_image](https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image), [X getting started](https://developer.x.com/en/docs/twitter-for-websites/cards/guides/getting-started).
- Facebook and most chat apps use `og:title`, `og:description`, `og:image` (about 1200x630, 1.91:1), `og:url`, `og:type`; WhatsApp prefers small images (under about 600 KB). Source: [syntaqx link previews notes](https://github.com/syntaqx/syntaqx.com/blob/main/content/docs/frontend/link-previews.md) (third-party summary; unverified against Meta docs this cycle).
- Crawlers do not run JavaScript, so the SPA's client-side `seo.ts` tags are invisible to them. Server-rendered tags are needed for `/t/<id>`.
- X web intent: `https://x.com/intent/post?text=&url=`; Facebook: `https://www.facebook.com/sharer/sharer.php?u=` (Facebook ignores prefilled text). Instagram has no web share URL: native sheet or the card image only.

## 6. Serving `/t/<id>` meta tags on Vercel (Vite SPA)

- Vercel Routing Middleware works for non-Next projects: a `middleware.ts` at the project root with a default export taking a standard `Request`, `export const config = { matcher: [...] }`, Node.js runtime by default. Returning nothing lets the request continue to the normal route (here the SPA rewrite). No package is needed (`@vercel/functions` only adds helpers). Source: [Vercel Routing Middleware](https://vercel.com/docs/routing-middleware), [JS reference](https://vercel.com/docs/routing-middleware/js-reference), [getting started](https://vercel.com/docs/routing-middleware/getting-started).
- Plan: matcher `/t/:path*`. For link-preview user agents (Twitterbot, facebookexternalhit, Slackbot, Discordbot, WhatsApp, TelegramBot, LinkedInBot, Applebot, Googlebot and similar) return minimal HTML with OG/Twitter tags; everyone else continues to the SPA, whose `/t/:id` route opens the title. This is content negotiation for our own site, not spoofing. Title name and description come from the Dawghwa API (1.5 s timeout); on any failure, generic Dawghwa tags. `og:image` is the static `/og.png` this cycle, because cover URLs point at third-party hosts (a leak); a proxied cover can replace it once RELAY exposes one.
- Unverified until a preview deploy: that Routing Middleware runs before the `vercel.json` SPA rewrite for a `framework: vite` project (docs say middleware runs before routes; to confirm with curl on the PR preview).

## Recommendation

Use platform APIs only, no new dependency: Web Share with Capacitor Share on Android, Clipboard fallback, canvas card; IndexedDB (existing `idb` package) for offline pages; foreground refresh instead of background sync; `persist()` after user intent; root `middleware.ts` for `/t/<id>` previews with a static OG image.
