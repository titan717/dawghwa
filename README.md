<!-- Dawghwa — built for people who love getting lost in a story. -->

<div align="center">
  <img src="assets/dawghwa-mascot.svg" width="230" alt="Dawghwa dog mascot gently floating" />
  <h1>DAWGHWA</h1>
  <p><strong>Find a story. Make it yours.</strong></p>
  <p>Manga · Manhwa · Manhua · Webtoons</p>
  <p>
    <a href="docs/README.md">Documentation</a>
    &nbsp;·&nbsp;
    <a href="docs/ARCHITECTURE.md">Architecture</a>
    &nbsp;·&nbsp;
    <a href="docs/DESIGN.md">Design</a>
  </p>
</div>

---

Dawghwa is an installable PWA and Android reader for discovering series, reading chapters, and keeping your place across sessions.

## The reading loop

| | |
|:--|:--|
| **Discover** | Browse catalogue sections, use supported filters, or describe the kind of series you want in natural language. |
| **Read** | Use a unified chapter list, choose an available edition, and read vertically, as single or double pages, or as a long strip. |
| **Keep your place** | Your local library, history, progress, bookmarks, and reader profiles stay on this device. |
| **Make it yours** | Set onboarding genres, tune reader settings, and opt into on-device recommendations and rewards. |

## Made for readers

- **On-device recommendations.** Recommendation learning happens locally on your device.
- **Private-by-default local data.** Library, history, progress, profiles, and comments are stored in IndexedDB.
- **A reader that gets out of the way.** Reading modes and controls are designed around the chapter, not around chrome.
- **One app, two ways to use it.** Install as a PWA or build the Android app.

## Content and privacy

Dawghwa does not host content or run scrapers. Catalogue, chapter, and page data come from the separate [Dawghwa API](https://github.com/titan717/dawghwa.api), which builds on [comick-source-api](https://github.com/GooglyBlox/comick-source-api) (MIT).

Your library and reading data are stored locally, but browsing and reading still make network requests to the API and content providers. Local storage does not make those requests anonymous.

The PWA can cache its app shell and covers. Chapter pages are not cached for offline reading. The optional four-digit PIN is a privacy curtain, not encryption.

## Run locally

Requires **Node.js 22+**.

```sh
npm install
cp .env.example .env.local
# Set DAWGHWA_API_DEV if your API is not running on :3100.
npm run dev
```

Run the API alongside this app in `dawghwa.api`:

```sh
npm run build
npx next start -p 3100
```

Or point the dev/preview proxy at the deployed API:

```sh
DAWGHWA_API_DEV=https://dawghwaapi.vercel.app npm run preview
```

## Quality checks

| Command | What it checks |
| --- | --- |
| `npm run typecheck` | TypeScript types |
| `npm run lint` | ESLint rules |
| `npm test` | Unit and integration tests (Vitest, fake IndexedDB) |
| `npm run eval:intel` | Recommendation evaluation report |
| `npm run build && npm run e2e` | Production build and Playwright checks |
| `npm run e2e:live` | Live reader checks; requires a running API |

## Android build

```sh
VITE_API_BASE_URL=https://your-api.example npm run android:build
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Android builds require JDK 21 and Android SDK platform 36. A configured HTTPS API is required unless you intentionally set `ALLOW_NO_API=1` for a UI-only smoke build.

## API routes used

| Feature | Endpoint |
| --- | --- |
| Catalogue, Discover, structured search | `GET /api/catalog?provider=mangadex` |
| Filter vocabulary | `GET /api/catalog/filters?provider=mangadex` |
| Title details | `GET /api/titles/mangadex:{id}` |
| Multi-source title search | `POST /api/search` (NDJSON) |
| Unified chapters and pages | `GET /api/titles/{ref}/chapters/all`, `POST /api/chapters`, `POST /api/pages` |
| Content reports | `POST /api/reports` |

The catalogue provider is MangaDex, so catalogue IDs match the reader's MangaDex IDs. Queries are translated by `src/lib/api/catalog.ts`. Filters the API cannot apply are handled on-device when possible and identified in the interface; filters requiring unavailable catalogue metadata are not guessed.

## Project notes

Start at the [documentation hub](docs/README.md) for product, design, research, and engineering notes.

---

<div align="center">
  <sub>Made for the next chapter. 🐾</sub>
</div>

MIT licensed. Upstream credits are listed in the in-app About page.
