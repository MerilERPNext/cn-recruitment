import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCurrentEmployeeIdCard, useEmployeeIdCard } from '../hooks/useEmployee';
import { EmployeeIdCard } from '../types/employee';
import { 
  generateEmployeeQRCodeURL, 
  formatDate, 
  getDefaultAvatarURL 
} from '../utils/qrCodeUtils';

// Icon Components
const BackIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
  </svg>
);

const MailIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
    <path d="M208,56H48A16,16,0,0,0,32,72V184a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V72A16,16,0,0,0,208,56ZM48,72H208V95.4L134.63,144a8,8,0,0,1-9.26,0L48,95.4ZM208,184H48V111.84l72,48a15.91,15.91,0,0,0,16.06,0l72-48Z"></path>
  </svg>
);

const DownloadIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-91.51-2.49a8,8,0,0,0,11,0l48-48.05a8,8,0,0,0-11.31-11.31L136,124.69V32a8,8,0,0,0-16,0v92.69L75.51,82.15A8,8,0,0,0,64.2,93.46Z"></path>
  </svg>
);

const CallIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
);



// Header Component
const Header = ({ title, onBackClick, onMailClick }: any) => (
  <header className="bg-white shadow-sm">
    <div className="mx-auto flex max-w-md items-center p-4">
      <button 
        className="text-gray-800 p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        onClick={onBackClick}
      >
        <BackIcon />
      </button>
      <h1 className="text-gray-800 text-xl font-semibold flex-1 text-center">{title}</h1>
      <button 
        className="text-gray-800 p-2 -mr-2 hover:bg-gray-100 rounded-lg transition-colors"
        onClick={onMailClick}
      >
        <MailIcon />
      </button>
    </div>
  </header>
);

// Employee Avatar Component
const EmployeeAvatar = ({ imageUrl, name, size = "h-32 w-32" }: { imageUrl?: string; name: string; size?: string }) => {
  const [imageSrc, setImageSrc] = useState<string>(imageUrl || getDefaultAvatarURL(name));
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    if (imageUrl && imageUrl !== imageSrc) {
      setImageSrc(imageUrl);
      setImageError(false);
    }
  }, [imageUrl]);

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
      setImageSrc(getDefaultAvatarURL(name));
    }
  };

  return (
    <div 
      className={`bg-center bg-no-repeat aspect-square bg-cover rounded-full ${size} border-4 border-white shadow-md overflow-hidden`}
      role="img"
      aria-label={`${name}'s profile picture`}
    >
      <img
        src={imageSrc}
        alt={`${name}'s profile picture`}
        className="w-full h-full object-cover"
        onError={handleImageError}
        loading="lazy"
      />
    </div>
  );
};

// Employee Info Row Component
const InfoRow = ({ label, value, isLast = false }: any) => (
  <div className={`flex justify-between items-center py-3 ${!isLast ? 'border-b border-gray-200' : ''}`}>
    <p className="text-gray-600 text-sm">{label}</p>
    <p className="text-gray-800 text-sm font-medium">{value}</p>
  </div>
);

// QR Code Component
const QRCode = ({ employee, alt = "QR Code" }: { employee: EmployeeIdCard; alt?: string }) => {
  const qrCodeUrl = generateEmployeeQRCodeURL(employee, 200);
  
  return (
    <div className="mt-8 flex justify-center">
      <img 
        alt={alt} 
        className="rounded-lg shadow w-48 h-48" 
        src={qrCodeUrl}
        loading="lazy"
      />
    </div>
  );
};

// Action Button Component
const ActionButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  icon: Icon,
  className = '' 
}: any) => {
  const baseClasses = "flex-1 py-3 px-4 rounded-lg font-semibold shadow transition-colors flex items-center justify-center gap-2";
  const variantClasses: any = {
    primary: "bg-blue-500 text-white hover:bg-blue-600",
    secondary: "border border-blue-500 text-blue-500 hover:bg-gray-100"
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant] as string} ${className}`}
      onClick={onClick}
    >
      {Icon && <Icon />}
      {children}
    </button>
  );
};

// Employee Card Component
const EmployeeCard = ({ employee }: { employee: EmployeeIdCard }) => (
  <div className="bg-gray-100 rounded-xl shadow-lg p-6">
    <div className="flex flex-col items-center text-center mb-6">
      <EmployeeAvatar 
        imageUrl={employee.avatar}
        name={employee.employee_name}
      />
      <h2 className="text-gray-800 text-2xl font-bold mt-4">{employee.employee_name}</h2>
      <p className="text-gray-600 text-md">{employee.department} Department</p>
      <p className="text-blue-500 text-sm font-medium mt-1">ID: {employee.employee_number || employee.id}</p>
      {employee.designation && (
        <p className="text-gray-500 text-sm">{employee.designation}</p>
      )}
    </div>
    
    <div className="space-y-3">
      <InfoRow label="Employee ID" value={employee.employee_number || employee.id} />
      <InfoRow label="Department" value={employee.department} />
      <InfoRow label="Location" value={employee.location || 'Not Specified'} />
      <InfoRow label="Start Date" value={formatDate(employee.startDate)} />
      {employee.designation && (
        <InfoRow label="Designation" value={employee.designation} />
      )}
      {employee.contact && (
        <InfoRow label="Contact" value={employee.contact} />
      )}
      {employee.email && (
        <InfoRow label="Email" value={employee.email} isLast={true} />
      )}
    </div>
    
    <QRCode employee={employee} alt={`QR Code for ${employee.employee_name}`} />
  </div>
);

// Action Buttons Component
const ActionButtons = ({ onDownload, onCall }: any) => (
  <div className="mt-8 flex gap-4">
    <ActionButton 
      variant="primary" 
      icon={DownloadIcon}
      onClick={onDownload}
    >
      Download
    </ActionButton>
    <ActionButton 
      variant="secondary" 
      icon={CallIcon}
      onClick={onCall}
    >
      Call
    </ActionButton>
  </div>
);

// Loading Component
const LoadingCard = () => (
  <div className="bg-gray-100 rounded-xl shadow-lg p-6">
    <div className="flex flex-col items-center text-center mb-6">
      <div className="h-32 w-32 bg-gray-300 rounded-full animate-pulse"></div>
      <div className="h-6 bg-gray-300 rounded mt-4 w-48 animate-pulse"></div>
      <div className="h-4 bg-gray-300 rounded mt-2 w-32 animate-pulse"></div>
    </div>
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex justify-between items-center py-3">
          <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
        </div>
      ))}
    </div>
    <div className="mt-8 flex justify-center">
      <div className="w-48 h-48 bg-gray-300 rounded-lg animate-pulse"></div>
    </div>
  </div>
);

// Error Component
const ErrorCard = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="bg-red-50 rounded-xl shadow-lg p-6 text-center">
    <div className="text-red-600 mb-4">
      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Employee Data</h3>
    <p className="text-red-600 mb-4">{message}</p>
    <button 
      onClick={onRetry}
      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
    >
      Try Again
    </button>
  </div>
);

// Main App Component
const EmployeeIDApp = ({ employeeId }: { employeeId?: string } = {}) => {
  // Get employee ID from router params if not provided as prop
  const params = useParams<{ employeeId: string }>();
  const targetEmployeeId = employeeId || params.employeeId;
  // Use specific employee if ID is provided, otherwise use current employee
  const { 
    data: currentEmployee, 
    isLoading: isLoadingCurrent, 
    error: currentError,
    refetch: refetchCurrent 
  } = useCurrentEmployeeIdCard(
    {
      enabled: !targetEmployeeId,
    }
  );
  
  // Use specific employee if ID is provided
  const { 
    data: specificEmployee, 
    isLoading: isLoadingSpecific, 
    error: specificError,
    refetch: refetchSpecific 
  } = useEmployeeIdCard(targetEmployeeId || null);

  // Determine which data to use based on whether employeeId param is provided
  const employee = targetEmployeeId ? specificEmployee : currentEmployee;
  const isLoading = targetEmployeeId ? isLoadingSpecific : isLoadingCurrent;
  const error = targetEmployeeId ? specificError : currentError;
  const refetch = targetEmployeeId ? refetchSpecific : refetchCurrent;

  // Event handlers
  const handleBackClick = () => {
    console.log('Back button clicked');
    window.history.back();
  };

  const handleMailClick = () => {
    if (employee?.email) {
      window.location.href = `mailto:${employee.email}`;
    }
  };

    const handleDownload = () => {
    if (employee) {
      // Create a new window for printing only the ID card
      const printWindow = window.open(window.location.origin+'', '_blank');
      if (printWindow) {
        // Create print-optimized HTML with only the ID card content
        const printContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${employee.employee_name} - ID Card</title>
            <style>
              /* Print-specific optimizations */
              @page {
                size: A4;
                margin: 0.5in;
              }
              
              @media print {
                * {
                  -webkit-print-color-adjust: exact !important;
                  color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                }
                
                .id-card-container {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                
                .no-print { display: none !important; }
              }
              
              /* Base styles optimized for print */
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                background: white;
                margin: 0;
                padding: 0;
                line-height: 1.4;
                color: #000;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              
              /* ID Card Layout - clean and elegant */
              .id-card-container {
                width: 100%;
                max-width: 400px;
                margin: 0;
                background: #f3f4f6;
                border-radius: 12px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                overflow: hidden;
              }
              
              /* Employee info section */
              .employee-info {
                padding: 24px;
                text-align: center;
                background: white;
                border-radius: 12px 12px 0 0;
              }
              
              .employee-avatar {
                width: 128px;
                height: 128px;
                border-radius: 50%;
                border: 4px solid white;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                object-fit: cover;
                margin: 0 auto 24px;
                display: block;
              }
              
              .employee-name {
                color: #1f2937;
                font-size: 24px;
                font-weight: bold;
                margin: 16px 0 8px;
                line-height: 1.2;
              }
              
              .employee-department {
                color: #6b7280;
                font-size: 16px;
                margin-bottom: 4px;
              }
              
              .employee-id {
                color: #3b82f6;
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 4px;
              }
              
              .employee-designation {
                color: #6b7280;
                font-size: 14px;
              }
              
              /* Info section */
              .info-section {
                padding: 24px;
                background: #f3f4f6;
              }
              
              .info-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              
              .info-row:last-child {
                border-bottom: none;
              }
              
              .info-label {
                color: #6b7280;
                font-size: 14px;
                font-weight: 500;
              }
              
              .info-value {
                color: #1f2937;
                font-size: 14px;
                font-weight: 500;
                text-align: right;
              }
              
              /* QR Code section */
              .qr-section {
                text-align: center;
                padding: 24px;
                background: white;
                border-radius: 0 0 12px 12px;
              }
              
              .qr-code {
                width: 192px;
                height: 192px;
                margin: 0 auto;
                border-radius: 8px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                background: white;
                padding: 8px;
              }
              
              .qr-code img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                border-radius: 4px;
              }
              
              /* Print-specific adjustments */
              @media print {
                .id-card-container {
                  box-shadow: none;
                  border: 1px solid #e5e7eb;
                }
                
                .employee-info {
                  background: white !important;
                }
                
                .info-section {
                  background: #f3f4f6 !important;
                }
                
                .qr-section {
                  background: white !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="id-card-container">
              <!-- Employee Info -->
              <div class="employee-info">
                <img 
                  src="${employee.avatar || getDefaultAvatarURL(employee.employee_name)}" 
                  alt="${employee.employee_name}'s profile picture"
                  class="employee-avatar"
                  onerror="this.src='${getDefaultAvatarURL(employee.employee_name)}'"
                />
                <h2 class="employee-name">${employee.employee_name}</h2>
                <p class="employee-department">${employee.department} Department</p>
                <p class="employee-id">ID: ${employee.employee_number || employee.id}</p>
                ${employee.designation ? `<p class="employee-designation">${employee.designation}</p>` : ''}
              </div>
              
              <!-- Info Section -->
              <div class="info-section">
                <div class="info-row">
                  <span class="info-label">Employee ID</span>
                  <span class="info-value">${employee.employee_number || employee.id}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Department</span>
                  <span class="info-value">${employee.department}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Location</span>
                  <span class="info-value">${employee.location || 'Not Specified'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Start Date</span>
                  <span class="info-value">${formatDate(employee.startDate)}</span>
                </div>
                ${employee.designation ? `
                  <div class="info-row">
                    <span class="info-label">Designation</span>
                    <span class="info-value">${employee.designation}</span>
                  </div>
                ` : ''}
                ${employee.contact ? `
                  <div class="info-row">
                    <span class="info-label">Contact</span>
                    <span class="info-value">${employee.contact}</span>
                  </div>
                ` : ''}
                ${employee.email ? `
                  <div class="info-row">
                    <span class="info-label">Email</span>
                    <span class="info-value">${employee.email}</span>
                  </div>
                ` : ''}
              </div>
              
              <!-- QR Code -->
              <div class="qr-section">
                <img 
                  src="${generateEmployeeQRCodeURL(employee, 200)}" 
                  alt="QR Code for ${employee.employee_name}"
                  class="qr-code"
                />
              </div>
            </div>
          </body>
          </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for images to load before printing
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 1000);
        };
      }
    }
  };

  const handleCall = () => {
    if (employee?.contact) {
      // Remove any non-numeric characters from the phone number
      const phoneNumber = employee.contact.replace(/\D/g, '');
      
      if (phoneNumber) {
        // Initiate phone call
        window.location.href = `tel:${phoneNumber}`;
      } else {
        alert('Invalid phone number format. Please check the contact information.');
      }
    } else {
      alert('No contact number available for this employee.');
    }
  };

  return (
    <div 
      className="relative flex size-full min-h-screen flex-col justify-between bg-gray-50"
      style={{ fontFamily: 'Inter, "Noto Sans", sans-serif', minHeight: 'max(884px, 100dvh)' }}
    >
      <Header 
        title="Employee ID"
        onBackClick={handleBackClick}
        onMailClick={handleMailClick}
      />
      
      <main className="flex-1 overflow-y-auto p-6 bg-white">
        <div className="mx-auto max-w-md" data-id-card>
          {isLoading && <LoadingCard />}
          
          {error && (
            <ErrorCard 
              message={error.message || 'Failed to load employee data'} 
              onRetry={() => refetch()} 
            />
          )}
          
          {employee && !isLoading && !error && (
            <>
              <EmployeeCard employee={employee} />
              <ActionButtons 
                onDownload={handleDownload}
                onCall={handleCall}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployeeIDApp;