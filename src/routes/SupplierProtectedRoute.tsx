import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface SupplierProtectedRouteProps {
  children: ReactNode;
}

const SupplierProtectedRoute = ({ children }: SupplierProtectedRouteProps) => {
  const supplierAccessToken = localStorage.getItem('supplierAccessToken');

  if (!supplierAccessToken) {
    return <Navigate to="/supplier/login" replace />;
  }

  return <>{children}</>;
};

export default SupplierProtectedRoute;
