# التقييم الشهري — Monthly Assessments API (Frontend Guide)

Auto-calculated monthly assessment: the sum of a student's weekly assessment
scores within one month, per subject (a month is ~4 weekly sessions). **This
is not a separately-entered value** — there is no create/edit endpoint. It is
computed fresh on every read from `weekly_assessment_scores`, so it can never
drift out of sync with the underlying weekly data. Two read-only endpoints,
identical response shape:

| Method | Path | Who |
|---|---|---|
| `GET` | `/api/v1/auth/student/profile/monthly-assessments` | the authenticated student, own data |
| `GET` | `/api/v1/auth/admin/students/{uuid}/monthly-assessments` | admin, any student |

---

## 0. Conventions

- **Envelope:** `{ "success", "message", "data" }`
- **Auth (student):** `Authorization: Bearer <accessToken>` from student login
- **Auth (admin):** `Authorization: Bearer <accessToken>` · `EnsureIsAdmin`
- `{uuid}` on the admin path is the student **UUID**

---

## 1. Query params (all optional)

| Param | Type | Notes |
|---|---|---|
| `academic_year` | string ≤20 | e.g. `2026/2027` — omit for all years |
| `term` | `first` \| `second` | الفصل الدراسي |
| `subject_id` | int (exists) | one subject only |

```http
GET /api/v1/auth/student/profile/monthly-assessments?academic_year=2026/2027&term=first
Authorization: Bearer <accessToken>
Accept: application/json
```

---

## 2. Success `200` → `data`

```json
{
  "student": {
    "id": "a1b2c3d4-…", "name": "مهدي سعيد", "code": "123456789",
    "stage": { "id": 1, "name": "ابتدائي" },
    "grade": { "id": 2, "name": "الصف الثاني" },
    "classroom": { "id": 3, "section": "أ", "label": "2/أ" }
  },
  "filters": { "academic_year": "2026/2027", "term": "first", "subject_id": null },
  "summary": {
    "total_score": 118,
    "total_max": 140,
    "percentage": 84.3
  },
  "months": [
    {
      "month": "september",
      "academic_year": "2026/2027",
      "term": "first",
      "subject": { "id": 1, "name": "الرياضيات", "code": "MATH" },
      "sessions": 4,
      "score": 34,
      "max": 40,
      "percentage": 85.0
    },
    {
      "month": "september",
      "academic_year": "2026/2027",
      "term": "first",
      "subject": { "id": 6, "name": "اللغة العربية", "code": "AR" },
      "sessions": 4,
      "score": 30,
      "max": 35,
      "percentage": 85.7
    },
    {
      "month": "october",
      "academic_year": "2026/2027",
      "term": "first",
      "subject": { "id": 1, "name": "الرياضيات", "code": "MATH" },
      "sessions": 3,
      "score": 26,
      "max": 30,
      "percentage": 86.7
    }
  ]
}
```

---

## 3. Notes

- **One row per (month, subject)** — a month usually has ~4 weekly sessions
  per subject, so `sessions` is normally `4` (fewer if a week wasn't recorded
  yet, or the month is still in progress).
- **`score`/`max`** are the sum of that month's weekly `total`/`max_total`
  across all its sessions for that subject — exactly "الشهر 4 أسابيع فيحط
  مجموعهم".
- **`months`** is sorted by month (chronological — September → …) then by
  subject name. Not grouped/nested by subject; render as a flat table or
  group client-side if a per-subject view is wanted.
- **`summary`** totals everything currently listed in `months` (respects the
  active filters) — it is **not** a separate calculation, just the sum
  across all rows.
- A subject/month only appears if at least one weekly assessment score
  exists for it — no zero-filled placeholder rows for months with nothing
  recorded.
- `403` / `404` on the self-service endpoint match `/profile`'s existing
  behaviour (not a student account / no linked student row).
- Field-level detail per week (individual rubric columns, week dates) is not
  included here — that's [`GET /profile/weekly-assessments`](./student-profile-api.md#6-weekly-assessments--get-profileweekly-assessments),
  which this endpoint sums on top of.
