import { useState, useEffect } from 'react';
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
  
  useEffect(() => {
    // Add subtle animation when component mounts
    const loginCard = document.querySelector('.login-card');
    if (loginCard) {
      loginCard.style.opacity = '0';
      loginCard.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        loginCard.style.opacity = '1';
        loginCard.style.transform = 'translateY(0)';
      }, 100);
    }
  }, []);

  return (
    <div className="modern-login-container" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div className="login-card" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.2), 0 5px 15px rgba(0, 0, 0, 0.1)',
        padding: '30px 40px',
        width: '100%',
        maxWidth: '700px',
        transition: 'all 0.5s ease',
        opacity: '0',
        transform: 'translateY(20px)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Background decorative elements */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
          zIndex: '0'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, rgba(118, 75, 162, 0.1), rgba(102, 126, 234, 0.1))',
          zIndex: '0'
        }}></div>

        <div className="logo-container" style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '20px',
          position: 'relative',
          zIndex: '1'
        }}>
          <div className="logo-glow" style={{
            position: 'absolute',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(102, 126, 234, 0.4) 0%, rgba(102, 126, 234, 0) 70%)',
            filter: 'blur(10px)',
            animation: 'glow 3s ease-in-out infinite alternate'
          }}></div>
          <div className="logo-pulse" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            width: '70px',
            height: '70px',
            boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3), 0 6px 6px rgba(102, 126, 234, 0.2)',
            position: 'relative'
          }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>
              L+
            </div>
            <div className="logo-ring" style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              right: '-4px',
              bottom: '-4px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }}></div>
          </div>
        </div>
        
        <div className="login-header" style={{
          textAlign: 'center',
          marginBottom: '24px',
          position: 'relative',
          zIndex: '1'
        }}>
          <h2 style={{
            fontSize: '26px',
            fontWeight: '700',
            color: '#2d3748',
            marginBottom: '8px',
            letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>LAB-east Portal</h2>
          <p style={{
            color: '#718096',
            fontSize: '15px'
          }}>Sign in to access your account</p>
        </div>
        
        {error && (
          <div className="error-alert" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: 'rgba(254, 226, 226, 0.8)',
            color: '#e53e3e',
            borderRadius: '12px',
            marginBottom: '20px',
            border: '1px solid #fed7d7',
            animation: 'shake 0.5s',
            position: 'relative',
            zIndex: '1'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="alert-icon" style={{width: '20px', height: '20px', marginRight: '10px', flexShrink: 0}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} style={{position: 'relative', zIndex: '1'}}>
          <div className="form-row" style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div className="modern-form-group" style={{flex: 1}}>
              <label htmlFor="username" style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                color: '#4a5568',
                fontSize: '15px'
              }}>Username</label>
              <div className="input-wrapper" style={{
                position: 'relative',
                transition: 'all 0.3s ease'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="input-icon" style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: '#a0aec0',
                  transition: 'color 0.3s ease'
                }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  className={errors.username ? "error-input" : ""}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 42px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: errors.username ? '1px solid #e53e3e' : '1px solid #e2e8f0',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                    outline: 'none',
                    boxShadow: errors.username ? '0 0 0 3px rgba(229, 62, 62, 0.1)' : 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.15)';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.previousSibling.style.color = '#667eea';
                  }}
                  onBlur={(e) => {
                    if (!errors.username) {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                    }
                    e.target.previousSibling.style.color = '#a0aec0';
                  }}
                  {...register('username', { required: 'Username is required' })}
                />
              </div>
              {errors.username && <span className="form-error" style={{
                color: '#e53e3e',
                fontSize: '13px',
                marginTop: '4px',
                display: 'block'
              }}>{errors.username.message}</span>}
            </div>
          
            <div className="modern-form-group" style={{flex: 1}}>
              <label htmlFor="password" style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: '500',
                color: '#4a5568',
                fontSize: '15px'
              }}>Password</label>
              <div className="input-wrapper" style={{
                position: 'relative'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="input-icon" style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: '#a0aec0',
                  transition: 'color 0.3s ease'
                }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className={errors.password ? "error-input" : ""}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 42px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: errors.password ? '1px solid #e53e3e' : '1px solid #e2e8f0',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box',
                    outline: 'none',
                    boxShadow: errors.password ? '0 0 0 3px rgba(229, 62, 62, 0.1)' : 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.15)';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.previousSibling.style.color = '#667eea';
                  }}
                  onBlur={(e) => {
                    if (!errors.password) {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
                    }
                    e.target.previousSibling.style.color = '#a0aec0';
                  }}
                  {...register('password', { required: 'Password is required' })}
                />
              </div>
              {errors.password && <span className="form-error" style={{
                color: '#e53e3e',
                fontSize: '13px',
                marginTop: '4px',
                display: 'block'
              }}>{errors.password.message}</span>}
            </div>
          </div>
          
          <div style={{
            padding: '0 0',
            marginTop: '20px'
          }}>
            <button 
              type="submit" 
              className="modern-login-button" 
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px',
                marginLeft:'-5px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 10px rgba(102, 126, 234, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.target.style.boxShadow = '0 7px 14px rgba(102, 126, 234, 0.4)';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.target.style.boxShadow = '0 4px 10px rgba(102, 126, 234, 0.3)';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              <span style={{ 
                position: 'relative',
                zIndex: '2'
              }}>
                {isLoading ? (
                  <div className="button-loading" style={{display: 'flex', alignItems: 'center'}}>
                    <div className="spinner" style={{
                      width: '18px',
                      height: '18px',
                      border: '3px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '50%',
                      borderTop: '3px solid white',
                      animation: 'spin 1s linear infinite',
                      marginRight: '10px'
                    }}></div>
                    <span>Signing In...</span>
                  </div>
                ) : 'Sign In'}
              </span>
              <div className="button-glow" style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                transition: 'all 0.5s ease',
                animation: isLoading ? 'none' : 'shine 1.5s infinite'
              }}></div>
            </button>
          </div>
        </form>
        
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#718096',
          position: 'relative',
          zIndex: '1'
        }}>
          <p>LAB-east Medical Platform</p>
          <p style={{
            fontSize: '12px',
            marginTop: '5px',
            color: '#a0aec0'
          }}>© {new Date().getFullYear()} LAB-east. All rights reserved.</p>
        </div>
        
        <style jsx>{`
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 0.6;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.3;
            }
            100% {
              transform: scale(1);
              opacity: 0.6;
            }
          }
          
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
          
          @keyframes shine {
            0% { left: -100%; }
            100% { left: 100%; }
          }
          
          @keyframes glow {
            0% {
              opacity: 0.5;
              transform: scale(1);
            }
            100% {
              opacity: 0.8;
              transform: scale(1.1);
            }
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @media (max-width: 480px) {
            .login-card {
              padding: 30px 20px;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Login; 