export const mockVehicles = [
  { name: 'Toyota HiAce', latitude: -33.8688, longitude: 151.2093, speed: 42, ignition: true },
  { name: 'Ford Transit', latitude: -33.8650, longitude: 151.2150, speed: 0, ignition: true },
  { name: 'Hyundai iLoad', latitude: -33.8730, longitude: 151.2040, speed: 0, ignition: false },
]

export const mockTrips = [
  { _id: '1', vehicleName: 'Toyota HiAce', startTime: '2026-06-18T07:15:00', endTime: '2026-06-18T08:02:00', distanceKm: 18.4, durationMinutes: 47 },
  { _id: '2', vehicleName: 'Ford Transit', startTime: '2026-06-18T06:40:00', endTime: '2026-06-18T07:10:00', distanceKm: 9.1, durationMinutes: 30 },
  { _id: '3', vehicleName: 'Hyundai iLoad', startTime: '2026-06-17T16:05:00', endTime: '2026-06-17T16:52:00', distanceKm: 22.7, durationMinutes: 47 },
]

export const mockAlerts = [
  { _id: '1', type: 'speeding', message: 'Toyota HiAce exceeded 110 km/h on M4', severity: 'critical', createdAt: '2026-06-18T08:45:00', read: false },
  { _id: '2', type: 'afterHours', message: 'Ford Transit started after hours', severity: 'warning', createdAt: '2026-06-17T19:20:00', read: false },
  { _id: '3', type: 'geofenceBreach', message: 'Hyundai iLoad exited depot zone', severity: 'warning', createdAt: '2026-06-17T15:10:00', read: true },
]

export const mockDrivers = [
  { _id: '1', name: 'Dev Patel', mobile: '0412 345 678' },
  { _id: '2', name: 'Sarah Kim', mobile: '0423 456 789' },
  { _id: '3', name: 'Mo Hassan', mobile: '0434 567 890' },
]

export const mockScores = {
  '1': { overallScore: 92 },
  '2': { overallScore: 78 },
  '3': { overallScore: 61 },
}