async function queueReport(type, companyId, params) {
  console.log(`[Reports] Queued ${type} for company ${companyId}`)
  return { queued: true, type, params }
}

module.exports = { queueReport }