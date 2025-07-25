import * as React from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

type Holiday = {
    name: string;
    date: string;
    optional?: boolean;
};

const regularHolidays: Holiday[] = [
    { name: "Christmas Day", date: "2025-12-25" },
    { name: "New Year’s Day", date: "2025-01-01" },
    { name: "Independence Day", date: "2025-07-04" },
    { name: "Labor Day", date: "2025-09-01" },
];

const optionalHolidays: Holiday[] = [
    { name: "Good Friday", date: "2025-04-18", optional: true },
    { name: "Assumption of Mary", date: "2025-08-15", optional: true },
    { name: "All Saints’ Day", date: "2025-11-01", optional: true },
    { name: "Immaculate Conception", date: "2025-12-08", optional: true },
];

const HolidayCard: React.FC<{ holiday: Holiday }> = ({ holiday }) => {
    const dateObj = new Date(holiday.date);
    const month = format(dateObj, "MMM").toUpperCase();
    const day = format(dateObj, "dd");
    const weekday = format(dateObj, "EEEE");

    return (
        <div className="flex items-center gap-3 bg-white shadow-sm rounded-xl p-2 mb-2">
            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-semibold text-xs">
                <span className="uppercase leading-none">{month}</span>
                <span className="text-md">{day}</span>
            </div>
            <div className="flex flex-col">
                <span className="font-medium text-gray-900">{holiday.name}</span>
                <span className="text-blue-700 text-sm">{weekday}</span>
            </div>
        </div>
    );
};

const Holidays: React.FC = () => {
    const navigate = useNavigate();
    const [showAllRegular, setShowAllRegular] = React.useState(false);
    const [showAllOptional, setShowAllOptional] = React.useState(false);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingRegularHolidays = React.useMemo(() => {
        return regularHolidays
            .filter(holiday => new Date(holiday.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, []);

    const upcomingOptionalHolidays = React.useMemo(() => {
        return optionalHolidays
            .filter(holiday => new Date(holiday.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, []);

    const displayedRegular = showAllRegular ? upcomingRegularHolidays : upcomingRegularHolidays.slice(0, 3);
    const displayedOptional = showAllOptional ? upcomingOptionalHolidays : upcomingOptionalHolidays.slice(0, 3);

    return (
        <div className="p-4 bg-gray-50 min-h-full pb-24">
            <section className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Upcoming Regular Holidays</h2>
                {upcomingRegularHolidays.length > 0 ? (
                    <>
                        {displayedRegular.map((holiday) => (
                            <HolidayCard key={`${holiday.date}-${holiday.name}`} holiday={holiday} />
                        ))}
                        {upcomingRegularHolidays.length > 3 && (
                            <button
                                onClick={() => setShowAllRegular(!showAllRegular)}
                                className="w-full bg-black text-white py-2 my-2 rounded-lg font-medium"
                            >
                                {showAllRegular ? "View Less" : `View More (${upcomingRegularHolidays.length - 3} more)`}
                            </button>
                        )}
                        <button
                            onClick={() => navigate("/webapp/leave-app/leaves/holidays/all")}
                            className="w-full bg-black text-white py-2 my-2 rounded-lg font-medium"
                        >
                            View More
                        </button>
                    </>
                ) : (
                    <p className="text-gray-500 text-center py-4">No upcoming regular holidays</p>
                )}
            </section>

            <section>
                <h2 className="text-lg font-semibold mb-4">Upcoming Optional Holidays</h2>
                {upcomingOptionalHolidays.length > 0 ? (
                    <>
                        {displayedOptional.map((holiday) => (
                            <HolidayCard key={`${holiday.date}-${holiday.name}`} holiday={holiday} />
                        ))}
                        {upcomingOptionalHolidays.length > 3 && (
                            <button
                                onClick={() => setShowAllOptional(!showAllOptional)}
                                className="w-full bg-black text-white py-2 my-2 rounded-lg font-medium"
                            >
                                {showAllOptional ? "View Less" : `View More (${upcomingOptionalHolidays.length - 3} more)`}
                            </button>
                        )}
                        <button
                            onClick={() => navigate("/webapp/leave-app/leaves/holidays/all")}
                            className="w-full bg-black text-white py-2 my-2 rounded-lg font-medium"
                        >
                            View More
                        </button>
                    </>
                ) : (
                    <p className="text-gray-500 text-center py-4">No upcoming optional holidays</p>
                )}
            </section>
        </div>
    );
};

export default Holidays;
