import React from "react";
import { IoChevronBackOutline } from "react-icons/io5";
import { useNavigateBack } from "../hooks/useNavigateBack";

interface HeaderBarProps {
  title?: string;
  showBackButton?: boolean;
  onBack?: (navigateBack: () => void) => void;
  rightSlot?: React.ReactNode;
  leftIcon?: React.ReactNode; // Optional custom left icon
  bgColor?: string;
  className?: string;
}

const HeaderBar: React.FC<HeaderBarProps> = ({
  title = "",
  showBackButton = true,
  onBack,
  rightSlot,
  leftIcon,
  bgColor = "white",
  className = "",
}) => {
  const navigateBack = useNavigateBack();
  const backgroundClass = bgColor === "white" ? "bg-card" : `bg-${bgColor}`;

  const handleBack = () => {
    if (onBack) {
      onBack(navigateBack);
    } else {
      navigateBack();
    }
  };

  return (
    <div
      className={`relative flex w-full min-h-[60px] md:rounded-lg items-center sticky top-0 z-50 justify-center px-4 py-3 md:z-1 ${backgroundClass} ${className}`}
    >
      {showBackButton && (
        <button
          onClick={handleBack}
          className="absolute left-4 text-text-body1 hover:text-primary focus:outline-none z-10 transition-colors"
          aria-label="Go back"
        >
          {leftIcon || <IoChevronBackOutline size={20} />}
        </button>
      )}
      {title && (
        <h1 className="w-full text-center px-12 module-title truncate text-text-title">
          {title}
        </h1>
      )}
      <div className="absolute right-4 z-10">{rightSlot}</div>
    </div>
  );
};

export default HeaderBar;
