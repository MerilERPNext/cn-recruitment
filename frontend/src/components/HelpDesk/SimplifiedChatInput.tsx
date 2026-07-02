import React, { useState, useRef, useCallback, useEffect } from "react";
import { Paperclip, Send, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import FrappeAPI from "../../utils/frappeAPI";
import { useScreenSize } from "../../hooks/useScreenSize";

interface UploadedFile {
  file_url: string;
  file_name: string;
}

interface ReplyingTo {
  id: string;
  content: string;
  senderName: string;
}

interface SimplifiedChatInputProps {
  onSend: (message: string, attachments: UploadedFile[]) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  isSending?: boolean;
  replyingTo?: ReplyingTo | null;
  onCancelReply?: () => void;
}

const SimplifiedChatInput: React.FC<SimplifiedChatInputProps> = ({
  onSend,
  placeholder = "Type your reply here.....",
  disabled = false,
  isSending = false,
  replyingTo = null,
  onCancelReply,
}) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDesktop } = useScreenSize();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Handle file upload using FrappeAPI
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await FrappeAPI.uploadFile(file, file.name, undefined, undefined, undefined, "1");
        if (result) {
          setAttachments((prev) => [
            ...prev,
            {
              file_url: result.file_url,
              file_name: result.file_name || file.name,
            },
          ]);
        }
      }
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle send
  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage && attachments.length === 0) return;
    if (disabled || isSending) return;

    try {
      await onSend(message, attachments);
      setMessage("");
      setAttachments([]);
    } catch {
      // Error handling is done in parent component
    }
  }, [message, attachments, onSend, disabled, isSending]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && isDesktop) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || isSending || isUploading;
  const canSend = (message.trim() || attachments.length > 0) && !isDisabled;

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex-1 border-l-4 border-blue-500 pl-3">
            <div className="text-xs font-medium text-gray-500">{replyingTo.senderName}</div>
            <div
              className="text-sm text-gray-700 truncate max-w-md"
              dangerouslySetInnerHTML={{ __html: replyingTo.content }}
            />
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-sm border border-gray-200"
            >
              <Paperclip className="w-3 h-3 text-gray-500" />
              <span className="truncate max-w-[150px]">{file.file_name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Attachment button */}
          <div className="flex items-center border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 overflow-hidden w-full pl-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDisabled}
              className="flex-shrink-0 flex items-center justify-center sm:p-2.5 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />

            {/* Text input */}
            <div className="flex-1 flex">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isDisabled}
                rows={1}
                className="w-full px-2 py-3 text-sm resize-none focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                style={{ maxHeight: "150px" }}
              />
            </div>
          </div>
          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="flex-shrink-0 p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Helper text */}
        <p className="hidden md:block text-xs text-gray-400 sm:mt-2 ml-12">
          Press enter to send, shift + enter for new line
        </p>
      </div>
    </div>
  );
};

export default SimplifiedChatInput;
