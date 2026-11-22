import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canPerformAction,
  classifyStationStatus,
  computeOverviewMetrics,
  filterAlerts,
  filterStations,
  generateCsvExport,
  validateDeviceForm,
} from './floodLogic';
import type {
  DeviceFormInput,
  DrainageCamera,
  DrainageDetection,
  MonitoringStation,
  OperationalAlert,
} from '../types/monitoring';

const sampleStations: MonitoringStation[] = [
  {
    id: 'STN-BHR-01',
    name: 'Bharalu Sluice Gate',
    location: 'Bharalumukh Junction',
    ward: 'Ward 12',
    basin: 'Bharalu Basin',
    lat: 26.1712,
    lng: 91.7324,
    isOnline: true,
    waterLevelM: 3.45,
    warningThresholdM: 2.8,
    criticalThresholdM: 3.3,
    rainfallMmHr: 42.5,
    waterLevelDeltaM: 0.24,
    powerSource: 'Mains AC',
    signalQuality: 'Good',
    deviceHealth: 'Operational',
    lastCommunication: '2026-11-20 14:25 IST',
    installedDate: '2024-06-12',
    supportedSensors: ['Water Level', 'Rainfall'],
    history: [],
    commLogs: [],
  },
  {
    id: 'STN-BHN-02',
    name: 'Bahini Culvert North',
    location: 'Rukminigaon Bridge',
    ward: 'Ward 42',
    basin: 'Bahini Basin',
    lat: 26.1351,
    lng: 91.7982,
    isOnline: true,
    waterLevelM: 2.35,
    warningThresholdM: 2.2,
    criticalThresholdM: 2.9,
    rainfallMmHr: 19.0,
    waterLevelDeltaM: 0.08,
    powerSource: 'Solar + Battery',
    signalQuality: 'Fair',
    deviceHealth: 'Operational',
    lastCommunication: '2026-11-20 14:24 IST',
    installedDate: '2024-08-03',
    supportedSensors: ['Water Level', 'Rainfall'],
    history: [],
    commLogs: [],
  },
  {
    id: 'STN-BHR-03',
    name: 'Anil Nagar Pump Sump',
    location: 'Anil Nagar Main Drain',
    ward: 'Ward 28',
    basin: 'Bharalu Basin',
    lat: 26.1674,
    lng: 91.7711,
    isOnline: false,
    waterLevelM: 1.9,
    warningThresholdM: 2.5,
    criticalThresholdM: 3.1,
    rainfallMmHr: 0,
    waterLevelDeltaM: 0,
    powerSource: 'Battery Only',
    signalQuality: 'No Signal',
    deviceHealth: 'Unreachable',
    lastCommunication: '2026-11-20 09:10 IST',
    installedDate: '2023-11-18',
    supportedSensors: ['Water Level'],
    history: [],
    commLogs: [],
  },
];

const sampleAlerts: OperationalAlert[] = [
  {
    id: 'ALT-1001',
    category: 'Critical Water Level',
    title: 'Bharalu Sluice exceeds critical threshold',
    location: 'Bharalumukh Junction',
    basin: 'Bharalu Basin',
    sourceId: 'STN-BHR-01',
    severity: 'Critical',
    triggeredAt: '2026-11-20 14:15 IST',
    assignedDepartment: 'Flood Control Cell',
    status: 'New',
    remarks: '',
  },
  {
    id: 'ALT-1002',
    category: 'Device Offline',
    title: 'Station heartbeat timeout',
    location: 'Anil Nagar Main Drain',
    basin: 'Bharalu Basin',
    sourceId: 'STN-BHR-03',
    severity: 'Warning',
    triggeredAt: '2026-11-20 09:40 IST',
    assignedDepartment: 'Telemetry Maintenance',
    status: 'Acknowledged',
    remarks: 'Technician notified',
  },
  {
    id: 'ALT-1003',
    category: 'Flood Warning',
    title: 'Bahini Basin water rising',
    location: 'Rukminigaon Bridge',
    basin: 'Bahini Basin',
    sourceId: 'STN-BHN-02',
    severity: 'Warning',
    triggeredAt: '2026-11-20 13:50 IST',
    assignedDepartment: 'Zone-IV Operations',
    status: 'Resolved',
    remarks: 'Cleared',
  },
];

const sampleDetections: DrainageDetection[] = [
  {
    id: 'DET-501',
    cameraId: 'CAM-BHR-01',
    location: 'Bharalu Trash Screen',
    basin: 'Bharalu Basin',
    lat: 26.171,
    lng: 91.732,
    timestamp: '2026-11-20 14:18 IST',
    boxes: [],
    blockageEstimatePct: 78,
    severity: 'High',
    status: 'New',
    assignedTeam: 'Unassigned',
    remarks: '',
    resolutionDetails: '',
    updatedAt: '2026-11-20 14:18 IST',
  },
  {
    id: 'DET-502',
    cameraId: 'CAM-BHN-01',
    location: 'Bahini Culvert',
    basin: 'Bahini Basin',
    lat: 26.135,
    lng: 91.798,
    timestamp: '2026-11-20 11:05 IST',
    boxes: [],
    blockageEstimatePct: 30,
    severity: 'Low',
    status: 'Resolved',
    assignedTeam: 'Sanitation Squad B',
    remarks: '',
    resolutionDetails: 'Debris removed',
    updatedAt: '2026-11-20 12:40 IST',
  },
];

const sampleCameras: DrainageCamera[] = [
  {
    id: 'CAM-BHR-01',
    name: 'Bharalu Screen Cam',
    location: 'Bharalumukh',
    basin: 'Bharalu Basin',
    lat: 26.171,
    lng: 91.732,
    connectivity: 'Online',
    monitoringStatus: 'Active Inspection',
    lastCapturedAt: '2026-11-20 14:20 IST',
    captureIntervalMin: 5,
  },
  {
    id: 'CAM-BHN-01',
    name: 'Bahini Culvert Cam',
    location: 'Rukminigaon',
    basin: 'Bahini Basin',
    lat: 26.135,
    lng: 91.798,
    connectivity: 'Offline',
    monitoringStatus: 'Unavailable',
    lastCapturedAt: '2026-11-20 06:00 IST',
    captureIntervalMin: 10,
  },
];

test('classifyStationStatus handles Offline, Critical, Warning, and Normal thresholds', () => {
  assert.equal(classifyStationStatus(4.5, 2.5, 3.2, false), 'Offline');
  assert.equal(classifyStationStatus(3.2, 2.5, 3.2, true), 'Critical');
  assert.equal(classifyStationStatus(2.5, 2.5, 3.2, true), 'Warning');
  assert.equal(classifyStationStatus(2.49, 2.5, 3.2, true), 'Normal');
});

test('computeOverviewMetrics aggregates all operational KPIs and respects basin filtering', () => {
  const allMetrics = computeOverviewMetrics(
    sampleStations,
    sampleAlerts,
    sampleDetections,
    sampleCameras,
    'All Basins'
  );
  assert.equal(allMetrics.totalStations, 3);
  assert.equal(allMetrics.reportingStations, 2);
  assert.equal(allMetrics.offlineStations, 1);
  assert.equal(allMetrics.averageWaterLevelM, 2.9);
  assert.equal(allMetrics.exceedingWarningCount, 2);
  assert.equal(allMetrics.activeFloodWarnings, 1);
  assert.equal(allMetrics.openDrainageIncidents, 1);
  assert.equal(allMetrics.totalCameras, 2);
  assert.equal(allMetrics.onlineCameras, 1);

  const bharaluMetrics = computeOverviewMetrics(
    sampleStations,
    sampleAlerts,
    sampleDetections,
    sampleCameras,
    'Bharalu Basin'
  );
  assert.equal(bharaluMetrics.totalStations, 2);
  assert.equal(bharaluMetrics.reportingStations, 1);
  assert.equal(bharaluMetrics.averageWaterLevelM, 3.45);
});

test('filterStations filters by status, basin, and search text', () => {
  const critical = filterStations(sampleStations, {
    status: 'Critical',
    region: 'All Basins',
    search: '',
  });
  assert.deepEqual(
    critical.map((s) => s.id),
    ['STN-BHR-01']
  );

  const offline = filterStations(sampleStations, {
    status: 'Offline',
    region: 'Bharalu Basin',
    search: 'anil',
  });
  assert.deepEqual(
    offline.map((s) => s.id),
    ['STN-BHR-03']
  );
});

test('filterAlerts filters open alerts and severity properly', () => {
  const openAlerts = filterAlerts(sampleAlerts, {
    region: 'All Basins',
    category: 'All',
    severity: 'All',
    status: 'Open',
    search: '',
  });
  assert.equal(openAlerts.length, 2);
});

test('validateDeviceForm rejects empty fields, duplicate IDs, and invalid thresholds', () => {
  const emptyInput: DeviceFormInput = {
    id: '',
    name: '',
    location: '',
    ward: '',
    basin: 'Bharalu Basin',
    lat: '',
    lng: '',
    warningThresholdM: '',
    criticalThresholdM: '',
    powerSource: 'Mains AC',
    supportsTemperature: false,
    supportsHumidity: false,
    supportsBattery: false,
  };
  const emptyRes = validateDeviceForm(emptyInput, ['STN-BHR-01']);
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.errors.id);
  assert.ok(emptyRes.errors.name);
  assert.ok(emptyRes.errors.lat);

  const dupRes = validateDeviceForm(
    {
      ...emptyInput,
      id: 'STN-BHR-01',
      name: 'Test',
      location: 'Loc',
      ward: 'Ward 1',
      lat: '26.15',
      lng: '91.75',
      warningThresholdM: '3.0',
      criticalThresholdM: '2.5',
    },
    ['STN-BHR-01']
  );
  assert.equal(dupRes.valid, false);
  assert.ok(dupRes.errors.id?.includes('already exists'));
  assert.ok(dupRes.errors.criticalThresholdM?.includes('strictly greater'));

  const validRes = validateDeviceForm(
    {
      ...emptyInput,
      id: 'STN-NEW-09',
      name: 'Dispur Drain Node',
      location: 'GS Road Culvert',
      ward: 'Ward 31',
      lat: '26.143',
      lng: '91.789',
      warningThresholdM: '2.4',
      criticalThresholdM: '3.1',
    },
    ['STN-BHR-01']
  );
  assert.equal(validRes.valid, true);
});

test('canPerformAction enforces role-based access control matrix', () => {
  assert.equal(canPerformAction('Administrator', 'manage_users'), true);
  assert.equal(canPerformAction('Monitoring Operator', 'acknowledge_alert'), true);
  assert.equal(canPerformAction('Monitoring Operator', 'manage_devices'), false);
  assert.equal(canPerformAction('Field Personnel', 'update_drainage_incident'), true);
  assert.equal(canPerformAction('Field Personnel', 'edit_settings'), false);
  assert.equal(canPerformAction('Department Viewer', 'export_reports'), true);
  assert.equal(canPerformAction('Department Viewer', 'acknowledge_alert'), false);
});

test('generateCsvExport properly escapes commas, quotes, and newlines', () => {
  const csv = generateCsvExport(
    ['Station ID', 'Location', 'Level (m)'],
    [['STN-01', 'GS Road, "North" Gate', 2.45]]
  );
  assert.equal(
    csv,
    'Station ID,Location,Level (m)\nSTN-01,"GS Road, ""North"" Gate",2.45'
  );
});
