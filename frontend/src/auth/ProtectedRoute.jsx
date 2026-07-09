import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <div className="loading-screen">読み込み中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
