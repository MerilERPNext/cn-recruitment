import DOMPurify from "dompurify";

/**
 * Sanitizes any API string (HTML or plain text)
 * and returns safe, clean plain text.
 */
export const sanitizeToPlainText = (
  value: string | null | undefined
): string => {
  if (!value) return "";

  // 1️⃣ Sanitize input (removes scripts, unsafe HTML)
  const sanitizedHTML = DOMPurify.sanitize(value);

  // 2️⃣ Convert sanitized HTML → plain text
  const temp = document.createElement("div");
  temp.innerHTML = sanitizedHTML;

  return temp.textContent || temp.innerText || "";
};

export const truncateByChars = (text: string, maxChars = 40) => {
  if (!text) return "";
  return text.length > maxChars
    ? text.slice(0, maxChars) + "…"
    : text;
};
