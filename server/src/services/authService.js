import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

export async function getUserPermissions(userId, assignment) {
  if (!assignment) return [];
  const permissions = new Set();
  const deniedPermissions = new Set();
  const allowedOverrides = new Set();

  const rows = await query(
    `
      SELECT DISTINCT p.name
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `,
    [assignment.role_id],
  );
  rows.forEach((row) => permissions.add(row.name));

  const overrides = await query(
    `
      SELECT p.name, upo.effect
      FROM user_permission_overrides upo
      JOIN permissions p ON p.id = upo.permission_id
      WHERE upo.user_id = ?
        AND (upo.hospital_id <=> ?)
        AND upo.revoked_at IS NULL
        AND (upo.expires_at IS NULL OR upo.expires_at > UTC_TIMESTAMP(3))
    `,
    [userId, assignment.hospital_id],
  );

  overrides.forEach((override) => {
    if (override.effect === 'deny') deniedPermissions.add(override.name)
    if (override.effect === 'allow') allowedOverrides.add(override.name)
  });

  allowedOverrides.forEach((name) => permissions.add(name));
  deniedPermissions.forEach((name) => permissions.delete(name));
  return [...permissions];
}

export async function buildSessionUser(userId) {
  const rows = await query(
    `
      SELECT u.id, u.username, u.email, u.full_name, u.status
      FROM users u
      WHERE u.id = ?
    `,
    [userId],
  );

  const user = rows[0];

  if (!user) {
    return null;
  }

  const assignments = await query(
    `
      SELECT ur.role_id, ur.hospital_id, r.name AS role_name, r.scope,
             h.name AS hospital_name
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id AND r.is_active = 1
      LEFT JOIN hospitals h ON h.id = ur.hospital_id
      WHERE ur.user_id = ?
        AND ur.status = 'active'
        AND ur.starts_at <= UTC_TIMESTAMP(3)
        AND (ur.ends_at IS NULL OR ur.ends_at > UTC_TIMESTAMP(3))
      ORDER BY CASE r.scope WHEN 'platform' THEN 0 WHEN 'hospital' THEN 1 ELSE 2 END, ur.starts_at
    `,
    [userId],
  );

  const assignment = assignments[0];
  if (!assignment) return null;

  const permissions = await getUserPermissions(userId, assignment);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.full_name || user.username,
    roleId: assignment.role_id,
    roleName: assignment.role_name,
    roleScope: assignment.scope,
    hospitalId: assignment.hospital_id,
    hospitalName: assignment.hospital_name,
    permissions,
  };
}

export async function authenticateUser(identifier, password) {
  const rows = await query(
    `
      SELECT u.id, u.username, u.email, u.phone, u.full_name,
           u.password_hash, u.status, u.last_login_at
      FROM users u
      WHERE LOWER(u.username) = LOWER(?)
        OR LOWER(u.email) = LOWER(?)
        OR u.phone = ?
      LIMIT 1
    `,
    [identifier, identifier, identifier],
  );

  const user = rows[0];

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches || user.status !== 'active') {
    return null;
  }

  const sessionUser = await buildSessionUser(user.id);
  if (!sessionUser) return null;

  return {
    ...sessionUser,
    lastLoginAt: user.last_login_at,
  };
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
  const rows = await query(
    `SELECT password_hash FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );

  const currentUser = rows[0];

  if (!currentUser) {
    return false;
  }

  const matchesCurrentPassword = await bcrypt.compare(currentPassword, currentUser.password_hash);

  if (!matchesCurrentPassword) {
    return false;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await query(`UPDATE users SET password_hash = ?, password_changed_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [
    passwordHash,
    userId,
  ]);

  return true;
}
