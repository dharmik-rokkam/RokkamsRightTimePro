# Rokkam's Right Time

Daily auspicious-timing (panchang) planner for any city DrikPanchang supports (Muscat, Oman by default; pick another from the location search in the header, and it is remembered in the browser). For any date it shows the panchang, auspicious and inauspicious periods, clean windows, and ranked time slots for bid submission, contract execution, new ventures and financial activities.

## Stack
Next.js 15 (App Router), React 19, TypeScript, Tailwind 4, `astronomy-engine`, `luxon`.

## Run locally
```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```
No environment variables are required.

## How it works
- `POST /api/panchang` with `{ "date": "YYYY-MM-DD", "location": { lat, lng, name, timezone, elevation, geonameId, city } }` (`app/api/panchang/route.ts`) returns everything the page renders. `location` is optional and defaults to Muscat.
- `GET /api/cities?q=mumb` (`app/api/cities/route.ts`) searches DrikPanchang's own city database, so only cities DrikPanchang has are offered. Each result carries the geoname id the scrape needs.
- `lib/timezone.ts` holds the timezone maths (offsets incl. DST and half-hour zones, local midnight); `lib/LocationContext.tsx` gives components the selected city's timezone.
- `lib/calculations/*` computes tithi, nakshatra, yoga, karana, vara, sun/moon times and the muhurtas.
- `lib/businessMuhurta.ts`, `lib/categoryScore.ts` and `lib/rankedSlots.ts` score and rank the time slots.
- `components/*` and `app/globals.css` hold the UI and the dark/light theme.

## Known dependency
Baana, Bhadra, Vidal Yoga, Varjyam, Dur Muhurta, Amrit Kalam and all special yogas are read from DrikPanchang for the selected city at request time (`lib/drikpanchang.ts`, cached 24 hours). If that fetch is blocked, fails, or returns a page for a different city, the computed values are used where available, the special-yogas section shows "Not observed today", and the page shows a small notice.

## Deploy
Import the repository into Vercel as a Next.js project. No configuration or environment variables are needed.
