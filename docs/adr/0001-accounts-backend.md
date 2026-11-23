# ADR 0001: Accounts, profiles and comments backend

- Status: Proposed (NOVA, cycle 0, 2026-11-23). Needs owner review before any account, project or key exists.
- Deciders: AMIT (lead), JUDGE (review), owner (creates the project and keys).
- Scope: sign-in (Google, email one-time code or magic link, never passwords), public profiles at `/u/<handle>`, public comments per title and chapter, opt-in history sync, delete-my-account and export-my-data. Spec J of the master prompt.
- Not decided here: Terms and Privacy text (SCRIBE, DRAFT), moderation staffing, push notifications.

No account, project or key was created for this record. Every number below comes from the vendor's own page on the date shown; prices change, so re-check before the owner signs up.

## Context

- The app is a Vite + React PWA with a Capacitor Android shell. It has no server of its own; `titan717/dawghwa.api` is a Next.js 14 app-router project on Vercel, so anything that needs a secret (account deletion with an admin key, moderation actions) can live there.
- Today "accounts" are local reader profiles with an optional PIN (DECISIONS D4, D29) and comments are private, on-device notes (D5, D24, D25). Spec J keeps all of that working and adds a networked layer behind `FEATURE_ACCOUNTS` and `FEATURE_COMMENTS`, OFF in production until the owner supplies keys.
- The cycle 2 UI is built against adapter interfaces (`AuthAdapter`, `ProfileAdapter`, `CommentsAdapter`) with `Local*Adapter` stand-ins, so this choice only decides which remote adapter RELAY writes later.
- Hard constraints: Incognito never syncs or posts; reading history never leaves the device unless the reader opts in to sync; no provider or source names anywhere; Google Play rules for user-generated content (UGC) and account deletion apply to the Android build (section "Google Play requirements" below).

## Options compared

Accessed 2026-11-23 unless noted.

| | Supabase | Firebase | Clerk + Neon | Auth.js + Postgres |
|---|---|---|---|---|
| Free tier | 50,000 MAU, 500 MB database, 5 GB egress, 1 GB file storage; free projects pause after 1 week of inactivity, 2 active projects ([pricing](https://supabase.com/pricing)) | Spark plan: Auth (non-phone) included, 50K MAU with Identity Platform; Firestore 1 GiB stored, 50K reads/day, 20K writes/day, 10 GiB egress/month ([pricing](https://firebase.google.com/pricing)) | Clerk Hobby: 50,000 monthly retained users per app, up to 3 social connections ([Clerk pricing](https://clerk.com/pricing)). Neon Free: 100 projects, 100 CU-hours/project/month, 1 GB storage/project, 5 GB transfer, scale to zero after 5 min (cannot be disabled) ([Neon plans](https://neon.com/docs/introduction/plans), updated 2026-11-18) | Auth.js is open source (no fee). Cost is the Postgres host (for example Neon Free above) plus an email sender for magic links |
| First paid step | Pro from $25/month, 100,000 MAU then $0.00325/MAU, 8 GB disk, 250 GB egress, 100 GB storage, daily backups; paid orgs are never paused ([pricing](https://supabase.com/pricing), [billing](https://supabase.com/docs/guides/platform/billing-on-supabase), updated 2026-09-17) | Blaze pay as you go; Spark quotas still free, then Google Cloud rates ([pricing](https://firebase.google.com/pricing)) | Clerk Pro $25/month ($20 billed annually), 50K MRU included then $0.02 each; Neon Launch usage-based, "typical spend $15/month" ([Clerk](https://clerk.com/pricing), [Neon](https://neon.com/pricing)) | Database host's paid tier; email sender's paid tier |
| Google sign-in | Yes, OAuth redirect, Google One Tap and `signInWithIdToken` for native Android ([Supabase Google](https://supabase.com/docs/guides/auth/social-login/auth-google), updated 2026-10-22) | Yes (core Firebase Auth) | Yes (social connection; Hobby allows up to 3) ([Clerk pricing](https://clerk.com/pricing)) | Yes (Google provider), but we run the OAuth callback on our API |
| Email without passwords | Magic link and 6-digit OTP, same method, one request per 60 s, 1 h expiry by default ([Supabase passwordless](https://supabase.com/docs/guides/auth/auth-email-passwordless), updated 2026-11-20) | Email link only: the link carries the one-time code; no built-in typed 6-digit email code ([Firebase email link](https://firebase.google.com/docs/auth/web/email-link-auth), updated 2026-11-20) | Email verification code (OTP), 10 min validity, 30 s resend cooldown; also magic links ([Clerk sign-in options](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options), updated 2026-11-20) | Magic link via an email provider (Resend, Forward Email and others); requires a database adapter for verification tokens; link valid 24 h ([Auth.js email](https://authjs.dev/getting-started/authentication/email)). A typed code needs custom work |
| Row-level security | Native Postgres RLS with `auth.uid()` helpers ([Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), updated 2026-11-19). Spec J's SQL sketch runs almost as written | Firestore Security Rules (own rules language, not SQL) ([Firestore rules](https://firebase.google.com/docs/firestore/security/get-started), updated 2026-11-18) | Postgres RLS is possible, but wiring Clerk JWTs into Neon policies is extra setup (unverified in this pass; not tested) | Postgres RLS is possible but Auth.js does not set a database role per user; in practice checks live in API code |
| Realtime comments | Realtime (Postgres changes and broadcast). Free: 200 concurrent connections, 100 messages/s; Pro: 500 (10,000 with no spend cap) ([Realtime limits](https://supabase.com/docs/guides/realtime/limits), updated 2026-10-29) | Firestore listeners; Enterprise edition lists 50K realtime update units/day free ([pricing](https://firebase.google.com/pricing)) | Neon lists "Realtime (Beta)" on every plan ([Neon pricing](https://neon.com/pricing)); beta, untested | None. Polling or our own SSE in the API |
| File storage (avatars later) | 1 GB free, 100 GB on Pro ([pricing](https://supabase.com/pricing)) | Cloud Storage free quotas on Blaze only for new buckets; Spark is "not applicable" for `*.firebasestorage.app` buckets ([pricing](https://firebase.google.com/pricing)) | Neon Free lists 5 GB object storage ([Neon pricing](https://neon.com/pricing)); Clerk stores profile images itself | Separate service |
| Account deletion | `auth.admin.deleteUser` needs the secret service key and must run on a server ([Supabase deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)). Fits a route in dawghwa.api; rows cascade by foreign key | `deleteUser(user)` from the client, needs a recent sign-in ([Firebase manage users](https://firebase.google.com/docs/auth/web/manage-users), updated 2026-11-20); Firestore data needs a separate cleanup (the official [Delete User Data extension](https://firebase.google.com/docs/extensions/official/delete-user-data), updated 2026-11-18) | Clerk user deletion plus a Neon cleanup on a webhook: two systems to keep in step | All custom |
| Data export | SQL query per user, served by our API as JSON | Custom function reading Firestore | Two sources to merge | Custom |
| Lock-in | Low. Plain Postgres (dump and restore anywhere); the auth server and realtime are open source and self-hostable | High. Proprietary document model and rules language; moving off means rewriting data access and rules | Medium. Data is plain Postgres; auth users live in Clerk | Lowest for data and auth, highest for our own maintenance |
| Vendors to run | 1 | 1 | 2 | 2 or 3 (database, email, our API) |

## Decision

Recommend **Supabase**, with these rules:

1. One Supabase project, created by the owner. Accounts and comments stay OFF in production until the owner sets the keys and reviews the Terms and Privacy drafts.
2. Sign-in: Google (redirect on web, native ID token on Android) and email 6-digit code (OTP template). Magic link stays available as a fallback for the web. No passwords.
3. Data: Postgres tables close to the Spec J sketch (`profiles`, `comments`, `reactions`, `reports`, `blocks`, optional `sync_progress`), RLS on every table, `on delete cascade` from `auth.users` so deletion removes everything the user wrote.
4. Comments read without an account (public `select` policy for non-deleted, non-hidden rows); writes require a session. Rate limits enforced twice: client limiter (5/min, 30/h) and a Postgres check or API route.
5. Secrets: only the public URL and the public (anon or publishable) key reach the app. The secret service key lives only in dawghwa.api env, used by `/api/account/delete` and moderation routes.
6. History sync is opt-in, merges by furthest progress, and never runs in Incognito.

Why Supabase over the others:

- It is the only option where Google, typed email codes, RLS, realtime, storage and the database come from one vendor on the free tier.
- Spec J is already written in Postgres with RLS, so the policies port directly.
- Lock-in is low: if costs or terms change, the data is a Postgres dump.
- Firebase loses on email codes (link only), a non-SQL model and the highest lock-in.
- Clerk + Neon is strong on auth UX but means two vendors and an untested RLS bridge, and Neon realtime is beta.
- Auth.js + Postgres is the most work (OTP, deletion, export, realtime all custom) for a small team.

## Consequences and risks

- Free projects pause after a week with no activity ([pricing](https://supabase.com/pricing)). For a public launch the owner should plan for Pro (from $25/month). Until then, keep the flags off in production and use previews only.
- Free realtime allows 200 concurrent connections ([limits](https://supabase.com/docs/guides/realtime/limits)). The comments UI must work without realtime (load on open, pull to refresh) and use realtime only while a comments sheet is open.
- Account deletion needs a server route in dawghwa.api holding the secret key (RELAY, later). Without it, the in-app deletion path cannot work, which blocks a Play release with accounts.
- Email OTP needs a working sender. Supabase's built-in sender is rate-limited; production should use the owner's SMTP (owner task, not ours).
- The adapter interface keeps the switch cheap: if the owner prefers another vendor, only `src/lib/accounts/remote-*.ts` changes.

## Google Play requirements (Android build)

Accessed 2026-11-23.

User-generated content ([Play Console Help: User Generated Content](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en)). Public comments and public profiles are UGC, so the app must:

- make users accept the terms of use or user policy before they can post or upload anything;
- define objectionable content and behavior in those terms and prohibit it;
- moderate reasonably and keep doing it: an in-app way to report content and users, and to block users, plus acting on reports;
- for publicly visible UGC (our case), provide in-app reporting of users and content AND blocking of users; mentions count as 1:1 interaction, which also requires blocking;
- keep incidental sexual content hidden by default behind a filter that takes at least two actions to disable, and keep children out if such content can appear;
- avoid monetization that rewards objectionable behavior (our XP must never be earned by posting comments in a way that rewards spam).

Account deletion ([Play Console Help: account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)). If an account can be created in the app, the app must:

- offer an in-app path to delete the account and its associated data;
- also offer a web link where a user can request account and data deletion (listed in the Data safety form);
- answer the Data deletion questions in the Data safety form in Play Console;
- delete the user data tied to the account, not only the login. Offering account deletion is required even if most features work without an account.

How the UI meets these (cycle 2, Spec J):

| Requirement | Where |
|---|---|
| Accept terms before posting | First post or profile save opens a sheet with the DRAFT Terms link and an "I agree" button; agreement time is stored on the profile |
| Report content and users | Comment ⋮ menu: Report comment, Report user (reason list) |
| Block users | Comment ⋮ menu and profile page: Block; blocked users' comments are hidden for you |
| Moderation states | `visible`, `hidden_pending_review`, `removed`; spoiler blur; link filter (max 1 link) |
| In-app deletion | Settings, Account, Delete account (confirm by typing the handle) |
| Web deletion link | A public `/account/delete` page with steps and a contact placeholder (SCRIBE writes text) |
| Export | Settings, Account, Download my data (JSON) |

## Owner checklist (when ready, not before)

1. Create the Supabase project; enable Google and Email providers; switch the email template to show the code.
2. Set app env: the project URL and public key. Set API env: the secret service key. Never commit them.
3. Review DRAFT Terms and Privacy, then set `FEATURE_ACCOUNTS=1` and `FEATURE_COMMENTS=1` on a preview first.

## Sources

All accessed 2026-11-23. "Updated" is the date shown on the page.

- Supabase pricing: https://supabase.com/pricing
- Supabase billing: https://supabase.com/docs/guides/platform/billing-on-supabase (updated 2026-09-17)
- Supabase passwordless email: https://supabase.com/docs/guides/auth/auth-email-passwordless (updated 2026-11-20)
- Supabase Google login: https://supabase.com/docs/guides/auth/social-login/auth-google (updated 2026-10-22)
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security (updated 2026-11-19)
- Supabase Realtime limits: https://supabase.com/docs/guides/realtime/limits (updated 2026-10-29)
- Supabase deleteUser: https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
- Firebase pricing: https://firebase.google.com/pricing
- Firebase email link auth: https://firebase.google.com/docs/auth/web/email-link-auth (updated 2026-11-20)
- Firebase manage users: https://firebase.google.com/docs/auth/web/manage-users (updated 2026-11-20)
- Firestore security rules: https://firebase.google.com/docs/firestore/security/get-started (updated 2026-11-18)
- Firebase Delete User Data extension: https://firebase.google.com/docs/extensions/official/delete-user-data (updated 2026-11-18)
- Clerk pricing: https://clerk.com/pricing
- Clerk sign-in options: https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options (updated 2026-11-20)
- Neon pricing: https://neon.com/pricing
- Neon plans: https://neon.com/docs/introduction/plans (updated 2026-11-18)
- Auth.js email provider: https://authjs.dev/getting-started/authentication/email
- Auth.js pg adapter: https://authjs.dev/getting-started/adapters/pg
- Google Play UGC policy: https://support.google.com/googleplay/android-developer/answer/9876937?hl=en
- Google Play account deletion: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en

Unverified in this pass: Clerk-to-Neon RLS wiring, Neon Realtime behavior, Clerk client-side self-deletion settings. None of these affects the recommendation.
