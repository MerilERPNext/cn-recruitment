import React, { useState, useMemo, useRef, useEffect } from "react";
import { X, Loader2, MessageSquare, Paperclip, CheckCircle, Edit3, Reply, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import {
  TicketDetail,
  useSendEmailReply,
  useCloseTicket,
  useCloseResolvedTicket,
  useRejectResolution,
  useResolutionHistory,
  useUserLookup,
  useEmployeeByUserEmail,
} from "../../hooks/useHelpDeskTickets";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import SimplifiedChatInput from "./SimplifiedChatInput";
import toast from "react-hot-toast";

interface SimplifiedChatViewProps {
  ticket: TicketDetail;
  currentUserEmail: string;
  isDrawer?: boolean;
}

interface SimpleChatMessage {
  id: string;
  content: string;
  quotedContent?: string | null;
  quotedSender?: string | null;
  sender: {
    name: string;
    email: string;
    avatar?: string;
  };
  timestamp: Date;
  isCurrentUser: boolean;
  attachments: { file_name: string; file_url: string }[];
}

// Parse quoted content from HTML (blockquotes, gmail_quote, etc.)
interface ParsedMessage {
  quotedContent: string | null;
  quotedSender: string | null;
  mainContent: string;
}

const parseQuotedContent = (htmlContent: string): ParsedMessage => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Find blockquote or gmail_quote or outlook reply markers
    const blockquote = doc.querySelector('blockquote, .gmail_quote, #appendonsend, .reply-to-content');

    if (blockquote) {
      const quotedContent = blockquote.innerHTML;

      // Try to parse sender from "On [date], [name] wrote:" pattern
      let quotedSender: string | null = null;
      const prevSibling = blockquote.previousElementSibling;
      if (prevSibling && prevSibling.textContent) {
        const match = prevSibling.textContent.match(/On .+?, (.+?) wrote:/);
        if (match) {
          quotedSender = match[1];
        }
      }

      // Remove the blockquote from the document
      blockquote.remove();

      // Also remove the "On [date], [name] wrote:" line if present
      if (prevSibling && prevSibling.textContent?.includes(' wrote:')) {
        prevSibling.remove();
      }

      const mainContent = doc.body.innerHTML.trim();

      return {
        quotedContent: quotedContent.trim() || null,
        quotedSender,
        mainContent: mainContent || htmlContent
      };
    }

    return { quotedContent: null, quotedSender: null, mainContent: htmlContent };
  } catch {
    return { quotedContent: null, quotedSender: null, mainContent: htmlContent };
  }
};

// Resolution Modal Component
interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resolution: string) => void;
  isLoading: boolean;
  isRaiser: boolean;
  isEditing?: boolean;
  isResolving?: boolean;
  existingResolution?: string;
}

const ResolutionModal: React.FC<ResolutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  isEditing,
  isResolving,
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
            {isResolving ? "Resolve Ticket" : isEditing ? "Edit Resolution" : "Close Ticket"}
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
            {isResolving
              ? "This will save the resolution and set the ticket status to Resolved."
              : isEditing
                ? "This will save the resolution and set status to Resolved."
                : "This will close the ticket and save the resolution details."}
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
            ) : isResolving ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Resolve Ticket
              </>
            ) : isEditing ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Save Resolution
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Close Ticket
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Reject Resolution Modal Component
interface RejectResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isLoading: boolean;
}

const RejectResolutionModal: React.FC<RejectResolutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    onSubmit(reason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Reject Resolution</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why the resolution is not acceptable..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            This will reject the resolution and set the ticket status back to Replied.
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
            disabled={isLoading || !reason.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Reject Resolution
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const SimplifiedChatView: React.FC<SimplifiedChatViewProps> = ({
  ticket,
  currentUserEmail,
  isDrawer = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "resolution">("chat");
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [isEditingResolution, setIsEditingResolution] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isResolvingTicket, setIsResolvingTicket] = useState(false);
  const [replyingTo, setReplyingTo] = useState<SimpleChatMessage | null>(null);

  // Mutations
  const sendEmailMutation = useSendEmailReply();
  const closeTicketMutation = useCloseTicket();
  const closeResolvedMutation = useCloseResolvedTicket();
  const rejectResolutionMutation = useRejectResolution();

  // User lookup for displaying names instead of emails
  const { data: userLookup } = useUserLookup();

  // Resolution history
  const { data: resolutionHistory } = useResolutionHistory(ticket.name);
  const [expandedHistoryEntries, setExpandedHistoryEntries] = useState<Record<string, boolean>>({});

  // Check ticket status - only "Closed" is truly closed; "Resolved" requires user action
  const isTicketClosed = ticket.status === "Closed";

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && activeTab === "chat") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket.communications, activeTab]);

  // Transform ticket data into simple chat messages (emails only, no comments/activity)
  const messages = useMemo<SimpleChatMessage[]>(() => {
    const msgs: SimpleChatMessage[] = [];
    const ticketCreationTime = new Date(ticket.creation).getTime();

    // Add original request as first message
    msgs.push({
      id: `${ticket.name}-original`,
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
      // This is likely the initial description being saved as a communication
      if (Math.abs(commCreationTime - ticketCreationTime) < 5000) {
        return;
      }

      // Parse quoted content from the message
      const parsed = parseQuotedContent(comm.content || '');

      msgs.push({
        id: comm.name,
        content: parsed.mainContent,
        quotedContent: parsed.quotedContent,
        quotedSender: parsed.quotedSender,
        sender: {
          name: comm.user?.full_name || comm.user?.name || comm.sender,
          email: comm.sender,
          avatar: comm.user?.user_image,
        },
        timestamp: new Date(comm.creation),
        isCurrentUser: comm.sender === currentUserEmail,
        attachments: comm.attachments || [],
      });
    });

    // Sort by timestamp
    return msgs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [ticket, currentUserEmail]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: SimpleChatMessage[] } = {};

    messages.forEach((msg) => {
      const dateKey = formatDateKey(msg.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });

    return groups;
  }, [messages]);

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

  // Format timestamp
  const formatTime = (date: Date) => {
    return date
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  };

  // Get avatar initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get assigned user email
  const getAssignedUserEmail = (): string | null => {
    if (!ticket._assign) return null;
    try {
      const assigned = JSON.parse(ticket._assign);
      if (Array.isArray(assigned) && assigned.length > 0) {
        return assigned[0];
      }
    } catch {
      return ticket._assign;
    }
    return null;
  };

  // Get assigned user name (display name instead of email)
  const getAssignedUser = (): string => {
    const email = getAssignedUserEmail();
    if (!email) return "Unassigned";
    // Use full name from lookup if available, otherwise extract from email
    return userLookup?.get(email) || email.split("@")[0].replace(/[._]/g, " ");
  };

  // Get employee data for hover card
  const assignedEmail = getAssignedUserEmail();
  const { data: employeeData } = useEmployeeByUserEmail(assignedEmail);

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
      case "Reopened":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-app text-gray-700";
    }
  };

  // Helper to truncate HTML content for quoted messages
  const truncateHtml = (html: string, maxLength: number): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    if (text.length <= maxLength) return html;
    return `<span>${text.substring(0, maxLength)}...</span>`;
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

  // Handle send message (always as email for simplified view)
  const handleSendMessage = async (
    message: string,
    attachments: { file_url: string; file_name: string }[]
  ) => {
    try {
      // Get the assigned agent email to send to
      const assignedEmail = getAssignedUserEmail();
      const recipient = assignedEmail || ticket.raised_by;

      // Build final message with quoted content if replying
      let finalMessage = message;
      if (replyingTo) {
        const quotedContent = `
          <div class="reply-to-content" style="border-left: 3px solid #3b82f6; padding-left: 12px; margin-bottom: 12px; color: #6b7280;">
            <div style="font-size: 12px; font-weight: 500;">${replyingTo.sender.name} wrote:</div>
            <div style="font-size: 14px;">${truncateHtml(replyingTo.content, 200)}</div>
          </div>
        `;
        finalMessage = quotedContent + message;
      }

      // Embed attachments in message HTML instead of passing separately
      const messageWithAttachments = buildMessageWithAttachments(finalMessage, attachments);

      await sendEmailMutation.mutateAsync({
        ticketId: ticket.name,
        to: recipient,
        message: messageWithAttachments,
      });
      toast.success("Message sent successfully");
      setReplyingTo(null);
    } catch {
      toast.error("Failed to send message");
      throw new Error("Failed to send");
    }
  };

  // Handle close ticket button click
  const handleCloseButtonClick = async () => {
    // If resolution already exists, close directly without popup
    if (ticket.resolution_details) {
      try {
        await closeTicketMutation.mutateAsync({
          ticketId: ticket.name,
          resolutionDetails: ticket.resolution_details,
        });
        toast.success("Ticket closed successfully");
      } catch {
        toast.error("Failed to close ticket");
      }
    } else {
      // No resolution exists, show popup to enter resolution
      setIsResolutionModalOpen(true);
    }
  };

  // Handle resolve ticket button click
  const handleResolveButtonClick = () => {
    setIsResolvingTicket(true);
    setIsResolutionModalOpen(true);
  };

  // Handle close ticket with resolution from modal
  const handleCloseTicket = async (resolution: string) => {
    try {
      await closeTicketMutation.mutateAsync({
        ticketId: ticket.name,
        resolutionDetails: resolution,
      });
      toast.success("Ticket closed successfully");
      setIsResolutionModalOpen(false);
      setIsEditingResolution(false);
    } catch {
      toast.error("Failed to close ticket");
    }
  };

  // Handle save resolution (sets status to Resolved, not Closed)
  const handleSaveResolution = async (resolution: string) => {
    try {
      // When editing resolution, set status to Resolved
      await closeTicketMutation.mutateAsync({
        ticketId: ticket.name,
        resolutionDetails: resolution,
        status: "Resolved", // Set to Resolved, not Closed
      });
      toast.success("Resolution saved successfully");
      setIsResolutionModalOpen(false);
      setIsEditingResolution(false);
      setIsResolvingTicket(false);
    } catch {
      toast.error("Failed to save resolution");
    }
  };

  // Handle reject resolution
  const handleRejectResolution = async (rejectionReason: string) => {
    try {
      await rejectResolutionMutation.mutateAsync({
        ticketId: ticket.name,
        rejectionReason,
      });
      toast.success("Resolution rejected");
      setIsRejectModalOpen(false);
    } catch {
      toast.error("Failed to reject resolution");
    }
  };

  // Handle accept closure (for Resolved tickets)
  const handleAcceptClosure = async () => {
    try {
      await closeResolvedMutation.mutateAsync({ ticketId: ticket.name });
      toast.success("Ticket closed successfully");
    } catch {
      toast.error("Failed to close ticket");
    }
  };

  const isSending = sendEmailMutation.isPending;
  const isClosing = closeTicketMutation.isPending || closeResolvedMutation.isPending;

  // Simple Avatar component - avatars should remain circular
  const Avatar = ({ sender, isCurrentUser }: { sender: SimpleChatMessage["sender"]; isCurrentUser: boolean }) => (
    <div className="flex-shrink-0">
      {sender.avatar ? (
        <img
          src={sender.avatar}
          alt={sender.name}
          className="w-10 h-10 rounded-xl object-cover"
        />
      ) : (
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium ${isCurrentUser ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"
            }`}
        >
          {getInitials(sender.name)}
        </div>
      )}
    </div>
  );

  // Attachment list component
  const AttachmentList = ({ attachments, isCurrentUser }: { attachments: SimpleChatMessage["attachments"]; isCurrentUser: boolean }) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-200/30 space-y-1.5">
        {attachments.map((attachment, index) => (
          <a
            key={index}
            href={attachment.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isCurrentUser
              ? "bg-blue-400/20 text-blue-100 hover:bg-blue-400/30"
              : "bg-gray-200/50 text-gray-700 hover:bg-gray-200"
              }`}
          >
            <Paperclip className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{attachment.file_name}</span>
          </a>
        ))}
      </div>
    );
  };

  // Quoted message component
  const QuotedMessage = ({ content, sender, isCurrentUser }: { content: string; sender?: string | null; isCurrentUser: boolean }) => (
    <div className={`mb-2 p-3 rounded-lg border-l-4 ${isCurrentUser
      ? 'bg-blue-400/20 border-blue-300 text-blue-100'
      : 'bg-gray-100 border-gray-300 text-gray-600'
      }`}>
      <div className={`text-xs mb-1 font-medium ${isCurrentUser ? 'text-blue-200' : 'text-gray-500'}`}>
        {sender ? `${sender} wrote:` : 'Previous message:'}
      </div>
      <div
        className={`text-sm line-clamp-3 prose prose-sm max-w-none ${isCurrentUser ? 'prose-invert' : ''} [&>p]:mb-0`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );

  // Chat message component (simplified, no type badges)
  const ChatBubble = ({ message }: { message: SimpleChatMessage }) => {
    const { content, quotedContent, quotedSender, sender, timestamp, isCurrentUser, attachments } = message;

    if (isCurrentUser) {
      // Right-aligned message (current user) - blue gradient
      return (
        <div className="group flex justify-end gap-3 mb-6">
          {/* Reply button - shows on hover */}
          {!isTicketClosed && (
            <button
              onClick={() => setReplyingTo(message)}
              className="opacity-0 group-hover:opacity-100 self-center p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              title="Reply"
            >
              <Reply className="w-4 h-4" />
            </button>
          )}
          <div className="flex flex-col items-end max-w-[75%]">
            {/* Message bubble */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md px-5 py-4">
              {/* Quoted message - appears ABOVE main content */}
              {quotedContent && (
                <QuotedMessage content={quotedContent} sender={quotedSender} isCurrentUser={true} />
              )}

              {/* Main content */}
              <div
                className="text-sm prose prose-sm prose-invert max-w-none [&>p]:mb-0 [&>p:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: content }}
              />
              <AttachmentList attachments={attachments} isCurrentUser={true} />
            </div>

            {/* Timestamp */}
            <span className="text-xs text-gray-400 mt-2 mr-1">{formatTime(timestamp)}</span>
          </div>
          <Avatar sender={sender} isCurrentUser={true} />
        </div>
      );
    }

    // Left-aligned message (other users) - warm cream color
    return (
      <div className="group flex justify-start gap-3 mb-6">
        <Avatar sender={sender} isCurrentUser={false} />

        <div className="flex flex-col items-start max-w-[75%]">
          {/* Message bubble - warm cream/beige color */}
          <div className="bg-[#F5F0E8] rounded-2xl rounded-bl-md px-5 py-4">
            {/* Sender name */}
            <div className="text-xs text-gray-500 mb-2 font-medium">
              {sender.name}
            </div>

            {/* Quoted message - appears ABOVE main content */}
            {quotedContent && (
              <QuotedMessage content={quotedContent} sender={quotedSender} isCurrentUser={false} />
            )}

            {/* Content */}
            <div
              className="text-sm text-gray-800 prose prose-sm max-w-none [&>p]:mb-0 [&>p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: content }}
            />
            <AttachmentList attachments={attachments} isCurrentUser={false} />
          </div>

          {/* Timestamp */}
          <span className="text-xs text-gray-400 mt-2 ml-1">{formatTime(timestamp)}</span>
        </div>

        {/* Reply button - shows on hover */}
        {!isTicketClosed && (
          <button
            onClick={() => setReplyingTo(message)}
            className="opacity-0 group-hover:opacity-100 self-center p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

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
          <button
            onClick={() => setIsResolutionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors bg-green-500 hover:bg-green-600"
          >
            <CheckCircle className="w-4 h-4" />
            Add Resolution & Close Ticket
          </button>
        </div>
      );
    }

    // If ticket is closed but no resolution details
    if (!ticket.resolution_details && isTicketClosed) {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Ticket Closed</h3>
                <p className="text-sm text-gray-500">No resolution details provided</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show resolution details
    const historyEntries = resolutionHistory || [];
    const pastEntries = historyEntries.filter((e) => !e.is_current_version);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
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
            <div className="flex items-center gap-2">
              {ticket.status !== "Closed" && (
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
              {ticket.status === "Resolved" && ticket.raised_by === currentUserEmail && (
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              )}
            </div>
          </div>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: ticket.resolution_details || "" }}
          />
        </div>

        {/* Previous Resolutions */}
        {pastEntries.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-gray-500" />
              <h4 className="font-medium text-gray-700 text-sm">Previous Resolutions</h4>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {pastEntries.length}
              </span>
            </div>
            <div className="space-y-3">
              {pastEntries.map((entry) => {
                const isExpanded = expandedHistoryEntries[entry.name] || false;
                return (
                  <div
                    key={entry.name}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          v{entry.version_number}
                        </span>
                        {entry.satisfaction_status && entry.satisfaction_status !== "Pending" && (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${entry.satisfaction_status === "Satisfied"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                              }`}
                          >
                            {entry.satisfaction_status}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {entry.submitted_by_name || entry.submitted_by} &middot;{" "}
                        {entry.submitted_on
                          ? new Date(entry.submitted_on).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setExpandedHistoryEntries((prev) => ({
                          ...prev,
                          [entry.name]: !isExpanded,
                        }))
                      }
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> Show details
                        </>
                      )}
                    </button>
                    {isExpanded && (
                      <div
                        className="text-sm text-gray-600 prose prose-sm max-w-none mt-2"
                        dangerouslySetInnerHTML={{
                          __html: entry.resolution_content || "",
                        }}
                      />
                    )}
                    {entry.rejection_reason && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">
                        <span className="font-medium">Rejection reason:</span>{" "}
                        {entry.rejection_reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${isDrawer ? "flex-1 min-h-0" : "h-screen"} flex flex-col bg-app`}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 shadow-sm">
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
              <WrapperHoverCard employeeId={employeeData?.name} placement="bottom-left">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-app rounded-lg cursor-pointer">
                  <span className="w-2 h-2 rounded-lg bg-green-500"></span>
                  <span className="text-sm font-medium text-gray-700">
                    {getAssignedUser()}
                  </span>
                </div>
              </WrapperHoverCard>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 w-full md:w-auto overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
          {ticket.status === "Resolved" && ticket.raised_by === currentUserEmail ? (
            <>
              {/* Accept Closure - closes the ticket */}
              <button
                onClick={handleAcceptClosure}
                disabled={isClosing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              >
                <CheckCircle className="w-4 h-4" />
                {isClosing ? "Closing..." : "Accept Closure"}
              </button>
              {/* Reject Resolution - reopens for more work */}
              <button
                onClick={() => setIsRejectModalOpen(true)}
                disabled={isClosing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </>
          ) : ticket.status !== "Closed" && ticket.status !== "Resolved" ? (
            <>
              {!isDrawer && (
                <button
                  onClick={handleResolveButtonClick}
                  disabled={isClosing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolve
                </button>
              )}
              <button
                onClick={handleCloseButtonClick}
                disabled={isClosing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              >
                <CheckCircle className="w-4 h-4" />
                {isClosing ? "Closing..." : "Close Ticket"}
              </button>
            </>
          ) : null}
        </div>
      </header>

      {/* Info banner when agent has requested closure */}
      {ticket.status === "Resolved" && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-2">
          <span className="text-amber-600 text-sm font-medium">
            The agent has requested closure for this ticket. Please review and accept or reject.
          </span>
        </div>
      )}

      {/* Tabs - Chat and Resolution */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === "chat"
              ? "border-blue-500 text-blue-600 bg-blue-50/50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
          >
            Messages
            {messages.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-lg ${activeTab === "chat"
                ? "bg-blue-100 text-blue-700"
                : "bg-app text-gray-600"
                }`}>
                {messages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("resolution")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === "resolution"
              ? "border-blue-500 text-blue-600 bg-blue-50/50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
          >
            Resolution
            {ticket.resolution_details && (
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-lg ${activeTab === "resolution"
                ? "bg-blue-100 text-blue-700"
                : "bg-app text-gray-600"
                }`}>
                1
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Content Area */}
      {activeTab === "resolution" ? (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ResolutionContent />
        </div>
      ) : (
        <>
          {/* Chat Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {Object.entries(groupedMessages).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500">No messages to display</p>
                <p className="text-sm text-gray-400 mt-1">
                  Start the conversation by sending a message below
                </p>
              </div>
            ) : (
              <div>
                {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
                  <div key={dateKey}>
                    {/* Date separator - RECTANGULAR not elliptical */}
                    <div className="flex items-center justify-center my-6">
                      <span className="px-4 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-500 shadow-sm">
                        {dateKey}
                      </span>
                    </div>

                    {/* Messages for this date */}
                    {dateMessages.map((msg) => (
                      <ChatBubble key={msg.id} message={msg} />
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Simplified Chat Input - no CC/BCC, no mode toggle */}
          <SimplifiedChatInput
            onSend={handleSendMessage}
            placeholder="Type your reply here....."
            isSending={isSending}
            replyingTo={replyingTo ? {
              id: replyingTo.id,
              content: replyingTo.content,
              senderName: replyingTo.sender.name
            } : null}
            onCancelReply={() => setReplyingTo(null)}
          />
        </>
      )}

      {/* Resolution Modal */}
      <ResolutionModal
        isOpen={isResolutionModalOpen}
        onClose={() => {
          setIsResolutionModalOpen(false);
          setIsEditingResolution(false);
          setIsResolvingTicket(false);
        }}
        onSubmit={isEditingResolution || isResolvingTicket ? handleSaveResolution : handleCloseTicket}
        isLoading={isClosing}
        isRaiser={true}
        isEditing={isEditingResolution}
        isResolving={isResolvingTicket}
        existingResolution={isEditingResolution ? ticket.resolution_details : undefined}
      />

      {/* Reject Resolution Modal */}
      <RejectResolutionModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onSubmit={handleRejectResolution}
        isLoading={rejectResolutionMutation.isPending}
      />
    </div>
  );
};

// Loading component
export const SimplifiedChatViewLoading: React.FC = () => (
  <div className="h-screen flex items-center justify-center bg-app">
    <div className="flex items-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      <span className="text-gray-600">Loading ticket...</span>
    </div>
  </div>
);

// Error component
export const SimplifiedChatViewError: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="h-screen flex flex-col items-center justify-center bg-app">
    <p className="text-red-500 mb-4">Failed to load ticket</p>
    <button
      onClick={onClose}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
    >
      Back to HelpDesk
    </button>
  </div>
);

export default SimplifiedChatView;
