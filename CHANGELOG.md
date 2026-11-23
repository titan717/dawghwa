# Changelog

All notable changes to the Dawghwa app are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Each entry links the pull request that shipped it. The release process is in [docs/RELEASE.md](docs/RELEASE.md).

## [Unreleased]

## [0.3.0] - 2026-11-23

Baseline release for the current production build: everything merged since 0.2.0 was declared, which was never tagged.

### Added
- Blueprint v2 design: border-collie mascot across the app, icons and splash screens; Inter-only type, neutral greys, black bottom bar with a filled green active tab; redesigned Home, My Series, Search, Onboarding and chapter end ([#10](https://github.com/titan717/dawghwa/pull/10)).
- Landing page at the root with "Use in browser" and a PWA install sheet ([#29](https://github.com/titan717/dawghwa/pull/29)).
- Desktop sticky header with navigation and no sidebar; sticky safe-area Home bar on phones ([#37](https://github.com/titan717/dawghwa/pull/37), shipped in [#41](https://github.com/titan717/dawghwa/pull/41)).
- Memory-only Incognito: nothing is written to the profile while it is on, and it ends on reload ([#40](https://github.com/titan717/dawghwa/pull/40), shipped in [#41](https://github.com/titan717/dawghwa/pull/41)).
- Per-profile reading resume ([#35](https://github.com/titan717/dawghwa/pull/35), shipped in [#41](https://github.com/titan717/dawghwa/pull/41)).
- Reading streak with a weekly freeze and a daily XP cap; Incognito earns nothing ([#38](https://github.com/titan717/dawghwa/pull/38), shipped in [#41](https://github.com/titan717/dawghwa/pull/41)).
- "Taste signal" label on recommendations and a chronological replay evaluation baseline (`npm run eval:replay`) ([#36](https://github.com/titan717/dawghwa/pull/36), shipped in [#41](https://github.com/titan717/dawghwa/pull/41)).
- Local profile pictures, including safe animated images: size, dimension and frame limits are checked before decoding, and profile import and export validate them (community contribution from @auratitan616, [#30](https://github.com/titan717/dawghwa/pull/30), landed in [#51](https://github.com/titan717/dawghwa/pull/51)).
- Reader auto-scroll that is time based, with pause, speed control and reduced-motion steps ([#25](https://github.com/titan717/dawghwa/pull/25)).
- Discover advanced filters with shareable URL state ([#24](https://github.com/titan717/dawghwa/pull/24)).
- Scroll-only reader with comments in the top bar and a chapter-end reward beat ([#16](https://github.com/titan717/dawghwa/pull/16)); auto-hiding bar, tappable progress line and zoom ([#22](https://github.com/titan717/dawghwa/pull/22)).
- Mascot onboarding, local sign-in with an optional PIN, monthly recap and reader card ([#17](https://github.com/titan717/dawghwa/pull/17)).
- Motion and polish for discovery surfaces ([#19](https://github.com/titan717/dawghwa/pull/19)) and the title page ([#21](https://github.com/titan717/dawghwa/pull/21)).
- Android APK release workflow ([#31](https://github.com/titan717/dawghwa/pull/31)).
- Changelog, release note categories (`.github/release.yml`) and the release process in `docs/RELEASE.md` ([#45](https://github.com/titan717/dawghwa/pull/45)).

### Changed
- Discovery and history show generic loading, empty, error and partial-failure states, with no backend details in the copy ([#39](https://github.com/titan717/dawghwa/pull/39), shipped in [#41](https://github.com/titan717/dawghwa/pull/41)).
- Simple browse and search requests no longer fetch the filter vocabulary they do not use ([#51](https://github.com/titan717/dawghwa/pull/51), from [#30](https://github.com/titan717/dawghwa/pull/30)).
- The Android release workflow attaches an APK only when release signing keys are configured, and marks pre-release tags as pre-releases ([#45](https://github.com/titan717/dawghwa/pull/45)).

### Fixed
- Home hero skeleton has valid loading semantics for screen readers ([#23](https://github.com/titan717/dawghwa/pull/23)).
- Discover "Load more" no longer requests overlapping pages ([#24](https://github.com/titan717/dawghwa/pull/24)).
- Deterministic end-to-end waits for the reader and Discover filters ([#26](https://github.com/titan717/dawghwa/pull/26), [#28](https://github.com/titan717/dawghwa/pull/28)).

### Security
- Accessibility gate in CI: axe (WCAG 2.0/2.1 A and AA) fails the build on serious or critical violations ([#18](https://github.com/titan717/dawghwa/pull/18)).
- Security, privacy and accessibility audit for cycle 2 planning ([#43](https://github.com/titan717/dawghwa/pull/43)).

### Documentation
- Research, gap matrix and plan ([#27](https://github.com/titan717/dawghwa/pull/27)); provider research and gate records ([#32](https://github.com/titan717/dawghwa/pull/32), [#33](https://github.com/titan717/dawghwa/pull/33)); consolidated `docs/DESIGN.md` and design review ([#42](https://github.com/titan717/dawghwa/pull/42)); competitor backlog and evaluation plan ([#34](https://github.com/titan717/dawghwa/pull/34), shipped in [#41](https://github.com/titan717/dawghwa/pull/41)); documentation hub and README refresh ([#51](https://github.com/titan717/dawghwa/pull/51), from [#30](https://github.com/titan717/dawghwa/pull/30)).

## [0.2.0] - 2026-11-19

Declared in `package.json` with the unified reader ([#15](https://github.com/titan717/dawghwa/pull/15)); not tagged.

### Added
- One chapter list per series with a per-chapter version picker and same-edition fallback in the native reader ([#9](https://github.com/titan717/dawghwa/pull/9), [#15](https://github.com/titan717/dawghwa/pull/15)).
- Reward foundations, XP and levels, achievements, weekly quests and cosmetics ([#11](https://github.com/titan717/dawghwa/pull/11), [#12](https://github.com/titan717/dawghwa/pull/12), [#13](https://github.com/titan717/dawghwa/pull/13), [#14](https://github.com/titan717/dawghwa/pull/14)).

### Fixed
- Cover images load through the API image relay ([#8](https://github.com/titan717/dawghwa/pull/8), [#7](https://github.com/titan717/dawghwa/pull/7)).

## [0.1.0] - 2026-11-17

Not tagged.

### Added
- App foundation: PWA, discovery, reader and on-device recommendations ([#1](https://github.com/titan717/dawghwa/pull/1)); design system and blueprint screens ([#2](https://github.com/titan717/dawghwa/pull/2), [#3](https://github.com/titan717/dawghwa/pull/3)).

### Fixed
- Review rounds 1 to 3: title overflow, exact resume, single failure banner, request retries ([#4](https://github.com/titan717/dawghwa/pull/4), [#5](https://github.com/titan717/dawghwa/pull/5), [#6](https://github.com/titan717/dawghwa/pull/6)).

[Unreleased]: https://github.com/titan717/dawghwa/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/titan717/dawghwa/releases/tag/v0.3.0
[0.2.0]: https://github.com/titan717/dawghwa/commit/f7f762cd0256bbe7db8cad0ce4e23a1a545cb050
[0.1.0]: https://github.com/titan717/dawghwa/commit/a0a317da25e9048deecc4063eca5e0f489206b43
