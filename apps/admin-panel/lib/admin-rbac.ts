export type AdminPermission =
  | 'payments.refund'
  | 'trips.cancel'
  | 'fraud.block'
  | 'settings.edit'
  | 'audit.view';

const matrix: Record<AdminPermission, string[]> = {
  'payments.refund': ['admin', 'owner', 'finance', 'sos'],
  'trips.cancel': ['admin', 'owner', 'ops', 'sos'],
  'fraud.block': ['admin', 'owner', 'ops', 'sos'],
  'settings.edit': ['admin', 'owner', 'sos'],
  'audit.view': ['admin', 'owner', 'auditor', 'sos'],
};

export function can(roles: string[] | undefined, permission: AdminPermission): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((role) => matrix[permission].includes(role));
}
