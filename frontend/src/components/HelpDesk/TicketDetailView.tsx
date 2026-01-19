import React, { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, Info, MessageSquare, Loader2, CheckCircle, XCircle, Edit3 } from "lucide-react";
import {
  useTicketDetail,
  useSendEmailReply,
  useAddComment,
  useCloseTicket,
  useRequestClosure,
  TicketDetail,
} from "../../hooks/useHelpDeskTickets";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import ChatMessage, { ChatMessageData } from "./ChatMessage";
import ChatInput, { InputMode, EmailOptions } from "./ChatInput";
import TicketDetailSidebar from "./TicketDetailSidebar";
import toast from "react-hot-toast";

type TabType = "activity" | "emails" | "comments" | "resolution";

// Resolution Modal Component
interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resolution: string) => void;
  isLoading: boolean;
  isRaiser: boolean;
  existingResolution?: string;
}

const ResolutionModal: React.FC<ResolutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  isRaiser,
  existingResolution,
}) => {
  const [resolution, setResolution] = useState(existingResolution || "");

  useEffect(() => {
    if (isOpen) {
      setResolution(existingResolution || "");
    }
  }, [isOpen, existingResolution]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!resolution.trim()) {
      toast.error("Please enter resolution details");
      return;
    }
    onSubmit(resolution);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isRaiser ? "Close Ticket" : "Request Closure"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resolution Details <span className="text-red-500">*</span>
          </label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Describe how this issue was resolved..."
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            {isRaiser
              ? "This will close the ticket and save the resolution details."
              : "This will send a closure request to the ticket raiser."}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !resolution.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : isRaiser ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Close Ticket
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Request Closure
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const TicketDetailView: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State
  const [activeTab, setActiveTab] = useState<TabType>("activity");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("reply");
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [isEditingResolution, setIsEditingResolution] = useState(false);

  // Queries
  const { data: ticket, isLoading, error } = useTicketDetail(ticketId || "");
  const { data: currentUser } = useCurrentUser();

  // Mutations
  const sendEmailMutation = useSendEmailReply();
  const addCommentMutation = useAddComment();
  const closeTicketMutation = useCloseTicket();
  const requestClosureMutation = useRequestClosure();

  const currentUserEmail = currentUser?.email || "";

  // Check if current user is the raiser or admin
  const isRaiser = ticket?.raised_by === currentUserEmail;
  const isAdmin = currentUser?.roles?.some((role) =>
    ["System Manager", "Administrator", "HD Manager"].includes(role.role)
  ) ?? false;
  const canClose = isRaiser || isAdmin;
  const canEditResolution = isRaiser || isAdmin;

  // Check if resolution was added by someone else
  const resolutionAddedByOther = ticket?.resolution_details && !isRaiser && !isAdmin;

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.comments, ticket?.communications]);

  // Transform ticket data into chat messages (including history/audit trail)
  const allMessages = useMemo<ChatMessageData[]>(() => {
    if (!ticket) return [];

    const messages: ChatMessageData[] = [];

    // Add original request as first message
    messages.push({
      id: `${ticket.name}-original`,
      type: "original",
      content: ticket.description || `<p>${ticket.subject}</p>`,
      sender: {
        name: ticket.contact?.name || ticket.raised_by,
        email: ticket.raised_by,
        avatar: ticket.contact?.image,
      },
      timestamp: new Date(ticket.creation),
      isCurrentUser: ticket.raised_by === currentUserEmail,
      attachments: [],
    });

    // Add communications (emails)
    ticket.communications?.forEach((comm) => {
      messages.push({
        id: comm.name,
        type: "email",
        content: comm.content,
        sender: {
          name: comm.user?.full_name || comm.user?.name || comm.sender,
          email: comm.sender,
          avatar: comm.user?.user_image,
        },
        timestamp: new Date(comm.creation),
        isCurrentUser: comm.sender === currentUserEmail,
        attachments: comm.attachments || [],
        deliveryStatus: comm.delivery_status,
      });
    });

    // Add comments
    ticket.comments?.forEach((comment) => {
      messages.push({
        id: comment.name,
        type: "comment",
        content: comment.content,
        sender: {
          name: comment.user?.full_name || comment.user?.name || comment.commented_by,
          email: comment.commented_by,
          avatar: comment.user?.user_image,
        },
        timestamp: new Date(comment.creation),
        isCurrentUser: comment.commented_by === currentUserEmail,
        attachments: comment.attachments || [],
      });
    });

    // Add history/audit trail entries
    ticket.history?.forEach((historyItem, index) => {
      messages.push({
        id: `history-${index}-${historyItem.creation}`,
        type: "activity",
        content: historyItem.action,
        sender: {
          name: historyItem.user || "System",
          email: historyItem.user || "system",
        },
        timestamp: new Date(historyItem.creation),
        isCurrentUser: historyItem.user === currentUserEmail,
        attachments: [],
      });
    });

    // Sort by timestamp
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [ticket, currentUserEmail]);

  // Filter messages based on active tab
  const filteredMessages = useMemo(() => {
    if (activeTab === "activity") return allMessages;
    if (activeTab === "emails") {
      return allMessages.filter((m) => m.type === "original" || m.type === "email");
    }
    if (activeTab === "comments") {
      return allMessages.filter((m) => m.type === "comment");
    }
    // Resolution tab shows nothing in messages - handled separately
    return [];
  }, [allMessages, activeTab]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: ChatMessageData[] } = {};

    filteredMessages.forEach((msg) => {
      const dateKey = formatDateKey(msg.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });

    return groups;
  }, [filteredMessages]);

  // Format date for grouping
  function formatDateKey(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // Get assigned user name
  const getAssignedUser = (ticket: TicketDetail): string => {
    if (!ticket._assign) return "Unassigned";
    try {
      const assigned = JSON.parse(ticket._assign);
      if (Array.isArray(assigned) && assigned.length > 0) {
        return assigned[0];
      }
    } catch {
      return ticket._assign;
    }
    return "Unassigned";
  };

  // Handle send message
  const handleSendMessage = async (
    message: string,
    attachments: { file_url: string; file_name: string }[],
    mode: InputMode,
    emailOptions?: EmailOptions
  ) => {
    if (!ticketId || !ticket) return;

    try {
      if (mode === "comment") {
        // Send as comment
        await addCommentMutation.mutateAsync({
          ticketId,
          content: message,
          attachments,
        });
        toast.success("Comment added successfully");
      } else {
        // Send as email - use emailOptions if provided, fallback to ticket.raised_by
        const recipient = emailOptions?.to || ticket.raised_by;
        await sendEmailMutation.mutateAsync({
          ticketId,
          to: recipient,
          cc: emailOptions?.cc,
          bcc: emailOptions?.bcc,
          message: message.startsWith("<") ? message : `<p>${message.replace(/\n/g, "<br/>")}</p>`,
          attachments,
        });
        toast.success("Email sent successfully");
      }
    } catch {
      toast.error("Failed to send message");
      throw new Error("Failed to send");
    }
  };

  // Handle close ticket
  const handleCloseTicket = async (resolution: string) => {
    if (!ticketId) return;

    try {
      if (canClose) {
        // Direct close for raiser/admin
        await closeTicketMutation.mutateAsync({
          ticketId,
          resolutionDetails: resolution,
        });
        toast.success("Ticket closed successfully");
      } else {
        // Request closure for others
        await requestClosureMutation.mutateAsync({
          ticketId,
          resolutionNotes: resolution,
        });
        toast.success("Closure request sent successfully");
      }
      setIsResolutionModalOpen(false);
      setIsEditingResolution(false);
    } catch {
      toast.error("Failed to close ticket");
    }
  };

  // Handle close
  const handleClose = () => {
    navigate("/webapp/helpdesk");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-gray-600">Loading ticket...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !ticket) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-red-500 mb-4">Failed to load ticket</p>
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Back to HelpDesk
        </button>
      </div>
    );
  }

  const isSending = sendEmailMutation.isPending || addCommentMutation.isPending;
  const isClosing = closeTicketMutation.isPending || requestClosureMutation.isPending;
  const isTicketClosed = ticket.status === "Closed" || ticket.status === "Resolved";

  // Resolution content component
  const ResolutionContent = () => {
    // If no resolution and ticket not closed, show option to add
    if (!ticket.resolution_details && !isTicketClosed) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No Resolution Yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Add resolution details to close this ticket
          </p>
          {canClose && (
            <button
              onClick={() => setIsResolutionModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Add Resolution & Close Ticket
            </button>
          )}
          {!canClose && (
            <button
              onClick={() => setIsResolutionModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Request Ticket Closure
            </button>
          )}
        </div>
      );
    }

    // If ticket is closed but no resolution details
    if (!ticket.resolution_details && isTicketClosed) {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Ticket Closed</h3>
                <p className="text-sm text-gray-500">No resolution details provided</p>
              </div>
            </div>
            {canEditResolution && (
              <button
                onClick={() => {
                  setIsEditingResolution(true);
                  setIsResolutionModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Add Resolution Details
              </button>
            )}
          </div>
        </div>
      );
    }

    // Show resolution details
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Resolution Details</h3>
                {ticket.resolution_date && (
                  <p className="text-sm text-gray-500">
                    Resolved on {new Date(ticket.resolution_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
            {canEditResolution && !resolutionAddedByOther && (
              <button
                onClick={() => {
                  setIsEditingResolution(true);
                  setIsResolutionModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: ticket.resolution_details || "" }}
          />
        </div>
      </div>
    );
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-700";
      case "Replied":
        return "bg-purple-100 text-purple-700";
      case "Resolved":
        return "bg-green-100 text-green-700";
      case "Closed":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {/* Chat icon */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>

          {/* Title and assigned */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-gray-900 text-lg">
                Issue Discussion
                <span className="ml-2 text-blue-600">#{ticket.name}</span>
              </h1>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                {ticket.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-gray-500">Assigned to</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-sm font-medium text-gray-700">
                  {getAssignedUser(ticket)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Close Ticket Button - show only if not closed */}
          {!isTicketClosed && (
            <button
              onClick={() => setIsResolutionModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                canClose
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
            >
              {canClose ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Close Ticket
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Request Closure
                </>
              )}
            </button>
          )}

          {/* Info toggle button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
            title="View ticket details"
          >
            <Info className="w-5 h-5" />
          </button>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-1">
          {[
            { key: "activity", label: "All Activity", count: allMessages.length },
            { key: "emails", label: "Emails", count: (ticket.communications?.length || 0) + 1 },
            { key: "comments", label: "Comments", count: ticket.comments?.length || 0 },
            { key: "resolution", label: "Resolution", count: ticket.resolution_details ? 1 : 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === "resolution" ? (
          <ResolutionContent />
        ) : Object.entries(groupedMessages).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No messages to display</p>
            <p className="text-sm text-gray-400 mt-1">Start the conversation by sending a message below</p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedMessages).map(([dateKey, messages]) => (
              <div key={dateKey}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-6">
                  <span className="px-4 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-500 shadow-sm">
                    {dateKey}
                  </span>
                </div>

                {/* Messages for this date */}
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - hide on resolution tab */}
      {activeTab !== "resolution" && (
        <ChatInput
          onSend={handleSendMessage}
          placeholder={
            inputMode === "comment"
              ? "Type your comment here....."
              : "Type your reply here....."
          }
          isSending={isSending}
          recipientEmail={ticket.raised_by}
          mode={inputMode}
          onModeChange={setInputMode}
        />
      )}

      {/* Sidebar */}
      <TicketDetailSidebar
        ticket={ticket}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Resolution Modal */}
      <ResolutionModal
        isOpen={isResolutionModalOpen}
        onClose={() => {
          setIsResolutionModalOpen(false);
          setIsEditingResolution(false);
        }}
        onSubmit={handleCloseTicket}
        isLoading={isClosing}
        isRaiser={canClose}
        existingResolution={isEditingResolution ? ticket.resolution_details : undefined}
      />
    </div>
  );
};

export default TicketDetailView;
