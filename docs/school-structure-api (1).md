# School Structure Admin API — Frontend Guide

Covers the academic-structure admin screens:
**Stages · Grades · Classrooms · Classroom Rosters · Budgets · Schedules · New Books · Collections · School Fees · School Fees Registers**.

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

## 8b. Textbooks — `new-books` (الكتب الدراسية)

Per-grade textbook delivery sheet. **One sheet per grade** (`grade_id` is unique). Matches the admin UI at `/new-books` and `/new-books/create`.

`GET|POST /new-books` · `GET|POST|DELETE /new-books/{id}` — **`{id}` is the sheet UUID.**

### Create body

| Key | Req. | Type | Notes |
|---|---|---|---|
| `stage_id` | ✅ | int → `stages` | المرحلة — grade must belong to it |
| `grade_id` | ✅ | int → `grades` | الصف — unique across sheets |
| `total` | — | int ≥ 0 | اجمالي طلاب الصف — defaults to active student count in that grade |
| `items` | ✅ | array ≥ 1 | العدد والنسبة — subject rows |
| `items[].subject_id` | ✅ | int → `subjects` | المادة — distinct within the sheet |
| `items[].received` | ✅ | int ≥ 0 | إجمالي ما تم تسليمه |
| `items[].percentage` | — | 0..100 | النسبة % — auto `received / total * 100` when omitted |

On **update**, all fields are optional. Sending `items` **replaces** the whole set. Changing `total` alone recomputes percentages on existing rows.

### Filters / sort

`filter[stage_id]` · `filter[grade_id]` · `sort=id,total,created_at` (default `-created_at`).

### List row

```json
{
  "id": "…-uuid",
  "stage": { "id": 1, "name": "المرحلة الابتدائية" },
  "grade": { "id": 4, "name": "الصف الرابع" },
  "total": 120,
  "items_count": 3,
  "createdAt": "2026-09-07 10:00:00"
}
```

### Show / Create / Update

```json
{
  "id": "…-uuid",
  "stage_id": 1,
  "grade_id": 4,
  "stage": { "id": 1, "name": "المرحلة الابتدائية" },
  "grade": { "id": 4, "name": "الصف الرابع" },
  "total": 120,
  "items_count": 2,
  "items": [
    {
      "subject_id": 9,
      "received": 100,
      "percentage": 83.33,
      "subject": { "id": 9, "name": "اللغة العربية", "code": "AR" }
    },
    {
      "subject_id": 4,
      "received": 90,
      "percentage": 75,
      "subject": { "id": 4, "name": "الرياضيات", "code": "MATH" }
    }
  ],
  "createdAt": "2026-09-07 10:00:00",
  "updatedAt": "2026-09-07 10:05:00"
}
```

`422` when `grade_id` already has a sheet → `messages.new_book_grade_taken`.

---

## 8c. Fee collections — `collections` (التحصيلات بالطالب)

Per-student fee collection / payment receipt. Matches the admin UI at
[`/admin/collections`](https://elferdous.tsd-elfardous-school.com/admin/collections) and
[`/admin/collections/create`](https://elferdous.tsd-elfardous-school.com/admin/collections/create)
(under المصروفات → التحصيلات بالطالب).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/collections` | list (paginated) |
| `GET` | `/collections/summary` | header cards: الكل / اليوم / الاسبوع / الشهر / السنه |
| `POST` | `/collections` | create |
| `GET` | `/collections/{id}` | detail |
| `POST` | `/collections/{id}` | partial update |
| `DELETE` | `/collections/{id}` | soft delete |

**`{id}` is the collection UUID** (never the numeric DB id).

### Create body — `POST /collections`

Two form sections, mirroring the live create screen:

#### بيانات الطالب

| Key | Req. | Type / rules | UI label | Notes |
|---|---|---|---|---|
| `student_id` | ✅ | student **UUID** (or numeric id) | اسم الطالب* | resolved like rosters/schedules |
| `national_id` | — | string ≤20 | الرقم القومي | auto-snapshotted from the student when omitted |

#### بيانات السداد

| Key | Req. | Type / rules | UI label | Notes |
|---|---|---|---|---|
| `payment_status` | ✅ | `paid` \| `unpaid` | حالة السداد* | مدفوع / غير مدفوع |
| `payment_number` | — | string ≤100 | رقم إصدار السداد | |
| `payment_date` | — | date `YYYY-MM-DD` | تاريخ السداد | |
| `amount` | ✅ | number ≥ 0 | مبلغ السداد* | EGP (ج.م) |
| `notes` | — | string | ملاحظات | |

On **update** every field is optional — send only what changed.

**Example create**

```json
{
  "student_id": "a1b2c3d4-…-uuid",
  "payment_status": "paid",
  "payment_number": "REC-2026-00142",
  "payment_date": "2026-09-07",
  "amount": 1500.00,
  "notes": "قسط أول"
}
```

### List query

| Param | Purpose | UI control |
|---|---|---|
| `search=` | student name · national_id · payment_number · notes | بحث بالاسم |
| `filter[payment_status]=paid\|unpaid` | حالة السداد | Filters → مدفوع / غير مدفوع |
| `filter[student_id]=` | UUID or numeric | |
| `filter[period]=today\|week\|month\|year` | date buckets | اليوم / الاسبوع / الشهر / السنه |
| `filter[has_payment_number]=1\|0` | has / missing receipt no. | بـ رقم / بدون رقم |
| `filter[payment_date]=YYYY-MM-DD` | exact day | التاريخ |
| `filter[payment_date_from]=` · `filter[payment_date_to]=` | date range | |
| `sort=` | `id`, `amount`, `payment_date`, `created_at` (`-` = desc) | default `-created_at` |
| `per_page=` · `page=` · `fields=` | same as global conventions | |

### Summary — `GET /collections/summary`

Powers the list header counters (الكل / اليوم / الاسبوع / الشهر / السنه). Counts rows by `payment_date` (not `created_at`).

```json
{
  "success": true,
  "message": "Fee collections summary fetched successfully",
  "data": {
    "all": 120,
    "today": 3,
    "week": 18,
    "month": 45,
    "year": 120
  }
}
```

Clicking a card on the UI should re-fetch the list with the matching `filter[period]` (omit period for الكل).

### Resource shape (list / show / create / update)

```json
{
  "id": "…-uuid",
  "student_id": "a1b2c3d4-…-uuid",
  "student": {
    "id": "a1b2c3d4-…-uuid",
    "name": "محمد أحمد",
    "code": "123456789",
    "national_id": "29501011234567",
    "stage": { "id": 1, "name": "المرحلة الابتدائية" },
    "grade": { "id": 4, "name": "الصف الرابع" },
    "classroom": { "id": 9, "section": "A", "label": "الصف الرابع - فصل A" }
  },
  "national_id": "29501011234567",
  "payment_status": "paid",
  "payment_number": "REC-2026-00142",
  "payment_date": "2026-09-07",
  "amount": 1500,
  "notes": "قسط أول",
  "createdAt": "2026-09-07 10:00:00",
  "updatedAt": "2026-09-07 10:05:00"
}
```

`student_id` in responses is always the student **UUID** (same value you send on create). `amount` is a number. Soft-deleted rows disappear from list/show.

### Frontend wiring notes

- Student picker → use the student list/options API; pass the returned `id` (UUID) as `student_id`.
- Status select options: `{ value: "paid", label: "مدفوع" }` · `{ value: "unpaid", label: "غير مدفوع" }`.
- `national_id` on the form can be a read-only field filled from the selected student; the API will snapshot it if you omit it.
- Import / export buttons on the live list are **not** implemented in this API yet.

---

## 8d. School fees — `school-fees` (المصروفات / كشف المصروفات بالصف)

Per-student school fee receipt, scoped by grade + classroom. Matches the admin UI at
[`/admin/school-fees`](https://elferdous.tsd-elfardous-school.com/admin/school-fees) and
[`/admin/school-fees/create`](https://elferdous.tsd-elfardous-school.com/admin/school-fees/create)
(under المصروفات → كشف المصروفات بالصف).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/school-fees` | list (paginated) |
| `GET` | `/school-fees/summary` | header cards: الكل / اليوم / الاسبوع / الشهر / السنه |
| `POST` | `/school-fees` | create |
| `GET` | `/school-fees/{id}` | detail |
| `POST` | `/school-fees/{id}` | partial update |
| `DELETE` | `/school-fees/{id}` | soft delete |

**`{id}` is the school-fee UUID.**

### Create body — `POST /school-fees`

| Key | Req. | Type / rules | UI label | Notes |
|---|---|---|---|---|
| `grade_id` | ✅ | int → `grades` | الصف* | |
| `classroom_id` | ✅ | int → `classrooms` | الفصل* | must belong to `grade_id` |
| `student_id` | ✅ | student **UUID** (or numeric id) | اسم الطالب* | must match grade; classroom checked when the student has one |
| `national_id` | — | string ≤20 | الرقم القومي | auto-snapshotted from student when omitted |
| `receipt_number` | — | string ≤100 | رقم القسيمة | |
| `receipt_date` | — | date `YYYY-MM-DD` | تاريخ القسيمة | used by period filters / summary |
| `amount_pounds` | ✅ | int ≥ 0 | المبلغ (جنيه)* | |
| `amount_piasters` | — | int 0..99 | المبلغ (قرش) | defaults to `0` |
| `payment_status` | — | `paid` \| `unpaid` \| `installment` | الموقف من السداد | مدفوع / غير مدفوع / قسط |
| `academic_year` | — | string ≤20 | العام الدراسي | e.g. `2025/2026` |
| `notes` | — | string | ملاحظات | |

On **update** every field is optional.

**Example create**

```json
{
  "grade_id": 4,
  "classroom_id": 9,
  "student_id": "a1b2c3d4-…-uuid",
  "receipt_number": "V-2026-0088",
  "receipt_date": "2026-09-07",
  "amount_pounds": 2500,
  "amount_piasters": 50,
  "payment_status": "installment",
  "academic_year": "2025/2026",
  "notes": "قسط أول"
}
```

### List query

| Param | Purpose | UI control |
|---|---|---|
| `search=` | student name · national_id · receipt_number · notes | search |
| `filter[grade_id]=` | الصف | Filters → الصف |
| `filter[classroom_id]=` | الفصل | Filters → الفصل |
| `filter[student_id]=` | UUID or numeric | Filters → الطالب |
| `filter[payment_status]=paid\|unpaid\|installment` | الموقف من السداد | |
| `filter[academic_year]=` | العام الدراسي | |
| `filter[period]=today\|week\|month\|year` | date buckets on `receipt_date` | اليوم / الاسبوع / الشهر / السنه |
| `filter[receipt_date]=` · `filter[receipt_date_from]=` · `filter[receipt_date_to]=` | date / range | |
| `sort=` | `id`, `amount_pounds`, `receipt_date`, `created_at` | default `-created_at` |
| `per_page=` · `page=` · `fields=` | global conventions | |

Cascading selects on create: pick `grade_id` → load classrooms via `GET /academic/classrooms?filter[grade_id]=…` → pick student (optionally filter students by grade/classroom).

### Summary — `GET /school-fees/summary`

```json
{
  "success": true,
  "message": "School fees summary fetched successfully",
  "data": {
    "all": 80,
    "today": 2,
    "week": 11,
    "month": 30,
    "year": 80
  }
}
```

Counts use `receipt_date`. Card click → re-list with matching `filter[period]` (omit for الكل).

### Resource shape

```json
{
  "id": "…-uuid",
  "grade_id": 4,
  "classroom_id": 9,
  "student_id": "a1b2c3d4-…-uuid",
  "grade": { "id": 4, "name": "الصف الرابع" },
  "classroom": { "id": 9, "section": "A", "label": "الصف الرابع - فصل A" },
  "student": {
    "id": "a1b2c3d4-…-uuid",
    "name": "محمد أحمد",
    "code": "123456789",
    "national_id": "29501011234567"
  },
  "national_id": "29501011234567",
  "receipt_number": "V-2026-0088",
  "receipt_date": "2026-09-07",
  "amount_pounds": 2500,
  "amount_piasters": 50,
  "amount": 2500.5,
  "payment_status": "installment",
  "academic_year": "2025/2026",
  "notes": "قسط أول",
  "createdAt": "2026-09-07 10:00:00",
  "updatedAt": "2026-09-07 10:05:00"
}
```

`amount` is a convenience float = `amount_pounds + amount_piasters/100`. Responses expose student **UUID** in `student_id` / `student.id`. Soft-deleted rows are hidden.

### Frontend wiring notes

- Status options: `{ value: "paid", label: "مدفوع" }` · `{ value: "unpaid", label: "غير مدفوع" }` · `{ value: "installment", label: "قسط" }`.
- `national_id` can be read-only from the selected student; omit it and the API snapshots.
- Validate cascading: classroom ∈ grade, student ∈ grade (and classroom when set).
- Import / export on the live list are **not** in this API yet.

---

## 8e. School fees registers — `school-fees-registers` (سجل المتحصلات المدرسية)

Detailed per-student fees ledger. Matches the admin UI at
[`/admin/school-fees-registers`](https://elferdous.tsd-elfardous-school.com/admin/school-fees-registers) and
[`/admin/school-fees-registers/create`](https://elferdous.tsd-elfardous-school.com/admin/school-fees-registers/create)
(under المصروفات → سجل المتحصلات المدرسية).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/school-fees-registers` | list (paginated) |
| `GET` | `/school-fees-registers/summary` | header cards: الكل / اليوم / الاسبوع / الشهر / السنه |
| `POST` | `/school-fees-registers` | create |
| `GET` | `/school-fees-registers/{id}` | detail |
| `POST` | `/school-fees-registers/{id}` | partial update |
| `DELETE` | `/school-fees-registers/{id}` | soft delete |

**`{id}` is the register UUID.**

### Create body — `POST /school-fees-registers`

#### البيانات الأكاديمية

| Key | Req. | Type | UI | Notes |
|---|---|---|---|---|
| `grade_id` | — | int → `grades` | الصف | defaults from student |
| `classroom_id` | — | int → `classrooms` | الفصل | must belong to grade; defaults from student |
| `student_id` | ✅ | student **UUID** | اسم الطالب | |

#### بيانات الطالب

| Key | Req. | Type | UI | Notes |
|---|---|---|---|---|
| `entry_date` | — | date | تاريخ الدخول | |
| `birth_date` | — | date before today | تاريخ الميلاد | defaults from student |
| `age_on_oct1` | — | int 0..30 | السن في أول أكتوبر | auto from `birth_date` (as of Oct 1 of current academic year) |
| `nationality` | — | string ≤100 | جنسية الطالب | |
| `religion` | — | `muslim` \| `christian` | الديانة | مسلم / مسيحي — defaults from student when mappable |
| `enrollment_status` | — | see below | القيد | |
| `stay_duration` | — | string ≤100 | مدة بقاؤه | |

`enrollment_status` values:

| Value | UI |
|---|---|
| `enrolled` | مقيد |
| `transferred` | محول |
| `graduated` | متخرج |
| `dismissed` | مفصول |

#### المتحصلات

| Key | UI |
|---|---|
| `fee_parents` | آباء |
| `fee_labs` | معامل |
| `fee_accidents` | حوادث |
| `fee_libraries` | مكتبات |
| `fee_union` | اتحاد |
| `fee_notebooks` | كراسات |
| `fee_total` | الجملة |

All fee fields are `number ≥ 0` (default `0`). If `fee_total` is omitted, the API sums the six line items.

#### إيصال المتحصلات / رسم إعادة القيد / ولي الأمر

| Key | UI |
|---|---|
| `receipt_number` | رقم القسيمة |
| `receipt_date` | تاريخها |
| `re_enroll_fee` | إعادة القيد (مبلغ) |
| `re_enroll_receipt_number` | رقم القسيمة (إعادة قيد) |
| `re_enroll_receipt_date` | تاريخها |
| `father_name` / `father_job` | اسم والد التلميذ / صناعته |
| `guardian_name` / `guardian_job` | اسم ولي الأمر / صناعته |
| `notes` | ملاحظات |

On **update** every field is optional. Changing fee lines without sending `fee_total` recalculates الجملة.

**Example create**

```json
{
  "student_id": "a1b2c3d4-…-uuid",
  "grade_id": 4,
  "classroom_id": 9,
  "entry_date": "2024-09-01",
  "birth_date": "2014-03-12",
  "nationality": "مصري",
  "religion": "muslim",
  "enrollment_status": "enrolled",
  "stay_duration": "سنتان",
  "fee_parents": 100,
  "fee_labs": 50,
  "fee_accidents": 20,
  "fee_libraries": 15,
  "fee_union": 10,
  "fee_notebooks": 5,
  "receipt_number": "R-2026-001",
  "receipt_date": "2026-09-07",
  "re_enroll_fee": 0,
  "father_name": "أحمد محمد",
  "father_job": "مهندس",
  "guardian_name": "أحمد محمد",
  "guardian_job": "مهندس",
  "notes": null
}
```

### List query

| Param | Purpose | UI |
|---|---|---|
| `search=` | student name · nationality · receipt_number · father/guardian name · notes | بحث بالاسم |
| `filter[grade_id]=` | الصف | |
| `filter[classroom_id]=` | الفصل | |
| `filter[student_id]=` | UUID or numeric | |
| `filter[religion]=muslim\|christian` | الديانة | |
| `filter[enrollment_status]=enrolled\|transferred\|graduated\|dismissed` | القيد | |
| `filter[period]=today\|week\|month\|year` | on `receipt_date` | الكل / اليوم / … |
| `filter[receipt_date]=` · `_from` · `_to` | date / range | |
| `sort=` | `id`, `fee_total`, `receipt_date`, `entry_date`, `created_at` | default `-created_at` |

### Summary — `GET /school-fees-registers/summary`

Same shape as other fee resources: `{ all, today, week, month, year }` counted by `receipt_date`.

### Resource shape

```json
{
  "id": "…-uuid",
  "grade_id": 4,
  "classroom_id": 9,
  "student_id": "a1b2c3d4-…-uuid",
  "grade": { "id": 4, "name": "الصف الرابع" },
  "classroom": { "id": 9, "section": "A", "label": "الصف الرابع - فصل A" },
  "student": {
    "id": "a1b2c3d4-…-uuid",
    "name": "محمد أحمد",
    "code": "123456789",
    "national_id": "29501011234567"
  },
  "entry_date": "2024-09-01",
  "birth_date": "2014-03-12",
  "age_on_oct1": 11,
  "nationality": "مصري",
  "religion": "muslim",
  "enrollment_status": "enrolled",
  "stay_duration": "سنتان",
  "fee_parents": 100,
  "fee_labs": 50,
  "fee_accidents": 20,
  "fee_libraries": 15,
  "fee_union": 10,
  "fee_notebooks": 5,
  "fee_total": 200,
  "receipt_number": "R-2026-001",
  "receipt_date": "2026-09-07",
  "re_enroll_fee": 0,
  "re_enroll_receipt_number": null,
  "re_enroll_receipt_date": null,
  "father_name": "أحمد محمد",
  "father_job": "مهندس",
  "guardian_name": "أحمد محمد",
  "guardian_job": "مهندس",
  "notes": null,
  "createdAt": "2026-09-07 10:00:00",
  "updatedAt": "2026-09-07 10:05:00"
}
```

### Frontend wiring notes

- Religion: `{ value: "muslim", label: "مسلم" }` · `{ value: "christian", label: "مسيحي" }`.
- Enrollment: `{ value: "enrolled", label: "مقيد" }` · `transferred`→محول · `graduated`→متخرج · `dismissed`→مفصول.
- `age_on_oct1` can be read-only; send only to override.
- `fee_total` can be read-only; omit to auto-sum the six fee lines.
- Prefill father/guardian/religion/birth_date/grade/classroom from the selected student when available.

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
| New books | `/new-books` | **UUID** | `stage_id`, `grade_id`, `items[]` | `stage_id`, `grade_id` | `-created_at` | 15 |
| Collections | `/collections` | **UUID** | `student_id`, `payment_status`, `amount` | `payment_status`, `student_id`, `period`, `has_payment_number`, `payment_date*` | `-created_at` | 15 |
| School fees | `/school-fees` | **UUID** | `grade_id`, `classroom_id`, `student_id`, `amount_pounds` | `grade_id`, `classroom_id`, `student_id`, `payment_status`, `academic_year`, `period`, `receipt_date*` | `-created_at` | 15 |
| Fees registers | `/school-fees-registers` | **UUID** | `student_id` | `grade_id`, `classroom_id`, `student_id`, `religion`, `enrollment_status`, `period`, `receipt_date*` | `-created_at` | 15 |

### Entity relationships

```
Stage 1─┬─* Grade 1─┬─* Classroom 1─── 1 Schedule 1─── * ScheduleEntry ──> Subject
        │           │                                             └──> Teacher (optional)
        │           ├─── 0..1 Budget
        │           └─── 0..1 NewBook 1─── * NewBookItem ──> Subject
        │
        └ (Grade) 1─── * ClassroomRoster *─── 1 Student 1─┬─ * FeeCollection
                                          └── 1 Classroom     ├─ * SchoolFee
                                                              └─ * SchoolFeesRegister
```
