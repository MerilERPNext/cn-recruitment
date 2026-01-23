import { format, isValid, parse } from "date-fns";

const formatToIndianDate = (dateInput: string | number | Date): string => {
  if (!dateInput) {
    return "";
  }

  try {
    let date: Date;

    // Handle if input is already a Date object
    if (dateInput instanceof Date) {
      date = dateInput;
    }
    // Handle timestamp (number)
    else if (typeof dateInput === "number") {
      date = new Date(dateInput);
    }
    // Handle string inputs
    else {
      const dateStr = dateInput.trim();

      // Try to parse ISO format or standard date strings
      date = new Date(dateStr);

      // If invalid, try to parse common formats manually
      if (isNaN(date.getTime())) {
        // Try dd-MM-yyyy or dd/MM/yyyy
        const ddMMyyyyPattern = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
        const ddMMyyyyMatch = dateStr.match(ddMMyyyyPattern);

        if (ddMMyyyyMatch) {
          const [, day, month, year] = ddMMyyyyMatch;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        // Try yyyy-MM-dd or yyyy/MM/dd
        else {
          const yyyyMMddPattern = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
          const yyyyMMddMatch = dateStr.match(yyyyMMddPattern);

          if (yyyyMMddMatch) {
            const [, year, month, day] = yyyyMMddMatch;
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
          // Try MM/dd/yyyy
          else {
            const mmDDyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
            const mmDDyyyyMatch = dateStr.match(mmDDyyyyPattern);

            if (mmDDyyyyMatch) {
              const [, month, day, year] = mmDDyyyyMatch;
              date = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
              );
            } else {
              throw new Error("Invalid date format");
            }
          }
        }
      }
    }

    // Validate the date
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    // Format to dd-MM-yyyy
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  } catch (error) {
    return "";
  }
};

export default formatToIndianDate;

const formatEndDate = (endDate: string | null | undefined) => {
  if (!endDate) return "Present";
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

export function formatDateDDMonthYYYY(dateString: string) {
  const date = new Date(dateString);

  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}
export { formatEndDate, formatDashedDate };
