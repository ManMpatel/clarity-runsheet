#!/usr/bin/env bash
# Nightly Postgres backup for the Clarity Fleet VPS.
#
# This database holds telemetry history, trips, driver events AND billing/subscription state —
# none of it reconstructable. The devices do not buffer: tcp-listener ACKs each record the moment
# it parses it, so anything lost is lost permanently.
#
# Install (as root on the VPS):
#   install -m 0750 deploy/backup.sh /usr/local/bin/clarity-backup
#   crontab -e   ->   15 3 * * *  /usr/local/bin/clarity-backup >> /var/log/clarity-backup.log 2>&1
#
# Restore:
#   gunzip -c /var/backups/clarity/clarity-2026-08-23.sql.gz \
#     | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/clarity}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE_DIR="${COMPOSE_DIR:-/root/clarity}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

# Credentials come from the same file the stack runs on, so they can never drift apart.
ENV_FILE="${ENV_FILE:-$COMPOSE_DIR/backend/.env.production}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
fi
: "${POSTGRES_USER:?POSTGRES_USER not set (checked $ENV_FILE and the environment)}"
: "${POSTGRES_DB:=clarity_fleet}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F)"
TARGET="$BACKUP_DIR/clarity-$STAMP.sql.gz"
TMP="$TARGET.partial"

cd "$COMPOSE_DIR"

# Write to .partial first and only rename on success. A crashed pg_dump would otherwise leave a
# truncated .sql.gz that looks like a valid backup right up until you need it.
echo "[backup] $(date -Is) dumping $POSTGRES_DB -> $TARGET"
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  | gzip -9 > "$TMP"

# gzip -t catches truncation that a zero exit status from the pipeline can hide.
gzip -t "$TMP"
mv "$TMP" "$TARGET"

SIZE="$(du -h "$TARGET" | cut -f1)"
echo "[backup] ok — $TARGET ($SIZE)"

# Retention. -mtime +N deletes strictly older than N days.
DELETED="$(find "$BACKUP_DIR" -name 'clarity-*.sql.gz' -mtime "+$RETENTION_DAYS" -print -delete | wc -l)"
echo "[backup] pruned $DELETED backup(s) older than $RETENTION_DAYS days"

# Clean up any .partial left by an earlier crashed run.
find "$BACKUP_DIR" -name '*.partial' -mtime +1 -delete
