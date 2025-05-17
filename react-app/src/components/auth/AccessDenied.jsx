import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AccessDenied = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLabAdmin } = useAuth();

  const handleRedirect = () => {
    if (isAdmin) {
      navigate('/admin-dashboard');
    } else if (isLabAdmin) {
      navigate('/lab-dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="access-denied">
      <div className="access-denied-content">
        <h1>Access Denied</h1>
        <p>Sorry, you do not have permission to access this page.</p>
        <p>
          You are logged in as <strong>{user?.name || 'Unknown User'}</strong> with role{' '}
          <strong>{user?.role || 'Unknown Role'}</strong>.
        </p>
        <button onClick={handleRedirect} className="redirect-btn">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AccessDenied; 