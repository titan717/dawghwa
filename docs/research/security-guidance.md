# Security guidance: Play UGC and account deletion, image proxy SSRF, comments XSS, profile links

Author: SHIELD, cycle 0 (2026-11-23). Summaries are in my own words. All sources accessed 2026-11-23. Nothing here is legal advice.

## 1. Google Play: user-generated content (comments, profiles, bios)

Sources:
- Play Console Help, "User-generated content": https://support.google.com/googleplay/android-developer/answer/9876937
- Play Console Help, "Understanding moderation requirements": https://support.google.com/googleplay/android-developer/answer/12923286
- Developer Program Policy (UGC section): https://support.google.com/googleplay/android-developer/answer/18265346

Findings:
- Comments and public profiles count as UGC (content one user contributes that other users can see). Apps that only link out to a UGC platform are in scope too.
- Before a user can post, they must accept Terms of Use or a user policy, and those terms must define and forbid objectionable content and behaviour.
- The app must have in-app reporting of content and of users, and in-app blocking of users. For publicly visible UGC (our comments and `/u/<handle>` profiles) all three are required: report content, report user, block user. Google lets the developer choose the UI, but the controls must be easy to find and clearly labelled.
- Moderation must be ongoing and the developer must act on reports in a timely way. No fixed deadline is stated by Google (Apple's reviewers commonly expect 24h; unverified for Play).
- Incidental sexual content must be hidden by default behind a filter that takes more than one action to turn off, and kept away from minors.
- Monetisation must not reward objectionable behaviour (relevant to XP and badges: never award XP for comment volume or reactions received).

Recommendation for Spec J (NOVA, RELAY):
1. Comments and profiles stay behind `FEATURE_COMMENTS` / `FEATURE_ACCOUNTS` and OFF in production (already locked) until all of the following exist.
2. A Terms acceptance step before the first comment or bio save (store the accepted terms version per account).
3. A "Report" action on every comment and on every profile, with a reason list and an optional note, plus "Block user" on profiles and comments. Blocking hides that user's comments for the blocker immediately, in the UI and in the query.
4. A moderation queue (backend side) that can hide or delete content and suspend users, with an action log.
5. Spoiler and sensitive-content blur on comments by default.
6. No XP or badges for comment counts or reactions (SPARK).

## 2. Google Play: account deletion

Sources:
- Play Console Help, "Understanding Google Play's app account deletion requirements": https://support.google.com/googleplay/android-developer/answer/13327111
- Play Console Help, "User Data" policy: https://support.google.com/googleplay/android-developer/answer/10144311

Findings:
- If the app lets users create an account in the app, it must offer both an in-app path to delete the account and its data, and a web page where a user can request deletion without reinstalling the app. The web link goes in the Data safety form.
- The web page must load, make the deletion path prominent, name the app as listed on Play, and actually let the user request deletion (a form, an email address or a direct action are all acceptable).
- Deleting the account must delete the associated data. Deactivating or freezing does not count. Data kept for security, fraud or legal reasons must be disclosed (for example in the privacy policy).
- Accounts created and used only offline are not "app accounts" and are out of scope. Today's local profiles (IndexedDB, no server) are therefore out of scope, but the planned backend accounts are in scope.

Recommendation:
- NOVA's ADR and Spec J: add "Delete account" in Settings (in-app, two-step confirm, deletes server data: profile, comments, reports authored, sync blobs; anonymise or delete comments, decide and document which) and a public `/account/delete` page (works signed out: request by email or sign-in) linked from the Privacy Policy draft.
- HEARTH: local "Delete this profile" already exists for local profiles; keep it and make sure it also clears the `kv`, `events`, `intel` and Cache Storage entries for that profile.
- The DRAFT Privacy Policy must list retention exceptions.

## 3. Image proxy (SSRF), Spec H

Sources:
- OWASP Server-Side Request Forgery Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Webhook Security Cheat Sheet (SSRF section): https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html
- OWASP Top 10 SSRF prevention (Cornucopia mirror): https://cornucopia.owasp.org/taxonomy/owasp-top-10/10-server-side-reguest-forgery
- OWASP CheatSheetSeries issue #2401, URL parser differentials: https://github.com/OWASP/CheatSheetSeries/issues/2401

Findings (current OWASP guidance):
- Do not accept a full URL from the client. Prefer an opaque reference the server maps to a destination it built itself. Our design (HMAC-signed, short-lived token that carries the upstream URL, minted by the API) fits this, as long as the token is the only input and the URL inside it was produced by the API.
- Allow-list destinations (exact hosts, `https:` only, default port) rather than deny-listing. Deny-lists are bypass-prone.
- A host allow-list alone does not stop DNS rebinding. Resolve once, check every resolved address is public (IPv4 and IPv6, including mapped and special-purpose ranges), and connect to the address that was checked (pinned lookup in the connect hook), keeping the original Host and SNI.
- Disable redirects, or re-apply every check to each hop.
- Do not pass raw upstream responses through: check the content type, cap size while streaming (not after buffering), and set a timeout.
- When a URL crosses a boundary as a string, two parsers may disagree; treat disagreement as a rejection.
- Network-level egress restrictions are the second layer (not available to us on Vercel; record as a residual risk).

Recommendation and the SHIELD test list for RELAY's proxy PR (tests against mocks only):
1. Token tamper: flip one byte in body or signature, swap signatures between two tokens, truncated token, empty, very long (8 KB), non-base64url characters, `alg`-style JSON tricks. All return 410 `{ "error": "UNAVAILABLE" }`.
2. Expiry: `exp` in the past returns 410; clock skew tolerance documented.
3. Destination: `http:`, non-default port, userinfo (`https://a@b`), IP literal, private and loopback v4/v6, `::ffff:127.0.0.1`, `0.0.0.0`, `169.254.169.254`, `metadata.google.internal`, a host that resolves to a private IP (mock resolver), a redirect to a private host or non-allow-listed host. All refused before any upstream byte is read.
4. Streaming: upstream larger than the cap aborts mid-stream; wrong content type refused; slow upstream times out.
5. Rate limit: N+1 requests in a window from one client id return 429 with the generic body; different client ids are independent; `x-forwarded-for` spoofing does not reset the bucket.
6. Response headers: no upstream `server`, `set-cookie`, `via`, `x-*` passthrough; no provider names (leak test).
7. Outgoing headers (finding from JUDGE, see SHIELD audit c0): the proxy must not send a provider Referer, a forged Origin, or a browser User-Agent. Test that the mocked upstream receives only our bot UA and no Referer/Origin/Cookie.

## 4. Comments (XSS)

Sources:
- OWASP Cross Site Scripting Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- OWASP DOM based XSS Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html

Findings:
- Prefer APIs that treat data as text. In React that means rendering comment bodies as children (`{text}`), which escapes, and never via `dangerouslySetInnerHTML`, `innerHTML` or `insertAdjacentHTML`.
- If any formatting is supported (bold, spoilers, links), parse a tiny safe subset into React elements yourself, or sanitise with a maintained HTML sanitiser. Do not hand-roll HTML escaping.
- Store the raw text and encode on output for the right context (HTML body, attribute, URL). Also validate on input (length, control characters, bidi overrides).
- A Content Security Policy limits the damage of a missed sink.

Recommendation and SHIELD test list for comments and bio:
- Payloads saved through the local adapter and rendered: `<img src=x onerror=alert(1)>`, `<script>`, `"><svg onload=...>`, `javascript:` and `data:text/html` links, `</textarea>`, Unicode bidi override (U+202E), zero-width characters, 10 000-character body, emoji and RTL text. Pass rule: no dialog fires, no element other than text is created inside the comment node, and the stored value round-trips unchanged.
- `rg dangerouslySetInnerHTML|innerHTML` in `src` must stay empty for UGC paths (JUDGE checklist).
- Limits: body 1–2000 characters, strip C0 controls except newline, collapse more than 3 blank lines.

## 5. Profile links (bio and external links)

Sources:
- OWASP XSS Prevention Cheat Sheet, Framework Security section (React 19 blocks `javascript:` in `href`/`src` but this is not app-level URL validation): https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- OWASP React Security Cheat Sheet draft (scheme allow-list and normalise before render): https://github.com/Shakhlyn/owasp-CheatSheetSeries/blob/master/cheatsheets_draft/React_Security_Cheat_Sheet.md (community draft mirror; treat as unverified)
- OWASP Unvalidated Redirects and Forwards Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html

Findings:
- React 19 rewrites `javascript:` URLs in `href`/`src`/`action` to a URL that throws, but it does not touch `data:`, `vbscript:` or other schemes, and it does not protect values passed to `window.open` or `location`.
- Parse the user's URL with `new URL()`, allow only `https:` (and `http:` if needed), render the normalised `url.href` (the value you checked), and reject anything else.
- External links should open with `rel="noopener noreferrer nofollow ugc"` and `target="_blank"`; show the destination host next to the link so users see where they go.
- Never use a user link as an in-app redirect target (`?next=`); keep in-app redirects to relative paths that start with a single `/`.

Recommendation (NOVA, Spec J): a shared `safeExternalUrl(input): string | null` helper with unit tests (javascript:, JAVASCRIPT:, `java\tscript:`, leading spaces and C0, `data:`, `vbscript:`, `//evil.example`, `https://user@host`, IDN homographs flagged, length cap 200), used by profile links and any comment linkification. Handles in `/u/<handle>` limited to `[a-z0-9_]{3,20}`.

## Residual risks
- No network-level egress control on Vercel serverless; the app-level checks are the only SSRF layer.
- Per-instance in-memory rate limits on Vercel are best-effort (see SHIELD_AUDIT_C2.md section 3).
