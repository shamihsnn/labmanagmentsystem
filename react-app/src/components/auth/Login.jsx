import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import * as authService from '../../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    
    try {
      const { username, password } = data;
      const result = await authService.login(username, password);
      
      // Save the auth info in context and localStorage
      login(result.token, result.user);
      
      // Redirect based on role
      if (result.user.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (result.user.role === 'lab-admin') {
        navigate('/lab-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modern-login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your account</p>
        </div>
        
        {error && (
          <div className="error-alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="alert-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modern-form-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="input-icon">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                className={errors.username ? "error-input" : ""}
                {...register('username', { required: 'Username is required' })}
              />
            </div>
            {errors.username && <span className="form-error">{errors.username.message}</span>}
          </div>
          
          <div className="modern-form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="input-icon">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                className={errors.password ? "error-input" : ""}
                {...register('password', { required: 'Password is required' })}
              />
            </div>
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>
          
          <button type="submit" className="modern-login-button" disabled={isLoading}>
            {isLoading ? (
              <div className="button-loading">
                <div className="spinner"></div>
                <span>Logging in...</span>
              </div>
            ) : 'Sign In'}
          </button>
        </form>
        
        <div className="demo-accounts">
          <h3>Demo Accounts</h3>
          <div className="account-card admin">
            <div className="account-icon admin-icon">A</div>
            <div className="account-details">
              <span className="account-role">Admin</span>
              <span className="account-credentials">username: admin, password: admin123</span>
            </div>
          </div>
          <div className="account-card lab-admin">
            <div className="account-icon lab-icon">L</div>
            <div className="account-details">
              <span className="account-role">Lab Admin</span>
              <span className="account-credentials">username: labadmin, password: lab123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 