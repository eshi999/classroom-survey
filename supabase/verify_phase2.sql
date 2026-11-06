-- Phase 2 security checks.
-- Run this only after supabase/migrations/20261106020000_initial_schema.sql.
-- The script inserts temporary rows, prints one result table, then rolls back.
-- Every passed value should be true. No test survey remains after ROLLBACK.

begin;

create temp table phase2_checks (
    step text primary key,
    passed boolean not null,
    detail text not null
);

grant all privileges on table phase2_checks to anon, authenticated;

insert into public.surveys (id, title, description, status, public_slug)
values
    (
        '11111111-1111-4111-8111-111111111111',
        'Draft survey',
        'Hidden from students',
        'draft',
        'draftslug001'
    ),
    (
        '22222222-2222-4222-8222-222222222222',
        'Live survey',
        'Visible to students',
        'active',
        'abcdef123456'
    ),
    (
        '88888888-8888-4888-8888-888888888888',
        'Closed survey',
        'No longer open',
        'closed',
        'closed123456'
    );

insert into public.questions (id, survey_id, question_text, question_type, position)
values
    (
        '33333333-3333-4333-8333-333333333333',
        '22222222-2222-4222-8222-222222222222',
        '2 + 2 = 4',
        'true_false',
        1
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        '11111111-1111-4111-8111-111111111111',
        'Hidden draft question',
        'multiple_choice',
        1
    );

insert into public.choices (id, question_id, choice_text, position)
values
    (
        '55555555-5555-4555-8555-555555555555',
        '33333333-3333-4333-8333-333333333333',
        'True',
        1
    ),
    (
        '66666666-6666-4666-8666-666666666666',
        '33333333-3333-4333-8333-333333333333',
        'False',
        2
    ),
    (
        '77777777-7777-4777-8777-777777777777',
        '44444444-4444-4444-8444-444444444444',
        'Hidden choice',
        1
    );

do $$
begin
    insert into public.questions (
        survey_id,
        question_text,
        question_type,
        position
    )
    values (
        '11111111-1111-4111-8111-111111111111',
        'Bad type',
        'essay',
        2
    );
    insert into phase2_checks
    values ('01 rejects an unknown question type', false, 'insert succeeded');
exception
    when check_violation then
        insert into phase2_checks
        values ('01 rejects an unknown question type', true, sqlerrm);
end;
$$;

do $$
begin
    insert into public.surveys (title, status)
    values ('Second active survey', 'active');
    insert into phase2_checks
    values ('02 allows only one active survey', false, 'insert succeeded');
exception
    when unique_violation then
        insert into phase2_checks
        values ('02 allows only one active survey', true, sqlerrm);
end;
$$;

do $$
declare
    v_count integer;
    v_json jsonb;
    v_status text;
    v_detail text;
begin
    perform set_config(
        'request.jwt.claim.sub',
        '99999999-9999-4999-8999-999999999999',
        true
    );
    perform set_config(
        'request.jwt.claims',
        '{"sub":"99999999-9999-4999-8999-999999999999","role":"authenticated"}',
        true
    );

    set local role anon;

    select count(*) into v_count from public.surveys;
    insert into phase2_checks
    values (
        '03 anonymous user sees only the active survey',
        v_count = 1,
        'visible surveys: ' || v_count::text
    );

    select count(*) into v_count from public.questions;
    insert into phase2_checks
    values (
        '04 anonymous user sees only active-survey questions',
        v_count = 1,
        'visible questions: ' || v_count::text
    );

    select count(*) into v_count from public.choices;
    insert into phase2_checks
    values (
        '05 anonymous user sees only active-survey choices',
        v_count = 2,
        'visible choices: ' || v_count::text
    );

    v_json := public.get_public_survey_status('closed123456');
    insert into phase2_checks
    values (
        '06 closed slug is distinguishable from a missing survey',
        v_json ->> 'found' = 'true'
            and v_json ->> 'status' = 'closed'
            and v_json ->> 'title' = 'Closed survey'
            and not (v_json ? 'response_id'),
        v_json::text
    );

    v_json := public.get_public_survey_status('draftslug001');
    insert into phase2_checks
    values (
        '07 draft slug looks the same as a missing survey',
        v_json = '{"found": false}'::jsonb,
        v_json::text
    );

    v_json := public.get_public_survey_status('missing123456');
    insert into phase2_checks
    values (
        '08 unknown slug reports not found',
        v_json = '{"found": false}'::jsonb,
        v_json::text
    );

    v_json := public.submit_survey_response(
        '22222222-2222-4222-8222-222222222222',
        'token-token-token-1',
        jsonb_build_array(
            jsonb_build_object(
                'question_id', '33333333-3333-4333-8333-333333333333',
                'choice_id', '55555555-5555-4555-8555-555555555555'
            )
        )
    );
    insert into phase2_checks
    values (
        '09 anonymous submission succeeds for the active survey',
        v_json ->> 'success' = 'true' and v_json ? 'response_id',
        v_json::text
    );

    begin
        perform public.submit_survey_response(
            '22222222-2222-4222-8222-222222222222',
            'token-token-token-1',
            jsonb_build_array(
                jsonb_build_object(
                    'question_id', '33333333-3333-4333-8333-333333333333',
                    'choice_id', '55555555-5555-4555-8555-555555555555'
                )
            )
        );
        insert into phase2_checks
        values ('10 duplicate submission is rejected', false, 'second submit succeeded');
    exception
        when others then
            insert into phase2_checks
            values (
                '10 duplicate submission is rejected',
                sqlerrm = 'DUPLICATE_RESPONSE',
                sqlerrm
            );
    end;

    begin
        perform public.submit_survey_response(
            '22222222-2222-4222-8222-222222222222',
            'token-token-token-2',
            jsonb_build_array(
                jsonb_build_object(
                    'question_id', '33333333-3333-4333-8333-333333333333',
                    'choice_id', '99999999-9999-4999-8999-999999999999'
                )
            )
        );
        insert into phase2_checks
        values ('11 choice from another question is rejected', false, 'submit succeeded');
    exception
        when others then
            insert into phase2_checks
            values (
                '11 choice from another question is rejected',
                sqlerrm = 'INVALID_CHOICE',
                sqlerrm
            );
    end;

    begin
        perform public.submit_survey_response(
            '22222222-2222-4222-8222-222222222222',
            'token-token-token-3',
            '[]'::jsonb
        );
        insert into phase2_checks
        values ('12 missing answers are rejected', false, 'submit succeeded');
    exception
        when others then
            insert into phase2_checks
            values (
                '12 missing answers are rejected',
                sqlerrm = 'MISSING_REQUIRED_ANSWER',
                sqlerrm
            );
    end;

    begin
        perform public.submit_survey_response(
            '11111111-1111-4111-8111-111111111111',
            'token-token-token-4',
            '[]'::jsonb
        );
        insert into phase2_checks
        values ('13 draft survey rejects submissions', false, 'submit succeeded');
    exception
        when others then
            insert into phase2_checks
            values (
                '13 draft survey rejects submissions',
                sqlerrm = 'SURVEY_NOT_ACTIVE',
                sqlerrm
            );
    end;

    begin
        perform 1 from public.responses;
        insert into phase2_checks
        values ('14 anonymous user cannot read responses', false, 'select succeeded');
    exception
        when insufficient_privilege then
            insert into phase2_checks
            values ('14 anonymous user cannot read responses', true, sqlerrm);
    end;

    begin
        perform 1 from public.answers;
        insert into phase2_checks
        values ('15 anonymous user cannot read answers', false, 'select succeeded');
    exception
        when insufficient_privilege then
            insert into phase2_checks
            values ('15 anonymous user cannot read answers', true, sqlerrm);
    end;

    begin
        insert into public.responses (survey_id, anonymous_token)
        values (
            '22222222-2222-4222-8222-222222222222',
            'direct-insert-token'
        );
        insert into phase2_checks
        values ('16 anonymous user cannot insert responses', false, 'insert succeeded');
    exception
        when insufficient_privilege then
            insert into phase2_checks
            values ('16 anonymous user cannot insert responses', true, sqlerrm);
    end;

    begin
        perform public.activate_survey('11111111-1111-4111-8111-111111111111');
        insert into phase2_checks
        values ('17 anonymous user cannot activate a survey', false, 'activate succeeded');
    exception
        when others then
            insert into phase2_checks
            values (
                '17 anonymous user cannot activate a survey',
                sqlerrm like '%AUTHENTICATION_REQUIRED%'
                    or sqlerrm like '%permission denied%',
                sqlerrm
            );
    end;

    reset role;

    set local role authenticated;

    select count(*) into v_count from public.responses;
    insert into phase2_checks
    values (
        '18 signed-in instructor can read responses',
        v_count = 1,
        'responses: ' || v_count::text
    );

    v_json := public.activate_survey('11111111-1111-4111-8111-111111111111');
    select status into v_status
    from public.surveys
    where id = '22222222-2222-4222-8222-222222222222';
    insert into phase2_checks
    values (
        '19 activation closes the previous survey and reuses a slug',
        v_json ->> 'status' = 'active'
            and v_json ->> 'public_slug' = 'draftslug001'
            and v_status = 'closed',
        v_json::text || '; previous status=' || coalesce(v_status, 'null')
    );

    select count(*) into v_count
    from public.surveys
    where status = 'active';
    insert into phase2_checks
    values (
        '20 exactly one survey is active after activation',
        v_count = 1,
        'active surveys: ' || v_count::text
    );

    v_json := public.close_survey('11111111-1111-4111-8111-111111111111');
    insert into phase2_checks
    values (
        '21 instructor can close the active survey',
        v_json ->> 'status' = 'closed',
        v_json::text
    );

    reset role;
    set local role anon;

    begin
        perform public.submit_survey_response(
            '11111111-1111-4111-8111-111111111111',
            'token-token-token-5',
            jsonb_build_array(
                jsonb_build_object(
                    'question_id', '44444444-4444-4444-8444-444444444444',
                    'choice_id', '77777777-7777-4777-8777-777777777777'
                )
            )
        );
        insert into phase2_checks
        values ('22 closed survey rejects a new submission', false, 'submit succeeded');
    exception
        when others then
            insert into phase2_checks
            values (
                '22 closed survey rejects a new submission',
                sqlerrm = 'SURVEY_NOT_ACTIVE',
                sqlerrm
            );
    end;

    reset role;
exception
    when others then
        reset role;
        get stacked diagnostics v_detail = message_text;
        insert into phase2_checks
        values ('99 verification script stopped early', false, v_detail);
end;
$$;

select step, passed, detail
from phase2_checks
order by step;

rollback;
