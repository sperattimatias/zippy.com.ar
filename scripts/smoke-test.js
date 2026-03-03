#!/usr/bin/env node
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ZIPPY_ADMIN_EMAIL || 'admin@zippy.local';
const ADMIN_PASSWORD = process.env.ZIPPY_ADMIN_PASSWORD || 'ChangeMe_12345!';
const MAX_WAIT_SECONDS = Number(process.env.MAX_WAIT_SECONDS || '90');
const THROTTLE_ATTEMPTS = Number(process.env.SMOKE_THROTTLE_ATTEMPTS || '30');
const SMOKE_TIMEOUT_CHECK = process.env.SMOKE_TIMEOUT_CHECK === '1';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function waitForHealth() {
  const start = Date.now();
  while (true) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.status === 200) return;
    } catch {
      // retry
    }

    if ((Date.now() - start) / 1000 >= MAX_WAIT_SECONDS) {
      fail(`Gateway /health did not return 200 within ${MAX_WAIT_SECONDS}s`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function main() {
  console.log('[1/6] Waiting for gateway to be healthy');
  await waitForHealth();

  console.log('[2/6] Login with seeded admin');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const loginRequestId = loginRes.headers.get('x-request-id');
  if (!loginRequestId) fail('Login response is missing x-request-id header');
  if (loginRes.status !== 200) {
    if (loginRes.status === 403) {
      fail(
        'Login returned HTTP 403 (likely email not verified or user suspended). Check auth seed/admin state.',
      );
    }
    fail(`Login returned HTTP ${loginRes.status}`);
  }
  const loginBody = await loginRes.json();
  const accessToken = loginBody?.access_token;
  const refreshToken = loginBody?.refresh_token;
  if (!accessToken || !refreshToken) {
    fail('Login did not return access_token + refresh_token');
  }

  console.log('[3/6] Refresh token rotation');
  const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!refreshRes.headers.get('x-request-id'))
    fail('Refresh response is missing x-request-id header');
  if (refreshRes.status !== 200) {
    fail(`Refresh returned HTTP ${refreshRes.status}`);
  }
  const refreshBody = await refreshRes.json();
  const rotatedAccessToken = refreshBody?.access_token;
  const rotatedRefreshToken = refreshBody?.refresh_token;
  if (!rotatedAccessToken || !rotatedRefreshToken) {
    fail('Refresh did not return rotated tokens');
  }

  console.log('[4/6] Logout with rotated refresh token');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rotatedRefreshToken }),
  });
  if (!logoutRes.headers.get('x-request-id'))
    fail('Logout response is missing x-request-id header');
  if (logoutRes.status !== 200) {
    fail(`Logout returned HTTP ${logoutRes.status}`);
  }

  console.log('[5/6] Calling basic ride endpoint');
  const rideRes = await fetch(`${BASE_URL}/api/rides/health`, {
    headers: { Authorization: `Bearer ${rotatedAccessToken}` },
  });
  const rideRequestId = rideRes.headers.get('x-request-id');
  if (!rideRequestId) fail('Ride health response is missing x-request-id header');
  if (rideRes.status !== 200) {
    fail(`Ride health returned HTTP ${rideRes.status}`);
  }
  const rideBody = await rideRes.json();
  if (!rideBody.requestId) fail('Ride health body is missing requestId');

  console.log('[6/6] Verifying auth throttling returns 429');
  let throttled = false;
  for (let i = 0; i < THROTTLE_ATTEMPTS; i += 1) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: 'invalid-password' }),
    });
    if (res.status === 429) {
      throttled = true;
      break;
    }
  }
  if (!throttled) {
    fail(`Expected at least one 429 from auth throttling within ${THROTTLE_ATTEMPTS} attempts`);
  }

  if (SMOKE_TIMEOUT_CHECK) {
    console.log(
      '[optional] timeout behavior is documented for manual verification in README (FASE 5).',
    );
  }

  console.log('PASS');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
