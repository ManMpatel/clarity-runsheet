'use strict'

const BUSINESS_DAYS = [1, 2, 3, 4, 5] // Mon-Fri

function classifyTrip(trip, settings) {
  if (!settings || settings.mode === 'all_business') {
    return 'business'
  }

  if (settings.mode === 'all_personal') {
    return 'personal'
  }

  const startTime = new Date(trip.startTime)
  const dayOfWeek = startTime.getDay()
  const hour = startTime.getHours()
  const minute = startTime.getMinutes()
  const timeInMinutes = hour * 60 + minute

  const businessDays = settings.businessDays || BUSINESS_DAYS
  const startMinutes = parseTime(settings.startTime || '08:00')
  const endMinutes = parseTime(settings.endTime || '17:00')

  const isBusinessDay = businessDays.includes(dayOfWeek)
  const isBusinessHours = timeInMinutes >= startMinutes && 
                          timeInMinutes <= endMinutes

  if (isBusinessDay && isBusinessHours) {
    return 'business'
  }

  return 'personal'
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

module.exports = { classifyTrip }