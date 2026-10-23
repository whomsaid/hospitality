import { query } from '../config/database.js';

export async function listDepartments({ search = '', page = 1, limit = 20 } = {}) {
  const { offset, limit: safeLimit } = buildPagination(page, limit);
  const searchValue = `%${String(search).trim()}%`;

  const rows = await query(
    `
      SELECT *
      FROM departments
      WHERE (? = '' OR name LIKE ? OR code LIKE ?)
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `,
    [searchValue === '%%' ? '' : search, searchValue, searchValue, safeLimit, offset],
  );

  const totalResult = await query(
    `
      SELECT COUNT(*) AS total
      FROM departments
      WHERE (? = '' OR name LIKE ? OR code LIKE ?)
    `,
    [searchValue === '%%' ? '' : search, searchValue, searchValue],
  );

  return {
    rows,
    total: totalResult[0]?.total || 0,
  };
}

export async function createDepartment(data) {
  const name = String(data.name || '').trim();
  const code = String(data.code || '').trim();

  if (!name) {
    throw new Error('Department name is required');
  }

  const result = await query(
    `INSERT INTO departments (name, code, description, is_active) VALUES (?, ?, ?, 1)`,
    [name, code || null, data.description || null],
  );

  return { id: result.insertId, name, code: code || null };
}

function buildPagination(page, limit) {
  const safePage = Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number(limit) > 0 ? Number(limit) : 20;
  return { offset: (safePage - 1) * safeLimit, limit: safeLimit };
}
