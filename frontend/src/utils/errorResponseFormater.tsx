import DOMPurify from "dompurify";
import { toast } from "react-hot-toast";

interface ErrorResponseFormaterOptions {
  showToast?: boolean;
}

export const errorResponseFormater = (
  error: any,
  fallback = "Something went wrong, please try again.",
  options?: ErrorResponseFormaterOptions
) => {
  let err = null;

  if (!error) {
    return <div className="text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fallback) }} />;
  }

  // Show success_message and error_message toasts if showToast is enabled
  if (options?.showToast) {
    try {
      const messageData = error?.response?.data?.message;
      if (messageData && typeof messageData === "object") {
        if (messageData.error_message) {
          toast.error(
            <div className="text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(messageData.error_message) }} />
          );
        }
        if (messageData.success_message) {
          toast.success(
            <div className="text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(messageData.success_message) }} />
          );
        }
      }
    } catch {
      // non-fatal: toast display failure should not break error formatting
    }
  }

  try {
    const raw = error?.response?.data?._server_messages;

    if (raw) {
      const messages = JSON.parse(raw);

      if (Array.isArray(messages) && messages.length > 0) {
        const firstMessage = JSON.parse(messages[0]);
        if (firstMessage?.message) err = firstMessage.message;
      }
    }

    err = err || error?.response?.data?.exception
      ?.split(":")
      .slice(1)
      .join(":")
      .trim() || error?.response?.data?.message || error?.response?.data?.message?.error;
  } catch {
    console.error("Failed to parse error message:", error);
    err = fallback;
  }

  if (err == null) err = fallback;
  // ❗ Always return sanitized HTML ReactNode
  return <div className="text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(err) }} />;
};