export function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errors: [{ field: 'session', message: 'Please log in to continue' }],
    });
  }

  return next();
}
