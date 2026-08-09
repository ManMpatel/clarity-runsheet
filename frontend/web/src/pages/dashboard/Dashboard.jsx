import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RotateCw, Plus } from 'lucide-react'
import api from '../../lib/api'
import { useFleetStore } from '../../store/fleetStore'
import { useAlertStore } from '../../store/alertStore'
import { useFleetSocket } from '../../hooks/useSocket'
import useDashboardSummary from '../../hooks/useDashboardSummary'
import { countByStatus } from '../../lib/fleet-status'
import { longDateLabel, sinceLabel } from '../../lib/time'
import {
  PageHeader, Button, SegmentedControl, Tooltip, ErrorState,
  Card, CardHeader, CardTitle, CardContent,
} from '../../components/ui'
import KpiRow from './KpiRow'
import StatusBreakdown from './StatusBreakdown'
import LiveVehicleList from './LiveVehicleList'
import AlertsFeed from './AlertsFeed'
import NeedsAttention from './NeedsAttention'
import DashboardSkeleton from './DashboardSkeleton'
import DashboardEmpty from './DashboardEmpty'
import PendingActivation from './PendingActivation'

// recharts is ~100KB gzip and has no business sitting in the shell's entry bundle for pages that
// never render a chart — split it out and only pay for it once the dashboard actually mounts.
const FleetActivityChart = lazy(() => import('./FleetActivityChart'))

const RANGE_OPTIONS = [
  { value: '1', label: 'Today' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const days = searchParams.get('days') || '7'

  const { data: summary, loading: summaryLoading, error: summaryError, refetch } = useDashboardSummary(Number(days))

  const [fleetState, setFleetState] = useState({ loading: true, error: null })
  const [alertsState, setAlertsState] = useState({ loading: true, error: null })

  const setFleet = useFleetStore(s => s.setFleet)
  const updateVan = useFleetStore(s => s.updateVan)
  // Subscribing to the `vans` record itself (not just the `getAllVans` function reference) is
  // what makes this component re-render when a `van:update` socket event lands — selecting the
  // function alone is a stable reference and zustand would never notify on it changing.
  const vansById = useFleetStore(s => s.vans)
  const vans = useMemo(() => Object.values(vansById), [vansById])

  const setAlerts = useAlertStore(s => s.setAlerts)

  useFleetSocket({ onVanUpdate: updateVan })

  // Deliberately doesn't set `loading: true` itself — the initial useState above already starts
  // loading, so the mount-triggered effect call below doesn't need to. `retryFleet`/`retryAlerts`
  // are the synchronous-setState-then-fetch versions for the user-triggered retry path, where
  // resetting to a spinner immediately on click is exactly what should happen.
  const fetchFleet = useCallback(() => {
    return api.get('/telemetry/live')
      .then(res => { setFleet(res.data); setFleetState({ loading: false, error: null }) })
      .catch(err => setFleetState({ loading: false, error: err }))
  }, [setFleet])

  const fetchAlerts = useCallback(() => {
    return api.get('/alerts?limit=8')
      .then(res => { setAlerts(res.data.alerts, res.data.unread); setAlertsState({ loading: false, error: null }) })
      .catch(err => setAlertsState({ loading: false, error: err }))
  }, [setAlerts])

  const retryFleet = useCallback(() => { setFleetState({ loading: true, error: null }); fetchFleet() }, [fetchFleet])
  const retryAlerts = useCallback(() => { setAlertsState({ loading: true, error: null }); fetchAlerts() }, [fetchAlerts])

  useEffect(() => { fetchFleet() }, [fetchFleet])
  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const liveStatus = useMemo(() => countByStatus(vans), [vans])

  function setDays(value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('days', value)
      return next
    }, { replace: true })
  }

  // Locked / pending-activation is an explicit server signal now, not "no data and no error" —
  // the previous dashboard's `isLocked = !stats && !loading` also fired on plain network
  // failures, telling a fully-paid user their account was pending activation.
  if (summary?.locked) {
    return <PendingActivation />
  }

  const initialLoading = summaryLoading && !summary && !summaryError
  if (initialLoading) {
    return <DashboardSkeleton />
  }

  // The aggregate summary failed to load at all (as opposed to loaded-and-genuinely-empty).
  // Distinguishing the two matters: without it, a summary outage would render as "you have zero
  // vehicles", which is actively misleading for an account that has a full fleet.
  const summaryFailed = !!summaryError && !summary
  const registered = summary?.fleet.registered ?? 0

  if (!summaryFailed && registered === 0) {
    return <DashboardEmpty variant='no-vehicles' />
  }
  if (!summaryFailed && registered > 0 && !fleetState.loading && vans.length === 0) {
    // Flips to the real dashboard the instant a van:update socket event arrives, since `vans`
    // above is a reactive selector — no poll or reload needed.
    return <DashboardEmpty variant='never-reported' attention={summary.attention} />
  }

  return (
    <div className='p-4 sm:p-6 space-y-5'>
      <PageHeader
        title='Dashboard'
        description={longDateLabel()}
        actions={
          <>
            <SegmentedControl label='Date range' size='sm' value={days} onChange={setDays} options={RANGE_OPTIONS} />
            <Tooltip content={summary ? `Updated ${sinceLabel(summary.generatedAt)} ago` : 'Refresh'}>
              <Button variant='outline' size='icon' onClick={refetch} aria-label='Refresh dashboard'>
                <RotateCw className='size-4' aria-hidden='true' />
              </Button>
            </Tooltip>
            {registered < 3 && (
              <Button iconLeft={Plus} onClick={() => navigate('/settings?tab=vehicles')}>Add vehicle</Button>
            )}
          </>
        }
      />

      {summaryFailed ? (
        <ErrorState
          title="Couldn't load dashboard metrics"
          message='The vehicle list and alerts below are unaffected — only trends and totals need a retry.'
          onRetry={refetch}
        />
      ) : (
        <>
          <KpiRow
            summary={summary}
            movingNow={vans.length > 0 ? liveStatus.moving : summary?.status.moving}
            loading={summaryLoading && !summary}
          />

          <div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
            <Card className='xl:col-span-2'>
              <CardHeader><CardTitle>Fleet activity</CardTitle></CardHeader>
              <CardContent className='pt-0'>
                <Suspense fallback={<div className='h-64 rounded-control bg-surface-2 motion-safe:animate-pulse' />}>
                  <FleetActivityChart trend={summary?.trend ?? []} />
                </Suspense>
              </CardContent>
            </Card>
            <StatusBreakdown status={summary?.status} loading={summaryLoading && !summary} />
          </div>
        </>
      )}

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
        <LiveVehicleList vans={vans} loading={fleetState.loading} error={fleetState.error} onRetry={retryFleet} />
        <AlertsFeed loading={alertsState.loading} error={alertsState.error} onRetry={retryAlerts} />
      </div>

      {!summaryFailed && (
        <NeedsAttention
          attention={summary?.attention}
          criticalAlertsCount={summary?.alerts.criticalUnread}
          loading={summaryLoading && !summary}
        />
      )}
    </div>
  )
}
