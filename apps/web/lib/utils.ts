/**
 * Format a number as Nigerian Naira
 * e.g. 250000 → "₦2,500"
 */
export function formatNgn(amountNgn: number): string {
  return new Intl.NumberFormat('en-NG', {
    style:    'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountNgn);
}

/**
 * Format seconds → "HH:MM:SS" or "MM:SS"
 */
export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h   = Math.floor(seconds / 3600);
  const m   = Math.floor((seconds % 3600) / 60);
  const s   = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format minutes → "2h 14m" or "45m"
 */
export function formatDuration(minutes: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0)           return `${h}h`;
  return `${m}m`;
}

/**
 * Days remaining until a date
 * Returns 0 if already past
 */
export function getDaysRemaining(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

/**
 * Human-readable relative time (e.g. "2 days ago", "just now")
 */
export function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60)    return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60)    return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)   return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)     return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4)    return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12)  return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * Clamp a number between min and max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, len: number): string {
  return str.length > len ? `${str.slice(0, len)}…` : str;
}

/**
 * Generate device fingerprint (used for download binding)
 */
export async function getDeviceId(): Promise<string> {
  const stored = localStorage.getItem('av_device_id');
  if (stored) return stored;
  const arr  = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const id   = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('av_device_id', id);
  return id;
}

/**
 * Convert bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824)  return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/**
 * Country code → flag emoji
 */
export function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(0x1F1E0 - 65 + c.charCodeAt(0)));
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
