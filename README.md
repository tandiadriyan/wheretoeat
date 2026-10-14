# wheretoeat

A TikTok-style vertical feed of your saved Google Maps places. Paste a shared
Google Maps list link, swipe through the places with photos, ratings and
open-now status, then jump straight into Google Maps for directions.

Built as a PWA, so on Android you can install it from Chrome and share list
links into it from the Google Maps app.

## How it works

- **`/api/list`** reads a link-shared Google Maps list (name, note, address,
  coordinates, place id). This uses the same **undocumented** endpoint the Maps
  website uses. There's no official API for saved lists, so if Google changes the
  format, syncing breaks until `api/_lib/gmaps.js` is updated.
- **`/api/place`** and **`/api/photo`** fetch details and photos from the
  official [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview).
  Your API key stays on the server.
- Lists, ❤️ / ✅ marks and a 24h details cache live in `localStorage` on your phone.
- Lists re-sync automatically when you open the app if they're older than 6 hours,
  or on demand from the ☰ menu.

## Setup

1. **Google Cloud key**
   - Create a project at https://console.cloud.google.com, enable billing, and
     enable **Places API (New)**.
   - Create an API key and restrict it to **Places API (New)**.
   - Personal use normally stays inside Google's free monthly usage, but set a
     budget alert to be safe.
2. **Deploy to Vercel** (free)
   - Import this repo at https://vercel.com/new (framework: Vite, the defaults are fine).
   - Add the environment variable `GOOGLE_MAPS_API_KEY`.
3. **On your Android phone**
   - Open the Vercel URL in Chrome → ⋮ → **Install app** (or "Add to Home screen").
   - In Google Maps: **You → Saved →** open a list **→ Share**, and turn on link
     sharing. Then either paste the link in the app, or pick **wheretoeat** in the
     share sheet.

## Local development

```sh
cp .env.example .env   # add your key
npm install
npm run dev            # serves the app + /api on http://localhost:5173
npm test               # parser tests
```
