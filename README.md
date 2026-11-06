# Classroom Survey

A mobile-friendly web app for quick in-class surveys. Instructors prepare a survey, show a QR code, and students answer from their phones. No student account is required.

This repository currently contains **Phase 1 only**: the React app shell, a landing page, and placeholder routes. Login, the database, and survey features are later phases.

The assignment documents in this folder are the source of truth:

- `Classroom_Survey_Web_App_Specification.md`
- `TODO.md`
- `DATABASE.md`
- `API.md`
- `UI.md`

## Requirements

- Node.js 22 or newer
- npm

## Setup

```bash
npm install
cp .env.example .env.local
```

`.env.local` is ignored by git. Leave the two values empty until you create a Supabase project in Phase 2. The landing page does not need them.

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | The Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | The public anon key |

Use only the anon key in this app. Do not put the Supabase `service_role` key in any frontend environment variable. That key bypasses database security rules.

## Run the app

```bash
npm run dev
```

Open the local address Vite prints, usually `http://localhost:5173`.

Other commands:

```bash
npm run build        # typecheck and create the production site in dist/
npm run preview      # serve the production build locally
npm run lint         # ESLint
npm run format       # rewrite files with Prettier
npm run format:check # check formatting without rewriting
```

## What is included

- `/` is the landing page, with an Instructor Login button.
- `/login`, `/dashboard`, `/surveys/new`, `/surveys/:id/edit`, `/surveys/:id/present`, `/surveys/:id/results`, and `/s/:slug` are placeholders. They do not save data or sign anyone in.
- `src/lib/supabase.ts` reads the environment variables when a later phase asks for a client. It does not contain keys.

## Manual steps still required

Phase 1 does not need a Supabase, GitHub, or Cloudflare account. Those come in later phases:

1. Create a Supabase project, turn off public sign-up, create one instructor user, and paste the project URL and anon key into `.env.local`.
2. Create a GitHub repository and push this project when you are ready to deploy.
3. Create a Cloudflare Pages site from that repository. The build command is `npm run build` and the output directory is `dist`.
