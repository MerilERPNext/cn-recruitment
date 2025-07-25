import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  useCurrentEmployeeIdCard,
  useEmployeeIdCard,
} from "../hooks/useEmployee";
import { EmployeeIdCard } from "../types/employee";
import {
  generateEmployeeQRCodeURL,
  formatDate,
  getDefaultAvatarURL,
} from "../utils/qrCodeUtils";

// Icon Components
const BackIcon = () => (
  <svg
    fill="currentColor"
    height="24"
    viewBox="0 0 256 256"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
  </svg>
);

const MailIcon = () => (
  <svg
    fill="currentColor"
    height="24"
    viewBox="0 0 256 256"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M208,56H48A16,16,0,0,0,32,72V184a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V72A16,16,0,0,0,208,56ZM48,72H208V95.4L134.63,144a8,8,0,0,1-9.26,0L48,95.4ZM208,184H48V111.84l72,48a15.91,15.91,0,0,0,16.06,0l72-48Z"></path>
  </svg>
);

const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    aria-hidden="true"
  >
    <path d="M12.04 2C7.3 2 3.4 5.9 3.4 10.61c0 1.5.41 2.92 1.19 4.17L4.01 20l5.04-1.35c1.18.67 2.5 1.04 3.09 1.04 4.74 0 8.63-3.91 8.63-8.62 0-4.72-3.89-8.62-8.63-8.62zm.04 15.48c-1.12 0-2.23-.31-3.18-.93l-.22-.14-2.24.59.6-2.16-.16-.23c-.69-1-1.06-2.2-.97-3.46.22-4.2 3.67-7.65 7.87-7.65 2.06 0 4 .81 5.46 2.28 1.47 1.47 2.28 3.42 2.28 5.48 0 4.21-3.46 7.65-7.66 7.65zm4.4-5.21c-.22-.11-.97-.48-1.12-.53-.15-.05-.27-.07-.38.05-.12.11-.46.53-.56.64-.1.11-.2.12-.37.05-.17-.07-.69-.25-1.31-.8-.48-.42-.81-.94-.91-1.12-.11-.18 0-.17.13-.29.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.09-.17.05-.31-.02-.43-.07-.12-.38-.91-.52-1.24-.14-.32-.29-.28-.38-.28-.09 0-.2-.04-.31-.04-.11 0-.28.04-.43.19-.15.15-.57.56-.57 1.37 0 .81.58 1.59.66 1.7.09.11 1.14 1.76 2.75 2.45 1.61.69 1.61.47 1.9 1.48.29 1.01.29 1.86.07 2.05-.2.19-.97.29-1.12.2z" />
  </svg>
);


const CallIcon = () => (
  <svg
    fill="currentColor"
    height="20"
    viewBox="0 0 24 24"
    width="20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
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
      <h1 className="text-gray-800 text-xl font-semibold flex-1 text-center">
        {title}
      </h1>
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
const EmployeeAvatar = ({
  imageUrl,
  name,
  size = "h-32 w-32",
}: {
  imageUrl?: string;
  name: string;
  size?: string;
}) => {
  const [imageSrc, setImageSrc] = useState<string>(
    imageUrl || getDefaultAvatarURL(name)
  );
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
  <div
    className={`flex justify-between items-center py-3 ${
      !isLast ? "border-b border-gray-200" : ""
    }`}
  >
    <p className="text-gray-600 text-sm">{label}</p>
    <p className="text-gray-800 text-sm font-medium">{value}</p>
  </div>
);

// QR Code Component
const QRCode = ({
  employee,
  alt = "QR Code",
}: {
  employee: EmployeeIdCard;
  alt?: string;
}) => {
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
  variant = "primary",
  icon: Icon,
  className = "",
}: any) => {
  const baseClasses =
    "flex-1 py-3 px-4 rounded-lg font-semibold shadow transition-colors flex items-center justify-center gap-2";
  const variantClasses: any = {
    primary: "bg-blue-500 text-white hover:bg-blue-600",
    secondary: "border border-blue-500 text-blue-500 hover:bg-gray-100",
    whatsapp: "bg-[#25D366] text-white hover:bg-[#1DA851]" 
  };

  return (
    <button
      className={`${baseClasses} ${
        variantClasses[variant] as string
      } ${className}`}
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
      <h2 className="text-gray-800 text-2xl font-bold mt-4">
        {employee.employee_name}
      </h2>
      <p className="text-gray-600 text-md">{employee.department} Department</p>
      <p className="text-blue-500 text-sm font-medium mt-1">
        ID: {employee.employee_number || employee.id}
      </p>
      {employee.designation && (
        <p className="text-gray-500 text-sm">{employee.designation}</p>
      )}
    </div>

    <div className="space-y-3">
      <InfoRow
        label="Employee ID"
        value={employee.employee_number || employee.id}
      />
      <InfoRow label="Department" value={employee.department} />
      <InfoRow label="Location" value={employee.location || "Not Specified"} />
      <InfoRow label="Start Date" value={formatDate(employee.startDate)} />
      {employee.designation && (
        <InfoRow label="Designation" value={employee.designation} />
      )}
      {employee.contact && <InfoRow label="Contact" value={employee.contact} />}
      {employee.email && (
        <InfoRow label="Email" value={employee.email} isLast={true} />
      )}
    </div>

    <QRCode employee={employee} alt={`QR Code for ${employee.employee_name}`} />
  </div>
);

// Action Buttons Component
const ActionButtons = ({ onWhatsApp, onCall }: any) => (
  <div className="mt-8 flex gap-4">
    <ActionButton variant="whatsapp" icon={WhatsAppIcon} onClick={onWhatsApp}>
      WhatsApp
    </ActionButton>
    <ActionButton variant="secondary" icon={CallIcon} onClick={onCall}>
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
const ErrorCard = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="bg-red-50 rounded-xl shadow-lg p-6 text-center">
    <div className="text-red-600 mb-4">
      <svg
        className="w-16 h-16 mx-auto"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-red-800 mb-2">
      Unable to Load Employee Data
    </h3>
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
    refetch: refetchCurrent,
  } = useCurrentEmployeeIdCard({
    enabled: !targetEmployeeId,
  });

  // Use specific employee if ID is provided
  const {
    data: specificEmployee,
    isLoading: isLoadingSpecific,
    error: specificError,
    refetch: refetchSpecific,
  } = useEmployeeIdCard(targetEmployeeId || null);

  // Determine which data to use based on whether employeeId param is provided
  const employee = targetEmployeeId ? specificEmployee : currentEmployee;
  const isLoading = targetEmployeeId ? isLoadingSpecific : isLoadingCurrent;
  const error = targetEmployeeId ? specificError : currentError;
  const refetch = targetEmployeeId ? refetchSpecific : refetchCurrent;

  // Event handlers
  const handleBackClick = () => {
    console.log("Back button clicked");
    window.history.back();
  };

  const handleMailClick = () => {
    if (employee?.email) {
      window.location.href = `mailto:${employee.email}`;
    }
  };

  const handleWhatsApp = () => {
    if (employee?.contact) {
      // Remove any non-numeric characters from the phone number
      const phoneNumber = employee.contact.replace(/\D/g, '');

      if (phoneNumber) {
        // Open WhatsApp chat
        window.open(`https://wa.me/${phoneNumber}`, '_blank');
      } else {
        alert('Invalid phone number format. Please check the contact information.');
      }
    } else {
      alert('No contact number available for this employee.');
    }
  };

  const handleCall = () => {
    if (employee?.contact) {
      // Remove any non-numeric characters from the phone number
      const phoneNumber = employee.contact.replace(/\D/g, "");

      if (phoneNumber) {
        // Initiate phone call
        window.location.href = `tel:${phoneNumber}`;
      } else {
        alert(
          "Invalid phone number format. Please check the contact information."
        );
      }
    } else {
      alert("No contact number available for this employee.");
    }
  };

  return (
    <div
      className="relative flex size-full min-h-screen flex-col justify-between bg-gray-50"
      style={{
        fontFamily: 'Inter, "Noto Sans", sans-serif',
        minHeight: "max(884px, 100dvh)",
      }}
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
              message={error.message || "Failed to load employee data"}
              onRetry={() => refetch()}
            />
          )}

          {employee && !isLoading && !error && (
            <>
              <EmployeeCard employee={employee} />
              <ActionButtons onWhatsApp={handleWhatsApp} onCall={handleCall} />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployeeIDApp;
