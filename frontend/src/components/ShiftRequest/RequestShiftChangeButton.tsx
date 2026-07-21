import React from "react";
import Button from "../shared/atoms/Button";
interface Props {
  onClick: () => void;
  label?: string;
}

const RequestShiftChangeButton: React.FC<Props> = ({
  onClick,
  label = "+ Request Shift Change",
}) => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-md mx-auto p-4">
        <Button fullWidth onClick={onClick} size="lg" bgColor="primary">
          {label}
        </Button>
      </div>
    </div>
  );
};

export default RequestShiftChangeButton;
