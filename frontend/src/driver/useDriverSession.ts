import { useState } from 'react';

const STORAGE_KEY = 'stateside_driver_id';

export function useDriverSession() {
  const [driverId, setDriverIdState] = useState<number | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  });

  const setDriverId = (id: number) => {
    localStorage.setItem(STORAGE_KEY, String(id));
    setDriverIdState(id);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDriverIdState(null);
  };

  return { driverId, setDriverId, logout };
}
