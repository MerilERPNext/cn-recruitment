const getShiftStatus = (startDate: string, endDate?: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    let end: Date | null = null;
    if (endDate) {
      end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
    }

    if (!end) {
      if (today >= start) return "Current";
      return "Upcoming";
    }

    if (today < start) return "Upcoming";
    if (today > end) return "Previous";
    return "Current";
  };
  
  export default getShiftStatus;