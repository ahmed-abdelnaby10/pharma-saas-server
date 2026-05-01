# Releases Module

## Purpose
Manages desktop application releases published by the platform. Provides a public download manifest endpoint so desktop clients can self-update. Supports two channels: `STABLE` and `BETA`.

## Dependencies
None — standalone model (`AppRelease`).

## Endpoints

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/downloads` | Download manifest (latest per channel) |

### Platform Admin (Bearer platformToken)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/platform/releases` | List releases |
| GET | `/api/v1/platform/releases/:id` | Get a release |
| POST | `/api/v1/platform/releases` | Create a release |
| PATCH | `/api/v1/platform/releases/:id` | Update (e.g. deactivate) |
| DELETE | `/api/v1/platform/releases/:id` | Hard delete |

### Tenant (Bearer tenantToken)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/tenant/auth/heartbeat` | Refresh subscription claim in JWT |

## Request Body — Create Release

```json
{
  "version": "1.2.0",
  "channel": "STABLE",
  "notes": "Bug fixes and performance improvements",
  "windowsUrl": "https://cdn.example.com/releases/1.2.0/setup-win.exe",
  "macUrl": "https://cdn.example.com/releases/1.2.0/setup-mac.dmg",
  "linuxUrl": "https://cdn.example.com/releases/1.2.0/setup-linux.AppImage",
  "publishedAt": "2026-05-01T10:00:00.000Z"
}
```

## Download Manifest Response

```json
{
  "stable": {
    "id": "...",
    "version": "1.2.0",
    "channel": "STABLE",
    "notes": "...",
    "windowsUrl": "...",
    "macUrl": "...",
    "linuxUrl": "...",
    "publishedAt": "..."
  },
  "beta": null
}
```

## Heartbeat Response

```json
{
  "accessToken": "eyJhbGciOi...",
  "subscription": {
    "status": "trialing",
    "trialEndsAt": "2026-05-15T00:00:00.000Z",
    "offlineValidUntil": "2026-05-02T10:00:00.000Z"
  }
}
```

## JWT Subscription Claim
Every tenant login and heartbeat embeds a `subscription` claim:
- `status` — current subscription status (`trialing`, `active`, `past_due`, `canceled`, `expired`, `none`)
- `trialEndsAt` — ISO date or null
- `offlineValidUntil` — 24-hour window from last heartbeat; desktop client locks out when elapsed

## Trial Reminder Cron
A BullMQ repeating job runs at 03:00 UTC daily and:
1. Sends `TRIAL_EXPIRY_WARNING` inbox notifications at 7d, 3d, 1d before trial end
2. Flips `trialing → expired` subscriptions past their `trialEndsAt`
3. Sends `SUBSCRIPTION_EXPIRED` notifications to all active users in expired tenants

## Permissions
- Download manifest: none (public)
- Admin CRUD: platform admin JWT
- Heartbeat: tenant JWT
