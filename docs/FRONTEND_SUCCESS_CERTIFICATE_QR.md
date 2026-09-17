# Frontend guide — Success certificate (شهادة نجاح) gated by QR

The student’s **success certificate with grades** stays locked until they enter or scan their **current student-card QR** (`qr_token`). The backend never returns grade numbers while locked.

Related: [student-profile-api.md](./frontend/student-profile-api.md) · public verify `GET /api/v1/students/verify/{qrToken}`.

---

## 1. Concept

| | |
|--|--|
| Document | شهادة نجاح — approved final results only |
| Unlock key | Current card `qr_token` (typed or scanned) |
| Persist | `success_certificate_unlocked_at` once; cleared when admin rotates QR |
| Security | Grades never sent while locked — do not hide on the client only |

```text
Authenticate → resolve student → check unlock
  → locked: { unlocked: false, certificate: null }   // no grade queries
  → unlocked: validate academic_year → fetch approved finals → certificate
```

---

## 2. Auth & endpoints

Base: `{API}/api/v1/auth/student`  
Headers: `Authorization: Bearer <student token>` · `Accept: application/json`  
Envelope: `{ success, message, data }`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/profile` | Includes `success_certificate_unlocked: bool` |
| POST | `/profile/success-certificate/unlock` | Enter / scan QR |
| GET | `/profile/success-certificate?academic_year=` | Certificate payload |
| GET | `/profile/annual-report?academic_year=` | Subject grades gated the same way |

---

## 3. Unlock — `POST /profile/success-certificate/unlock`

```json
{ "qr_token": "abc…raw-token…xyz" }
```

Also accepted: full scan URL containing `/api/v1/students/verify/{token}` — backend extracts the token.

| Rule | Detail |
|------|--------|
| Owner only | Token must match **this** student’s current `qr_token` |
| Not a global lookup | Scanning another student’s card does **not** unlock yours (or theirs via this endpoint) |
| Idempotent | Already unlocked + correct token → same `{ unlocked: true, unlocked_at }` (timestamp unchanged) |
| After rotate | Old card fails; new card unlocks again |

**Success `200`:**

```json
{
  "success": true,
  "message": "تم فتح شهادة النجاح بنجاح",
  "data": {
    "unlocked": true,
    "unlocked_at": "2026-09-17 15:30:00"
  }
}
```

**Mismatch `422`:** `success_certificate_qr_mismatch` on `qr_token` (no hint if the token belongs to someone else).

---

## 4. Certificate — `GET /profile/success-certificate`

Query: `academic_year` optional (default = current year). Must exist and apply to this student’s grade / enrolment.

### Locked (required shape — no grades)

```json
{
  "success": true,
  "data": {
    "unlocked": false,
    "unlocked_at": null,
    "certificate": null
  }
}
```

**Do not** expect subjects with totals while `unlocked: false`.

### Unlocked

```json
{
  "success": true,
  "data": {
    "unlocked": true,
    "unlocked_at": "2026-09-17 15:30:00",
    "certificate": {
      "student": { "id": "…", "name": "…", "code": "…", "grade": {…}, "classroom": {…} },
      "academic_year": "2025/2026",
      "subjects": [
        {
          "term": "first",
          "subject": { "id": 1, "name": "الرياضيات" },
          "year_work": { "score": 45, "max": 50 },
          "final_exam": { "score": 42, "max": 50 },
          "total": 87,
          "total_max": 100,
          "percentage": 87.0,
          "status": "pass",
          "approval_status": "approved"
        }
      ],
      "summary": {
        "subjects_count": 1,
        "subjects_passed": 1,
        "subjects_failed": 0,
        "subjects_incomplete": 0
      }
    }
  }
}
```

Only rows with `approval_status = approved` appear. Invalid `academic_year` → `422` `success_certificate_academic_year_invalid`.

---

## 5. Annual report gate

`GET /profile/annual-report` when locked:

- `assessments.subjects` → `[]`
- `assessments.subjects_locked` → `true`
- `summary.subjects_passed` / `failed` / `incomplete` → `null`
- Attendance, weekly assessments, fees unchanged

Backend does **not** call final-result detail while locked.

---

## 6. UI checklist

| State | UI |
|-------|-----|
| `success_certificate_unlocked === false` | Show “أدخل / امسح QR الكارنيه”; hide certificate grades |
| Unlock | Camera scan or paste → `POST …/unlock` with `qr_token` |
| Unlocked | `GET …/success-certificate` and render certificate |
| Card reissued | Admin rotated QR → student must unlock again |

---

## 7. Out of scope

- Online payment for the QR card  
- Server-generated PDF  
- Enrollment / good-conduct documents  
