export function authorize(requiredPermissions = []) {
  return (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: [{ field: 'session', message: 'Please log in to continue' }],
      });
    }

    const userPermissions = req.session.user.permissions || [];
    const missingPermissions = requiredPermissions.filter(
      (permission) => !userPermissions.includes(permission),
    );

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied',
        errors: [
          {
            field: 'authorization',
            message: `Missing required permission(s): ${missingPermissions.join(', ')}`,
          },
        ],
      });
    }

    return next();
  };
}
