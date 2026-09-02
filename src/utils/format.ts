import type { AppSettings } from '../types';

export function formatCurrency(amount: number, settings: Pick<AppSettings, 'currencySymbol' | 'currencyDecimals'>): string {
  const value = amount.toFixed(settings.currencyDecimals);
  const withThousands = value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${withThousands} ${settings.currencySymbol}`;
}

export function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes} min`;
  }
  return `${hours} h ${minutes.toString().padStart(2, '0')}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('fr-FR')} ${formatTime(iso)}`;
}

export function formatDateLabel(dateLabel: string): string {
  const d = new Date(`${dateLabel}T00:00:00`);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
