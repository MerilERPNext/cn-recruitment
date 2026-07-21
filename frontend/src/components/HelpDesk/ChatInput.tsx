import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Send, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import FrappeAPI from "../../utils/frappeAPI";

interface UploadedFile {
  file_url: string;
  file_name: string;
}

interface ChatInputProps {
  onSend: (message: string, attachments: UploadedFile[], emailOptions: EmailOptions) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  isSending?: boolean;
  recipientEmail?: string;
}

export interface EmailOptions {
  to: string;
  cc?: string;
  bcc?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  placeholder,
  disabled = false,
  isSending = false,
  recipientEmail = "",
}) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Email fields
  const [toRecipient, setToRecipient] = useState(recipientEmail);
  const [ccRecipients, setCcRecipients] = useState("");
  const [bccRecipients, setBccRecipients] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update To recipient when prop changes
  useEffect(() => {
    setToRecipient(recipientEmail);
  }, [recipientEmail]);

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
  const handleSend = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage && attachments.length === 0) return;
    if (disabled || isSending) return;

    // Validate To recipient
    if (!toRecipient.trim()) {
      toast.error("Please enter a recipient email");
      return;
    }

    try {
      const emailOptions: EmailOptions = {
        to: toRecipient.trim(),
        cc: ccRecipients.trim() || undefined,
        bcc: bccRecipients.trim() || undefined,
      };

      await onSend(message, attachments, emailOptions);
      setMessage("");
      setAttachments([]);
      // Reset CC/BCC after sending
      setCcRecipients("");
      setBccRecipients("");
      setShowCcBcc(false);
    } catch {
      // Error handling is done in parent component
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || isSending || isUploading;
  const canSend = (message.trim() || attachments.length > 0) && !isDisabled;

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Email Recipients */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-2">
        {/* To Field */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 w-10">To:</span>
          <input
            type="email"
            value={toRecipient}
            onChange={(e) => setToRecipient(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 text-sm text-gray-700 bg-white px-3 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowCcBcc(!showCcBcc)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            {showCcBcc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            CC/BCC
          </button>
        </div>

        {/* CC/BCC Fields */}
        {showCcBcc && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 w-10">CC:</span>
              <input
                type="text"
                value={ccRecipients}
                onChange={(e) => setCcRecipients(e.target.value)}
                placeholder="cc@example.com, another@example.com"
                className="flex-1 text-sm text-gray-700 bg-white px-3 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 w-10">BCC:</span>
              <input
                type="text"
                value={bccRecipients}
                onChange={(e) => setBccRecipients(e.target.value)}
                placeholder="bcc@example.com"
                className="flex-1 text-sm text-gray-700 bg-white px-3 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          </>
        )}
      </div>

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
        <div className="flex items-end gap-3">
          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            className="flex-shrink-0 p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || "Type your reply here....."}
              disabled={isDisabled}
              rows={1}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              style={{ maxHeight: "150px" }}
            />
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
        <p className="text-xs text-gray-400 mt-2 ml-12">
          Press enter to send, shift + enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatInput;
