# FTC921 configuration + reporting profile

Working sheet for whoever configures the physical device. Covers two things:

1. **Connectivity** — pointing the device at our server. Without this nothing else matters.
2. **Reporting profile** — the tiered data-saving config from the README's Phase 2, against a
   500 MB / 5 year SIM allowance (~273 KB/day sustainable, measured at ~10 MB/day today: **37×**
   over budget, which exhausts the allowance in about seven weeks).

Do both in the same session. The technician is standing next to the vehicle either way, and part 2
is what stops the SIM dying inside two months.

---

## Before the visit — server side must already be green

Do not dispatch anyone until all of these pass. Every one of them is faster to fix remotely than
with someone waiting next to a van.

- [ ] `DEPLOY.md` completed; `curl -s localhost:4001/health` returns `status: ok`
- [ ] Vehicle provisioned: a `vehicles` row exists with `imei = 865124073607428`
- [ ] `npm run simulate-device -- --host tcp.clarity-software.com.au --imei 865124073607428`
      produces a moving marker on the live map
- [ ] `curl -s localhost:3001/health` shows `unknownImei: 0`

The reason for the second and fourth items: `tcp-listener` ACKs records **before** `ingestion`
checks the IMEI. An unprovisioned device looks perfectly healthy in the device logs while every
packet is silently discarded and never resent.

---

## Part 1 — Connectivity (Teltonika Configurator → GPRS)

| Setting | Value |
|---|---|
| APN | **from the SIM portal — see "Open question" below** |
| APN username / password | usually blank; whatever the portal states |
| Domain / Server address | `tcp.clarity-software.com.au` |
| Port | `5027` |
| Data protocol | **TCP** (not UDP — the listener is a TCP server) |
| Codec | **Codec 8** or **Codec 8 Extended** |
| Modem/GPRS | Enabled |

**Use the hostname, not an IP.** Reconfiguring the server address costs another trip to the
vehicle; repointing DNS costs nothing.

Codec 8 and 8E are both accepted — `entrypoints/tcp-listener.ts` dispatches on the codec byte to
`parseCodec8` (`0x08`) or `parseCodec8E` (`0x8E`). Anything else is logged as
`Unknown codec` and dropped, so do not select Codec 16.

### On-site checks, in order

1. **Path check, before touching the device.** From a phone on the same carrier/SIM as the tracker:
   `nc -vz tcp.clarity-software.com.au 5027`. If this fails, the problem is the network path
   (firewall, DNS, roaming), not the device — stop and fix that first.
2. Write the config, power-cycle the device, and give it up to a minute to attach.
3. Confirm the device reports a GSM fix and a GPS fix in Configurator's status pane.
4. **Have someone watch the server** while the technician is still on site:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f tcp-listener
   ```
   Expect `[TCP] Device identified: 865124073607428` then `N records queued`.
5. Cross-check that ingestion accepted it, not just the listener:
   ```bash
   curl -s localhost:3001/health     # processed > 0, unknownImei still 0
   ```
6. Drive the vehicle a few hundred metres and confirm the marker moves on the live map.

### If it does not connect

| Symptom | Likely cause |
|---|---|
| No `New connection` in the log at all | APN wrong, roaming not enabled, or 5027 blocked. Re-run check 1. |
| `New connection` but no `Device identified` | Malformed login packet — wrong codec/protocol setting. |
| `Device identified` + `records queued`, nothing on the map | IMEI has no `vehicles` row. Check `unknownImei` on `:3001/health`. |
| `CRC check failed` lines | Corrupt frames; check signal strength. These burn SIM data twice via retransmits. |

---

## Part 2 — Reporting profile (Data Acquisition)

Target: **~43 KB/day** (about 16% of the 273 KB/day budget, leaving headroom for reconnects
and overhead).

| Mode | Condition | Min period | Min angle | Min distance |
|---|---|---|---|---|
| Moving / driving | ignition on + movement | 30 s floor | ~15–30° | ~200–300 m |
| Idle | ignition on, stationary | 5–10 min | — | — |
| Parked / stopped | ignition off | 60 min | — | wake instantly on movement |

Angle and distance triggers fire *in addition to* the period floor, whichever comes first — that is
what keeps corners accurate without paying for straight-line reporting.

Confirm on this specific model that motion/ignition wake fires an immediate out-of-cycle record.
That is standard Teltonika behaviour but is the basis of theft detection here, so verify rather
than assume.

### Disable unused I/O elements

Every enabled AVL element is billed to the SIM on every record. `parser/avl-ids.ts` maps 40+ IDs,
but `normaliseRecord()` in `ingestion/processors/telemetry.ts` only promotes about 17 to real
columns — the rest land in the `extras` jsonb and are never read.

**Keep enabled** (these map to real columns and drive UI/alerts):

| ID | Name | Used for |
|---|---|---|
| 16 | totalOdometer | `odometer`, daily km |
| 21 | gsmSignal | diagnostics |
| 66 | externalVoltage | `externalVoltage` |
| 67 | batteryVoltage | `batteryVoltage` |
| 71 | ignition | `ignition`, trip detection, idle/parked mode |
| 72 | crashDetection | crash driver-event |
| 179 | digitalOutput1 | relay cut/restore state |
| 240 | movementSensor | `movement`, trip detection |
| 252 | unplug | tamper alert |
| 253 / 254 | greenDrivingType / Value | harsh braking/accel safety scoring |

**Disable** unless the vehicle actually has the OBD/CAN source wired: the entire OBD block
(IDs 30–65 — engine load, coolant, fuel trim, MAF, throttle, etc.). On a vehicle with no OBD
connection these transmit zeros on every single record.

Leave `iccid1`/`iccid2` (11/14) off for routine reporting — useful once to confirm which SIM is in
the device, then disabled.

---

## Record the actual parameter IDs

The README is explicit that exact numeric parameter IDs must be **read from the live Configurator,
not guessed from the wiki** (the wiki pages 403'd), and they vary by firmware. Fill this in during
the session — it becomes the versioned profile that feeds the Phase 3 remote-config channel
(`POST /internal/commands/{imei}` with `{"action":"configure","profile":"default-v1"}`).

| Setting | Configurator param ID | Value set |
|---|---|---|
| APN | | |
| Server domain | | `tcp.clarity-software.com.au` |
| Server port | | `5027` |
| Data protocol (TCP) | | |
| Min period — moving | | |
| Min angle — moving | | |
| Min distance — moving | | |
| Min period — idle | | |
| Min period — parked | | |
| Firmware version | | |
| Device model (confirm FTC921) | | |

---

## Open question — the SIM

The two numbers supplied (`894474400`, `007090012`) are 9 digits. An ICCID is 19–20 digits and
begins with `89`, so these are partial. Before the visit, get from the SIM portal:

- The **full ICCID** of the SIM physically in the device, and confirmation it is the international
  one rather than the Australian local SIM
- That **roaming in Australia** is active on that SIM
- The **APN** — the single value the device cannot work without
- The MSISDN, if the SIM has one (only needed for SMS configuration, which this on-site USB visit
  makes unnecessary)

Once the device is reporting, ID 11 / 14 (`iccid1`/`iccid2`) will show the ICCID in `extras`,
confirming which SIM is actually in use.
