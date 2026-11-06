# Second Brain

Goals, notes, money and calendar in one place. A personal organiser in Greek and English that works in the browser and installs on your phone like an app.

**Live:** https://second-brain-nu-neon.vercel.app
**What's new:** [Releases](https://github.com/ChristosLyssas/second-brain/releases) · [CHANGELOG](CHANGELOG.md)

## Features

- **Today** – your day at a glance: urgent goals, this week's events, this month's money, goals in progress and pinned notes. Reorder or hide the cards.
- **Whisperer** – quick notes with #tags, checklists, links and search, laid out as a mosaic. Pin, drag to reorder, or turn a note into a goal.
- **Goals** – break goals into steps and progress fills in by itself. Finance goals can follow your savings.
- **Budget** – income, fixed costs, spending and savings per month, with "free to spend" and charts.
- **Calendar** – your own events (time, location, colour, repeat) plus goal deadlines and payments, in day, week, month and year views.
- **Everywhere** – light and dark theme, Greek and English, installable PWA, swipe between tabs on phones, a welcome tour, and your own tab order.

## Tech

React 19 + Vite · Supabase (auth and Postgres with row-level security) · Vercel (hosting and analytics) · Lucide icons.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and anon key
npm run dev                  # http://localhost:5173
```

To try it on a phone on the same Wi-Fi: `npm run dev -- --host` and open the "Network" address.

## Supabase

The app expects the `goals`, `notes` and `transactions` tables (one row per user item, protected by row-level security on `user_id`). Extra SQL lives in [`supabase/`](supabase/); run it once in the Supabase SQL editor, in this order:

1. [`events.sql`](supabase/events.sql) – calendar events table and its policies
2. [`delete_user.sql`](supabase/delete_user.sql) – lets a user delete their own account and data (Profile → Delete account)

For "Forgot your password?", add the site URL (e.g. `https://second-brain-nu-neon.vercel.app/**`) under Authentication → URL Configuration → Redirect URLs.

## Project layout

```
src/
  App.jsx            app shell: header, tabs, data loading, shared toast
  AuthScreen.jsx     sign in / sign up / password reset
  tabs/              one file per tab (Today, Goals, Whisperer, Budget, Calendar, Profile)
  components/        shared UI (icons, progress ring, donut, welcome tour, …)
  lib/               Supabase access, translations, helpers, calendar rules
supabase/            SQL to run in Supabase
public/              icons, manifest, service worker
```

## Releases and deploys

- `main` is production: every push to `main` deploys to Vercel.
- Versions follow `MAJOR.MINOR.PATCH`. For a release: bump `version` in `package.json` (it's shown in Profile), add an entry to `CHANGELOG.md`, tag the commit (`git tag -a vX.Y.Z`) and publish a GitHub Release.
