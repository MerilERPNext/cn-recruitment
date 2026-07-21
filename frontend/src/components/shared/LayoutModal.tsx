import React, { ReactNode } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";

interface LayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  disableBackdropClick?: boolean;
}

const LayoutModal: React.FC<LayoutModalProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  size = 'lg',
  disableBackdropClick = false
}) => {
  const { isDesktop } = useScreenSize();

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !disableBackdropClick) {
      onClose();
    }
  };

  const getSizeClasses = () => {
    if (size === 'full') return 'w-full h-full';
    
    const sizeMap = {
      sm: isDesktop ? 'max-w-md w-full' : 'w-full',
      md: isDesktop ? 'max-w-2xl w-full' : 'w-full', 
      lg: isDesktop ? 'max-w-4xl w-full' : 'w-full',
      xl: isDesktop ? 'max-w-6xl w-full' : 'w-full'
    };
    
    return sizeMap[size];
  };

  // On desktop, render modal contained within the current layout
  if (isDesktop) {
    return (
      <div 
        className={`absolute inset-0 z-[60] bg-black bg-opacity-50 backdrop-blur-sm ${className}`}
        onClick={handleBackdropClick}
      >
        <div className="h-full overflow-y-auto flex items-start justify-center pt-8 pb-8">
          <div 
            className={`bg-white rounded-lg shadow-xl border border-gray-200 mx-4 ${getSizeClasses()}`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  // On mobile, render as full-screen modal (existing behavior)
  return (
    <div 
      className={`fixed inset-0 z-[60] bg-white overflow-y-auto ${className}`}
      onClick={handleBackdropClick}
    >
      {children}
    </div>
  );
};

export default LayoutModal;
