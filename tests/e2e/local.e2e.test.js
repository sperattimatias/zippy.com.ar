const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ZIPPY_ADMIN_EMAIL || 'admin@zippy.local';
const ADMIN_PASSWORD = process.env.ZIPPY_ADMIN_PASSWORD || 'ChangeMe_12345!';

describe('local e2e (gateway/auth/ride)', () => {
  jest.setTimeout(120000);

  it('health + login + protected ride health with request-id propagation', async () => {
    const fixedRequestId = 'e2e-fixed-request-id';
    const health = await fetch(`${BASE_URL}/health`, {
      headers: { 'x-request-id': fixedRequestId },
    });
    expect(health.status).toBe(200);
    expect(health.headers.get('x-request-id')).toBe(fixedRequestId);
    const healthBody = await health.json();
    expect(healthBody.requestId).toBe(fixedRequestId);

    const login = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    expect(login.status).toBe(200);
    expect(login.headers.get('x-request-id')).toBeTruthy();
    const loginBody = await login.json();
    expect(loginBody.access_token).toBeTruthy();

    const rideHealth = await fetch(`${BASE_URL}/api/rides/health`, {
      headers: { Authorization: `Bearer ${loginBody.access_token}` },
    });
    expect(rideHealth.status).toBe(200);
    expect(rideHealth.headers.get('x-request-id')).toBeTruthy();
  });
});
