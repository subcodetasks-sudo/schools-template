# استدعاء ولي أمر على ملف الطالب — Parent Summons on the Student Profile (Frontend Prompt)

**What this covers:** a parent summons (شؤون الطلبة → **استدعاء ولي أمر**) raised against a
student is now **readable from the student profile**, not only from the standalone
`/parent-summons` screen.

Nothing about **creating / editing** a summons changed — that still happens on the
شؤون الطلبة CRUD (`/api/v1/auth/admin/parent-summons`). This doc is only about the
**3 new read surfaces**.

---

## 0. Conventions

- **Base URL:** `{API}/api/v1/auth/admin` (admin) · `{API}/api/v1/auth/student` (student SPA)
- **Headers:** `Authorization: Bearer <accessToken>` · `Accept: application/json`
- **Envelope:** every response is `{ "success", "message", "data" }`
- Paginated lists nest as `data.data[]` + `data.meta` + `data.links.next`
- `{uuid}` in a student path = the **student UUID** (`student.id` / `data.id`)

---

## 1. Summary of what was added

| # | Surface | Endpoint | Shape |
|---|---|---|---|
| 1 | Admin — student file | `GET /students/{uuid}` | response gains a `parent_summons[]` array (detail only) |
| 2 | Admin — dedicated list | `GET /students/{uuid}/parent-summons` | **new** paginated endpoint, full summon objects |
| 3 | Student SPA — own profile | `GET /api/v1/auth/student/profile` | `statistics.cards.callups.count` is now real + new top-level `callups[]` |

Create a summons (unchanged): `POST /api/v1/auth/admin/parent-summons`
`{ "student_id": "<student uuid|id>", "reason": "...", "summons_date": "YYYY-MM-DD" }`
→ see [student-affairs-documents-api.md](./student-affairs-documents-api.md) §4.9.

---

## 2. Admin — `GET /students/{uuid}` gains `parent_summons[]`

The full student object (create / show / update) now carries a **`parent_summons`**
key. **Present on detail / show only — NOT on `GET /students` list rows.**

- **Order:** newest first (`summons_date` desc, then id desc)
- `[]` when the student has no summons
- Compact shape (for a "الاستدعاءات" tab / card on the student file)

```jsonc
{
  "success": true,
  "message": "student fetched successfully",
  "data": {
    "id": "766bd4bb-9045-4ed5-844c-5c5c29056313",
    "student": { "name": "أحمد علي محمد", "national_id": "31001011234567", "...": "..." },
    "enrollment": { "...": "..." },
    "guardian": { "...": "..." },
    "contact": { "...": "..." },
    "social_cases": [],
    "administrative_statuses": [],

    "parent_summons": [
      {
        "id": "9d1f8b3a-2c77-4e10-8a51-8b2f0c9d1e44",  // summons UUID → /parent-summons/{id}
        "reason": "تكرار التأخير الصباحي",
        "summons_date": "2026-03-02",
        "academic_year": "2025/2026",
        "notes": null,
        "created_at": "2026-03-02 09:14:00"
      },
      {
        "id": "1a2b3c4d-5e6f-7081-9a2b-3c4d5e6f7081",
        "reason": "سلوك داخل الفصل",
        "summons_date": "2026-03-01",
        "academic_year": "2025/2026",
        "notes": "تم إبلاغ ولي الأمر هاتفيًا",
        "created_at": "2026-03-01 11:40:00"
      }
    ],

    "createdAt": "2026-09-06 09:50:58",
    "updatedAt": "2026-09-07 11:20:04"
  }
}
```

### `parent_summons[]` item fields

| Key | Type | Notes |
|---|---|---|
| `id` | string (UUID) | the summons id — use it for `GET/POST/DELETE /parent-summons/{id}` |
| `reason` | string | سبب الاستدعاء |
| `summons_date` | string \| null | `YYYY-MM-DD` — تاريخ الاستدعاء |
| `academic_year` | string \| null | العام الدراسي |
| `notes` | string \| null | ملاحظات |
| `created_at` | string | `YYYY-MM-DD HH:MM:SS` |

---

## 3. Admin — `GET /students/{uuid}/parent-summons` (new)

Dedicated paginated list of one student's summons. Use this for a full "استدعاءات
ولي الأمر" screen / pagination; use the `parent_summons[]` block above for a quick
inline summary.

```
GET /api/v1/auth/admin/students/{uuid}/parent-summons?per_page=15&page=1
```

| Query | Default | Notes |
|---|---|---|
| `per_page` | `15` | page size |
| `page` | `1` | page number |

- **Order:** newest first (fixed — `summons_date` desc, id desc)
- Rows are the **full parent-summon resource** (same object the `/parent-summons`
  CRUD returns), including the frozen `student` snapshot block, `notes`, `pdf_path`,
  `has_pdf`, and timestamps.

### Response

```jsonc
{
  "success": true,
  "message": "Parent summons fetched successfully",
  "data": {
    "data": [
      {
        "id": "9d1f8b3a-2c77-4e10-8a51-8b2f0c9d1e44",
        "student_id": "766bd4bb-9045-4ed5-844c-5c5c29056313",
        "academic_year": "2025/2026",
        "student": {
          "id": "766bd4bb-9045-4ed5-844c-5c5c29056313",
          "name": "أحمد علي محمد",              // frozen snapshot at write time
          "national_id": "31001011234567",
          "code": "300112345",
          "stage":     { "id": 1, "name": "المرحلة الابتدائية" },
          "grade":     { "id": 4, "name": "الصف الرابع" },
          "classroom": { "id": 9, "section": "A", "label": "الصف الرابع - فصل A" }
        },
        "reason": "تكرار التأخير الصباحي",
        "summons_date": "2026-03-02",
        "notes": null,
        "pdf_path": null,
        "has_pdf": true,
        "createdAt": "2026-03-02 09:14:00",
        "updatedAt": "2026-03-02 09:14:00"
      }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 1,
      "per_page": 15,
      "total": 2
    },
    "links": { "next": null }
  }
}
```

- Empty student → `data.data: []`, `data.meta.total: 0` (still `200`).
- Unknown student UUID → `404 { "success": false, "message": "..." }`.

---

## 4. Student SPA — `GET /api/v1/auth/student/profile`

The student's own profile (schools SPA `/profile`) now exposes their summons.
Two changes:

1. `statistics.cards.callups.count` — **was always `0`, now the real total.**
2. A **new top-level `callups[]`** array listing them (same item shape as the admin
   `parent_summons[]` block).

```jsonc
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "personal": { "id": "…", "name": "أحمد علي محمد", "...": "..." },
    "schedule": { "...": "..." },

    "statistics": {
      "evaluation": { "assignments": null, "tests": null },
      "cards": {
        "attendance": { "rate": 92.3, "sessions": 52 },
        "callups":    { "count": 2 },          // ← عدد استدعاءات ولي الأمر (كان 0 دائمًا)
        "tests":      { "completed": 0 },
        "absences":   { "count": 4 }
      }
    },

    "callups": [                                // ← جديد — [] لو مفيش استدعاءات
      {
        "id": "9d1f8b3a-2c77-4e10-8a51-8b2f0c9d1e44",
        "reason": "تكرار التأخير الصباحي",
        "summons_date": "2026-03-02",
        "academic_year": "2025/2026",
        "notes": null,
        "created_at": "2026-03-02 09:14:00"
      },
      {
        "id": "1a2b3c4d-5e6f-7081-9a2b-3c4d5e6f7081",
        "reason": "سلوك داخل الفصل",
        "summons_date": "2026-03-01",
        "academic_year": "2025/2026",
        "notes": "تم إبلاغ ولي الأمر هاتفيًا",
        "created_at": "2026-03-01 11:40:00"
      }
    ]
  }
}
```

- `callups[]` is **read-only** for the student — no student-side create/edit.
- Order: newest first.
- `statistics.cards.callups.count === data.callups.length`.
- Show the "استدعاءات ولي الأمر" card only when `callups.length > 0` (or always, with
  a "لا يوجد" empty state — your call).

---

## 5. Frontend checklist

**Admin — student file screen**
- [ ] Add an "استدعاءات ولي الأمر" section/tab fed by `data.parent_summons` (inline) or by `GET /students/{uuid}/parent-summons` (paginated).
- [ ] Each row: `reason`, `summons_date`, `academic_year`, `notes`, `created_at`.
- [ ] "استدعاء جديد" button → `POST /api/v1/auth/admin/parent-summons` with `student_id` = current student UUID (unchanged endpoint).
- [ ] Row actions (view / edit / delete) → `/parent-summons/{id}` using the item's `id`.
- [ ] Do **not** expect `parent_summons` on the `GET /students` list — detail only.

**Student SPA — /profile**
- [ ] Bind the "الاستدعاءات / call-ups" stat card to `statistics.cards.callups.count` (remove any hardcoded `0` handling / "coming soon").
- [ ] Render `data.callups[]` as a list (reason + date), newest first, with an empty state.

---

## 6. Quick reference

| | |
|---|---|
| Inline block on student file | `GET /students/{uuid}` → `data.parent_summons[]` (detail only) |
| Dedicated list | `GET /students/{uuid}/parent-summons` → `data.data[]` + `data.meta` (newest first) |
| Student's own view | `GET /api/v1/auth/student/profile` → `data.callups[]` + `data.statistics.cards.callups.count` |
| Create / edit / delete | `POST` / `POST` / `DELETE` `/api/v1/auth/admin/parent-summons[/{id}]` — **unchanged** |
| Item id for actions | `parent_summons[i].id` / `callups[i].id` = summons UUID |
| Empty | `[]` and `count: 0` — always `200` |
