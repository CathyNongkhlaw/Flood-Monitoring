import React, { useMemo, useState } from 'react';
import type {
  AuditLogEntry,
  BasinRegion,
  DrainageDetection,
  MonitoringStation,
  NavigationPage,
  OperationalAlert,
  SystemSettings,
  SystemUser,
  UserRole,
} from './types/monitoring';
import {
  HISTORICAL_PREDICTIONS,
  INITIAL_ALERTS,
  INITIAL_AUDIT_LOG,
  INITIAL_CAMERAS,
  INITIAL_DETECTIONS,
  INITIAL_PREDICTIONS,
  INITIAL_SETTINGS,
  INITIAL_STATIONS,
  INITIAL_USERS,
} from './data/demoData';
import { AppShell } from './components/layout/AppShell';
import { SituationOverviewPage } from './pages/SituationOverviewPage';
import { MonitoringStationsPage } from './pages/MonitoringStationsPage';
import { FloodPredictionPage } from './pages/FloodPredictionPage';
import { DrainageInspectionPage } from './pages/DrainageInspectionPage';
import { GisMapPage } from './pages/GisMapPage';
import { AlertsIncidentsPage } from './pages/AlertsIncidentsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { DeviceManagementPage } from './pages/DeviceManagementPage';
import { AdministrationPage } from './pages/AdministrationPage';
import { SettingsPage } from './pages/SettingsPage';

const ACTOR_BY_ROLE: Record<UserRole, string> = {
  Administrator: 'Manashjyoti Baruah',
  'Monitoring Operator': 'Rituraj Kalita',
  'Field Personnel': 'Pranjal Das',
  'Department Viewer': 'Ananya Saikia',
};

function currentIstStamp(): string {
  const time = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `2026-11-20 ${time} IST`;
}

export default function App() {
  const [activePage, setActivePage] = useState<NavigationPage>('overview');
  const [selectedRegion, setSelectedRegion] = useState<BasinRegion>('All Basins');
  const [activeRole, setActiveRole] = useState<UserRole>('Administrator');

  const [stations, setStations] = useState<MonitoringStation[]>(INITIAL_STATIONS);
  const [cameras] = useState(INITIAL_CAMERAS);
  const [detections, setDetections] = useState<DrainageDetection[]>(INITIAL_DETECTIONS);
  const [alerts, setAlerts] = useState<OperationalAlert[]>(INITIAL_ALERTS);
  const [users, setUsers] = useState<SystemUser[]>(INITIAL_USERS);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOG);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [inspectStationId, setInspectStationId] = useState<string | null>(null);

  const appendAudit = (action: string, target: string) => {
    setAuditLog((prev) => [
      {
        id: `AUD-${9015 + prev.length}`,
        timestamp: currentIstStamp(),
        actor: ACTOR_BY_ROLE[activeRole],
        role: activeRole,
        action,
        target,
      },
      ...prev,
    ]);
  };

  const handleInspectStationFromOverview = (stationId: string) => {
    setInspectStationId(stationId);
    setActivePage('stations');
  };

  const handleUpdateDetection = (
    id: string,
    patch: Partial<
      Pick<DrainageDetection, 'status' | 'assignedTeam' | 'remarks' | 'resolutionDetails'>
    >
  ) => {
    const stamp = currentIstStamp();
    setDetections((prev) =>
      prev.map((det) => (det.id === id ? { ...det, ...patch, updatedAt: stamp } : det))
    );
    appendAudit(
      `Updated drainage incident (${patch.status ?? 'modified'}${
        patch.assignedTeam ? ` · ${patch.assignedTeam}` : ''
      })`,
      id
    );
  };

  const handleUpdateAlert = (
    id: string,
    patch: Partial<
      Pick<
        OperationalAlert,
        'status' | 'assignedDepartment' | 'remarks' | 'acknowledgedBy' | 'resolvedAt'
      >
    >
  ) => {
    setAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, ...patch } : alert))
    );
    appendAudit(`Updated alert status to ${patch.status ?? 'Modified'}`, id);
  };

  const handleAddStation = (station: MonitoringStation) => {
    setStations((prev) => [station, ...prev]);
    appendAudit(`Registered new IoT monitoring station (${station.name})`, station.id);
  };

  const handleEditStation = (id: string, updated: Partial<MonitoringStation>) => {
    setStations((prev) =>
      prev.map((st) => (st.id === id ? { ...st, ...updated } : st))
    );
    appendAudit(`Updated device configuration and sensor thresholds`, id);
  };

  const handleUpdateUserRole = (userId: string, role: UserRole) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    appendAudit(`Changed user role to ${role}`, userId);
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' }
          : u
      )
    );
    appendAudit(`Toggled account activation status`, userId);
  };

  const handleSaveSettings = (updated: SystemSettings) => {
    setSettings(updated);
    appendAudit('Updated system integration and threshold settings', 'SYS-CONFIG');
  };

  const badgeCounts = useMemo(() => {
    const scopedAlerts =
      selectedRegion === 'All Basins'
        ? alerts
        : alerts.filter((a) => a.basin === selectedRegion);
    const scopedDetections =
      selectedRegion === 'All Basins'
        ? detections
        : detections.filter((d) => d.basin === selectedRegion);
    const scopedStations =
      selectedRegion === 'All Basins'
        ? stations
        : stations.filter((s) => s.basin === selectedRegion);

    return {
      openAlerts: scopedAlerts.filter((a) => a.status !== 'Resolved').length,
      openDrainage: scopedDetections.filter((d) => d.status !== 'Resolved').length,
      offlineStations: scopedStations.filter((s) => !s.isOnline).length,
    };
  }, [alerts, detections, stations, selectedRegion]);

  return (
    <AppShell
      activePage={activePage}
      onNavigate={setActivePage}
      selectedRegion={selectedRegion}
      onRegionChange={setSelectedRegion}
      activeRole={activeRole}
      onRoleChange={setActiveRole}
      openAlertsCount={badgeCounts.openAlerts}
      openDrainageCount={badgeCounts.openDrainage}
      offlineStationsCount={badgeCounts.offlineStations}
    >
      {activePage === 'overview' && (
        <SituationOverviewPage
          stations={stations}
          cameras={cameras}
          detections={detections}
          alerts={alerts}
          predictions={INITIAL_PREDICTIONS}
          selectedRegion={selectedRegion}
          onNavigate={setActivePage}
          onInspectStation={handleInspectStationFromOverview}
        />
      )}

      {activePage === 'stations' && (
        <MonitoringStationsPage
          stations={stations}
          selectedRegion={selectedRegion}
          initialSelectedStationId={inspectStationId}
          onClearInitialStation={() => setInspectStationId(null)}
        />
      )}

      {activePage === 'prediction' && (
        <FloodPredictionPage
          predictions={INITIAL_PREDICTIONS}
          historicalPredictions={HISTORICAL_PREDICTIONS}
          selectedRegion={selectedRegion}
        />
      )}

      {activePage === 'drainage' && (
        <DrainageInspectionPage
          cameras={cameras}
          detections={detections}
          selectedRegion={selectedRegion}
          activeRole={activeRole}
          onUpdateDetection={handleUpdateDetection}
        />
      )}

      {activePage === 'gis' && (
        <GisMapPage
          stations={stations}
          cameras={cameras}
          detections={detections}
          alerts={alerts}
          selectedRegion={selectedRegion}
        />
      )}

      {activePage === 'alerts' && (
        <AlertsIncidentsPage
          alerts={alerts}
          selectedRegion={selectedRegion}
          activeRole={activeRole}
          onUpdateAlert={handleUpdateAlert}
        />
      )}

      {activePage === 'analytics' && (
        <AnalyticsPage
          stations={stations}
          alerts={alerts}
          detections={detections}
          selectedRegion={selectedRegion}
        />
      )}

      {activePage === 'reports' && (
        <ReportsPage
          stations={stations}
          alerts={alerts}
          detections={detections}
          selectedRegion={selectedRegion}
          activeRole={activeRole}
          onLogAudit={appendAudit}
        />
      )}

      {activePage === 'devices' && (
        <DeviceManagementPage
          stations={stations}
          selectedRegion={selectedRegion}
          activeRole={activeRole}
          onAddStation={handleAddStation}
          onEditStation={handleEditStation}
        />
      )}

      {activePage === 'administration' && (
        <AdministrationPage
          users={users}
          auditLog={auditLog}
          activeRole={activeRole}
          onUpdateUserRole={handleUpdateUserRole}
          onToggleUserStatus={handleToggleUserStatus}
        />
      )}

      {activePage === 'settings' && (
        <SettingsPage
          settings={settings}
          activeRole={activeRole}
          onSaveSettings={handleSaveSettings}
        />
      )}
    </AppShell>
  );
}
