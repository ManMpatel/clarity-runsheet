const { getCollection } = require('../db/mongo')

const METRES_TO_KM = 0.001
const MILLIVOLTS_TO_VOLTS = 0.001
const RPM_DIVISOR = 4

function normaliseRecord(imei, companyId, vehicleId, record) {
  const io = record.io || {}

  return {
    metadata: {
      imei,
      companyId,
      vehicleId,
    },
    timestamp: new Date(record.timestamp),
    location: {
      type: 'Point',
      coordinates: [record.longitude, record.latitude],
    },
    altitude:   record.altitude,
    angle:      record.angle,
    satellites: record.satellites,
    speed:      record.speed,
    priority:   record.priority,
    ignition:   io.ignition     ?? null,
    movement:   io.movementSensor ?? null,
    odometer:   io.totalOdometer
                  ? Math.round(io.totalOdometer * METRES_TO_KM)
                  : null,
    externalVoltage: io.externalVoltage
                  ? (io.externalVoltage * MILLIVOLTS_TO_VOLTS).toFixed(2)
                  : null,
    batteryVoltage: io.batteryVoltage
                  ? (io.batteryVoltage * MILLIVOLTS_TO_VOLTS).toFixed(2)
                  : null,
    engineRpm:  io.engineRpm
                  ? Math.round(io.engineRpm / RPM_DIVISOR)
                  : null,
    engineLoad:       io.engineLoad       ?? null,
    coolantTemp:      io.coolantTemperature ?? null,
    fuelLevel:        io.fuelTankLevelInput ?? null,
    gsmSignal:        io.gsmSignal         ?? null,
    dtcCount:         io.numberOfDTCs      ?? null,
    crashDetection:   io.crashDetection    ?? null,
    greenDrivingType: io.greenDrivingType  ?? null,
    greenDrivingValue:io.greenDrivingValue ?? null,
    rawIo: io,
  }
}

async function writeTelemetry(imei, companyId, vehicleId, records) {
  const collection = await getCollection('telemetry_events')
  const docs = records.map(r => normaliseRecord(imei, companyId, vehicleId, r))

  if (docs.length === 1) {
    await collection.insertOne(docs[0])
  } else {
    await collection.insertMany(docs)
  }

  return docs
}

module.exports = { writeTelemetry, normaliseRecord }