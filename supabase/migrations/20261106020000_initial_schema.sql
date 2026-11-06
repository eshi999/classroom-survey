-- Classroom Survey, Phase 2 schema.
-- Run this whole file once in the Supabase SQL Editor.
-- It creates the tables, security rules, and database functions.
-- It does not insert surveys or instructor accounts.

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.surveys (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    status text not null default 'draft'
        check (status in ('draft', 'active', 'closed', 'archived')),
    public_slug text unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint surveys_title_not_blank check (length(btrim(title)) > 0),
    constraint surveys_public_slug_format check (
        public_slug is null
        or public_slug ~ '^[a-z0-9]{8,32}$'
    )
);

create table public.questions (
    id uuid primary key default gen_random_uuid(),
    survey_id uuid not null references public.surveys (id) on delete cascade,
    question_text text not null,
    question_type text not null
        check (question_type in ('multiple_choice', 'true_false')),
    position integer not null,
    created_at timestamptz not null default now(),
    constraint questions_text_not_blank check (length(btrim(question_text)) > 0),
    constraint questions_position_positive check (position >= 1)
);

create table public.choices (
    id uuid primary key default gen_random_uuid(),
    question_id uuid not null references public.questions (id) on delete cascade,
    choice_text text not null,
    position integer not null,
    created_at timestamptz not null default now(),
    constraint choices_text_not_blank check (length(btrim(choice_text)) > 0),
    constraint choices_position_positive check (position >= 1)
);

create table public.responses (
    id uuid primary key default gen_random_uuid(),
    survey_id uuid not null references public.surveys (id) on delete cascade,
    anonymous_token text,
    submitted_at timestamptz not null default now(),
    constraint responses_token_length check (
        anonymous_token is null
        or (
            char_length(anonymous_token) between 16 and 128
            and anonymous_token = btrim(anonymous_token)
        )
    )
);

create table public.answers (
    id uuid primary key default gen_random_uuid(),
    response_id uuid not null references public.responses (id) on delete cascade,
    question_id uuid not null references public.questions (id) on delete cascade,
    choice_id uuid references public.choices (id) on delete set null,
    text_answer text,
    created_at timestamptz not null default now(),
    unique (response_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index surveys_status_idx on public.surveys (status);

create unique index only_one_active_survey
    on public.surveys ((status))
    where status = 'active';

create index questions_survey_id_idx on public.questions (survey_id);

create index choices_question_id_idx on public.choices (question_id);

create index responses_survey_id_idx on public.responses (survey_id);

create index responses_submitted_at_idx on public.responses (submitted_at);

create unique index responses_unique_student_per_survey
    on public.responses (survey_id, anonymous_token)
    where anonymous_token is not null;

create index answers_response_id_idx on public.answers (response_id);

create index answers_question_id_idx on public.answers (question_id);

create index answers_choice_id_idx on public.answers (choice_id);

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- This is not a student-facing function. It runs only when a survey row changes.
-- ---------------------------------------------------------------------------

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
    new.updated_at = pg_catalog.now();
    return new;
end;
$$;

create trigger surveys_updated_at
before update on public.surveys
for each row
execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- No policy means no access. Anonymous users get select policies only for
-- active survey content. They get no policies on responses or answers.
-- ---------------------------------------------------------------------------

alter table public.surveys enable row level security;
alter table public.questions enable row level security;
alter table public.choices enable row level security;
alter table public.responses enable row level security;
alter table public.answers enable row level security;

alter table public.surveys force row level security;
alter table public.questions force row level security;
alter table public.choices force row level security;
alter table public.responses force row level security;
alter table public.answers force row level security;

create policy "students read active surveys"
on public.surveys
for select
to anon
using (status = 'active');

create policy "students read active survey questions"
on public.questions
for select
to anon
using (
    exists (
        select 1
        from public.surveys
        where surveys.id = questions.survey_id
          and surveys.status = 'active'
    )
);

create policy "students read active survey choices"
on public.choices
for select
to anon
using (
    exists (
        select 1
        from public.questions
        join public.surveys on surveys.id = questions.survey_id
        where questions.id = choices.question_id
          and surveys.status = 'active'
    )
);

create policy "authenticated users manage surveys"
on public.surveys
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users manage questions"
on public.questions
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users manage choices"
on public.choices
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users manage responses"
on public.responses
for all
to authenticated
using (true)
with check (true);

create policy "authenticated users manage answers"
on public.answers
for all
to authenticated
using (true)
with check (true);

revoke all on table public.surveys from public, anon, authenticated;
revoke all on table public.questions from public, anon, authenticated;
revoke all on table public.choices from public, anon, authenticated;
revoke all on table public.responses from public, anon, authenticated;
revoke all on table public.answers from public, anon, authenticated;

grant select on table public.surveys to anon;
grant select on table public.questions to anon;
grant select on table public.choices to anon;

grant select, insert, update, delete on table public.surveys to authenticated;
grant select, insert, update, delete on table public.questions to authenticated;
grant select, insert, update, delete on table public.choices to authenticated;
grant select, insert, update, delete on table public.responses to authenticated;
grant select, insert, update, delete on table public.answers to authenticated;

grant select, insert, update, delete on table public.surveys to service_role;
grant select, insert, update, delete on table public.questions to service_role;
grant select, insert, update, delete on table public.choices to service_role;
grant select, insert, update, delete on table public.responses to service_role;
grant select, insert, update, delete on table public.answers to service_role;

-- ---------------------------------------------------------------------------
-- activate_survey
-- Security invoker: the signed-in instructor's own permissions are used.
-- Anonymous users cannot run it, and Row Level Security still applies.
-- ---------------------------------------------------------------------------

create or replace function public.activate_survey(p_survey_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
    v_slug text;
    v_existing text;
    v_attempt integer;
begin
    if auth.uid() is null then
        raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
    end if;

    if p_survey_id is null then
        raise exception 'SURVEY_NOT_FOUND';
    end if;

    perform id
    from public.surveys
    where status = 'active' or id = p_survey_id
    order by id
    for update;

    select public_slug
    into v_existing
    from public.surveys
    where id = p_survey_id;

    if not found then
        raise exception 'SURVEY_NOT_FOUND';
    end if;

    if v_existing is null then
        v_slug := null;
        for v_attempt in 1..5 loop
            v_slug := substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 12);
            exit when not exists (
                select 1
                from public.surveys
                where public_slug = v_slug
            );
            v_slug := null;
        end loop;

        if v_slug is null then
            raise exception 'SLUG_GENERATION_FAILED';
        end if;
    else
        v_slug := v_existing;
    end if;

    update public.surveys
    set status = 'closed'
    where status = 'active'
      and id <> p_survey_id;

    update public.surveys
    set status = 'active',
        public_slug = v_slug
    where id = p_survey_id;

    return jsonb_build_object(
        'id', p_survey_id,
        'status', 'active',
        'public_slug', v_slug
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- close_survey
-- Security invoker, same reason as activate_survey.
-- Closing is allowed only from active. Closing an already closed survey
-- returns success without changing anything else.
-- ---------------------------------------------------------------------------

create or replace function public.close_survey(p_survey_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
    v_status text;
begin
    if auth.uid() is null then
        raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
    end if;

    if p_survey_id is null then
        raise exception 'SURVEY_NOT_FOUND';
    end if;

    select status
    into v_status
    from public.surveys
    where id = p_survey_id
    for update;

    if not found then
        raise exception 'SURVEY_NOT_FOUND';
    end if;

    if v_status = 'closed' then
        return jsonb_build_object('id', p_survey_id, 'status', 'closed');
    end if;

    if v_status <> 'active' then
        raise exception 'SURVEY_NOT_ACTIVE';
    end if;

    update public.surveys
    set status = 'closed'
    where id = p_survey_id;

    return jsonb_build_object('id', p_survey_id, 'status', 'closed');
end;
$$;

-- ---------------------------------------------------------------------------
-- get_public_survey_status
-- Security definer: this must read closed and archived surveys, which anonymous
-- users are not allowed to select directly. It returns only id, status, and
-- title. It does not return questions, choices, responses, or answers.
-- A draft, a blank slug, or an unknown slug all look the same: not found.
-- ---------------------------------------------------------------------------

create or replace function public.get_public_survey_status(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
    v_id uuid;
    v_status text;
    v_title text;
begin
    if p_slug is null or p_slug !~ '^[a-z0-9]{8,32}$' then
        return jsonb_build_object('found', false);
    end if;

    select id, status, title
    into v_id, v_status, v_title
    from public.surveys
    where public_slug = p_slug;

    if not found or v_status = 'draft' then
        return jsonb_build_object('found', false);
    end if;

    return jsonb_build_object(
        'found', true,
        'survey_id', v_id,
        'status', v_status,
        'title', v_title
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_survey_response
-- Security definer: anonymous users cannot insert responses directly.
-- This function checks the survey, questions, choices, and duplicate token,
-- then writes the response and every answer in this same transaction.
-- A missing survey and a survey that is not active return the same error,
-- so guessing an id does not reveal unpublished surveys.
-- ---------------------------------------------------------------------------

create or replace function public.submit_survey_response(
    p_survey_id uuid,
    p_anonymous_token text,
    p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
    v_status text;
    v_token text;
    v_question_count integer;
    v_response_id uuid;
    v_item jsonb;
    v_question_text text;
    v_choice_text text;
    v_question_id uuid;
    v_choice_id uuid;
    v_seen uuid[] := '{}';
begin
    if p_survey_id is null then
        raise exception 'SURVEY_NOT_ACTIVE';
    end if;

    v_token := btrim(coalesce(p_anonymous_token, ''));
    if char_length(v_token) < 16 or char_length(v_token) > 128 then
        raise exception 'INVALID_TOKEN';
    end if;

    if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
        raise exception 'MISSING_REQUIRED_ANSWER';
    end if;

    if jsonb_array_length(p_answers) > 50 then
        raise exception 'TOO_MANY_ANSWERS';
    end if;

    select status
    into v_status
    from public.surveys
    where id = p_survey_id
    for update;

    if not found or v_status is distinct from 'active' then
        raise exception 'SURVEY_NOT_ACTIVE';
    end if;

    if exists (
        select 1
        from public.responses
        where survey_id = p_survey_id
          and anonymous_token = v_token
    ) then
        raise exception 'DUPLICATE_RESPONSE';
    end if;

    select count(*)
    into v_question_count
    from public.questions
    where survey_id = p_survey_id;

    if v_question_count = 0 then
        raise exception 'SURVEY_HAS_NO_QUESTIONS';
    end if;

    for v_item in
        select value
        from jsonb_array_elements(p_answers)
    loop
        v_question_text := v_item ->> 'question_id';
        v_choice_text := v_item ->> 'choice_id';

        if v_question_text is null
            or v_question_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then
            raise exception 'INVALID_QUESTION';
        end if;

        if v_choice_text is null
            or v_choice_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then
            raise exception 'INVALID_CHOICE';
        end if;

        v_question_id := v_question_text::uuid;
        v_choice_id := v_choice_text::uuid;

        if v_question_id = any (v_seen) then
            raise exception 'INVALID_QUESTION';
        end if;
        v_seen := array_append(v_seen, v_question_id);

        if not exists (
            select 1
            from public.questions
            where id = v_question_id
              and survey_id = p_survey_id
        ) then
            raise exception 'INVALID_QUESTION';
        end if;

        if not exists (
            select 1
            from public.choices
            where id = v_choice_id
              and question_id = v_question_id
        ) then
            raise exception 'INVALID_CHOICE';
        end if;
    end loop;

    if cardinality(v_seen) <> v_question_count then
        raise exception 'MISSING_REQUIRED_ANSWER';
    end if;

    insert into public.responses (survey_id, anonymous_token)
    values (p_survey_id, v_token)
    returning id into v_response_id;

    insert into public.answers (response_id, question_id, choice_id)
    select
        v_response_id,
        (item ->> 'question_id')::uuid,
        (item ->> 'choice_id')::uuid
    from jsonb_array_elements(p_answers) as item;

    return jsonb_build_object(
        'success', true,
        'response_id', v_response_id
    );
exception
    when unique_violation then
        raise exception 'DUPLICATE_RESPONSE';
end;
$$;

revoke all on function public.update_updated_at_column() from public, anon, authenticated;
grant execute on function public.update_updated_at_column() to authenticated, service_role;

revoke all on function public.activate_survey(uuid) from public, anon, authenticated;
grant execute on function public.activate_survey(uuid) to authenticated, service_role;

revoke all on function public.close_survey(uuid) from public, anon, authenticated;
grant execute on function public.close_survey(uuid) to authenticated, service_role;

revoke all on function public.get_public_survey_status(text) from public, anon, authenticated;
grant execute on function public.get_public_survey_status(text) to anon, authenticated, service_role;

revoke all on function public.submit_survey_response(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_survey_response(uuid, text, jsonb) to anon, authenticated, service_role;

comment on function public.activate_survey(uuid) is
    'Instructor only. Closes the current active survey, then activates the selected survey.';

comment on function public.close_survey(uuid) is
    'Instructor only. Closes the active survey so student submissions stop.';

comment on function public.get_public_survey_status(text) is
    'Public lookup by slug. Returns status and title only, never responses or answers.';

comment on function public.submit_survey_response(uuid, text, jsonb) is
    'Anonymous submission. Validates the active survey and writes the response atomically.';

commit;
