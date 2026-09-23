# Student Login — `national_id` replaced with `code` — BREAKING

`POST /api/v1/auth/login` no longer accepts `national_id` as a login field
for students. Use the student's **code** (كود الطالب — the same 9‑digit
number shown on the student profile / ID card) instead.

## Request body

**Before:**
```json
{ "national_id": "29901011234567", "password": "..." }
```

**Now:**
```json
{ "code": "123456789", "password": "..." }
```

`email` + `password` still works exactly as before for non-student /
email-based accounts — that branch is unchanged.

## Validation

- `email` — required if `code` is not sent.
- `code` — required if `email` is not sent, string.
- Sending both `national_id` and `code` — `national_id` is now ignored;
  only `code` is read.

## Errors

Same shape as before — a failed lookup or wrong password returns a
`422` validation error, now keyed on `code` instead of `national_id`:

```json
{ "errors": { "code": ["..."] } }
```

## Frontend action

- Update the student login screen: replace the "الرقم القومي" input with
  "كود الطالب" (the `code` field), and send it as `code` in the login
  request instead of `national_id`.
- Any client-side validation (14-digit national ID pattern, etc.) on that
  field should be replaced with the 9-digit numeric student code format.
- The student self-registration flow (`/auth/student/register/step1` /
  `step2`) is **unchanged** — it still asks for `national_id` + `code`
  together to verify identity before creating the account. Only the
  *subsequent login* changed.

## Not changed

- Admin login (`/v1/auth/admin/login`) — untouched.
- Teacher accounts — still have no login (pure data, no `users` row).
- Email/password login for any account type.
