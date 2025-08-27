import React, { ReactNode } from "react";
import { X } from "lucide-react";
import { useScreenSize } from "../../hooks/useScreenSize";

interface FormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  showCloseButton?: boolean;
  preventCloseOnBackdrop?: boolean;
}

const FormDialog: React.FC<FormDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  className = '',
  showCloseButton = true,
  preventCloseOnBackdrop = false
}) => {
  const { isDesktop } = useScreenSize();

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventCloseOnBackdrop) {
      onClose();
    }
  };

  const getSizeClasses = () => {
    if (!isDesktop) {
      return 'w-full h-full max-w-none max-h-none rounded-none';
    }

    const sizeMap = {
      sm: 'max-w-md w-full max-h-[80vh]',
      md: 'max-w-2xl w-full max-h-[85vh]', 
      lg: 'max-w-4xl w-full max-h-[90vh]',
      xl: 'max-w-6xl w-full max-h-[95vh]',
      full: 'max-w-7xl w-full max-h-[98vh]'
    };
    
    return `${sizeMap[size]} rounded-lg`;
  };

  // Mobile: Full screen modal
  if (!isDesktop) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Mobile Content */}
        <div className={`flex-1 overflow-y-auto ${className}`}>
          {children}
        </div>
      </div>
    );
  }

  // Desktop: Dialog modal
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white shadow-xl border border-gray-200 flex flex-col ${getSizeClasses()}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Desktop Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 truncate">
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          )}
        </div>

        {/* Desktop Content */}
        <div className={`flex-1 overflow-y-auto ${className}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default FormDialog;
