// Utility functions for handling localStorage operations

// Keys
const PATIENTS_KEY = 'lab_east_patients';
const PATIENT_TESTS_PREFIX = 'lab_east_patient_tests_';
const USER_KEY = 'lab_east_current_user';

// Save all patients to localStorage
export const saveAllPatients = (patients) => {
  try {
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    return true;
  } catch (error) {
    console.error('Error saving patients to localStorage:', error);
    return false;
  }
};

// Get all patients from localStorage
export const getAllPatientsFromStorage = () => {
  try {
    const patients = localStorage.getItem(PATIENTS_KEY);
    return patients ? JSON.parse(patients) : [];
  } catch (error) {
    console.error('Error retrieving patients from localStorage:', error);
    return [];
  }
};

// Save a single patient to localStorage
export const savePatient = (patient) => {
  try {
    const patients = getAllPatientsFromStorage();
    const existingIndex = patients.findIndex(p => p.id === patient.id);
    
    if (existingIndex >= 0) {
      // Update existing patient
      patients[existingIndex] = patient;
    } else {
      // Add new patient
      patients.push(patient);
    }
    
    saveAllPatients(patients);
    return true;
  } catch (error) {
    console.error('Error saving patient to localStorage:', error);
    return false;
  }
};

// Get a patient by ID from localStorage
export const getPatientFromStorage = (patientId) => {
  try {
    const patients = getAllPatientsFromStorage();
    return patients.find(p => p.id === patientId) || null;
  } catch (error) {
    console.error('Error retrieving patient from localStorage:', error);
    return null;
  }
};

// Delete a patient from localStorage
export const deletePatientFromStorage = (patientId) => {
  try {
    const patients = getAllPatientsFromStorage();
    const filteredPatients = patients.filter(p => p.id !== patientId);
    saveAllPatients(filteredPatients);
    return true;
  } catch (error) {
    console.error('Error deleting patient from localStorage:', error);
    return false;
  }
};

// Save test results for a patient
export const savePatientTestResults = (patientId, testResults) => {
  try {
    // First update the patient's test results in the main patients array
    const patient = getPatientFromStorage(patientId);
    if (patient) {
      patient.testResults = testResults;
      savePatient(patient);
    }
    
    // Also store the test results separately for faster access
    localStorage.setItem(`${PATIENT_TESTS_PREFIX}${patientId}`, JSON.stringify(testResults));
    return true;
  } catch (error) {
    console.error('Error saving test results to localStorage:', error);
    return false;
  }
};

// Get test results for a patient
export const getPatientTestResults = (patientId) => {
  try {
    // Try to get from dedicated test results storage first
    const testResults = localStorage.getItem(`${PATIENT_TESTS_PREFIX}${patientId}`);
    if (testResults) {
      return JSON.parse(testResults);
    }
    
    // Fall back to getting from patient data
    const patient = getPatientFromStorage(patientId);
    return patient?.testResults || [];
  } catch (error) {
    console.error('Error retrieving test results from localStorage:', error);
    return [];
  }
};

// Add a single test result to a patient
export const addTestResultToStorage = (patientId, testResult) => {
  try {
    const testResults = getPatientTestResults(patientId);
    testResults.push(testResult);
    savePatientTestResults(patientId, testResults);
    return true;
  } catch (error) {
    console.error('Error adding test result to localStorage:', error);
    return false;
  }
};

// Save current user to localStorage
export const saveCurrentUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return true;
  } catch (error) {
    console.error('Error saving user to localStorage:', error);
    return false;
  }
};

// Get current user from localStorage
export const getCurrentUserFromStorage = () => {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error retrieving user from localStorage:', error);
    return null;
  }
};

// Clear all localStorage data
export const clearAllStorageData = () => {
  try {
    localStorage.removeItem(PATIENTS_KEY);
    localStorage.removeItem(USER_KEY);
    
    // Clear all patient test keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PATIENT_TESTS_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing localStorage data:', error);
    return false;
  }
}; 