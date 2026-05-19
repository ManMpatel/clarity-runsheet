const TIER_LEVELS = {
  entry: 1,
  mid:   2,
  top:   3,
}

function requireTier(minTier) {
  return (req, res, next) => {
    const userTier = req.subscriptionTier || 'entry'
    const userLevel = TIER_LEVELS[userTier] || 0
    const requiredLevel = TIER_LEVELS[minTier] || 0

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error:    'Upgrade required',
        required: minTier,
        current:  userTier,
      })
    }
    next()
  }
}

module.exports = { requireTier }