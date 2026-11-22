import React, { useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import type {
  BasinRegion,
  DrainageDetection,
  MonitoringStation,
  OperationalAlert,
  UserRole,
} from '../types/monitoring';
import {
  canPerformAction,
  classifyStationStatus,
  generateCsvExport,
} from '../utils/floodLogic';
import {
  PermissionNotice,
  SectionPanel,
} from '../components/ui/OperationalPrimitives';

type ReportCategory =
  | 'Daily Monitoring Summary'
  | 'Weekly Flood Monitoring Report'
  | 'Monthly Environmental Report'
  | 'Station Availability Report'
  | 'Drainage Inspection Report'
  | 'Incident & Resolution Report';

const REPORT_CATEGORIES: ReportCategory[] = [
  'Daily Monitoring Summary',
  'Weekly Flood Monitoring Report',
  'Monthly Environmental Report',
  'Station Availability Report',
  'Drainage Inspection Report',
  'Incident & Resolution Report',
];

interface ReportsPageProps {
  stations: MonitoringStation[];
  alerts: OperationalAlert[];
  detections: DrainageDetection[];
  selectedRegion: BasinRegion;
  activeRole: UserRole;
  onLogAudit: (action: string, target: string) => void;
}

export function ReportsPage({
  stations,
  alerts,
  detections,
  selectedRegion,
  activeRole,
  onLogAudit,
}: ReportsPageProps) {
  const [category, setCategory] = useState<ReportCategory>('Daily Monitoring Summary');
  const [fromDate, setFromDate] = useState('2026-11-14');
  const [toDate, setToDate] = useState('2026-11-20');
  const [generatedAt, setGeneratedAt] = useState<string>('2026-11-20 19:58 IST');
  const [exportNote, setExportNote] = useState<string | null>(null);

  const canExport = canPerformAction(activeRole, 'export_reports');

  const scopedStations = useMemo(
    () =>
      selectedRegion === 'All Basins'
        ? stations
        : stations.filter((s) => s.basin === selectedRegion),
    [stations, selectedRegion]
  );

  const scopedDetections = useMemo(
    () =>
      selectedRegion === 'All Basins'
        ? detections
        : detections.filter((d) => d.basin === selectedRegion),
    [detections, selectedRegion]
  );

  const scopedAlerts = useMemo(
    () =>
      selectedRegion === 'All Basins'
        ? alerts
        : alerts.filter((a) => a.basin === selectedRegion),
    [alerts, selectedRegion]
  );

  const reportTable = useMemo<{ headers: string[]; rows: Array<Array<string | number>> }>(() => {
    if (category === 'Drainage Inspection Report') {
      return {
        headers: [
          'Detection ID',
          'Camera ID',
          'Location',
          'Severity',
          'Occlusion (%)',
          'Assigned Team',
          'Status',
          'Timestamp',
        ],
        rows: scopedDetections.map((d) => [
          d.id,
          d.cameraId,
          d.location,
          d.severity,
          d.blockageEstimatePct,
          d.assignedTeam,
          d.status,
          d.timestamp,
        ]),
      };
    }

    if (category === 'Incident & Resolution Report') {
      return {
        headers: [
          'Alert ID',
          'Category',
          'Location',
          'Severity',
          'Assigned Department',
          'Status',
          'Triggered At',
          'Resolved At',
        ],
        rows: scopedAlerts.map((a) => [
          a.id,
          a.category,
          a.location,
          a.severity,
          a.assignedDepartment,
          a.status,
          a.triggeredAt,
          a.resolvedAt ?? 'Open',
        ]),
      };
    }

    if (category === 'Station Availability Report') {
      return {
        headers: [
          'Station ID',
          'Station Name',
          'Basin',
          'Connectivity',
          'Signal',
          'Device Health',
          'Power Source',
          'Last Communication',
        ],
        rows: scopedStations.map((s) => [
          s.id,
          s.name,
          s.basin,
          s.isOnline ? 'Online' : 'Offline',
          s.signalQuality,
          s.deviceHealth,
          s.powerSource,
          s.lastCommunication,
        ]),
      };
    }

    // Default hydrological monitoring summary tables
    return {
      headers: [
        'Station ID',
        'Station Name',
        'Basin',
        'Water Level (m)',
        'Warning Mark (m)',
        'Rainfall (mm/hr)',
        'Status',
        'Last Updated',
      ],
      rows: scopedStations.map((s) => [
        s.id,
        s.name,
        s.basin,
        s.waterLevelM.toFixed(2),
        s.warningThresholdM.toFixed(2),
        s.rainfallMmHr.toFixed(1),
        classifyStationStatus(s.waterLevelM, s.warningThresholdM, s.criticalThresholdM, s.isOnline),
        s.lastCommunication,
      ]),
    };
  }, [category, scopedStations, scopedDetections, scopedAlerts]);

  const handleGenerate = () => {
    const stamp = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    setGeneratedAt(`2026-11-20 ${stamp} IST`);
    setExportNote(`Report "${category}" compiled for ${fromDate} to ${toDate}.`);
    onLogAudit(`Compiled ${category}`, `${selectedRegion} (${fromDate} to ${toDate})`);
  };

  const handleExportCsv = () => {
    if (!canExport) return;
    const csv = generateCsvExport(reportTable.headers, reportTable.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `${slug}-${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportNote(`Exported ${slug}-${toDate}.csv (${reportTable.rows.length} rows).`);
    onLogAudit(`Exported ${category} (CSV)`, `${slug}-${toDate}.csv`);
  };

  const handleDownloadPdf = () => {
    if (!canExport) return;
    onLogAudit(`Opened print/PDF export for ${category}`, `${selectedRegion}`);
    setExportNote('Print / Save-as-PDF dialog triggered for the formal municipal report sheet.');
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h2 className="text-[18px] font-semibold text-[#163A5F] tracking-tight">
          Municipal Operations Reports
        </h2>
        <p className="text-[12px] text-[#5C6670]">
          Compile standardized hydrology, infrastructure availability, drainage inspection, and incident resolution reports
        </p>
      </div>

      {/* Report Configuration Form */}
      <SectionPanel
        title="Report Parameters"
        subtitle="Select report category and date window to generate a printable municipal record or CSV dataset"
        className="no-print"
        bodyClassName="p-4 space-y-3"
      >
        {!canExport && (
          <PermissionNotice
            message={`Current role (${activeRole}) cannot download CSV/PDF exports. Contact an Administrator or Monitoring Operator.`}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label htmlFor="rpt-category" className="block text-[11px] font-semibold text-[#334155] mb-1">
              Report Category
            </label>
            <select
              id="rpt-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory)}
              className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md bg-white"
            >
              {REPORT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rpt-from" className="block text-[11px] font-semibold text-[#334155] mb-1">
              From Date
            </label>
            <input
              id="rpt-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md bg-white"
            />
          </div>

          <div>
            <label htmlFor="rpt-to" className="block text-[11px] font-semibold text-[#334155] mb-1">
              To Date
            </label>
            <input
              id="rpt-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EAE6DF]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              Generate Report
            </button>
            <button
              type="button"
              disabled={!canExport}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#163A5F] bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] disabled:opacity-50 rounded-md"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              Download PDF / Print
            </button>
            <button
              type="button"
              disabled={!canExport}
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#163A5F] bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] disabled:opacity-50 rounded-md"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>
          {exportNote && (
            <span role="status" className="text-[12px] text-[#15803D] font-medium">
              {exportNote}
            </span>
          )}
        </div>
      </SectionPanel>

      {/* Formal Compiled Report Sheet Preview */}
      <SectionPanel
        title={`Compiled Preview — ${category}`}
        subtitle={`Region: ${selectedRegion} · Period: ${fromDate} to ${toDate} · Compiled: ${generatedAt}`}
        bodyClassName="p-5 space-y-4"
      >
        <div className="border-b-2 border-[#163A5F] pb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold text-[#5C6670] uppercase tracking-wider">
              Urban Flood &amp; Drainage Monitoring System · Municipal Operations Portal
            </div>
            <h3 className="text-[16px] font-bold text-[#163A5F] mt-0.5">{category}</h3>
            <div className="text-[12px] text-[#475569]">
              Monitoring Region: {selectedRegion} (Assam Regional Authority — Demonstration Dataset)
            </div>
          </div>
          <div className="text-right text-[11px] font-mono text-[#475569]">
            <div>Reporting Window: {fromDate} to {toDate}</div>
            <div>Generated: {generatedAt}</div>
            <div>Records Included: {reportTable.rows.length}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px] border border-[#CBD5E1]">
            <thead>
              <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] text-[11px] font-semibold text-[#163A5F]">
                {reportTable.headers.map((header) => (
                  <th key={header} className="py-2 px-3 border-r border-[#EAE6DF] last:border-r-0">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {reportTable.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#F4F2EE]">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-2 px-3 border-r border-[#EAE6DF] last:border-r-0 ${
                        cIdx === 0 || typeof cell === 'number'
                          ? 'font-mono tabular-nums'
                          : ''
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
}
