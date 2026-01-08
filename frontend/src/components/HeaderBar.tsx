import React from "react";
import { IoChevronBackOutline } from "react-icons/io5";

interface HeaderBarProps {
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
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
  return (
    <div
      className={`flex w-full min-h-[60px] md:rounded-lg  items-center sticky top-0 z-50 justify-between px-4 py-3 md:z-1 bg-${bgColor} ${className}`}
    >
      <div className="flex items-center w-full">
        {showBackButton && (
          <button
            onClick={onBack}
            className="text-gray-700 hover:text-black focus:outline-none"
            aria-label="Go back"
          >
            {leftIcon || <IoChevronBackOutline size={20} />}
          </button>
        )}
        {title && (
          <h1 className="w-full justify-center text-center module-title">
            {title}
          </h1>
        )}
      </div>
      <div>{rightSlot}</div>
    </div>
  );
};

export default HeaderBar;
