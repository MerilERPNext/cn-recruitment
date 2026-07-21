import { ChevronLeft, X } from "lucide-react";
import { useNavigate } from "react-router";

interface LayoutHeaderProps {
  tab: string;
  path?: string;
  onBack?: () => void;
  icon?: "chevron" | "x";
  children?: React.ReactNode;
}

const LayoutHeader = ({
  path,
  tab,
  onBack,
  icon = "chevron",
  children,
}: LayoutHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (path) {
      navigate(path);
    } else {
      navigate(-1);
    }
  };

  const BackIcon = icon === "x" ? X : ChevronLeft;

  return (
    <>
      {/* Fixed Header (Mobile only) */}
      <div className="block lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-[60px] shadow-none">
        <div className="mx-auto px-4 py-3 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Left: Icon */}
            <div className="flex items-center h-full">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
              >
                <BackIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Center: Tab Title */}
            <div className="text-lg font-semibold text-gray-800 truncate h-full">
              {tab}
            </div>

            {/* Right: Children */}
            <div className="flex items-center justify-end overflow-hidden h-full">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for mobile to prevent content overlap */}
      {/* <div className="h-14 block lg:hidden" /> */}
    </>
  );
};

export default LayoutHeader;
