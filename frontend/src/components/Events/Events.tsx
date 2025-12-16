import { useGetAllEmployees } from "../../hooks/useEmployee";
import { format } from "date-fns";
import Badge from "../shared/Badge";

const Events = () => {
    const { data } = useGetAllEmployees(
        ["date_of_birth", "employee_name", "image"],
        50
    );

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const nextMonth = (currentMonth % 12) + 1;
    const todayMD = now.toISOString().slice(5, 10);

    const upcomingBirthdays = data
        ?.filter((emp) => {
            const dobMonth = parseInt(emp.date_of_birth.slice(5, 7));
            const dobMD = emp.date_of_birth.slice(5, 10);

            if (dobMonth !== currentMonth && dobMonth !== nextMonth) return false;
            if (dobMonth === currentMonth && dobMD < todayMD) return false;

            return true;
        })
        .sort((a, b) =>
            a.date_of_birth.slice(5, 10).localeCompare(b.date_of_birth.slice(5, 10))
        );

    if (!upcomingBirthdays?.length) {
        return (
            <p className="text-gray-500 text-center py-4">
                No upcoming events.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="space-y-3">   {/* ← THIS GIVES BEAUTIFUL SPACING BETWEEN CARDS */}
                <div className="space-y-3">
                    {upcomingBirthdays.map((employee) => {
                        const dob = new Date(employee.date_of_birth);
                        const thisYearBirthday = new Date(
                            new Date().getFullYear(),
                            dob.getMonth(),
                            dob.getDate()
                        );
                        const ageTurning = new Date().getFullYear() - dob.getFullYear();

                        return (
                            <div
                                key={employee.name}
                                className="flex items-start justify-between gap-3 bg-white border border-gray-200 rounded-lg p-3"
                            >
                                <div className="flex gap-2">
                                    {/* Avatar */}
                                    {employee.image ? (
                                        <img
                                            src={employee.image}
                                            alt={employee.employee_name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg uppercase">
                                            {employee.employee_name.charAt(0)}
                                        </div>
                                    )}

                                    {/* Text */}
                                    <div className="flex flex-col leading-tight">
                                        <span className="font-medium text-gray-900">
                                            {employee.employee_name}
                                        </span>

                                        <span className="text-xs text-gray-500">
                                            Turns {ageTurning} years old
                                        </span>

                                    </div>
                                </div>

                                <Badge size="sm" label={`Birthday: ${format(thisYearBirthday, "dd MMM")}`} backgroundColor="bg-blue-100" textColor="text-blue-700" />
                            </div>
                        );
                    })}
                </div>

            </div>

        </div>
    );
};

export default Events;
