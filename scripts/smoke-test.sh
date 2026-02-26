#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
EMAIL="smoke+$(date +%s)@zippy.local"
PASSWORD="Passw0rd!12345"

fail() {
  echo "FAIL: $1"
  exit 1
}

json_field() {
  local payload="$1"
  local field="$2"
  python3 -c 'import json,sys; data=json.loads(sys.argv[1]); print(data.get(sys.argv[2],""))' "$payload" "$field"
}

echo "[1/4] Checking gateway health"
health_code=$(curl -s -o /tmp/zippy-health.json -w "%{http_code}" "$BASE_URL/health")
[[ "$health_code" == "200" ]] || fail "Gateway /health returned HTTP $health_code"

echo "[2/4] Register passenger"
register_code=$(curl -s -o /tmp/zippy-register.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
[[ "$register_code" == "201" || "$register_code" == "200" ]] || fail "Register returned HTTP $register_code"

echo "[3/4] Login passenger"
login_body=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

token=$(json_field "$login_body" "access_token")
[[ -n "$token" ]] || fail "Login did not return access_token"

echo "[4/4] Calling basic ride endpoint"
ride_code=$(curl -s -o /tmp/zippy-ride-health.json -w "%{http_code}" \
  "$BASE_URL/api/rides/health" \
  -H "Authorization: Bearer $token")
[[ "$ride_code" == "200" ]] || fail "Ride health returned HTTP $ride_code"

echo "PASS"
