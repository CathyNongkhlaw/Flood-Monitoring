import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Search, X } from 'lucide-react';
import type { BasinRegion, MonitoringStation } from '../types/monitoring';
import { classifyStationStatus, filterStations } from '../utils/floodLogic';
import {
  SectionPanel,
  StatusBadge,
  TableEmptyState,
} from '../components/ui/OperationalPrimitives';

interface MonitoringStationsPageProps {
  stations: MonitoringStation[];
  selectedRegion: BasinRegion;
  initialSelectedStationId?: string | null;
  onClearInitialStation?: () => void;
}

type FilterTab = 'All' | 'Online' | 'Offline' | 'Warning' | 'Critical';

export function MonitoringStationsPage({
  stations,
  selectedRegion,
  initialSelectedStationId,
  onClearInitialStation,
}: MonitoringStationsPageProps) {
  const [statusFilter, setStatusFilter] = useState<FilterTab>('All');
  const [search, setSearch] = useState('');
  const [showOptionalSensors, setShowOptionalSensors] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedStationId ?? null
  );

  // Sync if user jumped from Overview table
  React.useEffect(() => {
    if (initialSelectedStationId) {
      setSelectedId(initialSelectedStationId);
      onClearInitialStation?.();
    }
  }, [initialSelectedStationId, onClearInitialStation]);

  const filtered = useMemo(
    () =>
      filterStations(stations, {
        status: statusFilter,
        region: selectedRegion,
        search,
      }),
    [stations, statusFilter, selectedRegion, search]
  );

  const selectedStation = useMemo(
    () => stations.find((s) => s.id === selectedId) ?? null,
    [stations, selectedId]
  );

  // Determine whether any visible station carries optional temperature/humidity sensors
  const anyHasTemp = filtered.some((s) => s.temperatureC !== undefined);
  const anyHasHumidity = filtered.some((s) => s.humidityPct !== undefined);

  const filterCounts = useMemo(() => {
    const regionScoped =
      selectedRegion === 'All Basins'
        ? stations
        : stations.filter((s) => s.basin === selectedRegion);
    return {
      All: regionScoped.length,
      Online: regionScoped.filter((s) => s.isOnline).length,
      Offline: regionScoped.filter((s) => !s.isOnline).length,
      Warning: regionScoped.filter(
        (s) =>
          classifyStationStatus(
            s.waterLevelM,
            s.warningThresholdM,
            s.criticalThresholdM,
            s.isOnline
          ) === 'Warning'
      ).length,
      Critical: regionScoped.filter(
        (s) =>
          classifyStationStatus(
            s.waterLevelM,
            s.warningThresholdM,
            s.criticalThresholdM,
            s.isOnline
          ) === 'Critical'
      ).length,
    };
  }, [stations, selectedRegion]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-semibold text-[#163A5F] tracking-tight">
            Monitoring Stations (IoT Infrastructure)
          </h2>
          <p className="text-[12px] text-[#5C6670]">
            Operational status, environmental readings, and telemetry health across registered field nodes
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-[12px] text-[#334155] bg-white border border-[#E6E2DA] px-2.5 py-1.5 rounded-md cursor-pointer">
          <input
            type="checkbox"
            checked={showOptionalSensors}
            onChange={(e) => setShowOptionalSensors(e.target.checked)}
            className="accent-[#0D9488]"
          />
          <span>Show optional ambient probes (Temp / Humidity)</span>
        </label>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E6E2DA] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Station status filters">
          {(['All', 'Online', 'Offline', 'Warning', 'Critical'] as FilterTab[]).map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#163A5F] text-white border-[#163A5F]'
                    : 'bg-[#F4F2EE] text-[#334155] border-[#CBD5E1] hover:bg-[#EDF2F7]'
                }`}
              >
                {tab} ({filterCounts[tab]})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search station ID, name, ward..."
            aria-label="Search monitoring stations"
            className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md bg-white focus:outline-none focus:border-[#0D9488]"
          />
        </div>
      </div>

      {/* Main Split: Data Table + Station Details Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <SectionPanel
          title={`Registered Monitoring Stations (${filtered.length})`}
          subtitle="Select any station to inspect sensor capabilities, time-series history, and communication logs"
          className={selectedStation ? 'xl:col-span-7' : 'xl:col-span-12'}
        >
          {filtered.length === 0 ? (
            <TableEmptyState
              message="No monitoring stations match the selected status filter and search criteria."
              actionLabel="Reset Filters"
              onAction={() => {
                setStatusFilter('All');
                setSearch('');
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                    <th className="py-2 px-3">Station ID</th>
                    <th className="py-2 px-3">Station Name</th>
                    <th className="py-2 px-3">Geographic Location</th>
                    <th className="py-2 px-3">Device Status</th>
                    <th className="py-2 px-3 text-right">Water Level</th>
                    <th className="py-2 px-3 text-right">Rainfall</th>
                    {showOptionalSensors && anyHasTemp && (
                      <th className="py-2 px-3 text-right">Temp</th>
                    )}
                    {showOptionalSensors && anyHasHumidity && (
                      <th className="py-2 px-3 text-right">Humidity</th>
                    )}
                    <th className="py-2 px-3 text-right">Last Comm.</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DF]">
                  {filtered.map((station) => {
                    const status = classifyStationStatus(
                      station.waterLevelM,
                      station.warningThresholdM,
                      station.criticalThresholdM,
                      station.isOnline
                    );
                    const isSelected = selectedStation?.id === station.id;
                    return (
                      <tr
                        key={station.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F4F2EE]'
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-medium text-[#163A5F] whitespace-nowrap">
                          {station.id}
                        </td>
                        <td className="py-2 px-3 font-medium text-[#111827] whitespace-nowrap">
                          {station.name}
                        </td>
                        <td className="py-2 px-3 text-[#475569]">
                          <div>{station.location}</div>
                          <div className="text-[11px] text-[#64748B]">
                            {station.ward} · {station.basin}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <StatusBadge label={status} />
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-[#163A5F] whitespace-nowrap">
                          {station.waterLevelM.toFixed(2)} m
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {station.isOnline ? `${station.rainfallMmHr.toFixed(1)} mm/h` : '—'}
                        </td>
                        {showOptionalSensors && anyHasTemp && (
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-[#475569] whitespace-nowrap">
                            {station.temperatureC !== undefined ? `${station.temperatureC.toFixed(1)} °C` : 'N/A'}
                          </td>
                        )}
                        {showOptionalSensors && anyHasHumidity && (
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-[#475569] whitespace-nowrap">
                            {station.humidityPct !== undefined ? `${station.humidityPct}%` : 'N/A'}
                          </td>
                        )}
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-[11px] text-[#5C6670] whitespace-nowrap">
                          {station.lastCommunication.replace('2026-11-20 ', '')}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedId(station.id)}
                            aria-label={`Inspect station ${station.id}`}
                            className="px-2.5 py-1 text-[11px] font-medium text-[#0D9488] border border-[#0D9488] rounded-md hover:bg-[#0D9488] hover:text-white transition-colors"
                          >
                            {isSelected ? 'Inspecting' : 'Details'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionPanel>

        {/* Station Detailed View Panel */}
        {selectedStation && (
          <SectionPanel
            title={`${selectedStation.id} — ${selectedStation.name}`}
            subtitle={`${selectedStation.location} · ${selectedStation.ward} · ${selectedStation.basin}`}
            action={
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close station details panel"
                className="p-1 text-[#475569] hover:text-[#163A5F] hover:bg-[#EAE6DF] rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            }
            className="xl:col-span-5"
            bodyClassName="p-4 space-y-4"
          >
            {/* Identification & Health Summary Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] pb-3 border-b border-[#EAE6DF]">
              <div>
                <div className="text-[11px] text-[#64748B]">Operational Status</div>
                <div className="mt-0.5">
                  <StatusBadge
                    label={classifyStationStatus(
                      selectedStation.waterLevelM,
                      selectedStation.warningThresholdM,
                      selectedStation.criticalThresholdM,
                      selectedStation.isOnline
                    )}
                  />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748B]">Device Health</div>
                <div className="mt-0.5">
                  <StatusBadge label={selectedStation.deviceHealth} />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748B]">Coordinates</div>
                <div className="font-mono text-[#163A5F]">
                  {selectedStation.lat.toFixed(4)}° N, {selectedStation.lng.toFixed(4)}° E
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748B]">Connectivity / Signal</div>
                <div className="font-medium text-[#111827]">
                  {selectedStation.isOnline ? 'Connected' : 'Offline'} · {selectedStation.signalQuality}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748B]">Power Configuration</div>
                <div className="text-[#111827]">
                  {selectedStation.powerSource}
                  {selectedStation.batteryPct !== undefined && (
                    <span className="font-mono ml-1 text-[#163A5F]">
                      ({selectedStation.batteryPct}%)
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#64748B]">Installed Sensors</div>
                <div className="text-[#111827]">
                  {selectedStation.supportedSensors.join(', ')}
                </div>
              </div>
            </div>

            {/* Latest Readings (Modular: only renders supported sensors) */}
            <div>
              <h3 className="text-[12px] font-semibold text-[#163A5F] mb-2">
                Latest Sensor Measurements
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 border border-[#EAE6DF] divide-x divide-[#EAE6DF] rounded-md">
                <div className="p-2.5">
                  <div className="text-[10px] text-[#64748B]">Water Level</div>
                  <div className="text-[15px] font-mono font-semibold text-[#163A5F]">
                    {selectedStation.waterLevelM.toFixed(2)} m
                  </div>
                  <div className="text-[10px] font-mono text-[#64748B]">
                    Warn {selectedStation.warningThresholdM} m
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="text-[10px] text-[#64748B]">Rainfall</div>
                  <div className="text-[15px] font-mono font-semibold text-[#163A5F]">
                    {selectedStation.rainfallMmHr.toFixed(1)}
                  </div>
                  <div className="text-[10px] font-mono text-[#64748B]">mm/hr</div>
                </div>
                {selectedStation.temperatureC !== undefined && (
                  <div className="p-2.5">
                    <div className="text-[10px] text-[#64748B]">Temperature</div>
                    <div className="text-[15px] font-mono font-semibold text-[#163A5F]">
                      {selectedStation.temperatureC.toFixed(1)} °C
                    </div>
                    <div className="text-[10px] text-[#64748B]">Ambient probe</div>
                  </div>
                )}
                {selectedStation.humidityPct !== undefined && (
                  <div className="p-2.5">
                    <div className="text-[10px] text-[#64748B]">Humidity</div>
                    <div className="text-[15px] font-mono font-semibold text-[#163A5F]">
                      {selectedStation.humidityPct}%
                    </div>
                    <div className="text-[10px] text-[#64748B]">Relative</div>
                  </div>
                )}
              </div>
            </div>

            {/* Time-Series Chart */}
            <div>
              <h3 className="text-[12px] font-semibold text-[#163A5F] mb-2">
                Water-Level &amp; Rainfall History (Today)
              </h3>
              <div className="h-[190px] border border-[#EAE6DF] p-2 rounded-md">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={selectedStation.history}
                    margin={{ top: 8, right: 10, left: -14, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5C6670' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#5C6670' }} domain={[0, 4]} unit="m" />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '2px' }} />
                    <ReferenceLine
                      y={selectedStation.warningThresholdM}
                      stroke="#B45309"
                      strokeDasharray="4 4"
                    />
                    <ReferenceLine
                      y={selectedStation.criticalThresholdM}
                      stroke="#B91C1C"
                      strokeDasharray="3 3"
                    />
                    <Line
                      type="monotone"
                      dataKey="waterLevelM"
                      name="Water Level (m)"
                      stroke="#0D9488"
                      strokeWidth={2}
                      dot={{ r: 2.5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Communication History */}
            <div>
              <h3 className="text-[12px] font-semibold text-[#163A5F] mb-1.5">
                Recent Communication Log
              </h3>
              <table className="w-full text-left border-collapse text-[11px] border border-[#EAE6DF]">
                <thead>
                  <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[#475569]">
                    <th className="py-1.5 px-2.5">Time</th>
                    <th className="py-1.5 px-2.5">Event</th>
                    <th className="py-1.5 px-2.5">Status</th>
                    <th className="py-1.5 px-2.5 text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DF]">
                  {selectedStation.commLogs.map((log, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-2.5 font-mono text-[#5C6670] whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-1.5 px-2.5 text-[#1F2937]">{log.event}</td>
                      <td className="py-1.5 px-2.5">
                        <StatusBadge label={log.status} showIcon={false} />
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-[#5C6670]">
                        {log.latencyMs !== undefined ? `${log.latencyMs} ms` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionPanel>
        )}
      </div>
    </div>
  );
}
