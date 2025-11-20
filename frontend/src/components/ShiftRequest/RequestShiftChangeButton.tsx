import React from "react";
import Button from "../shared/atoms/Button";
interface Props {
  onClick: () => void;
  label?: string;
}

const RequestShiftChangeButton: React.FC<Props> = ({
  onClick,
  label = "Request Shift Change",
}) => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-md mx-auto p-4">
        {/* <button
          onClick={onClick}
          className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {label}
        </button> */}
        <Button
          fullWidth
          onClick={onClick}
          size="lg"
          bgColor="blue-600"
          className="hover:bg-blue-700"
        >
          {label}
        </Button>
      </div>
    </div>
  );
};

export default RequestShiftChangeButton;
