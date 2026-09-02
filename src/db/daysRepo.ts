import { getDatabase } from './database';
import type { ParkingDay } from '../types';

interface DayRow {
  id: number;
  date_label: string;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
  total_vehicles: number;
  total_revenue: number;
}

function mapRow(row: DayRow): ParkingDay {
  return {
    id: row.id,
    dateLabel: row.date_label,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    totalVehicles: row.total_vehicles,
    totalRevenue: row.total_revenue,
  };
}

function todayLabel(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the currently open day, or null if none has been opened yet. */
export async function getOpenDay(): Promise<ParkingDay | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DayRow>("SELECT * FROM parking_days WHERE status = 'open' ORDER BY id DESC LIMIT 1");
  return row ? mapRow(row) : null;
}

/** Opens a brand new day. Caller is responsible for ensuring no day is currently open. */
export async function openNewDay(): Promise<ParkingDay> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    "INSERT INTO parking_days (date_label, status, opened_at, total_vehicles, total_revenue) VALUES (?, 'open', ?, 0, 0)",
    todayLabel(),
    now
  );
  const day = await db.getFirstAsync<DayRow>('SELECT * FROM parking_days WHERE id = ?', result.lastInsertRowId);
  if (!day) {
    throw new Error("Impossible de créer la journée");
  }
  return mapRow(day);
}

/** Ensures a day is open, creating one if needed. This is the normal entry point used on app start. */
export async function ensureOpenDay(): Promise<ParkingDay> {
  const existing = await getOpenDay();
  if (existing) {
    return existing;
  }
  return openNewDay();
}

/** Recomputes and persists the totals for a day based on its paid tickets. */
async function recomputeDayTotals(dayId: number): Promise<void> {
  const db = await getDatabase();
  const totals = await db.getFirstAsync<{ count: number; revenue: number | null }>(
    "SELECT COUNT(*) as count, SUM(final_amount) as revenue FROM tickets WHERE day_id = ? AND status = 'paid'",
    dayId
  );
  await db.runAsync(
    'UPDATE parking_days SET total_vehicles = ?, total_revenue = ? WHERE id = ?',
    totals?.count ?? 0,
    totals?.revenue ?? 0,
    dayId
  );
}

/**
 * Closes the given day (archiving its totals) and immediately opens a fresh day so ticket
 * numbering restarts at zero. This is the "admin reset" action. Requires that all vehicles
 * currently parked have already been checked out (checked by the caller/UI).
 */
export async function closeDayAndStartNew(dayId: number): Promise<ParkingDay> {
  const db = await getDatabase();
  await recomputeDayTotals(dayId);
  await db.runAsync("UPDATE parking_days SET status = 'closed', closed_at = ? WHERE id = ?", new Date().toISOString(), dayId);
  return openNewDay();
}

export async function getDayById(dayId: number): Promise<ParkingDay | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DayRow>('SELECT * FROM parking_days WHERE id = ?', dayId);
  return row ? mapRow(row) : null;
}

export async function listDaysHistory(): Promise<ParkingDay[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DayRow>('SELECT * FROM parking_days ORDER BY id DESC');
  return rows.map(mapRow);
}

export { recomputeDayTotals };
