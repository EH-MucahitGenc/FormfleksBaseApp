import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export interface ProtectedRouteProps {
  requiredPermission?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute = ({ requiredPermission, children }: ProtectedRouteProps) => {
  const { isAuthenticated, token, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Admin Bypass: Admin rolü varsa hiçbir yetki kontrolüne girme
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.some(role => 
    role.toLowerCase() === 'admin'
  );

  if (isAdmin) {
    return children ? <>{children}</> : <Outlet />;
  }

  // Permission Check
  if (requiredPermission) {
    const userPermissions = user?.permissions || [];
    const hasPermission = userPermissions.includes(requiredPermission);
    
    if (!hasPermission) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
