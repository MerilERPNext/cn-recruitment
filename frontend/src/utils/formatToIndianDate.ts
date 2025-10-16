import { format, isValid, parse } from "date-fns";

const formatToIndianDate = (dateString?: string): string => {
  if (!dateString) return "N/A"; // show N/A if no value
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A"; // handle invalid date
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default formatToIndianDate;

const formatEndDate = (endDate: string | null | undefined) => {
  if (!endDate) return "Present"; // ✅ Show Present if end date is missing
  return formatToIndianDate(endDate);
};

const formatDashedDate = (date: string): string => {
  if (!date) return "--/--/----";

  const possibleFormats = ["dd-MM-yyyy", "yyyy-MM-dd"];

  for (const dateFormat of possibleFormats) {
    const parsedDate = parse(date, dateFormat, new Date());
    if (isValid(parsedDate)) {
      return format(parsedDate, "dd/MM/yyyy");
    }
  }

  return "--/--/----";
};

export { formatEndDate, formatDashedDate };
