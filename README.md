# API Directory Hub

A self-hosted, fully offline directory of **11,860 APIs** (parsed from the `API-mega-list` repo) with instant search,
filters, a dark/light dashboard, an admin panel and a bulk importer that handles 100,000+ rows.

No Docker, no WSL, no build step, no npm install. Only Node.js (already bundled with Pinokio).

## Launch in Pinokio

1. Unzip this folder into Pinokio's apps directory, so you end up with `.../pinokio/api/api-hub/pinokio.js`
   (Pinokio → *Settings* shows the exact `api` folder path).
2. In Pinokio click **Refresh** (or reopen the Home page). **API Directory Hub** appears in your list.
3. Open it and click **Start**. When the log prints `http://127.0.0.1:<port>`, click **Open Directory**.

Without Pinokio: `node server.js` and open http://127.0.0.1:5178

## Using it

- **Search** (`/` focuses it): matches name, category, tags, description and URL; every word must match.
- **Filters**: Free / Freemium / Paid, *Auth required*, click any `#tag` or category pill.
- **Admin** (shield button): the first visit asks you to create a password. Then you can add, edit and delete APIs,
  bulk-upload, export, and reset.
- **Bulk upload**: `.txt .csv .tsv .md .json`. Header row optional. Accepts `Name,URL,Description,Category`,
  tab/pipe/semicolon files, markdown tables, JSON, or free-form lines such as `Name - https://url - description`.
  Duplicates are detected on the normalised URL and either skipped or updated; missing categories are auto-detected.
  Try `samples/bulk-sample.csv`, or `node tools/generate-test-file.mjs 100000 test.csv` for a stress test.

## Where data lives

Your database is in the browser's **IndexedDB** (localStorage is capped at ~5 MB and cannot hold 100k APIs).
It is tied to the address `http://127.0.0.1:5178`. The server always tries port **5178** first (only falling back to
5179, 5180… if it is taken), so your data stays put between launches. Use Admin → Data & security → Export to back up.

## Notes on the data

The source repo has no pricing/auth fields. *Free / Freemium / Paid* and *Auth* are inferred from keywords in each
description (and Apify/RapidAPI listings default to Freemium). Treat them as hints. Source rows that appear in several
categories are merged into one card that shows up under each category.
Admin sign-in is client-side only: it keeps casual users out of the editor but is not server-grade security.

## Layout

```
pinokio.js start.js stop.js      Pinokio launcher
server.js                        zero-dependency static server
public/index.html, css/          UI
public/js/app.js                 state, filtering, routing
public/js/components/            Sidebar, SearchBar, APICard, AdminPanel
public/js/bulk-parser.js         BulkParser (format detection, dedupe, categorise)
public/js/classify.js            category / tag / pricing inference (shared)
public/js/store.js, auth.js      IndexedDB layer, admin password
public/data/apis.json            parsed library
tools/build-data.mjs             regenerate apis.json from the repo
```
