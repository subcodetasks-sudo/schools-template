# Student self-registration — passport support for foreign students

**Date:** 2026-09-22

## What changed

`POST /api/v1/auth/student/register/step1` now accepts **either** identity
field, matching the student's `student_type`:

| Student type | Send this field | (unchanged) |
|---|---|---|
| Egyptian (`egyptian`) | `national_id` | `code` still required, same as before |
| Foreign / وافد (`foreigner`) | `passport_number` | `code` still required, same as before |

Everything else about the flow is **identical** for both — same endpoint,
same `code` field, same token/step2 mechanics, same error shape.

---

## 1. `POST register/step1`

### Request — Egyptian student (unchanged)

```json
{ "national_id": "29901010100011", "code": "100234567" }
```

### Request — Foreign student (new)

```json
{ "passport_number": "P1234567", "code": "100234599" }
```

Send **exactly one** of `national_id` / `passport_number` — whichever
matches the student's type. Sending neither is a `422`:

```json
// 422
{ "success": false, "errors": { "national_id": ["The national id field is required when passport number is not present."] } }
```

Sending the wrong one for that student (e.g. a `passport_number` that
doesn't match any foreign student with that `code`) is also a `422` —
the error now lands on whichever field you sent (`national_id` **or**
`passport_number`), not always `national_id` as before:

```json
// 422
{ "success": false, "errors": { "passport_number": ["No student matches this identity and code."] } }
```

### Success `200` (unchanged shape, one new field)

```json
{
  "success": true,
  "data": {
    "token": "<short-lived encrypted token, 30 min>",
    "student": {
      "name": "...",
      "code": "100234599",
      "national_id": null,
      "passport_number": "P1234567"
    }
  }
}
```

`student.passport_number` is a new key in the response, alongside the
existing `national_id` (one of the two will be `null` depending on type).

---

## 2. `POST register/step2` — unchanged

No change to this endpoint's contract (`token`, `phone`, `password`,
`confirm_password`). Works identically for both student types now that
step1 can produce a token for either.

One internal fix worth knowing about: a foreign student has no
`national_id`, so their synthetic placeholder email (used until they set a
real one) now falls back to `passport_number`, then finally the student
`code` — e.g. `P1234567@student.school`. Egyptian students are unaffected
(still `<national_id>@student.school`).

---

## 3. Known gap — login after registration

**Not changed here, flagging so it's not a surprise:** `POST
/api/v1/auth/login` still only accepts `email` **or** `national_id` +
`password`. A foreign student who just registered via `passport_number`
has no `national_id`, so they currently **cannot log back in** using the
same student-friendly flow Egyptian students use (national_id + password).
They'd need to use their synthetic/real `email` + password instead, which
is not the same UX.

If foreign-student login needs to work the same way (e.g. `passport_number`
+ password, or `code` + password), that's a separate, explicit follow-up —
not covered by this change.
