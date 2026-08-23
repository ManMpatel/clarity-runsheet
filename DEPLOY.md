# DEPLOY.md — single-VPS production runbook

Deploys the Clarity Fleet backend (api + tcp-listener + ingestion + Postgres + Redis) as Docker
containers on one VPS, behind nginx for TLS. `frontend/web` stays on Vercel; `frontend/mobile`
ships through EAS. Neither is covered here.

This replaces the three-droplet topology in `.github/workflows/deploy.yml`
(`209.38.83.138` api / `170.64.148.64` tcp / `134.199.144.238` worker). That workflow is left in
place but **will fight this deployment if it still runs on push to `main`** — disable it before
cutting over (step 11).

---

## Why the order below matters

`tcp-listener` ACKs every telemetry record to the device the instant it parses it, *before*
`ingestion` looks up which vehicle the IMEI belongs to
(`backend/src/entrypoints/ingestion.ts` → `processPayload`). If no `vehicles` row matches, the
record is dropped and **the device will never resend it**. So the database must be restored and
the vehicle provisioned *before* any real device is pointed at this box.

---

## 1. Provision the VPS

Ubuntu 22.04+, 2 vCPU / 4 GB minimum (TimescaleDB plus three Node processes). Note the public IP.

**Sizing.** An 8 GB box runs this comfortably — measured steady state is roughly 3 GB, leaving
headroom for the report spike described below.

| | Steady state |
|---|---|
| Postgres / TimescaleDB (tuned — see below) | ~0.8 GB |
| api + ingestion + tcp-listener | ~0.4 GB |
| redis + nginx + web | ~0.1 GB |
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

Point these at the VPS IP, all proxying **disabled** (grey-cloud in Cloudflare — see the warning
in step 5):

| Record | Host | Purpose |
|---|---|---|
| A | `api.clarity-software.com.au` | REST API (nginx → 3000) |
| A | `socket.clarity-software.com.au` | socket.io realtime (nginx → 3001) |
| A | `tcp.clarity-software.com.au` | **device port 5027, raw TCP** |

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
keys and `STRIPE_PRICE_ID_*`, `MAPBOX_TOKEN`, `RESEND_API_KEY`, Twilio, `EXPO_ACCESS_TOKEN`.

`WEB_URL` / `DASHBOARD_URL` must list the real Vercel origin. `NODE_ENV=production` disables the
localhost CORS escape hatch in `api.ts` and `socket/index.ts`, so anything not listed is refused.

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

**Migrating existing production data.** You already have a working dashboard account, so the
current droplets hold the live database. Move it before provisioning anything new, or you will be
working against an empty schema:

```bash
# on the OLD api droplet
pg_dump -U <user> -d clarity_fleet | gzip > clarity.sql.gz
# copy over, then on the NEW VPS
gunzip -c clarity.sql.gz | $CP exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Only if starting genuinely fresh: `$CP exec api npm run create-admin`.

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

## 11. Disable the old CI pipeline

`.github/workflows/deploy.yml` still SSHes into the three old droplets on every push to `main`.
Either delete it or gate it (`if: false`), and stop the old `pm2` processes so two tcp-listeners
aren't competing for the same devices.

## 12. Backups

```bash
install -m 0750 deploy/backup.sh /usr/local/bin/clarity-backup
/usr/local/bin/clarity-backup          # run once now to prove it works
crontab -e   # 15 3 * * * /usr/local/bin/clarity-backup >> /var/log/clarity-backup.log 2>&1
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
