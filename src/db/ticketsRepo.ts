import { getDatabase } from './database';
import type { Ticket } from '../types';

interface TicketRow {
  id: number;
  day_id: number;
  ticket_number: number;
  plate: string | null;
  entry_time: string;
  exit_time: string | null;
  duration_minutes: number | null;
  base_amount: number | null;
  bonus_label: string | null;
  bonus_deduction: number | null;
  final_amount: number | null;
  status: 'in_progress' | 'paid';
  created_at: string;
}

function mapRow(row: TicketRow): Ticket {
  return {
    id: row.id,
    dayId: row.day_id,
    ticketNumber: row.ticket_number,
    plate: row.plate,
    entryTime: row.entry_time,
    exitTime: row.exit_time,
    durationMinutes: row.duration_minutes,
    baseAmount: row.base_amount,
    bonusLabel: row.bonus_label,
    bonusDeduction: row.bonus_deduction,
    finalAmount: row.final_amount,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function createEntryTicket(dayId: number, plate: string): Promise<Ticket> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const maxRow = await db.getFirstAsync<{ maxNumber: number | null }>(
    'SELECT MAX(ticket_number) as maxNumber FROM tickets WHERE day_id = ?',
    dayId
  );
  const ticketNumber = (maxRow?.maxNumber ?? 0) + 1;
  const result = await db.runAsync(
    "INSERT INTO tickets (day_id, ticket_number, plate, entry_time, status, created_at) VALUES (?, ?, ?, ?, 'in_progress', ?)",
    dayId,
    ticketNumber,
    plate.trim() || null,
    now,
    now
  );
  const row = await db.getFirstAsync<TicketRow>('SELECT * FROM tickets WHERE id = ?', result.lastInsertRowId);
  if (!row) {
    throw new Error('Impossible de créer le ticket');
  }
  return mapRow(row);
}

export async function listActiveTickets(dayId: number): Promise<Ticket[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TicketRow>(
    "SELECT * FROM tickets WHERE day_id = ? AND status = 'in_progress' ORDER BY ticket_number DESC",
    dayId
  );
  return rows.map(mapRow);
}

export async function listTicketsForDay(dayId: number): Promise<Ticket[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TicketRow>('SELECT * FROM tickets WHERE day_id = ? ORDER BY ticket_number ASC', dayId);
  return rows.map(mapRow);
}

export async function getTicketById(ticketId: number): Promise<Ticket | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TicketRow>('SELECT * FROM tickets WHERE id = ?', ticketId);
  return row ? mapRow(row) : null;
}

export async function countActiveTickets(dayId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM tickets WHERE day_id = ? AND status = 'in_progress'",
    dayId
  );
  return row?.count ?? 0;
}

export interface CheckoutPayload {
  exitTime: string;
  durationMinutes: number;
  baseAmount: number;
  bonusLabel: string | null;
  bonusDeduction: number;
  finalAmount: number;
}

export async function checkoutTicket(ticketId: number, payload: CheckoutPayload): Promise<Ticket> {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE tickets SET exit_time = ?, duration_minutes = ?, base_amount = ?, bonus_label = ?, bonus_deduction = ?, final_amount = ?, status = 'paid' WHERE id = ?",
    payload.exitTime,
    payload.durationMinutes,
    payload.baseAmount,
    payload.bonusLabel,
    payload.bonusDeduction,
    payload.finalAmount,
    ticketId
  );
  const row = await db.getFirstAsync<TicketRow>('SELECT * FROM tickets WHERE id = ?', ticketId);
  if (!row) {
    throw new Error('Ticket introuvable');
  }
  return mapRow(row);
}
