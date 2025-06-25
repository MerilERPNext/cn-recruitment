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
const EmployeeAvatar = ({ imageUrl, name, size = "h-32 w-32" }: any) => (
  <div 
    className={`bg-center bg-no-repeat aspect-square bg-cover rounded-full ${size} border-4 border-white shadow-md`}
    style={{ backgroundImage: `url("${imageUrl}")` }}
    role="img"
    aria-label={`${name}'s profile picture`}
  />
);

// Employee Info Row Component
const InfoRow = ({ label, value, isLast = false }: any) => (
  <div className={`flex justify-between items-center py-3 ${!isLast ? 'border-b border-gray-200' : ''}`}>
    <p className="text-gray-600 text-sm">{label}</p>
    <p className="text-gray-800 text-sm font-medium">{value}</p>
  </div>
);

// QR Code Component
const QRCode = ({ src, alt = "QR Code" }: any) => (
  <div className="mt-8 flex justify-center">
    <img 
      alt={alt} 
      className="rounded-lg shadow" 
      src={src}
    />
  </div>
);

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
const EmployeeCard = ({ employee }: any) => (
  <div className="bg-gray-100 rounded-xl shadow-lg p-6">
    <div className="flex flex-col items-center text-center mb-6">
      <EmployeeAvatar 
        imageUrl={employee.avatar}
        name={employee.name}
      />
      <h2 className="text-gray-800 text-2xl font-bold mt-4">{employee.name}</h2>
      <p className="text-gray-600 text-md">{employee.department} Department</p>
      <p className="text-blue-500 text-sm font-medium mt-1">ID: {employee.id}</p>
    </div>
    
    <div className="space-y-3">
      <InfoRow label="Employee ID" value={employee.id} />
      <InfoRow label="Department" value={employee.department} />
      <InfoRow label="Location" value={employee.location} />
      <InfoRow label="Start Date" value={employee.startDate} isLast={true} />
    </div>
    
    <QRCode src={employee.qrCode} alt={`QR Code for ${employee.name}`} />
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

// Main App Component
const EmployeeIDApp = () => {
  // Employee data - in a real app, this would come from props or API
  const employee = {
    id: "123456789",
    name: "Sophia Bennett",
    department: "Marketing",
    location: "New York",
    startDate: "2022-08-15",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCV2Y43OB3dV82n4eGcpbT7CPZEBn9a-6hbfsWDfdyX2XJH0nakGhxsErw6PWiUfXqg_ytS3LWyf-CbJ84vjHjMy_wlhqjMUfUzz017UieyXoYrewWzNWeYZ5nHY0ZcvOceE2EZe9GB_x9W_EGUwdpWGK-hP5rFIXsvbhwFb_3SH3QK6p7JlV6adRMwFOADDJ2w5hLhKddDKhtNNFE-v6k1d-8c1uuv2I6CQMLw2D1t1w_LktPQCEPUS311w7SFqKUocKX0lEQ1vmYH",
    qrCode: "https://lh3.googleusercontent.com/aida-public/AB6AXuCAhF8eWF8UImiHiAxWAkBumZ3P0DF-2snN2VlGEGg9SLjmBfE5BHcUxefknmc49veiWfAVUcEOwq4cJVlbQt3sRHtfLdoHGgF3MtZfLInqhU60yUvjE21VFx8bP3Jgl1NmDgV0DlZcXBoSWArVM6Lm4YDkDsJWzA8J48MCKZ0AFdTdl6Ep7T000Yn1Trvqezv7c2xezA80XvR9ac44ImTetKZRxmJ2I-ZYM2AFU-gdRAug6YIOirVvOEL-Gs4rYRdEgOuGTVAzHryF"
  };

  // Event handlers
  const handleBackClick = () => {
    console.log('Back button clicked');
    // Handle navigation back
  };

  const handleMailClick = () => {
    console.log('Mail button clicked');
    // Handle mail action
  };

  const handleDownload = () => {
    console.log('Download button clicked');
    // Handle download action
  };

  const handleShare = () => {
    console.log('Share button clicked');
    // Handle share action
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
        <div className="mx-auto max-w-md">
          <EmployeeCard employee={employee} />
          <ActionButtons 
            onDownload={handleDownload}
            onShare={handleShare}
          />
        </div>
      </main>
    </div>
  );
};

export default EmployeeIDApp;