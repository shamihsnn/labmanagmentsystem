import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getPatientIdOnly, addTestResult, getAllPatientIds, uploadFile } from '../../services/patientService';
import { saveCurrentUser } from '../../services/localStorageService';

const LabAdminDashboard = () => {
  const { user, logout } = useAuth();
  const [patientId, setPatientId] = useState('');
  const [verifiedPatientId, setVerifiedPatientId] = useState(null);
  const [allPatientIds, setAllPatientIds] = useState([]);
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
        setMessage({
          text: `Patient ID ${result.id} verified successfully`,
          type: 'success'
        });
      } else {
        setVerifiedPatientId(null);
        setMessage({
          text: `Patient ID ${patientId} not found`,
          type: 'error'
        });
      }
    } catch (error) {
      setVerifiedPatientId(null);
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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-info">
          <span className="user-name">{user?.username}</span>
          <span className="user-role">Lab Administrator</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>
      
      <main className="dashboard-content">
        <div className="dashboard-section patient-verification">
          <h2 className="section-title">Patient Verification</h2>
          <div className="input-group">
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Enter Patient ID (e.g., PAT-001)"
              disabled={isLoading}
              list="patient-ids"
              style={{ backgroundColor: '#fff' }}
            />
            <datalist id="patient-ids">
              {allPatientIds.map(id => (
                <option key={id} value={id} />
              ))}
            </datalist>
            <button 
              className="action-btn" 
              onClick={verifyPatientId}
              disabled={isLoading}
            >
              Verify
            </button>
          </div>
          
          {verifiedPatientId && (
            <div className="verification-success">
              <p>✓ Verified Patient ID: <strong>{verifiedPatientId}</strong></p>
            </div>
          )}
        </div>
        
        {verifiedPatientId && (
          <div className="dashboard-section test-results">
            <h2 className="section-title">Add Test Results for {verifiedPatientId}</h2>
            
            <div className="form-row">
              <label htmlFor="testName">Test Name:</label>
              <input
                id="testName"
                type="text"
                value={testData.testName}
                onChange={(e) => setTestData({ ...testData, testName: e.target.value })}
                placeholder="e.g., Complete Blood Count"
                disabled={isLoading}
                style={{ backgroundColor: '#fff' }}
              />
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
                className="submit-btn"
                onClick={handleSubmitTest}
                disabled={isLoading}
              >
                {isLoading ? 'Submitting...' : 'Submit Test Results'}
              </button>
            </div>
          </div>
        )}
        
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        
        {submittedTests.length > 0 && (
          <div className="dashboard-section recent-submissions">
            <h2 className="section-title">Recent Submissions</h2>
            <table className="submissions-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Test Name</th>
                  <th>Date/Time</th>
                  <th>Parameters</th>
                  <th>Files</th>
                </tr>
              </thead>
              <tbody>
                {submittedTests.map((test, index) => (
                  <tr key={index}>
                    <td>{test.patientId}</td>
                    <td>{test.testName}</td>
                    <td>{new Date(test.submittedAt).toLocaleString()}</td>
                    <td>{Object.keys(test.results).length} parameters</td>
                    <td>{test.files.length} files</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default LabAdminDashboard; 