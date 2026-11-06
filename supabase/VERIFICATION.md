# Phase 2 verification

This guide checks the database schema and security rules. It does not build the login page. That is Phase 3.

The React app already reads these names from the environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not put the Supabase service-role key in `.env.local`, in Cloudflare, or in the browser. That key skips the security rules.

## 1. Apply the migration

1. Open your Supabase project.
2. Go to **SQL Editor** → **New query**.
3. Copy the entire file `supabase/migrations/20261106020000_initial_schema.sql`.
4. Paste it and run it once.

You should see a success message. The file ends with `commit`, so a failure undoes the whole change.

Run it in the Supabase SQL Editor, which uses the database owner. Do not run it as the anonymous student role.

## 2. Turn off public sign-up

Any signed-in user can read and delete every survey and every response. Before real classroom use:

1. In Supabase, open **Authentication** → **Sign In / Providers**.
2. Turn off public sign-up.
3. Create only your instructor user, and confirm the email if Supabase asks.

The login screen itself is Phase 3. This setting is still worth doing now.

## 3. Run the database checks

1. Open another SQL Editor query.
2. Copy the entire file `supabase/verify_phase2.sql`.
3. Paste it and run it.

The script builds sample surveys, tests student and instructor permissions, prints a result table, and then runs `ROLLBACK`. The sample rows are removed.

Every row should show `passed = true`. There are 22 checks, plus a `99` row only if the script stops early. Read the `detail` column for any row that says `passed = false`.

| Check | What a pass means |
| --- | --- |
| 01 | A question type other than multiple choice or true/false is rejected. |
| 02 | A second active survey is rejected. |
| 03–05 | An anonymous student sees only the active survey, its question, and its choices. |
| 06 | A closed survey's public link reports `closed` and does not include responses. |
| 07–08 | A draft link and an unknown link both report not found. |
| 09 | An anonymous submission to the active survey succeeds. |
| 10 | The same browser token cannot submit twice. |
| 11–13 | A bad choice, a missing answer, and a draft survey are rejected. |
| 14–16 | An anonymous student cannot read or directly insert responses or answers. |
| 17 | An anonymous student cannot activate a survey. |
| 18 | A signed-in instructor can read responses. |
| 19–21 | Activation switches the single active survey, keeps an existing public slug, and close works. |
| 22 | A submission after close is rejected. |

## 4. Run the browser-client checks

Do this after step 1, from the project folder. Node 22 loads `.env.local` without printing it.

```bash
node --env-file=.env.local --input-type=module <<'EOF'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
)

const responses = await supabase.from('responses').select('*')
const answers = await supabase.from('answers').select('*')
const surveys = await supabase.from('surveys').select('id, title, status')
const missing = await supabase.rpc('get_public_survey_status', {
  p_slug: 'missing123456',
})
const submit = await supabase.rpc('submit_survey_response', {
  p_survey_id: '22222222-2222-4222-8222-222222222222',
  p_anonymous_token: 'token-token-token-client',
  p_answers: [],
})
const activate = await supabase.rpc('activate_survey', {
  p_survey_id: '11111111-1111-4111-8111-111111111111',
})

console.log('responses', responses.error?.code ?? 'no error', responses.data?.length ?? null)
console.log('answers', answers.error?.code ?? 'no error', answers.data?.length ?? null)
console.log('surveys', surveys.error?.code ?? 'no error', surveys.data?.length ?? null)
console.log('missing slug', missing.data, missing.error?.message ?? null)
console.log('submit', submit.data, submit.error?.message ?? null)
console.log('activate', activate.data, activate.error?.message ?? null)
EOF
```

Expected results with the anon key:

- `responses` and `answers` report an error, not a list of student answers. Permission denied is code `42501`.
- `surveys` succeeds. The list contains only surveys whose status is `active`. It can be empty.
- `missing slug` returns `{"found": false}`.
- `submit` returns an error containing `SURVEY_NOT_ACTIVE`, because that sample id is not an active survey in the real project.
- `activate` returns an error. The anonymous key is not allowed to run that function.

## 5. What the two privileged functions are allowed to do

`get_public_survey_status` and `submit_survey_response` run with the database owner's power because anonymous students are not allowed to read closed surveys or insert answers directly.

`get_public_survey_status` can read the `surveys` table, but its return value is only found/not found, status, id, and title. It has no query against `responses` or `answers`.

`submit_survey_response` can insert one response and its answers only after it checks that the survey is active, the token is usable, every question belongs to that survey, every choice belongs to that question, and the token has not already been used. The insert is one transaction. If any check fails, nothing is saved.

`activate_survey` and `close_survey` do not use that extra power. They run as the signed-in instructor, so the row security rules still apply. Anonymous users are not granted permission to run them.

## 6. TODO status

The schema file now contains the tables, keys, indexes, timestamps, status checks, and row security policies. The live checks in `TODO.md` stay open until sections 3 and 4 pass on your Supabase project.
