const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ZIPPY_ADMIN_EMAIL || 'admin@zippy.local';
const ADMIN_PASSWORD = process.env.ZIPPY_ADMIN_PASSWORD || 'ChangeMe_12345!';

describe('local e2e (gateway/auth/ride)', () => {
  jest.setTimeout(120000);

  it('health + login + protected ride health', async () => {
    const health = await fetch(`${BASE_URL}/health`);
    expect(health.status).toBe(200);

    const login = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    expect(login.status).toBe(200);
    const loginBody = await login.json();
    expect(loginBody.access_token).toBeTruthy();

    const rideHealth = await fetch(`${BASE_URL}/api/rides/health`, {
      headers: { Authorization: `Bearer ${loginBody.access_token}` },
    });
    expect(rideHealth.status).toBe(200);
  });
});
