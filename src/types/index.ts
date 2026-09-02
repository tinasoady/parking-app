/**
 * Shared domain types for the parking app. Kept in one place because the DB layer,
 * pricing engine, printing templates and screens all need the same shapes.
 */

export type RoundingMode = 'up' | 'nearest' | 'down';

export type BonusKind = 'percent' | 'flat' | 'freeMinutes';

export interface BonusRule {
  id: string;
  label: string;
  kind: BonusKind;
  /** percent: 0-100, flat: currency amount, freeMinutes: extra free minutes granted */
  value: number;
}

export interface PricingRules {
  hourlyRate: number;
  /** Billing is charged in blocks of this many minutes (e.g. 60 = per full hour, 15 = per quarter hour) */
  billingIncrementMinutes: number;
  roundingMode: RoundingMode;
  /** Minutes free at the start of every stay before billing kicks in */
  graceMinutes: number;
  /** Maximum amount charged for a single stay, regardless of duration. null = no cap */
  dailyCapAmount: number | null;
}

export interface AppSettings {
  businessName: string;
  businessAddress: string;
  currencySymbol: string;
  currencyDecimals: number;
  /** Characters per printed line, matches the thermal paper width (58mm ~= 32, 80mm ~= 48) */
  printerLineWidth: number;
  pricing: PricingRules;
  bonusRules: BonusRule[];
  adminPinHash: string;
  adminPinSalt: string;
  printerAddress: string | null;
  printerName: string | null;
}

export type DayStatus = 'open' | 'closed';

export interface ParkingDay {
  id: number;
  dateLabel: string; // YYYY-MM-DD
  status: DayStatus;
  openedAt: string; // ISO timestamp
  closedAt: string | null;
  totalVehicles: number;
  totalRevenue: number;
}

export type TicketStatus = 'in_progress' | 'paid';

export interface Ticket {
  id: number;
  dayId: number;
  ticketNumber: number;
  plate: string | null;
  entryTime: string; // ISO timestamp
  exitTime: string | null;
  durationMinutes: number | null;
  baseAmount: number | null;
  bonusLabel: string | null;
  bonusDeduction: number | null;
  finalAmount: number | null;
  status: TicketStatus;
  createdAt: string;
}

export interface PriceComputation {
  durationMinutes: number;
  billableMinutes: number;
  baseAmount: number;
  bonusLabel: string | null;
  bonusDeduction: number;
  finalAmount: number;
  cappedAtDailyMax: boolean;
}
