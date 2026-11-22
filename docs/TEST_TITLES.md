<!-- Copied verbatim from the Analyst record (analysis/TEST_TITLES.md, live API 2026-11-22). The JSON record and raw responses are not committed. Phase 1 unit tests use Solo Leveling canonical chapter keys captured in src/test/fixtures/chapters-solo-leveling.json. -->

# Test titles: live provider availability

Facts only, observed from the live API https://dawghwaapi.vercel.app on 2026-11-22 (UTC timestamps per row). Machine-readable record: `provider-availability.json` (same folder). Raw NDJSON responses: `raw/`.

Method: GET /api/titles/{ref}/sources?stream=1&includeUnavailable=1 per title, then GET /api/titles/{ref}/chapters?source={id}&order=asc per available provider; ~1 req/s sequential. `/api/sources` lists 96 providers (69 active, 13 unstable, 14 shutdown); every one is listed per title below.

Legend: **available** = API returned `available: true` with a confident match; **not available** = provider searched, no confident match; **unknown** = shutdown (not searched), anti-bot block, timeout or HTTP error (reason given in JSON). Sample chapter = first row ascending (often a prologue, number 0); "ch 1 id" = row whose number is 1.

## Summary

| Title | Ref | Used in | Available | Not available | Unknown | Lookup checked at |
|---|---|---|---|---|---|---|
| Solo Leveling | `mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0` | src/test/fixtures/catalog.json items[0]; src/lib/intel/intel.test.ts:20,37 byTitle('Solo Leveling'); catalog[0] in comments.test.ts:12, rewards.store.test.ts:7 | 18 | 40 | 38 | 2026-11-22T13:49:44Z |
| The Eminence in Shadow | `mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a` | e2e/title.spec.ts:5; e2e/app.spec.ts:120; e2e/a11y.spec.ts:39,55; catalog.json | 12 | 46 | 38 | 2026-11-22T13:50:35Z |
| Aiura | `mangadex:814b682b-4405-47f7-b568-19929304df47` | e2e/live-providers.spec.ts:17 (MangaDex + Dynasty Reader live case) | 9 | 49 | 38 | 2026-11-22T13:51:08Z |
| unOrdinary | `mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c` | e2e/live-providers.spec.ts:18,127 (WEBTOON live case) | 17 | 41 | 38 | 2026-11-22T13:51:36Z |
| Solo Leveling: Ragnarok (e2e id) | `mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13` | e2e/live-providers.spec.ts:189 (AsuraScan + Thunderscans live case) | 19 | 39 | 38 | 2026-11-22T13:52:15Z |
| Solo Leveling: Ragnarok (catalog fixture id) | `mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039` | src/test/fixtures/catalog.json | 20 | 38 | 38 | 2026-11-22T13:53:02Z |
| Omniscient Reader's Viewpoint | `mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3` | src/test/fixtures/catalog.json items[1] (candidate for unit tests) | 15 | 43 | 38 | 2026-11-22T13:53:34Z |

## Observations that affect tests

- Solo Leveling on MangaDex: matched, but the live chapter list is empty (`totalChapters` 0). A MangaDex chapter id cannot be used for Solo Leveling. Real non-MangaDex chapters exist (e.g. mangaread id `1` number 1).
- Solo Leveling: Ragnarok is NOT matched on MangaDex for either ref (e2e `c3ea5ce6-…` and catalog fixture `ade0306c-…`); both refs resolve to the same title and identical provider sets otherwise (fixture ref additionally matched novelcool).
- Thunderscans: not available for Solo Leveling: Ragnarok; a direct Thunderscans search for `ragnarok` returned only an unrelated title and `Solo Leveling: Ragnarok` returned 0 results. The live e2e case in `e2e/live-providers.spec.ts:218-234` (expects exactly one Thunderscans Ragnarok result) will fail against the current provider.
- AsuraScan has Solo Leveling: Ragnarok (chapter id `1`, number 1), matching `e2e/live-providers.spec.ts:189-214`.
- Aiura: MangaDex (chapter 1 id `9bfd2b52-2823-4b98-ab69-e54b12fc0724`) and Dynasty Reader (chapter 1 id `aiura_ch01`) both available, matching the live e2e case.
- unOrdinary: WEBTOON available (chapter id `1`, number 1); MangaDex not available.
- The Eminence in Shadow: MangaDex available, chapter 1 id `3c652754-fbf7-4465-be54-f61e50eadc5a`. Suspect matches: swarm matched URL slug `why-abusing-power-to-indulging-in-pleasure-on-the-bed` (8 chapters, starting at 32) and xcomic (14 chapters, starting at 70); recorded as the API reported them.
- Omniscient Reader's Viewpoint: MangaDex available but only 4 chapters listed, starting at 255 (first id `d3c06606-4ee7-4454-a3a7-ffdb9ecf5d26`); no chapter 1 on MangaDex.
- Lookups varied slightly between two runs minutes apart (Solo Leveling: 17 then 18 available; mangakatana appeared in the second run).

## Placeholder data found in tests (dawghwa main)

Chapter ids / title keys that are not real provider data:

- `src/lib/store/store.test.ts:10` chapterId `"ch-1"` (also asserted at :29, :37, :103, :115). Title itself is real (`catalog[0..2]`).
- `src/lib/comments.test.ts:48,50,53,58,60,61,68,69,102,103` chapterId `"ch1"` / `"ch2"`; `:29` titleKey `"x"`; `:82-87` titleKey `"k"`, chapterId `"c"`, ids `"a".."d"`. Title at :12 is real (`catalog[0]`).
- `src/lib/rewards/rewards.store.test.ts:10` chapterId `` `c${n}` ``; `:22`, `:43` `{ id: "c1" }`, `{ id: "c2" }`. Title is real (`catalog[0]`, with overridden meta at :7).
- `src/lib/profile/stats.test.ts:8` chapterId `"c"`, read keys `ch0..chN`; `:10` fake titles `title(key, genres)` with keys like `"a"`.
- `src/lib/profile/recap.test.ts:8-9,22` fake titles `"a"`, `"b"`.
- `src/lib/rewards/progression.test.ts:8-9` fake titles `"a"`, `"b"`, `"c"` (used throughout, e.g. :15-41, :72-73); `:67-69` `makeSet("x", "X", ...)` (set ids, not titles).
- `src/lib/rewards/quests.test.ts:9-10` fake titles `"a"`, `"b"`, `"c"`; `:82` titleKeys from `"abc"[i % 3]`.
- `src/lib/store/bookmarks.test.ts:4` titleKey `"mangadex:abc"`, chapterId `"t/en/ch:1"`, variantId `"mangadex:md-1"` (also :20, :21 `"t/en/ch:1.5"`).
- `src/lib/chapters.test.ts:30-33` canonical keys `"t/en/ch:1"`, `"t/en/ch:1.5"`, `"t/en/ch:1.10"`, `"t/en/prologue"`; variant ids `"md-1"`, `"md-15"`, `"md-110"`, `"ep1"`, groups `"g1"/"G1"`, `"g2"/"G2"`; `:94-98` `"w1"`, `"es-1"`, `"x"`, `"y"`, `"d1"`, sources `"other"`, `"other2"`. (`"aiura_ch01"` at :30 is a real Dynasty Reader chapter id, confirmed live.)
- `src/lib/intel/intel.test.ts:56` `{ key: "x:1", sourceId: "x", title: "No meta" }` (deliberate no-metadata case).
- `src/components/Celebrate.test.ts:15-22` celebrate titles `"a"`, `"b"`, `"c"`, `"hidden"` (UI toast labels).
- `src/lib/autoScroll.test.ts:99,172` `resetKey: "c1"` / `"c2"` (opaque reset keys, not chapter data).

Real data already used: `src/test/fixtures/catalog.json` (1012 MangaDex items, captured 2026-11-17), `vocabulary.json`, `src/test/catalog.ts`, `src/lib/api/catalog.test.ts:60` (Solo Leveling), `src/lib/intel/intel.test.ts:20,37,107` (Solo Leveling; `catalog[300]` = mangadex:f81026af-1b41-465c-932b-291ce4760c00), `src/lib/feed/sections.test.ts`. E2E: `e2e/title.spec.ts:5`, `e2e/app.spec.ts:120`, `e2e/a11y.spec.ts:39,55` (The Eminence in Shadow), `e2e/live-providers.spec.ts:17,18,189` (Aiura, unOrdinary, Solo Leveling: Ragnarok). `e2e/reader.spec.ts:23`, `reader-polish.spec.ts:11-25`, `auto-scroll.spec.ts:32` pick a live MangaDex title/chapter at runtime from `/api/catalog`. `e2e/helpers.ts` has no title data.

## Solo Leveling

Ref `mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0` (API title: Solo Leveling). Used in: src/test/fixtures/catalog.json items[0]; src/lib/intel/intel.test.ts:20,37 byTitle('Solo Leveling'); catalog[0] in comments.test.ts:12, rewards.store.test.ts:7.

Lookup: `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` at 2026-11-22T13:49:44Z.

| Provider | Provider status | Availability | Sample chapter id / number | ch 1 id | Chapters | Checked at | API URL |
|---|---|---|---|---|---|---|---|
| asurascan | active | available | `0` / 0 | `1` | 201 | 2026-11-22T13:50:03Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=asurascan&order=asc` |
| baetoon | active | available | `68ae94ec58dcbe4892ab77ff` / 0 | `68ae94ec58dcbe4892ab7800` | 257 | 2026-11-22T13:50:07Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=baetoon&order=asc` |
| chikari | active | available | `0` / 0 | `1` | 201 | 2026-11-22T13:50:09Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=chikari&order=asc` |
| kayn-scans | active | available | none (no chapters (totalChapters=0)) | - | - | 2026-11-22T13:50:11Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=kayn-scans&order=asc` |
| kuramanga | active | available | `0` / 0 | `1` | 201 | 2026-11-22T13:50:12Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=kuramanga&order=asc` |
| mangadex | active | available | none (no chapters (totalChapters=0)) | - | - | 2026-11-22T13:50:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=mangadex&order=asc` |
| mangago | active | available | `0` / 0 | `1` | 205 | 2026-11-22T13:50:14Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=mangago&order=asc` |
| mangak | active | available | `DVM9kXwY` / 0.1 | `G8nmZ5Z2` | 252 | 2026-11-22T13:50:17Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=mangak&order=asc` |
| mangakatana | active | available | `0` / 0 | `1` | 202 | 2026-11-22T13:50:04Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=mangakatana&order=asc` |
| mangaread | active | available | `1` / 1 | `1` | 200 | 2026-11-22T13:50:18Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=mangaread&order=asc` |
| mangataro | active | available | `9069` / 0 | `9070` | 202 | 2026-11-22T13:50:20Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=mangataro&order=asc` |
| mgeko | active | available | `0` / 0 | `1` | 202 | 2026-11-22T13:50:22Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=mgeko&order=asc` |
| mkissa | active | available | `0` / 0 | `1` | 219 | 2026-11-22T13:50:24Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=mkissa&order=asc` |
| qi-scans | unstable | available | `86156` / 0 | `86157` | 201 | 2026-11-22T13:50:25Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=qi-scans&order=asc` |
| roliascan | active | available | `175029` / 0 | `170257` | 201 | 2026-11-22T13:50:27Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=roliascan&order=asc` |
| swarm | active | available | `01J76XYXYZGGRVGEGATYQWFTD8` / 0 | `01J76XYXYZHAP5EMZ62S0G3WGA` | 258 | 2026-11-22T13:50:30Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=swarm&order=asc` |
| webtoonclub | active | available | `0` / 0 | `1` | 263 | 2026-11-22T13:50:32Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=webtoonclub&order=asc` |
| xcomic | active | available | `7xlq4d` / 0 | `kz3o534` | 218 | 2026-11-22T13:50:33Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/chapters?source=xcomic&order=asc` |
| asmodeus-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| danke-furs-lesen | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| diva-scans | unstable | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| drake-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| dynasty-reader | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| elf-toon | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| eva-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| galaxy-degen-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| genz-toons | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| hachirumi | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| hive-toon | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| kappabeast | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| kenscans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| ks-group | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| lua-comic | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| madarascans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| mangasushi | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| manhuaplus | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| manhuaus | unstable | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| mist-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| novelcool | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| nyx-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| orion-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| rd-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| reimanga | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| rinko-comics | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| ritharscans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| rizz-fables | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| rokari-comics | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| sana-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| siren-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| spider-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| stonescape | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| tcb-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| thunderscans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| valir-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| violetscans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| vortex-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| webtoon | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| writers'-scans | active | not available | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| arven-comics | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| arya-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| athrea-scans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| atsumoe | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| bato | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| comix | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| demonicscans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| falcon-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| firescans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| flamecomics | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| greed-scans | unstable | unknown (UPSTREAM_TIMEOUT) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| hades-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| kaliscan | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| kdt-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| kero-scans | active | unknown (UPSTREAM_HTTP_ERROR) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| lagoonscans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| lhtranslation | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| likemanga | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| luminare-translations | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| magus-manga | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| mangaball | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| mangacloud | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| mangaloom | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| mangapark | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| mangayy | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| philia-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| project-suki | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| rage-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| raven-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| scythe-scans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| temple-scan | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| topmanhua | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| utoon | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| weebcentral | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| weebdex | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| witchscans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| yaksha-comics | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |
| yaksha-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:49:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/sources?stream=1&includeUnavailable=1` |

## The Eminence in Shadow

Ref `mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a` (API title: The Eminence in Shadow). Used in: e2e/title.spec.ts:5; e2e/app.spec.ts:120; e2e/a11y.spec.ts:39,55; catalog.json.

Lookup: `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` at 2026-11-22T13:50:35Z.

| Provider | Provider status | Availability | Sample chapter id / number | ch 1 id | Chapters | Checked at | API URL |
|---|---|---|---|---|---|---|---|
| chikari | active | available | `1` / 1 | `1` | 92 | 2026-11-22T13:50:51Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=chikari&order=asc` |
| mangadex | active | available | `3c652754-fbf7-4465-be54-f61e50eadc5a` / 1 | `3c652754-fbf7-4465-be54-f61e50eadc5a` | 100 | 2026-11-22T13:50:48Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=mangadex&order=asc` |
| mangak | active | available | `DgZMEl4Y` / 0 | `08A4lLW2` | 96 | 2026-11-22T13:50:53Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=mangak&order=asc` |
| mangakatana | active | available | `1` / 1 | `1` | 92 | 2026-11-22T13:50:49Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=mangakatana&order=asc` |
| mangaread | active | available | `1` / 1 | `1` | 94 | 2026-11-22T13:50:55Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=mangaread&order=asc` |
| mangataro | active | available | `47226` / 1 | `47226` | 92 | 2026-11-22T13:50:56Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=mangataro&order=asc` |
| mkissa | active | available | `1` / 1 | `1` | 98 | 2026-11-22T13:50:58Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=mkissa&order=asc` |
| novelcool | active | available | `1` / 1 | `1` | 74 | 2026-11-22T13:50:59Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=novelcool&order=asc` |
| reimanga | active | available | `465153` / 1 | `465153` | 104 | 2026-11-22T13:51:01Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=reimanga&order=asc` |
| roliascan | active | available | `65297` / 1 | `65297` | 95 | 2026-11-22T13:51:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=roliascan&order=asc` |
| swarm | active | available | `qppmck32f` / 32 | - | 8 | 2026-11-22T13:51:04Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=swarm&order=asc` |
| xcomic | active | available | `z34dnn` / 70 | - | 14 | 2026-11-22T13:51:06Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/chapters?source=xcomic&order=asc` |
| asmodeus-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| asurascan | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| baetoon | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| danke-furs-lesen | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| diva-scans | unstable | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| drake-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| dynasty-reader | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| elf-toon | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| eva-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| galaxy-degen-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| genz-toons | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| hachirumi | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| hive-toon | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| kappabeast | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| kayn-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| kenscans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| ks-group | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| kuramanga | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| lua-comic | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| madarascans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| mangago | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| mangasushi | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| manhuaplus | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| manhuaus | unstable | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| mgeko | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| mist-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| nyx-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| orion-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| qi-scans | unstable | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| rd-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| rinko-comics | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| ritharscans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| rizz-fables | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| rokari-comics | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| sana-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| siren-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| spider-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| stonescape | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| tcb-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| thunderscans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| valir-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| violetscans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| vortex-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| webtoon | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| webtoonclub | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| writers'-scans | active | not available | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| arven-comics | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| arya-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| athrea-scans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| atsumoe | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| bato | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| comix | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| demonicscans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| falcon-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| firescans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| flamecomics | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| greed-scans | unstable | unknown (UPSTREAM_TIMEOUT) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| hades-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| kaliscan | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| kdt-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| kero-scans | active | unknown (UPSTREAM_HTTP_ERROR) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| lagoonscans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| lhtranslation | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| likemanga | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| luminare-translations | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| magus-manga | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| mangaball | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| mangacloud | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| mangaloom | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| mangapark | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| mangayy | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| philia-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| project-suki | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| rage-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| raven-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| scythe-scans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| temple-scan | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| topmanhua | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| utoon | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| weebcentral | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| weebdex | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| witchscans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| yaksha-comics | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |
| yaksha-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:50:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:77bee52c-d2d6-44ad-a33a-1734c1fe696a/sources?stream=1&includeUnavailable=1` |

## Aiura

Ref `mangadex:814b682b-4405-47f7-b568-19929304df47` (API title: Aiura). Used in: e2e/live-providers.spec.ts:17 (MangaDex + Dynasty Reader live case).

Lookup: `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` at 2026-11-22T13:51:08Z.

| Provider | Provider status | Availability | Sample chapter id / number | ch 1 id | Chapters | Checked at | API URL |
|---|---|---|---|---|---|---|---|
| dynasty-reader | active | available | `aiura_volume_2_extra` / 0 | `aiura_ch01` | 109 | 2026-11-22T13:51:24Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/chapters?source=dynasty-reader&order=asc` |
| mangadex | active | available | `9bfd2b52-2823-4b98-ab69-e54b12fc0724` / 1 | `9bfd2b52-2823-4b98-ab69-e54b12fc0724` | 110 | 2026-11-22T13:51:20Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/chapters?source=mangadex&order=asc` |
| mangak | active | available | `G8nLX6oD` / 1 | `G8nLX6oD` | 69 | 2026-11-22T13:51:25Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/chapters?source=mangak&order=asc` |
| mangakatana | active | available | `1` / 1 | `1` | 110 | 2026-11-22T13:51:22Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/chapters?source=mangakatana&order=asc` |
| mangataro | active | available | `59379` / 1 | `59379` | 110 | 2026-11-22T13:51:27Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/chapters?source=mangataro&order=asc` |
| mkissa | active | available | `1` / 1 | `1` | 112 | 2026-11-22T13:51:29Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/chapters?source=mkissa&order=asc` |
| reimanga | active | available | `182465` / 1 | `182465` | 110 | 2026-11-22T13:51:30Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/chapters?source=reimanga&order=asc` |
| swarm | active | available | `e38850b395a4f` / 1 | `e38850b395a4f` | 107 | 2026-11-22T13:51:32Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/chapters?source=swarm&order=asc` |
| xcomic | active | available | `opoz6k` / 1 | `opoz6k` | 110 | 2026-11-22T13:51:33Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/chapters?source=xcomic&order=asc` |
| asmodeus-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| asurascan | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| baetoon | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| chikari | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| danke-furs-lesen | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| diva-scans | unstable | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| drake-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| elf-toon | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| eva-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| galaxy-degen-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| genz-toons | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| hachirumi | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| hive-toon | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| kappabeast | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| kayn-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| kenscans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| ks-group | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| kuramanga | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| lua-comic | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| madarascans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| mangago | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| mangaread | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| mangasushi | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| manhuaplus | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| manhuaus | unstable | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| mgeko | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| mist-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| novelcool | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| nyx-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| orion-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| qi-scans | unstable | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| rd-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| rinko-comics | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| ritharscans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| rizz-fables | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| rokari-comics | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| roliascan | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| sana-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| siren-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| spider-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| stonescape | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| tcb-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| thunderscans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| valir-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| violetscans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| vortex-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| webtoon | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| webtoonclub | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| writers'-scans | active | not available | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| arven-comics | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| arya-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| athrea-scans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| atsumoe | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| bato | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| comix | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| demonicscans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| falcon-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| firescans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| flamecomics | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| greed-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| hades-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| kaliscan | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| kdt-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| kero-scans | active | unknown (UPSTREAM_HTTP_ERROR) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| lagoonscans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| lhtranslation | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| likemanga | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| luminare-translations | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| magus-manga | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| mangaball | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| mangacloud | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| mangaloom | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| mangapark | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| mangayy | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| philia-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| project-suki | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| rage-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| raven-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| scythe-scans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| temple-scan | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| topmanhua | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| utoon | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| weebcentral | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| weebdex | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| witchscans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| yaksha-comics | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |
| yaksha-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:814b682b-4405-47f7-b568-19929304df47/sources?stream=1&includeUnavailable=1` |

## unOrdinary

Ref `mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c` (API title: unOrdinary). Used in: e2e/live-providers.spec.ts:18,127 (WEBTOON live case).

Lookup: `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` at 2026-11-22T13:51:36Z.

| Provider | Provider status | Availability | Sample chapter id / number | ch 1 id | Chapters | Checked at | API URL |
|---|---|---|---|---|---|---|---|
| chikari | active | available | `0` / 0 | `1` | 417 | 2026-11-22T13:51:46Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=chikari&order=asc` |
| kuramanga | active | available | `0` / 0 | `1` | 417 | 2026-11-22T13:51:48Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=kuramanga&order=asc` |
| madarascans | active | available | `1` / 1 | `1` | 402 | 2026-11-22T13:51:50Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=madarascans&order=asc` |
| mangak | active | available | `08Az4RXY` / 0 | - | 244 | 2026-11-22T13:51:52Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=mangak&order=asc` |
| mangakatana | active | available | `1` / 1 | `1` | 415 | 2026-11-22T13:51:44Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=mangakatana&order=asc` |
| mangaread | active | available | `1` / 1 | `1` | 414 | 2026-11-22T13:51:53Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=mangaread&order=asc` |
| mangataro | active | available | `347502` / 1 | `347502` | 418 | 2026-11-22T13:51:55Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=mangataro&order=asc` |
| manhuaus | unstable | available | `1` / 1 | `1` | 417 | 2026-11-22T13:51:57Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=manhuaus&order=asc` |
| mgeko | active | available | `1` / 1 | `1` | 413 | 2026-11-22T13:51:58Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=mgeko&order=asc` |
| mkissa | active | available | `0` / 0 | `1` | 431 | 2026-11-22T13:52:00Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=mkissa&order=asc` |
| novelcool | active | available | `0.2` / 0.2 | `1` | 360 | 2026-11-22T13:52:01Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=novelcool&order=asc` |
| reimanga | active | available | `471992` / 1 | `471992` | 466 | 2026-11-22T13:52:03Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=reimanga&order=asc` |
| roliascan | active | available | `297327` / 0 | `76901` | 414 | 2026-11-22T13:52:05Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=roliascan&order=asc` |
| swarm | active | available | `01J76XZ1CJQ57G1S0GSTRJTHJ6` / 0 | `0cd2d247822e09aa664ffc3571a7550d` | 464 | 2026-11-22T13:52:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=swarm&order=asc` |
| webtoon | active | available | `1` / 1 | `1` | 414 | 2026-11-22T13:51:42Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=webtoon&order=asc` |
| webtoonclub | active | available | `0` / 0 | `1` | 468 | 2026-11-22T13:52:10Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=webtoonclub&order=asc` |
| xcomic | active | available | `wr7gepd` / 0 | `ezrp34m` | 425 | 2026-11-22T13:52:12Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/chapters?source=xcomic&order=asc` |
| asmodeus-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| asurascan | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| baetoon | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| danke-furs-lesen | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| diva-scans | unstable | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| drake-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| dynasty-reader | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| elf-toon | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| eva-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| galaxy-degen-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| genz-toons | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| hachirumi | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| hive-toon | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| kappabeast | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| kayn-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| kenscans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| ks-group | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| lua-comic | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| mangadex | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| mangago | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| mangasushi | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| manhuaplus | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| mist-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| nyx-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| orion-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| qi-scans | unstable | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| rd-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| rinko-comics | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| ritharscans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| rizz-fables | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| rokari-comics | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| sana-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| siren-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| spider-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| stonescape | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| tcb-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| thunderscans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| valir-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| violetscans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| vortex-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| writers'-scans | active | not available | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| arven-comics | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| arya-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| athrea-scans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| atsumoe | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| bato | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| comix | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| demonicscans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| falcon-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| firescans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| flamecomics | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| greed-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| hades-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| kaliscan | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| kdt-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| kero-scans | active | unknown (UPSTREAM_HTTP_ERROR) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| lagoonscans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| lhtranslation | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| likemanga | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| luminare-translations | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| magus-manga | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| mangaball | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| mangacloud | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| mangaloom | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| mangapark | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| mangayy | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| philia-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| project-suki | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| rage-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| raven-scans | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| scythe-scans | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| temple-scan | unstable | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| topmanhua | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| utoon | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| weebcentral | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| weebdex | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| witchscans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| yaksha-comics | active | unknown (UPSTREAM_BLOCKED) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |
| yaksha-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:51:36Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:de34e04a-a9a4-4d9b-b434-f13ad275230c/sources?stream=1&includeUnavailable=1` |

## Solo Leveling: Ragnarok (e2e id)

Ref `mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13` (API title: Solo Leveling: Ragnarok). Used in: e2e/live-providers.spec.ts:189 (AsuraScan + Thunderscans live case).

Lookup: `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` at 2026-11-22T13:52:15Z.

| Provider | Provider status | Availability | Sample chapter id / number | ch 1 id | Chapters | Checked at | API URL |
|---|---|---|---|---|---|---|---|
| asurascan | active | available | `1` / 1 | `1` | 73 | 2026-11-22T13:52:29Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=asurascan&order=asc` |
| baetoon | active | available | `6893809004512a4fab6dac1a` / 0 | `6893809004512a4fab6dac1b` | 79 | 2026-11-22T13:52:30Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=baetoon&order=asc` |
| chikari | active | available | `1` / 1 | `1` | 73 | 2026-11-22T13:52:32Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=chikari&order=asc` |
| kayn-scans | active | available | none (no chapters (totalChapters=0)) | - | - | 2026-11-22T13:52:33Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=kayn-scans&order=asc` |
| kuramanga | active | available | `1` / 1 | `1` | 73 | 2026-11-22T13:52:35Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=kuramanga&order=asc` |
| mangago | active | available | `0` / 0 | `1` | 74 | 2026-11-22T13:52:37Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=mangago&order=asc` |
| mangak | active | available | `G8n07anD` / 0 | `524O7MwD` | 78 | 2026-11-22T13:52:38Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=mangak&order=asc` |
| mangaread | active | available | `0` / 0 | `1` | 75 | 2026-11-22T13:52:40Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=mangaread&order=asc` |
| mangataro | active | available | `5079` / 0 | `14283` | 89 | 2026-11-22T13:52:41Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=mangataro&order=asc` |
| manhuaplus | active | available | `0` / 0 | `1` | 75 | 2026-11-22T13:52:43Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=manhuaplus&order=asc` |
| manhuaus | unstable | available | `0` / 0 | `1` | 95 | 2026-11-22T13:52:45Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=manhuaus&order=asc` |
| mgeko | active | available | `0` / 0 | `1` | 74 | 2026-11-22T13:52:47Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=mgeko&order=asc` |
| mkissa | active | available | `0` / 0 | `1` | 75 | 2026-11-22T13:52:48Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=mkissa&order=asc` |
| qi-scans | unstable | available | `81361` / 1 | `81361` | 73 | 2026-11-22T13:52:50Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=qi-scans&order=asc` |
| reimanga | active | available | `2453241` / 0 | `2453242` | 73 | 2026-11-22T13:52:51Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=reimanga&order=asc` |
| roliascan | active | available | `56226` / 0 | `56227` | 73 | 2026-11-22T13:52:53Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=roliascan&order=asc` |
| swarm | active | available | `109b3a2e1129757e4c3931f52be53c48` / 0 | `01J76XZ95YB6PJX8JWSV9YANEZ` | 85 | 2026-11-22T13:52:55Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=swarm&order=asc` |
| webtoonclub | active | available | `0` / 0 | `1` | 78 | 2026-11-22T13:52:57Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=webtoonclub&order=asc` |
| xcomic | active | available | `7ae5zak` / 0 | `m6dkpj` | 74 | 2026-11-22T13:52:59Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/chapters?source=xcomic&order=asc` |
| asmodeus-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| danke-furs-lesen | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| diva-scans | unstable | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| drake-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| dynasty-reader | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| elf-toon | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| eva-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| galaxy-degen-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| genz-toons | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| hachirumi | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| hive-toon | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| kappabeast | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| kenscans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| ks-group | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| lua-comic | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| madarascans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| mangadex | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| mangakatana | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| mangasushi | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| mist-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| novelcool | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| nyx-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| orion-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| rd-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| rinko-comics | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| ritharscans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| rizz-fables | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| rokari-comics | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| sana-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| siren-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| spider-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| stonescape | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| tcb-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| thunderscans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| valir-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| violetscans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| vortex-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| webtoon | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| writers'-scans | active | not available | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| arven-comics | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| arya-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| athrea-scans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| atsumoe | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| bato | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| comix | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| demonicscans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| falcon-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| firescans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| flamecomics | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| greed-scans | unstable | unknown (UPSTREAM_TIMEOUT) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| hades-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| kaliscan | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| kdt-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| kero-scans | active | unknown (UPSTREAM_HTTP_ERROR) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| lagoonscans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| lhtranslation | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| likemanga | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| luminare-translations | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| magus-manga | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| mangaball | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| mangacloud | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| mangaloom | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| mangapark | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| mangayy | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| philia-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| project-suki | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| rage-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| raven-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| scythe-scans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| temple-scan | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| topmanhua | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| utoon | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| weebcentral | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| weebdex | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| witchscans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| yaksha-comics | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |
| yaksha-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:52:15Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:c3ea5ce6-f659-4fe9-95b6-520cec9fcb13/sources?stream=1&includeUnavailable=1` |

## Solo Leveling: Ragnarok (catalog fixture id)

Ref `mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039` (API title: Solo Leveling: Ragnarok). Used in: src/test/fixtures/catalog.json.

Lookup: `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` at 2026-11-22T13:53:02Z.

| Provider | Provider status | Availability | Sample chapter id / number | ch 1 id | Chapters | Checked at | API URL |
|---|---|---|---|---|---|---|---|
| asurascan | active | available | `1` / 1 | `1` | 73 | 2026-11-22T13:53:08Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=asurascan&order=asc` |
| baetoon | active | available | `6893809004512a4fab6dac1a` / 0 | `6893809004512a4fab6dac1b` | 79 | 2026-11-22T13:53:10Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=baetoon&order=asc` |
| chikari | active | available | `1` / 1 | `1` | 73 | 2026-11-22T13:53:11Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=chikari&order=asc` |
| kayn-scans | active | available | none (no chapters (totalChapters=0)) | - | - | 2026-11-22T13:53:12Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=kayn-scans&order=asc` |
| kuramanga | active | available | `1` / 1 | `1` | 73 | 2026-11-22T13:53:13Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=kuramanga&order=asc` |
| mangago | active | available | `0` / 0 | `1` | 74 | 2026-11-22T13:53:14Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=mangago&order=asc` |
| mangak | active | available | `G8n07anD` / 0 | `524O7MwD` | 78 | 2026-11-22T13:53:16Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=mangak&order=asc` |
| mangaread | active | available | `0` / 0 | `1` | 75 | 2026-11-22T13:53:17Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=mangaread&order=asc` |
| mangataro | active | available | `5079` / 0 | `14283` | 89 | 2026-11-22T13:53:18Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=mangataro&order=asc` |
| manhuaplus | active | available | `0` / 0 | `1` | 75 | 2026-11-22T13:53:19Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=manhuaplus&order=asc` |
| manhuaus | unstable | available | `0` / 0 | `1` | 95 | 2026-11-22T13:53:20Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=manhuaus&order=asc` |
| mgeko | active | available | `0` / 0 | `1` | 74 | 2026-11-22T13:53:22Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=mgeko&order=asc` |
| mkissa | active | available | `0` / 0 | `1` | 75 | 2026-11-22T13:53:23Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=mkissa&order=asc` |
| novelcool | active | available | `1` / 1 | `1` | 48 | 2026-11-22T13:53:24Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=novelcool&order=asc` |
| qi-scans | unstable | available | `81361` / 1 | `81361` | 73 | 2026-11-22T13:53:26Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=qi-scans&order=asc` |
| reimanga | active | available | `2453241` / 0 | `2453242` | 73 | 2026-11-22T13:53:27Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=reimanga&order=asc` |
| roliascan | active | available | `56226` / 0 | `56227` | 73 | 2026-11-22T13:53:28Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=roliascan&order=asc` |
| swarm | active | available | `109b3a2e1129757e4c3931f52be53c48` / 0 | `01J76XZ95YB6PJX8JWSV9YANEZ` | 85 | 2026-11-22T13:53:29Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=swarm&order=asc` |
| webtoonclub | active | available | `0` / 0 | `1` | 78 | 2026-11-22T13:53:31Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=webtoonclub&order=asc` |
| xcomic | active | available | `7ae5zak` / 0 | `m6dkpj` | 74 | 2026-11-22T13:53:32Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/chapters?source=xcomic&order=asc` |
| asmodeus-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| danke-furs-lesen | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| diva-scans | unstable | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| drake-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| dynasty-reader | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| elf-toon | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| eva-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| galaxy-degen-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| genz-toons | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| hachirumi | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| hive-toon | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| kappabeast | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| kenscans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| ks-group | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| lua-comic | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| madarascans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| mangadex | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| mangakatana | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| mangasushi | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| mist-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| nyx-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| orion-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| rd-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| rinko-comics | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| ritharscans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| rizz-fables | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| rokari-comics | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| sana-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| siren-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| spider-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| stonescape | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| tcb-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| thunderscans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| valir-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| violetscans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| vortex-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| webtoon | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| writers'-scans | active | not available | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| arven-comics | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| arya-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| athrea-scans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| atsumoe | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| bato | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| comix | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| demonicscans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| falcon-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| firescans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| flamecomics | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| greed-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| hades-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| kaliscan | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| kdt-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| kero-scans | active | unknown (UPSTREAM_HTTP_ERROR) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| lagoonscans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| lhtranslation | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| likemanga | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| luminare-translations | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| magus-manga | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| mangaball | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| mangacloud | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| mangaloom | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| mangapark | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| mangayy | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| philia-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| project-suki | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| rage-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| raven-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| scythe-scans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| temple-scan | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| topmanhua | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| utoon | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| weebcentral | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| weebdex | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| witchscans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| yaksha-comics | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |
| yaksha-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:ade0306c-f4b6-4890-9edb-1ddf04df2039/sources?stream=1&includeUnavailable=1` |

## Omniscient Reader's Viewpoint

Ref `mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3` (API title: Omniscient Reader's Viewpoint). Used in: src/test/fixtures/catalog.json items[1] (candidate for unit tests).

Lookup: `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` at 2026-11-22T13:53:34Z.

| Provider | Provider status | Availability | Sample chapter id / number | ch 1 id | Chapters | Checked at | API URL |
|---|---|---|---|---|---|---|---|
| asurascan | active | available | `0` / 0 | `1` | 312 | 2026-11-22T13:53:42Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=asurascan&order=asc` |
| baetoon | active | available | `689b779803dcb2f5023b1d1c` / 0 | `689b779803dcb2f5023b1d1d` | 417 | 2026-11-22T13:53:43Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=baetoon&order=asc` |
| kuramanga | active | available | `0` / 0 | `1` | 312 | 2026-11-22T13:53:45Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=kuramanga&order=asc` |
| mangadex | active | available | `d3c06606-4ee7-4454-a3a7-ffdb9ecf5d26` / 255 | - | 4 | 2026-11-22T13:53:40Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=mangadex&order=asc` |
| mangago | active | available | `0` / 0 | `1` | 2 | 2026-11-22T13:53:46Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=mangago&order=asc` |
| mangak | active | available | `W2W3E632` / 0 | `MDowZ3XD` | 307 | 2026-11-22T13:53:48Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=mangak&order=asc` |
| manhuaplus | active | available | `0` / 0 | `1` | 313 | 2026-11-22T13:53:50Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=manhuaplus&order=asc` |
| mkissa | active | available | `0` / 0 | `1` | 315 | 2026-11-22T13:53:51Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=mkissa&order=asc` |
| novelcool | active | available | `0` / 0 | `1` | 241 | 2026-11-22T13:53:53Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=novelcool&order=asc` |
| qi-scans | unstable | available | `83047` / 0 | `83049` | 312 | 2026-11-22T13:53:55Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=qi-scans&order=asc` |
| reimanga | active | available | `951915` / 0 | `952557` | 315 | 2026-11-22T13:53:57Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=reimanga&order=asc` |
| swarm | active | available | `01J76XZ10EQRRQ2A5VXZF9RA7V` / 0 | `a1655ff9c37ba5eb17fa84fd077765b2` | 532 | 2026-11-22T13:53:58Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=swarm&order=asc` |
| vortex-scans | active | available | `0` / 0 | `1` | 310 | 2026-11-22T13:54:00Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=vortex-scans&order=asc` |
| webtoonclub | active | available | `0` / 0 | `1` | 324 | 2026-11-22T13:54:02Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=webtoonclub&order=asc` |
| xcomic | active | available | `azgylwz` / 2 | - | 151 | 2026-11-22T13:54:04Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/chapters?source=xcomic&order=asc` |
| asmodeus-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| chikari | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| danke-furs-lesen | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| diva-scans | unstable | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| drake-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| dynasty-reader | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| elf-toon | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| eva-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| galaxy-degen-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| genz-toons | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| hachirumi | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| hive-toon | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| kappabeast | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| kayn-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| kenscans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| ks-group | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| lua-comic | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| madarascans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| mangakatana | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| mangaread | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| mangasushi | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| mangataro | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| manhuaus | unstable | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| mgeko | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| mist-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| nyx-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| orion-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| rd-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| rinko-comics | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| ritharscans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| rizz-fables | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| rokari-comics | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| roliascan | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| sana-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| siren-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| spider-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| stonescape | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| tcb-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| thunderscans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| valir-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| violetscans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| webtoon | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| writers'-scans | active | not available | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| arven-comics | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| arya-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| athrea-scans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| atsumoe | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| bato | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| comix | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| demonicscans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| falcon-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| firescans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| flamecomics | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| greed-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| hades-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| kaliscan | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| kdt-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| kero-scans | active | unknown (UPSTREAM_HTTP_ERROR) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| lagoonscans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| lhtranslation | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| likemanga | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| luminare-translations | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| magus-manga | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| mangaball | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| mangacloud | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| mangaloom | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| mangapark | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| mangayy | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| philia-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| project-suki | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| rage-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| raven-scans | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| scythe-scans | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| temple-scan | unstable | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| topmanhua | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| utoon | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| weebcentral | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| weebdex | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| witchscans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| yaksha-comics | active | unknown (SOURCE_CIRCUIT_OPEN) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
| yaksha-scans | shutdown | unknown (not searched) | - | - | - | 2026-11-22T13:53:34Z | `https://dawghwaapi.vercel.app/api/titles/mangadex:9a414441-bbad-43f1-a3a7-dc262ca790a3/sources?stream=1&includeUnavailable=1` |
