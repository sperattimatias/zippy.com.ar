const { PrismaClient, UserStatus } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = 'admin@zippy.local';
const DEFAULT_ADMIN_PASSWORD = 'ChangeMe_12345!';
const DEFAULT_ADMIN_STATUS = UserStatus.ACTIVE;

async function ensureRole(name) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function main() {
  const adminEmail = process.env.ZIPPY_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.ZIPPY_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const rawStatus = process.env.ZIPPY_ADMIN_STATUS || DEFAULT_ADMIN_STATUS;
  const adminStatus = Object.values(UserStatus).includes(rawStatus) ? rawStatus : DEFAULT_ADMIN_STATUS;
  const shouldResetPassword = process.env.ZIPPY_ADMIN_RESET_PASSWORD === '1';

  const roles = await Promise.all(['admin', 'driver', 'passenger', 'sos'].map((name) => ensureRole(name)));
  const adminRole = roles.find((role) => role.name === 'admin');

  if (!adminRole) {
    throw new Error('Could not ensure admin role');
  }

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  const passwordHash = shouldResetPassword || !existingUser
    ? await argon2.hash(adminPassword, { type: argon2.argon2id })
    : undefined;

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      ...(passwordHash ? { password_hash: passwordHash } : {}),
      status: adminStatus,
    },
    create: {
      email: adminEmail,
      password_hash: passwordHash,
      status: adminStatus,
    },
  });

  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: adminUser.id,
        role_id: adminRole.id,
      },
    },
    update: {},
    create: {
      user_id: adminUser.id,
      role_id: adminRole.id,
    },
  });

  console.log(`Auth seed complete. Admin user ensured: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error('Auth seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
