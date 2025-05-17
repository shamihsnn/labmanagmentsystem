import React, { useRef, useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getPatientById } from '../../services/patientService';

const PatientReport = ({ report, user, onClose }) => {
  const reportRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [staffSignature, setStaffSignature] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [reportData, setReportData] = useState(report);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [hasRenderError, setHasRenderError] = useState(false);
  
  // Error handler to catch any rendering errors
  useEffect(() => {
    const errorHandler = (error) => {
      console.error("Error caught in PatientReport component:", error);
      setHasRenderError(true);
      return true; // Prevent default error handler
    };
    
    // Add event listener for uncaught errors
    window.addEventListener('error', errorHandler);
    
    // Clean up
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  // Reset error state when report data changes
  useEffect(() => {
    setHasRenderError(false);
  }, [report]);

  // If there was an error rendering the report, show a fallback UI
  if (hasRenderError) {
    return (
      <div className="report-modal-overlay">
        <div className="report-modal" style={{ maxWidth: '500px' }}>
          <div className="report-modal-header">
            <h2>Error Displaying Report</h2>
            <button 
              className="action-btn outline-btn"
              onClick={onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
          <div className="report-content-wrapper" style={{ textAlign: 'center', padding: '2rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="64" height="64" style={{ margin: '0 auto 1rem', color: '#e74c3c' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3>There was a problem rendering the report</h3>
            <p>We encountered an issue while trying to display this patient's report. This could be due to missing or corrupted data.</p>
            <button 
              className="action-btn primary-btn" 
              style={{ marginTop: '1rem' }}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Function to handle image errors and add fallback
  const handleImageError = (fileId) => {
    console.log(`Image load error for file: ${fileId}`);
    setImageErrors(prev => ({
      ...prev,
      [fileId]: true
    }));
  };

  // Function to check if a URL is valid
  const isValidUrl = (url) => {
    if (!url) return false;
    // Check if it's a blob URL that's already failed
    if (url.startsWith('blob:') && imageErrors[url]) return false;
    return true;
  };
  
  // Function to actively pre-load images from files
  useEffect(() => {
    if (reportData?.patientInfo?.testResults) {
      // Go through all test results looking for files
      reportData.patientInfo.testResults.forEach(test => {
        if (test.files && Array.isArray(test.files)) {
          // Process each file in this test
          test.files.forEach((file, index) => {
            if (file && file.type && file.type.startsWith('image/')) {
              // Try to load the image preview
              loadImagePreview(file)
                .then(dataUrl => {
                  // Store the data URL in the file object
                  file.dataUrl = dataUrl;
                  // Force a re-render
                  setReportData(prev => ({ ...prev }));
                })
                .catch(err => {
                  console.error(`Failed to load preview for file ${file.name || `File-${index}`}`, err);
                });
            }
          });
        }
      });
    }
  }, [reportData?.patientInfo?.testResults]);

  // Function to actively pre-load images from files
  useEffect(() => {
    if (reportData?.patientInfo?.testResults) {
      console.log("Preloading images for reports...");
      
      // Go through all test results looking for files
      reportData.patientInfo.testResults.forEach(test => {
        if (test.files && Array.isArray(test.files)) {
          // Process each file in this test
          test.files.forEach((file, index) => {
            // Try to identify any file that could potentially be an image
            const isLikelyImage = 
              (file && file.type && file.type.startsWith('image/')) || 
              (file && file.name && file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/));
              
            if (isLikelyImage) {
              console.log(`Preloading image for ${file.name || `File-${index}`}`);
              
              // Try to load the image preview
              loadImagePreview(file)
                .then(dataUrl => {
                  // Verify we got a valid data URL
                  if (dataUrl && dataUrl.startsWith('data:')) {
                    console.log(`Successfully loaded preview for ${file.name || `File-${index}`}`);
                    // Store the data URL in the file object
                    file.dataUrl = dataUrl;
                    
                    // Clear any previous error state for this file
                    setImageErrors(prev => ({
                      ...prev,
                      [`${file.name}-${index}`]: false
                    }));
                    
                    // Force a re-render
                    setReportData(prev => ({ ...prev }));
                  } else {
                    console.warn(`Invalid data URL for ${file.name || `File-${index}`}`, dataUrl);
                    throw new Error("Invalid data URL returned");
                  }
                })
                .catch(err => {
                  console.error(`Failed to load preview for ${file.name || `File-${index}`}:`, err);
                  // Try alternative methods if available
                  if (file.url && !file.url.startsWith('data:') && !file.url.startsWith('blob:')) {
                    // For HTTP URLs, try loading through Image element
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => {
                      try {
                        // Convert to data URL using canvas
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const dataUrl = canvas.toDataURL('image/jpeg');
                        file.dataUrl = dataUrl;
                        setReportData(prev => ({ ...prev }));
                        console.log(`Recovered image for ${file.name || `File-${index}`} using Image element`);
                      } catch (e) {
                        console.error('Failed to convert image to data URL:', e);
                      }
                    };
                    img.onerror = () => {
                      setImageErrors(prev => ({
                        ...prev,
                        [`${file.name}-${index}`]: true
                      }));
                    };
                    img.src = file.url;
                  } else {
                    // Mark as error
                    setImageErrors(prev => ({
                      ...prev,
                      [`${file.name}-${index}`]: true
                    }));
                  }
                });
            }
          });
        }
      });
    }
  }, [reportData?.patientInfo?.testResults]);

  // Function to get appropriate image URL (either the original or a fallback)
  const getImageUrl = (file, index) => {
    if (!file) return null;
    
    const fileId = `${file.name}-${index}`;
    
    // First priority: if we've already converted to a data URL, use it
    // This is the most reliable for PDF generation
    if (file.dataUrl && file.dataUrl.startsWith('data:') && !imageErrors[fileId]) {
      return file.dataUrl;
    }
    
    // Second priority: if file has content property that's a data URL
    if (file.content && file.content.startsWith('data:')) {
      // Store for future use
      if (!file.dataUrl) file.dataUrl = file.content;
      return file.content;
    }
    
    // Third priority: direct URL if it's already a data URL
    if (file.url && file.url.startsWith('data:') && !imageErrors[fileId]) {
      // Store for future use
      if (!file.dataUrl) file.dataUrl = file.url;
      return file.url;
    }
    
    // Fourth priority: blob URL or HTTP/HTTPS URL
    if (file.url && !imageErrors[fileId]) {
      // URL can be blob: or http(s):
      if (file.url.startsWith('blob:') || file.url.startsWith('http')) {
        return file.url;
      }
      
      // If we have a relative path, try to handle it
      if (file.url.startsWith('/')) {
        return file.url;
      }
    }
    
    // If we are checking a file that was already marked as having an error,
    // try to use any available property as a last resort
    if (imageErrors[fileId]) {
      if (file.dataUrl) return file.dataUrl;
      if (file.content && typeof file.content === 'string') return file.content;
      if (file.url) return file.url;
    }
    
    // Return appropriate placeholder based on file type
    const isImageFile = 
      (file.type && file.type.startsWith('image/')) ||
      (file.name && file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/));
      
    if (isImageFile) {
      // Return a nice image placeholder
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMTgyY2UiIHN0cm9rZS13aWR0aD0iMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiI+PC9yZWN0PjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ij48L2NpcmNsZT48cG9seWxpbmUgcG9pbnRzPSIyMSAxNS44NSAxNiAxMC41IDggMTcuMDEiPjwvcG9seWxpbmU+PC9zdmc+';
    }
    
    return null;
  };
  
  // Function to force loading an image from a file object using FileReader
  const loadImagePreview = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject('No file provided');
        return;
      }
      
      // If not explicitly an image file but we still want to try loading it
      const isLikelyImage = file.type && (
        file.type.startsWith('image/') || 
        (file.name && file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/))
      );
      
      if (!isLikelyImage && !file.type?.startsWith('image/')) {
        reject('Not an image file');
        return;
      }
      
      // If we already have a dataUrl, use it
      if (file.dataUrl && file.dataUrl.startsWith('data:')) {
        console.log('Using existing dataUrl for file:', file.name || 'unnamed');
        resolve(file.dataUrl);
        return;
      }
      
      // If we have a direct URL that's already a data URL
      if (file.url && file.url.startsWith('data:')) {
        console.log('Using existing data URL from url property:', file.name || 'unnamed');
        file.dataUrl = file.url; // Store for future use
        resolve(file.url);
        return;
      }
      
      // If we have a blob URL, try to fetch and convert it
      if (file.url && file.url.startsWith('blob:')) {
        console.log('Converting blob URL to data URL:', file.name || 'unnamed');
        fetch(file.url)
          .then(response => response.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onload = (e) => {
              file.dataUrl = e.target.result;
              resolve(e.target.result);
            };
            reader.onerror = () => {
              console.error('Failed to read blob from URL');
              reject('Failed to convert blob URL');
            };
            reader.readAsDataURL(blob);
          })
          .catch(err => {
            console.error('Failed to fetch from blob URL:', err);
            reject('Failed to fetch from blob URL');
          });
        return;
      }
      
      // If file is already a Blob/File object
      if (file instanceof Blob || file instanceof File) {
        console.log('Converting Blob/File to data URL:', file.name || 'unnamed');
        const reader = new FileReader();
        reader.onload = (e) => {
          file.dataUrl = e.target.result;
          resolve(e.target.result);
        };
        reader.onerror = (e) => {
          console.error('FileReader error:', e);
          reject('Failed to read image file');
        };
        reader.readAsDataURL(file);
        return;
      }
      
      // If file has content property that's already a data URL
      if (file.content && typeof file.content === 'string' && file.content.startsWith('data:')) {
        console.log('Using content property as data URL:', file.name || 'unnamed');
        file.dataUrl = file.content;
        resolve(file.content);
        return;
      }
      
      // If we have an HTTP URL, try to fetch and convert it (may be blocked by CORS)
      if (file.url && (file.url.startsWith('http://') || file.url.startsWith('https://'))) {
        console.log('Attempting to fetch and convert HTTP URL (may fail due to CORS):', file.name || 'unnamed');
        
        // Create an image element to load the URL
        const img = new Image();
        img.crossOrigin = "Anonymous";  // Try to avoid CORS issues
        
        img.onload = () => {
          try {
            // Create canvas to convert to data URL
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            const dataUrl = canvas.toDataURL('image/jpeg');
            file.dataUrl = dataUrl;
            resolve(dataUrl);
          } catch (e) {
            console.error('Error converting image to data URL:', e);
            reject('Failed to convert image to data URL');
          }
        };
        
        img.onerror = () => {
          console.error('Failed to load image from URL:', file.url);
          reject('Failed to load image from URL');
        };
        
        img.src = file.url;
        return;
      }
      
      // No suitable way to load the image
      reject('No supported method to load this image');
    });
  };
  
  // Function to get file icon based on file type
  const getFileIcon = (file) => {
    if (!file || !file.type) return 'document';
    
    const type = file.type.toLowerCase();
    
    if (type.includes('image')) return 'image';
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('word') || type.includes('doc')) return 'doc';
    if (type.includes('excel') || type.includes('sheet') || type.includes('csv')) return 'sheet';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'presentation';
    if (type.includes('text') || type.includes('txt')) return 'text';
    if (type.includes('zip') || type.includes('compressed') || type.includes('archive')) return 'archive';
    if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) return 'audio';
    if (type.includes('video') || type.includes('mp4')) return 'video';
    
    return 'document';
  };
  
  // Function to fetch patient data directly as a last resort
  const fetchPatientData = async (patientId) => {
    if (!patientId) return null;
    
    setIsLoadingData(true);
    try {
      const patientData = await getPatientById(patientId);
      
      if (patientData) {
        // Construct a manual report object
        const manualReport = {
          reportId: `RPT-MANUAL-${Date.now()}`,
          generatedDate: new Date().toISOString(),
          patientInfo: patientData,
          summary: `Manual Report for ${patientData.name} (${patientData.id})`,
          testCount: patientData.testResults ? patientData.testResults.length : 0,
          reportType: 'Manual',
          includesFiles: true,
          generatedBy: 'LAB-east System (Manual Fallback)'
        };
        
        // Store this manual report in localStorage as well
        try {
          localStorage.setItem(`patient_report_manual_${patientId}`, JSON.stringify(manualReport));
        } catch (err) {
          console.error('Error storing manual report to localStorage:', err);
        }
        
        return manualReport;
      }
    } catch (error) {
      console.error('Error fetching patient data directly:', error);
    } finally {
      setIsLoadingData(false);
    }
    
    return null;
  };
  
  // Function to attempt loading files from server or cache if needed
  const attemptLoadFilePreviews = (testResults) => {
    if (!testResults || !Array.isArray(testResults)) return;
    
    testResults.forEach(test => {
      if (test.files && Array.isArray(test.files)) {
        test.files.forEach((file, index) => {
          // Skip files that don't need preview or already have dataUrl
          if (!file || !file.type || !file.type.startsWith('image/') || file.dataUrl) {
            return;
          }
          
          // For image files without preview, try to load preview
          if (file.url) {
            // Create a new image element to preload
            const img = new Image();
            img.onload = () => {
              console.log(`Successfully loaded image from URL: ${file.url}`);
              // Mark this file as successfully loaded
              setImageErrors(prev => ({
                ...prev,
                [`${file.name}-${index}`]: false
              }));
              
              // Force a refresh
              setReportData(prevData => ({...prevData}));
            };
            img.onerror = () => {
              console.log(`Failed to load image from URL: ${file.url}`);
              // Try to load using FileReader approach as fallback
              if (file instanceof Blob || file instanceof File) {
                loadImagePreview(file)
                  .then(dataUrl => {
                    file.dataUrl = dataUrl;
                    setReportData(prevData => ({...prevData}));
                  })
                  .catch(() => {
                    // Mark as error
                    setImageErrors(prev => ({
                      ...prev,
                      [`${file.name}-${index}`]: true
                    }));
                  });
              }
            };
            img.src = file.url;
          }
        });
      }
    });
  };
  
  // On mount or when report changes, check localStorage for backup data if needed
  useEffect(() => {
    const loadReportData = async () => {
      // Log the initial report for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log("Initial report prop:", report);
      }

      // Make a deep copy of the report to avoid modification issues
      const reportCopy = report ? JSON.parse(JSON.stringify(report)) : null;

      // First try to use the provided report
      if (reportCopy && reportCopy.patientInfo && 
          reportCopy.patientInfo.testResults && 
          reportCopy.patientInfo.testResults.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Using provided report data directly from prop');
        }
        // Ensure all testResults have properly formatted data
        reportCopy.patientInfo.testResults = reportCopy.patientInfo.testResults.map(test => {
          return {
            ...test,
            testName: test.testName || "General Test",
            testDate: test.testDate || new Date().toISOString(),
            id: test.id || `TR-${Math.floor(Math.random() * 1000)}`,
            addedByStaff: test.addedByStaff || user?.username || 'admin',
            // Add placeholder results if none exist
            results: test.results && Object.keys(test.results).length > 0 ? 
              test.results : 
              { "Parameter": "No specific parameters recorded" }
          };
        });
        setReportData(reportCopy);
        return;
      }
      
      // If the report exists but seems incomplete, try to get the patient ID
      const patientId = reportCopy?.patientInfo?.id || null;
      
      // Try localStorage first
      try {
        // Look for this specific patient report first
        if (patientId) {
          const specificPatientReportKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes(`patient_report_${patientId}`)) {
              specificPatientReportKeys.push(key);
            }
          }
          
          if (specificPatientReportKeys.length > 0) {
            specificPatientReportKeys.sort((a, b) => {
              const aTime = a.split('_').pop() || 0;
              const bTime = b.split('_').pop() || 0;
              return bTime - aTime;
            });
            
            const latestReport = JSON.parse(localStorage.getItem(specificPatientReportKeys[0]));
            if (latestReport && latestReport.patientInfo && 
                latestReport.patientInfo.testResults && 
                latestReport.patientInfo.testResults.length > 0) {
              setReportData(latestReport);
              return;
            }
          }
        }
        
        // If no specific report found, look for any report
        const allReports = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('patient_report_')) {
            try {
              const storedReport = JSON.parse(localStorage.getItem(key));
              if (storedReport && storedReport.patientInfo && 
                  storedReport.patientInfo.testResults && 
                  storedReport.patientInfo.testResults.length > 0) {
                allReports.push(storedReport);
              }
            } catch (e) {
              console.error('Error parsing stored report from localStorage:', e);
            }
          }
        }
        
        if (allReports.length > 0) {
          allReports.sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));
          setReportData(allReports[0]);
          return;
        }
      } catch (error) {
        console.error('Error retrieving report from localStorage:', error);
      }
      
      // As a last resort, try to fetch patient data directly if we have a patient ID
      if (patientId) {
        try {
          const manualReport = await fetchPatientData(patientId);
          if (manualReport) {
            setReportData(manualReport);
            return;
          }
        } catch (e) {
          console.error('Error during fetchPatientData:', e);
        }
      }
      
      // If we got here and still have a report, use it even if it's incomplete
      if (reportCopy && reportCopy.patientInfo) {
        // Create default test results if missing
        if (!reportCopy.patientInfo.testResults || reportCopy.patientInfo.testResults.length === 0) {
          reportCopy.patientInfo.testResults = [{
            testName: "General Health Assessment",
            testDate: new Date().toISOString(),
            id: `TR-${Math.floor(Math.random() * 1000)}`,
            addedByStaff: user?.username || 'admin',
            timeStamp: new Date().toISOString(),
            results: {
              "General Health": "Assessment pending",
              "Notes": "Full test results to be added"
            },
            comments: "Initial assessment"
          }];
        }
        
        reportCopy.testCount = reportCopy.patientInfo.testResults.length;
        setReportData(reportCopy);
        return;
      }
      
      // If we still don't have valid data, create a fallback report
      const fallbackReport = {
        reportId: `RPT-FALLBACK-${Date.now()}`,
        generatedDate: new Date().toISOString(),
        patientInfo: {
          id: patientId || 'PAT-UNKNOWN',
          name: 'Patient data unavailable',
          age: 'N/A',
          gender: 'N/A',
          bloodGroup: 'N/A',
          contact: 'N/A',
          testResults: [{
            testName: "Test Results Unavailable",
            testDate: new Date().toISOString(),
            id: "TR-UNAVAILABLE",
            addedByStaff: user?.username || 'admin',
            timeStamp: new Date().toISOString(),
            results: {
              "Status": "Data retrieval issue",
              "Action Required": "Please regenerate this report or contact IT support"
            },
            comments: "Data could not be loaded properly"
          }]
        },
        summary: "Fallback Report - Data Retrieval Issue",
        testCount: 1,
        reportType: 'Fallback',
        includesFiles: false,
        generatedBy: 'LAB-east System (Fallback)'
      };
      
      setReportData(fallbackReport);
    };
    
    loadReportData()
      .then(() => {
        // After loading report data, attempt to load file previews
        if (reportData?.patientInfo?.testResults) {
          console.log("Attempting to load file previews...");
          attemptLoadFilePreviews(reportData.patientInfo.testResults);
        }
      })
      .catch(err => console.error("Error in report loading process:", err));
  }, [report, user]);

  // On mount or when report changes, check localStorage for backup data if needed
  useEffect(() => {
    const loadReportData = async () => {
      // Log the initial report for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log("Initial report prop:", report);
      }

      // Make a deep copy of the report to avoid modification issues
      const reportCopy = report ? JSON.parse(JSON.stringify(report)) : null;

      // First try to use the provided report
      if (reportCopy && reportCopy.patientInfo && 
          reportCopy.patientInfo.testResults && 
          reportCopy.patientInfo.testResults.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Using provided report data directly from prop');
        }
        // Ensure all testResults have properly formatted data
        reportCopy.patientInfo.testResults = reportCopy.patientInfo.testResults.map(test => {
          return {
            ...test,
            testName: test.testName || "General Test",
            testDate: test.testDate || new Date().toISOString(),
            id: test.id || `TR-${Math.floor(Math.random() * 1000)}`,
            addedByStaff: test.addedByStaff || user?.username || 'admin',
            // Add placeholder results if none exist
            results: test.results && Object.keys(test.results).length > 0 ? 
              test.results : 
              { "Parameter": "No specific parameters recorded" }
          };
        });
        
        // Pre-process any files to prepare for display and PDF generation
        reportCopy.patientInfo.testResults.forEach(test => {
          if (test.files && Array.isArray(test.files)) {
            test.files.forEach((file, fileIndex) => {
              // Ensure file has proper structure
              if (!file) return;
              
              // Add a unique ID to each file for reference
              file.fileId = file.fileId || `file-${test.id}-${fileIndex}`;
              
              // For image files, try to normalize paths and prepare for display
              if (file.type?.startsWith('image/') || 
                  (file.name && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name))) {
                console.log(`Processing image file: ${file.name || 'unnamed'}`);
                
                // If a file has multiple possible sources for image data, prioritize them
                if (file.dataUrl) {
                  console.log(`File ${file.name} already has dataUrl`);
                } else if (file.content && file.content.startsWith('data:')) {
                  file.dataUrl = file.content;
                  console.log(`File ${file.name} has content that is a data URL`);
                } else if (file.url && file.url.startsWith('data:')) {
                  file.dataUrl = file.url;
                  console.log(`File ${file.name} has URL that is a data URL`);
                }
                // Note: blob URLs and HTTP URLs will be handled by the loadImagePreview function
              }
            });
          }
        });
        
        setReportData(reportCopy);
        return;
      }
      
      // Rest of the function remains the same...
      // If the report exists but seems incomplete, try to get the patient ID
      const patientId = reportCopy?.patientInfo?.id || null;
      
      // Try localStorage first
      try {
        // Look for this specific patient report first
        if (patientId) {
          const specificPatientReportKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes(`patient_report_${patientId}`)) {
              specificPatientReportKeys.push(key);
            }
          }
          
          if (specificPatientReportKeys.length > 0) {
            specificPatientReportKeys.sort((a, b) => {
              const aTime = a.split('_').pop() || 0;
              const bTime = b.split('_').pop() || 0;
              return bTime - aTime;
            });
            
            const latestReport = JSON.parse(localStorage.getItem(specificPatientReportKeys[0]));
            if (latestReport && latestReport.patientInfo && 
                latestReport.patientInfo.testResults && 
                latestReport.patientInfo.testResults.length > 0) {
              setReportData(latestReport);
              return;
            }
          }
        }
        
        // If no specific report found, look for any report
        const allReports = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('patient_report_')) {
            try {
              const storedReport = JSON.parse(localStorage.getItem(key));
              if (storedReport && storedReport.patientInfo && 
                  storedReport.patientInfo.testResults && 
                  storedReport.patientInfo.testResults.length > 0) {
                allReports.push(storedReport);
              }
            } catch (e) {
              console.error('Error parsing stored report from localStorage:', e);
            }
          }
        }
        
        if (allReports.length > 0) {
          allReports.sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));
          setReportData(allReports[0]);
          return;
        }
      } catch (error) {
        console.error('Error retrieving report from localStorage:', error);
      }
      
      // As a last resort, try to fetch patient data directly if we have a patient ID
      if (patientId) {
        try {
          const manualReport = await fetchPatientData(patientId);
          if (manualReport) {
            setReportData(manualReport);
            return;
          }
        } catch (e) {
          console.error('Error during fetchPatientData:', e);
        }
      }
      
      // If we got here and still have a report, use it even if it's incomplete
      if (reportCopy && reportCopy.patientInfo) {
        // Create default test results if missing
        if (!reportCopy.patientInfo.testResults || reportCopy.patientInfo.testResults.length === 0) {
          reportCopy.patientInfo.testResults = [{
            testName: "General Health Assessment",
            testDate: new Date().toISOString(),
            id: `TR-${Math.floor(Math.random() * 1000)}`,
            addedByStaff: user?.username || 'admin',
            timeStamp: new Date().toISOString(),
            results: {
              "General Health": "Assessment pending",
              "Notes": "Full test results to be added"
            },
            comments: "Initial assessment"
          }];
        }
        
        reportCopy.testCount = reportCopy.patientInfo.testResults.length;
        setReportData(reportCopy);
        return;
      }
      
      // If we still don't have valid data, create a fallback report
      const fallbackReport = {
        reportId: `RPT-FALLBACK-${Date.now()}`,
        generatedDate: new Date().toISOString(),
        patientInfo: {
          id: patientId || 'PAT-UNKNOWN',
          name: 'Patient data unavailable',
          age: 'N/A',
          gender: 'N/A',
          bloodGroup: 'N/A',
          contact: 'N/A',
          testResults: [{
            testName: "Test Results Unavailable",
            testDate: new Date().toISOString(),
            id: "TR-UNAVAILABLE",
            addedByStaff: user?.username || 'admin',
            timeStamp: new Date().toISOString(),
            results: {
              "Status": "Data retrieval issue",
              "Action Required": "Please regenerate this report or contact IT support"
            },
            comments: "Data could not be loaded properly"
          }]
        },
        summary: "Fallback Report - Data Retrieval Issue",
        testCount: 1,
        reportType: 'Fallback',
        includesFiles: false,
        generatedBy: 'LAB-east System (Fallback)'
      };
      
      setReportData(fallbackReport);
    };
    
    loadReportData()
      .then(() => {
        // After loading report data, attempt to load file previews
        if (reportData?.patientInfo?.testResults) {
          console.log("Attempting to preload file previews for PDF generation...");
          
          // Initialize image loading for all files
          reportData.patientInfo.testResults.forEach(test => {
            if (test.files && Array.isArray(test.files)) {
              console.log(`Processing ${test.files.length} files for test ${test.id}`);
              
              test.files.forEach((file, fileIndex) => {
                // Focus on images first
                if (file && (file.type?.startsWith('image/') || 
                    (file.name && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name)))) {
                  
                  console.log(`Preloading image: ${file.name || 'unnamed'}-${fileIndex}`);
                  
                  // Try to convert to data URL if not already done
                  loadImagePreview(file)
                    .then(dataUrl => {
                      if (dataUrl && dataUrl.startsWith('data:')) {
                        console.log(`Successfully loaded image for PDF: ${file.name || 'unnamed'}`);
                        file.dataUrl = dataUrl;
                        
                        // Mark as successfully loaded
                        setImageErrors(prev => ({
                          ...prev,
                          [`${file.name}-${fileIndex}`]: false
                        }));
                        
                        // Force UI refresh
                        setReportData(prev => ({...prev}));
                      }
                    })
                    .catch(err => {
                      console.error(`Failed to preload image for PDF: ${file.name || 'unnamed'}`, err);
                      setImageErrors(prev => ({
                        ...prev,
                        [`${file.name}-${fileIndex}`]: true
                      }));
                    });
                }
              });
            }
          });
        }
      })
      .catch(err => console.error("Error in report loading process:", err));
  }, [report, user]);
  
  // Format the date in a professional way
  const formatDate = (dateString) => {
    try {
      const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || 'N/A';
    }
  };
  
        const generatePDF = async () => {
        if (!reportRef.current) return;
        
        try {
          console.log("Starting PDF generation...");
          
          // Make sure we have a signature
          if (!staffSignature || staffSignature.trim() === '') {
            // Scroll to signature area
            const signatureInput = reportRef.current.querySelector('.signatures-section input');
            if (signatureInput) {
              signatureInput.focus();
              signatureInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            // Show alert
            alert('Please enter your signature before generating the PDF.');
            return; // Don't proceed with PDF generation
          }
          
          // Ensure we use the staff signature that was entered
          const currentSignature = staffSignature || user?.username || 'Medical Staff';
          
          setIsGeneratingPDF(true);
          console.log("PDF generation in progress...");
      
      // Create PDF document directly
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      // Helper function to add text with proper line breaks
      const addWrappedText = (text, x, y, maxWidth, lineHeight) => {
        if (!text) text = '';
        const textLines = doc.splitTextToSize(String(text), maxWidth);
        doc.text(textLines, x, y);
        return textLines.length * lineHeight;
      };
      
      // Define professional colors
      const colors = {
        primary: [41, 82, 163],         // Rich blue
        secondary: [0, 140, 199],       // Bright blue
        accent: [0, 168, 145],          // Modern teal
        text: [35, 40, 45],             // Near black
        lightText: [90, 90, 95],        // Dark gray
        veryLightText: [130, 130, 135], // Medium gray
        lightBg: [245, 250, 255],       // Very light blue
        highlightBg: [235, 245, 253],   // Light blue background
        green: [36, 194, 103],          // Vibrant green
        red: [221, 66, 50],             // Bright red
        orange: [233, 146, 8],          // Bright orange
        gold: [212, 175, 55],           // Gold accent
        purple: [142, 68, 173]          // Purple accent
      };
      
      // Track the current page for better content distribution
      let currentPage = 1;
      const pageWidth = 210;  // A4 width in mm
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Helper function to set color
      const setColor = (colorArray) => {
        doc.setTextColor(colorArray[0], colorArray[1], colorArray[2]);
      };
      
      // Helper function to set fill color
      const setFillColor = (colorArray) => {
        doc.setFillColor(colorArray[0], colorArray[1], colorArray[2]);
      };
      
      // Helper function to set draw color
      const setDrawColor = (colorArray) => {
        doc.setDrawColor(colorArray[0], colorArray[1], colorArray[2]);
      };
      
      // Helper function to draw a header bar
      const drawHeaderBar = (y, height = 12, fillColor = colors.primary) => {
        setFillColor(fillColor);
        doc.rect(0, y, pageWidth, height, 'F');
      };
      
      // Helper function to add section title
      const addSectionTitle = (title, y) => {
        doc.setFillColor(colors.highlightBg[0], colors.highlightBg[1], colors.highlightBg[2]);
        doc.rect(margin, y, contentWidth, 10, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        setColor(colors.primary);
        doc.text(title, margin + 3, y + 7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        setColor(colors.text);
        
        return y + 15; // Return new Y position after title
      };
      
      // Helper function to check if we need a new page and create one if necessary
      const checkPageBreak = (requiredSpace = 40) => {
        if (yPosition + requiredSpace > 270) {
          // Add footer to current page
          doc.setFontSize(8);
          setColor(colors.lightText);
          doc.text(`LAB-east Medical Systems • Generated ${formatDate(new Date())} • Page ${currentPage}`, pageWidth/2, 287, { align: 'center' });
          
          // Create new page
          doc.addPage();
          currentPage++;
          yPosition = 20;
          
          // Add header to new page
          drawHeaderBar(0);
          setColor([255, 255, 255]);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('LAB-east Medical Report', margin, 8);
          doc.setFont('helvetica', 'normal');
          doc.text(`Patient ID: ${reportData.patientInfo.id || 'N/A'}`, pageWidth - margin, 8, { align: 'right' });
          doc.setFontSize(10);
          setColor(colors.text);
          
          return true;
        }
        return false;
      };
      
      // ===== START DRAWING THE PDF =====
      // Top header bar
      drawHeaderBar(0);
      
      // Report title and logo
      doc.setFont('helvetica', 'bold');
      setColor([255, 255, 255]);
      doc.setFontSize(12);
      doc.text('LAB-east Medical Systems', margin, 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Comprehensive Medical Report', pageWidth - margin, 8, { align: 'right' });
      
      // Add lab logo icon (drawn as vector for better quality)
      const drawLabLogo = (x, y, size) => {
        setFillColor([255, 255, 255]);
        setDrawColor([255, 255, 255]);
        
        // Draw flask icon
        doc.circle(x, y, size/2, 'F');
        doc.setLineWidth(size/10);
        
        // Draw test tube
        const tubeWidth = size/3;
        doc.line(x - tubeWidth, y - size/3, x + tubeWidth, y - size/3);
        doc.line(x - tubeWidth, y - size/3, x - tubeWidth, y + size/2);
        doc.line(x + tubeWidth, y - size/3, x + tubeWidth, y + size/2);
        
        // Draw rounded bottom
        const curve = new Array(7).fill(0).map((_, i) => {
          const angle = Math.PI * (i / 6);
          return {
            x: x + Math.cos(angle) * tubeWidth,
            y: y + size/2 + Math.sin(angle) * (size/6) - size/6
          };
        });
        
        doc.lines(curve.map((p, i, arr) => {
          if (i === 0) return [0, 0];
          return [p.x - arr[i-1].x, p.y - arr[i-1].y];
        }), curve[0].x, curve[0].y);
      };
      
      // Draw the logo
      drawLabLogo(pageWidth - margin - 15, 8, 5);
      
      // Start content area
      let yPosition = 20;
      doc.setFontSize(10);
      setColor(colors.text);
      
      // Report header with reference number and date
      doc.setFillColor(colors.lightBg[0], colors.lightBg[1], colors.lightBg[2]);
      doc.rect(margin, yPosition, contentWidth, 25, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, yPosition, contentWidth, 25, 'S');
      
      // Report title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      setColor(colors.primary);
      doc.text('PATIENT MEDICAL REPORT', margin + contentWidth/2, yPosition + 10, { align: 'center' });
      
      // Report ID and date
      doc.setFontSize(9);
      setColor(colors.secondary);
      doc.text(`Report ID: ${reportData.reportId || 'N/A'}`, margin + 5, yPosition + 20);
      doc.text(`Generated: ${formatDate(reportData.generatedDate) || 'N/A'}`, pageWidth - margin - 5, yPosition + 20, { align: 'right' });
      
      // Reset text color and move position
      setColor(colors.text);
      doc.setFont('helvetica', 'normal');
      yPosition += 30;
      
      // Patient Information Section
      yPosition = addSectionTitle('Patient Information', yPosition);
      
      // Create patient info box
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, contentWidth, 33, 'S');
      
      // Two-column layout for patient info
      const colWidth = contentWidth / 2;
      
      // Left column
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      setColor(colors.secondary);
      doc.text('Name:', margin + 5, yPosition + 6);
      doc.text('Patient ID:', margin + 5, yPosition + 14);
      doc.text('Age:', margin + 5, yPosition + 22);
      doc.text('Contact:', margin + 5, yPosition + 30);
      
      // Right column
      doc.text('Gender:', margin + colWidth + 5, yPosition + 6);
      doc.text('Blood Group:', margin + colWidth + 5, yPosition + 14);
      doc.text('Date of Birth:', margin + colWidth + 5, yPosition + 22);
      
      // Patient values - left column
      doc.setFont('helvetica', 'normal');
      setColor(colors.text);
      doc.text(reportData.patientInfo.name || 'N/A', margin + 25, yPosition + 6);
      doc.text(reportData.patientInfo.id || 'N/A', margin + 25, yPosition + 14);
      doc.text(reportData.patientInfo.age ? `${reportData.patientInfo.age} years` : 'N/A', margin + 25, yPosition + 22);
      doc.text(reportData.patientInfo.contact || 'N/A', margin + 25, yPosition + 30);
      
      // Patient values - right column
      doc.text(reportData.patientInfo.gender || 'N/A', margin + colWidth + 32, yPosition + 6);
      doc.text(reportData.patientInfo.bloodGroup || 'N/A', margin + colWidth + 32, yPosition + 14);
      
      // Estimate DOB from age if available
      let dob = 'N/A';
      if (reportData.patientInfo.age) {
        const today = new Date();
        const birthYear = today.getFullYear() - parseInt(reportData.patientInfo.age);
        dob = `Est. ${birthYear}`;
      }
      doc.text(dob, margin + colWidth + 32, yPosition + 22);
      
      yPosition += 40;
      
      // Summary Section
      yPosition = addSectionTitle('Report Summary', yPosition);
      
      // Summary box
      setFillColor(colors.lightBg);
      doc.rect(margin, yPosition, contentWidth, 20, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, yPosition, contentWidth, 20, 'S');
      
      // Summary content
      doc.setFontSize(10);
      setColor(colors.text);
      const summaryHeight = addWrappedText(
        reportData.summary || 'Comprehensive medical examination results for the patient.',
        margin + 5, yPosition + 7, contentWidth - 10, 5
      );
      
      yPosition += Math.max(20, summaryHeight + 10);
      
      // Test Results Section
      yPosition = addSectionTitle('Test Results', yPosition);
      
      // Test results content
      if (reportData.patientInfo.testResults && reportData.patientInfo.testResults.length > 0) {
        for (const test of reportData.patientInfo.testResults) {
          // Check if we need a new page
          checkPageBreak(60); // Estimate space needed for test header + some rows
          
          // Test header box
          setFillColor(colors.highlightBg);
          doc.rect(margin, yPosition, contentWidth, 14, 'F');
          doc.setDrawColor(200, 210, 220);
          doc.rect(margin, yPosition, contentWidth, 14, 'S');
          
          // Test title
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          setColor(colors.primary);
          doc.text(test.testName || 'General Test', margin + 5, yPosition + 6);
          
          // Test date and ID
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          setColor(colors.lightText);
          doc.text(`Date: ${formatDate(test.testDate) || 'N/A'}  |  Test ID: ${test.id || 'N/A'}  |  Staff: ${test.addedByStaff || 'N/A'}`, 
                  pageWidth - margin - 5, yPosition + 6, { align: 'right' });
          
          yPosition += 16;
          
          // Test results table
          if (test.results && typeof test.results === 'object') {
            // Table header
            const colWidths = [50, 40, 50, 30]; // Parameter, Value, Reference Range, Status
            const tableWidth = contentWidth;
            const tableBorderColor = [220, 220, 220];
            
            // Draw table header
            setFillColor(colors.primary);
            doc.rect(margin, yPosition, tableWidth, 8, 'F');
            
            // Table header text
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Parameter', margin + 5, yPosition + 5.5);
            doc.text('Value', margin + colWidths[0] + 5, yPosition + 5.5);
            doc.text('Reference Range', margin + colWidths[0] + colWidths[1] + 5, yPosition + 5.5);
            doc.text('Status', margin + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition + 5.5);
            
            yPosition += 8;
            
            // Table rows
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            let rowColor = true;
            
            for (const [param, value] of Object.entries(test.results)) {
              // Check if we need a new page
              if (checkPageBreak(15)) {
                // Redraw table header on new page
                setFillColor(colors.primary);
                doc.rect(margin, yPosition, tableWidth, 8, 'F');
                
                // Table header text
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text('Parameter', margin + 5, yPosition + 5.5);
                doc.text('Value', margin + colWidths[0] + 5, yPosition + 5.5);
                doc.text('Reference Range', margin + colWidths[0] + colWidths[1] + 5, yPosition + 5.5);
                doc.text('Status', margin + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition + 5.5);
                
                doc.setFont('helvetica', 'normal');
                yPosition += 8;
              }
              
              // Extract values
              let displayValue = '';
              let referenceRange = 'N/A';
              let statusClass = 'status-normal';
              let statusText = 'Normal';
              let diseaseIndicator = null;
              
              try {
                displayValue = value;
                
                // If value is an object with structured data
                if (typeof value === 'object' && value !== null) {
                  // Handle new format with minRange/maxRange
                  if (value.minRange !== undefined || value.maxRange !== undefined) {
                    displayValue = value.value !== undefined ? String(value.value) : 'N/A';
                    if (value.minRange && value.maxRange) {
                      referenceRange = `${value.minRange} - ${value.maxRange}`;
                    } else if (value.minRange) {
                      referenceRange = `> ${value.minRange}`;
                    } else if (value.maxRange) {
                      referenceRange = `< ${value.maxRange}`;
                    }
                    status = value.status || 'Normal';
                  } 
                  // Handle previous format with value/range/status
                  else if (value.value !== undefined) {
                    displayValue = value.value !== undefined ? String(value.value) : 'N/A';
                    referenceRange = value.range || (value.referenceRange ? value.referenceRange : 'N/A');
                    status = value.status || 'Normal';
                  }
                } else {
                  // Handle primitive value
                  displayValue = value !== undefined ? String(value) : 'N/A';
                }
                
                // Get enhanced status details
                const statusDetails = getStatusDetails(param, value, referenceRange);
                statusClass = statusDetails.statusClass;
                statusText = statusDetails.statusText;
                diseaseIndicator = statusDetails.diseaseIndicator;
              } catch (error) {
                console.error('Error processing test result value:', error);
                // Fallback to safe defaults if there's an error
                displayValue = typeof value === 'object' ? 'Complex Value' : String(value || 'N/A');
                referenceRange = 'N/A';
                statusText = 'Normal';
              }
              
              // Ensure text doesn't exceed allocated space and convert to string
              const paramText = String(param || '').substring(0, 25);
              const displayValueText = String(displayValue || '').substring(0, 25);
              const referenceRangeText = String(referenceRange || '').substring(0, 25);
              const statusDisplayText = String(statusText || '').substring(0, 15);
              
              // Row background - alternate colors
              if (rowColor) {
                setFillColor([248, 249, 250]);
                doc.rect(margin, yPosition, tableWidth, 7, 'F');
              }
              rowColor = !rowColor;
              
              // Custom background for abnormal values
              if (statusClass === 'status-high' || statusClass === 'status-abnormal') {
                setFillColor([255, 240, 240]);
                doc.rect(margin, yPosition, tableWidth, 7, 'F');
              } else if (statusClass === 'status-low') {
                setFillColor([255, 248, 230]);
                doc.rect(margin, yPosition, tableWidth, 7, 'F');
              }
              
              // Draw row border
              doc.setDrawColor(tableBorderColor[0], tableBorderColor[1], tableBorderColor[2]);
              doc.setLineWidth(0.1);
              doc.line(margin, yPosition, margin + tableWidth, yPosition);
              
              // Add cell texts
              setColor(colors.text);
              doc.text(paramText, margin + 5, yPosition + 5);
              doc.text(displayValueText, margin + colWidths[0] + 5, yPosition + 5);
              
              // Reference range in gray
              setColor(colors.lightText);
              doc.text(referenceRangeText, margin + colWidths[0] + colWidths[1] + 5, yPosition + 5);
              
              // Status with color coding
              if (statusClass === 'status-normal') {
                setColor(colors.green);
              } else if (statusClass === 'status-high' || statusClass === 'status-abnormal') {
                setColor(colors.red);
              } else if (statusClass === 'status-low') {
                setColor(colors.orange);
              }
              
              doc.setFont('helvetica', 'bold');
              doc.text(statusDisplayText, margin + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition + 5);
              doc.setFont('helvetica', 'normal');
              
              yPosition += 7;
              
              // Add disease indicator if present
              if (diseaseIndicator) {
                setColor(colors.red);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(8);
                doc.text(`Possible: ${diseaseIndicator}`.substring(0, 45), 
                         margin + colWidths[0] + colWidths[1] + 5, yPosition + 3);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                setColor(colors.text);
                yPosition += 5;
              }
            }
            
            // Bottom border for table
            doc.setDrawColor(tableBorderColor[0], tableBorderColor[1], tableBorderColor[2]);
            doc.line(margin, yPosition, margin + tableWidth, yPosition);
            
          } else {
            setColor(colors.lightText);
            doc.text('No detailed results available', margin + 5, yPosition + 5);
            yPosition += 7;
          }
          
          // Test comments
          if (test.comments) {
            yPosition += 4;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            setColor(colors.secondary);
            doc.text('Comments:', margin + 5, yPosition + 5);
            doc.setFont('helvetica', 'normal');
            setColor(colors.text);
            yPosition += 5;
            
            // Comments box
            setFillColor([250, 250, 250]);
            doc.rect(margin + 5, yPosition, contentWidth - 10, 14, 'F');
            doc.setDrawColor(220, 220, 220);
            doc.rect(margin + 5, yPosition, contentWidth - 10, 14, 'S');
            
            const commentsHeight = addWrappedText(test.comments, margin + 8, yPosition + 5, contentWidth - 16, 4);
            yPosition += Math.max(14, commentsHeight + 5);
          }
          
          // Attached Files
          if (test.files && test.files.length > 0) {
            try {
              // Check if we need a new page
              checkPageBreak(80); // Need more space for image previews
              
              yPosition += 4;
              doc.setFontSize(9);
              doc.setFont('helvetica', 'bold');
              setColor(colors.secondary);
              doc.text('Attached Files:', margin + 5, yPosition + 5);
              doc.setFont('helvetica', 'normal');
              setColor(colors.text);
              yPosition += 10;
              
              // Create container for image previews
              const fileDisplayHeight = Math.min(120, 40 + (Math.ceil(test.files.length / 2) * 40));
              
              // Clear background for the container
              setFillColor([248, 250, 252]);
              doc.rect(margin + 5, yPosition, contentWidth - 10, fileDisplayHeight, 'F');
              doc.setDrawColor(220, 220, 220);
              doc.rect(margin + 5, yPosition, contentWidth - 10, fileDisplayHeight, 'S');
              
              // Add a title for the files section
              doc.setFontSize(10);
              doc.setFont('helvetica', 'bold');
              setColor(colors.primary);
              doc.text(`Attached Files (${test.files.length})`, margin + 15, yPosition + 12);
              
              // Calculate parameters for image grid
              const maxFilesPerRow = 3;
              const previewWidth = (contentWidth - 50) / maxFilesPerRow;
              const previewHeight = 40;
              
              const maxFilesToShow = Math.min(test.files.length, 6); // Limit to 6 files max
              
              // Start positions for the grid
              let startY = yPosition + 20;
              
              // Show file previews in a grid layout
              for (let i = 0; i < maxFilesToShow; i++) {
                const file = test.files[i];
                const row = Math.floor(i / maxFilesPerRow);
                const col = i % maxFilesPerRow;
                
                const fileX = margin + 15 + (col * previewWidth) + (col * 5);
                const fileY = startY + (row * (previewHeight + 15));
                
                // Draw background for this file
                setFillColor([255, 255, 255]);
                doc.roundedRect(fileX, fileY, previewWidth, previewHeight, 2, 2, 'F');
                doc.setDrawColor(230, 230, 230);
                doc.roundedRect(fileX, fileY, previewWidth, previewHeight, 2, 2, 'S');
                
                // File name at the bottom
                setColor(colors.text);
                doc.setFontSize(7);
                let fileName = file.name || `File ${i+1}`;
                fileName = fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName;
                doc.text(fileName, fileX + previewWidth/2, fileY + previewHeight - 5, { align: 'center' });
                
                // Add image if it's an image file
                if (file.type && file.type.startsWith('image/')) {
                  try {
                    // Try to get image data
                    const imageUrl = getImageUrl(file, i);
                    
                    if (imageUrl && imageUrl.startsWith('data:')) {
                      // We have a data URL we can add directly to PDF
                      try {
                        // Calculate dimensions to maintain aspect ratio
                        const imgWidth = previewWidth - 10;
                        const imgHeight = previewHeight - 15;
                        
                        // Add the image
                        doc.addImage(imageUrl, 'JPEG', fileX + 5, fileY + 3, imgWidth, imgHeight);
                      } catch (imgErr) {
                        console.error('Failed to add image to PDF:', imgErr);
                        // Draw placeholder text instead
                        setColor(colors.accent);
                        doc.setFontSize(8);
                        doc.text('IMAGE', fileX + previewWidth/2, fileY + previewHeight/2 - 5, { align: 'center' });
                      }
                    } else if (file.dataUrl) {
                      // Try with the dataUrl property
                      try {
                        const imgWidth = previewWidth - 10;
                        const imgHeight = previewHeight - 15;
                        doc.addImage(file.dataUrl, 'JPEG', fileX + 5, fileY + 3, imgWidth, imgHeight);
                      } catch (imgErr) {
                        console.error('Failed to add image to PDF using dataUrl:', imgErr);
                        setColor(colors.accent);
                        doc.setFontSize(8);
                        doc.text('IMAGE', fileX + previewWidth/2, fileY + previewHeight/2 - 5, { align: 'center' });
                      }
                    } else {
                      // Can't add image, show placeholder
                      setColor(colors.accent);
                      doc.setFontSize(8);
                      doc.text('IMAGE', fileX + previewWidth/2, fileY + previewHeight/2 - 5, { align: 'center' });
                    }
                  } catch (err) {
                    console.error('Error processing image for PDF:', err);
                    setColor(colors.accent);
                    doc.setFontSize(8);
                    doc.text('IMAGE', fileX + previewWidth/2, fileY + previewHeight/2 - 5, { align: 'center' });
                  }
                } else {
                  // For non-image files, show appropriate icon
                  const fileType = getFileIcon(file);
                  
                  let iconColor;
                  let iconLabel;
                  
                  if (fileType === 'pdf') {
                    iconColor = colors.red;
                    iconLabel = "PDF";
                  } else if (fileType === 'doc') {
                    iconColor = colors.secondary;
                    iconLabel = "DOC";
                  } else {
                    iconColor = colors.lightText;
                    iconLabel = "FILE";
                  }
                  
                  setColor(iconColor);
                  doc.setFontSize(10);
                  doc.text(iconLabel, fileX + previewWidth/2, fileY + previewHeight/2 - 5, { align: 'center' });
                }
              }
              
              // Additional files indicator
              if (test.files.length > maxFilesToShow) {
                setColor(colors.secondary);
                doc.setFontSize(8);
                doc.text(`+ ${test.files.length - maxFilesToShow} more files not shown`, 
                  margin + contentWidth/2, startY + Math.ceil(maxFilesToShow/maxFilesPerRow) * (previewHeight + 15) + 5, 
                  { align: 'center' });
              }
              
              yPosition = startY + Math.ceil(maxFilesToShow/maxFilesPerRow) * (previewHeight + 15) + 15;
            }
            catch (fileError) {
              console.error('Error rendering file attachments:', fileError);
              
              // Fallback: just show text mentioning files
              yPosition += 4;
              doc.setFontSize(9);
              doc.setFont('helvetica', 'italic');
              setColor(colors.text);
              doc.text(`This test has ${test.files.length} attached files (not shown)`, margin + 5, yPosition + 5);
              yPosition += 10;
            }
          }
          
          yPosition += 7; // Space between tests
        }
      } else {
        doc.text('No test results available for this patient.', margin + 5, yPosition + 7);
        yPosition += 12;
      }
      
      // Additional notes if provided
      if (additionalNotes && additionalNotes.trim() !== '') {
        // Check if we need a new page
        checkPageBreak(50);
        
        yPosition = addSectionTitle('Additional Notes', yPosition);
        
        // Notes box
        setFillColor([250, 250, 250]);
        doc.rect(margin, yPosition, contentWidth, 25, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, yPosition, contentWidth, 25, 'S');
        
        doc.setFontSize(10);
        setColor(colors.text);
        const notesHeight = addWrappedText(additionalNotes, margin + 5, yPosition + 7, contentWidth - 10, 5);
        
        yPosition += Math.max(25, notesHeight + 10);
      }
      
      // Signature section - ensure this is on the last page
      if (yPosition > 230) {  // More space for signature
        // Add footer to current page
        doc.setFontSize(8);
        setColor(colors.lightText);
        doc.text(`LAB-east Medical Systems • Generated ${formatDate(new Date())} • Page ${currentPage}`, pageWidth/2, 287, { align: 'center' });
        
        doc.addPage();
        currentPage++;
        yPosition = 20;
        
        // Add header to new page
        drawHeaderBar(0);
        setColor([255, 255, 255]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('LAB-east Medical Report', margin, 8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Patient ID: ${reportData.patientInfo.id || 'N/A'}`, pageWidth - margin, 8, { align: 'right' });
        doc.setFontSize(10);
        setColor(colors.text);
      }
      
      // Signature section title
      yPosition = addSectionTitle('Authentication', yPosition);
      
      // Signature area box with more height
      setFillColor([250, 250, 252]);
      doc.rect(margin, yPosition, contentWidth, 35, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, yPosition, contentWidth, 35, 'S');
      
      // Add signature title on top left
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      setColor(colors.text);
      doc.text('Medical Staff Signature:', margin + 5, yPosition + 10);
      
      // Add signature line
      setDrawColor(colors.primary);
      doc.setLineWidth(0.5);
      doc.line(margin + 50, yPosition + 20, margin + 150, yPosition + 20);
      
      // Add signature text with the current signature value in a handwriting-like font
      doc.setFontSize(12);
      doc.setFont('times', 'italic'); // More signature-like font
      setColor(colors.primary);
      
      // Center the signature over the line
      const signatureWidth = doc.getTextWidth(currentSignature);
      const signatureX = margin + 100 - (signatureWidth / 2); // Center over line
      doc.text(currentSignature, signatureX, yPosition + 18);
      
      // Date of signature - better positioned
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      setColor(colors.lightText);
      doc.text(`Date: ${formatDate(new Date().toISOString())}`, margin + 5, yPosition + 30);
      
      // Add logo/stamp on right side
      const stampRadius = 12;
      const stampX = margin + contentWidth - stampRadius - 5;
      const stampY = yPosition + 12;
      
      // Draw circular stamp
      setDrawColor(colors.primary);
      doc.setLineWidth(0.5);
      doc.circle(stampX, stampY, stampRadius, 'S');
      
      // Inner circle
      setDrawColor(colors.secondary);
      doc.setLineWidth(0.3);
      doc.circle(stampX, stampY, stampRadius - 2, 'S');
      
      // "VERIFIED" text across stamp
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setColor(colors.primary);
      doc.text('VERIFIED', stampX, stampY, { align: 'center' });
      
      // Draw lab logo inside
      drawLabLogo(stampX, stampY - 3, 6);
      
      // Lab name on bottom of stamp
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4);
      setColor(colors.secondary);
      doc.text('LAB-EAST MEDICAL', stampX, stampY + 5, { align: 'center' });
      
      // Add report generation info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(colors.lightText);
      doc.text('This document is electronically generated and validated.', margin + contentWidth/2, yPosition + 22, { align: 'center' });
      
      // Add page number to all pages
      doc.setFontSize(8);
      setColor(colors.lightText);
      doc.text(`LAB-east Medical Systems • Generated ${formatDate(new Date())} • Page ${currentPage}`, pageWidth/2, 287, { align: 'center' });
      
      // Page decorations only (no watermark)
      const addPageDecorations = () => {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          
          // Top right corner decorative element
          doc.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
          doc.setLineWidth(1);
          doc.line(pageWidth - 15, 20, pageWidth - 15, 40);
          doc.line(pageWidth - 30, 20, pageWidth - 15, 20);
          
          // Bottom left corner decorative element
          doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
          doc.line(15, 280, 15, 260);
          doc.line(15, 280, 35, 280);
          
          // Add page decoration at the bottom
          doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.rect(0, 285, pageWidth, 2, 'F');
        }
      };
      
      // Add decorative elements to all pages
      addPageDecorations();
      
      try {
        // Save the PDF
        const patientId = reportData?.patientInfo?.id || 'unknown';
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        console.log("Saving PDF file...");
        doc.save(`Medical_Report_${patientId}_${timestamp}.pdf`);
        console.log("PDF successfully saved!");
      } catch (saveError) {
        console.error('Error saving PDF:', saveError);
        alert('There was an error saving the PDF file. Your browser might be blocking downloads or there might be insufficient storage.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.log("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      alert('There was an error generating the PDF. Please try again or use the Print option. Error: ' + error.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  // New function for printing the report directly
  const printReport = () => {
    if (!reportRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the report.');
      return;
    }
    
    const reportContent = reportRef.current.querySelector('.professional-report');
    if (!reportContent) {
      printWindow.close();
      alert('Error preparing report for printing.');
      return;
    }
    
    // Create a properly styled document for printing
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient Report - ${reportData.patientInfo.id || 'unknown'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              padding: 20px;
            }
            .report-header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #2c3e50;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .patient-section, .summary-section {
              margin-bottom: 20px;
              padding: 15px;
              border-radius: 5px;
            }
            .patient-section {
              background-color: #f8f9fa;
              border: 1px solid #e9ecef;
            }
            .summary-section {
              background-color: #e8f4fd;
              border: 1px solid #c5e1f9;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            th, td {
              padding: 8px 12px;
              border: 1px solid #e0e0e0;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .test-item {
              margin-bottom: 20px;
              padding: 15px;
              background-color: #fff;
              border-radius: 5px;
              border: 1px solid #e0e0e0;
            }
            h2 {
              font-size: 18px;
              color: #2c3e50;
              margin: 0 0 15px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 8px;
            }
            h3 {
              font-size: 16px;
              margin: 0 0 10px;
              color: #2c3e50;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              @page {
                margin: 1.5cm;
              }
            }
          </style>
        </head>
        <body>
          ${reportContent.outerHTML}
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };
  
  // Improve the getStatusDetails function for more robust operation
  const getStatusDetails = (param, value, referenceRange) => {
    // Default values
    let statusClass = 'status-normal';
    let statusText = 'Normal';
    let diseaseIndicator = null;
    
    // Common health parameters and associated diseases/conditions
    const healthConditions = {
      'Glucose': {
        high: 'Hyperglycemia/Diabetes',
        low: 'Hypoglycemia'
      },
      'Hemoglobin': {
        high: 'Polycythemia',
        low: 'Anemia'
      },
      'WBC': {
        high: 'Infection/Inflammation',
        low: 'Immune Deficiency'
      },
      'RBC': {
        high: 'Polycythemia',
        low: 'Anemia'
      },
      'Platelets': {
        high: 'Thrombocytosis',
        low: 'Thrombocytopenia'
      },
      'Cholesterol': {
        high: 'Hypercholesterolemia',
        low: null
      },
      'HDL': {
        high: null,
        low: 'Cardiovascular Risk'
      },
      'LDL': {
        high: 'Cardiovascular Disease Risk',
        low: null
      },
      'Triglycerides': {
        high: 'Hypertriglyceridemia',
        low: null
      },
      'HbA1c': {
        high: 'Diabetes',
        low: null
      },
      'TSH': {
        high: 'Hypothyroidism',
        low: 'Hyperthyroidism'
      },
      'T3': {
        high: 'Hyperthyroidism',
        low: 'Hypothyroidism'
      },
      'T4': {
        high: 'Hyperthyroidism',
        low: 'Hypothyroidism'
      },
      'Blood Pressure': {
        high: 'Hypertension',
        low: 'Hypotension'
      },
      'Heart Rate': {
        high: 'Tachycardia',
        low: 'Bradycardia'
      },
      'Sodium': {
        high: 'Hypernatremia',
        low: 'Hyponatremia'
      },
      'Potassium': {
        high: 'Hyperkalemia',
        low: 'Hypokalemia'
      },
      'Calcium': {
        high: 'Hypercalcemia',
        low: 'Hypocalcemia'
      },
      'Creatinine': {
        high: 'Renal Dysfunction',
        low: null
      },
      'Urea': {
        high: 'Renal Dysfunction',
        low: null
      },
      'Uric Acid': {
        high: 'Gout/Hyperuricemia',
        low: null
      },
      'ALT': {
        high: 'Liver Dysfunction',
        low: null
      },
      'AST': {
        high: 'Liver Dysfunction',
        low: null
      },
      'Bilirubin': {
        high: 'Liver Dysfunction/Jaundice',
        low: null
      }
    };
    
    // Helper to check if a parameter name contains a specific term
    const paramContains = (terms) => {
      if (!param) return false;
      const paramLower = String(param).toLowerCase();
      return terms.some(term => paramLower.includes(term.toLowerCase()));
    };
    
    // Function to extract numeric value from mixed string/number
    const extractNumericValue = (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const numMatch = val.match(/[\d.]+/);
        return numMatch ? parseFloat(numMatch[0]) : null;
      }
      if (typeof val === 'object' && val !== null) {
        if (val.value !== undefined) {
          return extractNumericValue(val.value);
        }
      }
      return null;
    };
    
    try {
    // Process based on status text if it's explicitly provided
    if (typeof value === 'object' && value !== null && value.status) {
        const status = String(value.status).toLowerCase();
      
      if (status.includes('high') || status.includes('elevated') || status.includes('abnormal')) {
        statusClass = status.includes('high') ? 'status-high' : 'status-abnormal';
        statusText = value.status;
        
        // Check for disease indication
        if (param) {
          const paramKey = Object.keys(healthConditions).find(key => 
              String(param).toLowerCase().includes(key.toLowerCase())
          );
          
          if (paramKey && healthConditions[paramKey].high) {
            diseaseIndicator = healthConditions[paramKey].high;
          }
        }
      } else if (status.includes('low')) {
        statusClass = 'status-low';
        statusText = value.status;
        
        // Check for disease indication
        if (param) {
          const paramKey = Object.keys(healthConditions).find(key => 
              String(param).toLowerCase().includes(key.toLowerCase())
          );
          
          if (paramKey && healthConditions[paramKey].low) {
            diseaseIndicator = healthConditions[paramKey].low;
          }
        }
      } else if (status.includes('normal')) {
        statusClass = 'status-normal';
        statusText = 'Normal';
      }
      
      return { statusClass, statusText, diseaseIndicator };
    }
      
      // If value is a primitive and looks like a status
      if (typeof value === 'string') {
        const valueLower = value.toLowerCase();
        if (valueLower.includes('high') || valueLower.includes('elevated') || valueLower.includes('abnormal')) {
          statusClass = 'status-high';
          statusText = 'High';
          
          if (param) {
            const paramKey = Object.keys(healthConditions).find(key => 
              String(param).toLowerCase().includes(key.toLowerCase())
            );
            
            if (paramKey && healthConditions[paramKey].high) {
              diseaseIndicator = healthConditions[paramKey].high;
            }
          }
          
          return { statusClass, statusText, diseaseIndicator };
        } else if (valueLower.includes('low') || valueLower.includes('deficient')) {
          statusClass = 'status-low';
          statusText = 'Low';
          
          if (param) {
            const paramKey = Object.keys(healthConditions).find(key => 
              String(param).toLowerCase().includes(key.toLowerCase())
            );
            
            if (paramKey && healthConditions[paramKey].low) {
              diseaseIndicator = healthConditions[paramKey].low;
            }
          }
          
          return { statusClass, statusText, diseaseIndicator };
        }
      }
    
    // If we have a reference range and a value, compare them
    if (referenceRange && referenceRange !== 'N/A') {
        // Extract numeric value safely
        let numValue;
        
        if (typeof value === 'object' && value !== null) {
          numValue = extractNumericValue(value.value !== undefined ? value.value : value);
        } else {
          numValue = extractNumericValue(value);
        }
        
      if (numValue !== null) {
        // Parse reference range (format could be "70-110" or "< 200" or "> 40")
        let rangeLow = null;
        let rangeHigh = null;
        
        if (referenceRange.includes('-')) {
            const rangeParts = referenceRange.split('-');
            if (rangeParts.length >= 2) {
              const low = parseFloat(String(rangeParts[0]).replace(/[^\d.-]/g, ''));
              const high = parseFloat(String(rangeParts[1]).replace(/[^\d.-]/g, ''));
              if (!isNaN(low)) rangeLow = low;
              if (!isNaN(high)) rangeHigh = high;
            }
        } else if (referenceRange.includes('<')) {
            const highValue = parseFloat(referenceRange.replace(/[^0-9.]/g, ''));
            if (!isNaN(highValue)) rangeHigh = highValue;
        } else if (referenceRange.includes('>')) {
            const lowValue = parseFloat(referenceRange.replace(/[^0-9.]/g, ''));
            if (!isNaN(lowValue)) rangeLow = lowValue;
        }
        
        // Determine status based on range
        if (rangeHigh !== null && numValue > rangeHigh) {
          statusClass = 'status-high';
          statusText = 'High';
          
          // Check for associated condition
          if (param) {
            const paramKey = Object.keys(healthConditions).find(key => 
                String(param).toLowerCase().includes(key.toLowerCase())
            );
            
            if (paramKey && healthConditions[paramKey].high) {
              diseaseIndicator = healthConditions[paramKey].high;
            } else if (paramContains(['glucose', 'sugar'])) {
              diseaseIndicator = 'Hyperglycemia/Diabetes';
            } else if (paramContains(['cholesterol', 'ldl'])) {
              diseaseIndicator = 'Hypercholesterolemia';
            } else if (paramContains(['pressure', 'bp']) || param === 'BP') {
              diseaseIndicator = 'Hypertension';
            }
          }
        } else if (rangeLow !== null && numValue < rangeLow) {
          statusClass = 'status-low';
          statusText = 'Low';
          
          // Check for associated condition
          if (param) {
            const paramKey = Object.keys(healthConditions).find(key => 
                String(param).toLowerCase().includes(key.toLowerCase())
            );
            
            if (paramKey && healthConditions[paramKey].low) {
              diseaseIndicator = healthConditions[paramKey].low;
            } else if (paramContains(['glucose', 'sugar'])) {
              diseaseIndicator = 'Hypoglycemia';
            } else if (paramContains(['hemoglobin', 'hb'])) {
              diseaseIndicator = 'Anemia';
            } else if (paramContains(['pressure', 'bp']) || param === 'BP') {
              diseaseIndicator = 'Hypotension';
            }
          }
        }
      }
      }
    } catch (e) {
      console.error("Error in getStatusDetails:", e);
      // Return safe defaults
      return { statusClass: 'status-normal', statusText: 'Normal', diseaseIndicator: null };
    }
    
    return { statusClass, statusText, diseaseIndicator };
  };
  
  const renderTestResults = (test, index) => {
    if (!test || !test.results) {
      return (
        <div className="test-error-message" style={{ padding: '10px', color: '#e74c3c' }}>
          Test data unavailable or invalid format
        </div>
      );
    }

    try {
      return (
        <div className="test-details">
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left', backgroundColor: '#f2f2f2', border: '1px solid #e0e0e0' }}>Parameter</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', backgroundColor: '#f2f2f2', border: '1px solid #e0e0e0' }}>Value</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', backgroundColor: '#f2f2f2', border: '1px solid #e0e0e0' }}>Reference Range</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', backgroundColor: '#f2f2f2', border: '1px solid #e0e0e0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(test.results).map(([param, value], i) => {
                // Try to determine if there's a reference range and status
                let displayValue = '';
                let referenceRange = 'N/A';
                let status = 'Normal';
                let statusClass = 'status-normal';
                let statusText = 'Normal';
                let diseaseIndicator = null;
                
                try {
                  displayValue = value;
                  
                  // If value is an object with structured data
                  if (typeof value === 'object' && value !== null) {
                    // Handle new format with minRange/maxRange
                    if (value.minRange !== undefined || value.maxRange !== undefined) {
                      displayValue = value.value !== undefined ? String(value.value) : 'N/A';
                      if (value.minRange && value.maxRange) {
                        referenceRange = `${value.minRange} - ${value.maxRange}`;
                      } else if (value.minRange) {
                        referenceRange = `> ${value.minRange}`;
                      } else if (value.maxRange) {
                        referenceRange = `< ${value.maxRange}`;
                      }
                      status = value.status || 'Normal';
                    } 
                    // Handle previous format with value/range/status
                    else if (value.value !== undefined) {
                      displayValue = value.value !== undefined ? String(value.value) : 'N/A';
                      referenceRange = value.range || (value.referenceRange ? value.referenceRange : 'N/A');
                      status = value.status || 'Normal';
                    }
                  } else {
                    // Handle primitive value
                    displayValue = value !== undefined ? String(value) : 'N/A';
                  }
                  
                  // Get enhanced status details
                  const statusDetails = getStatusDetails(param, value, referenceRange);
                  statusClass = statusDetails.statusClass;
                  statusText = statusDetails.statusText;
                  diseaseIndicator = statusDetails.diseaseIndicator;
                } catch (error) {
                  console.error('Error processing test result value:', error);
                  // Fallback to safe defaults if there's an error
                  displayValue = typeof value === 'object' ? 'Complex Value' : String(value || 'N/A');
                  referenceRange = 'N/A';
                  statusText = 'Normal';
                }
                
                return (
                  <tr key={i}>
                    <td style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>{param}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>{displayValue}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'left', border: '1px solid #e0e0e0' }}>
                      <span className="reference-range">{referenceRange}</span>
                    </td>
                    <td style={{ 
                      padding: '8px 12px', 
                      textAlign: 'left', 
                      border: '1px solid #e0e0e0'
                    }}>
                      <div className={statusClass} style={{
                        display: 'flex',
                        alignItems: 'center',
                        color: statusClass === 'status-normal' ? '#2ecc71' : 
                               statusClass === 'status-high' || statusClass === 'status-abnormal' ? '#e74c3c' : 
                               '#f39c12'
                      }}>
                        <span className="status-icon" style={{ marginRight: '5px' }}>
                          {statusClass === 'status-normal' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                              <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                          )}
                          {statusClass === 'status-high' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                          )}
                          {statusClass === 'status-low' && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                          )}
                        </span>
                        {statusText}
                      </div>
                      {diseaseIndicator && (
                        <div style={{ 
                          marginTop: '4px', 
                          fontSize: '0.8rem', 
                          color: '#e74c3c',
                          fontStyle: 'italic'
                        }}>
                          Possible: {diseaseIndicator}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    } catch (error) {
      console.error('Error rendering test results:', error);
      return (
        <div className="test-error-message" style={{ padding: '10px', color: '#e74c3c' }}>
          Error displaying test results: {error.message}
        </div>
      );
    }
  };
  
  // If no report data is available or still loading, show a message
  if (isLoadingData) {
    return (
      <div className="report-modal-overlay">
        <div className="report-modal" style={{ maxWidth: '500px' }}>
          <div className="report-modal-header">
            <h2>Loading Patient Report</h2>
            <button 
              className="action-btn outline-btn"
              onClick={onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
          <div className="report-content-wrapper" style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner" style={{ width: '48px', height: '48px', margin: '0 auto 1rem' }}></div>
            <h3>Loading Report Data</h3>
            <p>Please wait while we retrieve the patient information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData || !reportData.patientInfo) {
    return (
      <div className="report-modal-overlay">
        <div className="report-modal" style={{ maxWidth: '500px' }}>
          <div className="report-modal-header">
            <h2>Patient Report</h2>
            <button 
              className="action-btn outline-btn"
              onClick={onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
          <div className="report-content-wrapper" style={{ textAlign: 'center', padding: '2rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="64" height="64" style={{ margin: '0 auto 1rem', color: '#ccc' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3>Report Data Not Available</h3>
            <p>Unable to retrieve the patient report data. Please try generating the report again.</p>
            {report && report.patientInfo && report.patientInfo.id && (
              <button 
                className="action-btn primary-btn" 
                style={{ marginTop: '1rem' }}
                onClick={() => fetchPatientData(report.patientInfo.id)}
              >
                Retry Loading Data
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  const { reportId, generatedDate, patientInfo, summary, testCount } = reportData;
  
  return (
          <div className="report-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      overflow: 'auto',
      backdropFilter: 'blur(3px)'
    }}>
      <div className="report-modal" style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        width: '92%',
        maxWidth: '1000px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        animation: 'modalFadeIn 0.3s ease-out'
      }}>
        <div className="report-modal-header" style={{
          padding: '15px 20px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '20px', 
            color: '#2c3e50',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3498db' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Patient Medical Report
          </h2>
          <div className="report-actions" style={{
            display: 'flex',
            gap: '10px'
          }}>
            <button 
              className="action-btn primary-btn"
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '10px 16px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                opacity: isGeneratingPDF ? 0.7 : 1,
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
            </button>
            
            <button 
              className="action-btn secondary-btn"
              onClick={printReport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '10px 16px',
                backgroundColor: '#2ecc71',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
            
            {process.env.NODE_ENV === 'development' && (
              <button
                className="action-btn secondary-btn"
                onClick={() => {
                  console.log('Current report data:', reportData);
                  alert('Report data logged to console');
                }}
                style={{ marginRight: '0.5rem' }}
              >
                Debug Report
              </button>
            )}
            
            <button 
              className="action-btn outline-btn"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '10px 16px',
                backgroundColor: 'transparent',
                color: '#333',
                border: '1px solid #cbd5e0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
        </div>
        
        <div className="report-content-wrapper" ref={reportRef} style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px'
        }}>
          <div className="professional-report" style={{
            width: '100%',
            padding: '20px',
            backgroundColor: '#ffffff',
            color: '#333',
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box',
            overflow: 'auto'
          }}>
            <div className="report-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #2c3e50',
              paddingBottom: '15px'
            }}>
              <div className="lab-logo" style={{
                display: 'flex',
                alignItems: 'center'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="48" height="48" style={{ color: '#3498db' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <div style={{ marginLeft: '10px' }}>
                  <h1 style={{ fontSize: '24px', margin: '0', color: '#2c3e50' }}>LAB-east Medical Reports</h1>
                  <p style={{ fontSize: '14px', margin: '5px 0 0', color: '#7f8c8d' }}>Comprehensive Patient Test Analysis</p>
                </div>
              </div>
              <div className="report-info" style={{ textAlign: 'right' }}>
                <p style={{ margin: '0', fontSize: '14px' }}><strong>Report ID:</strong> {reportId || 'N/A'}</p>
                <p style={{ margin: '5px 0 0', fontSize: '14px' }}><strong>Generated:</strong> {formatDate(generatedDate) || 'N/A'}</p>
                <p style={{ margin: '5px 0 0', fontSize: '14px' }}><strong>Tests:</strong> {testCount || 'N/A'}</p>
              </div>
            </div>
            
            <div className="patient-section" style={{
              marginBottom: '25px',
              padding: '20px',
              backgroundColor: 'linear-gradient(to right, #f8f9fa, #eef2f7)',
              backgroundImage: 'linear-gradient(to right, #f8f9fa, #eef2f7)',
              borderRadius: '10px',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <h2 style={{ 
                fontSize: '18px', 
                margin: '0 0 18px', 
                color: '#2c3e50', 
                borderBottom: '1px solid #ddd', 
                paddingBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3182ce' }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Patient Information
              </h2>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '15px',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                padding: '15px', 
                borderRadius: '8px'
              }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <p style={{ 
                    margin: '8px 0', 
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ 
                      fontWeight: 600, 
                      color: '#334155', 
                      display: 'inline-block', 
                      width: '90px' 
                    }}>Name:</span> 
                    <span style={{ color: '#1e293b' }}>{patientInfo.name || 'N/A'}</span>
                  </p>
                  <p style={{ 
                    margin: '8px 0', 
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ 
                      fontWeight: 600, 
                      color: '#334155', 
                      display: 'inline-block', 
                      width: '90px' 
                    }}>Patient ID:</span> 
                    <span style={{ 
                      color: '#1e40af',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      padding: '2px 6px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '4px',
                      fontWeight: '500'
                    }}>{patientInfo.id || 'N/A'}</span>
                  </p>
                  <p style={{ 
                    margin: '8px 0', 
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ 
                      fontWeight: 600, 
                      color: '#334155', 
                      display: 'inline-block', 
                      width: '90px' 
                    }}>Age:</span> 
                    <span style={{ color: '#1e293b' }}>{patientInfo.age || 'N/A'}</span>
                  </p>
                </div>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <p style={{ 
                    margin: '8px 0', 
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ 
                      fontWeight: 600, 
                      color: '#334155', 
                      display: 'inline-block', 
                      width: '110px' 
                    }}>Gender:</span> 
                    <span style={{ color: '#1e293b' }}>{patientInfo.gender || 'N/A'}</span>
                  </p>
                  <p style={{ 
                    margin: '8px 0', 
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ 
                      fontWeight: 600, 
                      color: '#334155', 
                      display: 'inline-block', 
                      width: '110px' 
                    }}>Blood Group:</span> 
                    <span style={{ 
                      color: '#be123c',
                      fontWeight: '600',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>{patientInfo.bloodGroup || 'N/A'}</span>
                  </p>
                  <p style={{ 
                    margin: '8px 0', 
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ 
                      fontWeight: 600, 
                      color: '#334155', 
                      display: 'inline-block', 
                      width: '110px' 
                    }}>Contact:</span> 
                    <span style={{ color: '#1e293b' }}>{patientInfo.contact || 'N/A'}</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="summary-section" style={{
              marginBottom: '25px',
              padding: '20px',
              background: 'linear-gradient(to right, #e1f5fe, #e3f2fd)',
              borderRadius: '10px',
              border: '1px solid #bbdefb',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <h2 style={{ 
                fontSize: '18px', 
                margin: '0 0 12px', 
                color: '#2c3e50',
                borderBottom: '1px solid #bbdefb',
                paddingBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0277bd' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Report Summary
              </h2>
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                padding: '15px',
                borderRadius: '8px',
                color: '#1e293b'
              }}>
                <p style={{ 
                  margin: '0', 
                  fontSize: '15px', 
                  lineHeight: '1.7',
                  fontStyle: 'italic',
                  textAlign: 'justify'
                }}>
                  {summary || 'Comprehensive medical examination results for the patient.'}
                </p>
              </div>
            </div>
            
            <div className="test-results-section" style={{ marginBottom: '35px' }}>
              <h2 style={{ 
                fontSize: '20px', 
                margin: '0 0 20px', 
                color: '#1e293b', 
                borderBottom: '2px solid #e2e8f0', 
                paddingBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#2563eb' }}>
                  <path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"></path>
                  <path d="M14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7z"></path>
                </svg>
                Test Results
              </h2>
              
              {patientInfo.testResults && patientInfo.testResults.length > 0 ? (
                patientInfo.testResults.map((test, index) => (
                  <div key={test.id || index} className="test-item" style={{
                    marginBottom: '25px',
                    padding: '0', // Remove padding to allow for header styling
                    backgroundColor: '#fff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '14px 18px',
                      background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <h3 style={{ 
                        fontSize: '17px', 
                        margin: '0', 
                        color: '#1e40af',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: '600'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}>
                          <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                        </svg>
                        {test.testName || 'General Test'}
                      </h3>
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#64748b',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end'
                      }}>
                        <span style={{ 
                          fontWeight: '500', 
                          color: '#334155',
                          marginBottom: '3px'
                        }}>{formatDate(test.testDate) || 'N/A'}</span>
                        <span style={{ 
                          padding: '2px 8px',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}>ID: {test.id || 'N/A'}</span>
                      </div>
                    </div>
                    <div style={{ padding: '18px' }}>
                      {renderTestResults(test, index)}
                    
                      {test.comments && (
                        <div className="comments" style={{ 
                          fontSize: '14px', 
                          padding: '15px', 
                          backgroundColor: '#f9f9f9', 
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0',
                          marginTop: '15px'
                        }}>
                          <strong style={{ color: '#334155' }}>Comments:</strong> {test.comments}
                        </div>
                      )}
                      
                      {test.files && test.files.length > 0 && (
                        <div className="attached-files" style={{ 
                          marginTop: '20px',
                          padding: '15px',
                          backgroundColor: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <h4 style={{ 
                            fontSize: '15px', 
                            margin: '0 0 12px',
                            color: '#2c3e50',
                            borderBottom: '1px solid #edf2f7',
                            paddingBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#4299e1' }}>
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.48-8.48l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                            </svg>
                            Attached Files ({test.files.length})
                          </h4>
                          <div style={{ 
                            padding: '5px 0'
                          }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                              gap: '20px',
                              padding: '10px 5px'
                            }}>
                              {test.files.map((file, fileIndex) => (
                                <div key={fileIndex} className="file-item" style={{ 
                                  width: '100%',
                                  textAlign: 'center',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '12px',
                                  padding: '16px',
                                  backgroundColor: '#ffffff',
                                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                  cursor: 'pointer',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center'
                                }}>
                                  <div style={{ 
                                    height: '120px',
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#f8fafc',
                                    borderRadius: '8px',
                                    marginBottom: '12px',
                                    padding: '10px',
                                    boxShadow: 'inset 0 0 4px rgba(0,0,0,0.05)'
                                  }}>
                                    {file.type && file.type.startsWith('image/') ? (
                                      <>
                                        <img 
                                          key={`img-${fileIndex}-${imageErrors[`${file.name}-${fileIndex}`] ? 'error' : 'ok'}`}
                                          src={getImageUrl(file, fileIndex)} 
                                          alt={file.name || 'Image attachment'} 
                                          style={{ 
                                            maxWidth: '100%', 
                                            maxHeight: '100px', 
                                            objectFit: 'contain',
                                            borderRadius: '6px',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                                          }}
                                          onLoad={() => {
                                            console.log(`Image loaded successfully: ${file.name || 'unnamed'}`);
                                          }}
                                          onError={() => {
                                            console.log(`Image load failed: ${file.name || 'unnamed'}`);
                                            handleImageError(`${file.name}-${fileIndex}`);
                                            // Try to reload using FileReader if we haven't already
                                            if (!file.dataUrl && (file instanceof Blob || file instanceof File)) {
                                              loadImagePreview(file).then(url => {
                                                file.dataUrl = url;
                                                // Force re-render
                                                setReportData(prev => ({...prev}));
                                              }).catch(e => console.error('FileReader failed too:', e));
                                            }
                                          }}
                                        />
                                        {imageErrors[`${file.name}-${fileIndex}`] && (
                                          <div style={{
                                            position: 'absolute',
                                            bottom: '5px',
                                            right: '5px',
                                            background: 'rgba(255,255,255,0.8)',
                                            padding: '2px 5px',
                                            borderRadius: '3px',
                                            fontSize: '10px',
                                            color: '#e53e3e'
                                          }}>
                                            Preview unavailable
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div style={{ 
                                        textAlign: 'center',
                                        width: '100%' 
                                      }}>
                                        {(() => {
                                          const fileType = getFileIcon(file);
                                          switch(fileType) {
                                            case 'pdf':
                                              return (
                                                <div>
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#e53e3e', margin: '0 auto' }}>
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                    <polyline points="14 2 14 8 20 8"></polyline>
                                                  </svg>
                                                  <span style={{
                                                    display: 'block',
                                                    marginTop: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    color: '#e53e3e'
                                                  }}>PDF Document</span>
                                                </div>
                                              );
                                            case 'doc':
                                              return (
                                                <div>
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3182ce', margin: '0 auto' }}>
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                    <polyline points="14 2 14 8 20 8"></polyline>
                                                  </svg>
                                                  <span style={{
                                                    display: 'block',
                                                    marginTop: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    color: '#3182ce'
                                                  }}>Word Document</span>
                                                </div>
                                              );
                                            default:
                                              return (
                                                <div>
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#718096', margin: '0 auto' }}>
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                    <polyline points="14 2 14 8 20 8"></polyline>
                                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                                    <line x1="10" y1="9" x2="8" y2="9"></line>
                                                  </svg>
                                                  <span style={{
                                                    display: 'block',
                                                    marginTop: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    color: '#718096'
                                                  }}>File</span>
                                                </div>
                                              );
                                          }
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                  <p style={{ 
                                    fontSize: '13px', 
                                    margin: '5px 0', 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap',
                                    color: '#2d3748',
                                    fontWeight: '600',
                                    width: '100%'
                                  }}>
                                    {file.name || 'Attachment'}
                                  </p>
                                  <p style={{ 
                                    fontSize: '11px',
                                    color: '#718096',
                                    margin: '3px 0 0',
                                    backgroundColor: '#f7fafc',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #edf2f7'
                                  }}>
                                    {file.type ? file.type.split('/')[1].toUpperCase() : 'FILE'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  backgroundColor: '#f9f9f9', 
                  borderRadius: '5px',
                  border: '1px solid #e0e0e0'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="48" height="48" style={{ margin: '0 auto 10px', color: '#7f8c8d' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p style={{ fontSize: '14px', margin: '0' }}>No test results available for this patient.</p>
                </div>
              )}
            </div>
            
            <div className="doctor-notes-section" style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '18px', margin: '0 0 15px', color: '#2c3e50', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                Additional Notes
              </h2>
              <textarea 
                style={{ 
                  width: '100%', 
                  minHeight: '100px', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  border: '1px solid #ddd',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '14px'
                }}
                placeholder="Add any additional notes or observations here..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
            </div>
            
            <div className="signatures-section" style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingTop: '20px',
              borderTop: '1px dashed #ddd',
              backgroundColor: '#f8f8f8',
              padding: '20px',
              borderRadius: '8px'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  margin: '0 0 15px', 
                  color: '#2c3e50',
                  fontWeight: '600'
                }}>Medical Staff Signature<span style={{ color: '#e74c3c' }}>*</span></h3>
                <input 
                  type="text" 
                  style={{ 
                    width: '90%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: staffSignature ? '1px solid #ddd' : '2px solid #3498db',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '14px',
                    boxShadow: staffSignature ? 'none' : '0 0 5px rgba(52, 152, 219, 0.3)'
                  }}
                  placeholder="Enter your name (required for PDF)"
                  value={staffSignature}
                  onChange={(e) => setStaffSignature(e.target.value)}
                />
                {!staffSignature && (
                  <div style={{ 
                    marginTop: '5px',
                    fontSize: '12px',
                    color: '#3498db',
                    fontStyle: 'italic'
                  }}>
                    Please enter your name to display in the PDF report
                  </div>
                )}
                <div style={{ 
                  marginTop: '10px',
                  fontSize: '12px',
                  color: '#7f8c8d'
                }}>
                  Date: {formatDate(new Date().toISOString())}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ 
                  fontSize: '12px',
                  color: '#7f8c8d',
                  marginTop: '30px'
                }}>
                  Report generated by LAB-east Medical Systems
                  <br/>
                  This is an official medical document.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientReport;