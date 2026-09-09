# Frontend Prompt — Student Profile: "التقييمات الأسبوعية"

Build the **weekly assessments** view inside the authenticated student profile SPA
(`schools.subcodeco.com/profile`). It shows the logged-in student their own
weekly-assessment scores across subjects, with a summary and a filterable list.

---

## 1. Endpoint

```
GET {API}/api/v1/auth/student/profile/weekly-assessments
```

- **Auth:** student Sanctum token (the same token used for `GET /profile`) —
  `Authorization: Bearer <accessToken>`.
- **Headers:** `Accept: application/json`, `Accept-Language: ar` (or `en`).
- **Method:** `GET` only. Read-only — the student never writes here.
- **Envelope:** `{ "success": bool, "message": string, "data": { … } }` — read `data`.

### Query params — all optional, combine freely

| Param | Type | Meaning |
|---|---|---|
| `academic_year` | string, e.g. `2025/2026` | limit to one academic year |
| `term` | `first` \| `second` | الفصل الدراسي |
| `subject_id` | integer | one subject only (id from the subjects lookup / from `by_subject`) |
| `month` | one of `january, february, march, april, may, june, july, august, september` | the study month as stored on the session (not a calendar `YYYY-MM`) |

No params → everything the student has, all years.

---

## 2. Response shape (`data`)

```json
{
  "student": {
    "id": "a1b2c3d4-…",
    "name": "مهدي سعيد",
    "code": "123456789",
    "national_id": "3010…",
    "class_number": "12",
    "stage":     { "id": 1, "name": "ابتدائي" },
    "grade":     { "id": 2, "name": "الصف الثاني" },
    "classroom": { "id": 3, "section": "أ", "label": "2/أ" }
  },

  "filters": {
    "academic_year": "2025/2026",
    "term": "first",
    "subject_id": null,
    "month": null
  },

  "summary": {
    "sessions_count": 3,            // number of week entries in scope
    "total_score": 32,             // Σ of the student's totals
    "total_max": 38,               // Σ of the sessions' max_total
    "percentage": 84.2,            // total_score / total_max * 100, rounded to 1dp — or null

    "by_subject": [
      {
        "subject": { "id": 1, "name": "الرياضيات", "code": "MATH" },
        "sessions": 2,
        "score": 25,
        "max": 28,
        "percentage": 89.3         // or null when max = 0
      }
    ],

    "by_term": [
      { "term": "first", "sessions": 3, "score": 32, "max": 38, "percentage": 84.2 }
    ]
  },

  "entries": [
    {
      "id": "512",                        // score-row id (string)
      "session_id": "a203dff6-…",         // weekly-assessment session UUID
      "subject": { "id": 1, "name": "الرياضيات", "code": "MATH" },
      "academic_year": "2025/2026",
      "term": "first",
      "month": "february",
      "week": 2,                          // 1..4
      "week_date": "2026-02-10",          // may be null
      "scores": { "weekly": 10, "notebook": 3 },   // rubric column key → value
      "total": 13,                        // Σ of entered score values
      "max_total": 14,                    // Σ of that session's rubric column maxes
      "percentage": 92.9                  // total / max_total * 100 — or null
    }
  ]
}
```

### Field notes

- **`entries`** is **newest-first**, ordered by academic year → term (`second`
  after `first`) → month → week.
- **`entries[].scores`** — keys are the rubric columns of that session's stage
  distribution (e.g. `weekly`, `notebook`, `homework`, `participation` …). Values
  are numbers, or `null` when that column was not entered for the student.
  The set of keys **can differ between entries** (different stage / distribution),
  so render it dynamically — don't hard-code column names.
- **`max_total`** is the maximum achievable total for that one week entry.
- Any **`percentage`** is `null` when its denominator (`total_max` / `max`
  / `max_total`) is `0`. Render `—` or hide the bar in that case.
- `student.code` is the student code; `week_date` is optional.
- `month` values are English lowercase keys — map them to Arabic month names in
  the UI yourself (`february` → «فبراير»). Do **not** expect `2026-02`.

---

## 3. States

| State | Condition | UI |
|---|---|---|
| **Loaded, has data** | `entries.length > 0` | summary header + subject breakdown + list |
| **Empty** | `entries: []`, `summary` all `0`, `summary.percentage: null` | "لا توجد تقييمات أسبوعية مسجّلة" |
| **Not a student account** | `403`, `message` key `student_profile_forbidden` | same handling as `GET /profile` `403` |
| **No linked student row** | `404`, `message` key `student_profile_not_found` | same handling as `GET /profile` `404` |
| **Bad filter value** | `422 { message, errors }` (e.g. unknown `term` / `month`) | shouldn't happen if you feed values from the response; show a generic error |

---

## 4. Suggested UI

1. **Header / summary card**
   - Big number: `summary.percentage` (with `summary.total_score` / `summary.total_max` underneath, e.g. «32 / 38»).
   - `summary.sessions_count` = "عدد التقييمات".
2. **By subject** — a small table or list of cards from `summary.by_subject`:
   subject name, `sessions`, `score / max`, `percentage` (progress bar). Tapping a
   subject re-requests with `?subject_id=<id>`.
3. **Filters bar**
   - Academic year (from `filters.academic_year`, or a known list).
   - Term toggle: `first` / `second`.
   - Month dropdown: the 9 `month` keys → Arabic labels.
   - Subject: from `summary.by_subject[].subject`.
   - Re-fetch on change; keep the request params in the URL/query string.
4. **Entries list** — one row per `entries[]` item:
   - Left: subject name + «الفصل الأول · فبراير · الأسبوع 2» (`term` · `month` · `week`).
   - Right: `total / max_total` and `percentage`.
   - Expandable → the per-column breakdown from `scores` (column key → value / and
     ideally the column max, though max is only given as the session total —
     render the raw values, label each key).
   - `week_date` shown when present.

---

## 5. Related

- Lives next to `GET /profile/absences` (غياب الطالب) — identical auth, envelope
  and filter conventions, so share the data layer.
- Full profile guide: [`student-profile-api.md`](./student-profile-api.md) §6.
- The admin side that produces this data: `weekly-assessments-api.md`
  (`/api/v1/auth/admin/weekly-assessments`) — not needed for this screen.
