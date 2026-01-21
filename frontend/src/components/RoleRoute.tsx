import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  disallowedRoles?: string[];
  redirectTo: string;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({
  children,
  allowedRoles,
  disallowedRoles,
  redirectTo,
}) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  if (disallowedRoles && disallowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
