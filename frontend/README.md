# Frontend

Vite + React + TypeScript + Tailwind CSS v4. Talks to the FastAPI backend in `../backend`.

## Run locally

```
npm install
cp .env.example .env.local   # set VITE_API_URL if the backend isn't on localhost:8000
npm run dev
```

Backend must be running (`cd ../backend && uvicorn app.main:app --reload`) for data to load — there is no mock mode.

## Pages

- `/` — submit a bug, triggers the agent pipeline
- `/bugs/:id` — agent execution path + full triage result
- `/dashboard` — aggregate stats and charts
- `/history` — all submitted bugs, filterable by severity

## Deploy (Vercel)

1. `vercel.json` already has the SPA rewrite needed for client-side routing.
2. Set `VITE_API_URL` in the Vercel project's environment variables to the deployed backend URL.
3. `vercel --prod` from this folder, or connect the repo in the Vercel dashboard with root directory `frontend`.
