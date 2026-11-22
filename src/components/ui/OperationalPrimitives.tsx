import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Lock,
  MinusCircle,
} from 'lucide-react';

type SemanticTone = 'normal' | 'warning' | 'critical' | 'offline' | 'info';

const TONE_STYLES: Record<SemanticTone, { wrap: string; icon: React.ReactNode }> = {
  normal: {
    wrap: 'text-[#14532D] bg-[#ECFDF3] border-[#BBF7D0]',
    icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#15803D]" aria-hidden="true" />,
  },
  warning: {
    wrap: 'text-[#78350F] bg-[#FFFBEB] border-[#FDE68A]',
    icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#B45309]" aria-hidden="true" />,
  },
  critical: {
    wrap: 'text-[#7F1D1D] bg-[#FEF2F2] border-[#FECACA]',
    icon: <AlertOctagon className="w-3.5 h-3.5 shrink-0 text-[#B91C1C]" aria-hidden="true" />,
  },
  offline: {
    wrap: 'text-[#334155] bg-[#F1F5F9] border-[#CBD5E1]',
    icon: <MinusCircle className="w-3.5 h-3.5 shrink-0 text-[#64748B]" aria-hidden="true" />,
  },
  info: {
    wrap: 'text-[#1E3A5F] bg-[#EFF6FF] border-[#BFDBFE]',
    icon: null,
  },
};

export function resolveStatusTone(label: string): SemanticTone {
  const normalized = label.toLowerCase();
  if (
    normalized === 'critical' ||
    normalized === 'high' ||
    normalized === 'unreachable' ||
    normalized === 'timeout'
  ) {
    return 'critical';
  }
  if (
    normalized === 'warning' ||
    normalized === 'moderate' ||
    normalized === 'degraded' ||
    normalized === 'intermittent' ||
    normalized === 'delayed' ||
    normalized === 'inspection required' ||
    normalized === 'maintenance due' ||
    normalized === 'new'
  ) {
    return 'warning';
  }
  if (
    normalized === 'normal' ||
    normalized === 'low' ||
    normalized === 'online' ||
    normalized === 'operational' ||
    normalized === 'active' ||
    normalized === 'active inspection' ||
    normalized === 'resolved' ||
    normalized === 'ok'
  ) {
    return 'normal';
  }
  if (
    normalized === 'acknowledged' ||
    normalized === 'assigned' ||
    normalized === 'scheduled capture'
  ) {
    return 'info';
  }
  return 'offline';
}

export function StatusBadge({
  label,
  tone,
  showIcon = true,
}: {
  label: string;
  tone?: SemanticTone;
  showIcon?: boolean;
}) {
  const resolved = tone ?? resolveStatusTone(label);
  const style = TONE_STYLES[resolved];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded-md whitespace-nowrap leading-tight ${style.wrap}`}
    >
      {showIcon && style.icon}
      <span>{label}</span>
    </span>
  );
}

export function SectionPanel({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = '',
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`bg-white border border-[#E6E2DA] rounded-lg overflow-hidden shadow-2xs flex flex-col ${className}`}
    >
      <div className="px-4 py-3 border-b border-[#EAE6DF] border-l-4 border-l-[#0D9488] bg-gradient-to-r from-[#F0FDFA] via-[#FAF9F6] to-white flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[#163A5F] tracking-tight leading-snug">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11.5px] text-[#5C6670] mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function MetricStripItem({
  label,
  value,
  unit,
  subtext,
  tone = 'default',
  icon,
  variant = 'strip',
}: {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  tone?: 'default' | 'normal' | 'warning' | 'critical' | 'muted';
  icon?: React.ReactNode;
  variant?: 'strip' | 'card';
}) {
  const toneStyles = {
    critical: {
      value: 'text-[#B91C1C]',
      border: 'border-t-2 border-t-[#DC2626]',
      iconBg: 'bg-[#FEF2F2] text-[#DC2626]',
    },
    warning: {
      value: 'text-[#B45309]',
      border: 'border-t-2 border-t-[#D97706]',
      iconBg: 'bg-[#FFFBEB] text-[#D97706]',
    },
    normal: {
      value: 'text-[#0F766E]',
      border: 'border-t-2 border-t-[#0D9488]',
      iconBg: 'bg-[#F0FDFA] text-[#0D9488]',
    },
    muted: {
      value: 'text-[#475569]',
      border: 'border-t-2 border-t-[#94A3B8]',
      iconBg: 'bg-[#F1F5F9] text-[#64748B]',
    },
    default: {
      value: 'text-[#163A5F]',
      border: 'border-t-2 border-t-[#163A5F]',
      iconBg: 'bg-[#F4F2EE] text-[#163A5F]',
    },
  }[tone];

 if (variant === 'card') {
    return (
      <div
        className={`px-3 py-2 bg-white border border-[#E6E2DA] ${toneStyles.border} rounded-md shadow-2xs flex flex-col justify-between min-w-0`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10.5px] font-semibold text-[#5C6670] tracking-tight truncate">
            {label}
          </span>
          {icon && (
            <span className={`shrink-0 opacity-80 ${toneStyles.value}`} aria-hidden="true">
              {icon}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            className={`text-[18px] font-bold font-mono tabular-nums tracking-tight leading-none ${toneStyles.value}`}
          >
            {value}
          </span>
          {unit && (
            <span className="text-[11px] font-mono font-medium text-[#5C6670]">
              {unit}
            </span>
          )}
        </div>
        {subtext && (
          <span className="mt-1 text-[10px] text-[#64748B] truncate">
            {subtext}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="px-3.5 py-2.5 bg-white flex flex-col justify-between min-w-0">
      <span className="text-[11px] font-medium text-[#4B5563] leading-tight">
        {label}
      </span>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`text-[20px] font-semibold font-mono tabular-nums leading-none ${toneStyles.value}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[11px] font-mono text-[#64748B]">{unit}</span>
        )}
      </div>
      {subtext && (
        <span className="mt-1 text-[11px] text-[#64748B] truncate">
          {subtext}
        </span>
      )}
    </div>
  );
}

export function PermissionNotice({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#334155] bg-[#F4F2EE] border border-[#CBD5E1] rounded-md"
    >
      <Lock className="w-3.5 h-3.5 text-[#64748B] shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function TableEmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="px-6 py-10 text-center text-[#5C6670]">
      <p className="text-[13px]">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 px-3 py-1.5 text-[12px] font-medium text-[#0D9488] border border-[#0D9488] rounded-md hover:bg-[#EFF6FF] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
