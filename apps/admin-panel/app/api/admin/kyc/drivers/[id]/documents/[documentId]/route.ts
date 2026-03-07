import { proxyJsonWithAccessToken } from '../../../../../../_shared/gateway-proxy';

export async function PATCH(req: Request,
  { params }: { params: { id: string; documentId: string } },) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/kyc/drivers/${params.id}/documents/${params.documentId}`, { method: 'PATCH', body });
}
