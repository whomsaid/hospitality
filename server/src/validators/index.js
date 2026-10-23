export function isValidId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0;
}

export function sanitizeText(value) {
  if (value === undefined || value === null) return null;
  return String(value).trim();
}

export function buildPagination(page, limit, maxLimit = 100) {
  const pageNumber = Number(page) > 0 ? Number(page) : 1;
  const pageSize = Number(limit) > 0 ? Number(limit) : 20;
  const safeLimit = pageSize > maxLimit ? maxLimit : pageSize;

  return {
    page: pageNumber,
    limit: safeLimit,
    offset: (pageNumber - 1) * safeLimit,
  };
}
