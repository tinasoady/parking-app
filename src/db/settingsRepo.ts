import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import type { AppSettings, BonusRule } from '../types';

export const DEFAULT_ADMIN_PIN = '1234';

function defaultBonusRules(): BonusRule[] {
  return [
    { id: 'fidele', label: 'Client fidèle -20%', kind: 'percent', value: 20 },
    { id: 'gratuit30', label: '30 min offertes', kind: 'freeMinutes', value: 30 },
  ];
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

async function randomSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function buildDefaultSettings(): Promise<AppSettings> {
  const salt = await randomSalt();
  const adminPinHash = await hashPin(DEFAULT_ADMIN_PIN, salt);
  return {
    businessName: 'Mon Parking',
    businessAddress: '',
    currencySymbol: 'FCFA',
    currencyDecimals: 0,
    printerLineWidth: 32,
    pricing: {
      hourlyRate: 500,
      billingIncrementMinutes: 60,
      roundingMode: 'up',
      graceMinutes: 10,
      dailyCapAmount: null,
    },
    bonusRules: defaultBonusRules(),
    adminPinHash,
    adminPinSalt: salt,
    printerAddress: null,
    printerName: null,
  };
}

/** Reads settings from DB, creating sensible defaults (and a default admin PIN of 1234) on first run. */
export async function getSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM settings WHERE id = 1');
  if (row) {
    return JSON.parse(row.data) as AppSettings;
  }
  const defaults = await buildDefaultSettings();
  await db.runAsync('INSERT INTO settings (id, data) VALUES (1, ?)', JSON.stringify(defaults));
  return defaults;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE settings SET data = ? WHERE id = 1', JSON.stringify(settings));
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const settings = await getSettings();
  const hash = await hashPin(pin, settings.adminPinSalt);
  return hash === settings.adminPinHash;
}

export async function setAdminPin(newPin: string): Promise<void> {
  const settings = await getSettings();
  const salt = await randomSalt();
  const adminPinHash = await hashPin(newPin, salt);
  await saveSettings({ ...settings, adminPinSalt: salt, adminPinHash });
}
