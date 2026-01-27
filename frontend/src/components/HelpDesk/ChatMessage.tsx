import React from "react";
import { Paperclip, Mail, MessageSquare, FileText, Activity } from "lucide-react";

export interface ChatMessageData {
  id: string;
  type: "original" | "email" | "comment" | "activity";
  content: string;
  sender: {
    name: string;
    email: string;
    avatar?: string;
  };
  timestamp: Date;
  isCurrentUser: boolean;
  attachments: { file_name: string; file_url: string }[];
  deliveryStatus?: string;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const { type, content, sender, timestamp, isCurrentUser, attachments, deliveryStatus } = message;

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).toLowerCase();
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

  // Sanitize HTML content
  const createMarkup = (html: string) => {
    return { __html: html };
  };

  // Get type icon
  const getTypeIcon = () => {
    switch (type) {
      case "original":
        return <FileText className="w-3.5 h-3.5" />;
      case "email":
        return <Mail className="w-3.5 h-3.5" />;
      case "comment":
        return <MessageSquare className="w-3.5 h-3.5" />;
      case "activity":
        return <Activity className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  // Get type badge
  const getTypeBadge = () => {
    const baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg";

    if (type === "original") {
      return (
        <span className={`${baseClasses} bg-purple-100 text-purple-700`}>
          {getTypeIcon()}
          Original Request
        </span>
      );
    }
    if (type === "comment") {
      return (
        <span className={`${baseClasses} bg-amber-100 text-amber-700`}>
          {getTypeIcon()}
          Internal Comment
        </span>
      );
    }
    if (type === "email") {
      return (
        <span className={`${baseClasses} bg-blue-100 text-blue-700`}>
          {getTypeIcon()}
          Email
          {deliveryStatus && (
            <span className="ml-1 opacity-70">• {deliveryStatus}</span>
          )}
        </span>
      );
    }
    if (type === "activity") {
      return (
        <span className={`${baseClasses} bg-gray-100 text-gray-600`}>
          {getTypeIcon()}
          Activity
        </span>
      );
    }
    return null;
  };

  // Simple avatar component
  const Avatar = ({ size = "md" }: { size?: "sm" | "md" }) => {
    const sizeClasses = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";

    return (
      <div className="flex-shrink-0">
        {sender.avatar ? (
          <img
            src={sender.avatar}
            alt={sender.name}
            className={`${sizeClasses} rounded-xl object-cover`}
          />
        ) : (
          <div
            className={`${sizeClasses} rounded-xl flex items-center justify-center font-medium ${
              isCurrentUser ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"
            }`}
          >
            {getInitials(sender.name)}
          </div>
        )}
      </div>
    );
  };

  // Attachment list
  const AttachmentList = () => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-200/30 space-y-1.5">
        {attachments.map((attachment, index) => (
          <a
            key={index}
            href={attachment.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isCurrentUser
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

  // Activity message (system/audit trail)
  if (type === "activity") {
    return (
      <div className="flex justify-center mb-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">{content}</span>
          <span className="text-xs text-gray-400">• {formatTime(timestamp)}</span>
        </div>
      </div>
    );
  }

  if (isCurrentUser) {
    // Right-aligned message (current user) - blue gradient
    return (
      <div className="flex justify-end gap-3 mb-6">
        <div className="flex flex-col items-end max-w-[75%]">
          {/* Type badge */}
          <div className="mb-2">{getTypeBadge()}</div>

          {/* Message bubble */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md px-5 py-4">
            <div
              className="text-sm prose prose-sm prose-invert max-w-none [&>p]:mb-0 [&>p:last-child]:mb-0"
              dangerouslySetInnerHTML={createMarkup(content)}
            />
            <AttachmentList />
          </div>

          {/* Timestamp */}
          <span className="text-xs text-gray-400 mt-2 mr-1">{formatTime(timestamp)}</span>
        </div>
        <Avatar />
      </div>
    );
  }

  // Left-aligned message (other users) - warm cream color
  return (
    <div className="flex justify-start gap-3 mb-6">
      <Avatar />

      <div className="flex flex-col items-start max-w-[75%]">
        {/* Type badge */}
        <div className="mb-2">{getTypeBadge()}</div>

        {/* Message bubble - warm cream/beige color */}
        <div className="bg-[#F5F0E8] rounded-2xl rounded-bl-md px-5 py-4">
          {/* Sender name */}
          <div className="text-xs text-gray-500 mb-2 font-medium">
            {sender.name}
          </div>

          {/* Content */}
          <div
            className="text-sm text-gray-800 prose prose-sm max-w-none [&>p]:mb-0 [&>p:last-child]:mb-0"
            dangerouslySetInnerHTML={createMarkup(content)}
          />
          <AttachmentList />
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 mt-2 ml-1">{formatTime(timestamp)}</span>
      </div>
    </div>
  );
};

export default ChatMessage;
