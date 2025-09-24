import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  const isLoading = useAuth((state) => state.isLoading);
  const checkAuth = useAuth((state) => state.checkAuth);
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      void checkAuth();
    }
  }, [checkAuth, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          aria-label="Loading"
          className="h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
