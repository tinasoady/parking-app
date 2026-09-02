import { Buffer } from 'buffer';
import type { AppSettings, ParkingDay, Ticket } from '../types';
import { EscPosBuilder } from './escpos';
import { centered, separator, twoColumns } from './textUtils';
import { formatCurrency, formatDateLabel, formatDateTime, formatDurationMinutes, formatTime } from '../utils/format';

function header(b: EscPosBuilder, settings: AppSettings, width: number): void {
  b.align('center').doubleSize(true).bold(true);
  b.line(settings.businessName || 'Parking');
  b.doubleSize(false).bold(false);
  if (settings.businessAddress) {
    b.line(settings.businessAddress);
  }
  b.line(separator(width));
  b.align('left');
}

export function buildEntryTicket(ticket: Ticket, settings: AppSettings): Buffer {
  const w = settings.printerLineWidth;
  const b = new EscPosBuilder();
  b.init();
  header(b, settings, w);
  b.align('center').doubleSize(true).bold(true);
  b.line(`TICKET N° ${ticket.ticketNumber.toString().padStart(4, '0')}`);
  b.doubleSize(false).bold(false).align('left');
  b.line(separator(w));
  b.line(twoColumns('Entrée', formatDateTime(ticket.entryTime), w));
  if (ticket.plate) {
    b.line(twoColumns('Véhicule', ticket.plate, w));
  }
  b.line(separator(w));
  b.align('center');
  b.line('Conservez ce ticket');
  b.line('et présentez-le à la sortie');
  b.feed(3);
  b.cut();
  return b.build();
}

export function buildExitReceipt(ticket: Ticket, settings: AppSettings): Buffer {
  const w = settings.printerLineWidth;
  const b = new EscPosBuilder();
  b.init();
  header(b, settings, w);
  b.align('center').bold(true);
  b.line(`REÇU - TICKET N° ${ticket.ticketNumber.toString().padStart(4, '0')}`);
  b.bold(false).align('left');
  b.line(separator(w));
  if (ticket.plate) {
    b.line(twoColumns('Véhicule', ticket.plate, w));
  }
  b.line(twoColumns('Entrée', formatDateTime(ticket.entryTime), w));
  b.line(twoColumns('Sortie', ticket.exitTime ? formatDateTime(ticket.exitTime) : '-', w));
  b.line(twoColumns('Durée', ticket.durationMinutes != null ? formatDurationMinutes(ticket.durationMinutes) : '-', w));
  b.line(separator(w));
  b.line(twoColumns('Sous-total', formatCurrency(ticket.baseAmount ?? 0, settings), w));
  if (ticket.bonusLabel && (ticket.bonusDeduction ?? 0) > 0) {
    b.line(twoColumns(ticket.bonusLabel, `-${formatCurrency(ticket.bonusDeduction ?? 0, settings)}`, w));
  }
  b.line(separator(w));
  b.bold(true).doubleSize(true);
  b.line(twoColumns('TOTAL', formatCurrency(ticket.finalAmount ?? 0, settings), Math.floor(w / 2)));
  b.doubleSize(false).bold(false);
  b.line(separator(w));
  b.align('center');
  b.line('Merci de votre visite !');
  b.feed(3);
  b.cut();
  return b.build();
}

export function buildDailyReport(day: ParkingDay, tickets: Ticket[], settings: AppSettings): Buffer {
  const w = settings.printerLineWidth;
  const b = new EscPosBuilder();
  b.init();
  header(b, settings, w);
  b.align('center').bold(true);
  b.line('RAPPORT JOURNALIER');
  b.bold(false);
  b.line(formatDateLabel(day.dateLabel));
  b.align('left');
  b.line(separator(w));
  b.line(twoColumns('Ouverture', formatDateTime(day.openedAt), w));
  if (day.closedAt) {
    b.line(twoColumns('Clôture', formatDateTime(day.closedAt), w));
  }
  b.line(separator(w));

  const paid = tickets.filter((t) => t.status === 'paid');
  const stillParked = tickets.filter((t) => t.status === 'in_progress');

  for (const t of paid) {
    const num = `#${t.ticketNumber.toString().padStart(4, '0')}`;
    const plate = t.plate ? ` ${t.plate}` : '';
    b.line(twoColumns(`${num}${plate}`, formatCurrency(t.finalAmount ?? 0, settings), w));
    b.line(`   ${formatTime(t.entryTime)} -> ${t.exitTime ? formatTime(t.exitTime) : '-'}`);
  }

  if (paid.length === 0) {
    b.align('center');
    b.line('Aucun véhicule encaissé');
    b.align('left');
  }

  b.line(separator(w));
  if (stillParked.length > 0) {
    b.line(`${stillParked.length} véhicule(s) encore stationné(s)`);
    b.line(separator(w));
  }

  b.bold(true);
  b.line(twoColumns('Total véhicules', String(paid.length), w));
  b.doubleSize(true);
  b.line(twoColumns('RECETTE', formatCurrency(paid.reduce((sum, t) => sum + (t.finalAmount ?? 0), 0), settings), Math.floor(w / 2)));
  b.doubleSize(false).bold(false);
  b.line(separator(w));
  b.align('center');
  b.line(`Imprimé le ${formatDateTime(new Date().toISOString())}`);
  b.feed(4);
  b.cut();
  return b.build();
}

export function buildTestPrint(settings: AppSettings): Buffer {
  const w = settings.printerLineWidth;
  const b = new EscPosBuilder();
  b.init();
  b.align('center').bold(true);
  b.line('TEST IMPRESSION');
  b.bold(false);
  b.line(centered(settings.businessName || 'Parking', w));
  b.line(separator(w));
  b.align('left');
  b.line('Si vous lisez ce ticket,');
  b.line("l'imprimante est bien connectée.");
  b.feed(3);
  b.cut();
  return b.build();
}
