import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPatientIdOnly, addTestResult, getAllPatientIds, uploadFile } from '../../services/patientService';
import { saveCurrentUser } from '../../services/localStorageService';
import './dashboard-styles.css';

const LabAdminDashboard = () => {
  const { user, logout } = useAuth();
  const [patientId, setPatientId] = useState('');
  const [verifiedPatientId, setVerifiedPatientId] = useState(null);
  const [allPatientIds, setAllPatientIds] = useState([]);
  const [referredTests, setReferredTests] = useState('');
  const [testData, setTestData] = useState({
    testName: '',
    results: {},
    comments: '',
    files: [],
    addedByStaff: '',
    timeStamp: ''
  });
  const [currentResult, setCurrentResult] = useState({ 
    key: '', 
    value: '',
    minRange: '',
    maxRange: '',
    status: 'normal'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingIds, setIsFetchingIds] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [submittedTests, setSubmittedTests] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Store user in localStorage on mount to persist login state
  useEffect(() => {
    if (user) {
      saveCurrentUser(user);
    }
  }, [user]);

  // Load submitted tests from localStorage if available
  useEffect(() => {
    try {
      const storedTests = localStorage.getItem('lab_east_submitted_tests');
      if (storedTests) {
        setSubmittedTests(JSON.parse(storedTests));
      }
    } catch (error) {
      console.error('Error loading submitted tests from localStorage:', error);
    }
  }, []);

  // Save submitted tests to localStorage whenever they change
  useEffect(() => {
    try {
      if (submittedTests.length > 0) {
        localStorage.setItem('lab_east_submitted_tests', JSON.stringify(submittedTests));
      }
    } catch (error) {
      console.error('Error saving submitted tests to localStorage:', error);
    }
  }, [submittedTests]);

  useEffect(() => {
    const fetchPatientIds = async () => {
      try {
        setIsFetchingIds(true);
        const ids = await getAllPatientIds();
        setAllPatientIds(ids);
      } catch (error) {
        setMessage({ 
          text: `Error loading patient IDs: ${error.message}`, 
          type: 'error' 
        });
      } finally {
        setIsFetchingIds(false);
      }
    };

    fetchPatientIds();
  }, []);

  const verifyPatientId = async () => {
    if (!patientId.trim()) {
      setMessage({
        text: 'Please enter a valid patient ID',
        type: 'error'
      });
      return;
    }
    
    setIsLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      const result = await getPatientIdOnly(patientId);
      
      if (result.exists) {
        setVerifiedPatientId(result.id);
        setReferredTests(result.referredTests || '');
        setMessage({
          text: `Patient ID ${result.id} verified successfully`,
          type: 'success'
        });
      } else {
        setVerifiedPatientId(null);
        setReferredTests('');
        setMessage({
          text: `Patient ID ${patientId} not found`,
          type: 'error'
        });
      }
    } catch (error) {
      setVerifiedPatientId(null);
      setReferredTests('');
      setMessage({
        text: `Error verifying patient ID: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if a value is within normal range
  const determineStatus = (value, minRange, maxRange) => {
    if (!minRange && !maxRange) return 'normal';
    
    const numValue = parseFloat(value);
    const numMin = minRange ? parseFloat(minRange) : null;
    const numMax = maxRange ? parseFloat(maxRange) : null;
    
    if (isNaN(numValue)) return 'normal';
    
    if (numMin !== null && numMax !== null) {
      return numValue >= numMin && numValue <= numMax ? 'normal' : 'abnormal';
    } else if (numMin !== null) {
      return numValue >= numMin ? 'normal' : 'abnormal';
    } else if (numMax !== null) {
      return numValue <= numMax ? 'normal' : 'abnormal';
    }
    
    return 'normal';
  };

  const handleAddResult = () => {
    if (!currentResult.key.trim() || !currentResult.value.trim()) {
      setMessage({
        text: 'Both parameter name and value are required',
        type: 'error'
      });
      return;
    }
    
    // Calculate status based on the normal range values
    const status = determineStatus(
      currentResult.value, 
      currentResult.minRange, 
      currentResult.maxRange
    );
    
    setTestData(prev => ({
      ...prev,
      results: {
        ...prev.results,
        [currentResult.key]: {
          value: currentResult.value,
          minRange: currentResult.minRange || '',
          maxRange: currentResult.maxRange || '',
          status: status
        }
      }
    }));
    
    setCurrentResult({ 
      key: '', 
      value: '',
      minRange: '',
      maxRange: '',
      status: 'normal'
    });
  };

  const handleRemoveResult = (keyToRemove) => {
    setTestData(prev => {
      const newResults = { ...prev.results };
      delete newResults[keyToRemove];
      return {
        ...prev,
        results: newResults
      };
    });
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (files.length === 0) return;
    
    setIsUploading(true);
    setMessage({ text: 'Uploading files...', type: 'info' });
    
    try {
      const uploadedFiles = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileInfo = await uploadFile(file);
        uploadedFiles.push(fileInfo);
      }
      
      setTestData(prev => ({
        ...prev,
        files: [...prev.files, ...uploadedFiles]
      }));
      
      setMessage({
        text: `Successfully uploaded ${uploadedFiles.length} file(s)`,
        type: 'success'
      });
    } catch (error) {
      setMessage({
        text: `Error uploading files: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (index) => {
    setTestData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitTest = async () => {
    if (!verifiedPatientId) {
      setMessage({
        text: 'Please verify a patient ID first',
        type: 'error'
      });
      return;
    }
    
    if (!testData.testName) {
      setMessage({
        text: 'Test name is required',
        type: 'error'
      });
      return;
    }
    
    if (Object.keys(testData.results).length === 0) {
      setMessage({
        text: 'At least one test result is required',
        type: 'error'
      });
      return;
    }

    // Check if the test is in the referred tests list
    if (referredTests && referredTests.trim() !== '') {
      const allowedTests = referredTests.split(',').map(test => test.trim().toLowerCase());
      const currentTest = testData.testName.trim().toLowerCase();
      
      if (!allowedTests.some(test => currentTest.includes(test) || test.includes(currentTest))) {
        setMessage({
          text: `This test "${testData.testName}" is not in the referred tests list. Please only perform the tests specified: ${referredTests}`,
          type: 'error'
        });
        return;
      }
    }
    
    setIsLoading(true);
    setMessage({ text: 'Submitting test results...', type: 'info' });
    
    try {
      // Add additional fields for backward compatibility with report viewer
      const processedResults = {};
      
      // Process each result to add backward compatibility fields
      Object.entries(testData.results).forEach(([key, result]) => {
        processedResults[key] = {
          ...result,
          // Adding these fields for backward compatibility
          range: result.minRange && result.maxRange 
            ? `${result.minRange} - ${result.maxRange}` 
            : result.minRange 
              ? `> ${result.minRange}` 
              : result.maxRange 
                ? `< ${result.maxRange}` 
                : 'N/A',
          referenceRange: result.minRange && result.maxRange 
            ? `${result.minRange} - ${result.maxRange}` 
            : result.minRange 
              ? `> ${result.minRange}` 
              : result.maxRange 
                ? `< ${result.maxRange}` 
                : 'N/A'
        };
      });
      
      const submissionData = {
        ...testData,
        results: processedResults,
        addedByStaff: user.username,
        timeStamp: new Date().toISOString(),
        testDate: new Date().toISOString(),
        id: `TR-${Date.now()}`
      };
      
      const result = await addTestResult(verifiedPatientId, submissionData);
      
      // Add to local list of submitted tests for the current session
      setSubmittedTests(prev => [
        {
          ...result,
          patientId: verifiedPatientId,
          submittedAt: new Date().toISOString()
        },
        ...prev
      ]);
      
      // Reset the form
      setTestData({
        testName: '',
        results: {},
        comments: '',
        files: [],
        addedByStaff: '',
        timeStamp: ''
      });
      
      setMessage({
        text: `Test results for ${verifiedPatientId} submitted successfully`,
        type: 'success'
      });
    } catch (error) {
      setMessage({
        text: `Error submitting test results: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear verification status and form data before logout
    setVerifiedPatientId(null);
    setReferredTests('');
    setTestData({
      testName: '',
      results: {},
      comments: '',
      files: [],
      addedByStaff: '',
      timeStamp: ''
    });
    
    logout();
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-title">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <div>
            <h1>Lab Dashboard</h1>
            <p className="dashboard-subtitle">Manage test results and lab reports</p>
          </div>
        </div>
        
        <div className="dashboard-actions">
          <div className="user-profile">
            <div className="user-avatar">{user?.username?.charAt(0) || 'L'}</div>
            <div className="user-info">
              <span className="user-name">{user?.username}</span>
              <span className="user-role">Lab Administrator</span>
            </div>
          </div>
          <button className="action-btn outline-btn" onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </header>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'error' && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {message.type === 'success' && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {message.type === 'info' && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span>{message.text}</span>
          <button 
            className="close-btn" 
            onClick={() => setMessage({ text: '', type: '' })}
            aria-label="Close message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{submittedTests.length}</span>
            <span className="stat-label">Tests Submitted</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{allPatientIds.length}</span>
            <span className="stat-label">Registered Patients</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon success">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{new Date().toLocaleDateString()}</span>
            <span className="stat-label">Today's Date</span>
          </div>
        </div>
      </div>
      
      <main className="dashboard-content">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Patient Verification
            </h3>
          </div>
          <div className="card-body">
            <form onSubmit={(e) => {
              e.preventDefault();
              verifyPatientId();
            }}>
              <div className="input-group">
                <div className="input-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="input-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => {
                      setPatientId(e.target.value);
                      // Clear verification status when input changes
                      if (verifiedPatientId) {
                        setVerifiedPatientId(null);
                        setReferredTests('');
                      }
                      // Clear any error messages
                      if (message.type === 'error') {
                        setMessage({ text: '', type: '' });
                      }
                    }}
                    placeholder="Enter Patient ID (e.g., PAT-001)"
                    disabled={isLoading}
                    list={!isFetchingIds ? "patient-ids" : undefined}
                    required
                    autoComplete="off"
                    aria-label="Patient ID"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.5rem',
                      fontSize: '0.95rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      backgroundColor: '#fff',
                      color: '#334155',
                      transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
                    }}
                    className="patient-id-input"
                  />
                  {!isFetchingIds && (
                    <datalist id="patient-ids">
                      {allPatientIds.map(id => (
                        <option key={id} value={id} />
                      ))}
                    </datalist>
                  )}
                </div>
                <button 
                  className="action-btn primary-btn" 
                  type="submit"
                  disabled={isLoading || !patientId.trim()}
                >
                  {isLoading ? (
                    <div className="button-loading">
                      <div className="spinner"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Verify ID
                    </>
                  )}
                </button>
              </div>
            </form>
            
            {verifiedPatientId && (
              <div className="verification-success">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Verified Patient ID: <strong>{verifiedPatientId}</strong>
                
                {referredTests && (
                  <div className="referred-tests-info" style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '6px',
                    border: '1px solid #bae6fd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="#0284c7" width="18" height="18">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span><strong>Tests to perform:</strong> {referredTests}</span>
                  </div>
                )}
              </div>
            )}

            {isFetchingIds && (
              <div className="loading-state small">
                <div className="spinner"></div>
                <span>Loading patient IDs...</span>
              </div>
            )}
          </div>
        </div>
        
        {verifiedPatientId && (
          <div className="dashboard-card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Add Test Results
              </h3>
              <div className="patient-badge">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Patient: {verifiedPatientId}
              </div>
            </div>
            <div className="card-body">
              {referredTests && (
                <div className="test-instruction-banner" style={{
                  padding: '10px 12px',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '6px',
                  marginBottom: '15px',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.95rem',
                  color: '#047857'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong>Note:</strong> Please only perform the following test(s): <strong>{referredTests}</strong>
                  </span>
                </div>
              )}
              <div className="form-row">
                <div className="modern-form-group" style={{ width: '100%' }}>
                  <label htmlFor="testName" style={{ 
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: '#334155',
                    fontWeight: '500'
                  }}>Test Name:</label>
                  <div className="input-wrapper" style={{ position: 'relative' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18" style={{ 
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b'
                    }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <input
                      id="testName"
                      type="text"
                      value={testData.testName}
                      onChange={(e) => setTestData({ ...testData, testName: e.target.value })}
                      placeholder="e.g., Complete Blood Count"
                      disabled={isLoading}
                      style={{ 
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#fff',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="test-results-input">
                <h3>Test Parameters:</h3>
                <div className="parameters-input">
                  <div className="param-row">
                    <input
                      type="text"
                      value={currentResult.key}
                      onChange={(e) => setCurrentResult({ ...currentResult, key: e.target.value })}
                      placeholder="Parameter (e.g., Hemoglobin)"
                      disabled={isLoading}
                      style={{ backgroundColor: '#fff' }}
                    />
                    <input
                      type="text"
                      value={currentResult.value}
                      onChange={(e) => setCurrentResult({ ...currentResult, value: e.target.value })}
                      placeholder="Value (e.g., 14.5 g/dL)"
                      disabled={isLoading}
                      style={{ backgroundColor: '#fff' }}
                    />
                    <input
                      type="text"
                      value={currentResult.minRange}
                      onChange={(e) => setCurrentResult({ ...currentResult, minRange: e.target.value })}
                      placeholder="Min Normal Range"
                      disabled={isLoading}
                      style={{ backgroundColor: '#fff' }}
                    />
                    <input
                      type="text"
                      value={currentResult.maxRange}
                      onChange={(e) => setCurrentResult({ ...currentResult, maxRange: e.target.value })}
                      placeholder="Max Normal Range"
                      disabled={isLoading}
                      style={{ backgroundColor: '#fff' }}
                    />
                    <button 
                      className="action-btn" 
                      onClick={handleAddResult}
                      disabled={isLoading}
                    >
                      Add
                    </button>
                  </div>
                </div>
                
                {Object.keys(testData.results).length > 0 && (
                  <div className="parameters-list">
                    <h4>Added Parameters:</h4>
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Value</th>
                          <th>Normal Range</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(testData.results).map(([key, result]) => (
                          <tr key={key}>
                            <td>{key}</td>
                            <td>{result.value}</td>
                            <td>
                              {result.minRange && result.maxRange
                                ? `${result.minRange} - ${result.maxRange}`
                                : result.minRange
                                ? `> ${result.minRange}`
                                : result.maxRange
                                ? `< ${result.maxRange}`
                                : 'Not specified'}
                            </td>
                            <td>
                              <span className={`status-${result.status}`}>
                                {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="remove-btn"
                                onClick={() => handleRemoveResult(key)}
                                disabled={isLoading}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="form-row">
                <label htmlFor="comments">Comments:</label>
                <textarea
                  id="comments"
                  value={testData.comments}
                  onChange={(e) => setTestData({ ...testData, comments: e.target.value })}
                  placeholder="Add any additional comments or observations"
                  disabled={isLoading}
                  style={{ backgroundColor: '#fff' }}
                />
              </div>
              
              <div className="form-row">
                <label>Upload Files:</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isLoading || isUploading}
                  ref={fileInputRef}
                  style={{ backgroundColor: '#fff' }}
                />
                {isUploading && <span className="upload-status">Uploading...</span>}
              </div>
              
              {testData.files.length > 0 && (
                <div className="uploaded-files">
                  <h4>Uploaded Files:</h4>
                  <ul className="files-list">
                    {testData.files.map((file, index) => (
                      <li key={index} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">({file.size})</span>
                        <button 
                          className="remove-btn"
                          onClick={() => handleRemoveFile(index)}
                          disabled={isLoading}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="form-actions">
                <button 
                  className="submit-btn action-btn primary-btn"
                  onClick={handleSubmitTest}
                  disabled={isLoading}
                >
                  {isLoading ? 'Submitting...' : 'Submit Test Results'}
                </button>
              </div>
            </div>
          </div>
        )}

        {submittedTests.length > 0 && (
          <div className="dashboard-card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Recent Submissions
              </h3>
              <div className="card-badge">{submittedTests.length}</div>
            </div>
            <div className="card-body">
              <div className="recent-tests-list">
                {submittedTests.slice(0, 5).map((test, index) => (
                  <div className="recent-test-item" key={index}>
                    <div className="recent-test-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="recent-test-details">
                      <div className="recent-test-name">{test.testName}</div>
                      <div className="recent-test-meta">
                        <span className="recent-test-patient">{test.patientId}</span>
                        <span className="recent-test-date">
                          {new Date(test.submittedAt).toLocaleDateString()} at {new Date(test.submittedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="recent-test-tag">
                      {Object.keys(test.results).length} parameters
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LabAdminDashboard;