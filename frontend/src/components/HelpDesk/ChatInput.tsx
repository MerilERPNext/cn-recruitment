import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Paperclip, Send, X, Loader2, Mail, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import tippy, { Instance as TippyInstance } from "tippy.js";
import toast from "react-hot-toast";
import { useMentionUsers, MentionUser } from "../../hooks/useHelpDeskTickets";

interface UploadedFile {
  file_url: string;
  file_name: string;
}

export type InputMode = "reply" | "comment";

interface ChatInputProps {
  onSend: (message: string, attachments: UploadedFile[], mode: InputMode, emailOptions?: EmailOptions) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  isSending?: boolean;
  recipientEmail?: string;
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

export interface EmailOptions {
  to: string;
  cc?: string;
  bcc?: string;
}

// Mention suggestion component
interface MentionListProps {
  items: MentionUser[];
  command: (props: { id: string; label: string }) => void;
}

const MentionList = React.forwardRef<HTMLDivElement, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.email, label: item.full_name || item.name });
      }
    };

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % items.length);
        } else if (event.key === "Enter") {
          event.preventDefault();
          selectItem(selectedIndex);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [items, selectedIndex]);

    if (items.length === 0) {
      return (
        <div ref={ref} className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-sm text-gray-500">
          No users found
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto"
      >
        {items.map((item, index) => (
          <button
            key={item.name}
            onClick={() => selectItem(index)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              index === selectedIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            {item.user_image ? (
              <img src={item.user_image} alt="" className="w-6 h-6 rounded-lg object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                {(item.full_name || item.name).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{item.full_name || item.name}</div>
              <div className="text-xs text-gray-500 truncate">{item.email}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = "MentionList";

// Get CSRF token from cookie
const getCSRFToken = (): string => {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "csrf_token") {
      return decodeURIComponent(value);
    }
  }
  return "";
};

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  placeholder,
  disabled = false,
  isSending = false,
  recipientEmail = "",
  mode,
  onModeChange,
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

  // Fetch users for @mentions
  const { data: mentionUsers = [], isLoading: usersLoading } = useMentionUsers();

  // Store users in a ref to access latest value in suggestion config
  const usersRef = useRef<MentionUser[]>([]);
  useEffect(() => {
    usersRef.current = mentionUsers;
  }, [mentionUsers]);

  // TipTap mention suggestion configuration - uses ref to get latest users
  const suggestion = useMemo(
    () => ({
      items: ({ query }: { query: string }) => {
        const currentUsers = usersRef.current;
        if (!currentUsers || currentUsers.length === 0) {
          return [];
        }
        return currentUsers
          .filter((user) =>
            (user.full_name || user.name || user.email)
              .toLowerCase()
              .includes(query.toLowerCase())
          )
          .slice(0, 8);
      },
      render: () => {
        let component: ReactRenderer | null = null;
        let popup: TippyInstance[] | null = null;

        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStart: (props: any) => {
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            });

            if (!props.clientRect) return;

            popup = tippy("body", {
              getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onUpdate: (props: any) => {
            component?.updateProps(props);

            if (!props.clientRect) return;

            popup?.[0]?.setProps({
              getReferenceClientRect: () => props.clientRect?.() || new DOMRect(),
            });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onKeyDown: (props: any) => {
            if (props.event.key === "Escape") {
              popup?.[0]?.hide();
              return true;
            }
            return false;
          },
          onExit: () => {
            popup?.[0]?.destroy();
            component?.destroy();
          },
        };
      },
    }),
    [] // Empty dependency - uses ref for users
  );

  // TipTap editor for comment mode
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: usersLoading
          ? "Loading users..."
          : "Type your comment here... Use @ to mention someone",
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[60px] px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      // Keep message state in sync for comment mode
      if (mode === "comment") {
        setMessage(editor.getHTML());
      }
    },
  });

  // Update editor placeholder when mode changes
  useEffect(() => {
    if (editor && mode === "comment") {
      editor.commands.focus();
    }
  }, [editor, mode]);

  // Auto-resize textarea for reply mode
  useEffect(() => {
    if (mode === "reply") {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
      }
    }
  }, [message, mode]);

  // Handle file upload with CSRF token
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("is_private", "1");

        // Get CSRF token
        const csrfToken = getCSRFToken();

        // If no CSRF token, try using credentials-only approach
        const headers: HeadersInit = csrfToken
          ? { "X-Frappe-CSRF-Token": csrfToken }
          : {};

        const response = await fetch("/api/method/upload_file", {
          method: "POST",
          body: formData,
          headers,
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Upload error:", errorText);
          throw new Error("Upload failed");
        }

        const result = await response.json();
        if (result.message) {
          setAttachments((prev) => [
            ...prev,
            {
              file_url: result.message.file_url,
              file_name: result.message.file_name,
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

  // Get message content based on mode
  const getMessageContent = useCallback(() => {
    if (mode === "comment" && editor) {
      return editor.getHTML();
    }
    return message;
  }, [mode, editor, message]);

  // Handle send
  const handleSend = useCallback(async () => {
    const content = getMessageContent();
    const trimmedMessage = content.replace(/<[^>]*>/g, "").trim();

    if (!trimmedMessage && attachments.length === 0) return;
    if (disabled || isSending) return;

    // Validate To recipient for email mode
    if (mode === "reply" && !toRecipient.trim()) {
      toast.error("Please enter a recipient email");
      return;
    }

    try {
      const emailOptions: EmailOptions | undefined = mode === "reply" ? {
        to: toRecipient.trim(),
        cc: ccRecipients.trim() || undefined,
        bcc: bccRecipients.trim() || undefined,
      } : undefined;

      await onSend(content, attachments, mode, emailOptions);
      setMessage("");
      setAttachments([]);
      if (editor) {
        editor.commands.clearContent();
      }
      // Reset CC/BCC after sending
      setCcRecipients("");
      setBccRecipients("");
      setShowCcBcc(false);
    } catch {
      // Error handling is done in parent component
    }
  }, [getMessageContent, attachments, onSend, disabled, isSending, mode, editor, toRecipient, ccRecipients, bccRecipients]);

  // Handle keyboard shortcuts for textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || isSending || isUploading;
  const currentMessage = mode === "comment" && editor ? editor.getText() : message;
  const canSend = (currentMessage.trim() || attachments.length > 0) && !isDisabled;

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100">
        <button
          type="button"
          onClick={() => onModeChange("reply")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "reply"
              ? "bg-blue-500 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Mail className="w-4 h-4" />
          Reply
        </button>
        <button
          type="button"
          onClick={() => onModeChange("comment")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "comment"
              ? "bg-blue-500 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Comment
        </button>
        {mode === "comment" && (
          <span className="text-xs text-gray-400 ml-2">
            {usersLoading ? "Loading users..." : `${mentionUsers.length} users available for @mention`}
          </span>
        )}
      </div>

      {/* Email Recipients (Reply mode only) */}
      {mode === "reply" && (
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

          {/* Editor / Textarea */}
          <div className="flex-1 relative">
            {mode === "comment" ? (
              <div className="border border-gray-300 rounded-xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500">
                <EditorContent editor={editor} />
              </div>
            ) : (
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
            )}
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
          {mode === "comment"
            ? "Use @ to mention someone. Press enter to send."
            : "Press enter to send, shift + enter for new line"}
        </p>
      </div>

      {/* Styles for mentions */}
      <style>{`
        .mention {
          background-color: #dbeafe;
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
          font-weight: 500;
          color: #1d4ed8;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #9ca3af;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default ChatInput;
