-- E2E test accounts in "SchoolDesk Dev Seed". Fixed ids so e2e-cleanup.sql removes exactly these rows.
\set ON_ERROR_STOP on
BEGIN;
SELECT set_config('app.tenant_id', '8ea5da54-aba9-55ab-bac7-662205f376cc', true);
INSERT INTO dbo."Users" ("Id","TenantId","Email","StudentId","Name","IsPlatform","Status","MustSetPassword") VALUES
  ('e2e00000-0000-4000-8000-000000000001','8ea5da54-aba9-55ab-bac7-662205f376cc', NULL, 'DS-A-01', 'Aarav Shah', false, 'active', false),
  ('e2e00000-0000-4000-8000-000000000002','8ea5da54-aba9-55ab-bac7-662205f376cc', 'e2e.parent@schooldesk.test', NULL, 'E2E Test Parent', false, 'active', false);
INSERT INTO dbo."UserRoles" ("UserId","Role") VALUES
  ('e2e00000-0000-4000-8000-000000000001','student'),
  ('e2e00000-0000-4000-8000-000000000002','parent');
INSERT INTO dbo."ParentStudentLinks" ("ParentUserId","StudentId","TenantId") VALUES
  ('e2e00000-0000-4000-8000-000000000002','babfce85-ed57-51ee-b8d4-d6b7ec2c4509','8ea5da54-aba9-55ab-bac7-662205f376cc'),
  ('e2e00000-0000-4000-8000-000000000002','b729857a-c9e6-5041-80ec-064304600950','8ea5da54-aba9-55ab-bac7-662205f376cc');
COMMIT;
