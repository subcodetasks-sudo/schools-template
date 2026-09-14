# Website Content Integration (Public API Reference)

A single reference for hooking up `https://schools.subcodeco.com` to the content
managed from the admin dashboard: achievements, events, blog, application terms,
and contact. **Every endpoint below is public — no auth token needed.**

---

## 0. Conventions (same for every endpoint here)

- **Base URL:** `{API}/api/v1`
- **Envelope:** every response is `{ success, message, data }`
- **Headers:** `Accept-Language: ar|en` — controls localized field values and error messages
- **Rate limit:** 30 requests/min per IP — a burst of requests returns `429`
- **404** for an unknown slug/UUID, or one that exists but fails a visibility rule (draft article, inactive term, etc.) — treat it as "not found" on the site, not an error banner
- Managing this content (create/edit/delete) is done from the admin dashboard — this doc only covers what the **public site reads/writes**

---

## 1. Achievements — `/achievements`

| | |
|---|---|
| List | `GET /api/v1/achievements?per_page=` (paginated, default 12, max 50) — newest first |
| One | `GET /api/v1/achievements/{slug}` |

```json
{
  "id": "3", "title": "Regional Science Fair Winner", "slug": "regional-science-fair-winner",
  "description": "1st place", "image_url": "https://.../achievements/xyz.jpg",
  "created_at": "...", "updated_at": "..."
}
```

---

## 2. Events — `/events`

| | |
|---|---|
| List | `GET /api/v1/events` |
| One | `GET /api/v1/events/{slug}` |

Query `?when=upcoming` → only future events, soonest first. `?when=past` → only
past events, most recent first. Omit `when` → every event, soonest first.

Same fields as achievements, plus `event_date` (`YYYY-MM-DD`).

---

## 3. Blog / Articles — `/blog`

| | |
|---|---|
| List | `GET /api/v1/blog` |
| One | `GET /api/v1/blog/{slug}` |

Only returns articles that are currently **live** — `status: "published"` **and**
`is_active: true` **and** (`published_at` empty or in the past). Anything else
(draft, archived, inactive, scheduled for the future) is invisible here and
`404`s on the direct slug route too. Ordered by `published_at`, newest first.

```json
{
  "id": "5", "slug": "...", "title": "...",
  "content": "<p>rich text / HTML...</p>",
  "status": "published", "is_active": true, "published_at": "2026-01-05T08:00:00+00:00",
  "author_name": "...", "thumbnail": "https://...", "author_photo": "https://...",
  "images": ["https://...", "https://..."],
  "created_at": "...", "updated_at": "..."
}
```

`content` is HTML — render it directly (e.g. `dangerouslySetInnerHTML` /
`v-html`), don't re-escape it.

---

## 4. Application Terms — `/terms-of-applying`

The admission/enrollment conditions list shown on the "apply" page
(`https://schools.subcodeco.com/terms-of-applying`) — e.g. "السن المطلوب
للالتحاق", "المستندات المطلوبة".

| | |
|---|---|
| List | `GET /api/v1/terms-of-applying` — **every active term, not paginated** (short list by design — don't build pagination UI for it) |
| One | `GET /api/v1/terms-of-applying/{slug}` |

Ordered by `sort_order` ascending.

```json
{
  "id": "1", "title": "السن المطلوب للالتحاق", "slug": "...",
  "description": "يجب ألا يقل عمر الطالب عن 4 سنوات حتى أول أكتوبر من العام الدراسي.",
  "icon_url": null, "is_active": true, "sort_order": 0,
  "created_at": "...", "updated_at": "..."
}
```

Deactivating a term in the dashboard removes it from this list **and** its
direct-link page immediately (404 on the slug).

---

## 5. Contact — `/contact`

### `GET /api/v1/contact` — info to render on the contact page

Every active contact-info row, admin-defined order. Usually just **one** row —
render it as the page's contact block.

```json
{
  "id": "uuid", "label": "الإدارة العامة",
  "phone": "01000000000", "whatsapp": "01000000000", "email": "info@school.example",
  "address": "المنصورة، جمهورية مصر العربية",
  "working_hours": "السبت - الخميس: 8:00 ص - 4:00 م",
  "social": { "facebook": null, "instagram": null, "twitter": null, "youtube": null },
  "location": null,
  "is_active": true, "sort_order": 0
}
```

`location` is `{ lat, lng }` (or `null`) — use it to embed a map pin when set.

### `POST /api/v1/contact` — the "send us a message" form

```json
{ "name": "...", "email": "...", "phone": "...", "subject": "...", "message": "..." }
```

| Field | Rules |
|---|---|
| `name` | required |
| `email` | required, valid email |
| `phone` | optional |
| `subject` | optional |
| `message` | required, max 5000 characters |

`201` on success — nothing further to do, the message lands in the dashboard's
inbox. `422` on validation failure (missing `name`/`email`/`message`, invalid
email) — surface the field errors from `data.errors` to the visitor.

---

## 6. Errors — same shape everywhere in this doc

| Code | When | What to show |
|---|---|---|
| `404` | unknown slug/UUID, or exists but not currently visible (draft, inactive, scheduled) | render the site's normal "not found" page |
| `422` | `POST /contact` validation failure | inline field errors from `data.errors` |
| `429` | rate limit exceeded (30/min/IP) | ask the visitor to slow down / retry shortly |

---

## 7. Quick reference

| Section | List | Single | Notes |
|---|---|---|---|
| Achievements | `GET /achievements?per_page=` | `GET /achievements/{slug}` | paginated, default 12 / max 50 |
| Events | `GET /events?when=upcoming\|past` | `GET /events/{slug}` | `when` optional |
| Blog | `GET /blog` | `GET /blog/{slug}` | only live articles; `content` is HTML |
| Application terms | `GET /terms-of-applying` | `GET /terms-of-applying/{slug}` | not paginated, ordered by `sort_order` |
| Contact info | `GET /contact` | — | usually one row |
| Contact form | — | `POST /contact` | `201` on success, `422` on validation error |
