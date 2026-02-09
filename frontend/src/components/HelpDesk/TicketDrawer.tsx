import React from "react";
import { Loader2 } from "lucide-react";
import SideDrawer from "../shared/SideDrawer";
import { useTicketDetail } from "../../hooks/useHelpDeskTickets";
import SimplifiedChatView from "./SimplifiedChatView";

interface TicketDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
  currentUserEmail: string;
}

const TicketDrawer: React.FC<TicketDrawerProps> = ({
  isOpen,
  onClose,
  ticketId,
  currentUserEmail,
}) => {
  const { data: ticket, isLoading, error } = useTicketDetail(ticketId || "");

  if (!isOpen) return null;

  return (
    <SideDrawer
      open={isOpen}
      onClose={onClose}
      side="right"
      size="xxl"
      title={ticketId ? `Ticket #${ticketId}` : "Ticket Details"}
    >
      <div className="h-[calc(100%+1.5rem)] flex flex-col -m-4 -mt-2">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading ticket...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-red-500">
            Failed to load ticket
          </div>
        ) : !ticket ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Ticket not found
          </div>
        ) : (
          <SimplifiedChatView
            ticket={ticket}
            currentUserEmail={currentUserEmail}
            isDrawer={true}
          />
        )}
      </div>
    </SideDrawer>
  );
};

export default TicketDrawer;
