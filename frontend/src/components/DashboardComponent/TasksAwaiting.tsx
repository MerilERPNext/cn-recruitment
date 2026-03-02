import { ClipboardList } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useCurrentUser from "../../hooks/useCurrentUser";
import { useScreenSize } from "../../hooks/useScreenSize";
import { formatDateDDMonthYYYY } from "../../utils/formatToIndianDate";
import { sanitizeToPlainText } from "../../utils/sanitizeToPlainText";
import FrappeListView from "../ListView";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { ViewAll } from "../shared/atoms/ViewAll";
import CustomDropdown from "../shared/CustomDropdown";
import { CardSkeleton } from "../shared/molecules/Skeletons/TableSkeleton";

interface ToDo {
  priority: string;
  custom_due_datetime: string;
  name: string;
  description?: string;
  owner?: string;
  status?: string;
  reference_type?: string;
  custom_todo_type?: string;
  reference_name?: string;
  date?: string;
  due_date?: string;
  custom_redirect_url?: string;
}

const MyToDoItem: React.FC<{ item: ToDo }> = ({ item }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (item.custom_redirect_url) {
      navigate(item.custom_redirect_url);
    } else {
      navigate(`/webapp/todo-app#/${item.name}`);
    }
  };

  const cleanDescription = sanitizeToPlainText(item.description);

  return (
    <div
      // onClick={handleClick}
      key={item.name} // Assuming item.name is unique
      className="flex cursor-pointer items-center justify-between p-3 rounded-xl border border-transparent hover-lift transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 min-w-[40px] min-h-[40px] flex-shrink-0 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <Typography
            variant="bodySmall"
            className="font-medium block line-clamp-1"
          >
            {cleanDescription || "Task"}
          </Typography>

          <Typography variant="label" color="body2">
            {item.due_date
              ? `Due on ${formatDateDDMonthYYYY(item.due_date)}`
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
  const [fullData, setFullData] = useState<ToDo[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const { data: currentEmployee } = useCurrentUser();
  const currentEmployeeId = currentEmployee?.name;
  const [isLoading, setIsLoading] = useState(true);

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

  const handleDataLoad = (items: ToDo[]) => {
    setFullData(items);
    setIsLoading(false);
  };

  const filtered = useMemo(() => {
    if (activeCategory === "All") return fullData;

    if (activeCategory === "Uncategorized") {
      return fullData.filter((item) => !item.custom_todo_type);
    }

    return fullData.filter((item) => item.custom_todo_type === activeCategory);
  }, [activeCategory, fullData]);

  const categoryCounts = useMemo(() => {
    const grouped: Record<string, number> = {};

    fullData.forEach((item) => {
      if (item.status === "Open") {
        const cat = item.custom_todo_type || "Uncategorized";
        grouped[cat] = (grouped[cat] || 0) + 1;
      }
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

      {currentEmployeeId && fullData.length === 0 && (
        <div className="hidden">

          <FrappeListView
            doctype="ToDo"
            ItemComponent={() => null}
            isSearch={false}
            pageSize={1000}
            orderBy="modified desc"
            onDataLoad={handleDataLoad}
            defaultFilters={{
              status: "Open",
              allocated_to: currentEmployeeId,
            }}
            defaultFields={[
              "name",
              "modified",
              "description",
              "owner",
              "status",
              "reference_type",
              "reference_name",
              "date",
              "priority",
              "allocated_to",
              "custom_redirect_url",
              "custom_todo_type",
            ]}
            showPagination={false}
            SkeletonComponent={() => <CardSkeleton rows={2} />}
          />
        </div>
      )}
      <div className="flex-1">
        {isLoading ? (
          <CardSkeleton rows={2} />
        ) : filtered.length > 0 ? (
          filtered
            .slice(0, 3)
            .map((item) => <MyToDoItem key={item.name} item={item} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center opacity-70">
            <ClipboardList className="w-10 h-10 mb-3 text-gray-400" />
            <Typography variant="bodyMedium" className="font-medium">
              You're all caught up 🎉
            </Typography>
            <Typography variant="bodySmall" color="body2">
              No pending tasks right now.
            </Typography>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TasksAwaiting;
