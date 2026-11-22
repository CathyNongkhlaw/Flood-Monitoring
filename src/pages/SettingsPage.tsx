import React, { useState } from 'react';
import type { SystemSettings, UserRole } from '../types/monitoring';
import { canPerformAction } from '../utils/floodLogic';
import {
  PermissionNotice,
  SectionPanel,
} from '../components/ui/OperationalPrimitives';

interface SettingsPageProps {
  settings: SystemSettings;
  activeRole: UserRole;
  onSaveSettings: (updated: SystemSettings) => void;
}

export function SettingsPage({
  settings,
  activeRole,
  onSaveSettings,
}: SettingsPageProps) {
  const canEdit = canPerformAction(activeRole, 'edit_settings');
  const [draft, setDraft] = useState<SystemSettings>(settings);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    onSaveSettings(draft);
    setSavedMsg('System configuration saved.');
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] font-semibold text-[#163A5F] tracking-tight">
          System Configuration &amp; Integration Settings
        </h2>
        <p className="text-[12px] text-[#5C6670]">
          Backend API endpoints (FastAPI integration), telemetry polling intervals, default threshold policies, and data retention rules
        </p>
      </div>

      {!canEdit && (
        <PermissionNotice
          message={`Current role (${activeRole}) has read-only access to portal configuration. Switch to Administrator to edit system settings.`}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionPanel
            title="Backend API &amp; Telemetry Ingestion"
            subtitle="Endpoint parameters for connecting this frontend to the municipal FastAPI service"
            bodyClassName="p-4 space-y-3"
          >
            <div>
              <label htmlFor="set-api" className="block text-[11px] font-semibold text-[#334155] mb-1">
                FastAPI Base URL
              </label>
              <input
                id="set-api"
                type="url"
                disabled={!canEdit}
                value={draft.apiBaseUrl}
                onChange={(e) => setDraft({ ...draft, apiBaseUrl: e.target.value })}
                className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md disabled:bg-[#F1F5F9]"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Expected endpoints: <code className="font-mono">/stations</code>, <code className="font-mono">/predictions</code>, <code className="font-mono">/detections</code>, <code className="font-mono">/alerts</code>. Currently serving local demonstration dataset.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="set-poll" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Telemetry Poll Interval (sec)
                </label>
                <input
                  id="set-poll"
                  type="number"
                  min={10}
                  max={600}
                  disabled={!canEdit}
                  value={draft.telemetryPollingSec}
                  onChange={(e) =>
                    setDraft({ ...draft, telemetryPollingSec: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md disabled:bg-[#F1F5F9]"
                />
              </div>

              <div>
                <label htmlFor="set-esc" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Unacknowledged Escalation (min)
                </label>
                <input
                  id="set-esc"
                  type="number"
                  min={5}
                  max={120}
                  disabled={!canEdit}
                  value={draft.autoEscalateUnacknowledgedMin}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      autoEscalateUnacknowledgedMin: Number(e.target.value),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md disabled:bg-[#F1F5F9]"
                />
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Default Alert &amp; Computer Vision Thresholds"
            subtitle="Baseline operational ratios applied when registering new drainage infrastructure"
            bodyClassName="p-4 space-y-3"
          >
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="set-warn-pct" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Warning Capacity (%)
                </label>
                <input
                  id="set-warn-pct"
                  type="number"
                  min={50}
                  max={95}
                  disabled={!canEdit}
                  value={draft.defaultWarningRatioPct}
                  onChange={(e) =>
                    setDraft({ ...draft, defaultWarningRatioPct: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md disabled:bg-[#F1F5F9]"
                />
              </div>

              <div>
                <label htmlFor="set-crit-pct" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Critical Capacity (%)
                </label>
                <input
                  id="set-crit-pct"
                  type="number"
                  min={70}
                  max={100}
                  disabled={!canEdit}
                  value={draft.defaultCriticalRatioPct}
                  onChange={(e) =>
                    setDraft({ ...draft, defaultCriticalRatioPct: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md disabled:bg-[#F1F5F9]"
                />
              </div>

              <div>
                <label htmlFor="set-cv-conf" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Min CV Confidence (%)
                </label>
                <input
                  id="set-cv-conf"
                  type="number"
                  min={50}
                  max={99}
                  disabled={!canEdit}
                  value={draft.cvConfidenceThresholdPct}
                  onChange={(e) =>
                    setDraft({ ...draft, cvConfidenceThresholdPct: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md disabled:bg-[#F1F5F9]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#EAE6DF] space-y-2 text-[12px] text-[#334155]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={draft.smsDispatchEnabled}
                  onChange={(e) =>
                    setDraft({ ...draft, smsDispatchEnabled: e.target.checked })
                  }
                  className="accent-[#0D9488]"
                />
                <span>Enable critical threshold dispatch notification hook (SMS gateway ready)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={draft.emailDigestEnabled}
                  onChange={(e) =>
                    setDraft({ ...draft, emailDigestEnabled: e.target.checked })
                  }
                  className="accent-[#0D9488]"
                />
                <span>Enable daily 08:00 IST departmental summary digest</span>
              </label>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Archival &amp; Data Retention Policy"
            subtitle="Database storage lifecycle for IoT telemetry and captured drainage imagery"
            className="lg:col-span-2"
            bodyClassName="p-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="set-ret-tel" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Sensor Telemetry Retention (Days)
                </label>
                <input
                  id="set-ret-tel"
                  type="number"
                  min={30}
                  max={3650}
                  disabled={!canEdit}
                  value={draft.retentionDaysTelemetry}
                  onChange={(e) =>
                    setDraft({ ...draft, retentionDaysTelemetry: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md disabled:bg-[#F1F5F9]"
                />
              </div>
              <div>
                <label htmlFor="set-ret-img" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Drainage Camera Frame Retention (Days)
                </label>
                <input
                  id="set-ret-img"
                  type="number"
                  min={7}
                  max={365}
                  disabled={!canEdit}
                  value={draft.retentionDaysImages}
                  onChange={(e) =>
                    setDraft({ ...draft, retentionDaysImages: Number(e.target.value) })
                  }
                  className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md disabled:bg-[#F1F5F9]"
                />
              </div>
            </div>
          </SectionPanel>
        </div>

        <div className="flex items-center justify-between gap-3 bg-white border border-[#E6E2DA] rounded-lg px-4 py-3">
          <span role="status" className="text-[12px] text-[#15803D] font-medium">
            {savedMsg ?? ''}
          </span>
          <button
            type="submit"
            disabled={!canEdit}
            className="px-4 py-1.5 text-[12px] font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-[#94A3B8] rounded-md"
          >
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
