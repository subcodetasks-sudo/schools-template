# متابعة الطالب على تليجرام — Telegram Follow-up (Frontend)

**Audience:** developers maintaining the student portal's `/profile/telegram` page.
**Bot:** `@student_follow_bot` · **Auth:** student token only (teacher/admin get `403`).
**Base:** `{API}/api/v1/auth/student/profile/telegram` · envelope `{ success, message, data }`.

The student's account creates a one-time link to the bot; a parent opens it in Telegram, taps **Start**, and from then on receives alerts there. The backend owns the bot, the token and the webhook — the frontend only manages links.

---

## 1. Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/telegram` | `{ configured, bot_username, links: [{ id, name, is_active, linked_at }] }` |
| `POST` | `/telegram/link` | `{ url, expires_at, expires_in_minutes }` — one-time, valid 30 min |
| `DELETE` | `/telegram/{id}` | Stops one parent; returns the same body as `GET` |

| Status | Meaning | UI |
|---|---|---|
| `401` | no/expired token | session ended by the API client |
| `403` | not a student account | "student accounts only" |
| `404` (`GET`/`POST link`) | account has no student record | server message, no retry |
| `404` (`DELETE`) | follower already gone | info toast + refresh |
| `429` | rate limited | rate-limit message |
| `503` / `configured:false` | feature switched off | "currently unavailable" |

## 2. Alerts the parent receives

Absence in a lesson · absence in the lesson day register · absence in the daily school attendance · classroom change (from → to). Backend guarantees: only linked parents are notified, never twice for the same event, and a parent who blocks the bot becomes `is_active: false`.

---

## 3. Code map

| File | Responsibility |
|---|---|
| `src/features/profile/telegramApi.ts` | Endpoints, payload normalizers, link-URL validation, expiry and "new follower" helpers (pure, unit-tested) |
| `src/features/profile/useTelegramFollowUp.ts` | State machine: loading, polling, link lifecycle, removal, race protection |
| `src/features/profile/TelegramFollowUpPage.tsx` | The screen |
| `src/features/profile/telegramApi.test.ts`, `useTelegramFollowUp.test.tsx` | Tests |
| `profile.telegram.*`, `profile.nav.telegram` in `src/locales/{ar,en}/common.json` | Strings |

## 4. Behaviors worth knowing before changing anything

- **The link is a credential.** It is only ever held in memory (never `localStorage`, never logged), and only `https://` links on `t.me` / `telegram.me` / `telegram.dog` are accepted — anything else is rejected before it can be opened.
- **Popup blockers.** The blank tab is opened *inside the click handler* and navigated once `POST /link` returns; it is closed on failure. If the browser still blocks it, the on-page Open / Copy / Share panel is the fallback.
- **Expiry** uses `expires_in_minutes` (relative, immune to a wrong device clock), then `expires_at`, then 30 minutes. Before showing "expired" the hook refreshes once more, so a link the parent already used is never reported as expired.
- **Detecting the parent finishing in Telegram:** refresh on tab focus/visibility, and poll every 4 s for the first minute then every 15 s until the link expires (paused while the tab is hidden or a change is saving). A new active follower — new id, changed `linked_at`, or `is_active` flipping to `true` — retires the link and shows a toast.
- **Ordering.** Every response is sequence-numbered; a slower, older response can never overwrite a newer one. A successful response also clears an earlier load error.
- **Errors.** Server-localized messages are shown when present; bare client messages ("Request failed with status code …", "Network Error") are replaced with translated fallbacks.
- **Parent names** come from Telegram and are user-controlled: they are rendered as text only (`dir="auto"`, wrapped), with "ولي أمر" when hidden.

## 5. Manual test checklist

- [ ] Feature on: **ربط تليجرام** opens `t.me/student_follow_bot?start=…`; after the parent presses Start the follower appears and the link panel closes.
- [ ] A second parent needs a new link; both are listed.
- [ ] **إيقاف** asks for confirmation, then removes the follower; the parent stops receiving alerts.
- [ ] A used/expired link: create a new one (the bot shows its own "غير صالح" message).
- [ ] `configured:false` / `503`: "currently unavailable" (a `503` from a failed load also offers retry).
- [ ] A parent who blocked the bot is greyed out with the inactive note.
- [ ] Popup blocked (Safari/iOS): link panel still lets the user open, copy or share.
- [ ] Arabic (RTL: `@bot` is not reordered) and English.
- [ ] Offline then back online: the screen recovers on the next focus without a manual retry.
