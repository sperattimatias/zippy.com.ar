export const ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  OPS: 'ops',
  SUPPORT: 'support',
  FINANCE: 'finance',
  AUDITOR: 'auditor',
  DRIVER: 'driver',
  PASSENGER: 'passenger',
  SOS: 'sos',
} as const;

export const ADMIN_PANEL_ROLES = [
  ROLES.ADMIN,
  ROLES.OWNER,
  ROLES.OPS,
  ROLES.SUPPORT,
  ROLES.FINANCE,
  ROLES.AUDITOR,
  ROLES.SOS,
] as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
