import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllPatients, addPatient, generatePatientReport } from '../../services/patientService';
import { saveCurrentUser } from '../../services/localStorageService';
import PatientReport from '../reports/PatientReport';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, personal, medical, tests
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [patientReport, setPatientReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: '',
    bloodGroup: '',
    contact: '',
    emergencyContact: '',
    email: '',
    address: '',
    occupation: '',
    healthInsurance: '',
    medicalHistory: '',
    allergies: '',
    addedByStaff: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Store user in localStorage on mount to persist login state
  useEffect(() => {
    if (user) {
      saveCurrentUser(user);
    }
  }, [user]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoading(true);
        const data = await getAllPatients();
        setPatients(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch patients: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
    
    // Check if we have a previously selected patient in localStorage
    try {
      const storedSelectedPatient = localStorage.getItem('selected_patient');
      if (storedSelectedPatient) {
        setSelectedPatient(JSON.parse(storedSelectedPatient));
      }
    } catch (err) {
      console.error('Error loading selected patient from localStorage:', err);
    }
  }, []);
  
  // Save selected patient to localStorage when it changes
  useEffect(() => {
    if (selectedPatient) {
      try {
        localStorage.setItem('selected_patient', JSON.stringify(selectedPatient));
      } catch (err) {
        console.error('Error saving selected patient to localStorage:', err);
      }
    }
  }, [selectedPatient]);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      // Add staff signature and timestamp
      const patientData = {
        ...newPatient,
        // Use provided signature if available, otherwise use username
        addedByStaff: newPatient.addedByStaff || user.username,
        addedDate: new Date().toISOString()
      };
      const addedPatient = await addPatient(patientData);
      setPatients([...patients, addedPatient]);
      setNewPatient({
        name: '',
        age: '',
        gender: '',
        bloodGroup: '',
        contact: '',
        emergencyContact: '',
        email: '',
        address: '',
        occupation: '',
        healthInsurance: '',
        medicalHistory: '',
        allergies: '',
        addedByStaff: ''
      });
      setIsAddingPatient(false);
      setError(null);
    } catch (err) {
      setError('Failed to add patient: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async (patientId) => {
    try {
      setIsGeneratingReport(true);
      setIsLoading(true);
      const report = await generatePatientReport(patientId);
      
      // Ensure report data is properly saved to localStorage as backup
      if (report && report.patientInfo) {
        try {
          // Save with a more specific key that includes a timestamp for uniqueness
          const storageKey = `patient_report_${patientId}_${Date.now()}`;
          localStorage.setItem(storageKey, JSON.stringify(report));
          console.log('Report data successfully stored in localStorage with key:', storageKey);
        } catch (err) {
          console.error('Error saving report to localStorage:', err);
          // Continue even if localStorage fails
        }
      }
      
      setPatientReport(report);
      setError(null);
    } catch (err) {
      setError('Failed to generate report: ' + err.message);
    } finally {
      setIsLoading(false);
      setIsGeneratingReport(false);
    }
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setActiveTab('overview');
    setPatientReport(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPatient({ ...newPatient, [name]: value });
  };

  const handleCloseReport = () => {
    setPatientReport(null);
  };

  // Add a new helper function to safely display test result values
  const formatTestValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (typeof value === 'object' && value !== null) {
      // If the value has a 'value' property, use that
      if (value.value !== undefined) {
        return value.value;
      }
      // Otherwise try to create a meaningful string representation
      try {
        return JSON.stringify(value);
      } catch (e) {
        return 'Complex Value';
      }
    }
    
    // For simple types, just convert to string
    return String(value);
  };

  const renderPatientDetails = () => {
    if (!selectedPatient) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <>
            <div className="patient-overview-header">
              <div className="patient-card-avatar">
                {selectedPatient.name.charAt(0)}
              </div>
              <div className="patient-overview-info">
                <h3>{selectedPatient.name}</h3>
                <div className="patient-meta">
                  <span className="patient-card-id">{selectedPatient.id}</span>
                  <span className="patient-age-gender">{selectedPatient.age} years, {selectedPatient.gender}</span>
                  <span className="patient-blood-group">Blood: {selectedPatient.bloodGroup}</span>
                </div>
              </div>
            </div>
            <div className="patient-overview-cards">
              <div className="overview-card">
                <div className="card-icon contact-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="card-content">
                  <h4>Contact</h4>
                  <p>{selectedPatient.contact}</p>
                </div>
              </div>
              <div className="overview-card">
                <div className="card-icon insurance-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="card-content">
                  <h4>Insurance</h4>
                  <p>{selectedPatient.healthInsurance || 'Not provided'}</p>
                </div>
              </div>
              <div className="overview-card">
                <div className="card-icon tests-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div className="card-content">
                  <h4>Tests</h4>
                  <p>{selectedPatient.testResults?.length || 0} test(s)</p>
                </div>
              </div>
              <div className="overview-card">
                <div className="card-icon allergy-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="card-content">
                  <h4>Allergies</h4>
                  <p>{selectedPatient.allergies || 'None recorded'}</p>
                </div>
              </div>
            </div>
          </>
        );
      case 'personal':
        return (
          <div className="patient-details-section">
            <h4 className="section-title">Personal Information</h4>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Full Name</span>
                <span className="detail-value">{selectedPatient.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Age</span>
                <span className="detail-value">{selectedPatient.age}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Gender</span>
                <span className="detail-value">{selectedPatient.gender}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Blood Group</span>
                <span className="detail-value">{selectedPatient.bloodGroup}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Contact</span>
                <span className="detail-value">{selectedPatient.contact}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Emergency Contact</span>
                <span className="detail-value">{selectedPatient.emergencyContact || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email</span>
                <span className="detail-value">{selectedPatient.email || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Address</span>
                <span className="detail-value">{selectedPatient.address || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Occupation</span>
                <span className="detail-value">{selectedPatient.occupation || 'Not provided'}</span>
              </div>
            </div>
          </div>
        );
      case 'medical':
        return (
          <div className="patient-details-section">
            <h4 className="section-title">Medical Information</h4>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Blood Group</span>
                <span className="detail-value">{selectedPatient.bloodGroup}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Health Insurance</span>
                <span className="detail-value">{selectedPatient.healthInsurance || 'Not provided'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Allergies</span>
                <span className="detail-value">{selectedPatient.allergies || 'None recorded'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Medical History</span>
                <span className="detail-value">{selectedPatient.medicalHistory || 'None recorded'}</span>
              </div>
            </div>
          </div>
        );
      case 'tests':
        return (
          <div className="patient-details-section">
            <div className="section-header">
              <h4 className="section-title">Test Results</h4>
              <button 
                className="action-btn outline-btn" 
                onClick={() => handleGenerateReport(selectedPatient.id)}
                disabled={isGeneratingReport}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {isGeneratingReport ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
            
            {selectedPatient.testResults && selectedPatient.testResults.length > 0 ? (
              <div className="test-results-list">
                {selectedPatient.testResults.map((test, index) => (
                  <div className="test-result-item" key={index}>
                    <div className="test-header">
                      <h5>{test.testName}</h5>
                      <span className="test-date">{new Date(test.testDate).toLocaleDateString()}</span>
                    </div>
                    <div className="test-details">
                      {test.results && typeof test.results === 'object' ? (
                        Object.entries(test.results).map(([key, value], i) => {
                          // Determine if this value has status information
                          let statusClass = '';
                          let displayValue = formatTestValue(value);
                          
                          if (typeof value === 'object' && value !== null && value.status) {
                            const status = String(value.status).toLowerCase();
                            if (status.includes('high') || status.includes('abnormal')) {
                              statusClass = 'high-value';
                            } else if (status.includes('low')) {
                              statusClass = 'low-value';
                            }
                          }
                          
                          return (
                            <div className={`test-parameter ${statusClass}`} key={i}>
                              <span className="parameter-name">{key}</span>
                              <span className="parameter-value">{displayValue}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="test-parameter">
                          <span className="parameter-name">Results</span>
                          <span className="parameter-value">No detailed results available</span>
                        </div>
                      )}
                    </div>
                    {test.comments && (
                      <div className="test-comments">
                        <strong>Comments:</strong> {test.comments}
                      </div>
                    )}
                    {test.addedByStaff && (
                      <div className="test-staff-info">
                        Added by: {test.addedByStaff} on {new Date(test.testDate).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data-message">
                No test results available for this patient.
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Main dashboard render
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Admin Dashboard
        </h1>
        <div className="dashboard-actions">
          <button 
            className="action-btn primary-btn" 
            onClick={() => setIsAddingPatient(!isAddingPatient)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {isAddingPatient ? 'Cancel' : 'Add New Patient'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="alert-icon">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="patients-panel">
          <div className="dashboard-card">
            <div className="card-header">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Patients
              </h3>
            </div>
            <div className="card-body">
              {isAddingPatient ? (
                <form onSubmit={handleAddPatient} className="form-container">
                  <h4 className="form-title">Add New Patient</h4>
                  <div className="form-row">
                    <div className="modern-form-group">
                      <label htmlFor="name">Full Name</label>
                      <div className="input-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="input-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <input
                          id="name"
                          name="name"
                          value={newPatient.name}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter patient's full name"
                        />
                      </div>
                    </div>
                    <div className="modern-form-group">
                      <label htmlFor="age">Age</label>
                      <div className="input-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="input-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <input
                          id="age"
                          name="age"
                          type="number"
                          value={newPatient.age}
                          onChange={handleInputChange}
                          required
                          placeholder="Age in years"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="modern-form-group">
                      <label htmlFor="gender">Gender</label>
                      <select
                        id="gender"
                        name="gender"
                        value={newPatient.gender}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="modern-form-group">
                      <label htmlFor="bloodGroup">Blood Group</label>
                      <select
                        id="bloodGroup"
                        name="bloodGroup"
                        value={newPatient.bloodGroup}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="modern-form-group">
                      <label htmlFor="contact">Contact Number</label>
                      <div className="input-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="input-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <input
                          id="contact"
                          name="contact"
                          value={newPatient.contact}
                          onChange={handleInputChange}
                          required
                          placeholder="Contact number"
                        />
                      </div>
                    </div>
                    <div className="modern-form-group">
                      <label htmlFor="email">Email</label>
                      <div className="input-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="input-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          value={newPatient.email}
                          onChange={handleInputChange}
                          placeholder="Email address (optional)"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="modern-form-group">
                      <label htmlFor="staffSignature">Your Signature</label>
                      <div className="input-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="input-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <input
                          id="staffSignature"
                          name="addedByStaff"
                          type="text"
                          value={newPatient.addedByStaff}
                          onChange={handleInputChange}
                          placeholder="Your name as signature"
                        />
                      </div>
                      <small className="form-helper-text">This will be recorded as who registered this patient</small>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="action-btn primary-btn" disabled={isLoading}>
                      {isLoading ? (
                        <div className="button-loading">
                          <div className="spinner"></div>
                          <span>Adding...</span>
                        </div>
                      ) : 'Add Patient'}
                    </button>
                    <button
                      type="button"
                      className="action-btn outline-btn"
                      onClick={() => setIsAddingPatient(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="search-bar">
                    <input
                      type="text"
                      placeholder="Search patients by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {isLoading ? (
                    <div className="loading-message">Loading patients...</div>
                  ) : filteredPatients.length > 0 ? (
                    <div className="patients-list">
                      {filteredPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className={`patient-card ${selectedPatient && selectedPatient.id === patient.id ? 'selected' : ''}`}
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="patient-card-avatar">
                            {patient.name.charAt(0)}
                          </div>
                          <div className="patient-card-info">
                            <div className="patient-card-name">{patient.name}</div>
                            <div className="patient-card-meta">
                              <span className="patient-card-id">{patient.id}</span>
                              <span className="patient-id-divider">•</span>
                              <span>{patient.age} years, {patient.gender}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-data-message">
                      {searchTerm ? 'No patients match your search criteria.' : 'No patients found.'}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="patient-details-panel">
          {selectedPatient ? (
            <div className="dashboard-card">
              <div className="card-header">
                <h3>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Patient Details
                </h3>
              </div>
              <div className="tabs">
                <button
                  className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button
                  className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('personal')}
                >
                  Personal Info
                </button>
                <button
                  className={`tab-btn ${activeTab === 'medical' ? 'active' : ''}`}
                  onClick={() => setActiveTab('medical')}
                >
                  Medical Info
                </button>
                <button
                  className={`tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tests')}
                >
                  Test Results
                </button>
              </div>
              <div className="card-body">
                {renderPatientDetails()}
              </div>
            </div>
          ) : (
            <div className="dashboard-card empty-state">
              <div className="card-body">
                <div className="no-selection-message">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="64" height="64">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3>No Patient Selected</h3>
                  <p>Select a patient from the list to view their details.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {patientReport && (
        <PatientReport 
          report={patientReport} 
          user={user}
          onClose={handleCloseReport}
        />
      )}
    </div>
  );
};

export default AdminDashboard; 