import React, { useState } from 'react';
import { Layers, Filter, MapPin } from 'lucide-react';
import type {
  BasinRegion,
  DrainageCamera,
  DrainageDetection,
  MonitoringStation,
  OperationalAlert,
  StationStatus,
} from '../types/monitoring';
import {
  GisMapCanvas,
  type GisLayerState,
  type SelectedMapFeature,
} from '../components/map/GisMapCanvas';
import { SectionPanel, StatusBadge } from '../components/ui/OperationalPrimitives';

interface GisMapPageProps {
  stations: MonitoringStation[];
  cameras: DrainageCamera[];
  detections: DrainageDetection[];
  alerts: OperationalAlert[];
  selectedRegion: BasinRegion;
}

export function GisMapPage({
  stations,
  cameras,
  detections,
  alerts,
  selectedRegion,
}: GisMapPageProps) {
  const [layers, setLayers] = useState<GisLayerState>({
    stations: true,
    waterPoints: true,
    cameras: true,
    floodZones: true,
    blockages: true,
    activeIncidents: true,
  });

  const [severityFilter, setSeverityFilter] = useState<'All' | StationStatus>('All');
  const [selectedFeature, setSelectedFeature] = useState<SelectedMapFeature | null>(null);

  const toggleLayer = (key: keyof GisLayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-semibold text-[#163A5F] tracking-tight">
            Geographic Information System (GIS) Operational Map
          </h2>
          <p className="text-[12px] text-[#5C6670]">
            Spatial monitoring of urban drainage networks, telemetry stations, camera nodes, flood-risk zones, and active blockage incidents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* GIS Layer & Severity Control Panel */}
        <div className="xl:col-span-3 space-y-4">
          <SectionPanel
            title="Map Layers"
            subtitle="Toggle operational spatial overlays"
            bodyClassName="p-3.5 space-y-2.5"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#475569] pb-1 border-b border-[#EAE6DF]">
              <Layers className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
              <span>Operational Overlays</span>
            </div>
            {(
              [
                ['stations', 'IoT Monitoring Stations', 'Water-level & rain gauges'],
                ['waterPoints', 'Water-Level Labels', 'Numeric meter tags on map'],
                ['cameras', 'Camera Locations', 'Drainage inspection CCTV'],
                ['floodZones', 'Flood-Risk Areas', 'Basin inundation polygons'],
                ['blockages', 'Drainage Blockage Locations', 'Unresolved CV detections'],
                ['activeIncidents', 'Active Incident Zones', 'Critical alert perimeter rings'],
              ] as Array<[keyof GisLayerState, string, string]>
            ).map(([key, label, hint]) => (
              <label
                key={key}
                className="flex items-start gap-2.5 cursor-pointer select-none text-[12px]"
              >
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => toggleLayer(key)}
                  className="mt-0.5 accent-[#0D9488] w-3.5 h-3.5"
                />
                <span className="leading-tight">
                  <span className="font-medium text-[#111827] block">{label}</span>
                  <span className="text-[11px] text-[#64748B]">{hint}</span>
                </span>
              </label>
            ))}
          </SectionPanel>

          <SectionPanel
            title="Severity Filter"
            subtitle="Filter stations, zones, and blockages"
            bodyClassName="p-3.5 space-y-2"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#475569] mb-1">
              <Filter className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
              <span>Condition Classification</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['All', 'Critical', 'Warning', 'Normal', 'Offline'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1.5 text-[12px] font-medium border rounded-md text-left ${
                    severityFilter === sev
                      ? 'bg-[#163A5F] text-white border-[#163A5F]'
                      : 'bg-[#F4F2EE] text-[#334155] border-[#CBD5E1] hover:bg-[#EDF2F7]'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </SectionPanel>

          {/* Selected Feature Inspector */}
          <SectionPanel
            title="Selected Location Details"
            subtitle="Click any station, camera, or blockage marker on the map"
            bodyClassName="p-3.5"
          >
            {!selectedFeature ? (
              <div className="text-[12px] text-[#64748B] flex items-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#94A3B8]" aria-hidden="true" />
                <span>
                  Select a feature on the GIS map to inspect coordinates, threshold readings, or incident assignments.
                </span>
              </div>
            ) : (
              <div className="space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-[#163A5F]">
                    {selectedFeature.id}
                  </span>
                  <StatusBadge label={selectedFeature.status} />
                </div>
                <div>
                  <div className="font-semibold text-[#111827]">{selectedFeature.title}</div>
                  <div className="text-[11px] text-[#5C6670]">{selectedFeature.subtitle}</div>
                  <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                    {selectedFeature.coordinates}
                  </div>
                </div>
                <dl className="divide-y divide-[#EAE6DF] border-t border-[#EAE6DF] pt-1">
                  {selectedFeature.details.map((item) => (
                    <div
                      key={item.label}
                      className="py-1.5 flex items-center justify-between gap-2 text-[11px]"
                    >
                      <dt className="text-[#64748B]">{item.label}</dt>
                      <dd className="font-mono text-[#111827] text-right">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </SectionPanel>
        </div>

        {/* Full-Height Interactive Map Viewport */}
        <SectionPanel
          title={`Municipal Drainage GIS Canvas — ${selectedRegion}`}
          subtitle="Pan and zoom to inspect Kamrup Metro drainage corridors; click markers for operational popups"
          className="xl:col-span-9"
        >
          <GisMapCanvas
            stations={stations}
            cameras={cameras}
            detections={detections}
            alerts={alerts}
            selectedRegion={selectedRegion}
            externalLayers={layers}
            severityFilter={severityFilter}
            onSelectFeature={setSelectedFeature}
            showCompactToolbar={false}
            heightClass="h-[640px]"
          />
        </SectionPanel>
      </div>
    </div>
  );
}
