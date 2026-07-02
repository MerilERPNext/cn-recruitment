import React from "react";
import { Mail, MessageSquare, FileText, Activity } from "lucide-react";
import { FilePreviewModal } from "../shared/molecules/FilePreviewModal";
import { FileTypeIcon, getFileTypeInfo } from "../../utils/fileUtils";

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
  const [previewFile, setPreviewFile] = React.useState<{ url: string; name: string } | null>(null);

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
    const sizeClasses = size === "sm" ? "w-8 h-8 text-xs" : "w-9 h-9 text-sm";

    return (
      <div className="flex-shrink-0">
        {sender.avatar ? (
          <img
            src={sender.avatar}
            alt={sender.name}
            className={`${sizeClasses} rounded-full object-cover ring-2 ring-white shadow-sm`}
          />
        ) : (
          <div
            className={`${sizeClasses} rounded-full flex items-center justify-center font-semibold shadow-sm ${isCurrentUser ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
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
      <div className={`mt-3 pt-3 border-t flex flex-wrap gap-2 ${isCurrentUser ? "border-white/20" : "border-gray-100"}`}>
        {attachments.map((attachment, index) => {
          const { category, iconColor, bgColor } = getFileTypeInfo(attachment.file_name);
          return (
            <button
              key={index}
              onClick={() => setPreviewFile({ url: attachment.file_url, name: attachment.file_name })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border shadow-sm ${
                isCurrentUser
                  ? "bg-white/15 border-white/20 text-white hover:bg-white/25"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center ${bgColor}`}>
                <FileTypeIcon category={category} className={`w-3.5 h-3.5 ${iconColor}`} />
              </div>
              <span className={`truncate max-w-[150px] font-medium ${isCurrentUser ? "text-white" : "text-gray-700"}`}>
                {attachment.file_name}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor && anchor.href) {
      const fileName = anchor.textContent || anchor.href.split("/").pop() || "File";
      const { category } = getFileTypeInfo(fileName);
      // If it's a previewable file, intercept and show modal
      if (category !== "unknown") {
        e.preventDefault();
        setPreviewFile({ url: anchor.href, name: fileName });
      }
    }
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
    // Right-aligned message (current user) - blue solid
    return (
      <div className="flex justify-end items-end gap-2.5 mb-5">
        <div className="flex flex-col items-end max-w-[75%]">
          {/* Type badge */}
          <div className="mb-2">{getTypeBadge()}</div>

          {/* Message bubble */}
          <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm shadow-blue-200">
            <div
              onClick={handleContentClick}
              className="text-sm prose prose-sm prose-invert max-w-none [&>p]:mb-0 [&>p:last-child]:mb-0 cursor-pointer leading-relaxed"
              dangerouslySetInnerHTML={createMarkup(content)}
            />
            <AttachmentList />
          </div>

          {/* Timestamp */}
          <span className="text-[11px] text-gray-400 mt-1.5 mr-1">{formatTime(timestamp)}</span>
        </div>
        <Avatar />
      </div>
    );
  }

  // Left-aligned message (other users) - clean white with shadow
  return (
    <div className="flex justify-start items-end gap-2.5 mb-5">
      <Avatar />

      <div className="flex flex-col items-start max-w-[75%]">
        {/* Type badge */}
        <div className="mb-2">{getTypeBadge()}</div>

        {/* Message bubble - white with subtle shadow */}
        <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
          {/* Sender name */}
          <div className="text-[11px] text-gray-400 mb-1.5 font-medium tracking-wide">
            {sender.name}
          </div>

          {/* Content */}
          <div
            onClick={handleContentClick}
            className="text-sm text-gray-800 prose prose-sm max-w-none [&>p]:mb-0 [&>p:last-child]:mb-0 cursor-pointer leading-relaxed"
            dangerouslySetInnerHTML={createMarkup(content)}
          />
          <AttachmentList />
        </div>

        {/* Timestamp */}
        <span className="text-[11px] text-gray-400 mt-1.5 ml-1">{formatTime(timestamp)}</span>
      </div>
      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default ChatMessage;
