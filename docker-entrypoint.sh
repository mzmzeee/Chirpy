#!/bin/sh

set -eu

: "${DB_URL:?DB_URL must be set}"
: "${PLATFORM:?PLATFORM must be set}"
: "${jwt_secret:?jwt_secret must be set}"
: "${POLKA_KEY:?POLKA_KEY must be set}"

attempt=1
max_attempts=30

echo "Running database migrations..."

until goose -dir /app/sql/schema postgres "$DB_URL" up; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database migrations failed after $max_attempts attempts." >&2
    exit 1
  fi

  echo "Database unavailable; retrying in 2 seconds ($attempt/$max_attempts)..."
  attempt=$((attempt + 1))
  sleep 2
done

echo "Database migrations completed."
echo "Starting Chirpy..."

exec /usr/local/bin/chirpy
