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
        <div className="flex items-center gap-3 bg-white shadow-sm rounded-xl p-3 mb-2">
            {/* Date Badge */}
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-blue-50 text-blue-600 font-semibold text-xs">
                <span className="uppercase leading-none">{month}</span>
                <span className="text-lg">{day}</span>
            </div>
            {/* Details */}
            <div className="flex flex-col">
                <span className="font-medium text-gray-900">{holiday.name}</span>
                <span className="text-gray-500 text-sm">{weekday}</span>
            </div>
        </div>
    );
};

const Holidays: React.FC = () => {
    const navigate = useNavigate();
    const [showAllRegular, setShowAllRegular] = React.useState(false);
    const [showAllOptional, setShowAllOptional] = React.useState(false);

    const displayedRegular = showAllRegular ? regularHolidays : regularHolidays.slice(0, 2);
    const displayedOptional = showAllOptional ? optionalHolidays : optionalHolidays.slice(0, 2);

    return (
        <div className="p-4 bg-gray-50 min-h-full pb-24">
            {/* Regular Holidays */}
            <section className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Regular Holidays</h2>
                {displayedRegular.map((holiday) => (
                    <HolidayCard key={holiday.date} holiday={holiday} />
                ))}
                {regularHolidays.length > 2 && (
                    <button
                        onClick={() => {
                            navigate("/webapp/leave-app/leaves/holidays/all");
                            setShowAllRegular(!showAllRegular);
                        }}
                        className="w-full bg-black text-white py-3 my-2 rounded-lg font-medium"
                    >
                        {showAllRegular ? "View Less" : "View More"}
                    </button>
                )}
            </section>


            <section>
                <h2 className="text-lg font-semibold mb-4">Optional Holidays</h2>
                {displayedOptional.map((holiday) => (
                    <HolidayCard key={holiday.date} holiday={holiday} />
                ))}
                {optionalHolidays.length > 2 && (
                    <button
                        onClick={() => {
                            navigate("/webapp/leave-app/leaves/holidays/all");
                            setShowAllOptional(!showAllOptional);
                        }}
                        className="w-full bg-black text-white py-3 my-2 rounded-lg font-medium"
                    >
                        {showAllOptional ? "View Less" : "View More"}
                    </button>
                )}
            </section>
        </div>
    );
};

export default Holidays;
