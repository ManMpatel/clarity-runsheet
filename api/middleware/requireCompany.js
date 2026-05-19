function requireCompany(req, res, next) {
  if (!req.companyId) {
    return res.status(403).json({ error: 'No company context' })
  }
  req.companyFilter = { companyId: req.companyId }
  next()
}

module.exports = { requireCompany }