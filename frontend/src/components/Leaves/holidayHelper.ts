import { Holiday, HolidayGroup } from "../../types/leaves";

export interface ProcessedHolidays {
  upcomingRegular: Holiday[];
  upcomingOptional: Holiday[];
  allRegular: Holiday[];
  allOptional: Holiday[];
  optionalStats: { total: number; availed: number; remaining: number };
}

export function processHolidays(
  holidaysData: HolidayGroup[] | undefined,
  today: Date
): ProcessedHolidays {
  if (!holidaysData || !Array.isArray(holidaysData)) {
    return {
      upcomingRegular: [],
      upcomingOptional: [],
      allRegular: [],
      allOptional: [],
      optionalStats: { total: 0, availed: 0, remaining: 0 },
    };
  }

  const regularHolidays: Holiday[] = [];
  const optionalHolidays: Holiday[] = [];
  const allRegularHolidays: Holiday[] = [];
  const allOptionalHolidays: Holiday[] = [];
  let totalOptional = 0;
  const availedOptional = 0;

  holidaysData.forEach((group) => {
    if (!group.holidays || !Array.isArray(group.holidays)) return;

    group.holidays.forEach((holiday) => {
      const holidayDate = new Date(holiday.date);

      if (group.type_name === "Optional") {
        allOptionalHolidays.push({ ...holiday, optional: true });
        if (holidayDate >= today) {
          optionalHolidays.push({ ...holiday, optional: true });
        }
        totalOptional++;
      } else if (
        group.type_name === "Mandatory" ||
        group.type_name === "National Holiday"
      ) {
        allRegularHolidays.push({ ...holiday, optional: false });
        if (holidayDate >= today) {
          regularHolidays.push({ ...holiday, optional: false });
        }
      }
    });
  });

  const sortByDate = (a: Holiday, b: Holiday) =>
    new Date(a.date).getTime() - new Date(b.date).getTime();

  return {
    upcomingRegular: regularHolidays.sort(sortByDate),
    upcomingOptional: optionalHolidays.sort(sortByDate),
    allRegular: allRegularHolidays.sort(sortByDate),
    allOptional: allOptionalHolidays.sort(sortByDate),
    optionalStats: {
      total: totalOptional,
      availed: availedOptional,
      remaining: totalOptional - availedOptional,
    },
  };
}
