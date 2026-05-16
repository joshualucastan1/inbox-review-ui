# Inbox Review UI

Next.js review dashboard for the inbox manager. Operators use it to review generated drafts, edit body text, approve drafts into Missive, send, regenerate, archive, book slots, inspect dead letters, and inspect sent-history learning feedback.

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000/?t=<REVIEW_API_KEY>`.

## Backend Proxy

The UI defaults browser API calls to `/api/review`. `next.config.ts` rewrites that path to the Flask backend when `API_PROXY_TARGET` is set.

Required Vercel/local env:

```bash
API_PROXY_TARGET=https://inbox-manager-v2-rebuild-production.up.railway.app
API_PROXY_PATH=/api/review
```

Optional browser override:

```bash
NEXT_PUBLIC_API_BASE_URL=/api/review
```

For the legacy audit monolith backend, use:

```bash
API_PROXY_PATH=/review/api
```

## Review Send Flow

The primary button is `Approve & Send`.

For the rebuild backend, that means:

1. If the row is not already `awaiting_send` or has no `missive_draft_id`, call `POST /api/review/drafts/<id>/approve` to push the draft into Missive.
2. Call `POST /api/review/drafts/<id>/send`.
3. Include the current textarea body so the final operator edit is what Missive sends and what the backend captures in `sent_drafts` / learning feedback.

If the approve endpoint returns `404`, the UI falls back to the legacy monolith direct-send path. Other approval errors stop the send.

## Verification

```bash
npm run lint
npm run build
```

## Deployment Notes

- Vercel should deploy from `main`.
- Keep `API_PROXY_TARGET` pointed at the active Railway backend.
- After a backend cutover, verify the UI can load `/api/review/queue`, approve a test draft to Missive, send only an approved internal test draft, and display Sent History plus Dead Letters.
