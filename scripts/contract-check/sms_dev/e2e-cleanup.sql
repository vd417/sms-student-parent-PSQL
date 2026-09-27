-- Removes only the E2E test accounts created by e2e-seed.sql (and their refresh tokens / settings if any).
\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('app.tenant_id', '8ea5da54-aba9-55ab-bac7-662205f376cc', true);
DELETE FROM dbo."ParentStudentLinks" WHERE "ParentUserId" = 'e2e00000-0000-4000-8000-000000000002';
DELETE FROM dbo."UserRoles" WHERE "UserId" IN ('e2e00000-0000-4000-8000-000000000001','e2e00000-0000-4000-8000-000000000002');
DELETE FROM dbo."Users" WHERE "Id" IN ('e2e00000-0000-4000-8000-000000000001','e2e00000-0000-4000-8000-000000000002');
COMMIT;
