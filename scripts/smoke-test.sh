#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${ZIPPY_ADMIN_EMAIL:-admin@zippy.local}"
ADMIN_PASSWORD="${ZIPPY_ADMIN_PASSWORD:-ChangeMe_12345!}"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-90}"

fail() {
  echo "FAIL: $1"
  exit 1
}

json_field() {
  local payload="$1"
  local field="$2"
  python3 -c 'import json,sys; data=json.loads(sys.argv[1]); print(data.get(sys.argv[2],""))' "$payload" "$field"
}

echo "[1/4] Waiting for gateway to be healthy"
start_time=$(date +%s)
while true; do
  health_code=$(curl -s -o /tmp/zippy-health.json -w "%{http_code}" "$BASE_URL/health" || true)
  if [[ "$health_code" == "200" ]]; then
    break
  fi

  now=$(date +%s)
  elapsed=$((now - start_time))
  if (( elapsed >= MAX_WAIT_SECONDS )); then
    fail "Gateway /health did not return 200 within ${MAX_WAIT_SECONDS}s (last HTTP: ${health_code:-N/A})"
  fi

  sleep 2
done

echo "[2/4] Checking gateway /health"
health_code=$(curl -s -o /tmp/zippy-health.json -w "%{http_code}" "$BASE_URL/health")
[[ "$health_code" == "200" ]] || fail "Gateway /health returned HTTP $health_code"

echo "[3/4] Login with seeded admin"
login_code=$(curl -s -o /tmp/zippy-login.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
[[ "$login_code" == "200" ]] || fail "Login returned HTTP $login_code"

login_body=$(cat /tmp/zippy-login.json)
token=$(json_field "$login_body" "access_token")
[[ -n "$token" ]] || fail "Login did not return access_token"

echo "[4/4] Calling basic ride endpoint"
ride_code=$(curl -s -o /tmp/zippy-ride-health.json -w "%{http_code}" \
  "$BASE_URL/api/rides/health" \
  -H "Authorization: Bearer $token")
[[ "$ride_code" == "200" ]] || fail "Ride health returned HTTP $ride_code"

echo "PASS"
