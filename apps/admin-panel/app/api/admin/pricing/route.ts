import { proxyJsonWithAccessToken } from '../../_shared/gateway-proxy';

export async function GET() {
  return proxyJsonWithAccessToken(`/api/admin/pricing`);
}

export async function PUT(req: Request) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/pricing`, { method: 'PUT', body });
}
