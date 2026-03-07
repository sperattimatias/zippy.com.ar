import { proxyJsonWithAccessToken } from '../../../../_shared/gateway-proxy';

export async function PATCH(req: Request, ctx: { params: { eventKey: string } }) {
  const body = await req.text();
  return proxyJsonWithAccessToken(`/api/admin/notifications/settings/${ctx.params.eventKey}`, { method: 'PATCH', body });
}
