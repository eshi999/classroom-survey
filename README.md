# Classroom Survey

A mobile-friendly web app for quick in-class surveys. Instructors prepare a survey, show a QR code, and students answer from their phones. No student account is required.

The app includes instructor login, survey editing, QR presentation, anonymous student submission, results, and CSV export. Phase 16 enhancements are not included.

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
npm test             # unit tests
npm run lint         # ESLint
npm run format       # rewrite files with Prettier
npm run format:check # check formatting without rewriting
```

## What is included

- `/` is the landing page, with an Instructor Login button.
- `/login` signs the instructor in with Supabase Auth. `/dashboard`, `/surveys/new`, `/surveys/:id/edit`, `/surveys/:id/present`, and `/surveys/:id/results` require that session.
- `/s/:slug` is the public student page. Students do not sign in.
- Survey content and responses are stored in Supabase. The browser stores only an anonymous submission token.
- `src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. It does not contain keys.

## Manual steps still required

1. Apply `supabase/migrations/20261106020000_initial_schema.sql` in the Supabase SQL editor if it is not already applied. No further migration is required for this version.
2. Turn off public sign-up, create one instructor user, and paste the project URL and anon key into `.env.local`.
3. Create a Cloudflare Pages site when you are ready to deploy. The build command is `npm run build` and the output directory is `dist`.
