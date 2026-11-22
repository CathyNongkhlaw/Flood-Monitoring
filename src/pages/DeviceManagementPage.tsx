import React, { useMemo, useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import type {
  BasinRegion,
  DeviceFormInput,
  MonitoringStation,
  UserRole,
} from '../types/monitoring';
import {
  canPerformAction,
  classifyStationStatus,
  validateDeviceForm,
} from '../utils/floodLogic';
import {
  PermissionNotice,
  SectionPanel,
  StatusBadge,
} from '../components/ui/OperationalPrimitives';

interface DeviceManagementPageProps {
  stations: MonitoringStation[];
  selectedRegion: BasinRegion;
  activeRole: UserRole;
  onAddStation: (station: MonitoringStation) => void;
  onEditStation: (id: string, updated: Partial<MonitoringStation>) => void;
}

const EMPTY_FORM: DeviceFormInput = {
  id: '',
  name: '',
  location: '',
  ward: '',
  basin: 'Bharalu Basin',
  lat: '',
  lng: '',
  warningThresholdM: '',
  criticalThresholdM: '',
  powerSource: 'Solar + Battery',
  supportsTemperature: true,
  supportsHumidity: true,
  supportsBattery: true,
};

export function DeviceManagementPage({
  stations,
  selectedRegion,
  activeRole,
  onAddStation,
  onEditStation,
}: DeviceManagementPageProps) {
  const canManage = canPerformAction(activeRole, 'manage_devices');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DeviceFormInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof DeviceFormInput, string>>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [historyStationId, setHistoryStationId] = useState<string | null>(null);

  const scopedStations = useMemo(
    () =>
      selectedRegion === 'All Basins'
        ? stations
        : stations.filter((s) => s.basin === selectedRegion),
    [stations, selectedRegion]
  );

  type InfraType = 'all' | 'drains' | 'canals' | 'culverts' | 'sluice_pumps';
  type HealthFilter = 'all' | 'Operational' | 'Degraded' | 'Unreachable';

  const [infraFilter, setInfraFilter] = useState<InfraType>('all');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');

  const getInfraType = (name: string, location: string): Exclude<InfraType, 'all'> => {
    const text = `${name}${location}`.toLowerCase();
    if (text.includes('sluice') || text.includes('pump')) return 'sluice_pumps';
    if (
      text.includes('canal') ||
      text.includes('stream') ||
      text.includes('weir') ||
      text.includes('channel')
    ) {
      return 'canals';
    }
    if (text.includes('culvert') || text.includes('gutter')) return 'culverts';
    return 'drains';
  };

  const infraCounts = useMemo(() => {
    const counts = { all: scopedStations.length, drains: 0, canals: 0, culverts: 0, sluice_pumps: 0 };
    for (const st of scopedStations) {
      counts[getInfraType(st.name, st.location)] += 1;
    }
    return counts;
  }, [scopedStations]);

  const filteredStations = useMemo(() => {
    return scopedStations.filter((st) => {
      const matchesInfra =
        infraFilter === 'all' || getInfraType(st.name, st.location) === infraFilter;
      const matchesHealth =
        healthFilter === 'all' || st.deviceHealth === healthFilter;
      return matchesInfra && matchesHealth;
    });
  }, [scopedStations, infraFilter, healthFilter]);

  const historyStation = useMemo(
    () => stations.find((s) => s.id === historyStationId) ?? null,
    [stations, historyStationId]
  );

  const openRegisterForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setFormOpen(true);
    setStatusMessage(null);
  };

  const openEditForm = (station: MonitoringStation) => {
    setEditingId(station.id);
    setForm({
      id: station.id,
      name: station.name,
      location: station.location,
      ward: station.ward,
      basin: station.basin,
      lat: String(station.lat),
      lng: String(station.lng),
      warningThresholdM: String(station.warningThresholdM),
      criticalThresholdM: String(station.criticalThresholdM),
      powerSource: station.powerSource,
      supportsTemperature: station.temperatureC !== undefined,
      supportsHumidity: station.humidityPct !== undefined,
      supportsBattery: station.batteryPct !== undefined,
    });
    setErrors({});
    setFormOpen(true);
    setStatusMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const validation = validateDeviceForm(
      form,
      stations.map((s) => s.id),
      editingId ?? undefined
    );

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const supportedSensors = ['Water Level', 'Rainfall'];
    if (form.supportsTemperature) supportedSensors.push('Temperature');
    if (form.supportsHumidity) supportedSensors.push('Humidity');
    if (form.supportsBattery) supportedSensors.push('Battery');

    if (editingId) {
      onEditStation(editingId, {
        name: form.name.trim(),
        location: form.location.trim(),
        ward: form.ward.trim(),
        basin: form.basin,
        lat: Number(form.lat),
        lng: Number(form.lng),
        warningThresholdM: Number(form.warningThresholdM),
        criticalThresholdM: Number(form.criticalThresholdM),
        powerSource: form.powerSource,
        supportedSensors,
        temperatureC: form.supportsTemperature ? 26.5 : undefined,
        humidityPct: form.supportsHumidity ? 86 : undefined,
        batteryPct: form.supportsBattery ? 85 : undefined,
      });
      setStatusMessage(`Device ${editingId} configuration updated.`);
    } else {
      const normalizedId = form.id.trim().toUpperCase();
      const newStation: MonitoringStation = {
        id: normalizedId,
        name: form.name.trim(),
        location: form.location.trim(),
        ward: form.ward.trim(),
        basin: form.basin,
        lat: Number(form.lat),
        lng: Number(form.lng),
        isOnline: true,
        waterLevelM: Number((Number(form.warningThresholdM) * 0.55).toFixed(2)),
        warningThresholdM: Number(form.warningThresholdM),
        criticalThresholdM: Number(form.criticalThresholdM),
        rainfallMmHr: 12.0,
        waterLevelDeltaM: 0.02,
        temperatureC: form.supportsTemperature ? 26.5 : undefined,
        humidityPct: form.supportsHumidity ? 85 : undefined,
        batteryPct: form.supportsBattery ? 100 : undefined,
        powerSource: form.powerSource,
        signalQuality: 'Good',
        deviceHealth: 'Operational',
        lastCommunication: '2026-11-20 20:00 IST',
        installedDate: '2026-11-20',
        supportedSensors,
        history: [
          {
            timestamp: '2026-11-20 18:00 IST',
            label: '18:00',
            waterLevelM: Number((Number(form.warningThresholdM) * 0.52).toFixed(2)),
            rainfallMmHr: 10.5,
            deltaM: 0.0,
          },
          {
            timestamp: '2026-11-20 20:00 IST',
            label: '20:00',
            waterLevelM: Number((Number(form.warningThresholdM) * 0.55).toFixed(2)),
            rainfallMmHr: 12.0,
            deltaM: 0.02,
          },
        ],
        commLogs: [
          {
            timestamp: '20:00:00 IST',
            event: 'Device provisioned & initial telemetry packet verified',
            status: 'OK',
            latencyMs: 148,
          },
        ],
      };
      onAddStation(newStation);
      setStatusMessage(`Monitoring device ${normalizedId} registered and active.`);
    }

    setFormOpen(false);
    setEditingId(null);
    setErrors({});
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-semibold text-[#163A5F] tracking-tight">
            Device Management (IoT Registry &amp; Threshold Configuration)
          </h2>
          <p className="text-[12px] text-[#5C6670]">
            Hardware-agnostic registry for provisioning monitoring nodes, assigning coordinates, and configuring warning/critical water-level thresholds
          </p>
        </div>

        <button
          type="button"
          disabled={!canManage}
          onClick={openRegisterForm}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-[#94A3B8] rounded-md whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          Register New Device
        </button>
      </div>

      {!canManage && (
        <PermissionNotice
          message={`Current role (${activeRole}) has read-only access to IoT device registration and threshold configuration. Switch to Administrator to add or edit field devices.`}
        />
      )}

      {statusMessage && (
        <div
          role="status"
          className="px-3.5 py-2 text-[12px] font-medium text-[#14532D] bg-[#ECFDF3] border border-[#BBF7D0] rounded-md"
        >
          {statusMessage}
        </div>
      )}

      {/* Register / Edit Form Panel */}
      {formOpen && canManage && (
        <SectionPanel
          title={editingId ? `Edit Monitoring Device — ${editingId}` : 'Register New IoT Monitoring Device'}
          subtitle="All geographic coordinates and hydraulic thresholds are validated prior to registration"
          action={
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label="Close device registration form"
              className="p-1 text-[#475569] hover:text-[#163A5F]"
            >
              <X className="w-4 h-4" />
            </button>
          }
          bodyClassName="p-4"
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="dev-id" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Station / Device ID *
                </label>
                <input
                  id="dev-id"
                  type="text"
                  disabled={Boolean(editingId)}
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="e.g., STN-BHR-05"
                  className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md disabled:bg-[#F1F5F9]"
                />
                {errors.id && <p className="text-[11px] text-[#B91C1C] mt-1">{errors.id}</p>}
              </div>

              <div>
                <label htmlFor="dev-name" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Station Name *
                </label>
                <input
                  id="dev-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Chandmari Stormwater Drain"
                  className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md"
                />
                {errors.name && <p className="text-[11px] text-[#B91C1C] mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="dev-basin" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Drainage Basin *
                </label>
                <select
                  id="dev-basin"
                  value={form.basin}
                  onChange={(e) =>
                    setForm({ ...form, basin: e.target.value as DeviceFormInput['basin'] })
                  }
                  className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md bg-white"
                >
                  <option value="Bharalu Basin">Bharalu Basin</option>
                  <option value="Bahini Basin">Bahini Basin</option>
                  <option value="Basistha-Jorabat Basin">Basistha-Jorabat Basin</option>
                  <option value="Brahmaputra North-West">Brahmaputra North-West</option>
                </select>
              </div>

              <div>
                <label htmlFor="dev-loc" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Geographic Location *
                </label>
                <input
                  id="dev-loc"
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g., Chandmari Flyover Culvert"
                  className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md"
                />
                {errors.location && (
                  <p className="text-[11px] text-[#B91C1C] mt-1">{errors.location}</p>
                )}
              </div>

              <div>
                <label htmlFor="dev-ward" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Municipal Ward / Zone *
                </label>
                <input
                  id="dev-ward"
                  type="text"
                  value={form.ward}
                  onChange={(e) => setForm({ ...form, ward: e.target.value })}
                  placeholder="e.g., Ward 26"
                  className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md"
                />
                {errors.ward && <p className="text-[11px] text-[#B91C1C] mt-1">{errors.ward}</p>}
              </div>

              <div>
                <label htmlFor="dev-power" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Power Source
                </label>
                <select
                  id="dev-power"
                  value={form.powerSource}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      powerSource: e.target.value as DeviceFormInput['powerSource'],
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-[12px] border border-[#CBD5E1] rounded-md bg-white"
                >
                  <option value="Solar + Battery">Solar + Battery</option>
                  <option value="Mains AC">Mains AC</option>
                  <option value="Battery Only">Battery Only</option>
                </select>
              </div>

              <div>
                <label htmlFor="dev-lat" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Latitude (°N, Assam 24.0–28.5) *
                </label>
                <input
                  id="dev-lat"
                  type="text"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  placeholder="e.g., 26.1825"
                  className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md"
                />
                {errors.lat && <p className="text-[11px] text-[#B91C1C] mt-1">{errors.lat}</p>}
              </div>

              <div>
                <label htmlFor="dev-lng" className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Longitude (°E, Assam 89.5–96.5) *
                </label>
                <input
                  id="dev-lng"
                  type="text"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  placeholder="e.g., 91.7780"
                  className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md"
                />
                {errors.lng && <p className="text-[11px] text-[#B91C1C] mt-1">{errors.lng}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="dev-warn" className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Warning (m) *
                  </label>
                  <input
                    id="dev-warn"
                    type="text"
                    value={form.warningThresholdM}
                    onChange={(e) => setForm({ ...form, warningThresholdM: e.target.value })}
                    placeholder="2.50"
                    className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md"
                  />
                  {errors.warningThresholdM && (
                    <p className="text-[11px] text-[#B91C1C] mt-1">{errors.warningThresholdM}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="dev-crit" className="block text-[11px] font-semibold text-[#334155] mb-1">
                    Critical (m) *
                  </label>
                  <input
                    id="dev-crit"
                    type="text"
                    value={form.criticalThresholdM}
                    onChange={(e) => setForm({ ...form, criticalThresholdM: e.target.value })}
                    placeholder="3.20"
                    className="w-full px-2.5 py-1.5 text-[12px] font-mono border border-[#CBD5E1] rounded-md"
                  />
                  {errors.criticalThresholdM && (
                    <p className="text-[11px] text-[#B91C1C] mt-1">{errors.criticalThresholdM}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modular Sensor Capabilities */}
            <div className="pt-2 border-t border-[#EAE6DF]">
              <div className="text-[11px] font-semibold text-[#334155] mb-2">
                Supported Optional Probes (Water Level &amp; Rainfall are enabled by default)
              </div>
              <div className="flex flex-wrap items-center gap-5 text-[12px] text-[#334155]">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.supportsTemperature}
                    onChange={(e) =>
                      setForm({ ...form, supportsTemperature: e.target.checked })
                    }
                    className="accent-[#0D9488]"
                  />
                  Ambient Temperature
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.supportsHumidity}
                    onChange={(e) => setForm({ ...form, supportsHumidity: e.target.checked })}
                    className="accent-[#0D9488]"
                  />
                  Relative Humidity
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.supportsBattery}
                    onChange={(e) => setForm({ ...form, supportsBattery: e.target.checked })}
                    className="accent-[#0D9488]"
                  />
                  Battery Telemetry
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-3.5 py-1.5 text-[12px] font-medium text-[#334155] border border-[#CBD5E1] rounded-md hover:bg-[#F1F5F9]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-[12px] font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
              >
                {editingId ? 'Save Device Configuration' : 'Register Device'}
              </button>
            </div>
          </form>
        </SectionPanel>
      )}

      {/* Registered Devices Table */}
      {/* Registered Devices Table */}
      <SectionPanel
        title={`IoT Device Inventory (${filteredStations.length}${
          filteredStations.length !== scopedStations.length ? ` of ${scopedStations.length}` : ''
        })`}
        subtitle="Protocol-independent registry supporting modular probe expansion"
      >
        {/* Infrastructure & Health Subdivision Bar */}
        <div className="px-4 py-2.5 bg-[#FAF9F6] border-b border-[#E6E2DA] flex flex-wrap items-center justify-between gap-3">
          {/* Infrastructure Type Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'All Types' },
                { id: 'drains', label: 'Drains' },
                { id: 'canals', label: 'Canals & Channels' },
                { id: 'culverts', label: 'Culverts & Gutters' },
                { id: 'sluice_pumps', label: 'Sluices & Pumps' },
              ] as const
            ).map((tab) => {
              const active = infraFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInfraFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-medium rounded-md transition-colors ${
                    active
                      ? 'bg-[#163A5F] text-white'
                      : 'bg-white text-[#5C6670] border border-[#E6E2DA] hover:text-[#163A5F] hover:bg-[#F4F2EE]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-white/20 text-white' : 'bg-[#F4F2EE] text-[#5C6670]'
                    }`}
                  >
                    {infraCounts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Health Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#5C6670] mr-0.5">Health:</span>
            {(['all', 'Operational', 'Degraded', 'Unreachable'] as const).map((status) => {
              const active = healthFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setHealthFilter(status)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    active
                      ? 'bg-[#0D9488] text-white'
                      : 'bg-white text-[#5C6670] border border-[#E6E2DA] hover:text-[#163A5F]'
                  }`}
                >
                  {status === 'all' ? 'All' : status}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                <th className="py-2 px-3">Device ID</th>
                <th className="py-2 px-3">Station &amp; Location</th>
                <th className="py-2 px-3">Coordinates</th>
                <th className="py-2 px-3">Connectivity</th>
                <th className="py-2 px-3">Health</th>
                <th className="py-2 px-3 text-right">Warn / Crit (m)</th>
                <th className="py-2 px-3">Supported Probes</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {filteredStations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 px-4 text-center text-[12px] text-[#5C6670]">
                    No devices match the selected infrastructure type and health filter.
                  </td>
                </tr>
              ) : (
                filteredStations.map((st) => (
                  <tr key={st.id} className="hover:bg-[#F4F2EE]">
                    <td className="py-2 px-3 font-mono font-medium text-[#163A5F] whitespace-nowrap">
                      {st.id}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-medium text-[#111827]">{st.name}</div>
                      <div className="text-[11px] text-[#64748B]">
                        {st.location} · {st.ward}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-[#5C6670] whitespace-nowrap">
                      {st.lat.toFixed(4)}, {st.lng.toFixed(4)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusBadge
                        label={
                          st.isOnline
                            ? classifyStationStatus(
                                st.waterLevelM,
                                st.warningThresholdM,
                                st.criticalThresholdM,
                                st.isOnline
                              )
                            : 'Offline'
                        }
                      />
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <StatusBadge label={st.deviceHealth} showIcon={false} />
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {st.warningThresholdM.toFixed(2)} / {st.criticalThresholdM.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-[#475569]">
                      {st.supportedSensors.join(', ')}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setHistoryStationId(st.id)}
                        className="px-2 py-1 text-[11px] font-medium text-[#334155] border border-[#CBD5E1] rounded-md hover:bg-[#F1F5F9]"
                      >
                        History
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => openEditForm(st)}
                          aria-label={`Edit device ${st.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#0D9488] border border-[#0D9488] rounded-md hover:bg-[#0D9488] hover:text-white"
                        >
                          <Pencil className="w-3 h-3" aria-hidden="true" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Device History Panel */}
      {historyStation && (
        <SectionPanel
          title={`Device History & Provisioning Record — ${historyStation.id}`}
          subtitle={`Installed ${historyStation.installedDate} · Power: ${historyStation.powerSource}`}
          action={
            <button
              type="button"
              onClick={() => setHistoryStationId(null)}
              aria-label="Close device history"
              className="p-1 text-[#475569] hover:text-[#163A5F]"
            >
              <X className="w-4 h-4" />
            </button>
          }
          bodyClassName="p-4"
        >
          <table className="w-full text-left border-collapse text-[12px] border border-[#EAE6DF]">
            <thead>
              <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                <th className="py-1.5 px-3">Timestamp</th>
                <th className="py-1.5 px-3">Event Log</th>
                <th className="py-1.5 px-3">Status</th>
                <th className="py-1.5 px-3 text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {historyStation.commLogs.map((log, i) => (
                <tr key={i}>
                  <td className="py-1.5 px-3 font-mono text-[11px] text-[#5C6670]">
                    {log.timestamp}
                  </td>
                  <td className="py-1.5 px-3 text-[#111827]">{log.event}</td>
                  <td className="py-1.5 px-3">
                    <StatusBadge label={log.status} showIcon={false} />
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-[#5C6670]">
                    {log.latencyMs !== undefined ? `${log.latencyMs} ms` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionPanel>
      )}
    </div>
  );
}
