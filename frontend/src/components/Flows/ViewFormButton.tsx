import React from 'react';
import Button from '../shared/atoms/Button';
import { Eye } from 'lucide-react';

interface ViewFormButtonProps{
    onClick: ()=> void;
}

const ViewFormButton: React.FC<ViewFormButtonProps> = ({ onClick }) => {
  return (
       <Button
              variant="subtle"
              size="md"
              onClick={onClick}
            >
              <Eye className="w-4 h-4" />
              View Form
            </Button>
  );
};

export default ViewFormButton;