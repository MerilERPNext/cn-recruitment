import React, { useState } from "react";
import { X } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resolution: string) => void;
  ticketId: string;
  isRequestClosure?: boolean;
  isLoading?: boolean;
}

const ResolutionModal: React.FC<ResolutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ticketId,
  isRequestClosure = false,
  isLoading = false,
}) => {
  const [resolution, setResolution] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (resolution.trim()) {
      onSubmit(resolution);
    }
  };

  const title = isRequestClosure ? "Request Ticket Closure" : "Close Ticket";
  const description = isRequestClosure
    ? "Please provide a resolution note for the ticket owner to review."
    : "Please provide the resolution details before closing this ticket.";
  const buttonText = isRequestClosure ? "Request Closure" : "Close Ticket";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <Typography variant="h3" color="primary">
              {title}
            </Typography>
            <Typography variant="bodySmall" color="body2" className="mt-1">
              Ticket ID: {ticketId}
            </Typography>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <Typography variant="bodySmall" color="body2" className="mb-3">
            {description}
          </Typography>

          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Enter resolution details..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <Button
            variant="outline"
            bgColor="primary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contain"
            bgColor="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!resolution.trim() || isLoading}
          >
            {isLoading ? "Processing..." : buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResolutionModal;
