import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { verifyAdminPin } from '../db/settingsRepo';

interface AdminContextValue {
  isUnlocked: boolean;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);

  const unlock = useCallback(async (pin: string) => {
    const ok = await verifyAdminPin(pin);
    if (ok) {
      setIsUnlocked(true);
    }
    return ok;
  }, []);

  const lock = useCallback(() => setIsUnlocked(false), []);

  const value = useMemo(() => ({ isUnlocked, unlock, lock }), [isUnlocked, unlock, lock]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return ctx;
}
