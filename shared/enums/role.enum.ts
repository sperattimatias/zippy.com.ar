export const ROLES = {
  ADMIN: 'admin',
  DRIVER: 'driver',
  PASSENGER: 'passenger',
  SOS: 'sos',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
