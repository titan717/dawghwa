# Research and plan (November 2026)

Review of Dawghwa (this repo) and Dawghwa API (`titan717/dawghwa.api`) against the public behaviour of a reference reading site, followed by a set of implemented, tested changes.

| Document | Contents |
|---|---|
| [architecture-map.md](architecture-map.md) | Both repos, with real paths. Separates what is implemented from documentation claims and stubs |
| [comix-inventory.md](comix-inventory.md) | Reference site behaviour, each item labelled observed, inferred or unknown |
| [gap-matrix.md](gap-matrix.md) | Feature gaps with dependencies, cost, risk, tests and priority |
| [pr6-review.md](pr6-review.md) | Review of API PR #6 and app PR #20: nine confirmed findings, with fixes and regression tests |
| [plan.md](plan.md) | Phases A–E and the approvals each one needs |
| [providers-2026-11.md](providers-2026-11.md) | Phase 4: 12 titles × 8 Dawghwa providers via the live API, match status vs chapter verification, and Title page provider-display patterns |
| [providers-comix-ws-terms.md](providers-comix-ws-terms.md) | comix.ws robots.txt (verbatim) and the 403 outcome for its terms and DMCA pages |
| [validation.md](validation.md) | Checks that were run, with results, and checks proposed but not run |

## How the skills were applied

- **Reverse Engineer.** The reference site was studied as a black box. The method was low-volume browsing of public pages in a sandboxed browser, recording what the browser itself loaded:
  - routes;
  - URL parameters;
  - storage keys;
  - the API calls the page made on its own.
  The skill's REA toolchain is meant for authorised targets (your own builds, bundles you are entitled to analyse). It was not run against the reference site's bundles. Doing so would go beyond observing public behaviour, and no reuse of its code is wanted. No hidden endpoint was probed, no protected request was retried, and no account or form was used.
- **Taste.** Dawghwa already has a documented design system (`docs/DAWGHWA_DESIGN_SYSTEM.md`), so no new direction was drawn. The skill's inspector and linter were run before and after on the screens that changed. New controls reuse the existing pieces:
  - `Segmented`;
  - `chip`;
  - `select`;
  - `Sheet`;
  - `icon-btn`;
  - the reader overlay treatment.
  One layout defect found during visual review was fixed. Pre-existing flags are listed in `validation.md` and left for a design-system decision.

## Content rights (separate from engineering)

These are questions for you, not engineering conclusions:

- Dawghwa reads chapters from third-party sites, including scanlation sites. Their right to host translated chapters is usually unclear. Before a public production launch, decide:
  - which providers to enable;
  - whether to honour takedown requests and how (the API already has an operator switch, `DISABLED_SOURCES`, read in `src/lib/core/config.ts`);
  - whether to show source attribution in the reader. The reader already shows "via <provider>".
- The image relay (`/api/image`) re-serves third-party images. Serving them from your domain may make you the distributor in some jurisdictions. Options:
  - keep the relay off by default for providers that allow direct hotlinking (not possible for every host, because of referrer checks);
  - add caching limits;
  - publish a DMCA / takedown contact.
- `robots.txt` and CDN blocks are honoured by the extractor (PR #6). Keep that behaviour; it is also a rights signal.
- Screenshots taken during this review include page artwork from MangaDex-hosted chapters. They are not committed to the repository, and should not be used in public material.
- Nothing from the reference site is copied: no branding, text, artwork or code. Only behaviours were compared.
