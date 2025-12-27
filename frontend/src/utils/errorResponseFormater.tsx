import DOMPurify from "dompurify";

export const errorResponseFormater = (
  error: any,
  fallback = "Something went wrong, please try again."
) => {
  let err = null;

  if (!error) {
    return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(fallback) }} />;
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
  return <span className="text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(err) }} />;
};