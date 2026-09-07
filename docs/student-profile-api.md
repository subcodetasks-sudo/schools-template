# Student Profile API — Frontend Guide

Student SPA: [`https://schools.subcodeco.com/profile`](https://schools.subcodeco.com/profile)

One **GET** returns **personal + schedule + statistics**.  
**POST** edits **personal** (and father contact) only — schedule / statistics are read-only.

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
| `GET` | `/profile` | personal + schedule + statistics |
| `POST` | `/profile` | edit personal fields only |

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
        }
      ]
    },
    "statistics": {
      "evaluation": {
        "assignments": null,
        "tests": null
      },
      "cards": {
        "attendance": { "rate": null, "sessions": null },
        "callups": { "count": 0 },
        "tests": { "completed": 0 },
        "absences": { "count": 0 }
      }
    }
  }
}
```

Notes:
- `schedule` is `null` when the student has no classroom or no timetable yet.
- `statistics` cards are placeholders until attendance / call-ups / tests APIs exist (zeros / nulls).

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
  "father_national_id": "2801…"
}
```

### Success `200`

Same `data` shape as GET (personal + schedule + statistics), with updated personal values. Changing `phone` also updates the linked `users.phone`.
