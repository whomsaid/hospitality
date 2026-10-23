export function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (!req.session?.csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF validation failed',
      errors: [{ field: 'csrf', message: 'A valid CSRF token is required' }],
    });
  }

  const headerToken = req.headers['x-csrf-token'];
  const bodyToken = req.body?.csrfToken;
  const suppliedToken = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  const tokenValue = suppliedToken || bodyToken;

  if (!tokenValue || tokenValue !== req.session.csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF validation failed',
      errors: [{ field: 'csrf', message: 'The request token does not match the session token' }],
    });
  }

  return next();
}
