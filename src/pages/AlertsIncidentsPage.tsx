import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type {
  AlertCategory,
  AlertSeverity,
  BasinRegion,
  IncidentStatus,
  OperationalAlert,
  UserRole,
} from '../types/monitoring';
import { FIELD_TEAMS } from '../data/demoData';
import { canPerformAction, filterAlerts } from '../utils/floodLogic';
import {
  PermissionNotice,
  SectionPanel,
  StatusBadge,
  TableEmptyState,
} from '../components/ui/OperationalPrimitives';

interface AlertsIncidentsPageProps {
  alerts: OperationalAlert[];
  selectedRegion: BasinRegion;
  activeRole: UserRole;
  onUpdateAlert: (
    id: string,
    patch: Partial<
      Pick<OperationalAlert, 'status' | 'assignedDepartment' | 'remarks' | 'acknowledgedBy' | 'resolvedAt'>
    >
  ) => void;
}

const CATEGORIES: Array<'All' | AlertCategory> = [
  'All',
  'Flood Warning',
  'Critical Water Level',
  'Heavy Rainfall',
  'Drainage Blockage',
  'Device Offline',
  'Communication Failure',
];

const STATUS_OPTIONS: IncidentStatus[] = [
  'New',
  'Acknowledged',
  'Assigned',
  'Inspection Required',
  'Resolved',
];

export function AlertsIncidentsPage({
  alerts,
  selectedRegion,
  activeRole,
  onUpdateAlert,
}: AlertsIncidentsPageProps) {
  const [category, setCategory] = useState<'All' | AlertCategory>('All');
  const [severity, setSeverity] = useState<'All' | AlertSeverity>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | IncidentStatus>('Open');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(alerts[0]?.id ?? null);

  const filtered = useMemo(
    () =>
      filterAlerts(alerts, {
        region: selectedRegion,
        category,
        severity,
        status: statusFilter,
        search,
      }),
    [alerts, selectedRegion, category, severity, statusFilter, search]
  );

  const selectedAlert = useMemo(
    () => alerts.find((a) => a.id === selectedId) ?? null,
    [alerts, selectedId]
  );

  const [deptInput, setDeptInput] = useState('');
  const [statusInput, setStatusInput] = useState<IncidentStatus>('New');
  const [remarksInput, setRemarksInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedAlert) return;
    setDeptInput(selectedAlert.assignedDepartment);
    setStatusInput(selectedAlert.status);
    setRemarksInput(selectedAlert.remarks);
    setFeedback(null);
  }, [selectedAlert?.id, selectedAlert?.status, selectedAlert?.assignedDepartment]);

  const canAck = canPerformAction(activeRole, 'acknowledge_alert');
  const canAssign = canPerformAction(activeRole, 'assign_incident');
  const canResolve = canPerformAction(activeRole, 'resolve_incident');

  const handleQuickAcknowledge = (alert: OperationalAlert) => {
    if (!canAck) return;
    onUpdateAlert(alert.id, {
      status: 'Acknowledged',
      acknowledgedBy: `${activeRole}`,
    });
  };

  const handleQuickResolve = (alert: OperationalAlert) => {
    if (!canResolve) return;
    onUpdateAlert(alert.id, {
      status: 'Resolved',
      resolvedAt: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }) + ' IST',
    });
  };

  const handleSaveDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    const allowed =
      (statusInput === 'Resolved' && canResolve) ||
      (statusInput === 'Acknowledged' && canAck) ||
      canAssign ||
      canResolve;
    if (!allowed) return;

    onUpdateAlert(selectedAlert.id, {
      status: statusInput,
      assignedDepartment: deptInput,
      remarks: remarksInput.trim(),
      acknowledgedBy:
        statusInput === 'Acknowledged' && !selectedAlert.acknowledgedBy
          ? activeRole
          : selectedAlert.acknowledgedBy,
      resolvedAt:
        statusInput === 'Resolved'
          ? new Date().toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }) + ' IST'
          : undefined,
    });
    setFeedback(`Alert ${selectedAlert.id} saved as ${statusInput}.`);
  };

  const summaryCounts = useMemo(() => {
    const scoped =
      selectedRegion === 'All Basins'
        ? alerts
        : alerts.filter((a) => a.basin === selectedRegion);
    return {
      openTotal: scoped.filter((a) => a.status !== 'Resolved').length,
      criticalOpen: scoped.filter(
        (a) => a.status !== 'Resolved' && a.severity === 'Critical'
      ).length,
      unacknowledged: scoped.filter((a) => a.status === 'New').length,
      resolved: scoped.filter((a) => a.status === 'Resolved').length,
    };
  }, [alerts, selectedRegion]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-semibold text-[#163A5F] tracking-tight">
            Alerts &amp; Incident Management
          </h2>
          <p className="text-[12px] text-[#5C6670]">
            Operational queue for hydrology thresholds, rainfall warnings, CV drainage blockages, and device faults
          </p>
        </div>

        <div className="flex items-center gap-3 text-[12px] bg-white border border-[#E6E2DA] px-3 py-1.5 rounded-md">
          <span>
            Open: <strong className="font-mono text-[#163A5F]">{summaryCounts.openTotal}</strong>
          </span>
          <span className="text-[#CBD5E1]">|</span>
          <span>
            Critical:{' '}
            <strong className="font-mono text-[#B91C1C]">{summaryCounts.criticalOpen}</strong>
          </span>
          <span className="text-[#CBD5E1]">|</span>
          <span>
            New:{' '}
            <strong className="font-mono text-[#B45309]">{summaryCounts.unacknowledged}</strong>
          </span>
          <span className="text-[#CBD5E1]">|</span>
          <span>
            Resolved:{' '}
            <strong className="font-mono text-[#15803D]">{summaryCounts.resolved}</strong>
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-[#E6E2DA] rounded-lg p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <label htmlFor="alert-status-filter" className="text-[11px] font-semibold text-[#475569]">
            Queue:
          </label>
          <select
            id="alert-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Open' | IncidentStatus)}
            className="text-[12px] border border-[#CBD5E1] rounded-md px-2 py-1 bg-white"
          >
            <option value="Open">All Open Incidents</option>
            <option value="All">All (Including Resolved)</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="alert-cat-filter" className="text-[11px] font-semibold text-[#475569]">
            Category:
          </label>
          <select
            id="alert-cat-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value as 'All' | AlertCategory)}
            className="text-[12px] border border-[#CBD5E1] rounded-md px-2 py-1 bg-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="alert-sev-filter" className="text-[11px] font-semibold text-[#475569]">
            Severity:
          </label>
          <select
            id="alert-sev-filter"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as 'All' | AlertSeverity)}
            className="text-[12px] border border-[#CBD5E1] rounded-md px-2 py-1 bg-white"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alert ID, location, department..."
            aria-label="Search operational alerts"
            className="w-full pl-8 pr-3 py-1 text-[12px] border border-[#CBD5E1] rounded-md bg-white focus:outline-none focus:border-[#0D9488]"
          />
        </div>
      </div>

      {/* Table + Action Drawer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <SectionPanel
          title={`Operational Alert Queue (${filtered.length})`}
          subtitle="Critical alerts are prioritized with explicit severity labels; select any row to manage assignment and resolution"
          className={selectedAlert ? 'xl:col-span-8' : 'xl:col-span-12'}
        >
          {filtered.length === 0 ? (
            <TableEmptyState
              message="No alerts match the active filters."
              actionLabel="Show All Alerts"
              onAction={() => {
                setCategory('All');
                setSeverity('All');
                setStatusFilter('All');
                setSearch('');
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                    <th className="py-2 px-3">Alert ID</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Location &amp; Description</th>
                    <th className="py-2 px-3">Severity</th>
                    <th className="py-2 px-3">Triggered At</th>
                    <th className="py-2 px-3">Assigned Dept / Team</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DF]">
                  {filtered.map((alert) => {
                    const isSelected = selectedAlert?.id === alert.id;
                    return (
                      <tr
                        key={alert.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-[#EFF6FF]'
                            : alert.severity === 'Critical' && alert.status === 'New'
                              ? 'bg-[#FFF5F5]/60 hover:bg-[#FEF2F2]'
                              : 'hover:bg-[#F4F2EE]'
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-medium text-[#163A5F] whitespace-nowrap">
                          {alert.id}
                        </td>
                        <td className="py-2 px-3 text-[#334155] whitespace-nowrap">
                          {alert.category}
                        </td>
                        <td className="py-2 px-3 max-w-[260px]">
                          <div className="font-medium text-[#111827] leading-snug">
                            {alert.title}
                          </div>
                          <div className="text-[11px] text-[#64748B] truncate">
                            {alert.location} · Source: {alert.sourceId}
                          </div>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <StatusBadge label={alert.severity} />
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#5C6670] whitespace-nowrap">
                          {alert.triggeredAt.replace('2026-11-20 ', '')}
                        </td>
                        <td className="py-2 px-3 text-[#334155] text-[11px]">
                          {alert.assignedDepartment}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <StatusBadge label={alert.status} showIcon={false} />
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap space-x-1.5">
                          {alert.status === 'New' && canAck && (
                            <button
                              type="button"
                              onClick={() => handleQuickAcknowledge(alert)}
                              aria-label={`Acknowledge ${alert.id}`}
                              className="px-2 py-1 text-[11px] font-medium text-[#0D9488] border border-[#0D9488] rounded-md hover:bg-[#0D9488] hover:text-white"
                            >
                              Acknowledge
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedId(alert.id)}
                            aria-label={`Manage ${alert.id}`}
                            className="px-2 py-1 text-[11px] font-medium text-[#334155] bg-[#F4F2EE] border border-[#CBD5E1] rounded-md hover:bg-[#EAE6DF]"
                          >
                            Manage
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

        {/* Alert Workflow Detail Panel */}
        {selectedAlert && (
          <SectionPanel
            title={`Incident Action — ${selectedAlert.id}`}
            subtitle={`${selectedAlert.category} · Triggered ${selectedAlert.triggeredAt}`}
            action={
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close alert management panel"
                className="p-1 text-[#475569] hover:text-[#163A5F]"
              >
                <X className="w-4 h-4" />
              </button>
            }
            className="xl:col-span-4"
            bodyClassName="p-4 space-y-3"
          >
            <div className="space-y-1.5 pb-3 border-b border-[#EAE6DF] text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge label={selectedAlert.severity} />
                <StatusBadge label={selectedAlert.status} showIcon={false} />
              </div>
              <div className="font-semibold text-[#111827] pt-1">{selectedAlert.title}</div>
              <div className="text-[11px] text-[#5C6670]">
                Location: {selectedAlert.location} ({selectedAlert.basin})
              </div>
              <div className="text-[11px] font-mono text-[#64748B]">
                Source Telemetry ID: {selectedAlert.sourceId}
              </div>
              {selectedAlert.acknowledgedBy && (
                <div className="text-[11px] text-[#475569]">
                  Acknowledged by: {selectedAlert.acknowledgedBy}
                </div>
              )}
              {selectedAlert.resolvedAt && (
                <div className="text-[11px] text-[#15803D]">
                  Resolved at: {selectedAlert.resolvedAt}
                </div>
              )}
            </div>

            {!canAck && !canResolve && (
              <PermissionNotice
                message={`Role "${activeRole}" is read-only for alert management. Switch to Administrator, Monitoring Operator, or Field Personnel to update incidents.`}
              />
            )}

            <form onSubmit={handleSaveDetail} className="space-y-3">
              <div>
                <label htmlFor="al-status" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Incident Status
                </label>
                <select
                  id="al-status"
                  value={statusInput}
                  disabled={!canAck && !canResolve}
                  onChange={(e) => setStatusInput(e.target.value as IncidentStatus)}
                  className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md bg-white disabled:bg-[#F1F5F9]"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="al-dept" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Assigned Department / Field Team
                </label>
                <select
                  id="al-dept"
                  value={deptInput}
                  disabled={!canAssign}
                  onChange={(e) => setDeptInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md bg-white disabled:bg-[#F1F5F9]"
                >
                  {[selectedAlert.assignedDepartment, ...FIELD_TEAMS]
                    .filter((v, idx, arr) => arr.indexOf(v) === idx)
                    .map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="al-remarks" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Operational Remarks
                </label>
                <textarea
                  id="al-remarks"
                  rows={3}
                  value={remarksInput}
                  disabled={!canAck && !canResolve}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  placeholder="Enter control room log notes or field clearance update..."
                  className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md bg-white disabled:bg-[#F1F5F9]"
                />
              </div>

              {feedback && (
                <div role="status" className="text-[12px] text-[#15803D] font-medium">
                  {feedback}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {selectedAlert.status !== 'Resolved' && canResolve ? (
                  <button
                    type="button"
                    onClick={() => handleQuickResolve(selectedAlert)}
                    className="px-3 py-1.5 text-[12px] font-medium text-[#15803D] border border-[#15803D] rounded-md hover:bg-[#ECFDF3]"
                  >
                    Mark Resolved
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="submit"
                  disabled={!canAck && !canResolve}
                  className="px-4 py-1.5 text-[12px] font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-[#94A3B8] rounded-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </SectionPanel>
        )}
      </div>
    </div>
  );
}
