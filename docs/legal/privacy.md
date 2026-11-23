# Privacy Policy (DRAFT)

> **DRAFT, pending owner review. This is not legal advice.** This text was written to describe how the app works today. It has not been reviewed by a lawyer or approved by the owner of Dawghwa, and it may change before it takes effect. Items marked [OWNER] need the owner's decision.

Last updated: 23 November 2026 (draft)

## The short version

- Dawghwa keeps your reading data on your device. There is no Dawghwa account today, and your library, progress, history, comments and rewards are not sent to us.
- To show you series and chapters, the app asks our servers for public catalogue data and images. Those requests reach our servers and our hosting provider like any web request.
- We do not run advertising, ad tracking or third-party analytics in the app.
- You can export your data to a file, import it, or delete it at any time.

## Who we are

Dawghwa is a reading app for comics and manga, available as a website and as an Android app.

Contact: [OWNER: contact email or form for privacy questions]

## What is stored on your device

Everything below lives in your browser's or the app's own storage on your device (IndexedDB, localStorage and sessionStorage). It stays there until you delete it, clear the app's data, or uninstall the app.

### Reader profiles

You can create several reader profiles on one device. Each profile keeps its own data, and one profile cannot see another's. For each profile the app stores:

- Profile details: the name you choose, a colour, the cosmetics you equipped (frame, emblem), an optional weekly reading goal, and the genres and types you picked (or chose to avoid) when you first set up the profile.
- Optional PIN: if you set a 4-digit PIN, the app stores a salted hash of it, not the PIN itself. The PIN is a privacy curtain for shared devices, not strong security. Your data is not encrypted.
- Library: series you saved, their status (for example Reading or Completed), favourites, likes and dislikes, and your collections.
- Reading progress and history: the last chapter and position you reached in each series, which chapters you finished, and when.
- Hidden series: series you marked "Not interested" or hid.
- Activity log: a list of reading events (for example opening a series, finishing a chapter, adding to your library). Rewards (XP, levels, streaks, quests, badges) and on-device recommendations are calculated from this log.
- Recommendation model: a small model learned from your activity log, calculated and kept on your device.
- Comments: comments and replies you write on chapters, with your own pins and reactions. Today these are private to your device. Nobody else can see them.
- Bookmarks: pages you bookmarked in chapters.
- Recent searches: up to 8 recent search terms per profile.
- Reader position: a short-lived copy of your place in recently read chapters (up to 20 per profile), so a reload returns you to the right spot.

### Device-level data (shared by all profiles on the device)

- Settings: theme, motion, data saver, rewards on or off, mature cover blur, grid density, reader width and auto-scroll preferences.
- A few display choices, such as the Library list or grid view and whether you have already seen the welcome page.
- Which profile was last used, and (for this browser session only) which profiles are unlocked.
- A cache of public catalogue information (series names, covers, descriptions, genres) for series you interacted with, so the app works quickly and offline.
- A cache of the app's own files, fonts and cover images, so the app loads quickly and can open offline.

If your browser blocks storage (for example in some private browsing modes), the app keeps this data in memory only and tells you that nothing will be saved.

## Incognito

When Incognito is on, the app does not record what you read: no progress, history or Continue reading, no activity log entries (so no XP, streaks or recommendation learning), no comments, no reader positions and no recent searches. Settings and deliberate edits, such as adding a series to your library or a bookmark, still save.

Incognito is held in memory only and ends when you reload or close the app. It only changes what this app saves on your device. It does not hide your activity from other people who use the device, from your network, or from the servers the app talks to, and it does not encrypt anything.

## What is sent over the network

The app needs the internet to find and load series. When you browse, search or read, the app sends requests to our servers (the Dawghwa API) to get public catalogue data, chapter lists and page images. These requests can include your search terms and the series or chapter you asked for. They do not include your profile, library, history or comments.

Like any website, our servers and our hosting provider receive technical information with each request, such as your IP address, browser or device type and the time of the request. We use this to deliver the service, to limit abuse (for example, rate limits that count requests per IP address for a short time), and to fix problems. [OWNER: confirm the hosting provider's log retention period and list it here.]

When a chapter fails to load, the app may send a short error report (which version failed, the kind of error, and whether another version worked). It contains no personal or profile data.

Images and chapter content may come from third-party sources through our servers. [OWNER: confirm whether any images are loaded directly from third parties and, if so, describe that here.]

## Analytics and advertising

The app has no advertising, no ad identifiers and no third-party analytics or tracking scripts. Rewards, statistics and recommendations are calculated on your device. If this changes, we will update this policy first. [OWNER: confirm whether any hosting-level analytics are enabled.]

## Sharing

When you share a series, the app hands a link to that series page to your device's share menu. Links never include your profile, history, Incognito state or contact details. When you share a reader card, the app draws an image on your device from your own stats and hands it to your share menu or saves it as a file. What happens next depends on the app you share it with.

## Offline downloads

[Planned feature.] When available, you will be able to save chapters to read offline, but only chapters that our servers mark as downloadable. Saved chapters are stored on your device, and you can delete them from Settings. Clearing the cache does not remove them.

## Accounts, public profiles, comments and social links (not live yet)

There are no online accounts today. If the owner turns accounts on in the future, this section will describe them before launch. The plan under review is:

- Account: a sign-in method (for example email or Google), a handle, and the data needed to keep you signed in.
- Public profile: a nickname, avatar, bio and links to your social accounts that you choose to show. Anything you put on a public profile can be seen by others.
- Public comments: comments you post would be visible to other readers and stored on our servers, with tools to report and remove them.
- Sync: your library and progress could be copied to our servers so they appear on your other devices.

[OWNER: choose the accounts backend, its location and retention, and complete this section before turning accounts on.]

## Export, import and deletion

- Export: the Profile page lets you save a profile as a JSON file (profile details, library, progress, hidden series, activity log, comments and the related public series details). The file is saved where you choose; it is not sent to us.
- Import: you can load an export file. It always creates a new profile and never overwrites an existing one.
- Delete: you can clear your reading history, remove single series from history, delete comments, or delete a whole profile with all of its data. You can also clear all app data in your browser or Android settings, or uninstall the app.

Because we do not hold your reading data on our servers today, we cannot recover it if you delete it.

## Children

[OWNER: state the minimum age for using Dawghwa and how mature content is handled. Today the app blurs covers of titles marked suggestive or adult until the reader chooses to show them.]

## Your rights

Depending on where you live, you may have rights to access, correct, delete or export personal data, and to object to some uses. Most of your data is on your device and under your control through the tools above. For anything else, contact us at the address above. [OWNER: add applicable jurisdictions and a complaint authority if required.]

## Changes to this policy

If we change this policy, we will update the date above and, for important changes, tell you in the app.
