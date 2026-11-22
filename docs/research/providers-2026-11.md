# Provider research, 2026-11 (Phase 4)

Date: 2026-11-22. Author: provider_researcher agent. Raw API results: [data/providers-2026-11.json](data/providers-2026-11.json).

## Summary

- **comix.ws:** blocked. Cloudflare returned 403 "you have been blocked" for `/terms` and `/dmca` on the first request, so I stopped as the brief requires. No comix.ws title pages were opened in this phase, which means I can't give a per-title description of how comix.ws shows providers. Terms and robots details are in [providers-comix-ws-terms.md](providers-comix-ws-terms.md). The only comix.ws title-page notes we have are from the earlier read-only inventory ([comix-inventory.md](comix-inventory.md#title-page), 2026-11-20/21): one chapter row per upload per scanlation group (groups not merged), a group filter, a sort control and 20 rows per page. Those notes weren't re-checked here.
- **Dawghwa source id `comix` is not comix.ws.** `dawghwa.api/src/lib/scrapers/comix.ts` and `src/lib/frontpages/comix.ts` both set `baseUrl = 'https://comix.to'` and `apiBase = 'https://comix.to/api/v2'`. `canHandle()` matches `comix.to`, and `manifest.generated.ts` maps `Comix -> ["comix.to"]`. There is no reference to `comix.ws` anywhere in `dawghwa.api/src`. Live, the `comix` source returned `UPSTREAM_BLOCKED` ("comix.to is protected by an anti-bot challenge (cloudflare)") on every title, or `SOURCE_CIRCUIT_OPEN` after its circuit tripped.
- **Dawghwa's own providers:** 12 titles × 8 providers, tested through the live API at https://dawghwaapi.vercel.app. Three of the 8 (WeebCentral, FlameComics, Comix) were blocked or failed on every title. MangaKatana, ManhuaPlus, AsuraScan, Webtoon and MangaDex all answered.
- **Main finding:** a source **match** and **readable chapters** are separate things and need separate labels. MangaDex returns an `exact` (1.0) match for licensed titles but only 0–4 English chapters: Kagurabachi 0, Dandadan 0, Solo Leveling 0, Tower of God 0, One Piece 1, The Greatest Estate Developer 3, Omniscient Reader 4. A UI that shows "Available" for these is wrong.
- **New provider adapters:** none written. The only new candidate in scope was comix.ws, and it failed both the terms check (terms unreadable) and the access check (403). No other provider was assessed for terms in this phase, so no adapter or flag was added to dawghwa.api.

## Method

- Title refs came from the API's own MangaDex search (`POST /api/search {source:"mangadex"}`), because direct AniList GraphQL returned 403 from the sandbox. Every ref is a real MangaDex UUID returned by that search.
- Source matching: `GET /api/titles/mangadex:<uuid>/sources?sources=<8 ids>&includeUnavailable=1`.
- Chapter verification: for each source that came back `available` (exact or high match), `GET /api/titles/<ref>/chapters?source=<id>`, counting the `chapters` array that was returned. Possible (0.6–0.82) candidates were **not** chapter-checked. They're listed as candidates only.
- Pacing: at least 1.1 s between requests to the API host, with exponential backoff on 429/5xx (none happened). Provider fan-out happens on the API server under its own per-provider rate limits.
- Match labels are the API's: **exact** (score ≥ 0.95), **high** (≥ 0.82, the default minimum), **possible** (≥ 0.6, candidate only). Every available match in this run was exact (score 1.0).

## Panel

Providers: mangadex, mangakatana, manhuaplus, asurascan, webtoon (all `active`), weebcentral, flamecomics (`active` in the manifest but Cloudflare-blocked live) and comix (`unstable`, comix.to). Each cell shows the source-match status first, then the separate chapter-verification result.

Cell legend:
- `match: exact 1 ("…"); chapters: N` means the source matched, and the chapter endpoint returned N chapter rows.
- `chapters: 0 — no readable chapters` means the source matched but has nothing readable (typically licensed and removed).
- `no match` means the source answered but returned no result scoring ≥ 0.82.
- `possible candidates only` means a lower-score result was found. It wasn't verified and shouldn't be shown as available.
- `blocked/failed (CODE)` means the upstream refused (Cloudflare) or the circuit breaker was open.
- `not checked` didn't occur: every title × provider pair got an answer.

| Title | Type | mangadex | mangakatana | manhuaplus | asurascan | webtoon | weebcentral | flamecomics | comix |
|---|---|---|---|---|---|---|---|---|---|
| One Piece (`mangadex:a1c7c817-4e59-43b7-9365-09675a149a6f`) | manga, long-running shonen | match: exact 1 ("One Piece"); chapters: 1 | match: exact 1 ("One Piece"); chapters: 1205 | no match | no match | no match; possible candidates only: "One Piece: Destiny" 0.667; "One Piece: Destiny" 0.667 | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) |
| Berserk (`mangadex:801513ba-a712-498c-8f57-cae55b38cc92`) | manga, long-running seinen | match: exact 1 ("Berserk"); chapters: 425 | match: exact 1 ("Berserk"); chapters: 403 | no match | no match | no match | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) |
| Kagurabachi (`mangadex:d65c0332-3764-4c89-84bd-b1a4e7278ad7`) | manga, new shonen | match: exact 1 ("Kagurabachi"); chapters: 0 — no readable chapters | match: exact 1 ("Kagurabachi"); chapters: 142 | no match | no match | no match | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) |
| Dandadan (`mangadex:68112dc1-2b80-4f20-beb8-2f2a8716a430`) | manga, recent shonen | match: exact 1 ("Dandadan"); chapters: 0 — no readable chapters | match: exact 1 ("Dandadan"); chapters: 255 | no match | no match | match: exact 1 ("Dandadan"); chapters: 1 | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) |
| Solo Leveling (`mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0`) | manhwa, completed action | match: exact 1 ("Solo Leveling"); chapters: 0 — no readable chapters | match: exact 1 ("Solo Leveling"); chapters: 202 | no match; possible candidates only: "Solo Leveling: Ragnarok" 0.711 | match: exact 1 ("Solo Leveling"); chapters: 201 | no match | blocked/failed (SOURCE_CIRCUIT_OPEN) | blocked/failed (SOURCE_CIRCUIT_OPEN) | blocked/failed (SOURCE_CIRCUIT_OPEN) |
| Omniscient Reader's Viewpoint (`mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3`) | manhwa, ongoing webtoon | match: exact 1 ("Omniscient Reader's Viewpoint"); chapters: 4 | no match | match: exact 1 ("Omniscient Reader's Viewpoint"); chapters: 313 | match: exact 1 ("Omniscient Reader’s Viewpoint"); chapters: 312 | no match | blocked/failed (SOURCE_CIRCUIT_OPEN) | blocked/failed (SOURCE_CIRCUIT_OPEN) | blocked/failed (SOURCE_CIRCUIT_OPEN) |
| The Greatest Estate Developer (`mangadex:d7f56ace-cd30-48b9-8b64-afeca0077fca`) | manhwa, webtoon-style comedy | match: exact 1 ("The Greatest Estate Developer"); chapters: 3 | no match | match: exact 1 ("The Greatest Estate Developer"); chapters: 226 | match: exact 1 ("The Greatest Estate Developer"); chapters: 223 | match: exact 1 ("The Greatest Estate Developer"); chapters: 7 | blocked/failed (SOURCE_CIRCUIT_OPEN) | blocked/failed (SOURCE_CIRCUIT_OPEN) | blocked/failed (SOURCE_CIRCUIT_OPEN) |
| Tower of God (`mangadex:c0ee660b-f9f2-45c3-8068-5123ff53f84a`) | manhwa, webtoon-style long-running | match: exact 1 ("Tower of God"); chapters: 0 — no readable chapters | match: exact 1 ("Tower of God"); chapters: 653 | no match | no match | match: exact 1 ("Tower of God"); chapters: 652 | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) |
| Tales of Demons and Gods (`mangadex:812f9696-048f-496d-9ed4-84c99345d1fb`) | manhua, long-running cultivation | match: exact 1 ("Tales of Demons and Gods"); chapters: 570 | no match | match: exact 1 ("Tales Of Demons And Gods"); chapters: 521 | no match | no match | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) |
| Martial Peak (`mangadex:b1461071-bfbb-43e7-a5b6-a7ba5904649f`) | manhua, very long-running cultivation | match: exact 1 ("Martial Peak"); chapters: 3918 | no match | match: exact 1 ("Martial Peak"); chapters: 3363 | no match | no match | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) |
| Absolute Reign (`mangadex:1de0715a-ba15-4250-8eb9-0149be0ac76e`) | obscure (low-chapter-count MangaDex entry) | match: exact 1 ("Absolute Reign"); chapters: 42 | match: exact 1 ("Absolute Dominion"); chapters: 118 | match: exact 1 ("Absolute Dominion"); chapters: 117 | match: exact 1 ("Absolute Domination"); chapters: 100 | match: exact 1 ("Absolute Reign"); chapters: 100 | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) | blocked/failed (UPSTREAM_BLOCKED) |
| Zui Wu Dao (`mangadex:a1e27101-85c9-45c9-ac40-a3707cb8443a`) | obscure manhua | match: exact 1 ("Zui Wu Dao"); chapters: 54 | match: exact 1 ("Zui Wu Dao"); chapters: 54 | no match | no match | no match | blocked/failed (SOURCE_CIRCUIT_OPEN) | blocked/failed (SOURCE_CIRCUIT_OPEN) | blocked/failed (SOURCE_CIRCUIT_OPEN) |

## Comparison and observations

1. **Matched does not mean readable.** MangaDex matched 12 out of 12 titles exactly, but had a substantial chapter list for only 5 of them (Berserk 425, Tales of Demons and Gods 570, Martial Peak 3918, Absolute Reign 42, Zui Wu Dao 54). Licensed series show up with 0–4 chapters. Webtoon matched "Dandadan" with 1 chapter, probably a different upload under the same name. That's a reason to show chapter counts and not trust a match on its own.
2. **Chapter counts differ by provider for the same series.** Examples: One Piece 1205 (MangaKatana) vs 1 (MangaDex); Berserk 425 vs 403; Martial Peak 3918 (MangaDex) vs 3363 (ManhuaPlus); Tales of Demons and Gods 570 vs 521. Row counts also differ from the highest chapter number, because of `.5` extras, duplicates and gaps. For example, ManhuaPlus ToDaG has latest 539.6 but only 521 rows. The UI should show **both** the latest chapter number and the row count, or at least the latest number. It shouldn't imply the two are equal.
3. **Different providers suit different types.** Japanese manga was carried by MangaKatana (and MangaDex for unlicensed titles). Manhwa was carried by AsuraScan, ManhuaPlus and MangaKatana. Manhua was carried by ManhuaPlus and MangaDex. Webtoon originals (Tower of God 652, Greatest Estate Developer 7 free episodes) came from Webtoon. The default provider should be decided per title from verified counts, not by a global priority.
4. **The match label alone can't flag a likely mismatch.** "Absolute Reign" (MangaDex) matched exactly, through alternative titles, to "Absolute Dominion" (MangaKatana 118, ManhuaPlus 117) and "Absolute Domination" (AsuraScan 100). Webtoon returned exactly 100 rows, which may be a page cap. These look like the same series under translated names, but I couldn't confirm that. The UI should show the provider's own title next to the match label when it differs from the canonical title.
5. **Blocked sources stayed blocked for the whole run.** The run took about five minutes (2026-11-22, roughly 14:24 to 14:29 UTC). That's too short to say the blocks are permanent, but they didn't clear during it. WeebCentral, FlameComics and Comix (comix.to) were Cloudflare-blocked on the first titles. Their circuit breakers then opened (`SOURCE_CIRCUIT_OPEN`) and later closed again, and they were still blocked. While a block lasts, they should be shown collapsed as "Couldn't reach (blocked)", not as loading. Recheck over a longer window, for example with `npm run health:report`, before treating a block as permanent.
6. **Language:** MangaDex and Webtoon chapters report `en`. MangaKatana, ManhuaPlus and AsuraScan don't report a language (all English-only sites). The UI shouldn't make up a language badge for providers that don't report one.
7. **Possible candidates are noisy.** Webtoon "One Piece: Destiny" (0.667), MangaDex "One Piece Party" (0.713), "Solo Leveling: Arise / Ragnarok" (0.71–0.77) and "Peak Of Martial Art" (0.702) are all different works. They must never appear as available. At most, show them behind a "Similar titles on this source (unverified)" disclosure.

## Recommended provider-display patterns for the Title page

These patterns extend the existing `ProviderPicker` in `src/routes/TitlePage.tsx` (radiogroup "Read from source"). They don't replace it.

1. **Two separate status lines per provider.**
   - Match: `Exact match`, `High match`, or `Possible match (unverified)`, with the provider's own title shown when it differs from the canonical title. This applies to exact 1.0 scores too: they can come from an alternative-title match ("Absolute Reign" matched "Absolute Dominion" and "Absolute Domination"), so show something like `Exact match · listed as "Absolute Dominion"`.
   - Chapters: `Checking chapters…`, `N chapters · latest ch. X`, `0 readable chapters`, `Couldn't load chapters`.

   A provider counts as **readable** only when both lines are good, meaning an exact or high match **and** at least 1 chapter.
2. **Distinct states with text, not only colour or icons:** Readable · Matched, no readable chapters · No match · Possible match only · Blocked by site · Didn't respond / timed out · Checking · Not checked. Each state needs its own wording (extend the `UNAVAILABLE` map: add `blocked` → "Site blocked us", `circuit-open` → "Paused after repeated failures", `zero-chapters` → "Matched, but no readable chapters").
3. **Default provider rule:** pick the readable provider with the highest latest chapter number. Break ties on exact over high, then on the most recent update. Never default to a provider with 0 chapters or one that is only a possible match. Remember the user's last explicit choice for each title and prefer it while it stays readable. Say why it was chosen, for example "Chosen: most chapters (1205)".
4. **Ordering and grouping:** readable providers first, sorted by latest chapter. Then "Matched, no chapters". Then a collapsed "Unavailable (n)" group with no-match, blocked and failed providers. Then "Possible matches (n)" collapsed and marked unverified.
5. **Switching:** changing provider keeps the user's place by chapter number. If the target provider doesn't have that chapter, say so ("ch. 1199 isn't on MangaDex; nearest is 1191") and don't jump silently. Keep the "All sources" unified option.
6. **Counts:** show `latest ch. X` as the main figure and `N chapters` as secondary text. Show `.5` and extra chapters as they are, and don't round them in a way that hides gaps.
7. **Language:** show a language chip only when the provider reports one. Otherwise show nothing (not "EN" by assumption).
8. **Accessibility:** keep `role="radiogroup"` with arrow-key movement and roving tabindex. Unavailable providers are not radio options: render them as list items with `aria-disabled` and readable state text. Each radio's accessible name should include the provider name, match label and chapter count, for example "MangaKatana, exact match, 1205 chapters, latest 1199". Announce chapter-check results through a polite live region. Collapsed groups use a `button` with `aria-expanded`.

## What could not be verified

- Anything on comix.ws title pages in this phase (403 on the first requests, so I stopped).
- comix.ws terms of service, DMCA policy and any API terms (not readable, 403).
- Whether the Webtoon (100) and AsuraScan (100) counts for Absolute Reign are complete or capped by pagination.
- Whether the "Absolute Reign / Dominion / Domination" matches are all the same series (they look like it, but this isn't confirmed).
- AniList-based refs (AniList GraphQL returned 403 from the sandbox, so MangaDex refs were used).
