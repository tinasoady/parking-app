import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { closeDayAndStartNew, ensureOpenDay } from '../db/daysRepo';
import { countActiveTickets } from '../db/ticketsRepo';
import type { ParkingDay } from '../types';

interface DayContextValue {
  currentDay: ParkingDay | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Closes the current day and opens a new one. Throws if vehicles are still parked. */
  resetDay: () => Promise<void>;
}

const DayContext = createContext<DayContextValue | undefined>(undefined);

export function DayProvider({ children }: { children: React.ReactNode }) {
  const [currentDay, setCurrentDay] = useState<ParkingDay | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const day = await ensureOpenDay();
    setCurrentDay(day);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const resetDay = useCallback(async () => {
    if (!currentDay) return;
    const active = await countActiveTickets(currentDay.id);
    if (active > 0) {
      throw new Error(`${active} véhicule(s) sont encore stationnés. Encaissez-les avant de réinitialiser.`);
    }
    const newDay = await closeDayAndStartNew(currentDay.id);
    setCurrentDay(newDay);
  }, [currentDay]);

  const value = useMemo(() => ({ currentDay, loading, refresh, resetDay }), [currentDay, loading, refresh, resetDay]);

  return <DayContext.Provider value={value}>{children}</DayContext.Provider>;
}

export function useDay(): DayContextValue {
  const ctx = useContext(DayContext);
  if (!ctx) {
    throw new Error('useDay must be used within a DayProvider');
  }
  return ctx;
}
