# Medicine Inventory: HealthPlus

Hospital dispensary / medicine inventory management demo for **HealthPlus**.

## Stack

Vue 3 · Vite · TypeScript · Tailwind CSS · Vue Router · Pinia · Firebase · Lucide · Chart.js · jsPDF · date-fns

## Architecture

```
UI → Pages → Composables → Services → Repositories → Firebase
```

Do not call Firebase from components. Keep business rules out of templates.

## Scripts

```bash
npm install
npm run dev
npm run build
```

## Environment

Copy `.env.example` to `.env.local` when wiring Firebase. Persistence is intentionally not implemented in this foundation phase.


Deployed on https://healthplus-mims.vercel.app/
