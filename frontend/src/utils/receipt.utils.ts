/* eslint-disable @typescript-eslint/no-explicit-any */
export const fileToBase64Content = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() || "" : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const getLocalReceiptFile = (attachment: any): File | null => {
  const file = attachment?.file || attachment;
  return file instanceof File ? file : null;
};

export const getReceiptFileFingerprint = (file: File) =>
  [file.name, file.size, file.lastModified].join(":");

export const isBlankExpenseValue = (value: unknown) => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
};
