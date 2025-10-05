export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatWorkOrderStatus(value: string): string {
  if (!value) {
    return '';
  }

  const normalized = value.replace(/_/g, ' ').trim();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatWorkOrderPriority(value: string): string {
  if (!value) {
    return '';
  }

  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
