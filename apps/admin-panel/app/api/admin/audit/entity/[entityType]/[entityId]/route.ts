import { proxyJsonWithAccessToken } from '../../../../../_shared/gateway-proxy';

export async function GET(_req: Request,
  ctx: { params: { entityType: string; entityId: string } },) {
  return proxyJsonWithAccessToken(`/api/admin/audit/entity/${ctx.params.entityType}/${ctx.params.entityId}`);
}
