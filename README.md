# Classroom Survey

A mobile-friendly web app for quick in-class surveys. An instructor prepares a survey, shows a QR code, and students answer from their phones. Students do not create accounts.

The live site is [https://classroom-survey.eshisrivastava93.workers.dev](https://classroom-survey.eshisrivastava93.workers.dev).

The assignment documents in this folder are the source of truth:

- `Classroom_Survey_Web_App_Specification.md`
- `TODO.md`
- `DATABASE.md`
- `API.md`
- `UI.md`

`DEVELOPMENT_SUMMARY.md` and `AI_DEVELOPMENT_HISTORY.md` describe how the app was built. Phase 16 is not part of this version.

## Requirements

- Node.js 22 or newer
- npm
- A Supabase project with one instructor user

## Setup

```bash
npm install
cp .env.example .env.local
```

`.env.local` is ignored by git. Put the project URL and the public anon key in it. Vite reads those values when the app starts or when it builds. They are not secret in the way a service-role key is, but they still should not be committed.

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | The Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | The public anon key |

Use only the anon key in this app. Do not put the Supabase `service_role` key in `.env.local`, in GitHub, or in Cloudflare. That key bypasses the database rules.

## Database

Apply the schema once, in the Supabase SQL Editor, as the database owner:

1. Open `supabase/migrations/20261106020000_initial_schema.sql`.
2. Paste the whole file into a new query and run it.
3. In **Authentication → Sign In / Providers**, turn off public sign-up.
4. Create one instructor user and confirm the email if Supabase asks.

Any signed-in user can read and change every survey, because the policies treat every authenticated user as the instructor. Public sign-up has to stay off.

The migration creates `surveys`, `questions`, `choices`, `responses`, and `answers`, plus the functions `activate_survey`, `close_survey`, `get_public_survey_status`, and `submit_survey_response`. No later migration is required.

`supabase/verify_phase2.sql` is a separate check. It inserts sample rows, prints 22 results, and rolls back. It does not replace the migration.

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

## Routes

| Path | Who can open it |
| --- | --- |
| `/` | Anyone. Landing page with Instructor Login. |
| `/login` | Anyone. Supabase email and password sign-in. |
| `/dashboard` | Signed-in instructor. |
| `/surveys/new` and `/surveys/:id/edit` | Signed-in instructor. |
| `/surveys/:id/present` | Signed-in instructor. QR code and public URL. |
| `/surveys/:id/results` | Signed-in instructor. Counts, charts, and CSV. |
| `/s/:slug` | Anyone. The student page. The slug is not the survey id. |

`src/lib/supabase.ts` creates the client from the two environment variables. Survey rows and responses live in Supabase. The browser stores only an anonymous submission token in `localStorage`.

## Deployment

The source is on GitHub at [https://github.com/eshi999/classroom-survey](https://github.com/eshi999/classroom-survey).

The specification names Cloudflare Pages. The site that is actually online is a Cloudflare Worker at the URL above. This repository does not contain `wrangler.toml` or a Pages `_redirects` file. The Worker is already set up so `/login`, `/dashboard`, `/s/:slug`, and unknown paths return `index.html`. The React router takes over after that.

To publish a new version:

1. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the environment used for the build. Vite copies them into the JavaScript bundle. A value added only after `npm run build` does not reach the site.
2. Run `npm run build`.
3. Deploy the `dist` directory to the same Worker, and keep the single-page fallback that serves `index.html` for client-side routes.

Do not deploy the service-role key.

## What is not verified yet

Instructor login works on the live site. These checks have not been completed: creating and presenting a survey in production, a real student submission, the duplicate-submission screen, results, a CSV opened in a spreadsheet, and a QR code whose link uses the production host. `TODO.md` leaves those boxes unchecked.
