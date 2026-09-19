# Rokkam's Right Time

Daily auspicious-timing (panchang) planner for **Muscat, Oman (UTC+4)**. For any date it shows the panchang, auspicious and inauspicious periods, clean windows, and ranked time slots for bid submission, contract execution, new ventures and financial activities.

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
- `POST /api/panchang` with `{ "date": "YYYY-MM-DD" }` (`app/api/panchang/route.ts`) returns everything the page renders.
- `lib/calculations/*` computes tithi, nakshatra, yoga, karana, vara, sun/moon times and the muhurtas.
- `lib/businessMuhurta.ts`, `lib/categoryScore.ts` and `lib/rankedSlots.ts` score and rank the time slots.
- `components/*` and `app/globals.css` hold the UI and the dark/light theme.

## Known dependency
Baana, Bhadra, Vidal Yoga, Varjyam, Dur Muhurta, Amrit Kalam and all special yogas are read from DrikPanchang at request time (`lib/drikpanchang.ts`, cached 24 hours). If that fetch is blocked or fails, the computed values are used where available, and the special-yogas section shows "Not observed today".

## Deploy
Import the repository into Vercel as a Next.js project. No configuration or environment variables are needed.
