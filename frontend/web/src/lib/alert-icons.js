import {
  Gauge, MapPinned, AlertOctagon, Wrench, BatteryLow, Truck, Moon, Cog, Activity, Bell,
} from 'lucide-react'

// Matches backend/src/db/schema/alerts.ts's alertTypeEnum.
export const ALERT_TYPE_ICONS = {
  speeding: Gauge,
  geofenceBreach: MapPinned,
  crash: AlertOctagon,
  maintenanceDue: Wrench,
  lowBattery: BatteryLow,
  towing: Truck,
  afterHours: Moon,
  engineFault: Cog,
  harshBraking: Activity,
  harshAcceleration: Activity,
  harshCornering: Activity,
}

export function alertIcon(type) {
  return ALERT_TYPE_ICONS[type] ?? Bell
}

export const SEVERITY_BADGE = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
}
