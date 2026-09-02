import * as SQLite from 'expo-sqlite';

const DB_NAME = 'parking.db';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parking_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date_label TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open','closed')),
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  total_vehicles INTEGER NOT NULL DEFAULT 0,
  total_revenue REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id INTEGER NOT NULL REFERENCES parking_days(id),
  ticket_number INTEGER NOT NULL,
  plate TEXT,
  entry_time TEXT NOT NULL,
  exit_time TEXT,
  duration_minutes INTEGER,
  base_amount REAL,
  bonus_label TEXT,
  bonus_deduction REAL,
  final_amount REAL,
  status TEXT NOT NULL CHECK (status IN ('in_progress','paid')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_day ON tickets(day_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
`;

/**
 * Opens (once) and migrates the local SQLite database. Safe to call multiple times;
 * subsequent calls return the same initialized connection.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (initPromise) {
    return initPromise;
  }
  initPromise = (async () => {
    const connection = await SQLite.openDatabaseAsync(DB_NAME);
    await connection.execAsync(SCHEMA);
    db = connection;
    return connection;
  })();
  return initPromise;
}
