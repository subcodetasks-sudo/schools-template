# دليل نقل بوابة الطالب (Student SPA) — آخر أسبوع + الحالة الحالية

**الغرض:** تكرار نفس الـ API + UI flow في مشروع Frontend آخر.  
**المصادر في هذا الريبو:** `docs/student-profile-api.md` · `docs/monthly-assessments-api.md` · `docs/FRONTEND_SUCCESS_CERTIFICATE_QR.md` · `docs/parent-summons-on-profile.md` · `docs/student-notifications-api.md`  
**الفترة المغطاة:** ~9–22 سبتمبر 2026 (commits + تعديلات البيانات الشخصية / ولي الأمر).

---

## 0. ملخص سريع

| المجال | ما تم |
|--------|--------|
| Auth | Login بـ `national_id` + `password` → Bearer token → redirect إلى `/profile` |
| Profile shell | `ProfileProvider` يعمل `GET /profile` مرة واحدة ويغذي كل الصفحات |
| Personal | عرض + تعديل جزئي + Alert لو بيانات الأب/ولي الأمر ناقصة |
| Schedule / Statistics / Callups | من نفس `GET /profile` (read-only) |
| Attendance | `GET /profile/absences` |
| Weekly / Monthly | endpoints منفصلة للتقييمات |
| Certificate | QR unlock ثم `GET /profile/success-certificate` |
| Notifications | Firebase + `/api/v1/notifications` |

---

## 1. UI Flow (من اللوجين للنهاية)

```text
LoginPage
  POST /api/v1/auth/login  { national_id, password }
  → save token + user
  → navigate('/profile')   // أو redirect محفوظ

ProtectedRoute
  → يجب وجود token وإلا → /login

ProfileLayout + ProfileProvider
  → GET /api/v1/auth/student/profile
  → يملأ: personal, schedule, statistics, callups, success_certificate_unlocked
  → sidebar: اسم الطالب + grade_label + صورة

┌─ /profile (PersonalInfoPage) ─────────────────────────────┐
│  عرض الحقول الشخصية                                      │
│  إن father أو guardian ناقص → Alert + toast.warning      │
│  زر «إكمال البيانات» / «تعديل» → وضع edit                 │
│  editable فقط ما يقبله POST /profile                      │
│  رفع صورة → media upload ثم POST { image: url }          │
└───────────────────────────────────────────────────────────┘

/profile/schedule          ← schedule من الـ context
/profile/statistics        ← statistics.cards من الـ context
/profile/parent-summon     ← callups[] من الـ context
/profile/attendance        ← GET /profile/absences (?filters)
/profile/weekly-evaluations← GET /profile/weekly-assessments
/profile/monthly-evaluations← GET /profile/monthly-assessments
/profile/certificate       ← unlock QR ثم GET success-certificate
/profile/notifications     ← notifications API + Firebase
```

### Routes المطلوبة

| Path | Page |
|------|------|
| `/login` | LoginPage |
| `/profile` | PersonalInfoPage (index) |
| `/profile/certificate` | CertificatePage |
| `/profile/weekly-evaluations` | WeeklyEvaluationsPage |
| `/profile/monthly-evaluations` | MonthlyEvaluationsPage |
| `/profile/schedule` | SchedulePage |
| `/profile/attendance` | AttendancePage |
| `/profile/parent-summon` | ParentSummonPage |
| `/profile/statistics` | StatisticsPage |
| `/profile/notifications` | NotificationsPage |

كل مسارات `/profile/*` خلف `ProtectedRoute` وداخل `ProfileLayout`.

---

## 2. اتفاقيات الـ API

- **Base (طالب):** `{API}/api/v1/auth/student`
- **Auth:** `Authorization: Bearer <accessToken>`
- **Headers:** `Accept: application/json` · اختياري `Accept-Language: ar|en`
- **Envelope:** `{ "success": bool, "message": string, "data": … }`
- **التعديل:** `POST` وليس PUT/PATCH
- **403** = التوكن مش حساب طالب · **404** = مفيش student مربوط باليوزر

---

## 3. جدول الـ Endpoints

| Method | Path | استخدام الـ UI |
|--------|------|----------------|
| `POST` | `/api/v1/auth/login` | Login |
| `GET` | `/profile` | ProfileProvider + إحصائيات + جدول + استدعاءات |
| `POST` | `/profile` | تعديل شخصي / أب / ولي أمر / صورة |
| `GET` | `/profile/absences` | صفحة الحضور والغياب |
| `GET` | `/profile/weekly-assessments` | التقييمات الأسبوعية |
| `GET` | `/profile/monthly-assessments` | التقييم الشهري (مجموع الأسبوعي) |
| `GET` | `/profile/annual-report` | (اختياري) تقرير سنوي مجمّع |
| `GET` | `/profile/success-certificate` | شهادة النجاح |
| `POST` | `/profile/success-certificate/unlock` | فتح الشهادة بـ QR الكارنيه |
| `*` | `/api/v1/notifications…` | الإشعارات (انظر doc منفصل) |

المسارات أعلاه بعد الـ base ما عدا login والـ notifications.

---

## 4. `GET /profile` — الشكل الأساسي

```jsonc
{
  "personal": {
    "id", "name", "initials", "grade_label", "image",
    "national_id", "student_code", "phone", "religion",
    "registration_status", "class_number",
    "transfers", "fees", "payment_voucher", "payment_date", "payment_amount",
    "stage": { "id", "name" },
    "grade": { "id", "name" },
    "classroom": { "id", "section", "label" },
    "father": { "national_id", "address", "job", "phone" },
    "guardian": { "name", "relation", "national_id", "qualification", "job", "address" }
  },
  "schedule": { "days", "periods", "classroom", "entries", "slots" } | null,
  "statistics": {
    "evaluation": { "assignments", "tests" },
    "cards": {
      "attendance": { "rate", "sessions" },
      "callups": { "count" },
      "tests": { "completed" },
      "absences": { "count" }
    }
  },
  "callups": [
    { "id", "reason", "summons_date", "academic_year", "notes", "created_at" }
  ],
  "success_certificate_unlocked": false
}
```

**ملاحظات مهمة للنقل:**

- فضّل `schedule.slots[].assignments[]` للجدول (ممكن أكثر من مادة في نفس الحصة).
- `father` ≠ `guardian` — كتلتان مستقلتان؛ اعرض المعبّأ فقط.
- `callups` newest-first؛ العدد في `statistics.cards.callups.count`.

---

## 5. `POST /profile` — الحقول القابلة للتعديل فقط

| Key | ملاحظات |
|-----|---------|
| `phone` | ≤20 — يحدّث `users.phone` أيضاً |
| `image` | URL/path ≤2048 |
| `religion` | ≤50 |
| `father_national_id` / `father_address` / `father_job` / `father_phone` | |
| `guardian_name` / `guardian_relation` / `guardian_national_id` | |
| `guardian_qualification` / `guardian_job` / `guardian_address` | |

Partial update: ابعت المفاتيح اللي اتغيّرت فقط.  
**ممنوع تعديله من الطالب:** national_id, student_code, registration_status, class, fees, payments…

### خريطة SPA ← API (`personal`)

| Label (AR) | API |
|------------|-----|
| الرقم القومي | `national_id` |
| كود الطالب | `student_code` |
| رقم الهاتف | `phone` |
| الديانة | `religion` |
| حالة التسجيل | `registration_status` |
| رقم الفصل | `class_number` |
| التحويلات / المصروفات / إيصال / تاريخ / مبلغ | `transfers`…`payment_amount` |
| بيانات الأب | `father.*` |
| بيانات ولي الأمر | `guardian.*` |

---

## 6. تدفق البيانات الشخصية + Alert الإكمال (أحدث تعديل)

### منطق الاكتمال

```ts
fatherFields  = [national_id, address, job, phone]
guardianFields = [name, relation, national_id, qualification, job, address]

incomplete = أي حقل فاضي في الأب OR أي حقل فاضي في ولي الأمر
```

### UI بعد اللوجين على `/profile`

1. لو `incomplete` و مش في وضع edit:
   - `toast.warning` (id ثابت عشان ما يتكررش)
   - `Alert` تحت العنوان (RTL: `text-start` / `pe-*` / `inset-e-*`)
   - زر «إكمال البيانات» → يفتح وضع التعديل
2. في وضع العرض: أخفِ حقول الأب/ولي الأمر الفاضية؛ في التعديل أظهرها كلها.
3. بعد حفظ ناجح عبر `POST /profile` → أعد تطبيق الـ payload على الـ context؛ لو اكتمل اختفِ الـ Alert.

### ملفات مرجعية في هذا المشروع

- `src/features/profile/profileData.ts` — keys + `getContactCompleteness()`
- `src/features/profile/PersonalInfoPage.tsx` — Alert + form
- `src/features/profile/studentProfileApi.ts` — map GET/POST بما فيها `guardian`
- `src/components/ui/alert.tsx` — logical CSS (RTL-safe)
- i18n: `profile.personal.incompleteContact.*`

---

## 7. باقي الشاشات — API → UI

### 7.1 الحضور والغياب — `GET /profile/absences`

Query اختياري: `academic_year`, `month` (`YYYY-MM`), `date_from`, `date_to`.

الرد: `summary` (recorded/present/absence/rate) + `absences[]` (newest-first) + `by_month[]`.  
`statistics.cards.attendance/absences` على الـ profile = نفس أرقام **العام الحالي**.

### 7.2 التقييم الأسبوعي — `GET /profile/weekly-assessments`

Query: `academic_year`, `term` (`first|second`), `subject_id`, `month` (اسم شهر الدراسة).  
الرد: `summary` + `entries[]`؛ `is_absent: true` يظهر في السجل لكن **مش** في المجاميع.

### 7.3 التقييم الشهري — `GET /profile/monthly-assessments`

Read-only؛ مجموع الأسبوعي تلقائياً.  
Query: `academic_year`, `term`, `subject_id`.  
الرد: `summary` + `months[]` (صف لكل شهر×مادة).

### 7.4 شهادة النجاح (QR gate)

```text
1) GET /profile  → success_certificate_unlocked
2) إن locked: نموذج إدخال/مسح QR
3) POST /profile/success-certificate/unlock  { qr_token }
   - يقبل توكن خام أو URL فيه /students/verify/{token}
4) GET /profile/success-certificate?academic_year=
   - locked → { unlocked:false, certificate:null }  // مفيش درجات
   - unlocked → certificate.subjects + summary
5) عرض الجدول عبر FinalCertificateSheet helpers
```

**مهم أمنياً:** الدرجات مش بتتبعت والـ certificate مقفول — متخبيش أرقام على الكلاينت بس.

### 7.5 استدعاء ولي الأمر

من `GET /profile` فقط (read-only للطالب):

- قائمة: `callups[]`
- العدد: `statistics.cards.callups.count`

الإنشاء/التعديل من أدمن شؤون الطلبة — مش من الـ SPA.

### 7.6 الجدول الدراسي

من `schedule` في `GET /profile`؛ لو `null` = مفيش فصل/جدول بعد.  
اعرض شبكة من `slots` (متعدد المواد لكل خلية).

### 7.7 الإحصائيات

من `statistics.cards` في نفس الـ GET — بطاقات حضور / استدعاءات / اختبارات / غياب.

### 7.8 الإشعارات

انظر `docs/student-notifications-api.md`: Firebase init + register device token + list/mark-read.  
Triggers من السيرفر (حضور حصة / تغييرات بروفايل…) — الفرونت بيعرض بس.

---

## 8. هيكل الملفات المقترح للنقل

```text
src/features/auth/
  LoginPage.tsx
  authApi.ts          # login + normalizeSession
  userStore.ts        # token + user
  ProtectedRoute.tsx

src/features/profile/
  ProfileLayout.tsx       # sidebar + Outlet
  ProfileContext.tsx      # GET once, share state
  profileData.ts          # field keys + completeness
  studentProfileApi.ts    # profile / absences / weekly / monthly
  successCertificateApi.ts
  PersonalInfoPage.tsx
  SchedulePage.tsx
  StatisticsPage.tsx
  AttendancePage.tsx
  WeeklyEvaluationsPage.tsx
  MonthlyEvaluationsPage.tsx
  ParentSummonPage.tsx
  CertificatePage.tsx
  mediaApi.ts             # avatar upload → URL

src/features/notifications/   # اختياري
src/features/final-results/   # helpers لجدول الشهادة

src/locales/ar|en/common.json # profile.* keys
docs/                         # انسخ docs الـ API كما هي
```

### Checklist نقل سريع

1. [ ] Client HTTP مع Bearer + unwrap `{ success, data }`
2. [ ] Login → token → default route `/profile`
3. [ ] `ProfileProvider` يعمل `GET /profile` ويشارك الحالة
4. [ ] Personal: map fields + POST partial + guardian/father
5. [ ] Incomplete contact Alert (RTL-safe)
6. [ ] صفحات absences / weekly / monthly بفلاتر
7. [ ] Certificate: unlock ثم fetch (لا درجات قبل unlock)
8. [ ] Callups من الـ profile payload
9. [ ] i18n AR/EN لنفس المفاتيح
10. [ ] (اختياري) Notifications + Firebase

---

## 9. Changelog مختصر (آخر أسبوع تقريباً)

| تاريخ | ماذا |
|-------|------|
| 9 سبتمبر | Attendance من `/profile/absences` · Weekly evaluations في الراوتر · Parent summon من `callups` في الـ context · تنسيق قيم personal (religion/status) |
| 14 سبتمبر | Firebase + NotificationsPage في الراوتر |
| 15 سبتمبر | Monthly evaluations من `/profile/monthly-assessments` (بدل mock data) · تحديث locales |
| 17 سبتمبر | Certificate من success-certificate API + QR unlock · حذف mock `certificateData` |
| 22 سبتمبر | فصل `father` / `guardian` في UI + API types · religion قابلة للتعديل · Alert إكمال البيانات بعد اللوجين · Alert RTL (`text-start` / logical padding) |

---

## 10. مراجع Docs داخل الريبو (انسخها مع المشروع)

| ملف | المحتوى |
|-----|---------|
| `docs/student-profile-api.md` | GET/POST profile + absences + weekly + annual-report |
| `docs/monthly-assessments-api.md` | التقييم الشهري |
| `docs/FRONTEND_SUCCESS_CERTIFICATE_QR.md` | QR unlock للشهادة |
| `docs/parent-summons-on-profile.md` | callups على البروفايل |
| `docs/student-notifications-api.md` | Push + CRUD إشعارات |
| `docs/prompt-student-profile-weekly-assessments.md` | ملاحظات أسبوعية إضافية إن وُجدت |

---

## 11. قواعد سلوك مهمة عند التكرار

1. **مصدر واحد للحقيقة بعد اللوجين:** `GET /profile` داخل Provider — متكررش الـ GET في كل صفحة فرعية إلا لو endpoint مختلف (absences / assessments / certificate).
2. **Partial POST فقط** للحقول المسموحة؛ متبعتش الحقول المدرسية.
3. **الأب وولي الأمر مستقلين** — تحديث واحد مش بيمس التاني.
4. **الشهادة:** لو `unlocked: false` افترض `certificate === null` ومتعملش UI درجات وهمية.
5. **الغياب الأسبوعي في التقييم:** `is_absent` ≠ صفر درجة.
6. **RTL أولاً** في الـ Alert وأي callout: استخدم `text-start` و `ps/pe` و `inset-s/e` مش `left/right`.

---

*آخر تحديث لهذا الدليل: 22 سبتمبر 2026 — يعكس حالة الفرونت في `schools-template` بما فيها التعديلات غير المُلتزَمة بعد على Personal Info.*
