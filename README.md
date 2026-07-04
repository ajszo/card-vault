# Card Vault

A mobile-installable PWA for tracking a sports card collection: snap a photo,
get an AI-identified card + estimated market value, and keep a running
buy/sell ledger — all working offline once installed. Each person signs up
with their own username + passcode, and sees their own vault (e.g. "arieszo's
Card Vault").

## What it does

- **Add card tab**: take a photo → sends it to a serverless function that
  calls Claude (vision) to identify the player/year/set/grade, and uses web
  search to estimate current market value from recent sold comps. You
  review/edit before saving — the AI guess is a starting point, not gospel.
- **Vault tab**: all cards in one filterable grid (by sport) with search,
  shown as card-shaped tiles with a sport-color stripe.
- **Ledger tab**: every purchase and sale in one chronological list, with
  running profit/loss.
- Everything is stored locally in the browser (IndexedDB), so it works
  fully offline except for the "Identify card" step, which needs network.

## Why there's no live eBay account connection

A real eBay sync (auto-importing your listings/sold prices) requires eBay's
OAuth developer API, which needs a registered developer app (approval can
take a while) and a backend to securely hold access tokens — not something
safe to do from code running in a browser. This app instead estimates value
via web search on each card, and gives you a spot to log what you actually
paid/sold for, on eBay or anywhere else. If you want true eBay sync down the
road, that's a follow-on project, not a small addition.

## Project structure

```
card-vault/
├── src/               React frontend
├── api/identify-card.js   Vercel serverless function (holds the API key)
├── public/icons/       App icons for install prompt
└── vite.config.js      PWA manifest + service worker config
```

## Running it locally

```bash
npm install
npm run dev
```

The identify function needs a backend running too — easiest path is to
deploy to Vercel (below) even for testing, since `vite dev` alone won't run
the `/api` function. Alternatively install the Vercel CLI and run
`vercel dev` instead of `npm run dev`.

## Deploying (recommended: Vercel, free tier is enough)

1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → import that repo. Vercel auto-detects
   Vite and the `/api` folder.
3. In the project's Settings → Environment Variables, add:
   - `ANTHROPIC_API_KEY` = your Anthropic API key (console.anthropic.com)
   - `SESSION_SECRET` = a long random string (e.g. output of
     `openssl rand -hex 32`) used to sign login session cookies
4. In the project's **Storage** tab, create a Postgres database and attach
   it to this project — Vercel adds the `POSTGRES_URL` (etc.) env vars
   automatically. This is where user accounts are stored.
5. Deploy. You'll get a URL like `card-vault.vercel.app`.
6. On your phone: open that URL in Safari (iPhone) or Chrome (Android), sign
   up for a profile, then "Add to Home Screen" — it installs like a real
   app and reuses the camera for captures.

## Accounts

Signing up creates a row in the `users` table (created automatically on
first use) with a bcrypt-hashed passcode — never the passcode itself.
Logging in sets an httpOnly, signed session cookie; there's no separate
sessions table. Card data itself is still stored per-device (see below) —
accounts currently gate access to the app, but collections aren't yet tied
to a specific account across devices.

## Notes on the AI card ID + pricing

- Grading and serial numbers are only readable if they're visible/legible
  in the photo — encourage good lighting and a straight-on shot.
- Adding a back-of-card photo (optional button after the front capture)
  noticeably improves accuracy, since the set name, card number, and
  copyright line are often clearer on the back than the front.
- Estimated values are a starting point from recent comps, not an
  appraisal — good for tracking trends, not for insurance or tax purposes.
- Each identify call costs a small amount of Anthropic API usage (a few
  cents per card at most) — worth keeping an eye on API usage/billing if
  you're cataloging a big backlog at once.

## Possible next steps

- CSV export of the ledger for tax time.
- Tie card data to accounts so a collection follows you across devices
  (currently cards are stored per-device, accounts just gate access).
- True eBay OAuth integration (bigger project — happy to scope separately).
