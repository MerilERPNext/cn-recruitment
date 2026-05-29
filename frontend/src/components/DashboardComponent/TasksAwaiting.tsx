import { ClipboardList } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useTodoList } from "../../hooks/useTodo";
import type { ToDo } from "../../services/todoService";
import { formatDateDDMonthYYYY } from "../../utils/formatToIndianDate";
import { sanitizeToPlainText } from "../../utils/sanitizeToPlainText";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { ViewAll } from "../shared/atoms/ViewAll";
import CustomDropdown from "../shared/CustomDropdown";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../shared/atoms/NoDataFound";

const MyToDoItem: React.FC<{ item: ToDo; index?: number }> = ({ item }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (item.custom_dynamic_route) {
      navigate(item.custom_dynamic_route);
    } else {
      navigate(`/webapp/todo-app#/${item.name}`);
    }
  };

  const cleanDescription = sanitizeToPlainText(item.description);

  return (
    <div
      key={item.name}
      className="flex cursor-pointer items-center justify-between rounded-xl border border-transparent hover-lift transition-all group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 min-w-[40px] min-h-[40px] flex-shrink-0 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div className="mr-2 min-w-0 flex-1">
          <Typography
            variant="bodySmall"
            className="font-medium block line-clamp-1"
          >
            {cleanDescription || "Task"}
          </Typography>

          <Typography variant="label" color="body2">
            {item.custom_due_datetime
              ? `Due on ${formatDateDDMonthYYYY(item.custom_due_datetime)}`
              : item.date
                ? `Due on ${formatDateDDMonthYYYY(item.date)}`
                : "No due date"}
          </Typography>
        </div>
      </div>
      <button
        onClick={handleClick}
        className="text-primary-600 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors whitespace-nowrap"
      >
        View task
      </button>
    </div>
  );
};

const TasksAwaiting: React.FC = () => {
  const { data: fullData = [], isLoading } = useTodoList();
  const [activeCategory, setActiveCategory] = useState("All");

  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();

  const handleTodoClick = () => navigate("/webapp/todo-app");

  const generatePastelColor = (index: number) => {
    const colors = [
      "bg-blue-100 text-blue-700 ring-blue-300",
      "bg-purple-100 text-purple-700 ring-purple-300",
      "bg-green-100 text-green-700 ring-green-300",
      "bg-pink-100 text-pink-700 ring-pink-300",
      "bg-yellow-100 text-yellow-700 ring-yellow-300",
      "bg-orange-100 text-orange-700 ring-orange-300",
      "bg-cyan-100 text-cyan-700 ring-cyan-300",
      "bg-red-100 text-red-700 ring-red-300",
    ];
    return colors[index % colors.length];
  };


  const filtered = useMemo(() => {
    if (activeCategory === "All") return fullData;

    if (activeCategory === "Uncategorized") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return fullData.filter((item: { custom_todo_type: any; }) => !item.custom_todo_type);
    }

    return fullData.filter((item: { custom_todo_type: string; }) => item.custom_todo_type === activeCategory);
  }, [activeCategory, fullData]);

  const categoryCounts = useMemo(() => {
    const grouped: Record<string, number> = {};

    fullData.forEach((item: { custom_todo_type: string; }) => {
      const cat = item.custom_todo_type || "Uncategorized";
      grouped[cat] = (grouped[cat] || 0) + 1;
    });

    return grouped;
  }, [fullData]);

  const totalCount = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  const filterOptions = useMemo(() => {
    const entries = Object.entries(categoryCounts);

    const sorted = [
      ...entries.filter(([cat]) => cat !== "Uncategorized"),
      ...entries.filter(([cat]) => cat === "Uncategorized"),
    ];

    return [
      { label: `All Tasks (${totalCount})`, value: "All" },
      ...sorted.map(([cat, count]) => ({
        label: `${cat} (${count})`,
        value: cat,
      })),
    ];
  }, [categoryCounts, totalCount]);

  return (
    <Card shadow="sm" className="h-fit md:h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <Typography variant="subheading" color="title">
          Tasks Awaiting You
        </Typography>
        <ViewAll title="View to-do" onClick={handleTodoClick} />
      </div>

      {/* Mobile Filter Dropdown */}
      {!isDesktop && (
        <div className="block mb-4 w-full">
          <CustomDropdown
            value={activeCategory}
            options={filterOptions}
            onChange={(e) => setActiveCategory(e.target.value)}
            label="All"
            variant="soft"
            className="w-full [&>button]:w-full [&>button]:justify-between"
          />
        </div>
      )}

      {isDesktop && !isLoading && totalCount > 0 && (
        <div className="flex gap-3 mb-4 p-2 max-w-full overflow-x-auto">
          <button
            onClick={() => setActiveCategory("All")}
            className={`px-4 py-2 rounded-2xl whitespace-nowrap h-fit text-sm font-semibold shadow ${activeCategory === "All"
              ? "bg-primary text-white scale-105"
              : "bg-primary-100 text-primary-700 hover:bg-primary-300"
              } transition-all`}
          >
            All Tasks ({totalCount})
          </button>

          {[
            ...Object.entries(categoryCounts).filter(
              ([cat]) => cat !== "Uncategorized",
            ),
            ...Object.entries(categoryCounts).filter(
              ([cat]) => cat === "Uncategorized",
            ),
          ].map(([cat, count], idx) => {
            const isActive = activeCategory === cat;
            const colors = generatePastelColor(idx);

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-sm whitespace-nowrap font-semibold shadow transition-all ${isActive
                  ? `scale-105 ring-2 ${colors}`
                  : `${colors} opacity-70 hover:opacity-100`
                  } `}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}


      {/* Show only latest 3 items for the active category */}
      <div className="flex-1">
        {isLoading ? (
          <CardSkeleton rows={2} />
        ) : filtered.length > 0 ? (
          filtered
            .slice(0, 3)
            .map((item: ToDo) => <MyToDoItem key={item.name} item={item} />)
        ) : (
          <NoDataFound
            title="You're all caught up 🎉"
            subtitle="No pending tasks right now."
          />
        )}
      </div>
    </Card>
  );
};

export default TasksAwaiting;
