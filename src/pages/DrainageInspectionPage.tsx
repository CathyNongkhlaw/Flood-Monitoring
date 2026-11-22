import React, { useMemo, useState } from 'react';
import { CameraOff, Eye, Layers } from 'lucide-react';
import type {
  BasinRegion,
  DetectionSeverity,
  DrainageCamera,
  DrainageDetection,
  IncidentStatus,
  UserRole,
} from '../types/monitoring';
import { FIELD_TEAMS } from '../data/demoData';
import { canPerformAction } from '../utils/floodLogic';
import {
  PermissionNotice,
  SectionPanel,
  StatusBadge,
} from '../components/ui/OperationalPrimitives';

interface DrainageInspectionPageProps {
  cameras: DrainageCamera[];
  detections: DrainageDetection[];
  selectedRegion: BasinRegion;
  activeRole: UserRole;
  onUpdateDetection: (
    id: string,
    patch: Partial<Pick<DrainageDetection, 'status' | 'assignedTeam' | 'remarks' | 'resolutionDetails'>>
  ) => void;
}

const INCIDENT_STATUSES: IncidentStatus[] = [
  'New',
  'Acknowledged',
  'Assigned',
  'Inspection Required',
  'Resolved',
];

export function DrainageInspectionPage({
  cameras,
  detections,
  selectedRegion,
  activeRole,
  onUpdateDetection,
}: DrainageInspectionPageProps) {
  const [severityFilter, setSeverityFilter] = useState<'All' | DetectionSeverity>('All');
  const [viewMode, setViewMode] = useState<'processed' | 'original' | 'split'>('processed');

  const scopedCameras = useMemo(
    () =>
      selectedRegion === 'All Basins'
        ? cameras
        : cameras.filter((c) => c.basin === selectedRegion),
    [cameras, selectedRegion]
  );

  const scopedDetections = useMemo(
    () =>
      detections.filter((d) => {
        if (selectedRegion !== 'All Basins' && d.basin !== selectedRegion) return false;
        if (severityFilter !== 'All' && d.severity !== severityFilter) return false;
        return true;
      }),
    [detections, selectedRegion, severityFilter]
  );

  const [selectedDetectionId, setSelectedDetectionId] = useState<string>(
    scopedDetections[0]?.id ?? detections[0]?.id ?? ''
  );

  const selectedDetection = useMemo(
    () =>
      scopedDetections.find((d) => d.id === selectedDetectionId) ??
      scopedDetections[0] ??
      null,
    [scopedDetections, selectedDetectionId]
  );

  // Form state synchronized with selected detection
  const [statusInput, setStatusInput] = useState<IncidentStatus>(
    selectedDetection?.status ?? 'New'
  );
  const [teamInput, setTeamInput] = useState<string>(
    selectedDetection?.assignedTeam ?? 'Unassigned'
  );
  const [remarksInput, setRemarksInput] = useState<string>(
    selectedDetection?.remarks ?? ''
  );
  const [resolutionInput, setResolutionInput] = useState<string>(
    selectedDetection?.resolutionDetails ?? ''
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedDetection) return;
    setStatusInput(selectedDetection.status);
    setTeamInput(selectedDetection.assignedTeam);
    setRemarksInput(selectedDetection.remarks);
    setResolutionInput(selectedDetection.resolutionDetails);
    setSaveMessage(null);
  }, [selectedDetection?.id]);

  const canUpdateIncident = canPerformAction(activeRole, 'update_drainage_incident');

  const handleSaveIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetection || !canUpdateIncident) return;
    onUpdateDetection(selectedDetection.id, {
      status: statusInput,
      assignedTeam: teamInput,
      remarks: remarksInput.trim(),
      resolutionDetails: resolutionInput.trim(),
    });
    setSaveMessage(`Incident ${selectedDetection.id} updated (${statusInput}).`);
  };

  const renderFrameWithOverlay = (det: DrainageDetection, showBoxes: boolean) => {
    if (!det.imageUrl) {
      return (
        <div className="aspect-video bg-[#EAE6DF] flex flex-col items-center justify-center text-[#475569] text-[12px] p-4">
          <CameraOff className="w-6 h-6 mb-1.5 text-[#64748B]" aria-hidden="true" />
          <span>Latest frame unavailable — camera offline</span>
        </div>
      );
    }

    return (
      <div className="relative aspect-video bg-[#0F172A] overflow-hidden border border-[#CBD5E1]">
        <img
          src={det.imageUrl}
          alt={`${showBoxes ? 'Processed detection frame' : 'Original captured frame'} from ${det.cameraId} at ${det.location}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        {/* Camera metadata stamp (bottom scrim) */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-white">
          <span>
            {det.cameraId} · {showBoxes ? 'CV DETECTION OVERLAY' : 'ORIGINAL CAPTURE'}
          </span>
          <span>{det.timestamp}</span>
        </div>

        {/* Programmatic CV bounding boxes */}
        {showBoxes && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            {det.boxes.map((box) => {
              const stroke =
                det.severity === 'High'
                  ? '#EF4444'
                  : det.severity === 'Moderate'
                    ? '#F59E0B'
                    : '#22C55E';
              return (
                <g key={box.id}>
                  <rect
                    x={box.xPct}
                    y={box.yPct}
                    width={box.wPct}
                    height={box.hPct}
                    fill={stroke}
                    fillOpacity={0.14}
                    stroke={stroke}
                    strokeWidth={0.75}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Crisp HTML labels anchored to bounding boxes */}
        {showBoxes &&
          det.boxes.map((box) => {
            const bg =
              det.severity === 'High'
                ? 'bg-[#B91C1C]'
                : det.severity === 'Moderate'
                  ? 'bg-[#B45309]'
                  : 'bg-[#15803D]';
            return (
              <div
                key={`lbl-${box.id}`}
                style={{ left: `${box.xPct}%`, top: `${Math.max(2, box.yPct - 6)}%` }}
                className={`absolute ${bg} text-white text-[10px] font-mono px-1.5 py-0.5 leading-tight shadow-sm pointer-events-none whitespace-nowrap`}
              >
                {box.label} ({box.confidencePct.toFixed(1)}%)
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-semibold text-[#163A5F] tracking-tight">
            Drainage Inspection &amp; Garbage Blockage Detection
          </h2>
          <p className="text-[12px] text-[#5C6670]">
            Computer-vision analysis of scheduled municipal drainage camera frames and field maintenance incident dispatch
          </p>
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Detection severity filter">
          {(['All', 'High', 'Moderate', 'Low'] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 text-[12px] font-medium border rounded-md whitespace-nowrap ${
                severityFilter === sev
                  ? 'bg-[#163A5F] text-white border-[#163A5F]'
                  : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              {sev === 'All' ? 'All Severities' : `${sev} Severity`}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Inspection Workspace: Detection Queue + Frame Inspector & Incident Workflow */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Detection Queue */}
        <SectionPanel
          title={`CV Blockage Detections (${scopedDetections.length})`}
          subtitle="Select a detection record to compare original vs. processed frames and update maintenance status"
          className="xl:col-span-5"
        >
          <div className="divide-y divide-[#EAE6DF]">
            {scopedDetections.map((det) => {
              const isSelected = selectedDetection?.id === det.id;
              return (
                <button
                  key={det.id}
                  type="button"
                  onClick={() => setSelectedDetectionId(det.id)}
                  className={`w-full text-left px-3.5 py-3 transition-colors block ${
                    isSelected ? 'bg-[#EFF6FF]' : 'hover:bg-[#F4F2EE]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] font-semibold text-[#163A5F]">
                      {det.id} · {det.cameraId}
                    </span>
                    <StatusBadge label={`${det.severity} Severity`} tone={det.severity === 'High' ? 'critical' : det.severity === 'Moderate' ? 'warning' : 'normal'} />
                  </div>
                  <div className="mt-1 text-[12px] font-medium text-[#111827]">
                    {det.location}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5C6670]">
                    <span>
                      Est. Blockage:{' '}
                      <strong className="font-mono text-[#163A5F]">
                        {det.blockageEstimatePct}%
                      </strong>
                      {det.confidencePct !== undefined && (
                        <> · Conf: <span className="font-mono">{det.confidencePct}%</span></>
                      )}
                    </span>
                    <StatusBadge label={det.status} showIcon={false} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>Team: {det.assignedTeam}</span>
                    <span className="font-mono">{det.timestamp.replace('2026-11-20 ', '')}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionPanel>

        {/* Frame Viewer + Actionable Incident Workflow */}
        {selectedDetection && (
          <div className="xl:col-span-7 space-y-4">
            <SectionPanel
              title={`Inspection Frame — ${selectedDetection.id} (${selectedDetection.cameraId})`}
              subtitle={`${selectedDetection.location} · Latest captured still frame (live stream not required)`}
              action={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('processed')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border rounded-md ${
                      viewMode === 'processed'
                        ? 'bg-[#163A5F] text-white border-[#163A5F]'
                        : 'bg-white text-[#334155] border-[#CBD5E1]'
                    }`}
                  >
                    <Layers className="w-3 h-3" aria-hidden="true" />
                    Processed
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('original')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium border rounded-md ${
                      viewMode === 'original'
                        ? 'bg-[#163A5F] text-white border-[#163A5F]'
                        : 'bg-white text-[#334155] border-[#CBD5E1]'
                    }`}
                  >
                    <Eye className="w-3 h-3" aria-hidden="true" />
                    Original
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`px-2.5 py-1 text-[11px] font-medium border rounded-md ${
                      viewMode === 'split'
                        ? 'bg-[#163A5F] text-white border-[#163A5F]'
                        : 'bg-white text-[#334155] border-[#CBD5E1]'
                    }`}
                  >
                    Side-by-Side
                  </button>
                </div>
              }
              bodyClassName="p-4 space-y-3"
            >
              {viewMode === 'split' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-semibold text-[#475569] mb-1">
                      Original Captured Frame
                    </div>
                    {renderFrameWithOverlay(selectedDetection, false)}
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#475569] mb-1">
                      Processed CV Detection Output
                    </div>
                    {renderFrameWithOverlay(selectedDetection, true)}
                  </div>
                </div>
              ) : (
                renderFrameWithOverlay(selectedDetection, viewMode === 'processed')
              )}

              {/* Detection Metadata Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#EAE6DF] text-[12px]">
                <div>
                  <div className="text-[11px] text-[#64748B]">Severity Classification</div>
                  <div className="mt-0.5">
                    <StatusBadge
                      label={`${selectedDetection.severity} Severity`}
                      tone={
                        selectedDetection.severity === 'High'
                          ? 'critical'
                          : selectedDetection.severity === 'Moderate'
                            ? 'warning'
                            : 'normal'
                      }
                    />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B]">Estimated Occlusion</div>
                  <div className="font-mono font-semibold text-[#163A5F] mt-0.5">
                    {selectedDetection.blockageEstimatePct}% cross-section
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B]">Model Confidence</div>
                  <div className="font-mono font-semibold text-[#163A5F] mt-0.5">
                    {selectedDetection.confidencePct !== undefined
                      ? `${selectedDetection.confidencePct.toFixed(1)}%`
                      : 'Not Provided'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B]">Detected Regions</div>
                  <div className="font-mono font-semibold text-[#163A5F] mt-0.5">
                    {selectedDetection.boxes.length} region(s)
                  </div>
                </div>
              </div>
            </SectionPanel>

            {/* D. Incident Workflow Panel */}
            <SectionPanel
              title="Maintenance Incident Workflow"
              subtitle={`Last updated ${selectedDetection.updatedAt}`}
              bodyClassName="p-4"
            >
              {!canUpdateIncident && (
                <div className="mb-3">
                  <PermissionNotice message={`Current role (${activeRole}) has read-only access to drainage incidents. Switch to Administrator, Monitoring Operator, or Field Personnel to assign or resolve incidents.`} />
                </div>
              )}

              <form onSubmit={handleSaveIncident} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="det-status"
                      className="block text-[11px] font-semibold text-[#334155] mb-1"
                    >
                      Incident Status
                    </label>
                    <select
                      id="det-status"
                      value={statusInput}
                      disabled={!canUpdateIncident}
                      onChange={(e) => setStatusInput(e.target.value as IncidentStatus)}
                      className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md bg-white disabled:bg-[#F1F5F9]"
                    >
                      {INCIDENT_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="det-team"
                      className="block text-[11px] font-semibold text-[#334155] mb-1"
                    >
                      Assigned Field Team
                    </label>
                    <select
                      id="det-team"
                      value={teamInput}
                      disabled={!canUpdateIncident}
                      onChange={(e) => setTeamInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md bg-white disabled:bg-[#F1F5F9]"
                    >
                      {FIELD_TEAMS.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="det-remarks"
                    className="block text-[11px] font-semibold text-[#334155] mb-1"
                  >
                    Operator Remarks &amp; Dispatch Instructions
                  </label>
                  <textarea
                    id="det-remarks"
                    rows={2}
                    value={remarksInput}
                    disabled={!canUpdateIncident}
                    onChange={(e) => setRemarksInput(e.target.value)}
                    placeholder="Record site access notes, required machinery, or verification remarks..."
                    className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md bg-white disabled:bg-[#F1F5F9]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="det-resolution"
                    className="block text-[11px] font-semibold text-[#334155] mb-1"
                  >
                    Resolution Details
                  </label>
                  <textarea
                    id="det-resolution"
                    rows={2}
                    value={resolutionInput}
                    disabled={!canUpdateIncident}
                    onChange={(e) => setResolutionInput(e.target.value)}
                    placeholder="Completed desilting/clearance confirmation and post-clearance channel flow check..."
                    className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md bg-white disabled:bg-[#F1F5F9]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-[12px] text-[#15803D] font-medium" role="status">
                    {saveMessage ?? ''}
                  </div>
                  <button
                    type="submit"
                    disabled={!canUpdateIncident}
                    className="px-4 py-1.5 text-[12px] font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-[#94A3B8] rounded-md transition-colors"
                  >
                    Update Incident Record
                  </button>
                </div>
              </form>
            </SectionPanel>
          </div>
        )}
      </div>

      {/* A. Registered Drainage Camera Inventory */}
      <SectionPanel
        title={`Registered Drainage Monitoring Cameras (${scopedCameras.length})`}
        subtitle="Fixed field camera connectivity and latest scheduled image captures"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                <th className="py-2 px-3">Camera ID</th>
                <th className="py-2 px-3">Camera Location</th>
                <th className="py-2 px-3">Basin</th>
                <th className="py-2 px-3">Connectivity</th>
                <th className="py-2 px-3">Monitoring Status</th>
                <th className="py-2 px-3">Last Captured Frame</th>
                <th className="py-2 px-3 text-right">Capture Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {scopedCameras.map((cam) => (
                <tr key={cam.id} className="hover:bg-[#F4F2EE]">
                  <td className="py-2 px-3 font-mono font-medium text-[#163A5F] whitespace-nowrap">
                    {cam.id}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-medium text-[#111827]">{cam.name}</div>
                    <div className="text-[11px] text-[#64748B]">{cam.location}</div>
                  </td>
                  <td className="py-2 px-3 text-[#475569] whitespace-nowrap">{cam.basin}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <StatusBadge label={cam.connectivity} />
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <StatusBadge label={cam.monitoringStatus} showIcon={false} />
                  </td>
                  <td className="py-2 px-3">
                    {cam.imageUrl ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={cam.imageUrl}
                          alt={`Thumbnail from ${cam.id}`}
                          referrerPolicy="no-referrer"
                          className="w-16 h-9 object-cover border border-[#CBD5E1] rounded-md"
                        />
                        <span className="text-[11px] text-[#5C6670]">
                          Every {cam.captureIntervalMin} min
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#64748B] italic">
                        Frame unavailable (Offline)
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-[11px] text-[#5C6670] whitespace-nowrap">
                    {cam.lastCapturedAt}
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
