export type NavigationPage =
  | 'overview'
  | 'stations'
  | 'prediction'
  | 'drainage'
  | 'gis'
  | 'alerts'
  | 'analytics'
  | 'reports'
  | 'devices'
  | 'administration'
  | 'settings';

export type BasinRegion =
  | 'All Basins'
  | 'Bharalu Basin'
  | 'Bahini Basin'
  | 'Basistha-Jorabat Basin'
  | 'Brahmaputra North-West';

export type StationStatus = 'Normal' | 'Warning' | 'Critical' | 'Offline';

export type FloodRiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export type DetectionSeverity = 'Low' | 'Moderate' | 'High';

export type IncidentStatus =
  | 'New'
  | 'Acknowledged'
  | 'Assigned'
  | 'Inspection Required'
  | 'Resolved';

export type AlertCategory =
  | 'Flood Warning'
  | 'Critical Water Level'
  | 'Heavy Rainfall'
  | 'Drainage Blockage'
  | 'Device Offline'
  | 'Communication Failure';

export type AlertSeverity = 'Low' | 'Warning' | 'Critical';

export type UserRole =
  | 'Administrator'
  | 'Monitoring Operator'
  | 'Field Personnel'
  | 'Department Viewer';

export interface SensorReadingPoint {
  timestamp: string;
  label: string;
  waterLevelM: number;
  rainfallMmHr: number;
  deltaM: number;
  temperatureC?: number;
  humidityPct?: number;
}

export interface DeviceCommLog {
  timestamp: string;
  event: string;
  status: 'OK' | 'Delayed' | 'Timeout';
  latencyMs?: number;
}

export interface MonitoringStation {
  id: string;
  name: string;
  location: string;
  ward: string;
  basin: Exclude<BasinRegion, 'All Basins'>;
  lat: number;
  lng: number;
  isOnline: boolean;
  waterLevelM: number;
  warningThresholdM: number;
  criticalThresholdM: number;
  rainfallMmHr: number;
  waterLevelDeltaM: number;
  /** Optional sensors: undefined when hardware node does not carry that probe */
  temperatureC?: number;
  humidityPct?: number;
  batteryPct?: number;
  powerSource: 'Solar + Battery' | 'Mains AC' | 'Battery Only';
  signalQuality: 'Good' | 'Fair' | 'Weak' | 'No Signal';
  deviceHealth: 'Operational' | 'Degraded' | 'Maintenance Due' | 'Unreachable';
  lastCommunication: string;
  installedDate: string;
  supportedSensors: string[];
  history: SensorReadingPoint[];
  commLogs: DeviceCommLog[];
}

export interface FloodPredictionFactor {
  id: string;
  label: string;
  category: 'Hydrology' | 'Meteorology' | 'Drainage' | 'Historical';
  impact: 'High' | 'Moderate' | 'Low';
  measuredContext: string;
}

export interface PredictionSeriesPoint {
  timeLabel: string;
  observedLevelM: number | null;
  predictedLevelM: number | null;
  rainfallMmHr: number;
  riskScore: number;
}

export interface BasinFloodPrediction {
  id: string;
  basin: Exclude<BasinRegion, 'All Basins'>;
  stationRef: string;
  currentRisk: FloodRiskLevel;
  predictedRisk: FloodRiskLevel;
  forecastPeriod: string;
  predictionTimestamp: string;
  observedWaterLevelM: number;
  predictedPeakLevelM: number;
  warningThresholdM: number;
  rainfall24hMm: number;
  modelConfidencePct?: number;
  modelVersion: string;
  factors: FloodPredictionFactor[];
  series: PredictionSeriesPoint[];
}

export interface HistoricalPredictionRecord {
  id: string;
  timestamp: string;
  basin: Exclude<BasinRegion, 'All Basins'>;
  forecastWindow: string;
  predictedRisk: FloodRiskLevel;
  observedOutcome: FloodRiskLevel;
  predictedPeakM: number;
  observedPeakM: number;
  confidencePct?: number;
}

export interface DrainageCamera {
  id: string;
  name: string;
  location: string;
  basin: Exclude<BasinRegion, 'All Basins'>;
  lat: number;
  lng: number;
  connectivity: 'Online' | 'Intermittent' | 'Offline';
  monitoringStatus: 'Active Inspection' | 'Scheduled Capture' | 'Unavailable';
  lastCapturedAt: string;
  captureIntervalMin: number;
  imageUrl?: string;
}

export interface DetectionBoundingBox {
  id: string;
  label: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  confidencePct: number;
}

export interface DrainageDetection {
  id: string;
  cameraId: string;
  location: string;
  basin: Exclude<BasinRegion, 'All Basins'>;
  lat: number;
  lng: number;
  timestamp: string;
  imageUrl?: string;
  boxes: DetectionBoundingBox[];
  blockageEstimatePct: number;
  confidencePct?: number;
  severity: DetectionSeverity;
  status: IncidentStatus;
  assignedTeam: string;
  remarks: string;
  resolutionDetails: string;
  updatedAt: string;
}

export interface OperationalAlert {
  id: string;
  category: AlertCategory;
  title: string;
  location: string;
  basin: Exclude<BasinRegion, 'All Basins'>;
  sourceId: string;
  severity: AlertSeverity;
  triggeredAt: string;
  assignedDepartment: string;
  status: IncidentStatus;
  remarks: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  designation: string;
  department: string;
  role: UserRole;
  email: string;
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  action: string;
  target: string;
}

export interface SystemSettings {
  apiBaseUrl: string;
  telemetryPollingSec: number;
  defaultWarningRatioPct: number;
  defaultCriticalRatioPct: number;
  cvConfidenceThresholdPct: number;
  autoEscalateUnacknowledgedMin: number;
  retentionDaysTelemetry: number;
  retentionDaysImages: number;
  smsDispatchEnabled: boolean;
  emailDigestEnabled: boolean;
}

export interface DeviceFormInput {
  id: string;
  name: string;
  location: string;
  ward: string;
  basin: Exclude<BasinRegion, 'All Basins'>;
  lat: string;
  lng: string;
  warningThresholdM: string;
  criticalThresholdM: string;
  powerSource: 'Solar + Battery' | 'Mains AC' | 'Battery Only';
  supportsTemperature: boolean;
  supportsHumidity: boolean;
  supportsBattery: boolean;
}

export type PermissionAction =
  | 'view_monitoring'
  | 'acknowledge_alert'
  | 'assign_incident'
  | 'resolve_incident'
  | 'update_drainage_incident'
  | 'manage_devices'
  | 'export_reports'
  | 'manage_users'
  | 'edit_settings';
