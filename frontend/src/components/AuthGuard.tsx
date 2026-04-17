import { Outlet, Navigate } from 'react-router-dom';

export default function AuthGuard() {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}