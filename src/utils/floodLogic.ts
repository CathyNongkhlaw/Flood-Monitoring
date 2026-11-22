import type {
  AlertCategory,
  AlertSeverity,
  BasinRegion,
  DeviceFormInput,
  DrainageCamera,
  DrainageDetection,
  IncidentStatus,
  MonitoringStation,
  OperationalAlert,
  PermissionAction,
  StationStatus,
  UserRole,
} from '../types/monitoring';

export function classifyStationStatus(
  waterLevelM: number,
  warningThresholdM: number,
  criticalThresholdM: number,
  isOnline: boolean
): StationStatus {
  if (!isOnline) {
    return 'Offline';
  }
  if (waterLevelM >= criticalThresholdM) {
    return 'Critical';
  }
  if (waterLevelM >= warningThresholdM) {
    return 'Warning';
  }
  return 'Normal';
}

export interface OverviewMetrics {
  totalStations: number;
  reportingStations: number;
  offlineStations: number;
  averageWaterLevelM: number;
  exceedingWarningCount: number;
  activeFloodWarnings: number;
  openDrainageIncidents: number;
  totalCameras: number;
  onlineCameras: number;
}

export function computeOverviewMetrics(
  stations: MonitoringStation[],
  alerts: OperationalAlert[],
  detections: DrainageDetection[],
  cameras: DrainageCamera[],
  region: BasinRegion
): OverviewMetrics {
  const scopedStations =
    region === 'All Basins' ? stations : stations.filter((s) => s.basin === region);
  const scopedAlerts =
    region === 'All Basins' ? alerts : alerts.filter((a) => a.basin === region);
  const scopedDetections =
    region === 'All Basins' ? detections : detections.filter((d) => d.basin === region);
  const scopedCameras =
    region === 'All Basins' ? cameras : cameras.filter((c) => c.basin === region);

  const reporting = scopedStations.filter((s) => s.isOnline);
  const offline = scopedStations.length - reporting.length;

  const avgLevel =
    reporting.length > 0
      ? Number(
          (
            reporting.reduce((sum, s) => sum + s.waterLevelM, 0) / reporting.length
          ).toFixed(2)
        )
      : 0;

  const exceedingWarningCount = reporting.filter(
    (s) => s.waterLevelM >= s.warningThresholdM
  ).length;

  const activeFloodWarnings = scopedAlerts.filter(
    (a) =>
      a.status !== 'Resolved' &&
      (a.category === 'Flood Warning' ||
        a.category === 'Critical Water Level' ||
        a.category === 'Heavy Rainfall')
  ).length;

  const openDrainageIncidents = scopedDetections.filter(
    (d) => d.status !== 'Resolved'
  ).length;

  const onlineCameras = scopedCameras.filter((c) => c.connectivity !== 'Offline').length;

  return {
    totalStations: scopedStations.length,
    reportingStations: reporting.length,
    offlineStations: offline,
    averageWaterLevelM: avgLevel,
    exceedingWarningCount,
    activeFloodWarnings,
    openDrainageIncidents,
    totalCameras: scopedCameras.length,
    onlineCameras,
  };
}

export interface StationFilterCriteria {
  status: 'All' | 'Online' | 'Offline' | 'Warning' | 'Critical' | 'Normal';
  region: BasinRegion;
  search: string;
}

export function filterStations(
  stations: MonitoringStation[],
  criteria: StationFilterCriteria
): MonitoringStation[] {
  const query = criteria.search.trim().toLowerCase();

  return stations.filter((station) => {
    if (criteria.region !== 'All Basins' && station.basin !== criteria.region) {
      return false;
    }

    const computedStatus = classifyStationStatus(
      station.waterLevelM,
      station.warningThresholdM,
      station.criticalThresholdM,
      station.isOnline
    );

    if (criteria.status === 'Online' && !station.isOnline) {
      return false;
    }
    if (criteria.status === 'Offline' && station.isOnline) {
      return false;
    }
    if (
      (criteria.status === 'Warning' ||
        criteria.status === 'Critical' ||
        criteria.status === 'Normal') &&
      computedStatus !== criteria.status
    ) {
      return false;
    }

    if (query) {
      const haystack =
        `${station.id} ${station.name} ${station.location} ${station.ward} ${station.basin}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

export interface AlertFilterCriteria {
  region: BasinRegion;
  category: 'All' | AlertCategory;
  severity: 'All' | AlertSeverity;
  status: 'All' | 'Open' | IncidentStatus;
  search: string;
}

export function filterAlerts(
  alerts: OperationalAlert[],
  criteria: AlertFilterCriteria
): OperationalAlert[] {
  const query = criteria.search.trim().toLowerCase();

  return alerts.filter((alert) => {
    if (criteria.region !== 'All Basins' && alert.basin !== criteria.region) {
      return false;
    }
    if (criteria.category !== 'All' && alert.category !== criteria.category) {
      return false;
    }
    if (criteria.severity !== 'All' && alert.severity !== criteria.severity) {
      return false;
    }
    if (criteria.status === 'Open' && alert.status === 'Resolved') {
      return false;
    }
    if (
      criteria.status !== 'All' &&
      criteria.status !== 'Open' &&
      alert.status !== criteria.status
    ) {
      return false;
    }
    if (query) {
      const haystack =
        `${alert.id} ${alert.title} ${alert.location} ${alert.assignedDepartment} ${alert.sourceId}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

export interface DeviceValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof DeviceFormInput, string>>;
}

export function validateDeviceForm(
  input: DeviceFormInput,
  existingIds: string[],
  editingId?: string
): DeviceValidationResult {
  const errors: Partial<Record<keyof DeviceFormInput, string>> = {};
  const trimmedId = input.id.trim().toUpperCase();

  if (!trimmedId) {
    errors.id = 'Station ID is required (e.g., STN-BHR-05).';
  } else if (!/^[A-Z0-9-]{4,20}$/.test(trimmedId)) {
    errors.id = 'Use 4–20 uppercase letters, digits, or hyphens.';
  } else if (
    existingIds.some((id) => id.toUpperCase() === trimmedId) &&
    trimmedId !== editingId?.toUpperCase()
  ) {
    errors.id = 'A monitoring device with this Station ID already exists.';
  }

  if (!input.name.trim()) {
    errors.name = 'Station name is required.';
  }

  if (!input.location.trim()) {
    errors.location = 'Geographic location description is required.';
  }

  if (!input.ward.trim()) {
    errors.ward = 'Municipal ward or zone identifier is required.';
  }

  const lat = Number(input.lat);
  if (input.lat.trim() === '' || Number.isNaN(lat) || lat < 24.0 || lat > 28.5) {
    errors.lat = 'Enter a valid Assam latitude between 24.00 and 28.50.';
  }

  const lng = Number(input.lng);
  if (input.lng.trim() === '' || Number.isNaN(lng) || lng < 89.5 || lng > 96.5) {
    errors.lng = 'Enter a valid Assam longitude between 89.50 and 96.50.';
  }

  const warn = Number(input.warningThresholdM);
  const crit = Number(input.criticalThresholdM);

  if (input.warningThresholdM.trim() === '' || Number.isNaN(warn) || warn <= 0 || warn > 25) {
    errors.warningThresholdM = 'Warning threshold must be between 0.1 m and 25.0 m.';
  }

  if (input.criticalThresholdM.trim() === '' || Number.isNaN(crit) || crit <= 0 || crit > 30) {
    errors.criticalThresholdM = 'Critical threshold must be between 0.1 m and 30.0 m.';
  } else if (!Number.isNaN(warn) && crit <= warn) {
    errors.criticalThresholdM = 'Critical threshold must be strictly greater than warning threshold.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

const ROLE_PERMISSIONS: Record<UserRole, Set<PermissionAction>> = {
  Administrator: new Set<PermissionAction>([
    'view_monitoring',
    'acknowledge_alert',
    'assign_incident',
    'resolve_incident',
    'update_drainage_incident',
    'manage_devices',
    'export_reports',
    'manage_users',
    'edit_settings',
  ]),
  'Monitoring Operator': new Set<PermissionAction>([
    'view_monitoring',
    'acknowledge_alert',
    'assign_incident',
    'resolve_incident',
    'update_drainage_incident',
    'export_reports',
  ]),
  'Field Personnel': new Set<PermissionAction>([
    'view_monitoring',
    'update_drainage_incident',
    'resolve_incident',
  ]),
  'Department Viewer': new Set<PermissionAction>([
    'view_monitoring',
    'export_reports',
  ]),
};

export function canPerformAction(role: UserRole, action: PermissionAction): boolean {
  return ROLE_PERMISSIONS[role].has(action);
}

export function generateCsvExport(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string {
  const escapeCell = (value: string | number | null | undefined): string => {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  return lines.join('\n');
}
