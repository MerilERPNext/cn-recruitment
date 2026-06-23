import React from "react";
import { IoChevronBackOutline } from "react-icons/io5";
import { useLocation, useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const location = useLocation();

  const canGoback = location.key !== "default";

  const navigateBack = () => {
    if (window?.isApp && !canGoback && window?.nativeInterface?.execute) {
      // mobile handle back navigation if can not go back from web history
      window.nativeInterface.execute("goBack", {})
        .then(() => {
          console.log("goBack");
        })
        .catch(() => {
          console.log("goBack failed");
          navigate("/webapp");
        });
    } else {
      navigate(-1);
    }
  }

  const handleBack = () => {
    if (onBack) {
      onBack(navigateBack);
    } else {
      navigateBack();
    }
  };

  return (
    <div
      className={`relative flex w-full min-h-[60px] md:rounded-lg items-center sticky top-0 z-50 justify-center px-4 py-3 md:z-1 bg-${bgColor} ${className}`}
    >
      {showBackButton && (
        <button
          onClick={handleBack}
          className="absolute left-4 text-gray-700 hover:text-black focus:outline-none z-10"
          aria-label="Go back"
        >
          {leftIcon || <IoChevronBackOutline size={20} />}
        </button>
      )}
      {title && (
        <h1 className="w-full text-center px-12 module-title truncate">
          {title}
        </h1>
      )}
      <div className="absolute right-4 z-10">{rightSlot}</div>
    </div>
  );
};

export default HeaderBar;
