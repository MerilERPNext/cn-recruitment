import { useState, useMemo } from "react";
import { useGetAllEmployees } from "../../hooks/useEmployee";
import { format } from "date-fns";
import Badge from "../shared/Badge";

const Events = () => {
    const { data = [] } = useGetAllEmployees(
        ["date_of_birth", "employee_name", "image", "date_of_joining"],
        50
    );

    const [activeTab, setActiveTab] = useState("Birthdays");

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const nextMonth = (currentMonth % 12) + 1;
    const todayMD = now.toISOString().slice(5, 10);

    /* -------------------- Birthdays -------------------- */
    const birthdays = useMemo(() => {
        return data
            .filter((emp) => {
                if (!emp.date_of_birth) return false;

                const month = Number(emp.date_of_birth.slice(5, 7));
                const md = emp.date_of_birth.slice(5, 10);

                if (month !== currentMonth && month !== nextMonth) return false;
                if (month === currentMonth && md < todayMD) return false;

                return true;
            })
            .sort((a, b) =>
                a.date_of_birth.slice(5, 10).localeCompare(
                    b.date_of_birth.slice(5, 10)
                )
            );
    }, [data, currentMonth, nextMonth, todayMD]);

    /* -------------------- Anniversaries -------------------- */
    const anniversaries = useMemo(() => {
        return data
            .filter((emp) => {
                if (!emp.date_of_joining) return false;

                const month = Number(emp.date_of_joining.slice(5, 7));
                const md = emp.date_of_joining.slice(5, 10);

                if (month !== currentMonth && month !== nextMonth) return false;
                if (month === currentMonth && md < todayMD) return false;

                return true;
            })
            .sort((a, b) =>
                a.date_of_joining.slice(5, 10).localeCompare(
                    b.date_of_joining.slice(5, 10)
                )
            );
    }, [data, currentMonth, nextMonth, todayMD]);

    const isBirthdayTab = activeTab === "Birthdays";
    const events = isBirthdayTab ? birthdays : anniversaries;

    const tabs = ["Birthdays", "Anniversaries"];

    return (
        <div className="bg-white rounded-lg shadow-sm max-h-[16.5rem] min-h-[16.5rem] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-2 flex justify-between w-full rounded-lg">
                <h3 className="section-title mb-0 text-left">Events</h3>
                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                        >
                            <Badge
                                label={tab}
                                size="sm"
                                backgroundColor={
                                    activeTab === tab
                                        ? tab === "Birthdays"
                                            ? "bg-blue-100"
                                            : "bg-emerald-100"
                                        : "bg-gray-100"
                                }
                                textColor={
                                    activeTab === tab
                                        ? tab === "Birthdays"
                                            ? "text-blue-700"
                                            : "text-emerald-700"
                                        : "text-gray-700"
                                }
                            />
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto px-4 py-3">

                <div className="flex flex-col gap-3">


                    {/* Events List */}
                    <div className="space-y-3">
                        {events.length === 0 && (
                            <p className="text-gray-500 text-center py-4">
                                No upcoming {activeTab.toLowerCase()}.
                            </p>
                        )}

                        {events.map((employee, index) => {
                            const baseDate = isBirthdayTab
                                ? new Date(employee.date_of_birth)
                                : new Date(employee.date_of_joining);

                            const displayDate = new Date(
                                now.getFullYear(),
                                baseDate.getMonth(),
                                baseDate.getDate()
                            );

                            return (
                                <div
                                    key={`${employee.employee_name}-${index}`}
                                    className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg p-2"
                                >
                                    <div className="flex gap-2 items-center">
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
                                        <div className="flex leading-tight">
                                            <p className="text-sm text-gray-600 font-medium">
                                                {employee.employee_name}</p>
                                        </div>
                                    </div>

                                    <Badge
                                        size="sm"
                                        label={`${isBirthdayTab ? "Birthday" : "Anniversary"
                                            }: ${format(displayDate, "dd MMM")}`}
                                        backgroundColor={
                                            isBirthdayTab
                                                ? "bg-blue-100"
                                                : "bg-emerald-100"
                                        }
                                        textColor={
                                            isBirthdayTab
                                                ? "text-blue-700"
                                                : "text-emerald-700"
                                        }
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Events;
