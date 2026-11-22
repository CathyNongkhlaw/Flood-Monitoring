import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Camera,
  CloudRain,
  Cpu,
  FileText,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  Radio,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { BasinRegion, NavigationPage, UserRole } from '../../types/monitoring';

interface NavItem {
  id: NavigationPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'Operations' | 'Intelligence & GIS' | 'Infrastructure & Admin';
  badgeCount?: number;
}

interface AppShellProps {
  activePage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  selectedRegion: BasinRegion;
  onRegionChange: (region: BasinRegion) => void;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  openAlertsCount: number;
  openDrainageCount: number;
  offlineStationsCount: number;
  children: React.ReactNode;
}

const REGIONS: BasinRegion[] = [
  'All Basins',
  'Bharalu Basin',
  'Bahini Basin',
  'Basistha-Jorabat Basin',
  'Brahmaputra North-West',
];

export function AppShell({
  activePage,
  onNavigate,
  selectedRegion,
  onRegionChange,
  activeRole,
  openAlertsCount,
  openDrainageCount,
  offlineStationsCount,
  children,
}: AppShellProps) {
  const [clockText, setClockText] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
      setClockText(`${formatted} IST`);
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Situation Overview', icon: LayoutDashboard, group: 'Operations' },
    {
      id: 'stations',
      label: 'Monitoring Stations',
      icon: Radio,
      group: 'Operations',
      badgeCount: offlineStationsCount > 0 ? offlineStationsCount : undefined,
    },
    { id: 'prediction', label: 'Flood Prediction', icon: CloudRain, group: 'Intelligence & GIS' },
    {
      id: 'drainage',
      label: 'Drainage Inspection',
      icon: Camera,
      group: 'Operations',
      badgeCount: openDrainageCount > 0 ? openDrainageCount : undefined,
    },
    { id: 'gis', label: 'GIS Map', icon: MapIcon, group: 'Intelligence & GIS' },
    {
      id: 'alerts',
      label: 'Alerts & Incidents',
      icon: AlertTriangle,
      group: 'Operations',
      badgeCount: openAlertsCount > 0 ? openAlertsCount : undefined,
    },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, group: 'Intelligence & GIS' },
    { id: 'reports', label: 'Reports', icon: FileText, group: 'Intelligence & GIS' },
    { id: 'devices', label: 'Device Management', icon: Cpu, group: 'Infrastructure & Admin' },
    { id: 'administration', label: 'Administration', icon: ShieldCheck, group: 'Infrastructure & Admin' },
    { id: 'settings', label: 'Settings', icon: Settings, group: 'Infrastructure & Admin' },
  ];

  // Keep user's exact requested navigation order
  const orderedNav: NavItem[] = [
    navItems[0],
    navItems[1],
    navItems[2],
    navItems[3],
    navItems[4],
    navItems[5],
    navItems[6],
    navItems[7],
    navItems[8],
    navItems[9],
    navItems[10],
  ];

  const handleNavClick = (id: NavigationPage) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#111827]">
      {/* Government Portal Top Navigation Bar */}
      {/* Civic Portal Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#163A5F] via-[#1B4670] to-[#163A5F] text-white border-b-2 border-[#0D9488] shadow-sm">
        <div className="px-5 py-3.5 flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-1.5 text-white/90 hover:bg-white/10 rounded-md"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[17px] font-bold tracking-tight leading-tight text-white truncate">
                  Urban Flood &amp; Drainage Monitoring
                </h1>
                <span className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#0D9488]/25 text-[#99F6E4] border border-[#14B8A6]/30 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF] animate-pulse" />
                  Demo Telemetry
                </span>
              </div>
              <p className="text-[12px] text-[#CBD5E1] truncate mt-0.5">
                Kamrup Metropolitan Urban Drainage Division · Civic Operations Portal
              </p>
            </div>
          </div>

          {/* Right Controls: Live Clock & Region Selector */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden lg:flex flex-col items-end text-right pr-3 border-r border-white/15">
              <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
                Local Time
              </span>
              <span className="text-[12px] font-mono tabular-nums text-white/95">
                {clockText}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="region-selector"
                className="hidden sm:inline text-[11px] font-medium text-[#CBD5E1] whitespace-nowrap"
              >
                Basin
              </label>
              <select
                id="region-selector"
                value={selectedRegion}
                onChange={(e) => onRegionChange(e.target.value as BasinRegion)}
                className="bg-[#12304F] hover:bg-[#1E4D7B] text-white text-[12px] font-medium border border-white/20 rounded-md px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/60"
              >
                {REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region === 'All Basins' ? 'All Basins (Kamrup Metro)' : region}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Persistent Left Navigation Panel */}
        <aside
          aria-label="Primary portal navigation"
          className={`${
            mobileMenuOpen ? 'fixed inset-y-0 left-0 z-40 pt-16 flex' : 'hidden'
          } lg:flex lg:sticky lg:top-[76px] lg:h-[calc(100vh-76px)] lg:pt-0 w-[232px] shrink-0 bg-[#FFFFFF] border-r border-[#E6E2DA] flex-col`}
        >
          <div className="px-3 py-2.5 border-b border-[#EAE6DF] bg-[#F4F2EE]">
            <div className="text-[11px] font-semibold text-[#475569] tracking-wide">
              OPERATIONAL MODULES
            </div>
          </div>
          <nav className="flex-1 py-2 overflow-y-auto">
            <ul className="space-y-0.5 px-2">
              {orderedNav.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-[13px] rounded-md transition-colors text-left ${
                        isActive
                          ? 'bg-[#163A5F] text-white font-medium'
                          : 'text-[#1F2937] hover:bg-[#EDF2F7] font-normal'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-[#475569]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badgeCount !== undefined && (
                        <span
                          className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md leading-none ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : item.id === 'alerts'
                                ? 'bg-[#FEE2E2] text-[#991B1B]'
                                : 'bg-[#EAE6DF] text-[#334155]'
                          }`}
                        >
                          {item.badgeCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Quiet System Metadata Footer in Sidebar */}
          <div className="p-3 border-t border-[#EAE6DF] bg-[#F4F2EE] text-[11px] text-[#5C6670] space-y-1">
            <div className="flex items-center justify-between">
              <span>Active Role</span>
              <span className="font-medium text-[#163A5F]">{activeRole}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Basin Scope</span>
              <span className="font-medium text-[#334155] truncate max-w-[120px]">
                {selectedRegion}
              </span>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 lg:p-5 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}