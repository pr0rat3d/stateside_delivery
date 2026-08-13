import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuthResponse, Role } from '../types';

const STORAGE_KEY = 'stateside_auth';

export interface AuthState {
  token: string;
  role: Role;
  fullName: string;
  customerId?: number;
  driverId?: number;
  merchantId?: number;
}

interface AuthContextValue {
  auth: AuthState | null;
  setAuth: (response: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadInitial(): AuthState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function fromResponse(response: AuthResponse): AuthState {
  return {
    token: response.token,
    role: response.role,
    fullName: response.full_name,
    customerId: response.customer_id,
    driverId: response.driver_id,
    merchantId: response.merchant_id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthState | null>(loadInitial);

  const setAuth = (response: AuthResponse) => {
    const next = fromResponse(response);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setAuthState(next);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthState(null);
  };

  return <AuthContext.Provider value={{ auth, setAuth, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getStoredToken(): string | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as AuthState).token;
  } catch {
    return null;
  }
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY);
}
