# Students Admin API — Frontend Guide

The student profile CRUD, the student-card QR endpoints, and the public
two-step self-registration flow.

Related: [school-structure-api.md](./school-structure-api.md) (stages / grades / classrooms / rosters / budgets / schedules).

---

## 1. Conventions (same as the rest of the admin API)

- **Base URL:** `{API}/api/v1/auth/admin`
- **Headers:** `Authorization: Bearer <accessToken>` · `Accept: application/json`
  Token from `POST {API}/api/v1/auth/admin/login` → `data.accessToken` (8 h TTL).
  `401` = missing/expired token · `403` = token isn't an active admin.
- **Updates use `POST`** (not PUT/PATCH). Body is plain JSON.
- **Envelope:** `{ "success": bool, "message": string, "data": … }`
- **Create** → `201` · **Show/Update** → `200` (+ `ETag`, honours `If-None-Match` → `304`) · **Delete** → `200`, `data: null`.
- **List** → `data: { data: [...], meta: { total, per_page, current_page, last_page }, links: { next } }`
- **List query:** `search=` · `filter[<key>]=` · `sort=` (`-` = desc) · `per_page=` · `page=` · `fields=a,b,c` (sparse — `id` always kept).
- **Validation error** → `422 { "message": "...", "errors": { "field": ["..."] } }`

> **The `{id}` in every student path is the student UUID** (the `id` field of the resource), never the numeric DB id.

---

## 2. Endpoints

| Method | Path | Purpose | Success |
|---|---|---|---|
| `GET` | `/students` | list (paginated, full objects) | `200` |
| `POST` | `/students` | create | `201` |
| `GET` | `/students/{uuid}` | detail | `200` + `ETag` |
| `POST` | `/students/{uuid}` | partial update | `200` |
| `DELETE` | `/students/{uuid}` | delete (soft delete) | `200` |
| `GET` | `/students/{uuid}/qr?size=320` | student-card QR as **SVG image** (not JSON) | `200` `image/svg+xml` |
| `POST` | `/students/{uuid}/qr/rotate` | issue a new QR token (invalidates the printed card) | `200` (full student object) |
| `GET` | `{API}/api/v1/students/verify/{qrToken}` | **public**, no auth — resolve a scanned QR to a minimal identity | `200` / `404` |

Self-registration (public) — see §7.

`GET /students/{uuid}/qr`: `size` is clamped to `120..1024` (default `320`). Response is raw SVG with `Cache-Control: private, max-age=86400` — **no envelope**.

---

## 3. Request body — `POST /students` (create)

Grouped the way the enrolment wizard is laid out. On **create**, only the fields marked ✅ are required; everything else is optional/nullable. On **update** *all* fields are optional — send only what changed.

### 3.1 — بيانات الطالب (student)

| Key | Req. | Type / rules | Notes |
|---|---|---|---|
| `name` | ✅ | string ≤255 | الاسم |
| `national_id` | ✅ | string ≤20, unique in `students` | الرقم القومي |
| `birth_date` | — | date, before today | `YYYY-MM-DD` |
| `gender` | — | one of `male`, `female`, `ذكر`, `أنثى` | |
| `governorate` | — | string ≤255 | المحافظة |
| `district` | — | string ≤255 | الإدارة التعليمية |
| `phone` | — | string ≤20 | هاتف الطالب |
| `email` | — | email ≤255, unique in `users` | optional login email |
| `code` | — | string ≤50, unique | كود الطالب — **auto-generated (9 digits) when omitted** |
| `insurance_number` | — | string ≤50 | رقم التأمين |
| `image` | — | **string** URL/path ≤2048 | صورة الطالب — upload via `/api/v1/media` first, then pass the URL (no file upload on this endpoint) |
| `birth_certificate` | — | **string** URL/path ≤2048 | شهادة الميلاد — same as `image` |
| `stage_id` | ✅ | int → `stages` | المرحلة |
| `grade_id` | ✅ | int → `grades` | الصف — **must belong to `stage_id`** |
| `classroom_id` | ✅ | int → `classrooms` | الفصل — **must belong to `grade_id`** |
| `class_number` | — | string ≤20 | رقم الطالب بالفصل |
| `religion` | ✅ | string ≤50 | الديانة |
| `status` | ✅ | string ≤50 | حالة القيد (enrollment status) |
| `is_active` | — | boolean (default `true`) | نشط |
| `is_promoted` | — | boolean (default `false`) | منقول للصف التالي |
| `password` | — | string, min 8, `confirmed` | when present, **creates the linked `users` login** (send `password_confirmation` too). Omit → student has no login account. |

### 3.2 — الباص (transport)

| Key | Req. | Type / rules | Notes |
|---|---|---|---|
| `bus_subscription` | — | boolean | مشترك في الباص |
| `bus_supervisor_name` | conditional | string ≤255 | اسم مشرف الباص — **required when `bus_subscription` is `true`**. Sending `bus_subscription: false` auto-clears it. |

### 3.3 — بيانات ولي الأمر (guardian)

| Key | Type | Key | Type |
|---|---|---|---|
| `father_name` | string ≤255 | `mother_name` | string ≤255 |
| `father_national_id` | string ≤20 | `mother_national_id` | string ≤20 |
| `father_job` | string ≤255 | `mother_job` | string ≤255 |
| `father_phone` | string ≤20 | `mother_phone` | string ≤20 |
| `father_qualification` | string ≤255 | `mother_qualification` | string ≤255 |
| `father_address` | string ≤500 | `mother_address` | string ≤500 |
| `educational_guardianship` | string ≤255 | `guardian_name` | string ≤255 |
| `reason_guardianship` | string ≤255 | `guardian_relation` | string ≤100 |
| | | `guardian_national_id` | string ≤20 |
| | | `guardian_qualification` | string ≤255 |
| | | `guardian_job` | string ≤255 |
| | | `guardian_address` | string ≤500 |

### 3.4 — بيانات إضافية (additional)

| Key | Type | Key | Type |
|---|---|---|---|
| `school_transfers` | string ≤500 | `school_fees` | string ≤255 |
| `reading_books` | string ≤255 | `payment_receipt_number` | string ≤100 |
| `math` | string ≤255 | `payment_date` | date |
| `reading_program` | string ≤255 | `payment_amount` | numeric ≥0 |
| `first_language` | string ≤100 | `special_case1`…`special_case4` | string ≤255 each |
| `second_language` | string ≤100 | `original_nationality` | string ≤100 |
| `exemptions` | string ≤255 | `country_from` | string ≤100 |
| | | `other_nationality` | string ≤100 |

### Cross-field validation

- `grade_id` must belong to `stage_id`, else `422 { "errors": { "grade_id": [...] } }`.
- `classroom_id` must belong to `grade_id`, else `422 { "errors": { "classroom_id": [...] } }`.
- `bus_supervisor_name` required when subscribed (see 3.2).

### Minimal create example

```json
{
  "name": "أحمد علي محمد",
  "national_id": "31001011234567",
  "stage_id": 1,
  "grade_id": 4,
  "classroom_id": 9,
  "religion": "islam",
  "status": "active"
}
```

---

## 4. Request body — `POST /students/{uuid}` (update)

Identical keys, **all optional**. Differences:

- `national_id`, `code`, `email` uniqueness checks **ignore the current student**.
- `password` (+ `password_confirmation`) updates the linked user's password.
- `bus_subscription: false` in the payload clears `bus_supervisor_name` automatically.
- `bus_supervisor_name` is still required if the student ends up subscribed (whether newly or already).

---

## 5. Response object (`data`)

Returned by **create / show / update / qr rotate**, and as each **list** row.
`stage` / `grade` / `classroom` objects are always present. `account` is present but `null` when the student has no login.

```json
{
  "id": "766bd4bb-9045-4ed5-844c-5c5c29056313",

  "account": {
    "user_id": 21,
    "email": "31001011234567@student.school",
    "type": "student"
  },

  "qr": {
    "token": "jnclq5acfis4ipllxjhcxw96",
    "payload": "https://<api-host>/api/v1/students/verify/jnclq5acfis4ipllxjhcxw96",
    "image_url": "https://<api-host>/api/v1/auth/admin/students/766bd4bb-.../qr"
  },

  "student": {
    "name": "أحمد علي محمد",
    "national_id": "31001011234567",
    "birth_date": "2014-01-01",
    "gender": "male",
    "governorate": "القاهرة",
    "district": "إدارة شرق",
    "phone": "01000000000",
    "email": null,
    "code": "300112345",
    "insurance_number": null,
    "image": "https://<api-host>/storage/media/12/photo.jpg",
    "birth_certificate": null,
    "religion": "islam",
    "status": "active",
    "is_active": true,
    "is_promoted": false,
    "class_number": "12",
    "stage":     { "id": 1, "name": "المرحلة الابتدائية" },
    "grade":     { "id": 4, "name": "الصف الرابع" },
    "classroom": { "id": 9, "name": "الصف الرابع - فصل A" },
    "stage_id": 1,
    "grade_id": 4,
    "classroom_id": 9
  },

  "guardian": {
    "father": {
      "name": "علي محمد",
      "national_id": "28001010000000",
      "job": "مهندس",
      "phone": "01000000001",
      "qualification": "بكالوريوس",
      "address": "...",
      "educational_guardianship": null,
      "reason_guardianship": null
    },
    "mother": {
      "name": "سعاد ...",
      "national_id": null,
      "job": null,
      "phone": null,
      "qualification": null,
      "address": null
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

  "transport": {
    "bus_subscription": true,
    "bus_supervisor_name": "أ. سمير"
  },

  "additional": {
    "school_transfers": null,
    "reading_books": null,
    "math": null,
    "reading_program": null,
    "first_language": "العربية",
    "second_language": "الإنجليزية",
    "exemptions": null,
    "school_fees": null,
    "payment_receipt_number": null,
    "payment_date": null,
    "payment_amount": null,
    "special_case1": null,
    "special_case2": null,
    "special_case3": null,
    "special_case4": null,
    "original_nationality": null,
    "country_from": null,
    "other_nationality": null
  },

  "createdAt": "2026-09-06 09:50:58",
  "updatedAt": "2026-09-07 11:20:04"
}
```

Field notes:

| Path | Notes |
|---|---|
| `id` | student UUID — use everywhere a `{uuid}` path segment is needed |
| `account` | `null` when the student has no `users` login |
| `qr.image_url` | GET it for the SVG card (needs the admin bearer token) |
| `qr.payload` | the URL encoded in the QR; scanning it hits the public verify endpoint |
| `student.birth_date`, `additional.payment_date` | `YYYY-MM-DD` or `null` |
| `student.image`, `student.birth_certificate` | plain strings (URLs) |
| `additional.payment_amount` | string, 2 decimals (e.g. `"150.00"`) or `null` |
| `transport.bus_supervisor_name` | always `null` while `bus_subscription` is `false` |

---

## 6. List behaviour — `GET /students`

- **Rows:** full response object (§5) per student.
- **Filters:** `filter[stage_id]`, `filter[grade_id]`, `filter[classroom_id]`, `filter[status]`, `filter[religion]`, `filter[gender]`, `filter[is_active]`, `filter[is_promoted]`, `filter[bus_subscription]`
- **Search (`?search=`):** `name`, `national_id`, `code`, `email`
- **Sort (`?sort=`):** `id`, `name`, `code`, `created_at` (prefix `-` for desc)
- **`per_page`** default **15**

Example: `GET /students?filter[classroom_id]=9&filter[bus_subscription]=1&sort=name&per_page=50`

---

## 7. Student-card QR

### `GET /students/{uuid}/qr?size=320`
Admin only. Returns an **SVG image** (`Content-Type: image/svg+xml`), not JSON. `size` clamped `120..1024`.

### `POST /students/{uuid}/qr/rotate`
Admin only. Issues a fresh `qr_token`, invalidating any previously printed card.
```json
{ "success": true, "message": "Student QR token re-issued successfully", "data": { /* full student object §5 */ } }
```

### `GET {API}/api/v1/students/verify/{qrToken}`
**Public** (no auth, rate-limited). Resolves a scanned token to a minimal, safe identity — no guardian data, no national id.
```json
{
  "success": true,
  "message": "Student fetched successfully",
  "data": {
    "id": "766bd4bb-...",
    "name": "أحمد علي محمد",
    "code": "300112345",
    "status": "active",
    "stage": "المرحلة الابتدائية",
    "grade": "الصف الرابع",
    "classroom": "الصف الرابع - فصل A"
  }
}
```
Invalid / unknown token → `404 { "success": false, "message": "This QR code is not valid.", "data": null }`.

---

## 8. Public self-registration (two steps)

Prefix `{API}/api/v1/auth/student/register`, no auth, rate-limited. Used by students who were created by an admin **without** a password.

### Step 1 — `POST /step1`
```json
// request
{ "national_id": "31001011234567", "code": "300112345" }

// 200
{
  "success": true,
  "message": "...",
  "data": {
    "token": "<opaque registration token, valid 30 min>",
    "student": { "name": "أحمد علي محمد", "code": "300112345", "national_id": "31001011234567" }
  }
}
```
Errors (`422`): identity not found, or an account already exists for this student.

### Step 2 — `POST /step2`
```json
// request  (token may instead be sent as  Authorization: Bearer <token>)
{
  "token": "<from step 1>",
  "phone": "01000000000",
  "password": "Passw0rd!",
  "confirm_password": "Passw0rd!"   // or "password_confirmation"
}

// 201  -> user payload + auth token, ready to use
{
  "success": true,
  "message": "...",
  "data": { "...user fields...", "token": "<sanctum token>", "role": "student" }
}
```
Password rules: min 8, must contain letters, mixed case, and numbers.
Errors (`422`): token invalid / expired, or account already exists.

After step 2 the student logs in via `POST {API}/api/v1/auth/login` with **`national_id` + `password`**.

---

## 9. Quick reference

| | |
|---|---|
| Base | `{API}/api/v1/auth/admin` |
| Path id | student **UUID** |
| Create required | `name`, `national_id`, `stage_id`, `grade_id`, `classroom_id`, `religion`, `status` |
| Creates a login? | only when `password` is sent |
| Filters | `stage_id`, `grade_id`, `classroom_id`, `status`, `religion`, `gender`, `is_active`, `is_promoted`, `bus_subscription` |
| Search | `name`, `national_id`, `code`, `email` |
| Sort | `id`, `name`, `code`, `created_at` |
| `per_page` default | 15 |
| Response blocks | `account`, `qr`, `student`, `guardian`, `transport`, `additional` |
