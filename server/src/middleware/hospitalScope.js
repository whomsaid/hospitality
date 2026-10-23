export function requireHospitalScope(req, res, next) {
  const sessionUser = req.session?.user
  if (!sessionUser) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errors: [{ field: 'session', message: 'Please log in to continue' }],
    })
  }

  const requestedValue = req.params.hospitalId || req.query.hospitalId || req.body?.hospitalId
  const requestedHospitalId = requestedValue === undefined ? null : Number(requestedValue)

  if (requestedHospitalId !== null && (!Number.isSafeInteger(requestedHospitalId) || requestedHospitalId <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid hospital context',
      errors: [{ field: 'hospitalId', message: 'A positive hospital ID is required' }],
    })
  }

  if (sessionUser.roleScope === 'platform') {
    if (!requestedHospitalId) {
      return res.status(400).json({
        success: false,
        message: 'Hospital context required',
        errors: [{ field: 'hospitalId', message: 'Select an authorized hospital for this operation' }],
      })
    }
    req.hospitalId = requestedHospitalId
    return next()
  }

  const assignedHospitalId = Number(sessionUser.hospitalId)
  if (!assignedHospitalId || (requestedHospitalId && requestedHospitalId !== assignedHospitalId)) {
    return res.status(403).json({
      success: false,
      message: 'Hospital access denied',
      errors: [{ field: 'hospitalId', message: 'The requested hospital is outside your active assignment' }],
    })
  }

  req.hospitalId = assignedHospitalId
  return next()
}