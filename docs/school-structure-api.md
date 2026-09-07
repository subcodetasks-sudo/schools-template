# School Structure Admin API — Frontend Guide

Covers the academic-structure admin screens:
**Stages · Grades · Classrooms · Classroom Rosters · Budgets · Schedules (weekly timetable)**.

---

## 1. Global conventions

### Base URL & auth

- **Base URL:** `{API}/api/v1/auth/admin`
- **Headers on every request:**
  - `Authorization: Bearer <accessToken>`
  - `Accept: application/json`
- Get the token from `POST {API}/api/v1/auth/admin/login` (`email` + `password`) → `data.accessToken`. Valid for **8 hours**.
- `401 {"message":"Unauthenticated."}` → token missing / expired / malformed.
- `403 {"success":false,"message":"...","data":null}` → token is valid but does not belong to an active admin.

### Verbs & encoding

- **Create** = `POST /<resource>`
- **Update** = `POST /<resource>/{id}` (**not** `PUT` / `PATCH`)
- **Delete** = `DELETE /<resource>/{id}`
- Send `application/json` normally; use `multipart/form-data` only when a request carries a file (none of the endpoints in this guide do — schedules/rosters/budgets are all plain JSON).

### Response envelope

Every response body:

```json
{ "success": true, "message": "…", "data": … }
```

| Action | Status | `data` |
|---|---|---|
| Create | `201` | the created resource object |
| Show / Update | `200` | the resource object (also sends an `ETag`; a matching `If-None-Match` → `304` with no body) |
| Delete | `200` | `null` |
| List | `200` | paginated object (below) |

### List (index) shape

```json
{
  "success": true,
  "message": "…",
  "data": {
    "data":  [ /* rows */ ],
    "meta":  { "total": 42, "per_page": 50, "current_page": 1, "last_page": 1 },
    "links": { "next": "https://…?page=2" }   // or null
  }
}
```

### List query parameters (all list endpoints)

| Param | Example | Notes |
|---|---|---|
| `search` | `?search=رابع` | matches the resource's searchable columns (listed per resource) |
| `filter[<key>]` | `?filter[stage_id]=1` | allow-listed keys only (listed per resource) |
| `sort` | `?sort=-created_at,name` | comma-separated; `-` prefix = descending; allow-listed fields only |
| `per_page` | `?per_page=100` | default differs per resource |
| `page` | `?page=2` | |
| `fields` | `?fields=id,name,order` | sparse fieldset — response keeps only these top-level keys (`id` always kept) |

### Error shapes

| Status | Body | Meaning |
|---|---|---|
| `422` | `{ "message": "…", "errors": { "field": ["…"], "entries.0.period": ["…"] } }` | validation failed |
| `401` / `403` | see auth section | not authenticated / not an admin |
| `409` | `{ "success": false, "message": "…" }` | resource is in use and cannot be deleted |

> Deleting a parent that still has children (a stage with grades, a grade with classrooms/a budget, a classroom with a schedule/roster) may fail. Delete children first.

---

## 2. Cascading-select helper endpoints

Lightweight, **non-paginated** — `data` is a plain array. Use these to populate dropdowns.

| Endpoint | Returns |
|---|---|
| `GET /academic/stages` | `[{ "id", "name", "name_en" }]` |
| `GET /academic/grades?stage_id=<id>` | `[{ "id", "stage_id", "name", "level" }]` |
| `GET /academic/classrooms?grade_id=<id>` | `[{ "id", "grade_id", "section", "full_name", "capacity" }]` |
| `GET /subjects` | paginated `[{ "id", "name", "code" }]` — `id` is **numeric** |
| `GET /teachers/options` | `[{ "id", "name" }]` — `id` is the teacher **UUID** |

`?stage_id` / `?grade_id` are optional filters; omit to get everything.

---

## 3. Stages — المراحل

`GET|POST /stages` · `GET|POST|DELETE /stages/{id}` — `{id}` = numeric id.

### Request body

| Key | Required | Type | Label |
|---|---|---|---|
| `name` | ✅ on create | string ≤255 | اسم المرحلة |
| `name_en` | — | string ≤255 | الاسم بالإنجليزية |
| `responsible_agent` | — | string ≤255 | الوكيل المسئول |
| `order` | — | int ≥0 | الترتيب |

On update every field is optional; send only what changed.

### Resource object

```json
{
  "id": 1,
  "name": "المرحلة الابتدائية",
  "name_en": "Primary",
  "responsible_agent": null,
  "order": 1,
  "grades_count": 6,
  "createdAt": "2026-09-06 09:50:58"
}
```

### List behaviour

- `search`: `name`, `name_en`, `responsible_agent`
- `sort`: `id`, `name`, `order`, `created_at` — default `order`
- filters: none
- `per_page` default **50**

---

## 4. Grades — الصفوف

`GET|POST /grades` · `GET|POST|DELETE /grades/{id}` — `{id}` = numeric id.

### Request body

| Key | Required | Type | Label |
|---|---|---|---|
| `stage_id` | ✅ on create | int → `stages` | المرحلة |
| `name` | ✅ on create | string ≤255 | اسم الصف |
| `level` | — | int 1–12 | المستوى |
| `order` | — | int ≥0 | الترتيب |

### Resource object

```json
{
  "id": 4,
  "stage_id": 1,
  "stage": { "id": 1, "name": "المرحلة الابتدائية" },
  "name": "الصف الرابع",
  "level": 4,
  "order": 4,
  "classrooms_count": 4,
  "createdAt": "2026-09-06 09:50:58"
}
```

### List behaviour

- `filter[stage_id]`
- `search`: `name`
- `sort`: `id`, `name`, `level`, `order`, `created_at` — default `order`
- `per_page` default **50**

---

## 5. Classrooms — الفصول

`GET|POST /classrooms` · `GET|POST|DELETE /classrooms/{id}` — `{id}` = numeric id.

### Request body

| Key | Required | Type | Label / notes |
|---|---|---|---|
| `grade_id` | ✅ on create | int → `grades` | الصف |
| `section` | ✅ on create | string ≤50 | الفصل (e.g. `A`, `B`). **Unique per `grade_id`** |
| `full_name` | — | string ≤255 | auto-generated as `"<grade name> - فصل <section>"` when omitted |
| `capacity` | — | int 1–1000 | السعة |

### Resource object

```json
{
  "id": 9,
  "grade_id": 4,
  "grade": { "id": 4, "name": "الصف الرابع", "stage_id": 1 },
  "section": "A",
  "full_name": "الصف الرابع - فصل A",
  "capacity": 50,
  "createdAt": "2026-09-06 09:50:58"
}
```

### List behaviour

- `filter[grade_id]`, `filter[stage_id]` (resolved through the grade)
- `search`: `section`, `full_name`
- `sort`: `id`, `section`, `capacity`, `created_at`
- `per_page` default **50**

---

## 6. Classroom Rosters — كشف فصل

One row = one student's placement in a class list for an academic year.

`GET|POST /classroom-rosters` · `GET|POST|DELETE /classroom-rosters/{id}` — `{id}` = numeric id.

### Request body

| Key | Required | Type | Label / notes |
|---|---|---|---|
| `student_id` | ✅ on create | int **or** student UUID string | اختر الطالب — a UUID is auto-resolved to the internal id |
| `grade_id` | ✅ on create | int → `grades` | الصف |
| `classroom_id` | ✅ on create | int → `classrooms` | الفصل — **must belong to `grade_id`** |
| `student_order` | — | int ≥1 | ترتيب الطالب |
| `list_number` | — | string ≤50 | رقم القائمة (e.g. `"1/1"`) |
| `class_supervisor` | — | string ≤255 | رائد الفصل |
| `academic_year` | ✅ on create | string ≤20 | العام الدراسي (e.g. `"2025/2026"`) |
| `target_lists` | — | int ≥0 | هدف قوائم |

**Uniqueness:** one roster row per `(student_id, academic_year)`.

### Resource object

```json
{
  "id": 12,
  "student_id": 21,
  "student": { "id": "766bd4bb-9045-4ed5-844c-5c5c29056313", "name": "أحمد علي", "code": "S00021" },
  "grade_id": 4,
  "grade": { "id": 4, "name": "الصف الرابع" },
  "classroom_id": 9,
  "classroom": { "id": 9, "name": "الصف الرابع - فصل A" },
  "student_order": 1,
  "list_number": "1/1",
  "class_supervisor": "أ. محمد",
  "academic_year": "2025/2026",
  "target_lists": 30,
  "createdAt": "2026-09-06 09:50:58"
}
```

### List behaviour

- `filter[grade_id]`, `filter[classroom_id]`, `filter[academic_year]`, `filter[student_id]`
- `search`: `list_number`, `class_supervisor`
- `sort`: `id`, `student_order`, `created_at` — default `student_order`
- `per_page` default **30**

---

## 7. Budgets — ميزانية / إحصاء الصف

Per-grade enrolment statistics. **One budget per grade** (`grade_id` is unique).

`GET|POST /budgets` · `GET|POST|DELETE /budgets/{id}` — `{id}` = numeric id.

### Request body

`grade_id` is required on create. Every count is **`nullable`, integer, `≥ 0`** — omitted counts fall back to `0`.

| Key | Label | Key | Label |
|---|---|---|---|
| `grade_id` | الصف | `classrooms_count` | عدد الفصول |
| `boys` | بنين | `girls` | بنات |
| `muslim` | مسلم | `christian` | مسيحي |
| `passed_and_transferred` | ناجحة ومنقولة | `new_student` | مستجد |
| `failed` | راسب | `dropped` | منقطع |
| `suspended` | موقوف القيد | `passed_second_round` | ناجح دور ثاني |
| `re_enrolled` | معاد القيد | `transferred_from_school` | المحوّلون من المدرسة |
| `transferred_to_school` | المحوّلون إلى المدرسة | `orphans` | أيتام الأب |
| `foreigners` | الوافدون | `integration` | الدمج |
| `transferred_by_law` | منقول بالقانون | `total` | الجملة |

> **`total` is stored, not auto-calculated.** Compute it client-side (sum of the 17 count columns — everything except `grade_id`, `classrooms_count`, `total`) and send it, or leave it `0`.

### Resource object

```json
{
  "id": 3,
  "grade_id": 4,
  "grade": { "id": 4, "name": "الصف الرابع", "stage_id": 1 },
  "classrooms_count": 4,
  "boys": 60,
  "girls": 55,
  "muslim": 100,
  "christian": 15,
  "passed_and_transferred": 90,
  "new_student": 20,
  "failed": 3,
  "dropped": 1,
  "suspended": 0,
  "passed_second_round": 2,
  "re_enrolled": 1,
  "transferred_from_school": 4,
  "transferred_to_school": 6,
  "orphans": 2,
  "foreigners": 1,
  "integration": 3,
  "transferred_by_law": 0,
  "total": 115,
  "createdAt": "2026-09-06 09:50:58"
}
```

### List behaviour

- `filter[grade_id]`
- `sort`: `id`, `total`, `created_at`
- `search`: none
- `per_page` default **50**

---

## 8. Schedules (weekly timetable) — جدول الحصص

One weekly timetable **per classroom** (`classroom_id` unique; soft-deleted).

`GET|POST /schedules` · `GET|POST|DELETE /schedules/{id}` — **`{id}` is the schedule UUID.**

### Constants

Every detail response echoes these so the client never hard-codes them:

- `days`: `["sunday", "monday", "tuesday", "wednesday", "thursday"]`
- `periods`: `[1, 2, 3, 4, 5, 6, 7]`

### Request body

| Key | Required | Type | Notes |
|---|---|---|---|
| `classroom_id` | ✅ on create | int → `classrooms`, unique | الفصل |
| `entries` | — | array | **When present, replaces the entire entry set.** Omit to leave entries untouched; send `[]` to clear all. Cells you don't send = empty. |
| `entries[].day` | required with `entries` | one of `days` | |
| `entries[].period` | required with `entries` | int in `periods` | |
| `entries[].subject_id` | required with `entries` | int → `subjects` (**numeric id**) | |
| `entries[].teacher_id` | — | teacher **UUID** string (from `/teachers/options`) | optional; a numeric id is also accepted |

**Rules**

- No two entries may share the same `(day, period)` → `422 "…slot is duplicated…"`.
- Unknown `teacher_id` → `422 "The selected entries.<i>.teacher_id is invalid."`.
- `classroom_id` already has a timetable → `422 "This classroom already has a timetable."`.

#### Example request

```json
{
  "classroom_id": 9,
  "entries": [
    { "day": "sunday", "period": 1, "subject_id": 6, "teacher_id": "4a74b573-18b0-4aa9-9e68-6cf931648e5e" },
    { "day": "monday", "period": 2, "subject_id": 4 }
  ]
}
```

### Index (list) row — slim

```json
{
  "id": "b1f2c3d4-…-uuid",
  "classroom": { "id": 9, "section": "A", "label": "الصف الرابع - فصل A" },
  "grade": { "id": 4, "name": "الصف الرابع" },
  "stage": { "id": 1, "name": "المرحلة الابتدائية" },
  "entries_count": 30,
  "createdAt": "2026-09-07 10:00:00"
}
```

List behaviour:

- `filter[classroom_id]`, `filter[grade_id]`, `filter[stage_id]`
- `sort`: `id`, `created_at` — default `-created_at`

### Show / Create / Update — full timetable

```json
{
  "id": "b1f2c3d4-…-uuid",
  "days": ["sunday", "monday", "tuesday", "wednesday", "thursday"],
  "periods": [1, 2, 3, 4, 5, 6, 7],
  "classroom": {
    "id": 9,
    "section": "A",
    "label": "الصف الرابع - فصل A",
    "grade": { "id": 4, "name": "الصف الرابع" },
    "stage": { "id": 1, "name": "المرحلة الابتدائية" }
  },
  "entries_count": 2,
  "entries": [
    {
      "day": "sunday",
      "period": 1,
      "subject_id": 6,
      "teacher_id": "4a74b573-18b0-4aa9-9e68-6cf931648e5e",
      "subject": { "id": 6, "name": "التربية الدينية", "code": "REL" },
      "teacher": { "id": "4a74b573-18b0-4aa9-9e68-6cf931648e5e", "name": "أحمد علي" }
    },
    {
      "day": "monday",
      "period": 2,
      "subject_id": 4,
      "teacher_id": null,
      "subject": { "id": 4, "name": "رياضيات", "code": "MATH" },
      "teacher": null
    }
  ],
  "createdAt": "2026-09-07 10:00:00",
  "updatedAt": "2026-09-07 10:05:00"
}
```

**Rendering the grid:** loop `days` × `periods`; for each cell find the entry whose `day` and `period` match, else render it empty.

**Round-trip:** `entries[].teacher_id` in the response is the same teacher **UUID** you send in the request — feed `GET /teachers/options` `id` straight into it. `subject_id` stays numeric (from `GET /subjects`).

---

## 9. Quick reference

| Resource | Base path | `{id}` | Create req. fields | Filters | Default sort | `per_page` |
|---|---|---|---|---|---|---|
| Stages | `/stages` | numeric | `name` | — | `order` | 50 |
| Grades | `/grades` | numeric | `stage_id`, `name` | `stage_id` | `order` | 50 |
| Classrooms | `/classrooms` | numeric | `grade_id`, `section` | `grade_id`, `stage_id` | `id` | 50 |
| Rosters | `/classroom-rosters` | numeric | `student_id`, `grade_id`, `classroom_id`, `academic_year` | `grade_id`, `classroom_id`, `academic_year`, `student_id` | `student_order` | 30 |
| Budgets | `/budgets` | numeric | `grade_id` | `grade_id` | `id` | 50 |
| Schedules | `/schedules` | **UUID** | `classroom_id` | `classroom_id`, `grade_id`, `stage_id` | `-created_at` | 15 |

### Entity relationships

```
Stage 1─┬─* Grade 1─┬─* Classroom 1─── 1 Schedule 1─── * ScheduleEntry ──> Subject
        │           │                                             └──> Teacher (optional)
        │           └─── 0..1 Budget
        │
        └ (Grade) 1─── * ClassroomRoster *─── 1 Student
                                          └── 1 Classroom
```
