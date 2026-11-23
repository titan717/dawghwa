# Competitor study: reader, quiz, share, offline, comments, gamification

Owner: LENS. Cycle 0 (run of 23 Nov 2026). Docs only.

This note extends [LENS_BACKLOG.md](../LENS_BACKLOG.md), which covered discovery, library, search, history and streak patterns (B1 to B31). It does not repeat those. Two things changed since that backlog: offline chapters and comments are now in scope (Specs G and J in the master prompt, behind `FEATURE_OFFLINE` and `FEATURE_COMMENTS`), so the "deferred" rows in the backlog's out-of-scope table for offline and public comments are superseded by this note.

## Method and rules

- Public pages only: help centres, FAQs, app store listings, official docs, public repos and changelogs, and a few press or news pages. No accounts, no logins, no app installs, no automated collection. Pages were read at human pace.
- Everything is summarised in our own words. Nothing here copies text, markup, code, assets, colours or branding, and builders must not copy any of it either. Product names appear here only because this is internal research; none of them belong in shipped UI.
- Access date: every link below was read on 23 Nov 2026 unless marked "(22 Nov)", which means it was read for LENS_BACKLOG.md the day before and re-used.
- "Third-party" means a news, blog or review page rather than the product itself. "Unverified" means the page suggests it but does not confirm it, or we found no public page saying either way. Absence on a help page is not proof of absence in the app, so "none found" is always unverified.

## Sources (with access dates)

| Product | Pages read |
| --- | --- |
| WEBTOON | [Help Centre home](https://help.line.me/LINE_WEBTOON/web?lang=en) (23 Nov), [Help Centre "How to use"](https://help.line.me/LINE_WEBTOON/web/categoryId/20006011/3/pc?lang=en) (23 Nov), [Help Centre iOS (account, comments, reporting)](https://help.line.me/LINE_WEBTOON/ios/pc?lang=en) (23 Nov), [Community policy notice](https://www.webtoons.com/en/notice/detail?noticeNo=2534) (23 Nov), [Community policy in Terms](https://www.webtoons.com/en/terms/canvasPolicy) (23 Nov), [Creator profile help](https://webtooncanvas.zendesk.com/hc/en-us/articles/43607743553812-Setting-up-or-Editing-Your-Creator-Profile) (23 Nov), [May 2025 discovery press release](https://about.webtoon.com/press-release/183) (23 Nov), [Super Like press release](https://about.webtoon.com/press-release/118) (23 Nov), [Genres page](https://www.webtoons.com/en/genres/) (23 Nov) |
| MANGA Plus | [Official FAQ](https://mangaplus.shueisha.co.jp/faq/eng/) (23 Nov), [App Store listing](https://apps.apple.com/us/app/manga-plus-by-shueisha/id1442476536) (23 Nov), [Google Play listing](https://play.google.com/store/apps/details?hl=en_IN&id=jp.co.shueisha.mangaplus) (23 Nov) |
| Tapas | [Read offline](https://help.tapas.io/hc/en-us/articles/115000415034-Read-offline) (23 Nov), [Fortune Cookie](https://help.tapas.io/hc/en-us/articles/360052046934-What-is-Tapas-Fortune-Cookie) (23 Nov), [Sharing on social media](https://help.tapas.io/hc/en-us/articles/360018019374-Sharing-on-Social-Media) (23 Nov), [Publishing a comic episode (comments toggle, share thumbnail)](https://help.tapas.io/hc/en-us/articles/1260802028970-Series-Basics-How-to-publish-a-comic-episode-on-Tapas) (23 Nov), [Creator share thumbnail](https://www.creators.tapas.io/creating-a-comic-episode) (23 Nov), [What Tapas provides for creators](https://help.tapas.io/hc/en-us/articles/360007604294-What-does-Tapas-provide-for-creators) (23 Nov), [Google Play listing](https://play.google.com/store/apps/details?id=com.tapastic&hl=en_US) (23 Nov), [Screensdesign UI breakdown](https://screensdesign.com/showcase/tapas-comics-and-novels) (23 Nov, third-party) |
| Mihon | [Reader settings](https://mihon.app/docs/guides/reader-settings) (23 Nov), [Downloads FAQ](https://mihon.app/docs/faq/downloads) (23 Nov), [Download page with release notes](https://mihon.app/download/) (23 Nov), [Library FAQ](https://mihon.app/docs/faq/library) (22 Nov), [Onboarding screen source](https://github.com/mihonapp/mihon/blob/446f6df8/app/src/main/java/eu/kanade/presentation/more/onboarding/OnboardingScreen.kt) (23 Nov, read for structure only), [Stats view model](https://github.com/mihonapp/mihon/blob/0c888b01/app/src/main/java/eu/kanade/tachiyomi/ui/stats/StatsViewModel.kt) (23 Nov, structure only) |
| Suwayomi | [WebUI README](https://github.com/Suwayomi/Suwayomi-WebUI) (23 Nov), [WebUI releases (new reader, tap zones)](https://github.com/Suwayomi/Suwayomi-WebUI/releases?page=2) (23 Nov), [WebUI changelog v20250801.01](https://github.com/Suwayomi/Suwayomi-WebUI/blob/v20250801.01/CHANGELOG.md) (23 Nov), [Server configuration wiki](https://github.com/Suwayomi/Suwayomi-Server/wiki/Configuring-Suwayomi%E2%80%90Server) (23 Nov) |
| Manta | [Download feature](https://help.manta.net/hc/en-us/articles/16439680835095-What-is-the-Download-feature-and-how-do-I-use-it) (23 Nov), [Volume viewer](https://help.manta.net/hc/en-us/articles/21030678011671-How-to-optimize-the-volume-viewer) (23 Nov), [Getting the most out of Manta](https://help.manta.net/hc/en-us/articles/9210317471511-How-to-Enjoy-Manta-to-Its-Fullest-101) (23 Nov), [Free Pass notice](https://help.manta.net/hc/en-us/articles/33035370502295--Notice-Free-Pass-Is-Back-on-Manta-starting-July-1-2025) (23 Nov), [Creator apply page](https://manta.net/en/creator/apply) (23 Nov), [Mega Sale campaign](https://manta.net/en/campaign/manta-mega-sale?id=879) (23 Nov), [App Store listing](https://apps.apple.com/gb/app/manta-manga-manhwa-novels/id1536116642) (23 Nov) |
| Comick | [CBR report on the shutdown](https://www.cbr.com/manga-piracy-comick-shutdown/) (22 Nov, third-party) |
| Extra: Lezhin (comments only) | [Anime News Network on Lezhin's comment section](https://www.animenewsnetwork.com/news/2025-11-28/lezhin-us-webtoon-platform-adds-comment-section/.231312) (23 Nov, third-party) |

### Comick

comick.io went offline in Sep 2025 and was reported as an unlicensed site ([CBR](https://www.cbr.com/manga-piracy-comick-shutdown/), third-party). There is no live, legitimate product to study, so every Comick cell below is "n/a". We do not study or imitate unlicensed sites. Suwayomi and Mihon stand in as the dense, power-user references.

## Findings per area

### (a) Reader modes and tap zones (for QUILL)

- Mihon offers five reading modes (paged right-to-left, paged left-to-right, paged vertical, long strip, long strip with gaps), a default mode plus a per-series override reached from the reader's settings ([Mihon reader settings](https://mihon.app/docs/guides/reader-settings)).
- Mihon's tap zones come as named presets (default, L-shaped, Kindle-like, edge, right-and-left, disabled), and can be inverted horizontally, vertically or both. Two small touches stand out: an optional overlay that briefly shows the active tap zones when the reader opens, and a brief label naming the current reading mode on open ([Mihon reader settings](https://mihon.app/docs/guides/reader-settings)).
- Mihon's comfort options include background colour (black, grey, white, automatic), keep screen on, content under the camera cutout, page number, a flash for e-ink screens, volume-key paging, side padding in long strip, sensitivity for hiding the menu on scroll, and an always-shown chapter transition page ([Mihon reader settings](https://mihon.app/docs/guides/reader-settings)).
- Suwayomi's web reader has single and double page, continuous vertical and horizontal, and a webtoon mode; tap zone presets of the same family; default settings per reading mode; settings per title; settings per device (phone, tablet and desktop can differ); auto scroll; and infinite chapter scrolling ([Suwayomi WebUI README](https://github.com/Suwayomi/Suwayomi-WebUI), [WebUI releases](https://github.com/Suwayomi/Suwayomi-WebUI/releases?page=2)). Its changelog also keeps the transition page open when you tap past the first or last page of a chapter, instead of jumping straight away ([changelog](https://github.com/Suwayomi/Suwayomi-WebUI/blob/v20250801.01/CHANGELOG.md)).
- MANGA Plus has one global reading-direction switch (horizontal leftward or vertical downward); some titles can't be read horizontally ([MANGA Plus FAQ](https://mangaplus.shueisha.co.jp/faq/eng/)). A Play Store review mentions tapping the screen edge to turn pages and accidental edge taps on curved phones ([Google Play](https://play.google.com/store/apps/details?hl=en_IN&id=jp.co.shueisha.mangaplus), third-party user review).
- WEBTOON's viewer is a vertical scroll where tapping any panel brings up the top menu ([WEBTOON Help Centre](https://help.line.me/LINE_WEBTOON/web/categoryId/20006011/3/pc?lang=en)). No public page lists other modes or tap zones (unverified).
- Manta's novel "volume viewer" offers page or scroll mode, two font families, twelve text sizes, six line heights, three themes (dark, light, night), a bottom progress bar, previous and next buttons, a table of contents and automatic resume at the last page ([Manta volume viewer](https://help.manta.net/hc/en-us/articles/21030678011671-How-to-optimize-the-volume-viewer)). The comic viewer's options are not documented publicly (unverified).
- Tapas: no public page on reader settings found (unverified).

Takeaway: power readers expect named tap-zone presets, a one-time visual hint of where the zones are, per-title memory and per-device defaults. Licensed apps keep the reader simple (one direction switch, tap to show menu). Dawghwa's Spec E sits between: presets for casual readers, the full panel one level down.

### (b) Onboarding taste quizzes (for HEARTH and ORACLE)

- WEBTOON's May 2025 onboarding asks new readers to pick favourite genres and themes, and those picks feed the personal recommendations on Home along with reading history and preferred art styles ([WEBTOON press release](https://about.webtoon.com/press-release/183)). Its public genre list has about 18 genres ([WEBTOON genres](https://www.webtoons.com/en/genres/)).
- Mihon's first-run flow is a setup wizard (storage, permissions, guides), not a taste step (inferred from the [onboarding screen source](https://github.com/mihonapp/mihon/blob/446f6df8/app/src/main/java/eu/kanade/presentation/more/onboarding/OnboardingScreen.kt), structure only).
- A third-party UI breakdown lists zero onboarding steps for Tapas ([Screensdesign](https://screensdesign.com/showcase/tapas-comics-and-novels), third-party).
- MANGA Plus has no accounts at all ("no member registration", so data can't move to a new phone) ([MANGA Plus FAQ](https://mangaplus.shueisha.co.jp/faq/eng/)); no taste step found (unverified).
- Manta, Suwayomi: no taste step found (unverified).

Takeaway: none of the seven uses swipe cards. The market norm is "pick genres and themes once". A swipe-card quiz is a real point of difference for Dawghwa, but there is no outside evidence that it beats genre tiles, so we have to measure it ourselves (see "Quiz swipes-to-quality" in [METRICS.md](../METRICS.md)). Keep the genre-tile fallback from Spec D, keep the quiz skippable, and keep the count short (10 to 15).

### (c) Share UX (for PULSE)

- WEBTOON separates two share points: a share icon on the series' episode list for the whole series, and a share action in the reader's top menu (tap a panel to show it) for a single episode; desktop shows social buttons in the same two places ([WEBTOON Help Centre](https://help.line.me/LINE_WEBTOON/web/categoryId/20006011/3/pc?lang=en)).
- Tapas offers share options under each episode next to the comments, and a quick share prompt to creators right after they publish ([Tapas sharing](https://help.tapas.io/hc/en-us/articles/360018019374-Sharing-on-Social-Media)). Creators can choose a "share thumbnail" crop for each episode, which becomes the preview image when the link is posted on social sites ([Tapas creator guide](https://www.creators.tapas.io/creating-a-comic-episode)).
- Mihon's long-press on a page offers share, copy, save and set-as-cover ([Mihon reader settings](https://mihon.app/docs/guides/reader-settings)). Sharing raw pages conflicts with Dawghwa's rules (downloaded files stay in the app, no source details), so this is an anti-pattern for us.
- MANGA Plus, Manta, Suwayomi: no public page on sharing found (unverified).

Takeaway: two entry points (title page and reader menu), a good link preview image, and nothing else. No one documents share cards for achievements; Dawghwa's badge, streak and taste cards are new ground, so keep them opt-in and editable as Spec I says.

### (d) Offline download UX (for PULSE, QUILL playback, COMPASS filter)

- Manta's flow is the clearest: a download icon on the series page opens a multi-select of episodes, one Download button at the bottom starts them, a bottom progress bar shows the batch, and you can cancel one episode or the whole batch (both with a confirm). Downloads live in a Downloads tab under My Series with an Edit mode for deleting. When the app opens offline it offers a "go to downloads" shortcut. Settings hold Wi-Fi only, storage used and delete all. Downloads expire after 30 days and can be fetched again ([Manta download help](https://help.manta.net/hc/en-us/articles/16439680835095-What-is-the-Download-feature-and-how-do-I-use-it)).
- Tapas uses a per-episode download button whose icon becomes a check when done, warns before downloading on mobile data (the warning can be turned off), lists downloads under Library, deletes them automatically after 30 days, and lets you delete one or all. Only unlocked or free episodes can be downloaded, and the help page says downloads are for reading inside the app only ([Tapas read offline](https://help.tapas.io/hc/en-us/articles/115000415034-Read-offline)).
- WEBTOON lets you pick episodes from a download button on the episode list or from an episode's menu; downloads are kept 30 days, each episode can be downloaded once per account for copyright reasons, and they are managed under My Series, Downloads ([WEBTOON Help Centre](https://help.line.me/LINE_WEBTOON/web/categoryId/20006011/3/pc?lang=en)).
- Mihon has a download queue you can reorder by drag and cancel; it downloads one chapter at a time per source on purpose, to avoid overloading sites; and it has "delete after reading" with category exclusions ([Mihon downloads FAQ](https://mihon.app/docs/faq/downloads), [release notes](https://mihon.app/download/)).
- Suwayomi can auto-download the next chapters while reading and auto-delete chapters after reading ([WebUI README](https://github.com/Suwayomi/Suwayomi-WebUI)); its server can auto-download new chapters with a limit and skip titles that still have unread chapters ([server config](https://github.com/Suwayomi/Suwayomi-Server/wiki/Configuring-Suwayomi%E2%80%90Server)).
- MANGA Plus: no download feature documented (unverified).

Takeaway: three licensed apps converge on the same shape: select, one button, visible progress, a Downloads list in the library, Wi-Fi-only, delete one or all, expiry around 30 days. Dawghwa's `expiresAt` in the chapter contract maps directly to expiry. Mihon's one-at-a-time rule is a good default for being polite to the backend.

### (e) Comments and profiles (for NOVA)

- MANGA Plus: comments are per chapter and app-only; each reader can post at most twice per chapter per day; comments can be liked and show a like count; reporting is a swipe (iOS) or long press (Android), and reports go to a moderator who decides; a username and a comment icon are set under "Edit profile" without any account registration ([MANGA Plus FAQ](https://mangaplus.shueisha.co.jp/faq/eng/)).
- WEBTOON: each comment has a Report action under it; a reader's own comment history lives under the MY tab and can be deleted there; comments are not deleted automatically when the account is deleted, so readers are told to delete them first ([WEBTOON Help Centre iOS](https://help.line.me/LINE_WEBTOON/ios/pc?lang=en)). Creators on the open platform can turn comments off, delete comments and block users ([WEBTOON community policy notice](https://www.webtoons.com/en/notice/detail?noticeNo=2534)); one code of conduct covers profile posts and episode comments ([WEBTOON terms](https://www.webtoons.com/en/terms/canvasPolicy)). Public profile pages exist for creators, opened automatically once they publish, with a picture and info fields ([creator profile help](https://webtooncanvas.zendesk.com/hc/en-us/articles/43607743553812-Setting-up-or-Editing-Your-Creator-Profile)).
- Tapas: episodes are open to comments by default and creators can switch them off or delete single comments; creators get walls and forums ([Tapas publishing guide](https://help.tapas.io/hc/en-us/articles/1260802028970-Series-Basics-How-to-publish-a-comic-episode-on-Tapas), [creator features](https://help.tapas.io/hc/en-us/articles/360007604294-What-does-Tapas-provide-for-creators)).
- Manta: its reader help points fans to its social accounts for discussion ([Manta tips](https://help.manta.net/hc/en-us/articles/9210317471511-How-to-Enjoy-Manta-to-Its-Fullest-101)), while its creator page advertises reader comments ([Manta creator page](https://manta.net/en/creator/apply)). Whether reader comments exist in the app today is unverified.
- Extra, Lezhin: added replies, spoiler marking and "page stamps" that tie a comment to a page number ([Anime News Network](https://www.animenewsnetwork.com/news/2025-11-28/lezhin-us-webtoon-platform-adds-comment-section/.231312), third-party).
- Mihon, Suwayomi: no comments or public profiles; Mihon links out to external trackers instead ([Mihon Library FAQ](https://mihon.app/docs/faq/library)).

Takeaway: the safe minimum is per-chapter comments with likes, sort by top or new, report, delete your own, a list of "my comments", and a hard posting limit. Spoiler marks and page stamps are the nice extra. Profiles for readers are thin everywhere (name plus icon); rich public profiles are mostly for creators. That supports Spec J's "reading activity hidden by default".

### (f) Gamification (for SPARK)

- Every licensed app here builds its "come back" loop on money or timers: WEBTOON's Daily Pass (one free episode per day per series, unlocked for 14 days) and Fast Pass coins ([WEBTOON Help Centre](https://help.line.me/LINE_WEBTOON/web?lang=en)) and paid Super Likes ([press release](https://about.webtoon.com/press-release/118)); Tapas' Wait-Until-Free timers and Ink ([Google Play](https://play.google.com/store/apps/details?id=com.tapastic&hl=en_US)); Manta's Free Pass of one free episode per day per title ([Manta notice](https://help.manta.net/hc/en-us/articles/33035370502295--Notice-Free-Pass-Is-Back-on-Manta-starting-July-1-2025)) and tiered gem-back sales ([Manta campaign](https://manta.net/en/campaign/manta-mega-sale?id=879)); MANGA Plus's read-once-free chapters ([App Store](https://apps.apple.com/us/app/manga-plus-by-shueisha/id1442476536)).
- Tapas' Fortune Cookie is a weekly random amount of bonus currency, opened on Monday in the reader's own time zone, valid for 24 hours, and the bonus expires after six days; the page also nudges you to turn on push ([Tapas Fortune Cookie](https://help.tapas.io/hc/en-us/articles/360052046934-What-is-Tapas-Fortune-Cookie)). The one idea worth keeping is "weekly cycle in local time"; the random amount, short expiry and push nudge are exactly what Dawghwa rules out.
- A Tapas Play Store review complains that Ink missions feel pointless ([Google Play](https://play.google.com/store/apps/details?id=com.tapastic&hl=en_US), third-party user review): quests that don't match real reading feel like chores.
- Mihon has no streaks or XP; it has a statistics screen (library size, read duration, tracker data) ([stats view model](https://github.com/mihonapp/mihon/blob/0c888b01/app/src/main/java/eu/kanade/tachiyomi/ui/stats/StatsViewModel.kt), structure only).
- Suwayomi: none.

Takeaway: there is no clean, currency-free reading gamification to copy in this set. Dawghwa's plan (streak with a weekly freeze, XP cap, one weekly quest, badges, mascot moods) is new for the category. Borrow only the local-week cadence and the "stats you can look at" idea.

## Feature table

Y = documented on a public page, P = partial, N = documented absence, ? = none found (unverified), n/a = not studied (Comick).

| Area | WEBTOON | MANGA Plus | Tapas | Mihon | Suwayomi | Manta | Comick |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Reader: more than one mode | ? (vertical scroll) | Y (vertical or horizontal) | ? | Y (5 modes) | Y (5 modes) | Y novels (page or scroll); comics ? | n/a |
| Reader: tap-zone presets | ? (tap shows menu) | P (edge tap, review) | ? | Y (6 presets, invert, overlay hint) | Y (presets) | ? | n/a |
| Reader: per-title memory | ? | N (one global switch) | ? | Y | Y (plus per device, per mode) | ? | n/a |
| Reader: auto scroll | ? | ? | ? | ? | Y | ? | n/a |
| Onboarding taste step | Y (genres and themes) | ? | N (third-party) | N (setup wizard) | ? | ? | n/a |
| Swipe-card quiz | ? | ? | ? | N | ? | ? | n/a |
| Share title | Y | ? | Y | ? | ? | ? | n/a |
| Share chapter from reader | Y | ? | Y (under episode) | P (page image) | ? | ? | n/a |
| Custom link preview image | ? | ? | Y (creator crop) | n/a | n/a | ? | n/a |
| Offline: select many, one button | Y | ? | P (per episode) | Y (queue) | Y (queue) | Y | n/a |
| Offline: progress and cancel | ? | ? | P (icon to check) | Y (reorder, cancel) | Y | Y (bar, cancel one or all) | n/a |
| Offline: Wi-Fi only | ? | ? | Y | ? | ? | Y | n/a |
| Offline: storage used, delete all | ? | ? | Y (delete all) | ? | ? | Y | n/a |
| Offline: expiry | Y (30 days) | n/a | Y (30 days) | N | N | Y (30 days) | n/a |
| Offline: auto next and auto delete | ? | n/a | ? | Y (delete after reading) | Y (both) | ? | n/a |
| Offline: offline-start shortcut | ? | n/a | ? | ? | ? | Y | n/a |
| Comments per chapter | Y | Y | Y | N | N | ? | n/a |
| Comment likes | ? | Y (count) | ? | N | N | ? | n/a |
| Report and moderation | Y | Y | ? | N | N | ? | n/a |
| Posting limit | ? | Y (2 per chapter per day) | ? | N | N | ? | n/a |
| "My comments" list | Y | ? | ? | N | N | ? | n/a |
| Reader profile | P (name, activity) | Y (name and icon, no account) | ? | N | N | ? | n/a |
| Public profile page | Y (creators) | ? | Y (creator walls) | N | N | Y (creators) | n/a |
| Streaks or XP | ? | ? | ? | N | N | ? | n/a |
| Daily or weekly loop | Y (Daily Pass, paid) | Y (read once free) | Y (timers, weekly random bonus) | N | N | Y (Free Pass, gems) | n/a |
| Reading stats | ? | ? | ? | Y | P (rudimentary history) | ? | n/a |

## Top 15 picks for Dawghwa

Ranked by value for the cycle 1 Tier 1 work, then effort. Each fits the locked decisions (sources hidden, Incognito earns and stores nothing, no coins, no guilt notifications, downloads stay in the app). Effort: S under a day, M a few days, L a week or more. IDs continue from LENS_BACKLOG.md.

| # | ID | Pick | Seen in | Value | Effort | Owner | Note for the builder |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | B32 | Tap-zone presets with an optional invert, and a one-time overlay that shows where the zones are the first time a mode is used (and from a "show zones" button in settings) | [Mihon](https://mihon.app/docs/guides/reader-settings), [Suwayomi](https://github.com/Suwayomi/Suwayomi-WebUI/releases?page=2) | H | M | QUILL | Spec E has standard, edge, off and custom. Consider adding L-shaped and a Kindle-like layout as presets rather than more custom UI. Overlay must respect reduced motion |
| 2 | B33 | A short label naming the current mode when the reader opens, so a remembered per-title mode never surprises | [Mihon](https://mihon.app/docs/guides/reader-settings) | M | S | QUILL | Toast, about 1.5 s, announced politely to screen readers |
| 3 | B34 | Mode remembered per title, defaults per mode (scroll vs paged keep separate fit and gap), and defaults per device class (phone vs desktop) | [Suwayomi](https://github.com/Suwayomi/Suwayomi-WebUI) | H | M | QUILL | Per profile, local. Device class from viewport width, not user agent |
| 4 | B35 | Chapter transition card that always shows between chapters, and doesn't jump when you tap past the first or last page | [Mihon](https://mihon.app/docs/guides/reader-settings), [Suwayomi changelog](https://github.com/Suwayomi/Suwayomi-WebUI/blob/v20250801.01/CHANGELOG.md) | M | S | QUILL | Pairs with the "Up next" card and B19 (skip read chapters) |
| 5 | B36 | Download flow: select chapters, one primary Download button, a bottom progress bar for the batch, cancel one or all with a confirm, row icon goes download, ring, check | [Manta](https://help.manta.net/hc/en-us/articles/16439680835095-What-is-the-Download-feature-and-how-do-I-use-it), [Tapas](https://help.tapas.io/hc/en-us/articles/115000415034-Read-offline) | H | M | PULSE | Only for chapters the API marks `downloadable: true`; others show no button and no reason (Spec G) |
| 6 | B37 | Download settings: Wi-Fi only (default on), storage used per title and total, delete one, delete all | [Manta](https://help.manta.net/hc/en-us/articles/16439680835095-What-is-the-Download-feature-and-how-do-I-use-it), [Tapas](https://help.tapas.io/hc/en-us/articles/115000415034-Read-offline) | H | S | PULSE (HEARTH places it in Settings) | Web can't always detect Wi-Fi; when `navigator.connection` is missing, ask once rather than guess |
| 7 | B38 | Expiry shown gently ("available offline until 23 Dec") and silent clean-up after `expiresAt`, with one tap to download again | WEBTOON, Tapas and Manta all use 30 days ([WEBTOON](https://help.line.me/LINE_WEBTOON/web/categoryId/20006011/3/pc?lang=en), [Tapas](https://help.tapas.io/hc/en-us/articles/115000415034-Read-offline), [Manta](https://help.manta.net/hc/en-us/articles/16439680835095-What-is-the-Download-feature-and-how-do-I-use-it)) | M | S | PULSE, RELAY (sets `expiresAt`) | Never explain why in terms of a source |
| 8 | B39 | Opened offline: a calm banner with "Go to downloads", and the Downloaded filter in My Series | [Manta](https://help.manta.net/hc/en-us/articles/16439680835095-What-is-the-Download-feature-and-how-do-I-use-it) | H | S | PULSE (banner), COMPASS (filter) | Banner, not a modal; dismissible |
| 9 | B40 | Auto-download next N while reading and auto-delete after reading (keep last N), both off by default; one download at a time | [Suwayomi](https://github.com/Suwayomi/Suwayomi-WebUI), [Mihon](https://mihon.app/docs/faq/downloads) | M | M | PULSE | Sequential queue is kinder to the backend and to RELAY's daily cap |
| 10 | B41 | Two share points only: title page and reader top menu; each link has a rich preview image per title | [WEBTOON](https://help.line.me/LINE_WEBTOON/web/categoryId/20006011/3/pc?lang=en), [Tapas share thumbnail](https://www.creators.tapas.io/creating-a-comic-episode) | H | M | PULSE | Preview image is our own generated card (cover plus title), never a chapter page. Links stay `/t/<id>?ref=share&c=<channel>` |
| 11 | B42 | Comments: per chapter, like with count, sort top or new, report by long press or menu, delete your own, and a posting cap (for example 2 per chapter per day plus a per-minute limit) | [MANGA Plus FAQ](https://mangaplus.shueisha.co.jp/faq/eng/), [WEBTOON Help Centre](https://help.line.me/LINE_WEBTOON/ios/pc?lang=en) | H | M | NOVA (UI, adapter), RELAY later | Behind `FEATURE_COMMENTS`; Incognito can read but not post or like |
| 12 | B43 | "My comments" list on the profile with delete, and account deletion that deletes comments too (not the WEBTOON way, where they stay) | [WEBTOON Help Centre](https://help.line.me/LINE_WEBTOON/ios/pc?lang=en) | M | S | NOVA | Write the deletion rule into the Privacy draft (SCRIBE) |
| 13 | B44 | Spoiler mark with tap to reveal, and an optional page stamp tying a comment to a page | [Lezhin via ANN](https://www.animenewsnetwork.com/news/2025-11-28/lezhin-us-webtoon-platform-adds-comment-section/.231312) (third-party) | M | M | NOVA, QUILL (jump to page) | Page stamp is Tier 2 |
| 14 | B45 | Profile that works without an account: nickname plus a preset mascot avatar, local only; going public needs sign-in | [MANGA Plus FAQ](https://mangaplus.shueisha.co.jp/faq/eng/) | M | S | NOVA | Matches the local stand-in adapter in Spec J |
| 15 | B46 | Quiz measured, not assumed: genre-and-theme picks are the market norm ([WEBTOON](https://about.webtoon.com/press-release/183)); ship swipe cards with the tile fallback, log locally which path a profile took, and compare first-week quality | WEBTOON; no competitor uses swipe cards | H | S | HEARTH (UI), ORACLE (logic), LENS (metric) | See "Quiz swipes-to-quality" in METRICS.md |

Close misses (not in the 15): auto scroll (Suwayomi, already in Spec E), novel-style text settings (Manta, we have no novels), volume-key paging (Mihon, Android only, Tier 3), reading stats screen (Mihon, already Spec P).

## Anti-patterns (do not build)

| Pattern | Seen in | Why not |
| --- | --- | --- |
| Share or save raw chapter pages | Long-press actions in [Mihon](https://mihon.app/docs/guides/reader-settings) | Files must stay in the app; images could carry source traces |
| Random weekly bonus that expires and nudges you to enable push | [Tapas Fortune Cookie](https://help.tapas.io/hc/en-us/articles/360052046934-What-is-Tapas-Fortune-Cookie) | No random rewards, no currency, no guilt notifications |
| Daily free-pass timers, coins, gems, gem-back tiers, paid likes | [WEBTOON](https://help.line.me/LINE_WEBTOON/web?lang=en), [Manta](https://manta.net/en/campaign/manta-mega-sale?id=879), [Super Like](https://about.webtoon.com/press-release/118) | No coins or paid currency, ever |
| Missions that don't match real reading | [Tapas review](https://play.google.com/store/apps/details?id=com.tapastic&hl=en_US) (third-party) | Quests must follow what the reader does anyway |
| Download once per account | [WEBTOON](https://help.line.me/LINE_WEBTOON/web/categoryId/20006011/3/pc?lang=en) | Punishes re-downloading after expiry; our cap is RELAY's daily limit instead |
| Comments that survive account deletion | [WEBTOON](https://help.line.me/LINE_WEBTOON/ios/pc?lang=en) | Delete-my-data must be complete |
| No way to move data to a new phone | [MANGA Plus](https://mangaplus.shueisha.co.jp/faq/eng/) | Dawghwa already has export and import; keep it |

## Recommendation

Adopt picks 1 to 10 in cycle 1 within the Tier 1 items they already belong to (reader, offline, share), picks 11 to 14 in cycle 2 behind `FEATURE_COMMENTS` and `FEATURE_ACCOUNTS`, and pick 15 as a measurement from cycle 1 on. Recheck any link before building against it; these products change often.
