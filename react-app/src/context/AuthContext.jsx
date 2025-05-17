import { createContext, useState, useContext, useEffect } from 'react';
import { saveCurrentUser, getCurrentUserFromStorage } from '../services/localStorageService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (token exists in localStorage)
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // First try to get user from our localStorage service
        const userData = getCurrentUserFromStorage();
        
        // Fall back to the original localStorage approach if needed
        if (!userData) {
          const storedUser = JSON.parse(localStorage.getItem('user'));
          if (storedUser) {
            setUser(storedUser);
            // Also save to our localStorage service for future use
            saveCurrentUser(storedUser);
          }
        } else {
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to parse user data', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // Also save to our localStorage service
    saveCurrentUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear selected_patient and other user-specific data
    localStorage.removeItem('selected_patient');
    localStorage.removeItem('lab_east_submitted_tests');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isLabAdmin: user?.role === 'lab-admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 