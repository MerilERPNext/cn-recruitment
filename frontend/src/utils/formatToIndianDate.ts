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
