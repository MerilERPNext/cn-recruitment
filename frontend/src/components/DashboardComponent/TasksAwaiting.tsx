import React, { useState, useMemo } from "react";
import { FileText } from "lucide-react";
import FrappeListView from "../ListView";
import DOMPurify from "dompurify";
import { ViewAll } from "../shared/atoms/ViewAll";
import { formatDateDDMonthYYYY } from "../../utils/formatToIndianDate";
import { getDueStatus } from "./DueStatus";
import useCurrentUser from "../../hooks/useCurrentUser";

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
}
const MyToDoItem: React.FC<{ item: ToDo }> = ({ item }) => {
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const s = status.toLowerCase();

    const map: Record<string, [string, string]> = {
      open: ["bg-red-100", "text-red-600"],
      closed: ["bg-green-100", "text-green-600"],
    };

    const [bg, text] = map[s] || ["bg-gray-100", "text-gray-600"];

    return (
      <span
        className={`px-2 py-1 rounded-lg flex items-center justify-center ${bg}`}
      >
        <p className={`text-xs font-medium ${text}`}>{status}</p>
      </span>
    );
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;

    const map: Record<string, [string, string]> = {
      low: ["bg-green-100", "text-green-600"],
      medium: ["bg-yellow-100", "text-yellow-600"],
      high: ["bg-orange-100", "text-orange-600"],
      urgent: ["bg-red-100", "text-red-600"],
    };

    const [bg, text] = map[priority.toLowerCase()] || [
      "bg-gray-100",
      "text-gray-600",
    ];

    return (
      <span
        className={`px-2 py-1 rounded-lg flex items-center justify-center ${bg}`}
      >
        <p className={`text-xs font-medium ${text}`}>{priority}</p>
      </span>
    );
  };

  return (
    <div className="flex items-center p-2 rounded-lg bg-gray-100 gap-3 mb-2">
      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-blue-500" />
      </div>

      <div className="flex w-full flex-col">
        <div className="flex w-full items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-medium">
            <div
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(item.description || "Task"),
              }}
            />
          </span>

          <div className="flex items-center justify-between w-full pr-8">
            {item.date &&
              (() => {
                const dueStatus = getDueStatus(item.date);
                return (
                  <span
                    className={`flex items-center gap-1 text-xs bg-${dueStatus.color}-100 text-${dueStatus.color}-600 px-2 rounded`}
                  >
                    {dueStatus.icon}
                    <span>
                      {dueStatus.status}: {formatDateDDMonthYYYY(item.date)}
                    </span>
                  </span>
                );
              })()}

            <div className="flex gap-2">
              {getPriorityBadge(item.priority)}
              {getStatusBadge(item.status)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TasksAwaiting: React.FC = () => {
  const [fullData, setFullData] = useState<ToDo[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const { data: currentEmployee } = useCurrentUser();
  const currentEmployeeId = currentEmployee?.name;

  const handleTodoClick = () => window.open(`/app/task_manager`);

  const generatePastelColor = (index: number) => {
    const colors = [
      "bg-blue-100 text-blue-700 ring-blue-300",
      "bg-purple-100 text-purple-700 ring-purple-300",
      "bg-green-100 text-green-700 ring-green-300",
      "bg-pink-100 text-pink-700 ring-pink-300",
      "bg-yellow-100 text-yellow-700 ring-yellow-300",
      "bg-orange-100 text-orange-700  ring-orange-300",
      "bg-cyan-100 text-cyan-700 ring-cyan-300",
      "bg-red-100 text-red-700  ring-red-300",
    ];
    return colors[index % colors.length];
  };

  const handleDataLoad = (items: ToDo[]) => {
    setFullData(items);
  };

  const filtered = useMemo(() => {
    if (activeCategory === "All") return fullData;
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
    <div className="bg-white rounded-lg p-6 mb-2 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="section-title">Tasks Awaiting You</h3>
        <ViewAll title="Visit Todo" onClick={handleTodoClick} />
      </div>

      <div className="flex overflow-x-auto gap-3 mb-4 p-2">
        <button
          onClick={() => setActiveCategory("All")}
          className={`px-4 py-2 rounded-2xl whitespace-nowrap text-sm font-semibold shadow ${
            activeCategory === "All"
              ? "bg-gray-900 text-white scale-105"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>
      {/* {fullData.length === 0 &&(
        
        <FrappeListView
          doctype="ToDo"
          ItemComponent={() => null}
          isSearch={false}
          pageSize={100}
          orderBy="date desc"
          onDataLoad={handleDataLoad}
          defaultFilters={{
            status: "Open",
            allocated_to: currentEmployeeId || "",
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
      )} */}

      {currentEmployeeId && fullData.length === 0 && (
        <FrappeListView
          doctype="ToDo"
          ItemComponent={() => null}
          isSearch={false}
          pageSize={100}
          orderBy="date desc"
          onDataLoad={handleDataLoad}
          defaultFilters={{
            status: "Open",
            allocated_to: currentEmployeeId, // always correct now
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

      <div className="max-h-[40rem] overflow-y-auto">
        {filtered.map((item) => (
          <MyToDoItem key={item.name} item={item} />
        ))}

        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm p-4">No tasks found.</p>
        )}
      </div>
    </div>
  );
};

export default TasksAwaiting;
