import { Truck, Navigation, Route as RouteIcon, ListChecks, Bell } from 'lucide-react'
import KpiCard from './KpiCard'
import { formatKm } from '../../lib/time'

export default function KpiRow({ summary, movingNow, loading }) {
  const s = summary

  return (
    <div className='grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4'>
      <KpiCard
        label='Vehicles reporting' icon={Truck} loading={loading}
        value={s?.fleet.reporting ?? 0}
        secondary={s ? `of ${s.fleet.registered} registered` : undefined}
        to='/live-map'
      />
      <KpiCard
        label='Moving now' icon={Navigation} loading={loading}
        value={movingNow ?? 0}
        secondary='Live'
        to='/live-map?status=moving'
      />
      <KpiCard
        label='Distance today' icon={RouteIcon} unit='km' loading={loading}
        value={s ? formatKm(s.today.km) : 0}
        delta={s?.today.vsYesterday.km}
        to='/trips'
      />
      <KpiCard
        label='Trips today' icon={ListChecks} loading={loading}
        value={s?.today.trips ?? 0}
        delta={s?.today.vsYesterday.trips}
        secondary={s?.attention.tripsInProgress ? `${s.attention.tripsInProgress} in progress` : undefined}
        to='/trips'
      />
      <KpiCard
        label='Open alerts' icon={Bell} loading={loading}
        value={s?.alerts.unread ?? 0}
        tone={s?.alerts.criticalUnread > 0 ? 'danger' : 'neutral'}
        secondary={s?.alerts.criticalUnread > 0 ? `${s.alerts.criticalUnread} critical` : undefined}
        to='/alerts'
      />
    </div>
  )
}
