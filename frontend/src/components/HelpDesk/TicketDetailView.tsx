import React, { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, Info, MessageSquare, Loader2, CheckCircle, XCircle, Edit3 } from "lucide-react";
import {
  useTicketDetail,
  useSendEmailReply,
  useCloseTicket,
  useRequestClosure,
  TicketDetail,
} from "../../hooks/useHelpDeskTickets";
import { useCurrentUser, isHDAgent } from "../../hooks/useCurrentUser";
import ChatMessage, { ChatMessageData } from "./ChatMessage";
import ChatInput, { EmailOptions } from "./ChatInput";
import TicketDetailSidebar from "./TicketDetailSidebar";
import TicketInfoPanel from "./TicketInfoPanel";
import SimplifiedChatView from "./Helpdesk/SimplifiedChatView";
import toast from "react-hot-toast";
import { showCloseTicketButton } from "./hdelpdeskUtils";

type TabType = "activity" | "resolution";

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
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [isEditingResolution, setIsEditingResolution] = useState(false);

  // Queries - ALL hooks must be called before any conditional returns
  const { data: ticket, isLoading: ticketLoading, error } = useTicketDetail(ticketId || "");
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();

  // Mutations - must be called unconditionally (before any returns)
  const sendEmailMutation = useSendEmailReply();
  const closeTicketMutation = useCloseTicket();
  const requestClosureMutation = useRequestClosure();

  // Combined loading state - wait for BOTH ticket AND user data
  const isLoading = ticketLoading || userLoading;

  // Check if user is an HD Agent (agents see full view, regular users see simplified view)
  // IMPORTANT: Only check this AFTER user data is loaded
  const isAgent = isHDAgent(currentUser ?? null);
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
  // Transform ticket data into chat messages (including history/audit trail)
  const allMessages = useMemo<ChatMessageData[]>(() => {
    if (!ticket) return [];

    const messages: ChatMessageData[] = [];
    const ticketCreationTime = new Date(ticket.creation).getTime();

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

    // Add communications (emails) - skip the first one if it matches ticket creation time
    // (to avoid duplicate description message)
    ticket.communications?.forEach((comm) => {
      const commCreationTime = new Date(comm.creation).getTime();
      // Skip if this communication was created at the same time as the ticket (within 5 seconds)
      if (Math.abs(commCreationTime - ticketCreationTime) < 5000) {
        return;
      }

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

  // Scroll to bottom when messages change
  const isInitialScroll = useRef(true);
  useEffect(() => {
    if (messagesEndRef.current && activeTab === "activity") {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: isInitialScroll.current ? "auto" : "smooth",
          block: "end",
        });
        isInitialScroll.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [allMessages.length, activeTab]);

  // Filter messages based on active tab
  const filteredMessages = useMemo(() => {
    if (activeTab === "activity") return allMessages;
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

  // ===== LOADING STATE - MUST BE CHECKED BEFORE ROLE-BASED RENDERING =====
  // We need to wait for BOTH ticket AND user data before deciding which view to show
  // Otherwise, HD Agents might see the wrong view during the loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-app">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-gray-600">Loading ticket...</span>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error || !ticket) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-app">
        <p className="text-red-500 mb-4">Failed to load ticket</p>
        <button
          onClick={() => navigate("/webapp/helpdesk")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Back to HelpDesk
        </button>
      </div>
    );
  }

  // ===== ROLE-BASED VIEW SELECTION =====
  // Now that both user and ticket data are loaded, we can determine the correct view
  // Non-agents see simplified chat view, agents see full view with info panel
  if (!isAgent) {
    return <SimplifiedChatView ticket={ticket} currentUserEmail={currentUserEmail} />;
  }

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

  // Build message with attachments embedded as HTML
  const buildMessageWithAttachments = (
    msg: string,
    files: { file_url: string; file_name: string }[]
  ): string => {
    let htmlMessage = msg.startsWith("<") ? msg : `<p>${msg.replace(/\n/g, "<br/>")}</p>`;

    if (files.length > 0) {
      let attachmentHtml = '<br/><div class="attachments"><strong>Attachments:</strong><ul>';
      files.forEach((file) => {
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.file_name);
        if (isImage) {
          attachmentHtml += `<li><a href="${file.file_url}" target="_blank"><img src="${file.file_url}" alt="${file.file_name}" style="max-width: 300px; max-height: 200px;" /><br/>${file.file_name}</a></li>`;
        } else {
          attachmentHtml += `<li><a href="${file.file_url}" target="_blank">${file.file_name}</a></li>`;
        }
      });
      attachmentHtml += '</ul></div>';
      htmlMessage += attachmentHtml;
    }

    return htmlMessage;
  };

  // Handle send message (email only)
  const handleSendMessage = async (
    message: string,
    attachments: { file_url: string; file_name: string }[],
    emailOptions: EmailOptions
  ) => {
    if (!ticketId || !ticket) return;

    // Embed attachments in message HTML
    const messageWithAttachments = buildMessageWithAttachments(message, attachments);

    try {
      // Send as email
      await sendEmailMutation.mutateAsync({
        ticketId,
        to: emailOptions.to || ticket.raised_by,
        cc: emailOptions.cc,
        bcc: emailOptions.bcc,
        message: messageWithAttachments,
      });
      toast.success("Email sent successfully");
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

  // Note: Loading and error states are already handled above (before role-based rendering)
  // At this point, we know ticket is loaded and user is an HD Agent

  const isSending = sendEmailMutation.isPending;
  const isClosing = closeTicketMutation.isPending || requestClosureMutation.isPending;
  const isTicketClosed = ticket.status === "Closed" || ticket.status === "Resolved";

  // Resolution content component
  const ResolutionContent = () => {
    // If no resolution and ticket not closed, show option to add
    if (!ticket.resolution_details && !isTicketClosed) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="w-16 h-16 bg-app rounded-xl flex items-center justify-center mb-4">
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
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
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
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
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
        return "bg-app text-gray-700";
      default:
        return "bg-app text-gray-700";
    }
  };

  return (
    <div className="h-screen flex flex-col bg-app">
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
              <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${getStatusColor(ticket.status)}`}>
                {ticket.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-gray-500">Assigned to</span>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-app rounded-lg">
                <span className="w-2 h-2 rounded-lg bg-green-500"></span>
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
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${canClose
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

          {/* Info toggle button - visible only on mobile (panel is always visible on desktop) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors lg:hidden"
            title="View ticket details"
          >
            <Info className="w-5 h-5" />
          </button>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-app rounded-xl transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area with Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-6">
            <nav className="flex gap-1">
              {[
                { key: "activity", label: "All Activity", count: allMessages.length },
                showCloseTicketButton(ticket.status, true) && {
                  key: "resolution",
                  label: "Resolution",
                  count: ticket.resolution_details ? 1 : 0,
                },
              ]
                .filter((tab): tab is { key: TabType; label: string; count: number } => Boolean(tab))
                .map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab.key
                      ? "border-blue-500 text-blue-600 bg-blue-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span
                        className={`ml-2 px-2 py-0.5 text-xs rounded-lg ${activeTab === tab.key
                          ? "bg-blue-100 text-blue-700"
                          : "bg-app text-gray-600"
                          }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-app">
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
                      <span className="px-4 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-500 shadow-sm">
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
              placeholder="Type your reply here....."
              isSending={isSending}
              recipientEmail={ticket.raised_by}
            />
          )}
        </div>

        {/* Right: Info Panel (always visible for HD Agents) */}
        <TicketInfoPanel ticket={ticket} />
      </div>

      {/* Sidebar (for mobile toggle - hidden on desktop since panel is always visible) */}
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
