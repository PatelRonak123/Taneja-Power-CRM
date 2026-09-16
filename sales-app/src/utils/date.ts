/**
 * Format ISO date string into readable local/IST format (e.g. 16 Sep 2026)
 */
export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
};

/**
 * Format ISO date string into readable time string (e.g. 09:30 AM)
 */
export const formatTime = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '—';
  }
};

/**
 * Format ISO date string into full datetime string (e.g. 16 Sep 2026, 09:30 AM)
 */
export const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return `${formatDate(dateString)}, ${formatTime(dateString)}`;
  } catch {
    return '—';
  }
};

/**
 * Format total minutes into hours and minutes string (e.g. 8h 45m)
 */
export const formatDuration = (totalMinutes?: number | null): string => {
  if (totalMinutes === undefined || totalMinutes === null || totalMinutes <= 0) {
    return '—';
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
};
