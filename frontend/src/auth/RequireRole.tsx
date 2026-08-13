import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { Role } from '../types';

const LOGIN_PATH: Record<Role, string> = {
  customer: '/login',
  driver: '/driver/login',
  merchant: '/merchant/login',
  admin: '/admin/login',
};

export default function RequireRole({ role }: { role: Role }) {
  const { auth } = useAuth();
  if (!auth || auth.role !== role) {
    return <Navigate to={LOGIN_PATH[role]} replace />;
  }
  return <Outlet />;
}
