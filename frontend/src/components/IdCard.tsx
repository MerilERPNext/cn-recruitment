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

const ShareIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M232,80A32.09,32.09,0,0,0,200,48H56A32.09,32.09,0,0,0,24,80v96a32.09,32.09,0,0,0,32,32H200a32.09,32.09,0,0,0,32-32ZM40,80a16,16,0,0,1,16-16H200a16,16,0,0,1,16,16v4H159.08a8,8,0,0,0-5.62,2.31L128,112.14l-25.46-25.83a8,8,0,0,0-5.62-2.31H40ZM200,192H56a16,16,0,0,1-16-16V100h49.08l31.46,31.83a8,8,0,0,0,11,0L157.82,100H216v76A16,16,0,0,1,200,192Z"></path>
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
const ActionButtons = ({ onDownload, onShare }: any) => (
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
      icon={ShareIcon}
      onClick={onShare}
    >
      Share
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
  } = useCurrentEmployeeIdCard();
  
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
      // Create a canvas to render the ID card for download
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // This is a simplified version - you might want to use html2canvas or similar library
        const element = document.querySelector('[data-id-card]') as HTMLElement;
        if (element) {
          // Using html2canvas would be better, but for now just trigger download of current page
          window.print();
        }
      }
    }
  };

  const handleShare = () => {
    if (employee && navigator.share) {
      navigator.share({
        title: `${employee.employee_name} - Employee ID Card`,
        text: `Employee: ${employee.employee_name}\nDepartment: ${employee.department}\nID: ${employee.employee_number || employee.id}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      const shareText = `Employee: ${employee?.employee_name}\nDepartment: ${employee?.department}\nID: ${employee?.employee_number || employee?.id}`;
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Employee information copied to clipboard!');
      }).catch(console.error);
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
                onShare={handleShare}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployeeIDApp;