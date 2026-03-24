export function formatRuntime(minutes) {
  if (!minutes || minutes <= 0) {
    return 'N/A';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function formatRating(value) {
  if (typeof value !== 'number') {
    return 'N/A';
  }

  return value.toFixed(1);
}

export function formatNumber(value) {
  if (typeof value !== 'number') {
    return '0';
  }

  return new Intl.NumberFormat('en-US').format(value);
}

export function toDateLabel(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}

export function relativeFromNow(value) {
  if (!value) {
    return 'just now';
  }

  const date = new Date(value);
  const delta = Date.now() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (delta < minute) {
    return 'just now';
  }
  if (delta < hour) {
    return `${Math.floor(delta / minute)}m ago`;
  }
  if (delta < day) {
    return `${Math.floor(delta / hour)}h ago`;
  }

  return `${Math.floor(delta / day)}d ago`;
}

