import { proxyJsonWithAccessToken } from '../../../../../_shared/gateway-proxy';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/fraud/cases/${params.id}/dismiss`, { method: 'POST', body });
}
