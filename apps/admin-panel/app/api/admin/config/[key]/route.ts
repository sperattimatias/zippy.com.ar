import { proxyJsonWithAccessToken } from '../../../_shared/gateway-proxy';

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  return proxyJsonWithAccessToken(`/api/admin/config/${params.key}`);
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/config/${params.key}`, { method: 'PUT', body });
}
