const formatToIndianDate = (dateInput: string | number | Date): string => {
  if (!dateInput) return "";

  // ✅ If already in dd-MM-yyyy format, return as-is
  if (
    typeof dateInput === "string" &&
    /^(\d{2})-(\d{2})-(\d{4})$/.test(dateInput)
  ) {
    return dateInput;
  }

  try {
    let date: Date;

    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === "number") {
      date = new Date(dateInput);
    } else {
      date = new Date(dateInput);
    }

    if (isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  } catch {
    return "";
  }
};

export default formatToIndianDate;


export const formatToIndianDateWithTime = (
  dateInput: string | number | Date
): string => {
  if (!dateInput) return "";

  // ✅ If already in dd-MM-yyyy HH:mm:ss format, return as-is
  if (
    typeof dateInput === "string" &&
    /^(\d{2})-(\d{2})-(\d{4})( \d{2}:\d{2}:\d{2})?$/.test(dateInput)
  ) {
    return dateInput;
  }

  try {
    let date: Date;

    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === "number") {
      date = new Date(dateInput);
    } else {
      // ✅ Handle "2026-04-28 12:32:27.983001"
      // Convert to ISO-compatible format
      const normalized = dateInput.replace(" ", "T");

      date = new Date(normalized);
    }

    if (isNaN(date.getTime())) return "";

    // ✅ Convert to Indian timezone
    const indianDate = new Date(
      date.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })
    );

    const day = String(indianDate.getDate()).padStart(2, "0");
    const month = String(indianDate.getMonth() + 1).padStart(2, "0");
    const year = indianDate.getFullYear();

    const hours = String(indianDate.getHours()).padStart(2, "0");
    const minutes = String(indianDate.getMinutes()).padStart(2, "0");
    const seconds = String(indianDate.getSeconds()).padStart(2, "0");

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  } catch {
    return "";
  }
};

export const formatEndDate = (endDate: string | null | undefined) => {
  if (!endDate) return "Present";
  return formatToIndianDate(endDate);
};

export function formatDateDDMonthYYYY(dateString: string) {
  const date = new Date(dateString);

  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}
