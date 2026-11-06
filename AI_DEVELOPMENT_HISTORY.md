# AI development history

This file records the Cursor conversation that produced this repository. It does not add prompts or test results that were not part of that work.

The source files Cursor was told to follow were `Classroom_Survey_Web_App_Specification.md`, `TODO.md`, `DATABASE.md`, `API.md`, and `UI.md`.

## 1. Read the specifications

Prompt: read all five files, explain the architecture and the required stack, list ambiguities, compare `TODO.md` with the empty project, propose a phase plan, explain the manual Supabase, GitHub, and Cloudflare setup, name the tests, explain the five tables, and record design decisions. Do not write code, install packages, mark tasks done, or invent credentials. Stop at the exact Phase 1 step.

Cursor did not change the project. It described a React site talking directly to Supabase, with Cloudflare hosting the static files and GitHub holding the source. It treated existing TODO checks as unproven because no app files existed yet.

## 2. Phase 1

Prompt: implement only Phase 1 in the existing directory, keep the Markdown files, add Vite with React and TypeScript, Tailwind, React Router, the Supabase client, Recharts, and a QR package, add a landing page and placeholder routes, read keys from the environment, add `.env.example` and `.gitignore`, configure lint and formatting, write a README, and correct the TODO boxes. Then run `npm run build` and `npm run lint`. Do not build the database or login.

What happened:

- The folder was not empty, so the Vite app was scaffolded in a temporary directory and copied in without deleting the specs.
- The Vite template installed TypeScript 7 and Oxlint. `typescript-eslint` 8.72 accepts TypeScript below 6.1, so TypeScript was pinned to 6.0.3, Oxlint was removed, and ESLint became the lint command.
- Prettier failed on `.env.example` because that file has no parser. `.prettierignore` now ignores `.env` and `.env.*`.
- `npm run build` and `npm run lint` passed.
- The Phase 1 boxes were checked. Later phases were left open.
- I committed this as “Complete Phase 1 project setup” and pushed it to `https://github.com/eshi999/classroom-survey`.

The local dev server used for the landing-page check was later stopped.

## 3. Phase 2

Prompt: implement only the database. Add one versioned migration for the five tables, foreign keys, indexes, timestamps, cascades, status and question-type checks, one active survey, row level security, and the functions `activate_survey`, `close_survey`, `submit_survey_response`, and a public status lookup. Anonymous users may read only an active survey and may submit only through the function. Do not print secrets, do not change the React app into a new stack, and do not start Phase 3. Run build and lint.

Cursor added:

- `supabase/migrations/20261106020000_initial_schema.sql`
- `supabase/verify_phase2.sql`
- `supabase/VERIFICATION.md`

Docker was not available on this machine, so the migration was not executed locally. I ran it in the Supabase SQL Editor. I then ran `verify_phase2.sql` and told Cursor that all 22 tests passed.

## 4. Live security checks

Prompt: the migration is applied and the 22 SQL tests passed. Explain what those tests prove, and give a procedure for the anonymous key and for an instructor session. Do not treat SQL role switching as a browser-client test. Do not expose secrets. Update `TODO.md` only for checks that passed. Do not start Phase 3.

The anonymous client, after a fixture survey existed, returned only an active survey, one question, and two choices. Submit succeeded. The repeat submit returned `DUPLICATE_RESPONSE`. Selecting `responses` returned `42501`. Calling `activate_survey` as the anonymous key was denied.

The first instructor command failed. I used `read -p` in zsh, which printed `read: -p: no coprocess` and left the email and password empty. Supabase returned “missing email or phone.” I reran it with zsh `read "VAR?prompt"`. The script then signed in, listed `active`, `closed`, and `draft`, read one response, and updated a draft description. Create and delete were not in the script.

Cursor checked the anonymous read, anonymous submit, and “students cannot read results” boxes. It left “Verify authenticated instructors have full access” unchecked. Build and lint passed again. I committed and pushed this as “Complete Phase 2 database setup and verification.”

## 5. Phases 3 through 13

Prompt: implement Phases 3 through 13 in order on the existing React app and the applied schema. Use the real Supabase RPCs. Do not change the working migration unless a new one is explained. Do not expose the service-role key. Do not let anonymous users read results or edit surveys. Keep historical responses. Do not add Phase 16. Add practical tests, run build and lint, and check TODO boxes only when a feature was implemented and verified. The same request was still in progress after the chat context was compacted, and the work continued from the pages that had not been wired yet.

Cursor added the auth provider, protected routes, dashboard, editor, presentation page, student page, results page, CSV helpers, and Vitest tests for validation, percentages, dates, and CSV escaping. It did not edit the applied SQL file.

Checks that were actually run:

- `npm test`: 4 files, 9 tests, passed. The results test expects 45 of 52 to display as 86.5 and expects an unanswered response to be counted. The CSV test checks quoting and a leading apostrophe on cells that start with `=`, `+`, `-`, `@`.
- `npm run build` and `npm run lint` passed. ESLint first failed on `react-hooks/set-state-in-effect` in `AuthProvider` and `DashboardPage`. The config error was moved out of the effect, and the dashboard load no longer sets state synchronously inside the effect. Lint then passed. Prettier was run on the new files so `format:check` passed.
- In the browser, while signed out: the landing page, the empty-login message, a wrong password showing “Email or password is incorrect.”, `/dashboard` and `/surveys/new` redirecting to `/login`, `/s/notarealslug` showing “Survey not found.”, and an unknown path showing “Page not found.” The login page was also viewed at a phone width.
- A later anonymous query found no visible surveys. The earlier fixture rows were gone, so the student form, a closed-survey message, and a second submit from the page were not exercised.
- Logout, the instructor email on the dashboard, creating a survey, activation, the QR page, results, and CSV download were not clicked in that session.

I committed and pushed this as “Implement classroom survey full stack application.”

## 6. Deployment

I deployed the built site to Cloudflare at https://classroom-survey.eshisrivastava93.workers.dev and confirmed that instructor login works there. A request to `/`, `/login`, `/dashboard`, `/s/notarealslug`, and an unknown path each returned HTTP 200 and the same `index.html` shell, so the Worker is serving the client-side routes. The repository still has no `wrangler.toml` and no Pages `_redirects` file. The spec’s Pages checkboxes stay open because this hostname is a Worker, and I did not record a GitHub-to-Pages connection.

Production QR links, a production student submission, and production results were not tested.

## 7. What is still open

These are implemented in code or listed in the spec, and they are not marked complete:

- Instructor create and delete were not part of the authenticated client test.
- Logout and the signed-in email on the dashboard were not clicked.
- The student page’s active, closed, success, and duplicate states were not clicked. The database uniqueness rule and the RPC duplicate error were tested earlier.
- Survey creation, editing, activation, closing, QR links, live results, and CSV export were not run through in a browser. The CSV unit test does not open a spreadsheet.
- Mobile layout was checked for the login page only. Two browsers were not compared. Keyboard navigation of the instructor pages was not completed.
- Production still needs a QR code that points at the workers.dev host, one student submission, and one results check.
- The spec’s project tree names `SPEC.md`. The file in this folder is `Classroom_Survey_Web_App_Specification.md`.
- Phase 16 was intentionally not built.
