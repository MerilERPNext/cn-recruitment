
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
  <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
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
      className={`relative rounded-full ${size} border-4 border-white shadow-md overflow-hidden flex-shrink-0`}
      role="img"
      aria-label={`${name}'s profile picture`}
      style={{ aspectRatio: '1 / 1' }}
    >
      <img
        src={imageSrc}
        alt={`${name}'s profile picture`}
        className="w-full h-full object-cover object-center"
        onError={handleImageError}
        loading="lazy"
        style={{ aspectRatio: '1 / 1' }}
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
    whatsapp: "bg-green-500 text-white hover:bg-green-600",
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
    <ActionButton
      variant="primary"
      icon={WhatsAppIcon}
      onClick={onWhatsApp}
    >
      WhatsApp
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

// New Toast Component
const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "error" | "info";
  onClose: () => void;
}) => {
  const bgColor = type === "error" ? "bg-red-500" : "bg-gray-800";
  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-md text-white shadow-lg z-50 transition-all duration-300 ${bgColor}`}
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-white opacity-75 hover:opacity-100"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

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
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "info";
  } | null>(null);

  // Automatically hide the toast after a few seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000); // 4 seconds
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Event handlers
  const handleBackClick = () => {
    window.history.back();
  };

  const handleMailClick = () => {
    if (employee?.email) {
      window.location.href = `mailto:${employee.email}`;
    }
  };

  const showToast = (message: string, type: "error" | "info") => {
    setToast({ message, type });
  };

  const handleWhatsApp = () => {
    if (employee?.contact) {
      const phoneNumber = employee.contact.replace(/\D/g, "");

      if (phoneNumber) {
        window.nativeInterface.execute('openWhatsApp', {
          payloadNumber: employee.contact,
          payloadText: `Hello, I am ${employee.employee_name} from ${employee.department} Department.`
        });
      } else {
        showToast(
          "Invalid phone number format. Please check the contact information.",
          "error"
        );

      }
    } else {
      showToast("No contact number available for this employee.", "info");
    }
  };

  const handleCall = () => {
    if (employee?.contact) {
      const phoneNumber = employee.contact.replace(/\D/g, "");

      if (phoneNumber) {
        window.location.href = `tel:${phoneNumber}`;
      } else {
        showToast(
          "Invalid phone number format. Please check the contact information.",
          "error"
        );
      }
    } else {
      showToast("No contact number available for this employee.", "info");
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
              {/* Validate essential employee data before rendering */}
              {employee.employee_name && employee.id ? (
                <>
                  <EmployeeCard employee={employee} />
                  <ActionButtons
                    onWhatsApp={handleWhatsApp}
                    onCall={handleCall}
                  />
                </>
              ) : (
                <ErrorCard
                  message="Employee data is incomplete or invalid. Please try again or contact support."
                  onRetry={() => refetch()}
                />
              )}
            </>
          )}
        </div>
      </main>
      {/* Toast notification container */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default EmployeeIDApp;
