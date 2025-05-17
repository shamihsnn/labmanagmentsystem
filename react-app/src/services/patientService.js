// Mock API service for patient management
// In a real application, this would make actual API calls to a backend server
import { 
  saveAllPatients, 
  getAllPatientsFromStorage, 
  savePatient, 
  getPatientFromStorage,
  savePatientTestResults,
  addTestResultToStorage
} from './localStorageService';

// Initialize patients with mock data if not in localStorage
let patients = [
  {
    id: 'PAT-001',
    name: 'John Doe',
    age: 45,
    gender: 'Male',
    bloodGroup: 'O+',
    contact: '555-123-4567',
    emergencyContact: '555-987-6543',
    email: 'john.doe@example.com',
    address: '123 Main St, Anytown',
    occupation: 'Software Engineer',
    healthInsurance: 'MediCare #12345678',
    medicalHistory: 'Hypertension, Appendectomy (2018)',
    allergies: 'Penicillin',
    dateRegistered: '2023-10-15',
    testResults: []
  },
  {
    id: 'PAT-002',
    name: 'Jane Smith',
    age: 32,
    gender: 'Female',
    bloodGroup: 'A-',
    contact: '555-987-6543',
    emergencyContact: '555-123-4567',
    email: 'jane.smith@example.com',
    address: '456 Oak Ave, Somewhere City',
    occupation: 'Teacher',
    healthInsurance: 'BlueCross #87654321',
    medicalHistory: 'Asthma',
    allergies: 'Nuts, Shellfish',
    dateRegistered: '2023-11-02',
    testResults: [
      {
        id: 'TR-001',
        testName: 'Complete Blood Count',
        testDate: '2023-11-05',
        results: {
          wbc: '7.5 x10^9/L',
          rbc: '4.8 x10^12/L',
          hemoglobin: '14.2 g/dL',
          hematocrit: '42%',
          platelets: '250 x10^9/L'
        },
        status: 'completed',
        comments: 'Results within normal range',
        files: [
          {
            name: 'cbc_report.pdf',
            url: 'https://example.com/reports/cbc_report.pdf',
            type: 'application/pdf',
            size: '256 KB'
          }
        ]
      }
    ]
  }
];

// On module load, try to get patients from localStorage
(() => {
  try {
    const storedPatients = getAllPatientsFromStorage();
    if (storedPatients && storedPatients.length > 0) {
      console.log('Loaded patients from localStorage:', storedPatients.length);
      patients = storedPatients;
    } else {
      // If no patients in localStorage, save our initial mock data
      console.log('No patients found in localStorage, saving mock data...');
      saveAllPatients(patients);
    }
  } catch (error) {
    console.error('Error initializing patients from localStorage:', error);
  }
})();

// Get all patients - only accessible by admin
export const getAllPatients = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Try to get fresh data from localStorage first
  try {
    const storedPatients = getAllPatientsFromStorage();
    if (storedPatients && storedPatients.length > 0) {
      patients = storedPatients;
    }
  } catch (error) {
    console.error('Error getting patients from localStorage:', error);
  }
  
  return [...patients];
};

// Get patient by ID - accessible by all staff
export const getPatientById = async (patientId) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Try localStorage first
  try {
    const storedPatient = getPatientFromStorage(patientId);
    if (storedPatient) {
      return { ...storedPatient };
    }
  } catch (error) {
    console.error('Error getting patient from localStorage:', error);
  }
  
  // Fall back to in-memory array
  const patient = patients.find(p => p.id === patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }
  return { ...patient };
};

// Add new patient - only accessible by admin
export const addPatient = async (patientData) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Generate a new patient ID
  const newId = `PAT-${String(patients.length + 1).padStart(3, '0')}`;
  
  const newPatient = {
    id: newId,
    ...patientData,
    dateRegistered: new Date().toISOString().split('T')[0],
    testResults: []
  };
  
  patients.push(newPatient);
  
  // Save to localStorage
  savePatient(newPatient);
  
  return { ...newPatient };
};

// Update patient - only accessible by admin
export const updatePatient = async (patientId, updatedData) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const patientIndex = patients.findIndex(p => p.id === patientId);
  if (patientIndex === -1) {
    throw new Error('Patient not found');
  }
  
  // Update the patient data
  const updatedPatient = {
    ...patients[patientIndex],
    ...updatedData,
    id: patientId // Ensure ID doesn't change
  };
  
  patients[patientIndex] = updatedPatient;
  
  // Save to localStorage
  savePatient(updatedPatient);
  
  return { ...updatedPatient };
};

// Delete patient - only accessible by admin
export const deletePatient = async (patientId) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const initialLength = patients.length;
  patients = patients.filter(p => p.id !== patientId);
  
  if (patients.length === initialLength) {
    throw new Error('Patient not found');
  }
  
  // Update localStorage
  saveAllPatients(patients);
  
  return { success: true, message: 'Patient deleted successfully' };
};

// Add test result to patient - accessible by lab staff
export const addTestResult = async (patientId, testData) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const patient = patients.find(p => p.id === patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }
  
  // Generate test ID
  const testId = `TR-${String(patient.testResults.length + 1).padStart(3, '0')}`;
  
  const newTest = {
    id: testId,
    testDate: new Date().toISOString(),
    status: 'completed',
    ...testData
  };
  
  // Add the test to the patient's records
  patient.testResults.push(newTest);
  
  // Save to localStorage
  addTestResultToStorage(patientId, newTest);
  
  return { ...newTest };
};

// Get patient IDs only - accessibly by lab staff for verification
export const getAllPatientIds = async () => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Try to get fresh data from localStorage first
  try {
    const storedPatients = getAllPatientsFromStorage();
    if (storedPatients && storedPatients.length > 0) {
      patients = storedPatients;
    }
  } catch (error) {
    console.error('Error getting patients from localStorage:', error);
  }
  
  return patients.map(p => p.id);
};

// Verify patient ID - accessibly by lab staff
export const getPatientIdOnly = async (patientId) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Try localStorage first
  try {
    const storedPatient = getPatientFromStorage(patientId);
    if (storedPatient) {
      return { id: storedPatient.id, exists: true };
    }
  } catch (error) {
    console.error('Error getting patient from localStorage:', error);
  }
  
  // Fall back to in-memory array
  const patient = patients.find(p => p.id === patientId);
  return { id: patientId, exists: !!patient };
};

// Upload file - accessible by lab staff
export const uploadFile = async (file) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Simulate file processing and return a mock URL
  // In a real application, this would upload to a storage service like AWS S3
  const fileName = file.name;
  const fileType = file.type;
  const fileSize = `${Math.round(file.size / 1024)} KB`;
  
  // Use a data URL instead of a blob URL for better persistence
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        name: fileName,
        type: fileType,
        size: fileSize,
        url: reader.result // This will be a data URL, not a blob URL
      });
    };
    reader.readAsDataURL(file);
  });
};

// Generate patient report - only accessible by admin
export const generatePatientReport = async (patientId) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try to get from localStorage first
  try {
    const storedPatient = getPatientFromStorage(patientId);
    if (storedPatient) {
      // Create a deep copy of the patient object to ensure all nested properties are included
      const patientCopy = JSON.parse(JSON.stringify(storedPatient));
      
      // Ensure all test files are properly included
      if (patientCopy.testResults && patientCopy.testResults.length > 0) {
        patientCopy.testResults = patientCopy.testResults.map(test => {
          // Make sure files array exists and is properly formatted
          if (!test.files) {
            test.files = [];
          } else {
            // Handle any existing blob URLs by providing a fallback
            test.files = test.files.map(file => {
              if (file.url && file.url.startsWith('blob:')) {
                // Provide a fallback for blob URLs
                return {
                  ...file,
                  url: file.type && file.type.startsWith('image/') 
                    ? 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiPjwvY2lyY2xlPjxwb2x5bGluZSBwb2ludHM9IjIxIDEzLjg1IDE2IDEwLjUgOCAxNyI+PC9wb2x5bGluZT48L3N2Zz4='
                    : file.url, // Keep the blob URL for non-images, though it might still fail
                  needsFallback: file.url.startsWith('blob:') // Flag that this might need a fallback
                };
              }
              return file;
            });
          }
          
          // Ensure all test details are included
          return {
            ...test,
            // Make sure results object is included
            results: test.results || {},
            // Make sure comments are included
            comments: test.comments || '',
            // Ensure staff information is included
            addedByStaff: test.addedByStaff || 'Unknown',
            timeStamp: test.timeStamp || test.testDate
          };
        });
      }
      
      // Generate a full report including patient details and all test results
      const reportData = {
        reportId: `RPT-${Date.now()}`,
        generatedDate: new Date().toISOString(),
        patientInfo: patientCopy,
        summary: `Comprehensive Report for ${patientCopy.name} (${patientCopy.id})`,
        testCount: patientCopy.testResults ? patientCopy.testResults.length : 0,
        // Add any additional metadata that might be helpful
        reportType: 'Comprehensive',
        includesFiles: true,
        generatedBy: 'LAB-east System'
      };
      
      // Store the report data in localStorage
      try {
        localStorage.setItem(`patient_report_${patientId}_${Date.now()}`, JSON.stringify(reportData));
        console.log(`Report data stored in localStorage for patient ${patientId}`);
      } catch (error) {
        console.error('Error storing report data in localStorage:', error);
        // Continue even if localStorage fails, as this is just a backup
      }
      
      return reportData;
    }
  } catch (error) {
    console.error('Error generating report from localStorage:', error);
  }
  
  // Fall back to in-memory array if localStorage fails
  const patient = patients.find(p => p.id === patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }
  
  // Create a deep copy of the patient object to ensure all nested properties are included
  const patientCopy = JSON.parse(JSON.stringify(patient));
  
  // Ensure all test files are properly included
  if (patientCopy.testResults && patientCopy.testResults.length > 0) {
    patientCopy.testResults = patientCopy.testResults.map(test => {
      // Make sure files array exists and is properly formatted
      if (!test.files) {
        test.files = [];
      } else {
        // Handle any existing blob URLs by providing a fallback
        test.files = test.files.map(file => {
          if (file.url && file.url.startsWith('blob:')) {
            // Provide a fallback for blob URLs
            return {
              ...file,
              url: file.type && file.type.startsWith('image/') 
                ? 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiPjwvY2lyY2xlPjxwb2x5bGluZSBwb2ludHM9IjIxIDEzLjg1IDE2IDEwLjUgOCAxNyI+PC9wb2x5bGluZT48L3N2Zz4='
                : file.url, // Keep the blob URL for non-images, though it might still fail
              needsFallback: file.url.startsWith('blob:') // Flag that this might need a fallback
            };
          }
          return file;
        });
      }
          
      // Ensure all test details are included
      return {
        ...test,
        // Make sure results object is included
        results: test.results || {},
        // Make sure comments are included
        comments: test.comments || '',
        // Ensure staff information is included
        addedByStaff: test.addedByStaff || 'Unknown',
        timeStamp: test.timeStamp || test.testDate
      };
    });
  }
  
  // Generate a full report including patient details and all test results
  const reportData = {
    reportId: `RPT-${Date.now()}`,
    generatedDate: new Date().toISOString(),
    patientInfo: patientCopy,
    summary: `Comprehensive Report for ${patientCopy.name} (${patientCopy.id})`,
    testCount: patientCopy.testResults ? patientCopy.testResults.length : 0,
    // Add any additional metadata that might be helpful
    reportType: 'Comprehensive',
    includesFiles: true,
    generatedBy: 'LAB-east System'
  };
  
  // Store the report data in localStorage
  try {
    localStorage.setItem(`patient_report_${patientId}_${Date.now()}`, JSON.stringify(reportData));
    console.log(`Report data stored in localStorage for patient ${patientId}`);
  } catch (error) {
    console.error('Error storing report data in localStorage:', error);
    // Continue even if localStorage fails, as this is just a backup
  }
  
  return reportData;
}; 