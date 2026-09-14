# الإشعارات — Student Push Notifications (Frontend Guide)

**Audience:** frontend integrating push notifications for the student/parent app.
**Base URL:** `/api/v1/notifications`
**Auth:** Sanctum token (`User` guard — student/parent, not admin) · `Accept: application/json` · `Accept-Language: ar|en`
**Writes:** `POST` (register token) / `PUT` (mark read) / `DELETE` (remove).

---

# 1. What this covers

Three things:

1. **Firebase client setup** — the config values you need to receive pushes at all, before any API call matters.
2. **The notifications API itself** — register a device, list notifications, mark read, unread badge count.
3. **What now triggers a notification automatically** — lesson attendance and specific student-profile changes. Nothing on the frontend needs to call anything to make these fire; they're server-side side effects of admin/teacher actions. This doc tells you what to expect and how to render it.

---

# 2. Firebase client setup (do this first)

This project's backend and this web app both point at the same Firebase project (`almotamayz-59967`) — the values below are that project's **public** web app config. Safe to hardcode/commit; these are not secrets (unlike the backend's service-account key, which frontend never touches).

### 2.1 Install

```bash
npm install firebase
```

### 2.2 Init (`src/firebase.js`)

```js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDzYpCOhVL6CSsjBlM4mImWcjTwtgwI71E",
  authDomain: "almotamayz-59967.firebaseapp.com",
  projectId: "almotamayz-59967",
  storageBucket: "almotamayz-59967.firebasestorage.app",
  messagingSenderId: "360583706748",
  appId: "1:360583706748:web:f869353ab08adba511b1f9",
  measurementId: "G-0L4545MQ2K",
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
```

### 2.3 Service worker (`public/firebase-messaging-sw.js`)

Required for web push even in foreground-only usage — `getToken()` will fail or return nothing without it.

```js
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDzYpCOhVL6CSsjBlM4mImWcjTwtgwI71E",
  authDomain: "almotamayz-59967.firebaseapp.com",
  projectId: "almotamayz-59967",
  storageBucket: "almotamayz-59967.firebasestorage.app",
  messagingSenderId: "360583706748",
  appId: "1:360583706748:web:f869353ab08adba511b1f9",
});

firebase.messaging();
```

### 2.4 Get the device token

```js
import { messaging } from "./firebase";
import { getToken } from "firebase/messaging";

const token = await getToken(messaging, {
  vapidKey: "BLYzXc3KNDwba8JPmtdp22S9LVuVSuo4ghMPrsdMciqODuBzQ37B2YL0UYGZ0uonsa-bfY6VylFh2P8Tv3hHgdo",
});
```

That key is generated in Console → Project settings → Cloud Messaging tab → "Web configuration" → Web Push certificates — a different value from the `firebaseConfig` object above.

Send `token` to `POST /api/v1/notifications/token` immediately after obtaining it — see §4.

### 2.5 Handle foreground messages

Pushes that arrive while the tab is open and focused do **not** show a native OS notification automatically — you must handle them yourself:

```js
import { onMessage } from "firebase/messaging";

onMessage(messaging, (payload) => {
  // payload.notification.title / payload.notification.body
  // update your own toast/UI + bump the unread badge locally
});
```

There is **no websocket/live channel** for the in-app list (see §8) — this `onMessage` handler is the only way the UI updates instantly while the app is already open. Everything else (background/closed app) is handled natively by the OS once the token is registered — nothing further to write for that case.

---

# 3. One-time setup — register the device token

```http
POST /api/v1/notifications/token
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json
```

```json
{
  "device_token": "<the FCM token obtained from Firebase getToken(), see §2.4>",
  "device_type": "web"
}
```

| Field | Required | Notes |
|---|---|---|
| `device_token` | ✅ | The client's FCM registration token |
| `device_type` | ✅ | One of `android`, `ios`, `web` |

Call this every time the app starts / the token refreshes (FCM tokens can rotate). Re-registering the same token is safe — it's an upsert keyed by `(user_id, device_token)`.

Without a registered token for a user, that user will simply never receive a push (server-side sends silently no-op for them — no error, no retry needed on your end).

---

# 4. Reading notifications (in-app list / bell icon)

### List (paginated)

```http
GET /api/v1/notifications?per_page=10
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": {
    "data": [
      {
        "id": 1,
        "type": "attendance",
        "title": "Absence recorded",
        "body": "You were marked absent in الرياضيات - الأولى on 2026-09-14",
        "isRead": false,
        "createdAt": "2026-09-14 09:10:00"
      }
    ],
    "meta": { "total": 1, "per_page": 10, "current_page": 1, "last_page": 1 },
    "links": { "next": null }
  }
}
```

Standard pagination envelope — see the `paginated()` convention used across this API (`data.data` / `data.meta` / `data.links.next`).

### Unread badge count

```http
GET /api/v1/notifications/unread-count
```
```json
{ "success": true, "message": "Unread notifications count", "data": { "count": 3 } }
```

### Mark one / all as read

```http
PUT /api/v1/notifications/{id}/read
PUT /api/v1/notifications/read-all
```

### Delete

```http
DELETE /api/v1/notifications/{id}
```

---

# 5. The `type` field — how to route/style each notification

`type` is a free-form string set by whichever backend feature triggered the notification. Current values in use:

| `type` | Triggered by | 
|---|---|
| `attendance` | Lesson attendance saved/updated (§6) |
| `student_profile` | Specific student-profile field changed (§7) |
| `chat_message` | New chat message (existing, unrelated to this doc) |

Treat `type` as an **open set** — new values may be added later without notice. Unknown types should fall back to a generic notification card (title + body), not be dropped.

---

# 6. Attendance notifications

**Trigger:** every time an admin/teacher saves or edits lesson attendance for a class period (`LessonAttendanceService::save()` / `update()`), **every student in that roster** who has a linked user account gets one notification reflecting their recorded status for that period — present or absent.

**Scope:** per-lesson only (one notification per class period the student is in — a student can receive several of these on a normal school day, one per period). Not triggered by the separate daily-attendance flow.

| Status | `title` | `body` |
|---|---|---|
| Present | "Attendance recorded" | "You were marked present in `{subject}` - `{period}` on `{date}`" |
| Absent | "Absence recorded" | "You were marked absent in `{subject}` - `{period}` on `{date}`" |

`{subject}`, `{period}`, `{date}` are already interpolated server-side into `body` — don't try to parse them back out; if you need them as structured fields for custom rendering, ask backend to add them to a `data` payload rather than parsing the string.

Arabic/English text is chosen server-side from the admin/teacher's `Accept-Language` at save time — **not** the receiving student's own locale preference (there's currently no per-user locale for push content).

---

# 7. Student profile-change notifications

**Trigger:** an admin edits a student record (`StudentController@update`). Only these specific fields fire a notification when changed — not every field edit (name, phone, guardian info, etc. stay silent):

| Field changed | `title` | `body` |
|---|---|---|
| `status` (enrollment status) | "Enrollment status updated" | "Your enrollment status was changed to: `{status}`" |
| `is_active` → `true` | "Account status updated" | "Your account has been activated." |
| `is_active` → `false` | "Account status updated" | "Your account has been deactivated." |
| `grade_id` | "Grade changed" | "You were moved to grade: `{grade}`" |
| `classroom_id` | "Classroom changed" | "You were moved to classroom: `{classroom}`" |

A single admin save can touch more than one of these at once (e.g. promoted to a new grade **and** a new classroom in the same request) — expect **multiple separate notifications** from one save, not a combined one.

---

# 8. Things to know / gotchas

- **No per-notification deep link / payload data yet** — just `title` + `body` + `type`. If you need the app to navigate somewhere specific on tap (e.g. straight to the attendance history screen), ask backend to add a `data` object to the notification row; it's not there today.
- **Requires a linked user account.** Students without a `users` row (not yet self-registered, or purely offline records) never receive any of this — there's nothing to fix on the frontend for those.
- **Synchronous sends, not queued.** A large classroom save can mean dozens of notifications fire in the same request on the backend. This doesn't affect the frontend's read API at all, just worth knowing latency on the admin's save action includes notification dispatch time.
- **In-app list vs push are the same row.** Every notification that triggers a push is also persisted and shows up in `GET /api/v1/notifications` — so the bell/list UI and the push notification are always in sync, never one without the other.
- **No websocket/broadcast channel.** Unlike `Chat` (which uses `broadcast()`, though that's currently wired to the `log` driver and isn't actually reaching any live client either), this feature has no real-time layer. The in-app list only refreshes on explicit API calls — rely on §2.5's `onMessage` handler for live-feeling updates while the app is open, or poll `/unread-count` on screen focus.
