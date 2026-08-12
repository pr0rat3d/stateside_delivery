import { useState } from 'react';

const STORAGE_KEY = 'stateside_merchant_id';

export function useMerchantSession() {
  const [merchantId, setMerchantIdState] = useState<number | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  });

  const setMerchantId = (id: number) => {
    localStorage.setItem(STORAGE_KEY, String(id));
    setMerchantIdState(id);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMerchantIdState(null);
  };

  return { merchantId, setMerchantId, logout };
}
