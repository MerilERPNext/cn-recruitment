import React from 'react';
import Button, { ButtonVariant } from '../shared/atoms/Button';
import { Eye } from 'lucide-react';

interface ViewFormButtonProps {
  onClick: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}

const ViewFormButton: React.FC<ViewFormButtonProps> = ({ onClick, variant = "subtle", size = "md" }) => {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
    >
      <Eye className="w-4 h-4" />
      View Form
    </Button>
  );
};

export default ViewFormButton;