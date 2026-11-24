# HERALD cycle 0 log

Date: 2026-11-23. Scope: PR and branch inventory, closing superseded PRs, fork PR #30, branch cleanup, changelogs, release config, baseline releases.

Method: `git merge-base --is-ancestor <branch> origin/main` ("ancestor"), otherwise `git merge-tree --write-tree origin/main <branch>` compared with main's tree ("content in main": merging would change nothing). Main was `5efc0d105b754670fae4afd645c444327aec184a`.

## Open PRs

| PR | In main? | Evidence | Action |
|----|----------|----------|--------|
| [#34](https://github.com/titan717/dawghwa/pull/34) lens backlog | yes | head a1ad2b4 is an ancestor of the old `agent/cycle-1` tip 1984b79, whose tree 31c2365 equals the tree of [a5c2d33](https://github.com/titan717/dawghwa/commit/a5c2d335f115a72966aac02a4e855be53f94af3b) (#41 squash); a5c2d33 is an ancestor of main | closed with comment, label `skip-changelog` |
| [#35](https://github.com/titan717/dawghwa/pull/35) quill resume | yes | head 98f94ee, same evidence | closed |
| [#36](https://github.com/titan717/dawghwa/pull/36) oracle eval | yes | head 5a1888e, same evidence | closed |
| [#37](https://github.com/titan717/dawghwa/pull/37) forge header | yes | head 0fea664, same evidence | closed |
| [#38](https://github.com/titan717/dawghwa/pull/38) spark streak | yes | head 586e280, same evidence | closed |
| [#39](https://github.com/titan717/dawghwa/pull/39) compass states | yes | head 5a96bea, same evidence | closed |
| [#40](https://github.com/titan717/dawghwa/pull/40) hearth incognito | yes | head 59c3dd1, same evidence | closed |
| [#30](https://github.com/titan717/dawghwa/pull/30) fork draft, 16 commits | partly | 13 commits not in main; 1 already in main (8a41f14 logic); 2 conflict with locked decisions | 13 cherry-picked with `-x` into [#51](https://github.com/titan717/dawghwa/pull/51); close #30 after #51 merges |
| API | none open at start | `gh pr list` empty | none |

## Fork PR #30

Fetched with `git fetch origin pull/30/head:pr30`. No fork workflow was approved or run, nothing was pushed to the fork.

| Commit | Decision |
|--------|----------|
| dfa863c bottom navigation across screen sizes | dropped: conflicts with locked navigation (header on desktop, bottom bar on mobile) |
| 8a41f14 preserve landing routing | dropped: main already passes the profile to `shouldShowLanding`; the rest undid the sidebar grid |
| 0537606 design guide navigation | dropped: contradicts the locked decision and docs/DESIGN.md |
| 355b4ee, 23b51f5, 63b2783, 68bf3e2, c6f7dd1, e499ac2, c6250cc, d17e3f5, 661c868, 58f62a4, 7eef1fa, 6674d95, e6167b9 | cherry-picked in order; one import conflict in `src/routes/Profile.tsx` resolved keeping main's imports |

## Branches

Deleted (agent/*, fully merged, remote sha re-checked with `--force-with-lease` at delete time):

- app: `agent/c1-compass-states`, `agent/c1-forge-header`, `agent/c1-hearth-incognito`, `agent/c1-oracle-eval`, `agent/c1-quill-resume`, `agent/c1-spark-streak` (ancestors of the old cycle-1 tip whose tree equals a5c2d33), `agent/c1-lens-backlog`, `agent/c1-scout-providers`, `agent/c2-pixel-design`, `agent/c2-shield-audit`, `agent/p4-provider-research`, `agent/release-apk-workflow` (content in main).
- API: `agent/c1-relay-chapter`, `agent/p5-catalog-model` (content in main).

Kept, not merged, no PR (agent/* but NOT fully merged; for AMIT to decide):

| Repo | Branch | Last commit | Ahead of main |
|------|--------|-------------|---------------|
| app | `agent/p0-baseline` | 2026-11-22 docs: Phase 0 baseline screenshots | 1 commit, 123 files |
| app | `agent/p1-incognito-privacy` | 2026-11-22 Incognito and profile-scoped reader position | 1 commit, 17 files |
| app | `agent/p2-design-system` | 2026-11-22 DESIGN.md direction | 2 commits, 8 files |
| app | `agent/phase0-pr30-plan` | 2026-11-22 PR #30 plan | 1 commit, 1 file |
| app | `agent/phase1-finish-pr30` | 2026-11-22 earlier attempt to finish #30 | 21 commits, 38 files |
| API | `agent/phase4-catalogue-core` | 2026-11-22 catalogue core | 1 commit, 21 files |
| API | `agent/phase5-provider-study` | 2026-11-22 experimental provider flag | 1 commit, 22 files |

`agent/cycle-1` was left to WARDEN (recreated from main at 5efc0d1 in the app and 0dd3ca0 in the API).

Non-agent branches (not deleted, listed only). Ancestor of main: `chore/qa-relay`, `design/manga-system`, `docs/research-and-plan`, `feat/discover-advanced-filters`, `feat/landing-page`, `feat/reader-auto-scroll`, `feature/app-foundation`, `feature/blueprint-experience`, `feature/unified-multi-source-reader`, `feature/unified-reading-engine`, `fix/cover-images`, `fix/critic-round1..3`, `fix/home-loading-a11y`, `fix/pr20-live-e2e-determinism`, `phase-0..6/*`, `test/discover-filters-wait-caps`; API: `feat/catalog-advanced-filters`, `feature/catalog-metadata-browse`, `feature/catalog-summary-detail`, `feature/cover-image-proxy`, `feature/unified-chapter-aggregation`, `feature/unified-reading-engine`, `feature/universal-page-extraction`, `fix/guarded-fetch-undici`, `fix/serverless-background-refresh`. Content in main (tree equals the #10 squash 950eb7d): `feature/blueprint-v2`. Not merged: `feat/incognito-resume-per-profile` (1 commit, superseded by #41), `feature/live-scanlation-reader-e2e` (PR #20 closed unmerged).

## Release hygiene

- Labels `feature`, `fix`, `security`, `docs`, `chore`, `skip-changelog` created in both repos; every merged PR in both repos labelled with exactly one category.
- `.github/release.yml` in both repos, `docs/RELEASE.md` in both, app `CHANGELOG.md` created, API `CHANGELOG.md` updated (1.3.0, provider-neutral wording).
- APK workflow: attaches an APK only when signing secrets exist (none exist today), otherwise keeps it as a 14-day workflow artifact; `-rc` tags become pre-releases.

## Releases

Filled in after the release commits merge and deploy (see the release PRs).
