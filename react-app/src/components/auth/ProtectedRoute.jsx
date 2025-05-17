import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ 
  allowedRoles = [], 
  redirectPath = '/login' 
}) => {
  const { user, loading, isAuthenticated } = useAuth();

  // If still loading auth state, show nothing (or a loading spinner in a real app)
  if (loading) {
    return null; // or return <LoadingSpinner />
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }
  
  // If no specific roles are required, allow access to any authenticated user
  if (allowedRoles.length === 0) {
    return <Outlet />;
  }
  
  // Check if user has the required role
  const hasRequiredRole = allowedRoles.includes(user.role);
  
  if (!hasRequiredRole) {
    // If user doesn't have the required role, redirect to dashboard or access denied page
    return <Navigate to="/access-denied" replace />;
  }
  
  // If authenticated and has required role, render the child routes
  return <Outlet />;
};

export default ProtectedRoute; 