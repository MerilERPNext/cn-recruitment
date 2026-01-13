import React, { useState, useMemo } from "react";
import { ClipboardList } from "lucide-react";
import FrappeListView from "../ListView";
import { ViewAll } from "../shared/atoms/ViewAll";
import { formatDateDDMonthYYYY } from "../../utils/formatToIndianDate";
import useCurrentUser from "../../hooks/useCurrentUser";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { format, parse } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ToDo {
  priority: string;
  custom_due_datetime: string;
  name: string;
  description?: string;
  owner?: string;
  status?: string;
  reference_type?: string;
  reference_name?: string;
  date?: string;
  subject?: string; // Added for new layout
  due_date?: string; // Added for new layout
}

const MyToDoItem: React.FC<{ item: ToDo }> = ({ item }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/webapp/todo-app#/${item.name}`);
  };
  const handleTodoClick = () => navigate("/webapp/todo-app");

  return (
    <div
      onClick={handleClick}
      key={item.name} // Assuming item.name is unique
      className="flex cursor-pointer items-center justify-between p-3 rounded-xl border border-transparent hover-lift transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <Typography
            variant="bodySmall"
            className="font-medium block line-clamp-1"
          >
            {item.subject || item.description || "Task"}
          </Typography>
          <Typography variant="label" color="body2">
            {item.due_date
              ? `Due on ${format(
                  parse(item.due_date, "yyyy-MM-dd", new Date()),
                  "do MMM"
                )}`
              : item.date
              ? `Due on ${formatDateDDMonthYYYY(item.date)}`
              : "No due date"}
          </Typography>
        </div>
      </div>
      <button
        onClick={handleTodoClick}
        className="text-primary-600 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors whitespace-nowrap"
      >
        View task
      </button>
    </div>
  );
};

const TasksAwaiting: React.FC = () => {
  const [fullData, setFullData] = useState<ToDo[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const { data: currentEmployee } = useCurrentUser();
  const currentEmployeeId = currentEmployee?.name;

  const navigate = useNavigate();

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

  const handleDataLoad = (items: ToDo[]) => {
    setFullData(items);
  };

  const filtered = useMemo(() => {
    if (activeCategory === "All") return fullData;

    if (activeCategory === "Others") {
      return fullData.filter((item) => !item.reference_type);
    }

    return fullData.filter((item) => item.reference_type === activeCategory);
  }, [activeCategory, fullData]);

  const categoryCounts = useMemo(() => {
    const grouped: Record<string, number> = {};

    fullData.forEach((item) => {
      if (item.status === "Open") {
        const cat = item.reference_type || "Others";
        grouped[cat] = (grouped[cat] || 0) + 1;
      }
    });

    return grouped;
  }, [fullData]);

  const totalCount = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  return (
    <Card shadow="sm" className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <Typography variant="subheading" color="title">
          Tasks Awaiting You
        </Typography>
        <ViewAll title="View to-do" onClick={handleTodoClick} />
      </div>

      <div className="flex gap-3 mb-4 p-2">
        <button
          onClick={() => setActiveCategory("All")}
          className={`px-4 py-2 rounded-2xl whitespace-nowrap text-sm font-semibold shadow ${
            activeCategory === "All"
              ? "bg-primary text-white scale-105"
              : "bg-primary-100 text-primary-700 hover:bg-primary-300"
          } transition-all`}
        >
          All ({totalCount})
        </button>

        {Object.entries(categoryCounts).map(([cat, count], idx) => {
          const isActive = activeCategory === cat;
          const colors = generatePastelColor(idx);

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-2xl text-sm whitespace-nowrap font-semibold shadow transition-all ${
                isActive
                  ? `scale-105 ring-2 ${colors}`
                  : `${colors} opacity-70 hover:opacity-100`
              } `}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {currentEmployeeId && fullData.length === 0 && (
        <FrappeListView
          doctype="ToDo"
          ItemComponent={() => null}
          isSearch={false}
          pageSize={3}
          orderBy="date desc"
          onDataLoad={handleDataLoad}
          defaultFilters={{
            status: "Open",
            allocated_to: currentEmployeeId,
          }}
          defaultFields={[
            "name",
            "description",
            "owner",
            "status",
            "reference_type",
            "reference_name",
            "date",
            "priority",
            "allocated_to",
          ]}
          showPagination={false}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {filtered.map((item) => (
          <MyToDoItem key={item.name} item={item} />
        ))}

        {filtered.length === 0 && (
          <div className="p-4 flex justify-center opacity-60">
            <Typography variant="bodySmall">No tasks found.</Typography>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TasksAwaiting;
