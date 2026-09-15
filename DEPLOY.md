# DEPLOY.md — single-VPS production runbook

Deploys the Clarity Fleet backend (api + tcp-listener + ingestion + Postgres + Redis) as Docker
containers on one VPS, behind nginx for TLS. `frontend/web` goes to Vercel (step 11).
`frontend/mobile` ships through EAS and is **not** covered here.

This replaces the three-droplet topology that used to live in `.github/workflows/deploy.yml`
(`209.38.83.138` api / `170.64.148.64` tcp / `134.199.144.238` worker). **That workflow has been
deleted** — it SSHed into three hosts that no longer exist and would have fought this deployment
on every push to `main`.

This is a **first deployment**: there is no existing database to migrate and no old `pm2`
processes to stop. Every step below assumes an empty schema.

---

## Why the order below matters

`tcp-listener` ACKs every telemetry record to the device the instant it parses it, *before*
`ingestion` looks up which vehicle the IMEI belongs to
(`backend/src/entrypoints/ingestion.ts` → `processPayload`). If no `vehicles` row matches, the
record is dropped and **the device will never resend it**. So the schema must be migrated and
the vehicle provisioned *before* any real device is pointed at this box.

---

## 1. Provision the VPS

Ubuntu 22.04+, 2 vCPU / 4 GB minimum (TimescaleDB plus three Node processes). Note the public IP.

**Sizing.** An 8 GB box runs this comfortably — measured steady state is roughly 3 GB, leaving
headroom for the report spike described below. Add 2 GB of swap as a cushion for that spike:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

| | Steady state |
|---|---|
| Postgres / TimescaleDB (tuned — see below) | ~0.8 GB |
| api + ingestion + tcp-listener | ~0.4 GB |
| redis + nginx (the dashboard is on Vercel, not this box) | ~0.1 GB |
| Ubuntu + Docker daemon | ~0.6 GB |
| **Total** | **~2 GB, ~3 GB under load** |

Disk: **~12 GB** to stand up (the `timescaledb-ha:pg16-all` image alone is 6.3 GB, plus ~5 GB of
build cache — reclaim that with `docker builder prune` once the stack is running). Telemetry
itself is small and self-capping: the 1-year retention and 30-day compression policies in
`0001_telemetry_hypertable.sql` hold it to roughly **15 MB per vehicle per year** at steady state.

**Postgres memory is pinned deliberately.** `timescaledb-ha` auto-tunes from detected host RAM on
first start; left alone on an 8 GB box it takes ~2 GB of `shared_buffers` and ~1 GB of
`maintenance_work_mem` *per autovacuum worker*. `docker-compose.prod.yml` overrides that with
`-c` flags on the postgres `command:` (~1 GB ceiling) — the header comment there explains each
value and when to raise it. Verify it took effect in step 9.

> Node count, not user count, is what scales here. The `pg` pool in `db/client.ts` sets no `max`,
> so it defaults to 10 connections per process (api + ingestion = 20 backends) no matter how many
> people are logged in. More users means more queueing on that pool, not more RAM.

**The one thing that can spike memory** is the fuel-idle report: `generateFuelIdle` in
`backend/src/modules/fleet/reports-queue.ts` SELECTs `telemetry` across an arbitrary date range
with no LIMIT, buffers every row in the api process, then `JSON.stringify`s it. A year-wide
report over a 10-vehicle fleet is ~2M rows — several hundred MB in one request, inside the same
process that serves live traffic. Size for that, or cap the range before you expose reports.

## 2. DNS

Three records point at the VPS, all proxying **disabled** (grey-cloud in Cloudflare — see the
warning in step 5). The apex and `www` point at **Vercel**, not at this box:

| Record | Host | Points at | Purpose |
|---|---|---|---|
| A | `clarity-software.com.au` (apex) | Vercel | dashboard **and the public `/privacy` + `/terms` pages** |
| CNAME | `www` | Vercel | same app; must also be in `CORS_ORIGINS` |
| A | `api.clarity-software.com.au` | **VPS IP** | REST API (nginx → 3000) |
| A | `socket.clarity-software.com.au` | **VPS IP** | socket.io realtime (nginx → 3001) |
| A | `tcp.clarity-software.com.au` | **VPS IP** | **device port 5027, raw TCP** |

The apex is load-bearing beyond the dashboard: `https://clarity-software.com.au/privacy` is the URL
baked into the mobile app (`eas.json`) and submitted to App Store Connect and Play Console, and both
are checked by a reviewer who is not logged in.

`tcp.clarity-software.com.au` is the hostname configured into each FTC921. Use the **name**, never
the raw IP: changing it later is a DNS edit instead of another on-site visit to every vehicle.

## 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
docker compose version    # must be v2.24+ — docker-compose.prod.yml uses the !override tag
```

`!override` is what stops the dev compose file's `0.0.0.0:5432` Postgres binding from surviving
into production. On an older Compose the tag is ignored, the port lists **merge**, and your
database ends up on the public internet. Do not skip this check.

## 4. Firewall

```bash
ufw default deny incoming
ufw allow 22/tcp        # ssh
ufw allow 80/tcp        # http (certbot + redirect)
ufw allow 443/tcp       # https + wss
ufw allow 5027/tcp      # GPS devices — raw Teltonika Codec 8/8E, NOT proxied
ufw enable
```

Everything else (3000, 3001, 4001, 5432, 6379) is bound to `127.0.0.1` by
`docker-compose.prod.yml` and must never be opened.

## 5. Clone and configure

```bash
git clone <repo> /root/clarity && cd /root/clarity
cp backend/.env.production.example backend/.env.production
$EDITOR backend/.env.production
```

Fill in at minimum: `POSTGRES_PASSWORD`, `JWT_SECRET` (`openssl rand -base64 48`), the live Stripe
keys, `STRIPE_PRICE_ID_ENTRY` (**checkout returns 503 without it**), `MAPBOX_TOKEN`,
`RESEND_API_KEY`, Twilio, `EXPO_ACCESS_TOKEN`.

`WEB_URL` / `DASHBOARD_URL` are the apex `https://clarity-software.com.au`, and `CORS_ORIGINS`
carries `https://www.clarity-software.com.au` — Vercel serves both hosts and a browser on `www`
sends `Origin: www`. `NODE_ENV=production` disables the localhost CORS escape hatch in `api.ts`
and `socket/index.ts`, so anything not listed is refused.

Also add `https://api.clarity-software.com.au/auth/google/callback` as an authorised redirect URI
in the Google Cloud console, or web Google sign-in fails at the callback.

Compose also interpolates `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` into the postgres
service, so they must exist in a root-level `.env` as well. Create `/root/clarity/.env` with those
three keys, using the **same** password you put in `backend/.env.production`, then:

```bash
chmod 600 /root/clarity/.env /root/clarity/backend/.env.production
```

> **Cloudflare warning:** Cloudflare's proxy cannot carry raw TCP on 5027 (that needs Spectrum).
> Leave `tcp.` grey-clouded. Proxying `api.`/`socket.` is fine, but the socket host needs
> WebSockets enabled.

## 6. Start the stack

```bash
cd /root/clarity
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## 7. Database setup

```bash
CP="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

$CP exec api npm run db:migrate

# Hand-written, NOT applied by drizzle — see the header comment in the file itself.
$CP exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < backend/src/db/migrations/0001_telemetry_hypertable.sql
```

**Seed the first super-admin.** There is no data to migrate — this is a fresh deployment against an
empty schema. `create-admin` takes its credentials from the environment (it used to hardcode
`admin@claritysoftware.au` / `Admin2026!`, which is in this repo's git history), so pass them for
this one command rather than leaving the password on disk:

```bash
export SUPERADMIN_EMAIL=you@clarity-software.com.au
export SUPERADMIN_PASSWORD="$(openssl rand -base64 24)"
echo "SAVE THIS NOW: $SUPERADMIN_PASSWORD"     # the script never prints it back

$CP exec -e SUPERADMIN_EMAIL -e SUPERADMIN_PASSWORD api npm run create-admin

unset SUPERADMIN_PASSWORD                      # keep it out of the rest of the session
```

`export` matters: `docker compose exec -e VAR` forwards the variable from the calling process's
environment, so a plain shell variable would arrive empty and the script would exit 1.

Put that password in a password manager before you clear the terminal. Then bind Google
Authenticator immediately via `POST /api/v1/admin/auth/setup-totp` — the super-admin realm is
TOTP-gated, and the password alone is not enough to finish signing in.

## 8. Verify the port bindings before exposing the box

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config | grep -B2 published
ss -tlnp | grep -E '3000|3001|4001|5432|6379|5027'
```

Expected: **5027 on `0.0.0.0`; everything else on `127.0.0.1` only.** If 5432 or 6379 shows
`0.0.0.0`, your Compose is too old to honour `!override` — stop and fix that first (step 3).

## 9. Health checks

```bash
curl -s localhost:3000/health    # {"status":"ok"}
curl -s localhost:4001/health    # {"status":"ok","service":"tcp-listener","connectedDevices":0,...}
curl -s localhost:3001/health    # {"status":"ok","service":"ingestion","processed":0,"unknownImei":0,...}
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps   # all "healthy"
```

**Confirm the Postgres memory caps took effect** (step 1). Without this the box silently runs on
the image's auto-tuned values, which are sized to the host, not to this workload:

```bash
CP="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$CP exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT name, setting, unit, source FROM pg_settings WHERE name IN
   ('shared_buffers','work_mem','maintenance_work_mem','max_connections',
    'autovacuum_max_workers','timescaledb.max_background_workers') ORDER BY name;"
```

Every row must read `source = command line`. `shared_buffers` should be `65536` (8 kB units =
512 MB). If any row says `configuration file`, the `command:` override is not being applied —
check you passed **both** `-f` files.

Then confirm the actual footprint:

```bash
docker stats --no-stream --format "{{.Name}}\t{{.MemUsage}}"
```

> These are start-up parameters, so changing them later requires the container to be **recreated**,
> not just restarted: `$CP up -d postgres`. The data volume is untouched by this — it is a config
> change, not a schema one, and needs no dump/restore.

## 10. TLS

```bash
cp deploy/nginx/clarity.conf /etc/nginx/sites-available/clarity.conf
ln -s /etc/nginx/sites-available/clarity.conf /etc/nginx/sites-enabled/
certbot --nginx -d api.clarity-software.com.au -d socket.clarity-software.com.au
nginx -t && systemctl reload nginx
```

`tcp.clarity-software.com.au` gets **no certificate** — it is not HTTP.

## 11. Deploy the dashboard to Vercel

Import the repo with **Root Directory `frontend/web`** (framework: Vite). Set:

```
VITE_API_URL=https://api.clarity-software.com.au
VITE_SOCKET_URL=wss://socket.clarity-software.com.au
VITE_MAPBOX_TOKEN=<pk token>
```

Add **both** `clarity-software.com.au` and `www.clarity-software.com.au` as domains.
`frontend/web/vercel.json` already carries the SPA rewrite. Then verify, in a private window:

- `https://clarity-software.com.au/privacy` and `/terms` load **without logging in**. These routes
  sit outside `ProtectedRoute` in `App.jsx` precisely so App Review and the mobile Account tab can
  reach them; if they redirect to `/login`, that change has been reverted.
- The topbar connection indicator reads *connected*, not polling — if it polls, the socket host's
  WebSocket upgrade headers are wrong (step 10).

Finally, restrict the Mapbox token to `clarity-software.com.au` in your Mapbox account. It is a
public `pk.` token embedded in the bundle; the URL restriction is what stops it being reused.

> The old three-droplet GitHub Actions pipeline has been **deleted** from this repo, so there is
> nothing left to disable here and no `pm2` processes competing for devices.

## 12. Backups

```bash
install -m 0750 deploy/backup.sh /usr/local/bin/clarity-backup
/usr/local/bin/clarity-backup          # run once now to prove it works
crontab -e   # 15 3 * * * /usr/local/bin/clarity-backup >> /var/log/clarity-backup.log 2>&1
```

**Then restore one into a scratch database.** An untested backup is not a backup, and this DB holds
telemetry, trips *and* billing state — none of it reconstructable, because the devices do not
buffer: `tcp-listener` ACKs each record the moment it parses it.

```bash
$CP exec -T postgres createdb -U "$POSTGRES_USER" restore_test
gunzip -c /var/backups/clarity/clarity-$(date +%F).sql.gz \
  | $CP exec -T postgres psql -U "$POSTGRES_USER" -d restore_test
$CP exec -T postgres psql -U "$POSTGRES_USER" -d restore_test -c '\dt'   # tables present?
$CP exec -T postgres dropdb -U "$POSTGRES_USER" restore_test
```

## 13. Restart on boot

`restart: always` is set on every service in `docker-compose.prod.yml`; just ensure the daemon
starts: `systemctl enable docker`.

---

## Verify end-to-end before touching a device

Provision the vehicle **first** (dashboard → Settings → Vehicles, or `POST /api/v1/vehicles` with
`{name, imei}`), then simulate a device from your laptop:

```bash
cd backend
npm run simulate-device -- --host tcp.clarity-software.com.au --imei 865124073607428 --count 10
```

Expected:

- `[sim] login ACCEPTED by listener`, then `server ACKed 1 record(s)` ten times
- `docker compose logs tcp-listener` → `Device identified: 865124073607428`
- `docker compose logs ingestion` → **no** `Unknown IMEI` line
- `curl -s localhost:3001/health` → `processed` increased, `unknownImei` still `0`
- a marker moving on the live map

Then re-run with a bogus IMEI (`--imei 000000000000000`) and confirm `unknownImei` increments —
that proves the provisioning check is real and not a false positive.

Only once all of that passes should the technician configure the physical device
(see `docs/ftc921-reporting-profile.md`).

---

## Operating notes

```bash
CP="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$CP logs -f tcp-listener        # device connects/disconnects, CRC failures
$CP logs -f ingestion           # "Unknown IMEI" = provisioning gap
$CP up -d --build               # deploy an update
curl -s localhost:4001/internal/metrics | python3 -m json.tool   # per-IMEI bytes/records
```

Per-device data usage is also available to a super-admin at `GET /api/v1/admin/device-metrics`,
which proxies that same internal endpoint.
