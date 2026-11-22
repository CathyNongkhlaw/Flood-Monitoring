import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Camera,
  Map,
  Radio,
  ShieldAlert,
  Waves,
  WifiOff,
  Wrench,
} from 'lucide-react';
import type {
  BasinFloodPrediction,
  BasinRegion,
  DrainageCamera,
  DrainageDetection,
  MonitoringStation,
  NavigationPage,
  OperationalAlert,
} from '../types/monitoring';
import { classifyStationStatus, computeOverviewMetrics } from '../utils/floodLogic';
import {
  MetricStripItem,
  SectionPanel,
  StatusBadge,
} from '../components/ui/OperationalPrimitives';
import { GisMapCanvas } from '../components/map/GisMapCanvas';

interface SituationOverviewPageProps {
  stations: MonitoringStation[];
  cameras: DrainageCamera[];
  detections: DrainageDetection[];
  alerts: OperationalAlert[];
  predictions: BasinFloodPrediction[];
  selectedRegion: BasinRegion;
  onNavigate: (page: NavigationPage) => void;
  onInspectStation: (stationId: string) => void;
}

export function SituationOverviewPage({
  stations,
  cameras,
  detections,
  alerts,
  predictions,
  selectedRegion,
  onNavigate,
  onInspectStation,
}: SituationOverviewPageProps) {
  const metrics = useMemo(
    () =>
      computeOverviewMetrics(
        stations,
        alerts,
        detections,
        cameras,
        selectedRegion
      ),
    [stations, alerts, detections, cameras, selectedRegion]
  );

  const scopedStations = useMemo(
    () =>
      selectedRegion === 'All Basins'
        ? stations
        : stations.filter((s) => s.basin === selectedRegion),
    [stations, selectedRegion]
  );

  const allActiveAlerts = useMemo(
    () =>
      alerts.filter(
        (a) =>
          a.status !== 'Resolved' &&
          (selectedRegion === 'All Basins' || a.basin === selectedRegion)
      ),
    [alerts, selectedRegion]
  );

 type AlertTab = 'all' | 'water' | 'drainage' | 'flood';
  const [alertTab, setAlertTab] = useState<AlertTab>('all');

  const getAlertGroup = (category: string): Exclude<AlertTab, 'all'> => {
    const lower = category.toLowerCase();
    if (lower.includes('water')) return 'water';
    if (lower.includes('drainage') || lower.includes('blockage')) return 'drainage';
    return 'flood'; // Flood Warning, Heavy Rainfall, etc.
  };

  const alertCounts = useMemo(() => {
    const counts = { all: allActiveAlerts.length, water: 0, drainage: 0, flood: 0 };
    for (const alert of allActiveAlerts) {
      counts[getAlertGroup(alert.category)] += 1;
    }
    return counts;
  }, [allActiveAlerts]);

  const activeAlerts = useMemo(() => {
    const filtered =
      alertTab === 'all'
        ? allActiveAlerts
        : allActiveAlerts.filter((a) => getAlertGroup(a.category) === alertTab);
    return filtered.slice(0, 6);
  }, [allActiveAlerts, alertTab]);

  // Aggregated telemetry trend across reporting stations in selected region
  const trendData = useMemo(() => {
    const reporting = scopedStations.filter((s) => s.isOnline && s.history.length > 0);
    if (reporting.length === 0) return [];
    const timeLabels = reporting[0].history.map((h) => h.label);
    return timeLabels.map((label, idx) => {
      const avgLevel =
        reporting.reduce((acc, st) => acc + (st.history[idx]?.waterLevelM ?? st.waterLevelM), 0) /
        reporting.length;
      const avgRain =
        reporting.reduce((acc, st) => acc + (st.history[idx]?.rainfallMmHr ?? 0), 0) /
        reporting.length;
      return {
        label,
        avgLevel: Number(avgLevel.toFixed(2)),
        avgRain: Number(avgRain.toFixed(1)),
      };
    });
  }, [scopedStations]);

  const floodRiskHistory = useMemo(() => {
    const targetPred =
      selectedRegion === 'All Basins'
        ? predictions[0]
        : predictions.find((p) => p.basin === selectedRegion) ?? predictions[0];
    return targetPred.series.map((pt) => ({
      timeLabel: pt.timeLabel.replace(' (Now)', ''),
      riskScore: pt.riskScore,
    }));
  }, [predictions, selectedRegion]);

  return (
    <div className="space-y-4">
      {/* Page Title Bar */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div>
          <h2 className="text-[22px] font-bold text-[#163A5F] tracking-tight leading-tight">
            Situation Overview
          </h2>
          <p className="text-[12.5px] text-[#5C6670] mt-0.5">
            Live operational command summary for{' '}
            <span className="font-medium text-[#163A5F]">
              {selectedRegion === 'All Basins' ? 'all Kamrup Metro basins' : selectedRegion}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('gis')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold text-[#163A5F] bg-white border border-[#E6E2DA] rounded-md shadow-2xs hover:bg-[#F4F2EE] transition-colors whitespace-nowrap"
          >
            Open Full GIS Map
          </button>
          <button
            type="button"
            onClick={() => onNavigate('alerts')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md shadow-2xs transition-colors whitespace-nowrap"
          >
            <Bell className="w-3.5 h-3.5" />
            Manage Active Alerts ({allActiveAlerts.length})
          </button>
        </div>
      </div>

      {/* A. Summary Information — Clean 2x4 Operational Stat Cards */}
      <div
        aria-label="Operational summary indicators"
        className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2"
      >
        <MetricStripItem
          variant="card"
          label="Registered Stations"
          value={metrics.totalStations}
          subtext="IoT Telemetry Nodes"
          icon={<Radio className="w-4 h-4" />}
        />
        <MetricStripItem
          variant="card"
          label="Stations Reporting"
          value={metrics.reportingStations}
          subtext={`${metrics.totalStations > 0 ? Math.round((metrics.reportingStations / metrics.totalStations) * 100) : 0}% online`}
          tone="normal"
          icon={<Activity className="w-4 h-4" />}
        />
        <MetricStripItem
          variant="card"
          label="Offline Stations"
          value={metrics.offlineStations}
          subtext={metrics.offlineStations > 0 ? 'Requires field check' : 'All reporting'}
          tone={metrics.offlineStations > 0 ? 'muted' : 'normal'}
          icon={<WifiOff className="w-4 h-4" />}
        />
        <MetricStripItem
          variant="card"
          label="Avg Water Level"
          value={metrics.averageWaterLevelM.toFixed(2)}
          unit="m"
          subtext="Across reporting stations"
          icon={<Waves className="w-4 h-4" />}
        />
        <MetricStripItem
          variant="card"
          label="Exceeding Warning"
          value={metrics.exceedingWarningCount}
          subtext="Above warning mark"
          tone={metrics.exceedingWarningCount > 0 ? 'warning' : 'normal'}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <MetricStripItem
          variant="card"
          label="Active Flood Warnings"
          value={metrics.activeFloodWarnings}
          subtext="Unresolved critical alerts"
          tone={metrics.activeFloodWarnings > 0 ? 'critical' : 'normal'}
          icon={<ShieldAlert className="w-4 h-4" />}
        />
        <MetricStripItem
          variant="card"
          label="Open Drainage Incidents"
          value={metrics.openDrainageIncidents}
          subtext="CV blockage queue"
          tone={metrics.openDrainageIncidents > 0 ? 'warning' : 'normal'}
          icon={<Wrench className="w-4 h-4" />}
        />
        <MetricStripItem
          variant="card"
          label="Registered Cameras"
          value={metrics.totalCameras}
          subtext={`${metrics.onlineCameras} active capture`}
          icon={<Camera className="w-4 h-4" />}
        />
      </div>

      {/* B. Live Monitoring Map + E. Active Alerts Side-by-Side */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <SectionPanel
          title="Live Operational GIS Map"
          subtitle="OpenStreetMap cartography with municipal waterways, flood-risk zones, IoT gauges, drainage cameras, and blockage detections"
          action={
            <button
              type="button"
              onClick={() => onNavigate('gis')}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0D9488] hover:underline whitespace-nowrap"
            >
              Expand GIS View
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          }
          className="xl:col-span-8"
        >
          <GisMapCanvas
            stations={stations}
            cameras={cameras}
            detections={detections}
            alerts={alerts}
            selectedRegion={selectedRegion}
            heightClass="h-[430px]"
          />
        </SectionPanel>

       {/* E. Active Operational Alerts */}
        <SectionPanel
          title="Active Operational Alerts"
          subtitle="Unresolved hydrology, rainfall, drainage, and telemetry advisories"
          action={
            <button
              type="button"
              onClick={() => onNavigate('alerts')}
              className="text-[11px] font-medium text-[#0D9488] hover:underline whitespace-nowrap"
            >
              View All
            </button>
          }
          className="xl:col-span-4"
          bodyClassName="flex-1 flex flex-col overflow-hidden"
        >
          {/* Category Filter Tabs */}
          <div className="px-3 py-2 bg-[#F4F2EE] border-b border-[#E6E2DA] flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'water', label: 'Water Level' },
                { id: 'drainage', label: 'Drainage' },
                { id: 'flood', label: 'Flood' },
              ] as const
            ).map((tab) => {
              const isSelected = alertTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAlertTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#FFFFFF] text-[#0F766E] shadow-xs ring-1 ring-[#E6E2DA]'
                      : 'text-[#5C6670] hover:text-[#163A5F] hover:bg-white/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-[#F0FDFA] text-[#0D9488]'
                        : 'bg-[#E6E2DA]/70 text-[#5C6670]'
                    }`}
                  >
                    {alertCounts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtered Alert List */}
          <div className="flex-1 divide-y divide-[#EAE6DF] overflow-y-auto max-h-[465px]">
            {activeAlerts.length === 0 ? (
              <div className="p-6 text-center text-[12px] text-[#5C6670]">
                No active {alertTab === 'all' ? 'operational' : alertTab} alerts for the selected basin.
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="px-3.5 py-2.5 hover:bg-[#FAF9F6] transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-medium text-[#163A5F]">
                      {alert.id} · {alert.category}
                    </span>
                    <StatusBadge label={alert.severity} />
                  </div>
                  <p className="text-[12px] font-medium text-[#1C242B] leading-snug">
                    {alert.title}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5C6670]">
                    <span className="truncate max-w-[200px]">{alert.location}</span>
                    <span className="font-mono tabular-nums">
                      {alert.triggeredAt.replace('2026-11-20 ', '')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5 text-[11px]">
                    <span className="text-[#5C6670] truncate">{alert.assignedDepartment}</span>
                    <StatusBadge label={alert.status} showIcon={false} />
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionPanel>
      </div>

      {/* C. Flood Status Table & D. Recent Sensor Observations */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <SectionPanel
          title="Flood Status by Monitoring Station"
          subtitle="Measured water level against operational warning threshold"
          action={
            <button
              type="button"
              onClick={() => onNavigate('stations')}
              className="text-[11px] font-medium text-[#0D9488] hover:underline whitespace-nowrap"
            >
              Station Registry
            </button>
          }
          className="xl:col-span-7"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                  <th className="py-2 px-3">Station ID</th>
                  <th className="py-2 px-3">Location</th>
                  <th className="py-2 px-3 text-right">Water Level</th>
                  <th className="py-2 px-3 text-right">Warning Threshold</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF]">
                {scopedStations.map((station) => {
                  const status = classifyStationStatus(
                    station.waterLevelM,
                    station.warningThresholdM,
                    station.criticalThresholdM,
                    station.isOnline
                  );
                  return (
                    <tr
                      key={station.id}
                      className="hover:bg-[#F4F2EE] transition-colors"
                    >
                      <td className="py-2 px-3 font-mono font-medium text-[#163A5F] whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onInspectStation(station.id)}
                          className="text-[#0D9488] hover:underline font-mono"
                        >
                          {station.id}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-[#1F2937]">
                        <div className="font-medium leading-tight">{station.name}</div>
                        <div className="text-[11px] text-[#64748B]">{station.location}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-[#163A5F] whitespace-nowrap">
                        {station.waterLevelM.toFixed(2)} m
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-[#5C6670] whitespace-nowrap">
                        {station.warningThresholdM.toFixed(2)} m
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <StatusBadge label={status} />
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-[11px] text-[#5C6670] whitespace-nowrap">
                        {station.lastCommunication.replace('2026-11-20 ', '')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionPanel>

        {/* D. Recent Sensor Observations */}
        <SectionPanel
          title="Recent Sensor Observations"
          subtitle="Latest telemetry packets ingested from registered IoT stations"
          className="xl:col-span-5"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Station ID</th>
                  <th className="py-2 px-3 text-right">Level</th>
                  <th className="py-2 px-3 text-right">Rainfall</th>
                  <th className="py-2 px-3 text-right">Change</th>
                  <th className="py-2 px-3">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF]">
                {scopedStations.slice(0, 8).map((station) => (
                  <tr key={station.id} className="hover:bg-[#F4F2EE]">
                    <td className="py-2 px-3 font-mono tabular-nums text-[11px] text-[#5C6670] whitespace-nowrap">
                      {station.lastCommunication.replace('2026-11-20 ', '')}
                    </td>
                    <td className="py-2 px-3 font-mono font-medium text-[#163A5F] whitespace-nowrap">
                      {station.id}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {station.waterLevelM.toFixed(2)} m
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {station.isOnline ? `${station.rainfallMmHr.toFixed(1)} mm/h` : '—'}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap ${
                        station.waterLevelDeltaM >= 0.15
                          ? 'text-[#B91C1C] font-medium'
                          : station.waterLevelDeltaM > 0
                            ? 'text-[#B45309]'
                            : 'text-[#64748B]'
                      }`}
                    >
                      {station.isOnline
                        ? `${station.waterLevelDeltaM >= 0 ? '+' : ''}${station.waterLevelDeltaM.toFixed(2)} m`
                        : '—'}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusBadge
                        label={station.isOnline ? 'Online' : 'Offline'}
                        showIcon={false}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      </div>

      {/* F. Monitoring Charts (3 restrained, operational charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionPanel
          title="Water-Level Trend (Today)"
          subtitle="Mean observed water level across reporting stations (m)"
          bodyClassName="p-3 h-[220px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5C6670' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5C6670' }} domain={[0, 4]} unit="m" />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '2px',
                  border: '1px solid #CBD5E1',
                }}
              />
              <ReferenceLine y={2.5} stroke="#B45309" strokeDasharray="4 4" label={{ value: 'Warn', position: 'insideTopRight', fontSize: 10, fill: '#B45309' }} />
              <Line
                type="monotone"
                dataKey="avgLevel"
                name="Mean Water Level (m)"
                stroke="#0D9488"
                strokeWidth={2}
                dot={{ r: 3, fill: '#0D9488' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </SectionPanel>

        <SectionPanel
          title="Rainfall Trend (Today)"
          subtitle="Mean catchment rainfall intensity (mm/hr)"
          bodyClassName="p-3 h-[220px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5C6670' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5C6670' }} unit="mm" />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '2px',
                  border: '1px solid #CBD5E1',
                }}
              />
              <Bar
                dataKey="avgRain"
                name="Rainfall (mm/hr)"
                fill="#14B8A6"
                radius={[1, 1, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </SectionPanel>

        <SectionPanel
          title="Flood-Risk Index History"
          subtitle="Composite ML risk trajectory (0–100 scale)"
          bodyClassName="p-3 h-[220px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={floodRiskHistory} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
              <XAxis dataKey="timeLabel" tick={{ fontSize: 11, fill: '#5C6670' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5C6670' }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  fontSize: '12px',
                  borderRadius: '2px',
                  border: '1px solid #CBD5E1',
                }}
              />
              <ReferenceLine y={80} stroke="#B91C1C" strokeDasharray="4 4" label={{ value: 'Critical', position: 'insideTopRight', fontSize: 10, fill: '#B91C1C' }} />
              <Area
                type="monotone"
                dataKey="riskScore"
                name="Flood Risk Index"
                stroke="#B45309"
                fill="#FEF3C7"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </SectionPanel>
      </div>
    </div>
  );
}
