import React, { useState } from 'react';
import type {
  AuditLogEntry,
  PermissionAction,
  SystemUser,
  UserRole,
} from '../types/monitoring';
import { canPerformAction } from '../utils/floodLogic';
import {
  PermissionNotice,
  SectionPanel,
  StatusBadge,
} from '../components/ui/OperationalPrimitives';

interface AdministrationPageProps {
  users: SystemUser[];
  auditLog: AuditLogEntry[];
  activeRole: UserRole;
  onUpdateUserRole: (userId: string, role: UserRole) => void;
  onToggleUserStatus: (userId: string) => void;
}

const ROLES: UserRole[] = [
  'Administrator',
  'Monitoring Operator',
  'Field Personnel',
  'Department Viewer',
];

const PERMISSION_ROWS: Array<{ action: PermissionAction; label: string }> = [
  { action: 'view_monitoring', label: 'View Live Monitoring, GIS & Predictions' },
  { action: 'acknowledge_alert', label: 'Acknowledge Operational Alerts' },
  { action: 'assign_incident', label: 'Assign Field Teams to Incidents' },
  { action: 'update_drainage_incident', label: 'Update Drainage Inspection Incidents' },
  { action: 'resolve_incident', label: 'Mark Incidents & Alerts Resolved' },
  { action: 'export_reports', label: 'Generate & Export Municipal Reports (CSV/PDF)' },
  { action: 'manage_devices', label: 'Register & Configure IoT Devices' },
  { action: 'manage_users', label: 'Manage Operator Accounts & Roles' },
  { action: 'edit_settings', label: 'Modify System Thresholds & API Settings' },
];

export function AdministrationPage({
  users,
  auditLog,
  activeRole,
  onUpdateUserRole,
  onToggleUserStatus,
}: AdministrationPageProps) {
  const canManageUsers = canPerformAction(activeRole, 'manage_users');
  const [notice, setNotice] = useState<string | null>(null);

  const handleRoleChange = (user: SystemUser, newRole: UserRole) => {
    if (!canManageUsers) return;
    onUpdateUserRole(user.id, newRole);
    setNotice(`Updated role for ${user.name} (${user.id}) to ${newRole}.`);
  };

  const handleStatusToggle = (user: SystemUser) => {
    if (!canManageUsers) return;
    onToggleUserStatus(user.id);
    setNotice(
      `${user.name} (${user.id}) set to ${user.status === 'Active' ? 'Inactive' : 'Active'}.`
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] font-semibold text-[#163A5F] tracking-tight">
          Administration &amp; Role-Based Access Control
        </h2>
        <p className="text-[12px] text-[#5C6670]">
          Operator directory, departmental access matrix, and operational accountability log
        </p>
      </div>

      {!canManageUsers && (
        <PermissionNotice
          message={`Current role (${activeRole}) cannot modify operator accounts or role assignments. Switch to Administrator in the top navigation bar to manage user access.`}
        />
      )}

      {notice && (
        <div
          role="status"
          className="px-3.5 py-2 text-[12px] font-medium text-[#14532D] bg-[#ECFDF3] border border-[#BBF7D0] rounded-md"
        >
          {notice}
        </div>
      )}

      {/* User Directory */}
      <SectionPanel
        title={`Registered Portal Accounts (${users.length})`}
        subtitle="Use the Role selector in the top header bar to preview interface permissions for each role"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                <th className="py-2 px-3">User ID</th>
                <th className="py-2 px-3">Name &amp; Designation</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Assigned Role</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Last Login</th>
                <th className="py-2 px-3 text-right">Access Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE6DF]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[#F4F2EE]">
                  <td className="py-2 px-3 font-mono font-medium text-[#163A5F] whitespace-nowrap">
                    {user.id}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-medium text-[#111827]">{user.name}</div>
                    <div className="text-[11px] text-[#64748B]">
                      {user.designation} · {user.email}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-[#334155]">{user.department}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {canManageUsers ? (
                      <select
                        aria-label={`Role for ${user.name}`}
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                        className="text-[12px] border border-[#CBD5E1] rounded-md px-2 py-1 bg-white"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium text-[#163A5F]">{user.role}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <StatusBadge label={user.status} />
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-[11px] text-[#5C6670] whitespace-nowrap">
                    {user.lastLogin}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      disabled={!canManageUsers}
                      onClick={() => handleStatusToggle(user)}
                      className="px-2.5 py-1 text-[11px] font-medium text-[#334155] border border-[#CBD5E1] rounded-md hover:bg-[#F1F5F9] disabled:opacity-50"
                    >
                      {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Role Permission Matrix & Audit Trail */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <SectionPanel
          title="Role-Based Permission Matrix"
          subtitle="Enforced across all operational workflows"
          className="xl:col-span-6"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                  <th className="py-2 px-3">Capability</th>
                  {ROLES.map((r) => (
                    <th key={r} className="py-2 px-2 text-center whitespace-nowrap">
                      {r.replace('Monitoring ', 'Mon. ').replace('Department ', 'Dept. ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF]">
                {PERMISSION_ROWS.map((row) => (
                  <tr key={row.action} className="hover:bg-[#F4F2EE]">
                    <td className="py-2 px-3 text-[#1F2937]">{row.label}</td>
                    {ROLES.map((r) => {
                      const allowed = canPerformAction(r, row.action);
                      return (
                        <td key={r} className="py-2 px-2 text-center font-mono text-[11px]">
                          <span
                            className={
                              allowed
                                ? 'text-[#15803D] font-semibold'
                                : 'text-[#94A3B8]'
                            }
                          >
                            {allowed ? 'Allowed' : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>

        <SectionPanel
          title="Operational Audit Log"
          subtitle="Chronological log of control-room acknowledgments, assignments, device changes, and exports"
          className="xl:col-span-6"
        >
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F4F2EE] border-b border-[#EAE6DF] text-[11px] font-semibold text-[#475569]">
                  <th className="py-2 px-3">Timestamp</th>
                  <th className="py-2 px-3">Actor</th>
                  <th className="py-2 px-3">Action</th>
                  <th className="py-2 px-3 text-right">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DF]">
                {auditLog.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#F4F2EE]">
                    <td className="py-2 px-3 font-mono text-[11px] text-[#5C6670] whitespace-nowrap">
                      {entry.timestamp}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="font-medium text-[#111827]">{entry.actor}</div>
                      <div className="text-[10px] text-[#64748B]">{entry.role}</div>
                    </td>
                    <td className="py-2 px-3 text-[#334155]">{entry.action}</td>
                    <td className="py-2 px-3 text-right font-mono text-[11px] text-[#163A5F] whitespace-nowrap">
                      {entry.target}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
