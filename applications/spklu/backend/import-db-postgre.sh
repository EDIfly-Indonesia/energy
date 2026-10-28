#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/supabase/.env}"

if [ -f "$ENV_FILE" ]; then
  # Load simple KEY=VALUE entries from Supabase env without failing on complex values.
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE" 2>/dev/null || true
  set +a
fi

SQL_FILE="${SQL_FILE:-$ROOT_DIR/database/db_postgre.sql}"
DB_CONTAINER="${DB_CONTAINER:-energy-postgres}"
POSTGRES_USER="${POSTGRES_USER:-energy_app}"
POSTGRES_DB="${POSTGRES_DB:-spklu}"
CONTAINER_SQL_FILE="${CONTAINER_SQL_FILE:-/tmp/db_postgre.sql}"

if [ ! -f "$SQL_FILE" ]; then
  echo "ERROR: SQL file not found: $SQL_FILE" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker command not found" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -Fx "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "ERROR: container not running: $DB_CONTAINER" >&2
  echo "Start the energy-core PostgreSQL first:" >&2
  echo "  cd /opt/energy/infrastructure/compose/core && docker compose up -d postgres" >&2
  echo "" >&2
  echo "Override if needed:" >&2
  echo "  DB_CONTAINER=<container> POSTGRES_USER=<user> POSTGRES_DB=<db> ./import-db-postgre.sh" >&2
  exit 1
fi

echo "Importing: $SQL_FILE"
echo "Target:    container=$DB_CONTAINER user=$POSTGRES_USER db=$POSTGRES_DB"

docker cp "$SQL_FILE" "$DB_CONTAINER:$CONTAINER_SQL_FILE"
MSYS_NO_PATHCONV=1 docker exec -i "$DB_CONTAINER" psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 \
  -f "$CONTAINER_SQL_FILE"

echo "Import completed."