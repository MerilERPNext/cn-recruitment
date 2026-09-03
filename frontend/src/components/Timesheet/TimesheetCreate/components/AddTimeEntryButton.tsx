import React from 'react';
import { Plus } from 'lucide-react';
import Button from '../../../shared/atoms/Button';

interface AddTimeEntryButtonProps {
  onClick: () => void;
  variant: "desktop" | "mobile";
}

export const AddTimeEntryButton: React.FC<AddTimeEntryButtonProps> = ({ onClick, variant }) => {
  if (variant === "desktop") {
    return (
      <Button variant="soft" onClick={onClick} size="md" className="border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20">
        <Plus className="w-4 h-4" /> Add Time Entry
      </Button>
    )
  }
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 text-primary hover:text-primary font-semibold text-sm transition-colors focus:outline-none py-2 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg">
      <Plus className="w-4 h-4" /> Add Time Entry
    </button>
  )
}
