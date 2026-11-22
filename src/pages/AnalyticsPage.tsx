import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AlertCategory,
  BasinRegion,
  DrainageDetection,
  MonitoringStation,
  OperationalAlert,
} from '../types/monitoring';
import { HISTORICAL_ANALYTICS_MONTHLY } from '../data/demoData';
import {
  MetricStripItem,
  SectionPanel,
} from '../components/ui/OperationalPrimitives';

interface AnalyticsPageProps {
  stations: MonitoringStation[];
  alerts: OperationalAlert[];
  detections: DrainageDetection[];
  selectedRegion: BasinRegion;
}

export function AnalyticsPage({
  stations,
  alerts,
  detections,
  selectedRegion,
}: AnalyticsPageProps) {
  const [dateRange, setDateRange] = useState<'6m' | '3m' | '30d'>('6m');
  const [stationFilter, setStationFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'All' | AlertCategory>('All');

  const scopedStations = useMemo(
    () =>
      selectedRegion === 'All Basins'
        ? stations
        : stations.filter((s) => s.basin === selectedRegion),
    [stations, selectedRegion]
  );

  const monthlySeries = useMemo(() => {
    const sliceCount = dateRange === '30d' ? 2 : dateRange === '3m' ? 3 : 6;
    const base = HISTORICAL_ANALYTICS_MONTHLY.slice(-sliceCount);
    const stationFactor =
      stationFilter === 'ALL'
        ? 1
        : 0.85 +
          ((stations.find((s) => s.id === stationFilter)?.waterLevelM ?? 2.2) / 2.5) * 0.25;
    return base.map((item) => ({
      ...item,
      avgWaterLevelM: Number((item.avgWaterLevelM * stationFactor).toFixed(2)),
    }));
  }, [dateRange, stationFilter, stations]);

  const floodRiskDistribution = useMemo(() => {
    const scoped =
      selectedRegion === 'All Basins'
        ? alerts
        : alerts.filter((a) => a.basin === selectedRegion);
    const catScoped =
      categoryFilter === 'All'
        ? scoped
        : scoped.filter((a) => a.category === categoryFilter);
    return [
      { level: 'Critical', count: catScoped.filter((a) => a.severity === 'Critical').length },
      { level: 'Warning', count: catScoped.filter((a) => a.severity === 'Warning').length },
      { level: 'Low', count: catScoped.filter((a) => a.severity === 'Low').length },
    ];
  }, [alerts, selectedRegion, categoryFilter]);

  const summaryStats = useMemo(() => {
    const avgUptime =
      monthlySeries.reduce((s, m) => s + m.uptimePct, 0) / monthlySeries.length;
    const totalRain = monthlySeries.reduce((s, m) => s + m.rainfallMm, 0);
    const totalBlockages = monthlySeries.reduce((s, m) => s + m.blockages, 0);
    const avgResolutionHr =
      monthlySeries.reduce((s, m) => s + m.resolvedHours, 0) / monthlySeries.length;
    const onlinePct =
      scopedStations.length > 0
        ? (scopedStations.filter((s) => s.isOnline).length / scopedStations.length) * 100
        : 0;
    return {
      avgUptime: avgUptime.toFixed(1),
      totalRain,
      totalBlockages,
      avgResolutionHr: avgResolutionHr.toFixed(1),
      onlinePct: onlinePct.toFixed(1),
      resolvedDetections: detections.filter((d) => d.status === 'Resolved').length,
      totalDetections: detections.length,
    };
  }, [monthlySeries, scopedStations, detections]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] font-semibold text-[#163A5F] tracking-tight">
          Historical Environmental &amp; Infrastructure Analytics
        </h2>
        <p className="text-[12px] text-[#5C6670]">
          Longitudinal hydrology performance, rainfall accumulation, drainage blockage recurrence, device uptime, and resolution turnaround
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E6E2DA] rounded-lg p-3 flex flex-wrap items-center gap-4 text-[12px]">
        <div className="flex items-center gap-1.5">
          <label htmlFor="an-range" className="text-[11px] font-semibold text-[#475569]">
            Date Range:
          </label>
          <select
            id="an-range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '6m' | '3m' | '30d')}
            className="border border-[#CBD5E1] rounded-md px-2 py-1 bg-white"
          >
            <option value="6m">Last 6 Months (Jun – Nov 2026)</option>
            <option value="3m">Last 3 Months (Sep – Nov 2026)</option>
            <option value="30d">Recent Period (Oct – Nov 2026)</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="an-station" className="text-[11px] font-semibold text-[#475569]">
            Monitoring Station:
          </label>
          <select
            id="an-station"
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="border border-[#CBD5E1] rounded-md px-2 py-1 bg-white"
          >
            <option value="ALL">All Stations in Scope ({scopedStations.length})</option>
            {scopedStations.map((st) => (
              <option key={st.id} value={st.id}>
                {st.id} — {st.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="an-cat" className="text-[11px] font-semibold text-[#475569]">
            Incident Category:
          </label>
          <select
            id="an-cat"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'All' | AlertCategory)}
            className="border border-[#CBD5E1] rounded-md px-2 py-1 bg-white"
          >
            <option value="All">All Categories</option>
            <option value="Flood Warning">Flood Warning</option>
            <option value="Critical Water Level">Critical Water Level</option>
            <option value="Heavy Rainfall">Heavy Rainfall</option>
            <option value="Drainage Blockage">Drainage Blockage</option>
            <option value="Device Offline">Device Offline</option>
          </select>
        </div>
      </div>

      {/* Statistical Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 border border-[#E6E2DA] rounded-lg divide-y md:divide-y-0 md:divide-x divide-[#EAE6DF] bg-white">
        <MetricStripItem
          label="Cumulative Rainfall"
          value={summaryStats.totalRain}
          unit="mm"
          subtext="Selected reporting period"
        />
        <MetricStripItem
          label="Drainage Blockages"
          value={summaryStats.totalBlockages}
          subtext="CV-verified occurrences"
          tone="warning"
        />
        <MetricStripItem
          label="Mean Device Uptime"
          value={summaryStats.avgUptime}
          unit="%"
          subtext="Telemetry availability"
          tone="normal"
        />
        <MetricStripItem
          label="Current Availability"
          value={summaryStats.onlinePct}
          unit="%"
          subtext={`${scopedStations.filter((s) => s.isOnline).length}/${scopedStations.length} stations`}
        />
        <MetricStripItem
          label="Mean Resolution Time"
          value={summaryStats.avgResolutionHr}
          unit="hrs"
          subtext="Alert to field closure"
        />
      </div>

      {/* Charts Grid (2x2 clean analytical views) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionPanel
          title="Historical Water-Level Trend"
          subtitle="Monthly mean gauge water level (m)"
          bodyClassName="p-4 h-[250px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlySeries} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} domain={[0, 3.5]} unit="m" />
              <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '2px' }} />
              <Line
                type="monotone"
                dataKey="avgWaterLevelM"
                name="Mean Water Level (m)"
                stroke="#163A5F"
                strokeWidth={2}
                dot={{ r: 3.5, fill: '#163A5F' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </SectionPanel>

        <SectionPanel
          title="Rainfall Accumulation Analysis"
          subtitle="Total monthly catchment rainfall (mm)"
          bodyClassName="p-4 h-[250px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySeries} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="mm" />
              <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '2px' }} />
              <Bar
                dataKey="rainfallMm"
                name="Total Rainfall (mm)"
                fill="#0D9488"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </SectionPanel>

        <SectionPanel
          title="Drainage Blockage Frequency"
          subtitle="Monthly solid-waste obstructions detected by CV inspection cameras"
          bodyClassName="p-4 h-[240px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySeries} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '2px' }} />
              <Bar
                dataKey="blockages"
                name="Blockage Incidents"
                fill="#B45309"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </SectionPanel>

        <SectionPanel
          title="Incident Severity Distribution &amp; Resolution Statistics"
          subtitle="Breakdown of logged incidents for active region & category filter"
          bodyClassName="p-4 space-y-4"
        >
          <div className="h-[155px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={floodRiskDistribution}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis type="category" dataKey="level" tick={{ fontSize: 11, fill: '#163A5F' }} width={70} />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '2px' }} />
                <Bar dataKey="count" name="Incident Count" fill="#163A5F" barSize={20} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EAE6DF] text-[11px]">
            <div>
              <div className="text-[#64748B]">CV Queue Resolved</div>
              <div className="font-mono font-semibold text-[#163A5F] text-[13px]">
                {summaryStats.resolvedDetections} / {summaryStats.totalDetections}
              </div>
            </div>
            <div>
              <div className="text-[#64748B]">Avg Resolution SLA</div>
              <div className="font-mono font-semibold text-[#163A5F] text-[13px]">
                {summaryStats.avgResolutionHr} hrs
              </div>
            </div>
            <div>
              <div className="text-[#64748B]">Station Uptime Avg</div>
              <div className="font-mono font-semibold text-[#15803D] text-[13px]">
                {summaryStats.avgUptime}%
              </div>
            </div>
          </div>
        </SectionPanel>
      </div>

      {/* Station Availability & Uptime Table */}
      <SectionPanel
        title="Monthly Infrastructure &amp; Resolution Performance Ledger"
        subtitle="Tabular summary of water level, rainfall, blockage counts, telemetry uptime, and resolution turnaround"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                <th className="py-2 px-3">Month (2026)</th>
                <th className="py-2 px-3 text-right">Mean Water Level</th>
                <th className="py-2 px-3 text-right">Total Rainfall</th>
                <th className="py-2 px-3 text-right">Blockages Detected</th>
                <th className="py-2 px-3 text-right">Device Uptime</th>
                <th className="py-2 px-3 text-right">Mean Resolution Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {monthlySeries.map((row) => (
                <tr key={row.month} className="hover:bg-[#F4F2EE]">
                  <td className="py-2 px-3 font-medium text-[#163A5F]">{row.month} 2026</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {row.avgWaterLevelM.toFixed(2)} m
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {row.rainfallMm} mm
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{row.blockages}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-[#15803D]">
                    {row.uptimePct.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {row.resolvedHours.toFixed(1)} hrs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
}
