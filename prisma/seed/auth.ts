import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import {
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  ROLE_DEFINITIONS,
  permissionsForRole,
} from '@/lib/auth/rbac-matrix';

export async function seedAuth() {
  const permissionRecords = [];
  for (const resource of PERMISSION_RESOURCES) {
    for (const action of PERMISSION_ACTIONS) {
      const description = `${action} ${resource}`;
    const existing = await db.permission.findUnique({
        where: { resource_action: { resource, action } },
      });
      const record = existing
        ? await db.permission.update({
            where: { id: existing.id },
            data: { description },
          })
        : await db.permission.create({
            data: { resource, action, description },
          });
      permissionRecords.push(record);
    }
  }

  const permissionByKey = new Map(
    permissionRecords.map((permission) => [
      `${permission.resource}:${permission.action}`,
      permission,
    ])
  );

  for (const definition of ROLE_DEFINITIONS) {
    const role = await db.role.upsert({
      where: { slug: definition.slug },
      update: {
        name: definition.name,
        description: definition.description,
        hierarchy: definition.hierarchy,
        isPrivileged: definition.isPrivileged,
        isSystem: true,
      },
      create: {
        slug: definition.slug,
        name: definition.name,
        description: definition.description,
        hierarchy: definition.hierarchy,
        isPrivileged: definition.isPrivileged,
        isSystem: true,
      },
    });

    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    const keys = permissionsForRole(definition.slug);
    await db.rolePermission.createMany({
      data: keys
        .map((key) => permissionByKey.get(key)?.id)
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
    });
  }

  const superRole = await db.role.findUnique({ where: { slug: 'super_admin' } });
  if (!superRole) {
    throw new Error('super_admin role was not seeded');
  }

  const email = (
    process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@busamekeneeyasus.org'
  ).toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe!Admin1';
  const [firstName, ...rest] = (
    process.env.SEED_SUPER_ADMIN_NAME || 'Church Administrator'
  ).split(' ');

  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    if (process.env.NODE_ENV === 'production' && !process.env.SEED_SUPER_ADMIN_PASSWORD) {
      console.warn('[Seed] Skipping super admin user in production without SEED_SUPER_ADMIN_PASSWORD.');
    } else {
      await db.user.create({
        data: {
          email,
          passwordHash: await hashPassword(password),
          firstName: firstName || 'Church',
          lastName: rest.join(' ') || 'Administrator',
          status: 'active',
          isVerified: true,
          roleId: superRole.id,
        },
      });
      console.log(`[Seed] Super administrator created: ${email}`);
    }
  } else {
    console.log('[Seed] Super administrator already exists, skipping user create.');
  }
}
