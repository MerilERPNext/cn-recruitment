const formatToIndianDate = (dateString?: string): string => {
    if (!dateString) return "N/A"; // show N/A if no value
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A"; // handle invalid date
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  
  export default formatToIndianDate;