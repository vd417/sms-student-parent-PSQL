# sms_dev E2E test-account scripts

`e2e-seed.sql` creates two accounts in the "SchoolDesk Dev Seed" school, with fixed ids so they
can be cleaned up exactly: student `DS-A-01` and parent `e2e.parent@schooldesk.test` (linked to
both `DS-A-01` and `DS-A-02`).

Run it with `psql` as the `sms_app` role against `sms_dev`:

```
psql -U sms_app -d sms_dev -f e2e-seed.sql
```

The seed creates the user rows only; it does not set passwords. Set each account's password by
calling `POST /v1/auth/set-password` with a token minted for that user.

`e2e-cleanup.sql` removes exactly the rows `e2e-seed.sql` created — run the same way:

```
psql -U sms_app -d sms_dev -f e2e-cleanup.sql
```
