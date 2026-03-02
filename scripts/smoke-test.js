#!/usr/bin/env node
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ZIPPY_ADMIN_EMAIL || 'admin@zippy.local';
const ADMIN_PASSWORD = process.env.ZIPPY_ADMIN_PASSWORD || 'ChangeMe_12345!';
const MAX_WAIT_SECONDS = Number(process.env.MAX_WAIT_SECONDS || '90');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function waitForHealth() {
  const start = Date.now();
  while (true) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.status === 200) {
        return;
      }
    } catch (_err) {
      // ignore until timeout
    }

    if ((Date.now() - start) / 1000 >= MAX_WAIT_SECONDS) {
      fail(`Gateway /health did not return 200 within ${MAX_WAIT_SECONDS}s`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

async function main() {
  console.log('[1/4] Waiting for gateway to be healthy');
  await waitForHealth();

  console.log('[2/4] Checking gateway /health');
  const healthRes = await fetch(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    fail(`Gateway /health returned HTTP ${healthRes.status}`);
  }

  console.log('[3/4] Login with seeded admin');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (loginRes.status !== 200) {
    fail(`Login returned HTTP ${loginRes.status}`);
  }
  const loginBody = await loginRes.json();
  const token = loginBody?.access_token;
  if (!token) {
    fail('Login did not return access_token');
  }

  console.log('[4/4] Calling basic ride endpoint');
  const rideRes = await fetch(`${BASE_URL}/api/rides/health`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (rideRes.status !== 200) {
    fail(`Ride health returned HTTP ${rideRes.status}`);
  }

  console.log('PASS');
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
