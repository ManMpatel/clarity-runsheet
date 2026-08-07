import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function VehicleHealth() {
  const [fleet, setFleet]       = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/reports/vehicle-health')
        setFleet(res.data)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className='p-6'>

      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Vehicle Health</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Live diagnostics and fault codes for each van
        </p>
      </div>

      {loading ? (
        <p className='text-sm text-gray-400'>Loading vehicle data...</p>
      ) : fleet.length === 0 ? (
        <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
          <p className='text-sm text-gray-400'>No vehicles found</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
          {fleet.map((item, i) => {
            const v = item.vehicle
            const t = item.latest
            const hasFault = t?.dtcCount > 0
            return (
              <button
                key={i}
                onClick={() => setSelected(item)}
                className={`bg-white rounded-xl border p-5 text-left hover:shadow-sm transition ${
                  hasFault
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                <div className='flex items-center justify-between mb-4'>
                  <div>
                    <p className='text-sm font-semibold text-gray-800'>{v.name}</p>
                    <p className='text-xs text-gray-400 mt-0.5'>
                      {v.registration || v.imei}
                    </p>
                  </div>
                  {hasFault && (
                    <span className='text-xs font-medium px-2 py-0.5 bg-red-100 text-red-700 rounded-full'>
                      {t.dtcCount} fault{t.dtcCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <HealthStat
                    label='Battery'
                    value={t?.externalVoltage ? `${t.externalVoltage}V` : '--'}
                    warn={t?.externalVoltage && parseFloat(t.externalVoltage) < 11.5}
                  />
                  <HealthStat
                    label='Coolant'
                    value={t?.coolantTemp ? `${t.coolantTemp}°C` : '--'}
                    warn={t?.coolantTemp && t.coolantTemp > 100}
                  />
                  <HealthStat
                    label='Fuel'
                    value={t?.fuelLevel ? `${t.fuelLevel}%` : '--'}
                    warn={t?.fuelLevel && t.fuelLevel < 15}
                  />
                  <HealthStat
                    label='Odometer'
                    value={t?.odometer ? `${t.odometer.toLocaleString()} km` : '--'}
                  />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4'>
          <div className='bg-white rounded-xl w-full max-w-md p-6'>
            <div className='flex items-center justify-between mb-5'>
              <div>
                <h3 className='text-base font-semibold text-gray-800'>
                  {selected.vehicle.name}
                </h3>
                <p className='text-xs text-gray-400 mt-0.5'>
                  {selected.vehicle.registration || selected.vehicle.imei}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className='text-gray-400 hover:text-gray-600 text-xl leading-none'
              >
                ×
              </button>
            </div>

            <div className='space-y-2'>
              <DetailRow label='Battery voltage' value={
                selected.latest?.externalVoltage
                  ? `${selected.latest.externalVoltage}V`
                  : '--'
              } />
              <DetailRow label='Coolant temp' value={
                selected.latest?.coolantTemp
                  ? `${selected.latest.coolantTemp}°C`
                  : '--'
              } />
              <DetailRow label='Fuel level' value={
                selected.latest?.fuelLevel
                  ? `${selected.latest.fuelLevel}%`
                  : '--'
              } />
              <DetailRow label='Engine load' value={
                selected.latest?.engineLoad
                  ? `${selected.latest.engineLoad}%`
                  : '--'
              } />
              <DetailRow label='Engine RPM' value={
                selected.latest?.engineRpm ?? '--'
              } />
              <DetailRow label='Odometer' value={
                selected.latest?.odometer
                  ? `${selected.latest.odometer.toLocaleString()} km`
                  : '--'
              } />
              <DetailRow label='DTC faults' value={
                selected.latest?.dtcCount ?? 0
              } warn={selected.latest?.dtcCount > 0} />
            </div>

            <button
              onClick={() => setSelected(null)}
              className='w-full mt-5 h-9 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition'
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

function HealthStat({ label, value, warn }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${warn ? 'bg-red-50' : 'bg-gray-50'}`}>
      <p className='text-xs text-gray-400'>{label}</p>
      <p className={`text-sm font-semibold ${warn ? 'text-red-600' : 'text-gray-700'}`}>
        {value}
      </p>
    </div>
  )
}

function DetailRow({ label, value, warn }) {
  return (
    <div className='flex justify-between py-1.5 border-b border-gray-100'>
      <span className='text-sm text-gray-500'>{label}</span>
      <span className={`text-sm font-medium ${warn ? 'text-red-600' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  )
}
