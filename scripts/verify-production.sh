#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ] || [ ! -s "$2" ]; then
  echo "Usage: bash scripts/verify-production.sh <production-url> <verified-homepage>" >&2
  exit 1
fi

production_url="$1"
verified_homepage="$2"
attempts="${PRODUCTION_SMOKE_ATTEMPTS:-6}"
delay_seconds="${PRODUCTION_SMOKE_DELAY_SECONDS:-5}"

if ! [[ "$attempts" =~ ^[1-9][0-9]*$ ]] || ! [[ "$delay_seconds" =~ ^[0-9]+$ ]]; then
  echo "Smoke attempts must be positive and delay must be a nonnegative integer." >&2
  exit 1
fi

smoke_directory="$(mktemp -d)"
trap 'rm -rf "$smoke_directory"' EXIT
production_body="$smoke_directory/home.html"

for ((attempt = 1; attempt <= attempts; attempt++)); do
  status="000"

  if status="$(
    curl --fail --silent --show-error --location \
      --connect-timeout 5 \
      --max-time 20 \
      --output "$production_body" \
      --write-out '%{http_code}' \
      "$production_url"
  )" && [ "$status" = "200" ] && cmp -s "$verified_homepage" "$production_body"; then
    echo "Production serves the verified homepage (attempt $attempt/$attempts)."
    exit 0
  fi

  echo "Production homepage differs or is unavailable (attempt $attempt/$attempts, HTTP $status)." >&2

  if [ "$attempt" -lt "$attempts" ]; then
    sleep "$delay_seconds"
  fi
done

echo "Production did not serve the verified homepage after $attempts attempts." >&2
exit 1
