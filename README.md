# Talent.live

A real-time talent show platform. A **host** creates a room, **performers** join a queue and go live on camera, and **viewers** watch, vote 1–10, cheer and tip — all in the browser.

- **Backend:** Go + gorilla/websocket, Redis (shared state + pub/sub so several server instances behave like one)
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind
- **Video:** WebRTC mesh between hosts and performers; the performer on stage streams to viewers
- **Edge:** Nginx load-balances WebSocket connections across 3 Go instances

## Quick start (Docker)

```bash
docker-compose up --build
```

| What | URL |
| --- | --- |
| App | http://localhost:3000 |
| WebSocket (via nginx) | ws://localhost/ws |
| Health | http://localhost/health |

> Camera/mic only work on `https://` or `http://localhost`. To test from a phone you need HTTPS (see *Deploying*).

## Local development

```bash
docker run -d -p 6379:6379 redis:7-alpine      # Redis

cd server && go run ./cmd/server               # PORT=8080 by default

cd client
cp .env.local.example .env.local               # NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
npm install && npm run dev
```

## How it works

**Roles**

| Role | Can do |
| --- | --- |
| Host (admin) | create/close the room, start & end acts, score (1–10), promote a co-host, backstage chat, on camera |
| Performer | join/leave the queue, go live on stage, backstage chat, share socials + demo link |
| Viewer | watch the stage, vote 1–10, cheer, tip |

**Flow:** create room → share the 6-character code or invite link (`/?join=CODE`) → performers join the queue → host starts the next act → the timer you chose ends the act automatically and the next performer starts → results tab ranks everyone.

**Scoring:** audience votes are averaged (one vote per viewer, re-voting replaces it). If the host also scores, *overall* = (audience average + host score) / 2; otherwise whichever exists.

**Finding rooms:** the home page lists live rooms and searches by name, category, host or code.

**Identity & security:** each browser has a random user id plus a secret. The server binds the secret to the id per room, so nobody can impersonate another user or claim host rights; admin rights come only from the server (room creator or a host-promoted user). Emails are never sent to other users.

## WebSocket messages (client → server)

`create-room`, `join-room`, `leave-room`, `close-room`, `list-rooms`, `get-users`, `get-room-info`, `update-profile`, `make-admin`, `send-message` (host/performer only), `join-queue`, `leave-queue`, `start-performance`, `end-performance`, `vote`, `cheer`, `donate`, `admin-score`, `signal` (WebRTC).

Server → client events: the same names plus `performance-started`, `performance-ended`, `queue-updated`, `user-joined`, `user-left`, `user-updated`, `role-changed`, `room-closed`.

## Environment variables

See [`.env.example`](.env.example). Server: `SERVER_ID`, `REDIS_URL`, `PORT`. Client: `NEXT_PUBLIC_WS_URL`, optional `NEXT_PUBLIC_TURN_*`, optional Google login (`GOOGLE_CLIENT_ID/SECRET`, `NEXTAUTH_*`).

## Known limits (be aware before going live)

- **Tips are not real payments.** Amounts are recorded in the room and shown on stage; no money moves. Connect Stripe/Razorpay or similar before presenting this as monetisation.
- **Mesh video doesn't scale to big audiences.** Each performer uploads one stream per viewer. It's fine for roughly 10–15 viewers; for more, put an SFU (LiveKit, mediasoup) in the middle.
- **STUN only by default.** Add a TURN server (`NEXT_PUBLIC_TURN_*`) for users behind strict NATs.
- Backstage chat keeps the last 200 messages per room; rooms are removed 10 minutes after the last person leaves.

## Deploying

Serve the client and WebSocket over HTTPS/WSS (browsers block camera access otherwise): terminate TLS at Nginx, set `NEXT_PUBLIC_WS_URL=wss://your-domain/ws`, and rebuild the client image.

## Tests

```bash
cd server && go test ./...
```

## License

MIT
