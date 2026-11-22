import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, LocateFixed } from 'lucide-react';
import type {
  BasinRegion,
  DrainageCamera,
  DrainageDetection,
  MonitoringStation,
  OperationalAlert,
  StationStatus,
} from '../../types/monitoring';
import { GIS_FLOOD_ZONES, GIS_WATERWAYS } from '../../data/demoData';
import { classifyStationStatus } from '../../utils/floodLogic';

export interface GisLayerState {
  stations: boolean;
  waterPoints: boolean;
  cameras: boolean;
  floodZones: boolean;
  blockages: boolean;
  activeIncidents: boolean;
}

export interface SelectedMapFeature {
  kind: 'station' | 'camera' | 'detection' | 'alert';
  id: string;
  title: string;
  subtitle: string;
  status: string;
  coordinates: string;
  details: Array<{ label: string; value: string }>;
}

interface GisMapCanvasProps {
  stations: MonitoringStation[];
  cameras: DrainageCamera[];
  detections: DrainageDetection[];
  alerts: OperationalAlert[];
  selectedRegion: BasinRegion;
  heightClass?: string;
  externalLayers?: GisLayerState;
  severityFilter?: 'All' | StationStatus;
  onSelectFeature?: (feature: SelectedMapFeature) => void;
  showCompactToolbar?: boolean;
}

const REGION_CENTER: Record<BasinRegion, { center: [number, number]; zoom: number }> = {
  'All Basins': { center: [26.149, 91.775], zoom: 12 },
  'Bharalu Basin': { center: [26.171, 91.758], zoom: 13 },
  'Bahini Basin': { center: [26.135, 91.792], zoom: 14 },
  'Basistha-Jorabat Basin': { center: [26.115, 91.825], zoom: 13 },
  'Brahmaputra North-West': { center: [26.169, 91.73], zoom: 12 },
};

const STATUS_COLOR: Record<string, string> = {
  Normal: '#15803D',
  Low: '#15803D',
  Online: '#0D9488',
  Warning: '#B45309',
  Moderate: '#B45309',
  Intermittent: '#B45309',
  Critical: '#B91C1C',
  High: '#B91C1C',
  Offline: '#64748B',
};

function createStationIcon(status: StationStatus, showLevelLabel: boolean, level: number): L.DivIcon {
  const color = STATUS_COLOR[status] ?? '#0D9488';
  const html = `
    <div style="display:flex;align-items:center;gap:4px;transform:translate(-7px,-7px);">
      <div style="width:14px;height:14px;background:${color};border:2px solid #FFFFFF;box-shadow:0 1px 3px rgba(15,39,68,0.45);border-radius:50%;flex-shrink:0;"></div>
      ${
        showLevelLabel
          ? `<span style="background:#FFFFFF;border:1px solid ${color};color:#163A5F;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;padding:0 4px;line-height:15px;white-space:nowrap;box-shadow:0 1px 2px rgba(15,39,68,0.18);">${level.toFixed(2)}m</span>`
          : ''
      }
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gis-custom-marker',
    iconSize: [14, 14],
    iconAnchor: [0, 0],
  });
}

function createCameraIcon(connectivity: DrainageCamera['connectivity']): L.DivIcon {
  const color = connectivity === 'Offline' ? '#64748B' : '#163A5F';
  const html = `
    <div style="width:16px;height:16px;background:${color};border:2px solid #FFFFFF;border-radius:2px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(15,39,68,0.45);transform:translate(-8px,-8px);">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5">
        <path d="M23 7l-7 5 7 5V7z"></path>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gis-custom-marker',
    iconSize: [16, 16],
    iconAnchor: [0, 0],
  });
}

function createBlockageIcon(severity: DrainageDetection['severity']): L.DivIcon {
  const color = STATUS_COLOR[severity] ?? '#B45309';
  const html = `
    <div style="transform:translate(-9px,-9px);">
      <svg width="18" height="18" viewBox="0 0 20 20" style="filter:drop-shadow(0 1px 2px rgba(15,39,68,0.4));">
        <polygon points="10,2 19,18 1,18" fill="${color}" stroke="#FFFFFF" stroke-width="1.8" />
        <text x="10" y="15" text-anchor="middle" fill="#FFFFFF" font-size="10" font-weight="700" font-family="IBM Plex Sans, sans-serif">!</text>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'gis-custom-marker',
    iconSize: [18, 18],
    iconAnchor: [0, 0],
  });
}

export function GisMapCanvas({
  stations,
  cameras,
  detections,
  alerts,
  selectedRegion,
  heightClass = 'h-[420px]',
  externalLayers,
  severityFilter = 'All',
  onSelectFeature,
  showCompactToolbar = true,
}: GisMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [internalLayers, setInternalLayers] = useState<GisLayerState>({
    stations: true,
    waterPoints: true,
    cameras: true,
    floodZones: true,
    blockages: true,
    activeIncidents: true,
  });

  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number }>({
    lat: 26.149,
    lng: 91.775,
  });

  const activeLayers = externalLayers ?? internalLayers;

  const toggleInternalLayer = (key: keyof GisLayerState) => {
    setInternalLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialView = REGION_CENTER[selectedRegion];
    const map = L.map(containerRef.current, {
      center: initialView.center,
      zoom: initialView.zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | Municipal GIS Layer',
      maxZoom: 18,
    }).addTo(map);

    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);

    map.on('mousemove', (ev: L.LeafletMouseEvent) => {
      setCursorCoords({ lat: ev.latlng.lat, lng: ev.latlng.lng });
    });

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Re-center when selected basin changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const target = REGION_CENTER[selectedRegion];
    map.setView(target.center, target.zoom, { animate: false });
  }, [selectedRegion]);

  // Scoped datasets
  const scopedStations = useMemo(() => {
    return stations.filter((s) => {
      if (selectedRegion !== 'All Basins' && s.basin !== selectedRegion) return false;
      const st = classifyStationStatus(
        s.waterLevelM,
        s.warningThresholdM,
        s.criticalThresholdM,
        s.isOnline
      );
      if (severityFilter !== 'All' && st !== severityFilter) return false;
      return true;
    });
  }, [stations, selectedRegion, severityFilter]);

  const scopedCameras = useMemo(
    () =>
      selectedRegion === 'All Basins'
        ? cameras
        : cameras.filter((c) => c.basin === selectedRegion),
    [cameras, selectedRegion]
  );

  const scopedDetections = useMemo(() => {
    return detections.filter((d) => {
      if (selectedRegion !== 'All Basins' && d.basin !== selectedRegion) return false;
      if (d.status === 'Resolved') return false;
      if (severityFilter === 'Critical' && d.severity !== 'High') return false;
      if (severityFilter === 'Warning' && d.severity !== 'Moderate') return false;
      if (severityFilter === 'Normal' && d.severity !== 'Low') return false;
      if (severityFilter === 'Offline') return false;
      return true;
    });
  }, [detections, selectedRegion, severityFilter]);

  // Render GIS vector layers & operational markers
  useEffect(() => {
    const group = layerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    // Base hydrological waterways always visible for GIS orientation
    GIS_WATERWAYS.forEach((ww) => {
      L.polyline(ww.coords, {
        color: ww.type === 'river' ? '#3B82B6' : '#0D9488',
        weight: ww.type === 'river' ? 5 : 2.5,
        opacity: ww.type === 'river' ? 0.55 : 0.7,
        dashArray: ww.type === 'canal' ? '6 3' : undefined,
      })
        .bindTooltip(ww.name, { sticky: true, direction: 'top' })
        .addTo(group);
    });

    // Flood risk zones
    if (activeLayers.floodZones) {
      GIS_FLOOD_ZONES.forEach((zone) => {
        if (selectedRegion !== 'All Basins' && zone.basin !== selectedRegion) return;
        if (severityFilter !== 'All' && zone.risk !== severityFilter) return;
        const fillColor =
          zone.risk === 'Critical'
            ? '#DC2626'
            : zone.risk === 'Warning'
              ? '#D97706'
              : '#16A34A';
        L.polygon(zone.polygon, {
          color: fillColor,
          weight: 1.5,
          fillColor,
          fillOpacity: 0.16,
          dashArray: '4 3',
        })
          .bindPopup(
            `<div style="padding:8px 10px;font-family:'IBM Plex Sans',sans-serif;">
              <div style="font-size:11px;font-weight:600;color:#163A5F;">${zone.name}</div>
              <div style="font-size:11px;color:#475569;margin-top:2px;">Basin: ${zone.basin}</div>
              <div style="font-size:11px;font-weight:600;color:${fillColor};margin-top:4px;">Flood Zone Classification: ${zone.risk}</div>
            </div>`
          )
          .addTo(group);
      });
    }

    // IoT Monitoring Stations & Water Level Points (highest z-index for legible water readings)
    if (activeLayers.stations || activeLayers.waterPoints) {
      scopedStations.forEach((station) => {
        const status = classifyStationStatus(
          station.waterLevelM,
          station.warningThresholdM,
          station.criticalThresholdM,
          station.isOnline
        );
        const marker = L.marker([station.lat, station.lng], {
          icon: createStationIcon(status, activeLayers.waterPoints, station.waterLevelM),
          title: `${station.id} ${station.name} (${station.waterLevelM.toFixed(2)} m, ${status})`,
          zIndexOffset: 500,
        });

        marker.bindPopup(
          `<div style="padding:8px 10px;font-family:'IBM Plex Sans',sans-serif;min-width:210px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid #EAE6DF;padding-bottom:4px;">
              <strong style="font-size:12px;color:#163A5F;font-family:'IBM Plex Mono',monospace;">${station.id}</strong>
              <span style="font-size:10px;font-weight:600;color:${STATUS_COLOR[status]};">${status}</span>
            </div>
            <div style="font-size:12px;font-weight:600;color:#111827;margin-top:5px;">${station.name}</div>
            <div style="font-size:11px;color:#5C6670;">${station.location}</div>
            <table style="width:100%;margin-top:6px;font-size:11px;border-collapse:collapse;">
              <tr><td style="color:#64748B;padding:1px 0;">Water Level:</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;font-weight:600;">${station.waterLevelM.toFixed(2)} m</td></tr>
              <tr><td style="color:#64748B;padding:1px 0;">Warning Mark:</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;">${station.warningThresholdM.toFixed(2)} m</td></tr>
              <tr><td style="color:#64748B;padding:1px 0;">Rainfall:</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;">${station.rainfallMmHr.toFixed(1)} mm/hr</td></tr>
              <tr><td style="color:#64748B;padding:1px 0;">Updated:</td><td style="text-align:right;font-family:'IBM Plex Mono',monospace;">${station.lastCommunication.replace('2026-11-20 ', '')}</td></tr>
            </table>
          </div>`
        );

        marker.on('click', () => {
          onSelectFeature?.({
            kind: 'station',
            id: station.id,
            title: station.name,
            subtitle: `${station.location} (${station.ward})`,
            status,
            coordinates: `${station.lat.toFixed(4)}° N, ${station.lng.toFixed(4)}° E`,
            details: [
              { label: 'Basin', value: station.basin },
              { label: 'Water Level', value: `${station.waterLevelM.toFixed(2)} m` },
              {
                label: 'Warning / Critical',
                value: `${station.warningThresholdM.toFixed(2)} m / ${station.criticalThresholdM.toFixed(2)} m`,
              },
              { label: 'Rainfall Intensity', value: `${station.rainfallMmHr.toFixed(1)} mm/hr` },
              { label: 'Device Health', value: station.deviceHealth },
              { label: 'Last Report', value: station.lastCommunication },
            ],
          });
        });

        marker.addTo(group);
      });
    }

    // Cameras (offset slightly south-west so icons do not overlap adjacent station meter tags)
    if (activeLayers.cameras) {
      scopedCameras.forEach((cam) => {
        const marker = L.marker([cam.lat - 0.0028, cam.lng - 0.0024], {
          icon: createCameraIcon(cam.connectivity),
          title: `Camera ${cam.id}: ${cam.name} (${cam.connectivity})`,
          zIndexOffset: 200,
        });
        marker.bindPopup(
          `<div style="padding:8px 10px;font-family:'IBM Plex Sans',sans-serif;">
            <div style="font-size:11px;font-family:'IBM Plex Mono',monospace;font-weight:600;color:#163A5F;">${cam.id}</div>
            <div style="font-size:12px;font-weight:600;color:#111827;margin-top:2px;">${cam.name}</div>
            <div style="font-size:11px;color:#5C6670;">${cam.location}</div>
            <div style="font-size:11px;margin-top:5px;">Connectivity: <strong>${cam.connectivity}</strong> · ${cam.monitoringStatus}</div>
            <div style="font-size:10px;color:#64748B;margin-top:2px;">Last Frame: ${cam.lastCapturedAt}</div>
          </div>`
        );
        marker.on('click', () => {
          onSelectFeature?.({
            kind: 'camera',
            id: cam.id,
            title: cam.name,
            subtitle: cam.location,
            status: cam.connectivity,
            coordinates: `${cam.lat.toFixed(4)}° N, ${cam.lng.toFixed(4)}° E`,
            details: [
              { label: 'Basin', value: cam.basin },
              { label: 'Monitoring Status', value: cam.monitoringStatus },
              { label: 'Capture Interval', value: `Every ${cam.captureIntervalMin} min` },
              { label: 'Last Frame', value: cam.lastCapturedAt },
            ],
          });
        });
        marker.addTo(group);
      });
    }

    // Drainage Blockages
    if (activeLayers.blockages) {
      scopedDetections.forEach((det) => {
        const marker = L.marker([det.lat + 0.0014, det.lng + 0.0014], {
          icon: createBlockageIcon(det.severity),
        });
        marker.bindPopup(
          `<div style="padding:8px 10px;font-family:'IBM Plex Sans',sans-serif;">
            <div style="font-size:11px;font-family:'IBM Plex Mono',monospace;font-weight:600;color:#B91C1C;">${det.id}</div>
            <div style="font-size:12px;font-weight:600;color:#111827;margin-top:2px;">Drainage Blockage (${det.severity})</div>
            <div style="font-size:11px;color:#5C6670;">${det.location}</div>
            <div style="font-size:11px;margin-top:5px;">Est. Occlusion: <strong>${det.blockageEstimatePct}%</strong> · Status: <strong>${det.status}</strong></div>
            <div style="font-size:10px;color:#64748B;margin-top:2px;">Assigned: ${det.assignedTeam}</div>
          </div>`
        );
        marker.on('click', () => {
          onSelectFeature?.({
            kind: 'detection',
            id: det.id,
            title: `Blockage Detection (${det.severity} Severity)`,
            subtitle: det.location,
            status: det.status,
            coordinates: `${det.lat.toFixed(4)}° N, ${det.lng.toFixed(4)}° E`,
            details: [
              { label: 'Camera Source', value: det.cameraId },
              { label: 'Est. Occlusion', value: `${det.blockageEstimatePct}%` },
              { label: 'Model Confidence', value: det.confidencePct ? `${det.confidencePct}%` : 'N/A' },
              { label: 'Assigned Team', value: det.assignedTeam },
              { label: 'Detected At', value: det.timestamp },
            ],
          });
        });
        marker.addTo(group);
      });
    }

    // Active Critical Incident Halos
    if (activeLayers.activeIncidents) {
      const openCriticalAlerts = alerts.filter(
        (a) =>
          a.status !== 'Resolved' &&
          a.severity === 'Critical' &&
          (selectedRegion === 'All Basins' || a.basin === selectedRegion)
      );
      openCriticalAlerts.forEach((alert) => {
        const station = stations.find((s) => s.id === alert.sourceId);
        if (!station) return;
        L.circle([station.lat, station.lng], {
          radius: 420,
          color: '#B91C1C',
          weight: 1.5,
          fillColor: '#DC2626',
          fillOpacity: 0.1,
        }).addTo(group);
      });
    }
  }, [
    activeLayers,
    scopedStations,
    scopedCameras,
    scopedDetections,
    alerts,
    selectedRegion,
    severityFilter,
    stations,
    onSelectFeature,
  ]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    const target = REGION_CENTER[selectedRegion];
    map.setView(target.center, target.zoom, { animate: true });
  };

  return (
    <div className="flex flex-col bg-white">
      {showCompactToolbar && !externalLayers && (
        <div className="px-3 py-2 border-b border-[#EAE6DF] bg-[#F4F2EE] flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 font-semibold text-[#163A5F]">
              <Layers className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
              Layers:
            </span>
            {(
              [
                ['stations', 'IoT Stations'],
                ['waterPoints', 'Water Levels'],
                ['cameras', 'Cameras'],
                ['floodZones', 'Flood Zones'],
                ['blockages', 'Blockages'],
                ['activeIncidents', 'Active Incidents'],
              ] as Array<[keyof GisLayerState, string]>
            ).map(([key, label]) => (
              <label key={key} className="inline-flex items-center gap-1.5 text-[#334155] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeLayers[key]}
                  onChange={() => toggleInternalLayer(key)}
                  className="accent-[#0D9488] w-3.5 h-3.5 rounded-md"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={handleRecenter}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#163A5F] bg-white border border-[#CBD5E1] rounded-md hover:bg-[#F1F5F9]"
          >
            <LocateFixed className="w-3 h-3" aria-hidden="true" />
            Reset Extent
          </button>
        </div>
      )}

      <div className={`relative w-full ${heightClass}`} data-testid="gis-map-viewport">
        <div ref={containerRef} className="w-full h-full" />

        {/* Coordinate readout */}
        <div className="absolute top-2.5 right-2.5 z-[400] bg-white/95 border border-[#CBD5E1] px-2 py-1 text-[10px] font-mono text-[#334155] pointer-events-none">
          {cursorCoords.lat.toFixed(4)}° N, {cursorCoords.lng.toFixed(4)}° E · EPSG:4326
        </div>
      </div>

      {/* Compact operational GIS legend */}
      <div className="px-3 py-2 border-t border-[#EAE6DF] bg-[#F4F2EE] flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-[#334155]">
        <span className="font-semibold text-[#163A5F]">Map Legend:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#15803D] inline-block border border-[#163A5F]/20" />
          Normal Station
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#B45309] inline-block border border-[#163A5F]/20" />
          Warning Station
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C] inline-block border border-[#163A5F]/20" />
          Critical Station
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#64748B] inline-block" />
          Offline Station
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#163A5F] inline-block rounded-[1px]" />
          Drainage Camera
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[9px] border-l-transparent border-r-transparent border-b-[#B91C1C] inline-block" />
          Blockage Detection
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-2 bg-[#DC2626]/20 border border-dashed border-[#DC2626] inline-block" />
          Flood-Risk Zone
        </span>
      </div>
    </div>
  );
}
