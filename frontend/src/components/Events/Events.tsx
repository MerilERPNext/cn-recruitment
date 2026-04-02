import { useState, useMemo } from "react";
import { useGetAllEmployees } from "../../hooks/useEmployee";
import { format } from "date-fns";
import Badge from "../shared/Badge";
import Tooltip from "../shared/Tooltip";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";

const Events = () => {
  const { data = [], isLoading } = useGetAllEmployees(
    ["date_of_birth", "employee_name", "image", "date_of_joining"],
    19999,
    [["status", "=", "Active"]],
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
        a.date_of_birth
          .slice(5, 10)
          .localeCompare(b.date_of_birth.slice(5, 10)),
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
        a.date_of_joining
          .slice(5, 10)
          .localeCompare(b.date_of_joining.slice(5, 10)),
      );
  }, [data, currentMonth, nextMonth, todayMD]);

  const isBirthdayTab = activeTab === "Birthdays";
  const events = isBirthdayTab ? birthdays : anniversaries;

  const tabs = ["Birthdays", "Anniversaries"];

  return (
    <Card
      shadow="sm"
      className="h-full flex flex-col max-h-[16.5rem] min-h-[16.5rem]"
    >
      {/* Header */}
      <div className=" bg-white rounded-t-lg flex justify-between items-center w-full">
        <Typography variant="subheading" color="title">
          Events
        </Typography>
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="focus:outline-none"
              >
                <Badge
                  label={tab}
                  size="sm"
                  backgroundColor={
                    activeTab === tab
                      ? tab === "Birthdays"
                        ? "bg-blue-100"
                        : "bg-success-100"
                      : "bg-gray-100"
                  }
                  textColor={
                    activeTab === tab
                      ? tab === "Birthdays"
                        ? "text-blue-700"
                        : "text-success"
                      : "text-gray-700"
                  }
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="flex flex-col gap-3">
          {/* Events List */}
          <div className="space-y-3">
            {isLoading ? (
              <CardSkeleton rows={2} />
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 opacity-60">
                <Typography variant="bodySmall">
                  No upcoming {activeTab.toLowerCase()}.
                </Typography>
              </div>
            ) : (
              events.map((employee, index) => {
                const baseDate = isBirthdayTab
                  ? new Date(employee.date_of_birth)
                  : new Date(employee.date_of_joining);

                const displayDate = new Date(
                  now.getFullYear(),
                  baseDate.getMonth(),
                  baseDate.getDate(),
                );

                return (
                  <Card
                    shadow="sm"
                    radius="none"
                    key={`${employee.employee_name}-${index}`}
                    className="flex items-center justify-between gap-3 bg-blue-4 py-2 px-2 hover-lift transition-all group"
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
                        <Tooltip content={employee.employee_name}>
                          <Typography
                            variant="bodySmall"
                            className="font-medium line-clamp-1"
                          >
                            {employee.employee_name.slice(0, 16)}
                            {employee.employee_name.length > 16 ? "..." : ""}
                          </Typography>
                        </Tooltip>
                      </div>
                    </div>

                    <Badge
                      size="sm"
                      label={`${isBirthdayTab ? "Birthday" : "Anniversary"
                        }: ${format(displayDate, "dd MMM")}`}
                      backgroundColor={
                        isBirthdayTab ? "bg-blue-100" : "bg-success-100"
                      }
                      textColor={
                        isBirthdayTab ? "text-blue-700" : "text-success"
                      }
                    />
                  </Card>
                );
              })
            )}

            { }
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Events;
