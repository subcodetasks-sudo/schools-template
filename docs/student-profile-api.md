# Student Profile API — Frontend Guide

Student SPA: [`https://schools.subcodeco.com/profile`](https://schools.subcodeco.com/profile)

One **GET** returns **personal + schedule + statistics**.  
**POST** edits **personal** (and father/guardian contact) only — schedule / statistics are read-only.

---

## 1. Conventions

- **Base URL:** `{API}/api/v1/auth/student`
- **Auth:** Sanctum user token from `POST {API}/api/v1/auth/login` (`national_id` + `password` for students) → `data.accessToken`
- **Headers:** `Authorization: Bearer <accessToken>` · `Accept: application/json` · optional `Accept-Language: ar|en`
- **Envelope:** `{ "success": bool, "message": string, "data": … }`
- **Updates use `POST`** (not PUT/PATCH)
- **403** — token is not a student account  
- **404** — student row not linked to this user  

---

## 2. Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/profile` | personal + schedule + statistics (+ `success_certificate_unlocked`) |
| `POST` | `/profile` | edit personal fields only |
| `GET` | `/profile/absences` | غياب الطالب — the student's own absence record (§5) |
| `GET` | `/profile/weekly-assessments` | التقييمات الأسبوعية — the student's own weekly-assessment scores (§6) |
| `GET` | `/profile/annual-report` | التقرير السنوي — attendance + assessments + fees combined, per academic year (§7) |
| `GET` | `/profile/monthly-assessments` | التقييم الشهري — the student's own monthly assessments, auto-summed from weekly scores ([monthly-assessments-api.md](./monthly-assessments-api.md)) |
| `GET` | `/profile/success-certificate` | شهادة نجاح — grades locked until QR unlock ([FRONTEND_SUCCESS_CERTIFICATE_QR.md](../FRONTEND_SUCCESS_CERTIFICATE_QR.md)) |
| `POST` | `/profile/success-certificate/unlock` | Unlock certificate with current card QR |

---

## 3. Get profile — `GET /profile`

```http
GET /api/v1/auth/student/profile
Authorization: Bearer <accessToken>
Accept: application/json
```

### Success `200`

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "personal": {
      "id": "a1b2c3d4-aaaa-bbbb-cccc-ddddeeeeffff",
      "name": "مهدي سعيد",
      "initials": "مس",
      "grade_label": "ابتدائي · الصف الثاني",
      "image": null,
      "national_id": "3010…",
      "student_code": "123456789",
      "phone": "0100…",
      "religion": "مسلم",
      "registration_status": "enrolled",
      "class_number": "12",
      "transfers": null,
      "fees": null,
      "payment_voucher": null,
      "payment_date": null,
      "payment_amount": null,
      "stage": { "id": 1, "name": "ابتدائي" },
      "grade": { "id": 2, "name": "الصف الثاني" },
      "classroom": { "id": 3, "section": "أ", "label": "2/أ" },
      "father": {
        "national_id": null,
        "address": null,
        "job": null,
        "phone": null
      },
      "guardian": {
        "name": null,
        "relation": null,
        "national_id": null,
        "qualification": null,
        "job": null,
        "address": null
      }
    },
    "schedule": {
      "id": "…-uuid-…",
      "days": ["sunday", "monday", "tuesday", "wednesday", "thursday"],
      "periods": [1, 2, 3, 4, 5, 6, 7],
      "classroom": {
        "id": 3,
        "section": "أ",
        "label": "2/أ",
        "grade": { "id": 2, "name": "الصف الثاني" },
        "stage": { "id": 1, "name": "ابتدائي" }
      },
      "entries": [
        {
          "day": "sunday",
          "period": 1,
          "subject": { "id": 1, "name": "لغة عربية", "code": "AR" },
          "teacher": { "id": "…", "name": "…" }
        },
        {
          "day": "sunday",
          "period": 1,
          "subject": { "id": 4, "name": "رياضيات", "code": "MATH" },
          "teacher": { "id": "…", "name": "…" }
        }
      ],
      "slots": [
        {
          "day": "sunday",
          "period": 1,
          "assignments": [
            {
              "subject": { "id": 1, "name": "لغة عربية", "code": "AR" },
              "teacher": { "id": "…", "name": "…" }
            },
            {
              "subject": { "id": 4, "name": "رياضيات", "code": "MATH" },
              "teacher": { "id": "…", "name": "…" }
            }
          ]
        }
      ]
    },
    "statistics": {
      "evaluation": {
        "assignments": null,
        "tests": null
      },
      "cards": {
        "attendance": { "rate": 92.3, "sessions": 52 },
        "callups": { "count": 2 },
        "tests": { "completed": 0 },
        "absences": { "count": 4 }
      }
    },
    "callups": [
      {
        "id": "9d1f…-uuid",
        "reason": "تكرار التأخير الصباحي",
        "summons_date": "2026-03-02",
        "academic_year": "2025/2026",
        "notes": null,
        "created_at": "2026-03-02 09:14:00"
      }
    ],
    "success_certificate_unlocked": false
  }
}
```

Notes:
- `success_certificate_unlocked` — whether شهادة النجاح was unlocked with the current card QR (see [FRONTEND_SUCCESS_CERTIFICATE_QR.md](../FRONTEND_SUCCESS_CERTIFICATE_QR.md)).
- `schedule` is `null` when the student has no classroom or no timetable yet.
- A single `(day, period)` cell may contain **multiple** subject/teacher pairs.
  Prefer `schedule.slots` for the grid (`assignments[]` per cell). See
  [FRONTEND_SCHEDULE_MULTI_ASSIGNMENTS.md](../FRONTEND_SCHEDULE_MULTI_ASSIGNMENTS.md).
- `statistics.cards.attendance` / `absences` are **real** now (current academic year):
  `attendance.rate` = present ÷ recorded days %, `attendance.sessions` = recorded days,
  `absences.count` = absent days. `rate` is `null` when no attendance has been recorded yet.
  Full day-by-day detail is at `GET /profile/absences` (§5).
- **`callups`** = استدعاءات ولي الأمر raised against the student (شؤون الطلبة → استدعاء ولي أمر).
  `statistics.cards.callups.count` is the total; the top-level **`callups`** array lists them,
  **newest first** (`[]` when the student has none). Each item: `id` (summons UUID), `reason`,
  `summons_date`, `academic_year`, `notes`, `created_at`. Read-only here — summons are created /
  edited by admins on `/api/v1/auth/admin/parent-summons` (see
  [student-affairs-documents-api.md](./student-affairs-documents-api.md) §4.9).
- `tests` stays a placeholder (zero) until that API exists.
- **`father` vs `guardian`** — `father` is the student's father contact record. `guardian`
  (ولي الأمر) is a separate record used when someone other than the father is the legal
  guardian (e.g. mother, brother, other relative) — it carries its own `name` and `relation`
  (صلة القرابة) in addition to national ID / qualification / job / address. Both blocks are
  independent and editable; show whichever the school's data has filled in — either or both
  may be non-null for a given student.

### SPA field map (`personal`)

| SPA label | API key |
|---|---|
| National ID | `national_id` |
| Student code | `student_code` |
| Phone number | `phone` |
| Religion | `religion` |
| Registration status | `registration_status` |
| Class number | `class_number` |
| Transfers | `transfers` |
| Fees | `fees` |
| Payment voucher | `payment_voucher` |
| Payment date | `payment_date` |
| Payment amount | `payment_amount` |
| Father national ID | `father.national_id` |
| Father address | `father.address` |
| Father job | `father.job` |
| Father phone | `father.phone` |
| Guardian name | `guardian.name` |
| Guardian relation | `guardian.relation` |
| Guardian national ID | `guardian.national_id` |
| Guardian qualification | `guardian.qualification` |
| Guardian job | `guardian.job` |
| Guardian address | `guardian.address` |

---

## 4. Edit personal — `POST /profile`

Only these keys are accepted (partial update). School-owned fields (code, status, fees, payments, class…) cannot be changed here.

| Key | Type |
|---|---|
| `phone` | string ≤20 |
| `image` | string ≤2048 (URL / path) |
| `religion` | string ≤50 |
| `father_national_id` | string ≤20 |
| `father_address` | string ≤500 |
| `father_job` | string ≤255 |
| `father_phone` | string ≤20 |
| `guardian_name` | string ≤255 |
| `guardian_relation` | string ≤100 |
| `guardian_national_id` | string ≤20 |
| `guardian_qualification` | string ≤255 |
| `guardian_job` | string ≤255 |
| `guardian_address` | string ≤500 |

```http
POST /api/v1/auth/student/profile
Authorization: Bearer <accessToken>
Content-Type: application/json
Accept: application/json
```

```json
{
  "phone": "01001234567",
  "religion": "مسلم",
  "father_phone": "01009876543",
  "father_job": "مهندس",
  "father_address": "المنصورة",
  "father_national_id": "2801…",
  "guardian_name": "أحمد سعيد",
  "guardian_relation": "عم",
  "guardian_national_id": "2905…",
  "guardian_qualification": "بكالوريوس تجارة",
  "guardian_job": "محاسب",
  "guardian_address": "المنصورة، شارع الجمهورية"
}
```

Send only the keys you want to change — this is a partial update (`sometimes` rules), not a full replace. `father_*` and `guardian_*` are independent; updating one does not touch the other.

### Success `200`

Same `data` shape as GET (personal + schedule + statistics), with updated personal values. Changing `phone` also updates the linked `users.phone`.

---

## 5. Student absences — `GET /profile/absences`

غياب الطالب — the authenticated student's own absence record, built from the daily
class-attendance registers. Records are keyed by the student, so a classroom
transfer never loses history.

```http
GET /api/v1/auth/student/profile/absences?academic_year=2025/2026
Authorization: Bearer <accessToken>
Accept: application/json
Accept-Language: ar
```

### Query params (all optional)

| Param | Type | Notes |
|---|---|---|
| `academic_year` | string ≤20 | e.g. `2025/2026` — omit for all years |
| `month` | `YYYY-MM` | restrict to one month (overrides `date_from` / `date_to`) |
| `date_from` | date | inclusive |
| `date_to` | date | inclusive, ≥ `date_from` |

### Success `200`

```json
{
  "success": true,
  "message": "Student absences fetched successfully",
  "data": {
    "student": {
      "id": "a1b2c3d4-…",
      "name": "مهدي سعيد",
      "code": "123456789",
      "national_id": "3010…",
      "class_number": "12",
      "stage": { "id": 1, "name": "ابتدائي" },
      "grade": { "id": 2, "name": "الصف الثاني" },
      "classroom": { "id": 3, "section": "أ", "label": "2/أ" }
    },
    "filters": { "academic_year": "2025/2026", "from": null, "to": null },
    "summary": {
      "recorded_days": 52,      // school days attendance was taken for this student
      "present_days": 48,
      "absence_days": 4,
      "attendance_rate": 92.3   // present ÷ recorded × 100, or null when recorded_days = 0
    },
    "absences": [
      {
        "date": "2026-09-02",
        "day_name": "الأربعاء",          // localized by Accept-Language
        "academic_year": "2025/2026",
        "absence_excuse": "بدون إذن",    // عذر الغياب لهذا اليوم، أو null
        "classroom": { "id": 3, "section": "أ", "label": "2/أ" },
        "recorded_by": "أ. سمر"           // admin who recorded the register, or null
      }
    ],
    "by_month": [
      { "month": "2026-08", "absence_days": 1 },
      { "month": "2026-09", "absence_days": 3 }
    ]
  }
}
```

- `absences` is newest-first.
- `403` / `404` same as `/profile` (not a student account / no linked student row).
- The profile `statistics.cards` numbers are the same figures for the **current** academic year.

---

## 6. Weekly assessments — `GET /profile/weekly-assessments`

التقييمات الأسبوعية — the authenticated student's own weekly-assessment scores,
built from the class weekly-assessment sessions. Keyed by the student, so a
classroom transfer keeps the history.

```http
GET /api/v1/auth/student/profile/weekly-assessments?academic_year=2025/2026&term=first
Authorization: Bearer <accessToken>
Accept: application/json
```

### Query params (all optional)

| Param | Type | Notes |
|---|---|---|
| `academic_year` | string ≤20 | e.g. `2025/2026` |
| `term` | `first` \| `second` | الفصل الدراسي |
| `subject_id` | int (exists) | one subject only |
| `month` | one of `january`..`september` | the study month (as stored on the session) |

### Success `200` → `data`

```json
{
  "student": {
    "id": "a1b2c3d4-…", "name": "مهدي سعيد", "code": "123456789",
    "national_id": "3010…", "class_number": "12",
    "stage": { "id": 1, "name": "ابتدائي" },
    "grade": { "id": 2, "name": "الصف الثاني" },
    "classroom": { "id": 3, "section": "أ", "label": "2/أ" }
  },
  "filters": { "academic_year": "2025/2026", "term": "first", "subject_id": null, "month": null },
  "summary": {
    "sessions_count": 3,                      // scored weeks only (excludes is_absent)
    "absent_count": 1,                        // weeks marked absent for this assessment
    "total_score": 32,
    "total_max": 38,
    "percentage": 84.2,                       // total_score ÷ total_max × 100, or null
    "by_subject": [
      { "subject": { "id": 1, "name": "الرياضيات", "code": "MATH" },
        "sessions": 2, "score": 25, "max": 28, "percentage": 89.3 }
    ],
    "by_term": [
      { "term": "first", "sessions": 3, "score": 32, "max": 38, "percentage": 84.2 }
    ]
  },
  "entries": [
    {
      "id": "512",                            // score row id
      "session_id": "a203dff6-…",             // weekly-assessment session UUID
      "subject": { "id": 1, "name": "الرياضيات", "code": "MATH" },
      "academic_year": "2025/2026",
      "term": "first",
      "month": "february",
      "week": 2,
      "week_date": "2026-02-10",              // may be null
      "is_absent": false,
      "scores": { "weekly": 10, "notebook": 3 },   // rubric column → value (null = not entered)
      "total": 13,
      "max_total": 14,                        // Σ rubric column maxes for that session
      "percentage": 92.9
    }
  ]
}
```

- `entries` is newest-first (academic year → term → month → week).
- `scores` keys are the rubric columns of that session's stage distribution; a
  missing/`null` value means that column was not entered.
- `is_absent: true` weeks stay in `entries` (for history) but are **excluded** from
  `summary` totals/`sessions_count` and from monthly aggregations — absent ≠ zero.
- `403` / `404` same as `/profile`. Empty student → `entries: []`, `summary` all zeros, `percentage: null`.

---

## 7. Annual report — `GET /profile/annual-report`

التقرير السنوي — everything for one academic year in a single call:
attendance (daily register **and** per-lesson), every subject's assessment
result, and the fee account summary. Built by composing the same data the
other endpoints above already expose — nothing here is a new data source.

```http
GET /api/v1/auth/student/profile/annual-report?academic_year=2026/2027
Authorization: Bearer <accessToken>
Accept: application/json
```

### Query params (all optional)

| Param | Type | Notes |
|---|---|---|
| `academic_year` | string ≤20 | defaults to the current academic year (see [academic-years-api.md](./academic-years-api.md) §4) when omitted |

### Success `200` → `data`

```json
{
  "student": {
    "id": "a1b2c3d4-…", "name": "مهدي سعيد", "code": "123456789",
    "national_id": "3010…", "class_number": "12",
    "stage": { "id": 1, "name": "ابتدائي" },
    "grade": { "id": 2, "name": "الصف الثاني" },
    "classroom": { "id": 3, "section": "أ", "label": "2/أ" }
  },
  "academic_year": "2026/2027",

  "attendance": {
    "daily": { "...": "same shape as §5 GET /profile/absences" },
    "lessons": {
      "filters": { "academic_year": "2026/2027", "from": null, "to": null },
      "summary": {
        "recorded_lessons": 210,
        "present_lessons": 198,
        "absence_lessons": 12,
        "attendance_rate": 94.3
      },
      "absences": [
        {
          "date": "2026-10-05",
          "day_name": "الاثنين",
          "academic_year": "2026/2027",
          "period": 3,
          "period_label": "الثالثة",
          "subject": { "id": 1, "name": "الرياضيات", "code": "MATH" },
          "recorded_by": "أ. سمر"
        }
      ],
      "by_month": [
        { "month": "2026-10", "absence_lessons": 4 }
      ]
    }
  },

  "assessments": {
    "weekly": { "...": "same shape as §6 GET /profile/weekly-assessments" },
    "subjects_locked": false,
    "subjects": [
      {
        "term": "first",
        "student": { "id": "a1b2c3d4-…", "name": "مهدي سعيد", "code": "123456789", "class_number": "12" },
        "classroom": { "id": 3, "section": "أ", "label": "2/أ" },
        "subject": { "id": 1, "name": "الرياضيات" },
        "year_work": { "score": 45, "max": 50 },
        "final_exam": { "score": 42, "max": 50 },
        "total": 87, "total_max": 100, "percentage": 87.0,
        "status": "pass",
        "approval_status": "approved",
        "year_work_breakdown": [
          { "component": { "id": "uuid", "name": "كشكول الحصة", "max_mark": 15 }, "score": 14, "status": "approved" }
        ]
      }
    ]
  },

  "fees": {
    "academic_year": "2026/2027",
    "has_account": true,
    "base_amount": 5000.0,
    "discount_amount": 500.0,
    "net_amount": 4500.0,
    "paid_amount": 3000.0,
    "remaining_amount": 1500.0,
    "payment_status": "partial",
    "payments_count": 3,
    "last_payment_at": "2026-11-01",
    "by_method": { "cash": 2000.0, "card": 1000.0 },
    "installments": { "enabled": false, "plan": [], "due": [], "paid": [], "late": [] }
  },

  "summary": {
    "subjects_count": 6,
    "subjects_passed": 5,
    "subjects_failed": 0,
    "subjects_incomplete": 1
  }
}
```

Notes:
- `attendance.daily` is the exact same object `GET /profile/absences` returns
  (§5) — reuse a shared renderer if you already built one for that screen.
- `attendance.lessons` mirrors it but counts **lessons** instead of **days**
  (a student can be marked absent from one subject's period while present the
  rest of the day) — use it for a per-subject attendance breakdown, `daily`
  for the overall register.
- `assessments.weekly` is the exact same object `GET /profile/weekly-assessments`
  returns (§6).
- `assessments.subjects` has **one row per (subject, term)** — up to 2 rows
  per subject (`first`/`second`). A subject only appears if its mark
  distribution has been approved by an admin (see
  [final-results-api.md](./final-results-api.md)); subjects still being set up
  are silently omitted, not shown as errors. Field meanings (`status`,
  `approval_status`, `year_work_breakdown`, …) are documented in
  [final-results-api.md](./final-results-api.md) §2–3 — this is the exact
  same row shape as that page's per-student detail.
  **QR gate:** while شهادة النجاح is locked, `subjects_locked` is `true`,
  `subjects` is `[]`, and pass/fail summary counts are `null` (no grade queries).
  See [FRONTEND_SUCCESS_CERTIFICATE_QR.md](../FRONTEND_SUCCESS_CERTIFICATE_QR.md).
- `fees` is the same summary object the fee-collection screens use — see
  [fee-payments-api.md](./fee-payments-api.md). `has_account: false` means no
  fee account has been set up yet for this year (every amount then reads `0`).
- `summary` is a light roll-up over `assessments.subjects` for a dashboard
  card; it does **not** include attendance or fees — compute those from the
  sections above if a combined card is needed.
- `403` / `404` same as `/profile` (not a student account / no linked student row).

