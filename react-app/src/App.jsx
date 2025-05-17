import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import AccessDenied from './components/auth/AccessDenied';
import AdminDashboard from './components/dashboard/AdminDashboard';
import LabAdminDashboard from './components/dashboard/LabAdminDashboard';
import Navbar from './components/layout/Navbar';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <main className="app-main">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            
            {/* Redirect from root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Protected routes for Admin */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Route>
            
            {/* Protected routes for Lab Admin */}
            <Route element={<ProtectedRoute allowedRoles={['lab-admin']} />}>
              <Route path="/lab-dashboard" element={<LabAdminDashboard />} />
            </Route>
            
            {/* Catch all route - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
