import type { SyncStatus } from '../api/models.js';
import { syncStatusLabel } from '../i18n/ru.js';

const STATUS_COLORS: Record<SyncStatus, string> = {
  idle: '#6b7280',
  running: '#2563eb',
  success: '#059669',
  failed: '#dc2626',
  partial: '#d97706',
};

interface SyncStatusBadgeProps {
  status: SyncStatus;
}

export function SyncStatusBadge({ status }: SyncStatusBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        color: '#fff',
        background: STATUS_COLORS[status] ?? '#6b7280',
      }}
    >
      {syncStatusLabel(status)}
    </span>
  );
}
